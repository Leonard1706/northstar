#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${NORTHSTAR_PORT:-3333}"
PIDFILE="$APP_DIR/.northstar.pid"

stopped=0

stop_pid() {
    local pid="$1"
    if [ -z "$pid" ]; then
        return
    fi

    if ! kill -0 "$pid" 2>/dev/null; then
        return
    fi

    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 10); do
        if ! kill -0 "$pid" 2>/dev/null; then
            stopped=1
            return
        fi
        sleep 0.2
    done

    kill -9 "$pid" 2>/dev/null || true
    stopped=1
}

if [ -f "$PIDFILE" ]; then
    pid="$(cat "$PIDFILE" 2>/dev/null || true)"
    stop_pid "$pid"
    rm -f "$PIDFILE"
fi

# Fallback for stale/missing pid files.
if command -v lsof >/dev/null 2>&1; then
    while IFS= read -r pid; do
        stop_pid "$pid"
    done < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
fi

if [ "$stopped" -eq 1 ]; then
    echo "NorthStar stopped."
else
    echo "NorthStar is not running."
fi
