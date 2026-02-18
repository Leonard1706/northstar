#!/bin/bash

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3333
PIDFILE="$APP_DIR/.northstar.pid"
LOG="$APP_DIR/.northstar.log"

cd "$APP_DIR"
PORT=$PORT pnpm start >> "$LOG" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$PIDFILE"

# Wait for server
for i in $(seq 1 30); do
    if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
        echo "ready"
        exit 0
    fi
    sleep 0.5
done

echo "timeout"
exit 1
