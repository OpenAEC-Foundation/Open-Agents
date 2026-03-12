#!/usr/bin/env bash
# setup-hetzner-repo.sh — Zet de Open-Agents repo op de Hetzner server klaar.
#
# Gebruik (lokaal uitvoeren vanuit de Open-Agents repo root):
#   bash scripts/setup-hetzner-repo.sh
#
# Vereisten:
#   - SSH toegang tot hetzner-agent (geconfigureerd in ~/.ssh/config)
#   - GITHUB_PAT env var OF ~/.oa/config.json key "github_pat"
#   - oa-cli geïnstalleerd op de Hetzner server
#
# Idempotent: veilig meerdere keren uitvoeren.

set -euo pipefail

# ── Configuratie ─────────────────────────────────────────────────────────────
SSH_HOST="${OA_HETZNER_HOST:-hetzner-agent}"
REMOTE_REPO_PATH="${OA_REMOTE_REPO_PATH:-/home/oa-agent/Open-Agents}"
GIT_REPO_URL="${OA_GIT_URL:-https://github.com/OpenAEC-Foundation/Open-Agents.git}"
OA_CONFIG_REMOTE="$HOME/.oa/config.json"

# Lees PAT: env var heeft prioriteit boven ~/.oa/config.json
if [ -z "${GITHUB_PAT:-}" ]; then
  if [ -f "$HOME/.oa/config.json" ]; then
    GITHUB_PAT=$(python3 -c "import json,sys; d=json.load(open('$HOME/.oa/config.json')); print(d.get('github_pat',''))" 2>/dev/null || echo "")
  fi
fi

# ── Kleurcodes ───────────────────────────────────────────────────────────────
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
DIM="\033[2m"
RESET="\033[0m"

ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET} $*"; }
err()  { echo -e "${RED}✗${RESET} $*" >&2; exit 1; }
info() { echo -e "${DIM}→ $*${RESET}"; }

echo ""
echo "=== Hetzner Repo Setup ==="
echo ""

# ── 1. SSH verbinding controleren ────────────────────────────────────────────
info "Controleer SSH verbinding naar $SSH_HOST..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" "echo ok" &>/dev/null; then
  err "Kan niet verbinden met $SSH_HOST. Controleer ~/.ssh/config en SSH key."
fi
ok "SSH verbinding OK"

# ── 2. Bouw geauthenticeerde git URL ─────────────────────────────────────────
if [ -n "${GITHUB_PAT:-}" ]; then
  # Strip protocol, inject token
  URL_BODY="${GIT_REPO_URL#https://}"
  # Strip eventuele bestaande credentials
  if [[ "$URL_BODY" == *"@"* ]]; then
    URL_BODY="${URL_BODY#*@}"
  fi
  AUTH_URL="https://${GITHUB_PAT}@${URL_BODY}"
  info "GitHub PAT gevonden — private clone mogelijk"
else
  AUTH_URL="$GIT_REPO_URL"
  warn "Geen GITHUB_PAT gevonden — clone werkt alleen voor publieke repos"
  warn "Stel in via: export GITHUB_PAT=<token>  OF  oa set github_pat <token>"
fi

# ── 3. Check of repo al bestaat op Hetzner ────────────────────────────────────
info "Controleer of $REMOTE_REPO_PATH bestaat op $SSH_HOST..."
REPO_EXISTS=$(ssh -o BatchMode=yes "$SSH_HOST" \
  "test -d $(printf '%q' "$REMOTE_REPO_PATH") && echo yes || echo no" 2>/dev/null || echo no)

if [ "$REPO_EXISTS" = "yes" ]; then
  # ── 4a. Repo bestaat — git pull ──────────────────────────────────────────
  ok "Repo gevonden op Hetzner — git pull uitvoeren..."
  PULL_OUTPUT=$(ssh -o BatchMode=yes "$SSH_HOST" \
    "cd $(printf '%q' "$REMOTE_REPO_PATH") && git pull --ff-only 2>&1" || true)
  echo "   $PULL_OUTPUT"
  ok "Git pull klaar"
else
  # ── 4b. Repo bestaat niet — git clone ────────────────────────────────────
  info "Repo niet gevonden — git clone naar $REMOTE_REPO_PATH..."
  PARENT_DIR=$(dirname "$REMOTE_REPO_PATH")
  REPO_NAME=$(basename "$REMOTE_REPO_PATH")

  CLONE_RESULT=$(ssh -o BatchMode=yes "$SSH_HOST" \
    "mkdir -p $(printf '%q' "$PARENT_DIR") && \
     cd $(printf '%q' "$PARENT_DIR") && \
     git clone $(printf '%q' "$AUTH_URL") $(printf '%q' "$REPO_NAME") 2>&1" || true)

  if echo "$CLONE_RESULT" | grep -q "fatal\|error"; then
    err "Git clone mislukt:\n$CLONE_RESULT"
  fi
  ok "Repo gecloned naar $REMOTE_REPO_PATH"
fi

# ── 5. Maak ~/.oa/config.json aan op Hetzner ──────────────────────────────────
info "Configureer ~/.oa/config.json op $SSH_HOST..."
# Lees huidige remote config (als aanwezig) en merge/overschrijf de repo-paden
ssh -o BatchMode=yes "$SSH_HOST" bash <<SSHEOF
set -e
mkdir -p "\$HOME/.oa"
CONFIG="\$HOME/.oa/config.json"

# Lees huidige config of start met leeg object
if [ -f "\$CONFIG" ]; then
  CURRENT=\$(cat "\$CONFIG")
else
  CURRENT="{}"
fi

# Schrijf config met correcte remote_repo_path
python3 - <<'PYEOF'
import json, os, sys

config_path = os.path.expanduser("~/.oa/config.json")
try:
    with open(config_path) as f:
        cfg = json.load(f)
except Exception:
    cfg = {}

cfg["remote_repo_path"] = "$REMOTE_REPO_PATH"
cfg.setdefault("remote_repo_git_url", "$GIT_REPO_URL")
cfg.setdefault("default_model", "hetzner/mixtral:8x7b")

with open(config_path, "w") as f:
    json.dump(cfg, f, indent=2)

print("Config geschreven naar", config_path)
PYEOF
SSHEOF
ok "~/.oa/config.json geconfigureerd op $SSH_HOST"

# ── 6. Verificatie ────────────────────────────────────────────────────────────
info "Verificatie — bekijk repo op $SSH_HOST..."
VERIFY=$(ssh -o BatchMode=yes "$SSH_HOST" \
  "ls $(printf '%q' "$REMOTE_REPO_PATH") | head -5" 2>/dev/null || echo "(leeg of fout)")
echo "   Repo inhoud: $VERIFY"

ok "Setup voltooid!"
echo ""
echo -e "${GREEN}Hetzner is klaar voor agent spawning.${RESET}"
echo "Voer nu een test uit met:"
echo "  oa run 'zeg hallo' --name test-ping --model claude/haiku"
echo ""
