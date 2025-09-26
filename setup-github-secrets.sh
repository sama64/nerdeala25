#!/bin/bash

# Script to generate GitHub secrets from existing .env file

echo "============================================"
echo "GitHub Secrets Setup from .env"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Read values from .env file if it exists
if [ -f "apps/api/.env" ]; then
    echo -e "${GREEN}✓ Found .env file${NC}"
    # Source the env file (be careful with arrays)
    export $(grep -v '^#' apps/api/.env | grep -v '^\[' | xargs -0)
else
    echo -e "${RED}✗ .env file not found at apps/api/.env${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}=== Step 1: VPS Configuration ===${NC}"
echo "Please provide your VPS details:"
echo ""

read -p "Enter your VPS IP address or domain: " VPS_HOST
read -p "Enter your VPS SSH username (e.g., ubuntu, root): " VPS_USER
read -p "Enter your VPS SSH port (press Enter for 22): " VPS_SSH_PORT
VPS_SSH_PORT=${VPS_SSH_PORT:-22}

echo ""
echo -e "${YELLOW}=== Step 2: SSH Key ===${NC}"
echo "Available SSH keys:"
ls -la ~/.ssh/id_* 2>/dev/null | grep -v ".pub" || echo "No SSH keys found"
echo ""

read -p "Enter path to your SSH private key (e.g., ~/.ssh/id_ed25519): " SSH_KEY_PATH
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

if [ -f "$SSH_KEY_PATH" ]; then
    VPS_SSH_KEY=$(cat "$SSH_KEY_PATH" | base64 -w 0)
    echo -e "${GREEN}✓ SSH key encoded${NC}"
else
    echo -e "${RED}✗ SSH key not found at $SSH_KEY_PATH${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}=== Step 3: Generate new JWT Secret ===${NC}"
JWT_SECRET_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✓ Generated new JWT secret key${NC}"

echo ""
echo -e "${YELLOW}=== Step 4: Production URL Configuration ===${NC}"
read -p "Do you have a domain for production? (y/n): " HAS_DOMAIN

if [ "$HAS_DOMAIN" = "y" ] || [ "$HAS_DOMAIN" = "Y" ]; then
    read -p "Enter your domain (without https://): " DOMAIN
    NEXT_PUBLIC_API_BASE_URL="https://$DOMAIN/api/v1"
    CORS_ORIGINS="[\"https://$DOMAIN\",\"https://www.$DOMAIN\"]"
    PRODUCTION_URL="https://$DOMAIN"
    GOOGLE_OAUTH_REDIRECT_URI="https://$DOMAIN/oauth/callback"
else
    NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"
    CORS_ORIGINS="[\"http://localhost:3000\",\"http://127.0.0.1:3000\"]"
    PRODUCTION_URL=""
    GOOGLE_OAUTH_REDIRECT_URI="http://localhost:5001/oauth/callback"
fi

echo ""
echo -e "${YELLOW}=== GitHub Secrets to Configure ===${NC}"
echo ""
echo "Copy and paste these into GitHub → Settings → Environments → production:"
echo ""

# Create output file
OUTPUT_FILE="github-secrets-$(date +%Y%m%d-%H%M%S).txt"

cat > "$OUTPUT_FILE" << EOF
# GitHub Secrets for Nerdeala Production Environment
# Generated on $(date)
# ================================================

# VPS Connection (CRITICAL)
VPS_HOST=$VPS_HOST
VPS_USER=$VPS_USER
VPS_SSH_KEY=$VPS_SSH_KEY
VPS_SSH_PORT=$VPS_SSH_PORT

# JWT Configuration (CRITICAL - New secure key)
JWT_SECRET_KEY=$JWT_SECRET_KEY
JWT_ACCESS_TOKEN_EXPIRES_MINUTES=1440

# Database
DATABASE_URL=sqlite+aiosqlite:///./nerdeala.db
SYNC_DATABASE_URL=sqlite:///./nerdeala.db

# CORS & API URLs
CORS_ORIGINS=$CORS_ORIGINS
NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
PRODUCTION_URL=$PRODUCTION_URL

# Google OAuth
GOOGLE_CLIENT_ID=1064826791261-ckc5jhdcot0h4elksggci6vcpi88l20e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_OAUTH_REDIRECT_URI=$GOOGLE_OAUTH_REDIRECT_URI

# WhatsApp Service
WHATSAPP_QUEUE=whatsapp:pending
WHATSAPP_MAX_RETRIES=5
WHATSAPP_CLIENT_ID=nerdeala-prod
REDIS_URL=redis://redis:6379

# Google Classroom
CLASSROOM_API_BASE_URL=https://classroom.googleapis.com/v1
CLASSROOM_SERVICE_ACCOUNT_FILE=
CLASSROOM_SERVICE_ACCOUNT_PATH=

# Debug
DEBUG=false
EOF

echo -e "${GREEN}✓ Secrets saved to: $OUTPUT_FILE${NC}"
echo ""

# Display critical secrets
echo -e "${YELLOW}Critical secrets to add first:${NC}"
echo "1. VPS_HOST=$VPS_HOST"
echo "2. VPS_USER=$VPS_USER"
echo "3. VPS_SSH_KEY=<saved in file>"
echo "4. JWT_SECRET_KEY=<saved in file>"
echo ""

# Test SSH connection
echo -e "${YELLOW}=== Testing SSH Connection ===${NC}"
read -p "Do you want to test the SSH connection now? (y/n): " TEST_SSH

if [ "$TEST_SSH" = "y" ] || [ "$TEST_SSH" = "Y" ]; then
    echo "Testing connection to $VPS_USER@$VPS_HOST..."
    ssh -o ConnectTimeout=5 -p "$VPS_SSH_PORT" "$VPS_USER@$VPS_HOST" "echo 'SSH connection successful!'; docker --version; docker-compose --version" || {
        echo -e "${RED}✗ SSH connection failed. Please check your credentials.${NC}"
        echo "Common issues:"
        echo "1. Wrong IP/hostname"
        echo "2. Wrong username"
        echo "3. SSH key not authorized on server"
        echo "4. Firewall blocking port $VPS_SSH_PORT"
    }
fi

echo ""
echo -e "${GREEN}=== Next Steps ===${NC}"
echo "1. Open the file: $OUTPUT_FILE"
echo "2. Go to: https://github.com/sama64/nerdeala25/settings/environments/production"
echo "3. For EACH line in the file:"
echo "   - Click 'Add environment secret'"
echo "   - Copy the secret name (before =)"
echo "   - Copy the secret value (after =)"
echo "   - Click 'Add secret'"
echo "4. After adding all secrets, re-run the failed workflow"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: The VPS_SSH_KEY is very long. Make sure to copy it completely!${NC}"
