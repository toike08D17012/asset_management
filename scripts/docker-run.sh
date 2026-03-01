#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../docker"

echo "[docker-run] Starting web app via docker compose run..."
docker compose run --service-ports --rm web "$@"
