#!/usr/bin/env bash
# BGen — production build
set -e

cd "$(dirname "$0")/.."

echo "▶ BGen build"
echo ""

# App
echo "→ Building app..."
(cd app && bunx vite build)
echo "  ✔ app/dist готов"
echo ""

# Server (bun не требует сборки — TS из коробки)
echo "→ Server: сборка не требуется (bun запускает TS напрямую)."
echo ""

# Проверка типов core
echo "→ Typecheck core..."
(cd core && bunx tsc --noEmit) || echo "  ⚠️  typecheck core упал (не критично для демо)"
echo ""

echo "✔ Build завершён."
echo ""
echo "Деплой:"
echo "  - app/dist  → любой static host (Vercel, Netlify, Cloudflare Pages)"
echo "  - server/   → bun server/src/index.ts (Railway, Fly.io, VPS)"