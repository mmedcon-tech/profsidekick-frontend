#!/usr/bin/env bash
# Install a licensed Emirati / Arab male GLB for Sultan (avatar-2).
#
# Best free starting points (manual download — Sketchfab requires login):
#   https://sketchfab.com/3d-models/arab-man-rigged-0f87f4c0885346ad8f99ba5ccafd153e  (CC Attribution, RPM rig)
#   https://sketchfab.com/3d-models/bald-arab-man-27268d822ca74efbbd582d8210a0aaf0     (CC Attribution)
#   https://www.cgtrader.com/3d-models/arab-man                                      (thobe / kandura models)
#
# Usage:
#   ./scripts/install-sultan-glb.sh ~/Downloads/arab-man.glb

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-}"

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "Place your downloaded Arab / Emirati male .glb file path as the first argument."
  echo "Example: ./scripts/install-sultan-glb.sh ~/Downloads/arab-man.glb"
  exit 1
fi

cp "$SRC" "$ROOT/public/avatars/avatar-2.glb"
echo "Installed Sultan GLB -> public/avatars/avatar-2.glb"
ls -lh "$ROOT/public/avatars/avatar-2.glb"
