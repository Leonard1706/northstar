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
ICON_PATH_ICNS="$APP_DIR/public/app-icon.icns"
ICON_PATH_PNG="$APP_DIR/public/app-icon.png"
ICON_PATH_JPG="$APP_DIR/public/app-icon.jpg"
ICON_PATH_JPEG="$APP_DIR/public/app-icon.jpeg"

generate_icns_from_raster() {
    local source_path="$1"
    local output_icns="$2"
    local tmp_dir
    local iconset_dir
    local base_size
    local scale
    local pixel_size
    local suffix
    local output_path

    tmp_dir="$(mktemp -d)" || return 1
    iconset_dir="$tmp_dir/NorthStar.iconset"
    mkdir -p "$iconset_dir"

    for base_size in 16 32 128 256 512; do
        for scale in 1 2; do
            pixel_size=$((base_size * scale))
            suffix=""
            if [ "$scale" -eq 2 ]; then
                suffix="@2x"
            fi
            output_path="$iconset_dir/icon_${base_size}x${base_size}${suffix}.png"
            if ! sips -s format png -z "$pixel_size" "$pixel_size" "$source_path" --out "$output_path" >/dev/null; then
                rm -rf "$tmp_dir"
                return 1
            fi
        done
    done

    if ! iconutil -c icns "$iconset_dir" -o "$output_icns"; then
        rm -rf "$tmp_dir"
        return 1
    fi
    rm -rf "$tmp_dir"
}

apply_custom_icon() {
    local icon_source=""
    local app_icon_target="$TARGET_APP/Contents/Resources/applet.icns"
    local app_assets_car="$TARGET_APP/Contents/Resources/Assets.car"
    local app_info_plist="$TARGET_APP/Contents/Info.plist"
    local tmp_icns
    local tmp_icon_dir

    if [ -f "$ICON_PATH_ICNS" ]; then
        icon_source="$ICON_PATH_ICNS"
    elif [ -f "$ICON_PATH_PNG" ]; then
        icon_source="$ICON_PATH_PNG"
    elif [ -f "$ICON_PATH_JPG" ]; then
        icon_source="$ICON_PATH_JPG"
    elif [ -f "$ICON_PATH_JPEG" ]; then
        icon_source="$ICON_PATH_JPEG"
    else
        return
    fi

    if [[ "$icon_source" = *.icns ]]; then
        cp "$icon_source" "$app_icon_target"
    else
        if ! command -v sips >/dev/null 2>&1 || ! command -v iconutil >/dev/null 2>&1; then
            echo "Warning: icon tools not available; skipping custom app icon."
            return
        fi

        tmp_icon_dir="$(mktemp -d)" || return
        tmp_icns="$tmp_icon_dir/applet.icns"
        if ! generate_icns_from_raster "$icon_source" "$tmp_icns"; then
            rm -rf "$tmp_icon_dir"
            echo "Warning: failed to convert $icon_source to .icns; skipping custom app icon."
            return
        fi
        cp "$tmp_icns" "$app_icon_target"
        rm -rf "$tmp_icon_dir"
    fi

    # Helps Finder/Dock notice icon updates faster.
    if [ -f "$app_assets_car" ]; then
        rm -f "$app_assets_car"
    fi

    if [ -x /usr/libexec/PlistBuddy ] && [ -f "$app_info_plist" ]; then
        /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile applet" "$app_info_plist" >/dev/null 2>&1 || \
            /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string applet" "$app_info_plist" >/dev/null 2>&1 || true
        /usr/libexec/PlistBuddy -c "Set :CFBundleIconName applet" "$app_info_plist" >/dev/null 2>&1 || \
            /usr/libexec/PlistBuddy -c "Add :CFBundleIconName string applet" "$app_info_plist" >/dev/null 2>&1 || true
    fi

    if command -v codesign >/dev/null 2>&1; then
        codesign --force --sign - "$TARGET_APP" >/dev/null 2>&1 || true
    fi

    touch "$TARGET_APP"
    touch "$TARGET_APP/Contents/Resources"
    echo "Applied custom app icon from: $icon_source"
}

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
apply_custom_icon

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
