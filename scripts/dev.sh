#!/usr/bin/env bash
# BGen — запуск dev-стека
# Поднимает server + app одновременно.
set -e

cd "$(dirname "$0")/.."

echo "▶ BGen dev stack starting..."
echo ""

# Проверки
if ! command -v bun >/dev/null 2>&1; then
  echo "❌ bun не найден. Установи: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

if [ ! -f .env ]; then
  echo "⚠️  .env не найден. Копирую из .env.example..."
  cp .env.example .env 2>/dev/null || true
fi

# Mock-режим если не задан провайдер
USE_MOCK="${BGEN_USE_MOCK:-1}"

echo "   Mode:      $([ "$USE_MOCK" = "1" ] && echo "MOCK (без сети)" || echo "LIVE LLM")"
echo "   Server:    http://localhost:3000"
echo "   App:       http://localhost:5173"
echo ""

# Server в фоне
(
  cd server
  BGEN_USE_MOCK="$USE_MOCK" bun --watch src/index.ts
) &
SERVER_PID=$!

# App
(
  cd app
  bunx vite
) &
APP_PID=$!

cleanup() {
  echo ""
  echo "▶ Останавливаю..."
  kill "$SERVER_PID" "$APP_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✔ Остановлено."
}
trap cleanup EXIT INT TERM

wait