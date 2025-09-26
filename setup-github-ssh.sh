#!/bin/bash

echo "=========================================="
echo "Configuración SSH para GitHub Actions"
echo "=========================================="
echo ""

# Generar nueva clave SSH para GitHub Actions (sin passphrase)
echo "1. Generando nueva clave SSH para GitHub Actions..."
ssh-keygen -t ed25519 -f ~/.ssh/github_actions_deploy -N "" -C "github-actions-deploy"

echo ""
echo "2. Agregando la clave pública al servidor..."
echo "Copiando la clave pública al servidor cyberia..."

# Copiar la clave pública al servidor
cat ~/.ssh/github_actions_deploy.pub | ssh cyberia "cat >> ~/.ssh/authorized_keys"

echo ""
echo "3. Codificando la clave privada en base64..."
ENCODED_KEY=$(cat ~/.ssh/github_actions_deploy | base64 -w 0)

echo ""
echo "=========================================="
echo "SECRETS PARA GITHUB:"
echo "=========================================="
echo ""
echo "VPS_HOST=cyberia.samsyntaxerror.com"
echo "VPS_USER=sam"
echo "VPS_SSH_PORT=2222"
echo ""
echo "VPS_SSH_KEY (copiar TODO lo que está entre los marcadores):"
echo "===== INICIO SSH KEY ====="
echo "$ENCODED_KEY"
echo "===== FIN SSH KEY ====="
echo ""

# Guardar en archivo
cat > github-actions-secrets.txt << EOF
VPS_HOST=cyberia.samsyntaxerror.com
VPS_USER=sam
VPS_SSH_PORT=2222
VPS_SSH_KEY=$ENCODED_KEY
EOF

echo "✅ Secrets guardados en: github-actions-secrets.txt"
echo ""
echo "PASOS SIGUIENTES:"
echo "1. Ve a https://github.com/sama64/nerdeala25/settings/environments/production"
echo "2. Actualiza estos 4 secrets con los valores de arriba"
echo "3. IMPORTANTE: Para VPS_SSH_KEY, copia TODO el texto largo entre los marcadores"
echo ""

# Test de conexión sin passphrase
echo "4. Probando conexión con la nueva clave..."
ssh -i ~/.ssh/github_actions_deploy -p 2222 sam@cyberia.samsyntaxerror.com "echo '✅ Conexión SSH exitosa sin passphrase!'; ls -la /opt/nerdeala"
