#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${NORTHSTAR_PORT:-3333}"
URL="http://localhost:$PORT"

if /bin/bash "$APP_DIR/scripts/start-server.sh" >/dev/null; then
    open "$URL"
    exit 0
fi

echo "Failed to start NorthStar. See $APP_DIR/.northstar.log" >&2
exit 1
