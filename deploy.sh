#!/bin/bash
# Deploy script — quest.sinilos.com
# Uso: bash ~/deploy.sh   (copiar a /home/r307889/deploy.sh al servidor)
set -e

REPO="/home/r307889/repositories/pacfgm-quest"
PUBLIC="/home/r307889/quest.sinilos.com/public"
APP_DOMAIN="quest.sinilos.com"
NODE="/home/r307889/nodevenv/quest.sinilos.com/16/bin/node"
NPM="/home/r307889/nodevenv/quest.sinilos.com/16/bin/npm"

echo "=== DEPLOY pacfgm-quest ==="

# 1. Pull
echo "→ Git pull..."
cd "$REPO"
git pull origin main

# 2. Dependències backend
echo "→ Instal·lant dependències backend..."
( cd "$REPO/backend" && $NPM install --production --silent )

# 3. Migració DB
echo "→ Migrant base de dades..."
( cd "$REPO/backend" && $NODE scripts/migrate-nodes.js )

# 4. Copia frontend
echo "→ Copiant frontend..."
cp -r "$REPO/frontend/dist/." "$PUBLIC/"

# 5. Reinici backend
echo "→ Reiniciant backend..."
uapi NodeJS restart_app domain="$APP_DOMAIN" 2>/dev/null \
  && echo "   Backend reiniciat via uapi" \
  || echo "   (reinicia manualment des del cPanel si cal)"

echo ""
echo "✓ Deploy completat! https://quest.sinilos.com"
