#!/bin/bash
# session-start.sh — Open-Agents bootstrap protocol
# Gebruik: bash scripts/session-start.sh
# Doel: Hetzner GPU server volledig bootstrappen — deterministisch, geen interactie nodig

set -euo pipefail

HETZNER_HOST="hetzner"
HETZNER_USER="oa-agent"
HETZNER_IP="144.76.60.210"
REMOTE_REPO="/home/oa-agent/Open-Agents"
TERMINAL_APP_PORT=7127
OA_WEB_PORT=5174
LOCAL_CREDS="$HOME/.claude/.credentials.json"

# Detect local repo path (WSL or Windows)
if [ -d "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents" ]; then
  REPO="/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents"
elif [ -d "/c/Users/Freek Heijting/Documents/GitHub/Open-Agents" ]; then
  REPO="/c/Users/Freek Heijting/Documents/GitHub/Open-Agents"
else
  REPO="$(cd "$(dirname "$0")/.." && pwd)"
fi
cd "$REPO"

ok()   { echo -e "  \033[32m✅ $1\033[0m"; }
fail() { echo -e "  \033[31m❌ $1\033[0m"; }
warn() { echo -e "  \033[33m⚠  $1\033[0m"; }
step() { echo -e "\n\033[1m▶ $1\033[0m"; }

echo "╔══════════════════════════════════════════════════╗"
echo "║       Open-Agents — Hetzner Session Bootstrap    ║"
echo "╚══════════════════════════════════════════════════╝"

# ─── 1. SSH connectivity ─────────────────────────────────────────────────────
step "1/7  SSH connectivity"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$HETZNER_HOST" "echo ok" &>/dev/null; then
  fail "Hetzner ($HETZNER_IP) niet bereikbaar via SSH"
  echo "    Controleer: ssh $HETZNER_HOST"
  exit 1
fi
ok "SSH naar $HETZNER_HOST ($HETZNER_IP)"

# ─── 2. Repo sync ────────────────────────────────────────────────────────────
step "2/7  Repo sync op Hetzner"
ssh "$HETZNER_HOST" "
  cd $REMOTE_REPO 2>/dev/null || { echo 'REPO_MISSING'; exit 1; }
  git fetch origin --quiet 2>/dev/null
  git reset --hard origin/main --quiet 2>/dev/null
  echo \$(git log --oneline -1)
" 2>&1 | while read -r line; do
  if [ "$line" = "REPO_MISSING" ]; then
    fail "Repo niet gevonden op $REMOTE_REPO"
  else
    ok "Repo: $line"
  fi
done

# ─── 3. Credentials sync (root + oa-agent) ───────────────────────────────────
step "3/7  Claude credentials sync"
if [ ! -f "$LOCAL_CREDS" ]; then
  fail "Lokale credentials niet gevonden: $LOCAL_CREDS"
  echo "    Voer uit: claude auth login"
  exit 1
fi

# Sync to root
scp -o BatchMode=yes -o ConnectTimeout=5 "$LOCAL_CREDS" "$HETZNER_HOST:~/.claude/.credentials.json" &>/dev/null \
  && ok "Credentials → root" \
  || fail "SCP naar root mislukt"

# Sync to oa-agent
ssh "$HETZNER_HOST" "
  mkdir -p /home/$HETZNER_USER/.claude
  cp ~/.claude/.credentials.json /home/$HETZNER_USER/.claude/.credentials.json
  chown $HETZNER_USER:$HETZNER_USER /home/$HETZNER_USER/.claude/.credentials.json
" &>/dev/null \
  && ok "Credentials → oa-agent" \
  || fail "Copy naar oa-agent mislukt"

# Verify auth works
AUTH_CHECK=$(ssh "$HETZNER_HOST" "su - $HETZNER_USER -c 'echo ping | claude --print 2>&1 | head -1'" 2>/dev/null)
if echo "$AUTH_CHECK" | grep -qi "pong\|ping"; then
  ok "Auth verificatie geslaagd"
else
  fail "Auth verificatie mislukt: $AUTH_CHECK"
  echo "    Voer lokaal uit: claude auth login"
  echo "    Daarna opnieuw: bash scripts/session-start.sh"
  exit 1
fi

# ─── 4. Terminal-app (port 7127) ──────────────────────────────────────────────
step "4/7  Terminal-app (port $TERMINAL_APP_PORT)"
TERM_RUNNING=$(ssh "$HETZNER_HOST" "ss -tlnp | grep :$TERMINAL_APP_PORT | wc -l" 2>/dev/null)
if [ "$TERM_RUNNING" -gt 0 ]; then
  ok "Terminal-app draait al op port $TERMINAL_APP_PORT"
else
  warn "Terminal-app niet actief — wordt gestart..."
  ssh "$HETZNER_HOST" "
    su - $HETZNER_USER -c 'cd $REMOTE_REPO/scripts/terminal-app && nohup python3 server.py > /tmp/terminal-app.log 2>&1 &'
  " 2>/dev/null
  sleep 3
  TERM_CHECK=$(ssh "$HETZNER_HOST" "ss -tlnp | grep :$TERMINAL_APP_PORT | wc -l" 2>/dev/null)
  if [ "$TERM_CHECK" -gt 0 ]; then
    ok "Terminal-app gestart op port $TERMINAL_APP_PORT"
  else
    fail "Terminal-app kon niet starten — check /tmp/terminal-app.log"
  fi
fi

# ─── 5. Cleanup stale agents + zombie processes ──────────────────────────────
step "5/7  Cleanup stale agents"
ZOMBIES=$(ssh "$HETZNER_HOST" "ps aux | grep '\[claude\] <defunct>' | grep -v grep | wc -l" 2>/dev/null)
if [ "$ZOMBIES" -gt 0 ]; then
  ssh "$HETZNER_HOST" "ps aux | grep '\[claude\] <defunct>' | grep -v grep | awk '{print \$2}' | xargs kill -9 2>/dev/null || true" 2>/dev/null
  ok "Killed $ZOMBIES zombie claude processes"
else
  ok "Geen zombie processes"
fi

# ─── 6. oa status ────────────────────────────────────────────────────────────
step "6/7  oa status"
ssh "$HETZNER_HOST" "su - $HETZNER_USER -c 'cd $REMOTE_REPO && oa status 2>&1'" 2>/dev/null || warn "oa status niet beschikbaar"

# ─── 7. Context laden ────────────────────────────────────────────────────────
step "7/7  Context"
echo ""
echo "  Laatste LESSONS:"
tail -20 LESSONS.md 2>/dev/null | sed 's/^/    /' || echo "    (geen LESSONS.md)"

HANDOFF=$(ls docs/HANDOFF-*.md 2>/dev/null | sort | tail -1)
if [ -n "$HANDOFF" ]; then
  echo ""
  echo "  Laatste HANDOFF: $HANDOFF"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Sessie klaar!                                  ║"
echo "║                                                 ║"
echo "║  Terminal dashboard: http://$HETZNER_IP:$TERMINAL_APP_PORT  ║"
echo "║  oa Web UI:          http://$HETZNER_IP:$OA_WEB_PORT   ║"
echo "║                                                 ║"
echo "║  Stuur taken via:                               ║"
echo "║  oa send session-meta 'taak' --from meta        ║"
echo "╚══════════════════════════════════════════════════╝"
