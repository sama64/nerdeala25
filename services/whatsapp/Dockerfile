FROM node:20-alpine

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
    dumb-init

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

ENV PORT=3001 \
    WHATSAPP_QUEUE=whatsapp:pending \
    WHATSAPP_MAX_RETRIES=5 \
    WHATSAPP_CLIENT_ID=nerdeala-whatsapp \
    WHATSAPP_SESSION_DIR=/app/session-data

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
