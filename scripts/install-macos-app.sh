#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$APP_DIR/scripts/NorthStar.applescript"
DEFAULT_TARGET_DIR="$HOME/Applications"
if [ -w "/Applications" ]; then
    DEFAULT_TARGET_DIR="/Applications"
fi
TARGET_DIR="${1:-$DEFAULT_TARGET_DIR}"
APP_NAME="${2:-NorthStar.app}"
TARGET_APP="$TARGET_DIR/$APP_NAME"

if ! command -v osacompile >/dev/null 2>&1; then
    echo "osacompile not found. This script must run on macOS." >&2
    exit 1
fi

mkdir -p "$TARGET_DIR"

escaped_root="${APP_DIR//\\/\\\\}"
escaped_root="${escaped_root//\"/\\\"}"
escaped_root="${escaped_root//&/\\&}"

tmp_script="$(mktemp)"
trap 'rm -f "$tmp_script"' EXIT

sed "s|__NORTHSTAR_PROJECT_ROOT__|$escaped_root|g" "$TEMPLATE" > "$tmp_script"
rm -rf "$TARGET_APP"
# -s compiles as "stay open" app so quit lifecycle can control server shutdown.
osacompile -s -o "$TARGET_APP" "$tmp_script"

echo "Installed: $TARGET_APP"
echo "Usage: open \"$TARGET_APP\""
echo "Tip: Drag NorthStar.app to your Dock for one-click launch."

other_dir=""
if [ "$TARGET_DIR" = "/Applications" ]; then
    other_dir="$HOME/Applications"
else
    other_dir="/Applications"
fi

if [ -d "$other_dir/$APP_NAME" ]; then
    other_path="$other_dir/$APP_NAME"
    same_target=0
    if [ -L "$other_path" ]; then
        link_target="$(stat -f '%Y' "$other_path" 2>/dev/null || true)"
        if [ "$link_target" = "$TARGET_APP" ]; then
            same_target=1
        fi
    fi

    if [ "$same_target" -eq 0 ]; then
        echo "Warning: another launcher exists at $other_path"
        echo "Remove old launchers to avoid opening a stale app version."
    fi
fi
