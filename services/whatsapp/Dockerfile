FROM node:20-alpine

# Build-time environment variables
ARG REDIS_URL
ARG WHATSAPP_QUEUE=whatsapp:pending
ARG WHATSAPP_MAX_RETRIES=5
ARG WHATSAPP_CLIENT_ID=nerdeala-prod
ARG DEBUG=false

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wqy-zenhei \
    dumb-init \
    curl

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

# Set runtime environment variables
ENV PORT=3001 \
    REDIS_URL=${REDIS_URL} \
    WHATSAPP_QUEUE=${WHATSAPP_QUEUE} \
    WHATSAPP_MAX_RETRIES=${WHATSAPP_MAX_RETRIES} \
    WHATSAPP_CLIENT_ID=${WHATSAPP_CLIENT_ID} \
    WHATSAPP_SESSION_DIR=/app/session-data \
    DEBUG=${DEBUG} \
    NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G appuser -g appuser appuser

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
