#!/bin/bash
# Open-Agents Tauri Setup Script
# Run: bash setup-tauri.sh

set -e

echo "=== Open-Agents Tauri Setup ==="
echo ""

# 1. Rust
echo ">>> [1/4] Rust laden..."
source /home/freek/.cargo/env 2>/dev/null || true
if ! command -v rustc &>/dev/null; then
  echo "Rust niet gevonden — installeer via: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  exit 1
fi
echo "✓ Rust $(rustc --version)"

# 2. System dependencies
echo ""
echo ">>> [2/4] System dependencies installeren (sudo nodig)..."
sudo apt-get update -qq
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  libgtk-3-dev
echo "✓ System dependencies OK"

# 3. npm install
echo ""
echo ">>> [3/4] npm install..."
cd "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/web"
npm install
echo "✓ npm install OK"

# 4. Klaar
echo ""
echo "=== Setup compleet! ==="
echo ""
echo "Start de desktop app met:"
echo "  cd \"/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/web\""
echo "  npm run tauri:dev"
echo ""
