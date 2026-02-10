#!/usr/bin/env bash
set -euo pipefail

# Sync trained ticker bundles from Google Drive into local bundles/.
# Requires: rclone configured with a Google Drive remote.
#
# Usage:
#   ./scripts/sync_bundles_from_drive.sh
#   DRIVE_REMOTE=gdrive DRIVE_BUNDLE_PATH=stock_bundles_delta ./scripts/sync_bundles_from_drive.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DRIVE_REMOTE="${DRIVE_REMOTE:-gdrive}"
DRIVE_BUNDLE_PATH="${DRIVE_BUNDLE_PATH:-stock_bundles_delta}"
LOCAL_BUNDLE_DIR="${LOCAL_BUNDLE_DIR:-$ROOT_DIR/bundles}"

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is not installed. Install with: brew install rclone"
  exit 1
fi

mkdir -p "$LOCAL_BUNDLE_DIR"

echo "Syncing from ${DRIVE_REMOTE}:${DRIVE_BUNDLE_PATH} -> ${LOCAL_BUNDLE_DIR}"
rclone copy \
  "${DRIVE_REMOTE}:${DRIVE_BUNDLE_PATH}" \
  "$LOCAL_BUNDLE_DIR" \
  --include "*_tcn_final.keras" \
  --include "*_feature_scaler.pkl" \
  --include "*_target_scaler.pkl" \
  --include "*_meta.json" \
  --progress

echo
echo "Bundle files now in $LOCAL_BUNDLE_DIR:"
ls -1 "$LOCAL_BUNDLE_DIR" | sed 's/^/  - /'
