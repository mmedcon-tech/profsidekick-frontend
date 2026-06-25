#!/usr/bin/env bash
# Install Roblox-style kids GLB avatars (Layla / Omar) without touching Salama or Sultan.
#
# Usage:
#   ./scripts/install-roblox-avatars.sh ~/Desktop/women-roblox\ \(1\).glb ~/Desktop/men-roblox\ \(1\).glb
# Or with defaults from Desktop:
#   ./scripts/install-roblox-avatars.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WOMEN="${1:-$HOME/Desktop/women-roblox (1).glb}"
MEN="${2:-$HOME/Desktop/men-roblox (1).glb}"

for f in "$WOMEN" "$MEN"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing file: $f"
    exit 1
  fi
done

cp "$WOMEN" "$ROOT/public/avatars/kids-female.glb"
cp "$MEN" "$ROOT/public/avatars/kids-male.glb"
echo "Installed Layla (kids female) -> public/avatars/kids-female.glb"
echo "Installed Omar (kids male)    -> public/avatars/kids-male.glb"
ls -lh "$ROOT/public/avatars/kids-female.glb" "$ROOT/public/avatars/kids-male.glb"
