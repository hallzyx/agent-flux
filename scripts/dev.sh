#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting Agent Flux backend..."
cd "$ROOT/backend"
uv run uvicorn app.main:app --reload --port 8000 &
BACK_PID=$!

echo "Starting Agent Flux frontend..."
cd "$ROOT/frontend"
pnpm dev &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
wait
