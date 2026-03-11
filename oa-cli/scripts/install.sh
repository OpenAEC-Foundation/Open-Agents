#!/usr/bin/env bash
# install.sh — Install open-agents-cli from source
set -e

# Detect OS for platform-specific instructions
OS=$(uname -s 2>/dev/null || echo "Unknown")

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing open-agents-cli from $REPO_ROOT ..."

# Check Python >= 3.10
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
python_major=$(echo "$python_version" | cut -d. -f1)
python_minor=$(echo "$python_version" | cut -d. -f2)

if [ "$python_major" -lt 3 ] || { [ "$python_major" -eq 3 ] && [ "$python_minor" -lt 10 ]; }; then
    echo "Error: Python >= 3.10 required. Found: $python_version"
    exit 1
fi
echo "  Python $python_version ... OK"

# Check tmux
if ! command -v tmux &>/dev/null; then
    echo "Warning: tmux not found."
    case "$OS" in
        Linux)
            echo "  Install with: sudo apt install tmux"
            ;;
        Darwin)
            echo "  Install with: brew install tmux"
            ;;
        MINGW*|CYGWIN*|MSYS*)
            echo "  Windows detected. Please set up WSL (Windows Subsystem for Linux) and install tmux in your WSL distribution."
            echo "  Once in WSL: sudo apt install tmux"
            ;;
        *)
            echo "  Unknown OS: $OS. Please install tmux using your package manager."
            ;;
    esac
fi

# Check claude CLI
if ! command -v claude &>/dev/null; then
    echo "Warning: claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
fi

# Install package
pip install --quiet --upgrade pip
pip install --quiet "$REPO_ROOT"

echo ""
echo "Installation complete. Running setup..."
oa setup

echo ""
echo "Detected OS: $OS"
echo ""
echo "Done! Use 'oa start' to launch your first session."
