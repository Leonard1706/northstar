#!/bin/bash

# NorthStar Launcher
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3333
URL="http://localhost:$PORT"
PIDFILE="$APP_DIR/.northstar.pid"
LOG="$APP_DIR/.northstar.log"

# Check if already running
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    open "$URL"
    exit 0
fi

cd "$APP_DIR"

# Build if needed (checks if .next exists)
if [ ! -d ".next" ]; then
    pnpm build >> "$LOG" 2>&1
fi

# Start production server
PORT=$PORT pnpm start >> "$LOG" 2>&1 &
echo $! > "$PIDFILE"

# Wait for server to be ready
for i in $(seq 1 30); do
    if curl -s "$URL" > /dev/null 2>&1; then
        open "$URL"
        exit 0
    fi
    sleep 0.5
done

echo "Failed to start NorthStar" >&2
exit 1
