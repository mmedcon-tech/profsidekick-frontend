#!/usr/bin/env bash
# Install the advisor Emirati woman GLB for Salama (avatar-1).
#
# Download (requires your NYU/Google login):
#   https://drive.google.com/file/d/1dU4NPM8AClKtKDYOT0Jc9lsFEfr1tp-s/view?usp=drivesdk
#
# Portrait reference: public/images/salama-emirati-reference.png
#
# Usage:
#   ./scripts/install-salama-glb.sh ~/Downloads/emirati-woman.glb

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-}"

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "Place your downloaded Emirati woman .glb file path as the first argument."
  echo "Example: ./scripts/install-salama-glb.sh ~/Downloads/emirati-woman.glb"
  exit 1
fi

cp "$SRC" "$ROOT/public/avatars/avatar-1.glb"
echo "Installed Salama GLB -> public/avatars/avatar-1.glb"
ls -lh "$ROOT/public/avatars/avatar-1.glb"
