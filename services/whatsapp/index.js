require('dotenv').config();

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const Redis = require('ioredis');
const qrcode = require('qrcode-terminal');

const PORT = Number.parseInt(process.env.PORT || '3001', 10);
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const queueName = process.env.WHATSAPP_QUEUE || 'whatsapp:pending';
const failedQueueName = process.env.WHATSAPP_FAILED_QUEUE || `${queueName}:failed`;
const maxRetries = Number.parseInt(process.env.WHATSAPP_MAX_RETRIES || '5', 10);
const sessionDir = process.env.WHATSAPP_SESSION_DIR || path.join(__dirname, 'session-data');
const clientId = process.env.WHATSAPP_CLIENT_ID || 'nerdeala';
const defaultChromiumPath = '/usr/bin/chromium-browser';
const chromiumPath =
  process.env.WHATSAPP_CHROME_PATH ||
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  defaultChromiumPath;
const setupMode = process.env.SETUP_MODE === '1';
const chromeUserDataDir = path.join(sessionDir, '.chrome-user-data');

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

const app = express();
app.use(cors());
app.use(express.json());

let client;
let isReady = false;
let qrCodeData = null;
let consumerRunning = false;
let closed = false;

function log(...args) {
  console.log('[whatsapp]', ...args);
}

function hasExistingSession() {
  const sessionPath = path.join(sessionDir, 'session');
  return fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;
}

function clearSession() {
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      log('session data cleared');
    }
    if (fs.existsSync(chromeUserDataDir)) {
      fs.rmSync(chromeUserDataDir, { recursive: true, force: true });
      log('chrome user data cleared');
    }
  } catch (error) {
    log('error clearing session:', error.message);
  }
}

function ensureDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    log(`failed to create directory ${dirPath}:`, error.message);
  }
}

function purgeLockArtifacts(root) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (/^Singleton/i.test(entry.name)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          log(`removed chrome lock directory ${fullPath}`);
        } catch (error) {
          log(`failed to remove ${fullPath}:`, error.message);
        }
      } else {
        purgeLockArtifacts(fullPath);
      }
    } else if (/^(Singleton|LOCK|LOCKFILE|DevToolsActivePort)/i.test(entry.name)) {
      try {
        fs.rmSync(fullPath, { force: true });
        log(`removed chrome lock file ${fullPath}`);
      } catch (error) {
        log(`failed to remove ${fullPath}:`, error.message);
      }
    }
  }
}

function formatPhone(raw) {
  if (!raw) return null;
  const digits = typeof raw === 'string' ? raw.replace(/[^0-9]/g, '') : '';
  if (!digits) return null;
  return digits.endsWith('@c.us') ? digits : `${digits}@c.us`;
}

async function processQueueJob(job) {
  const recipientPhone = formatPhone(job?.recipient?.phone);
  const messageType = job?.message?.type || 'text';
  const text = job?.message?.text;

  if (!recipientPhone) {
    throw new Error('Job missing recipient.phone');
  }

  if (messageType !== 'text') {
    throw new Error(`Unsupported message type: ${messageType}`);
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Job missing message.text');
  }

  log(`sending message to ${recipientPhone}`);
  await client.sendMessage(recipientPhone, text.trim());
}

async function handleJobPayload(payload) {
  let job;
  try {
    job = JSON.parse(payload);
  } catch (error) {
    log('invalid JSON payload dropped', error.message);
    return;
  }

  if (!job.metadata) {
    job.metadata = {};
  }

  try {
    if (!isReady) {
      await redis.lpush(queueName, JSON.stringify(job));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await processQueueJob(job);
    log(`job ${job.id || 'unknown'} processed successfully`);
  } catch (error) {
    const retries = Number.parseInt(job.metadata.retries || 0, 10) + 1;
    job.metadata.retries = retries;
    job.metadata.lastError = error.message;
    job.metadata.lastTriedAt = new Date().toISOString();

    if (retries > maxRetries) {
      await redis.lpush(failedQueueName, JSON.stringify(job));
      log(`job ${job.id || 'unknown'} moved to failed queue after ${retries} attempts`);
    } else {
      const backoff = Math.min(5000, 500 * retries);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      await redis.lpush(queueName, JSON.stringify(job));
      log(`job ${job.id || 'unknown'} requeued (attempt ${retries}/${maxRetries})`);
    }
  }
}

async function consumeQueue() {
  if (consumerRunning) return;
  consumerRunning = true;

  log(`listening for jobs on ${queueName}`);
  while (!closed) {
    try {
      const result = await redis.brpop(queueName, 0);
      if (!result) continue;
      const [, payload] = result;
      await handleJobPayload(payload);
    } catch (error) {
      if (closed) break;
      log('queue loop error', error.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function createClient() {
  log('initializing whatsapp client');

  ensureDirectory(sessionDir);
  ensureDirectory(chromeUserDataDir);
  purgeLockArtifacts(sessionDir);
  purgeLockArtifacts(chromeUserDataDir);

  if (!fs.existsSync(chromiumPath)) {
    log(`chromium executable not found at ${chromiumPath}. falling back to ${defaultChromiumPath}`);
  }

  client = new Client({
    authStrategy: new LocalAuth({
      clientId,
      dataPath: sessionDir,
    }),
    puppeteer: {
      headless: true,
      executablePath: fs.existsSync(chromiumPath) ? chromiumPath : defaultChromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--no-default-browser-check',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-software-rasterizer',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-crash-upload',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer',
        `--user-data-dir=${chromeUserDataDir}`,
      ],
    },
  });

  client.on('qr', (qr) => {
    qrCodeData = qr;
    log('QR code generated. Scan with WhatsApp on your phone.');
    log('Once connected, the session will be saved automatically');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    log('authentication successful, saving session...');
    qrCodeData = null;
  });

  client.on('ready', () => {
    log('WhatsApp Web is ready!');
    log('session saved correctly');
    isReady = true;
    qrCodeData = null;
    if (!setupMode) {
      consumeQueue().catch((error) => log('consumer crashed', error.message));
    }
  });

  client.on('loading_screen', (percent, message) => {
    log(`loading ${percent}%`, message);
  });

  client.on('auth_failure', (message) => {
    log('authentication failure:', message);
    log('cleaning corrupted session...');
    qrCodeData = null;
    isReady = false;
    clearSession();
  });

  client.on('disconnected', (reason) => {
    log('client disconnected:', reason);
    isReady = false;
    
    // Only retry if not a manual logout and not closed
    if (reason !== 'LOGOUT' && !closed) {
      setTimeout(() => {
        log('attempting to reinitialize client after disconnect');
        createClient();
      }, 5000);
    }
  });

  // Handle client errors
  client.on('error', (error) => {
    log('client error:', error.message);
  });

  // Initialize client with retry logic
  client.initialize().catch((error) => {
    log('initialization error:', error.message);
    setTimeout(() => {
      log('retrying client initialization...');
      createClient();
    }, 10000);
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/status', (_req, res) => {
  res.json({
    isReady,
    hasQR: !!qrCodeData,
    queue: queueName,
    failedQueue: failedQueueName,
    setupMode,
  });
});

app.get('/qr', (_req, res) => {
  if (qrCodeData) {
    return res.json({ qr: qrCodeData });
  }
  if (isReady) {
    return res.json({ message: 'client already authenticated' });
  }
  return res.status(404).json({ error: 'no qr available' });
});

app.post('/send', async (req, res) => {
  try {
    await handleJobPayload(JSON.stringify(req.body));
    res.json({ status: 'queued' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/clear-session', async (req, res) => {
  try {
    // Stop client if active
    if (client) {
      await client.destroy().catch(() => {});
      client = null;
      isReady = false;
      qrCodeData = null;
    }
    
    // Clear session
    clearSession();
    
    res.json({ 
      message: 'session cleared successfully',
      needsRestart: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/session-info', (req, res) => {
  try {
    const hasSession = hasExistingSession();
    
    res.json({
      hasSession: hasSession,
      sessionPath: sessionDir,
      isReady: isReady,
      clientId: clientId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  log(`http server listening on ${PORT}`);
  log(`endpoints available:`);
  log(`   GET  http://localhost:${PORT}/health`);
  log(`   GET  http://localhost:${PORT}/status`);
  log(`   GET  http://localhost:${PORT}/qr`);
  log(`   GET  http://localhost:${PORT}/session-info`);
  log(`   POST http://localhost:${PORT}/send`);
  log(`   POST http://localhost:${PORT}/clear-session`);
  log(`redis queue: ${queueName}`);
  log(`failed queue: ${failedQueueName}`);
  log(`session directory: ${sessionDir}`);
  
  // Check for existing session
  const hasSession = hasExistingSession();
  if (hasSession) {
    log('existing session detected - will attempt to reconnect automatically');
  } else {
    log('no existing session - QR code will be required for first connection');
  }
});

createClient();

function shutdown(signal) {
  return async () => {
    log(`received ${signal}, shutting down`);
    closed = true;
   try {
     await Promise.allSettled([
       (async () => {
         try {
           await redis.quit();
         } catch {
           redis.disconnect();
         }
       })(),
        client ? client.destroy().catch(() => {}) : Promise.resolve(),
     ]);
   } finally {
     process.exit(0);
   }
 };
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, shutdown(signal));
});
