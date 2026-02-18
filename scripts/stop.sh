#!/bin/bash

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$APP_DIR/.northstar.pid"

if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null
    rm "$PIDFILE"
    echo "NorthStar stopped."
else
    echo "NorthStar is not running."
fi
