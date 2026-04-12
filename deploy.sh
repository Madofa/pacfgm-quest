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

# 2. Copia backend (excloent node_modules i .env)
echo "→ Copiant backend..."
APP="/home/r307889/quest.sinilos.com"
for dir in controllers services routes data middleware utils db scripts; do
  if [ -d "$REPO/backend/$dir" ]; then
    mkdir -p "$APP/$dir"
    cp -r "$REPO/backend/$dir/." "$APP/$dir/"
  fi
done
cp "$REPO/backend/server.js" "$APP/server.js"
cp "$REPO/backend/package.json" "$APP/package.json"

# 3. Copia frontend
echo "→ Copiant frontend..."
cp -r "$REPO/frontend/dist/." "$PUBLIC/"

# 3. Reinici backend (la migració DB s'executa automàticament en arrencar)
echo "→ Reiniciant backend..."
uapi NodeJS restart_app domain="$APP_DOMAIN" 2>/dev/null \
  && echo "   Backend reiniciat via uapi" \
  || echo "   (reinicia manualment des del cPanel si cal)"

echo ""
echo "✓ Deploy completat! https://quest.sinilos.com"
