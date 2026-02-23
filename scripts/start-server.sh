#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${NORTHSTAR_PORT:-3333}"
URL="http://localhost:$PORT"
PIDFILE="$APP_DIR/.northstar.pid"
LOG="$APP_DIR/.northstar.log"
START_TIMEOUT_SECONDS="${NORTHSTAR_START_TIMEOUT_SECONDS:-60}"
MIN_NODE_VERSION="${NORTHSTAR_MIN_NODE_VERSION:-20.9.0}"
LOCK_DIR="$APP_DIR/.northstar.start.lock"

# Finder-launched apps run with a very small PATH. Add common install locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/share/pnpm:$PATH"

NEXT_BIN="$APP_DIR/node_modules/next/dist/bin/next"

version_gte() {
    [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

wait_for_server_ready() {
    local timeout_seconds="$1"
    local expected_pid="${2:-}"
    local success_count=0
    local html
    local chunk_path

    for _ in $(seq 1 "$timeout_seconds"); do
        if [ -n "$expected_pid" ] && ! kill -0 "$expected_pid" 2>/dev/null; then
            return 2
        fi

        html="$(curl -fsS "$URL" 2>/dev/null || true)"
        if [ -n "$html" ] && printf '%s' "$html" | grep -q '__next'; then
            chunk_path="$(printf '%s' "$html" | tr '"' '\n' | grep -m1 '^/_next/static/.*\.js$' || true)"
            if [ -n "$chunk_path" ]; then
                if curl -fsS "$URL$chunk_path" >/dev/null 2>&1; then
                    success_count=$((success_count + 1))
                else
                    success_count=0
                fi
            else
                success_count=$((success_count + 1))
            fi
        else
            success_count=0
        fi

        if [ "$success_count" -ge 2 ]; then
            return 0
        fi

        sleep 1
    done

    return 1
}

server_pid_from_port() {
    if command -v lsof >/dev/null 2>&1; then
        lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n1 || true
        return
    fi

    echo ""
}

acquire_lock() {
    local waited=0
    while ! mkdir "$LOCK_DIR" 2>/dev/null; do
        if wait_for_server_ready 1 ""; then
            echo "ready"
            exit 0
        fi

        waited=$((waited + 1))
        if [ "$waited" -ge "$START_TIMEOUT_SECONDS" ]; then
            echo "timeout: launcher lock was not released" >&2
            exit 1
        fi
        sleep 1
    done

    trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
}

resolve_node() {
    local candidates=()
    local node_from_path=""
    local candidate
    local version
    local best_node=""
    local best_version=""

    if command -v node >/dev/null 2>&1; then
        node_from_path="$(command -v node)"
        candidates+=("$node_from_path")
    fi

    for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
        [ -x "$candidate" ] && candidates+=("$candidate")
    done

    for candidate in "$HOME"/.nvm/versions/node/*/bin/node; do
        [ -x "$candidate" ] && candidates+=("$candidate")
    done

    for candidate in "$HOME"/.fnm/node-versions/*/installation/bin/node; do
        [ -x "$candidate" ] && candidates+=("$candidate")
    done

    for candidate in "${candidates[@]}"; do
        version="$("$candidate" -p "process.versions.node" 2>/dev/null || true)"
        [ -z "$version" ] && continue

        if version_gte "$version" "$MIN_NODE_VERSION"; then
            if [ -z "$best_version" ] || version_gte "$version" "$best_version"; then
                best_node="$candidate"
                best_version="$version"
            fi
        fi
    done

    if [ -n "$best_node" ]; then
        echo "$best_node"
        return
    fi

    return 1
}

cleanup_stale_pid() {
    if [ ! -f "$PIDFILE" ]; then
        return
    fi

    local pid
    pid="$(cat "$PIDFILE" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return
    fi

    rm -f "$PIDFILE"
}

should_rebuild() {
    local build_id="$APP_DIR/.next/BUILD_ID"

    if [ ! -f "$build_id" ]; then
        return 0
    fi

    if [ "$APP_DIR/package.json" -nt "$build_id" ] || [ "$APP_DIR/next.config.ts" -nt "$build_id" ]; then
        return 0
    fi

    local newest_source
    newest_source="$(find "$APP_DIR/app" "$APP_DIR/components" "$APP_DIR/hooks" "$APP_DIR/lib" "$APP_DIR/public" \
        -type f -newer "$build_id" -print -quit 2>/dev/null || true)"
    if [ -n "$newest_source" ]; then
        return 0
    fi

    return 1
}

if [ ! -f "$NEXT_BIN" ]; then
    echo "missing-deps: run 'pnpm install' in $APP_DIR" >&2
    exit 1
fi

acquire_lock

NODE_BIN="$(resolve_node || true)"
if [ -z "$NODE_BIN" ]; then
    echo "missing-node: Node.js >= $MIN_NODE_VERSION is required (Finder may be using an older system node)" >&2
    exit 1
fi

cleanup_stale_pid

# Reuse or recover existing server process recorded in pidfile.
if [ -f "$PIDFILE" ]; then
    pid="$(cat "$PIDFILE" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        if wait_for_server_ready "$START_TIMEOUT_SECONDS" "$pid"; then
            echo "ready"
            exit 0
        fi

        # Process exists but never became healthy; replace it.
        kill "$pid" 2>/dev/null || true
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    fi
    rm -f "$PIDFILE"
fi

# Reuse a listener that may not have a pidfile (for example after a stale cleanup).
port_pid="$(server_pid_from_port)"
if [ -n "$port_pid" ] && kill -0 "$port_pid" 2>/dev/null; then
    if wait_for_server_ready "$START_TIMEOUT_SECONDS" "$port_pid"; then
        echo "$port_pid" > "$PIDFILE"
        echo "ready"
        exit 0
    fi

    kill "$port_pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$port_pid" 2>/dev/null; then
        kill -9 "$port_pid" 2>/dev/null || true
    fi
fi

cd "$APP_DIR"

if should_rebuild; then
    "$NODE_BIN" "$NEXT_BIN" build >> "$LOG" 2>&1
fi

nohup "$NODE_BIN" "$NEXT_BIN" start -p "$PORT" >> "$LOG" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PIDFILE"

if wait_for_server_ready "$START_TIMEOUT_SECONDS" "$SERVER_PID"; then
    echo "ready"
    exit 0
fi

kill "$SERVER_PID" 2>/dev/null || true
rm -f "$PIDFILE"
if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -9 "$SERVER_PID" 2>/dev/null || true
    echo "timeout" >&2
else
    echo "failed: server exited early (see $LOG)" >&2
fi
exit 1
