#!/usr/bin/env bash
# Open-Agents Installer — Linux (Ubuntu/Debian/Arch) and macOS
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OA_CLI_DIR="$SCRIPT_DIR/oa-cli"
WEB_DIR="$OA_CLI_DIR/web"

GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"; RESET="\033[0m"
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }
fail() { echo -e "${RED}✗ $1${RESET}"; }
info() { echo -e "${YELLOW}→ $1${RESET}"; }

detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
  elif [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "$ID" in ubuntu|debian) OS="debian" ;; arch|manjaro) OS="arch" ;; *) OS="linux" ;; esac
  else
    OS="linux"
  fi
}

install_pkg() {
  case "$OS" in
    debian) sudo apt-get install -y "$@" -qq ;;
    arch)   sudo pacman -S --noconfirm "$@" ;;
    macos)
      if ! command -v brew &>/dev/null; then
        info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      fi
      brew install "$@" ;;
    *) fail "Unsupported OS. Please install manually: $*"; exit 1 ;;
  esac
}

check_python() {
  info "Checking Python >= 3.10..."
  local py=""
  for cmd in python3.12 python3.11 python3.10 python3 python; do
    if command -v "$cmd" &>/dev/null; then
      local ver; ver=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
      local major minor; major=$(echo "$ver" | cut -d. -f1); minor=$(echo "$ver" | cut -d. -f2)
      if [[ "$major" -ge 3 && "$minor" -ge 10 ]]; then py="$cmd"; break; fi
    fi
  done
  if [[ -z "$py" ]]; then
    info "Python >= 3.10 not found — installing..."
    case "$OS" in
      debian) install_pkg python3 python3-pip python3-venv ;;
      arch)   install_pkg python python-pip ;;
      macos)  install_pkg python@3.12 ;;
    esac
    py="python3"
  fi
  PYTHON="$py"
  ok "Python $($PYTHON --version 2>&1)"
}

check_pip() {
  info "Checking pip..."
  if ! "$PYTHON" -m pip --version &>/dev/null; then
    info "pip not found — installing..."
    case "$OS" in
      debian) install_pkg python3-pip ;;
      arch)   install_pkg python-pip ;;
      macos)  "$PYTHON" -m ensurepip --upgrade ;;
    esac
  fi
  ok "pip $("$PYTHON" -m pip --version | awk '{print $2}')"
}

check_node() {
  info "Checking Node.js >= 18..."
  local need_node=false
  if command -v node &>/dev/null; then
    local ver; ver=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])" 2>/dev/null || echo "0")
    [[ "$ver" -lt 18 ]] && need_node=true
  else
    need_node=true
  fi
  if $need_node; then
    info "Node.js >= 18 not found — installing..."
    case "$OS" in
      debian)
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        install_pkg nodejs ;;
      arch)  install_pkg nodejs npm ;;
      macos) install_pkg node ;;
    esac
  fi
  ok "Node.js $(node --version)"
}

check_tmux() {
  info "Checking tmux..."
  if ! command -v tmux &>/dev/null; then
    info "tmux not found — installing..."
    install_pkg tmux
  fi
  ok "tmux $(tmux -V)"
}

check_claude() {
  info "Checking claude CLI..."
  if ! command -v claude &>/dev/null; then
    fail "claude CLI not found."
    echo "  Install it from: https://claude.ai/download"
    echo "  Then re-run this installer."
    exit 1
  fi
  ok "claude $(claude --version 2>&1 | head -1)"
}

ensure_local_bin_in_path() {
  local local_bin="$HOME/.local/bin"
  mkdir -p "$local_bin"
  if [[ ":$PATH:" != *":$local_bin:"* ]]; then
    info "Adding $local_bin to PATH..."
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
      [[ -f "$rc" ]] && echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$rc" && ok "Updated $rc"
    done
    export PATH="$local_bin:$PATH"
  else
    ok "$local_bin already in PATH"
  fi
}

install_oa_cli() {
  info "Installing oa-cli..."
  [[ ! -d "$OA_CLI_DIR" ]] && { fail "oa-cli not found at $OA_CLI_DIR"; exit 1; }
  "$PYTHON" -m pip install -e "$OA_CLI_DIR" --quiet
  ok "oa-cli installed → $(command -v oa 2>/dev/null || echo "$HOME/.local/bin/oa")"
}

build_web_ui() {
  info "Building web UI..."
  if [[ ! -d "$WEB_DIR" ]]; then
    info "No web directory at $WEB_DIR — skipping."
    return
  fi
  pushd "$WEB_DIR" > /dev/null
  npm install --silent
  npm run build --silent
  popd > /dev/null
  ok "Web UI built"
}

main() {
  echo ""
  echo "  Open-Agents Installer"
  echo "  ────────────────────"
  echo ""
  detect_os
  info "Detected OS: $OS"
  echo ""
  check_python
  check_pip
  check_node
  check_tmux
  check_claude
  echo ""
  ensure_local_bin_in_path
  install_oa_cli
  build_web_ui
  echo ""
  ok "Installation complete!"
  echo ""
  echo "  Get started:"
  echo "    oa dashboard     # Launch the TUI dashboard"
  echo "    oa web           # Start the web UI"
  echo "    oa --help        # Show all commands"
  echo ""
  echo "  If 'oa' is not found, restart your terminal or run: source ~/.bashrc"
  echo ""
}

main "$@"
