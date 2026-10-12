#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "▶ Starting BGen dev stack..."
echo ""

# core — watch typecheck
bun --watch core/src/index.ts --noop 2>/dev/null &
CORE_PID=$!

# server
(cd server && bun --watch src/index.ts) &
SERVER_PID=$!

# app
(cd app && bunx vite) &
APP_PID=$!

trap "kill $CORE_PID $SERVER_PID $APP_PID 2>/dev/null || true" EXIT
wait
