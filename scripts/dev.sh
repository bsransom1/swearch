#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REQUIRED_NODE_MAJOR=22

# Load nvm when available so `pnpm dev` picks up the version from .nvmrc.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm use --silent 2>/dev/null || nvm use "$REQUIRED_NODE_MAJOR" --silent 2>/dev/null || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install Node $REQUIRED_NODE_MAJOR+ (e.g. nvm install $REQUIRED_NODE_MAJOR)."
  exit 1
fi

CURRENT_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$CURRENT_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Node.js $REQUIRED_NODE_MAJOR+ is required (found $(node -v))."
  echo "Run: nvm install $REQUIRED_NODE_MAJOR && nvm use"
  exit 1
fi

echo "Using Node $(node -v)"
echo "Starting web (http://localhost:3000) and extension (watch build)..."
exec pnpm --parallel --filter web --filter extension dev
