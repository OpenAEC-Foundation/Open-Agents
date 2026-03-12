#!/bin/bash
# claude-auth-refresh.sh — Automatisch Claude CLI OAuth vernieuwen op remote server
# Gebruik: ./scripts/claude-auth-refresh.sh [ssh-host]
# Default host: hetzner-agent

SSH_HOST="${1:-hetzner-agent}"

echo "🔐 Claude auth refresh voor $SSH_HOST..."

# 1. Start claude auth login op server (background)
echo "→ claude auth login starten op $SSH_HOST..."
ssh "$SSH_HOST" "rm -f /tmp/claude-auth.log; nohup claude auth login > /tmp/claude-auth.log 2>&1 &"
sleep 5

# 2. Haal de auth URL en poort op
AUTH_LOG=$(ssh "$SSH_HOST" "cat /tmp/claude-auth.log 2>/dev/null")
AUTH_URL=$(echo "$AUTH_LOG" | grep -oE 'https://[^ ]*claude\.ai[^ ]*' | head -1)
LOCAL_PORT=$(echo "$AUTH_LOG" | grep -oE 'localhost:([0-9]+)' | grep -oE '[0-9]+' | head -1)

if [ -z "$AUTH_URL" ] || [ -z "$LOCAL_PORT" ]; then
    echo "❌ URL of poort niet gevonden in auth log:"
    echo "$AUTH_LOG"
    exit 1
fi

echo "→ Auth URL: $AUTH_URL"
echo "→ Server poort: $LOCAL_PORT"

# 3. SSH tunnel: local:PORT → server:PORT (zodat callback werkt)
echo "→ SSH tunnel openen op poort $LOCAL_PORT..."
ssh -f -N -L "${LOCAL_PORT}:localhost:${LOCAL_PORT}" "$SSH_HOST"
sleep 2

# 4. Open URL in Windows browser (vanuit WSL)
echo "→ Browser openen..."
powershell.exe -Command "Start-Process '$AUTH_URL'" 2>/dev/null || \
    cmd.exe /c "start $AUTH_URL" 2>/dev/null

echo ""
echo "✅ Browser geopend. Klik 'Approve' / 'Authorize' in je browser."
echo "   De token wordt automatisch opgeslagen op de server via de SSH tunnel."
echo "   Wachten op bevestiging..."
echo ""

# 5. Poll tot auth klaar is (max 90s)
for i in $(seq 1 30); do
    sleep 3
    STATUS=$(ssh "$SSH_HOST" "claude auth status 2>/dev/null" 2>/dev/null)
    if echo "$STATUS" | grep -q '"loggedIn": true'; then
        echo "✅ Auth succesvol vernieuwd op $SSH_HOST!"
        # Cleanup tunnel
        pkill -f "ssh -f -N -L ${LOCAL_PORT}" 2>/dev/null
        exit 0
    fi
    echo "   Wachten... (${i}x3s)"
done

echo "❌ Timeout — klik Approve in de browser en probeer opnieuw"
pkill -f "ssh -f -N -L ${LOCAL_PORT}" 2>/dev/null
exit 1
