# WhatsApp Queue Worker

A robust WhatsApp message sender that consumes jobs from a Redis queue and delivers them using [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js). Features persistent session storage, QR code authentication, and comprehensive error handling with retry logic.

## ✨ Features

- 🔐 **Persistent Authentication**: QR code setup once, session saved in Docker volume
- 📱 **Queue-based Processing**: Consumes messages from Redis queue automatically  
- 🔄 **Retry Logic**: Failed messages are retried with exponential backoff
- 📊 **Status API**: Monitor service health and queue status
- 🐳 **Docker Ready**: Fully containerized with proper Chrome/Puppeteer setup
- 🛡️ **Error Handling**: Robust error recovery and session management

## 📋 Job Payload Format

Queue entries must be JSON strings with this structure:

```json
{
  "id": "unique-job-id",
  "recipient": { 
    "phone": "+5491122334455",
    "name": "User Name" 
  },
  "message": {
    "type": "text",
    "text": "Hello! This is your message."
  },
  "metadata": {
    "retries": 0,
    "initiatedBy": "your-service-name",
    "priority": "normal"
  }
}
```

## 🚀 Quick Start

### 1. Build the Service
```bash
docker compose -f docker-compose.whatsapp.yml build whatsapp-service
```

### 2. First-Time Authentication
```bash
python setup-whatsapp-web.py
```
- Scan the QR code with your WhatsApp phone
- Wait for "session saved correctly" message
- Press `Ctrl+C` to exit setup mode

### 3. Start the Service
```bash
docker compose -f docker-compose.whatsapp.yml up -d
```

### 4. Monitor Service (Optional)
```bash
docker compose -f docker-compose.whatsapp.yml logs -f whatsapp-service
```

### 5. Test with a Message
```bash
python tests/push_sample_whatsapp_job.py
```

## 🧪 Testing

The test script (`tests/push_sample_whatsapp_job.py`) is pre-configured for easy testing:

1. **Edit the test configuration** at the top of the file:
   ```python
   TEST_PHONE = "+1234567890"  # Your test phone number
   TEST_MESSAGE = "Your test message here!"
   ```

2. **Run the test**:
   ```bash
   python tests/push_sample_whatsapp_job.py
   ```

3. **Check the logs** to see message processing:
   ```bash
   docker compose -f docker-compose.whatsapp.yml logs -f whatsapp-service
   ```

The script will show you the job ID and queue position, then you can watch the service logs to see it being processed.

## Environment variables

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `3001` | HTTP status server port. |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string (used for queue and job retry storage). |
| `WHATSAPP_QUEUE` | `whatsapp:pending` | Redis list monitored for outgoing jobs. |
| `WHATSAPP_FAILED_QUEUE` | `<queue>:failed` | Redis list used for exhausted jobs. |
| `WHATSAPP_MAX_RETRIES` | `5` | Maximum delivery attempts before moving to the failed queue. |
| `WHATSAPP_CLIENT_ID` | `nerdeala` | LocalAuth identifier used to reuse the saved session. |
| `WHATSAPP_SESSION_DIR` | `/app/session-data` | Directory persisted with the WhatsApp session (mapped as a Docker volume). |
| `WHATSAPP_CHROME_PATH` | `/usr/bin/chromium-browser` | Path to the Chromium binary inside the container. |

## Resetting the session

1. Stop the stack: `docker compose -f docker-compose.whatsapp.yml down`
2. Remove the session volume: `docker volume rm nerdeala25_whatsapp-session`
3. Re-run the QR setup script and restart the stack.

## Files of interest

- `index.js` – main worker + HTTP status routes.
- `package.json` – dependencies and npm scripts (`npm run setup` prints the QR). 
- `Dockerfile` – Node 20 + Alpine Chromium image.
- `docker-compose.whatsapp.yml` – Redis + worker services with persistent volumes.
- `setup-whatsapp-web.py` – wrapper that runs the container in setup mode.
