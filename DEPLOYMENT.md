# Nerdeala Platform - Production Deployment Guide

This guide covers the automated deployment setup for the Nerdeala platform using Docker Compose and GitHub Actions.

## Architecture Overview

The production deployment consists of 4 Docker services:

1. **FastAPI Backend** (`api`) - Python backend with SQLite database
2. **Next.js Frontend** (`web`) - React frontend serving the web application
3. **Redis Service** (`redis`) - Message queue and caching
4. **WhatsApp Service** (`whatsapp`) - Node.js service for WhatsApp notifications

## Prerequisites

### VPS Requirements

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- At least 2GB RAM and 20GB storage
- SSH access with key-based authentication
- Ports 80, 443 available for reverse proxy (recommended)

### GitHub Repository Setup

1. **Container Registry**: The workflow uses GitHub Container Registry (ghcr.io)
2. **Repository Secrets**: Configure the following secrets in your GitHub repository

## Required GitHub Secrets

### VPS Connection
```
VPS_HOST=your-server-ip-or-domain
VPS_USER=your-ssh-username
VPS_SSH_KEY=base64-encoded-private-key
VPS_SSH_PORT=22  # Optional, defaults to 22
```

### Application Configuration
```
# Database
DATABASE_URL=sqlite:///./data/nerdeala.db
SYNC_DATABASE_URL=sqlite:///./data/nerdeala.db

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_ACCESS_TOKEN_EXPIRES_MINUTES=30

# CORS and API
CORS_ORIGINS=https://yourdomain.com,http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api/v1

# Google Classroom (Optional)
CLASSROOM_API_BASE_URL=https://classroom.googleapis.com
CLASSROOM_SERVICE_ACCOUNT_FILE=/app/service-account.json
CLASSROOM_SERVICE_ACCOUNT_PATH=/opt/nerdeala/service-account.json

# WhatsApp Service
WHATSAPP_QUEUE=whatsapp:pending
WHATSAPP_MAX_RETRIES=5
WHATSAPP_CLIENT_ID=nerdeala-prod

# Debug (set to false for production)
DEBUG=false

# Production URL for health checks
PRODUCTION_URL=https://yourdomain.com
```

## VPS Setup

### 1. Initial Server Setup

```bash
# Create application directory
sudo mkdir -p /opt/nerdeala
sudo chown $USER:$USER /opt/nerdeala

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and log back in for group changes to take effect
```

### 2. SSH Key Setup

Generate a new SSH key pair for GitHub Actions:

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/nerdeala_deploy_key

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/nerdeala_deploy_key.pub user@your-vps-ip

# Encode private key for GitHub secret
base64 -w 0 ~/.ssh/nerdeala_deploy_key
```

Add the base64-encoded private key to GitHub as `VPS_SSH_KEY`.

### 3. Optional: Service Account for Google Classroom

If using Google Classroom integration:

```bash
# Copy your service account JSON to the VPS
scp service-account.json user@your-vps:/opt/nerdeala/service-account.json
```

## Deployment Process

### Automatic Deployment

The deployment is triggered automatically when code is pushed to the `main` branch:

1. **Build Phase**: Docker images are built and pushed to GitHub Container Registry
2. **Test Phase**: Runs tests for pull requests
3. **Deploy Phase**: Deploys to production VPS (main branch only)
4. **Cleanup Phase**: Removes old container images

### Manual Deployment

To deploy manually from your VPS:

```bash
cd /opt/nerdeala

# Set environment variables (create a .env file or export them)
export API_DOCKER_IMAGE=ghcr.io/your-username/your-repo/api:latest
export WEB_DOCKER_IMAGE=ghcr.io/your-username/your-repo/web:latest
export WHATSAPP_DOCKER_IMAGE=ghcr.io/your-username/your-repo/whatsapp:latest

# Add all other environment variables from the secrets list above

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Service Configuration

### Port Mapping

- **API**: `127.0.0.1:8000:8000` (FastAPI backend)
- **Web**: `127.0.0.1:3000:3000` (Next.js frontend)
- **Redis**: `127.0.0.1:6379:6379` (Redis server)
- **WhatsApp**: `127.0.0.1:3001:3001` (WhatsApp service)

All services are bound to localhost for security. Use a reverse proxy (nginx/traefik) to expose them publicly.

### Data Persistence

- **API Data**: `/opt/nerdeala/api-data` (SQLite database)
- **Redis Data**: `/opt/nerdeala/redis-data` (Redis persistence)
- **WhatsApp Session**: `/opt/nerdeala/whatsapp-session` (WhatsApp authentication)

## WhatsApp Service Setup

### Initial Authentication

The WhatsApp service requires initial QR code authentication:

```bash
# Check WhatsApp service status
curl http://127.0.0.1:3001/status

# Get QR code for authentication (if needed)
curl http://127.0.0.1:3001/qr

# Check session info
curl http://127.0.0.1:3001/session-info
```

### Testing WhatsApp Integration

```bash
# Send a test message
curl -X POST http://127.0.0.1:3001/send \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-001",
    "recipient": {"phone": "+1234567890"},
    "message": {"type": "text", "text": "Hello from Nerdeala!"}
  }'
```

## Monitoring and Maintenance

### Health Checks

All services include health check endpoints:

- **API**: `http://127.0.0.1:8000/health`
- **Web**: `http://127.0.0.1:3000/api/health`
- **Redis**: Built-in Redis ping
- **WhatsApp**: `http://127.0.0.1:3001/health`

### Log Monitoring

```bash
# View all service logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f whatsapp
docker-compose -f docker-compose.prod.yml logs -f redis
```

### Container Management

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api

# Update services with new images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

## Reverse Proxy Setup (Recommended)

### Nginx Configuration Example

```nginx
# /etc/nginx/sites-available/nerdeala
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL configuration (use certbot for Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API - path-based routing
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### Common Issues

1. **WhatsApp Service Not Connecting**
   - Check if session data exists: `curl http://127.0.0.1:3001/session-info`
   - Clear session if corrupted: `curl -X POST http://127.0.0.1:3001/clear-session`
   - Restart service: `docker-compose -f docker-compose.prod.yml restart whatsapp`

2. **Database Issues**
   - Check API logs: `docker-compose -f docker-compose.prod.yml logs api`
   - Ensure data volume is properly mounted
   - Verify DATABASE_URL environment variable

3. **Build Failures**
   - Check GitHub Actions logs
   - Verify all required secrets are set
   - Ensure VPS has sufficient disk space

4. **Service Health Check Failures**
   - Check individual service logs
   - Verify port bindings
   - Ensure services have enough resources

### Recovery Procedures

```bash
# Complete service restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Reset WhatsApp session
curl -X POST http://127.0.0.1:3001/clear-session
docker-compose -f docker-compose.prod.yml restart whatsapp

# Database backup (SQLite)
docker exec nerdeala_api_prod cp /app/data/nerdeala.db /app/data/backup-$(date +%Y%m%d).db
```

## Security Considerations

1. **Firewall**: Only expose necessary ports (80, 443, SSH)
2. **SSH**: Use key-based authentication, disable password login
3. **Updates**: Keep VPS and Docker updated
4. **Secrets**: Never commit secrets to repository
5. **SSL**: Use HTTPS for all public endpoints
6. **Monitoring**: Set up log monitoring and alerting

## Performance Optimization

1. **Resource Limits**: Adjust container resource limits based on usage
2. **Redis**: Configure memory limits and eviction policies
3. **Database**: Consider PostgreSQL for higher loads
4. **CDN**: Use CDN for static assets
5. **Caching**: Implement application-level caching where appropriate

---

For additional support or questions, refer to the main README.md or create an issue in the repository.
