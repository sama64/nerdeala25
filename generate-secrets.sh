#!/bin/bash

# Script to help generate required secrets for GitHub Actions deployment

echo "======================================"
echo "GitHub Secrets Generator for Nerdeala"
echo "======================================"
echo ""

# Function to generate JWT secret
generate_jwt_secret() {
    echo "Generating JWT Secret Key..."
    JWT_SECRET=$(openssl rand -hex 32)
    echo "JWT_SECRET_KEY=$JWT_SECRET"
    echo ""
}

# Function to encode SSH key
encode_ssh_key() {
    echo "Available SSH keys:"
    ls -la ~/.ssh/id_* 2>/dev/null | grep -v ".pub"
    echo ""
    
    read -p "Enter the path to your SSH private key (e.g., ~/.ssh/id_rsa): " SSH_KEY_PATH
    
    # Expand tilde
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    
    if [ -f "$SSH_KEY_PATH" ]; then
        echo "Encoding SSH key..."
        ENCODED_KEY=$(cat "$SSH_KEY_PATH" | base64 -w 0)
        echo ""
        echo "VPS_SSH_KEY (copy everything between the markers):"
        echo "===== START SSH KEY ====="
        echo "$ENCODED_KEY"
        echo "===== END SSH KEY ====="
        echo ""
    else
        echo "Error: SSH key not found at $SSH_KEY_PATH"
    fi
}

# Function to generate all minimum required secrets
generate_minimum_secrets() {
    echo "=== Minimum Required Secrets ==="
    echo ""
    
    # VPS Configuration
    read -p "Enter your VPS IP address or domain: " VPS_HOST
    read -p "Enter your VPS SSH username: " VPS_USER
    read -p "Enter your VPS SSH port (default 22): " VPS_PORT
    VPS_PORT=${VPS_PORT:-22}
    
    echo ""
    echo "# VPS Connection"
    echo "VPS_HOST=$VPS_HOST"
    echo "VPS_USER=$VPS_USER"
    echo "VPS_SSH_PORT=$VPS_PORT"
    echo ""
    
    # Generate JWT Secret
    generate_jwt_secret
    
    # API Configuration
    read -p "Enter your production domain (or press Enter to use localhost): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        echo "# Local/Development Configuration"
        echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1"
        echo "CORS_ORIGINS=http://localhost:3000"
    else
        echo "# Production Configuration"
        echo "NEXT_PUBLIC_API_BASE_URL=https://$DOMAIN/api/v1"
        echo "CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN"
        echo "PRODUCTION_URL=https://$DOMAIN"
    fi
    echo ""
    
    # Database defaults
    echo "# Database Configuration"
    echo "DATABASE_URL=sqlite:///./nerdeala.db"
    echo "SYNC_DATABASE_URL=sqlite:///./nerdeala.db"
    echo ""
    
    # WhatsApp defaults
    echo "# WhatsApp Service"
    echo "WHATSAPP_QUEUE=whatsapp:pending"
    echo "WHATSAPP_MAX_RETRIES=5"
    echo "WHATSAPP_CLIENT_ID=nerdeala-prod"
    echo ""
    
    # Debug
    echo "# Debug Settings"
    echo "DEBUG=false"
    echo ""
    echo "JWT_ACCESS_TOKEN_EXPIRES_MINUTES=30"
    echo ""
    
    # Encode SSH Key
    encode_ssh_key
}

# Main menu
echo "Select an option:"
echo "1. Generate all minimum required secrets"
echo "2. Generate JWT secret only"
echo "3. Encode SSH key only"
echo "4. Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        generate_minimum_secrets
        ;;
    2)
        generate_jwt_secret
        ;;
    3)
        encode_ssh_key
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice. Exiting..."
        exit 1
        ;;
esac

echo ""
echo "====================================="
echo "IMPORTANT NEXT STEPS:"
echo "1. Copy each secret name and value"
echo "2. Go to GitHub → Settings → Environments → production"
echo "3. Click 'Add environment secret' for each one"
echo "4. Paste the secret name and value"
echo "5. Save each secret"
echo "====================================="
