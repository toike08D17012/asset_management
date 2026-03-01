#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../docker"

echo "[docker-build] Building web image..."
docker compose build web "$@"
