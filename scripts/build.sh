#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "▶ Building BGen..."
(cd app && bunx vite build)
echo "✔ app built"
echo ""
echo "Server runs directly via bun (no build step)."
echo "Core is consumed as TS source via workspaces."
