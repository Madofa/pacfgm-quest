#!/bin/bash
# Deploy script — quest.sinilos.com
# Uso: bash ~/deploy.sh
set -e

REPO="/home/r307889/repositories/pacfgm-quest"
PUBLIC="/home/r307889/quest.sinilos.com/public"
APP_DOMAIN="quest.sinilos.com"

echo "=== DEPLOY pacfgm-quest ==="

# 1. Pull
echo "→ Git pull..."
cd "$REPO"
git pull origin main

# 2. Copia frontend
echo "→ Copiant frontend..."
cp -r "$REPO/frontend/dist/." "$PUBLIC/"

# 3. Reinici backend (la migració DB s'executa automàticament en arrencar)
echo "→ Reiniciant backend..."
uapi NodeJS restart_app domain="$APP_DOMAIN" 2>/dev/null \
  && echo "   Backend reiniciat via uapi" \
  || echo "   (reinicia manualment des del cPanel si cal)"

echo ""
echo "✓ Deploy completat! https://quest.sinilos.com"
