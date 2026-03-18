#!/bin/bash
# sync-claude-credentials.sh — Sync local Claude credentials to remote hosts via scp.
#
# Usage:
#   bash sync-claude-credentials.sh [host1] [host2] ...
#   Without args: syncs to all hosts in ~/.oa/machines.json
#
# Multi-account support:
#   ~/.oa/accounts.json maps hosts to specific credential files:
#   {"hetzner-agent": "~/.claude/.credentials-work.json"}
#   If no mapping: uses default ~/.claude/.credentials.json

set -euo pipefail

DEFAULT_CREDS="$HOME/.claude/.credentials.json"
MACHINES_FILE="$HOME/.oa/machines.json"
ACCOUNTS_FILE="$HOME/.oa/accounts.json"

# Colors
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
RESET='\033[0m'

get_creds_for_host() {
    local host="$1"
    if [ -f "$ACCOUNTS_FILE" ]; then
        local mapped
        mapped=$(python3 -c "
import json, os, sys
with open('$ACCOUNTS_FILE') as f:
    accounts = json.load(f)
path = accounts.get('$host', '')
if path:
    print(os.path.expanduser(path))
" 2>/dev/null)
        if [ -n "$mapped" ] && [ -f "$mapped" ]; then
            echo "$mapped"
            return
        fi
    fi
    echo "$DEFAULT_CREDS"
}

get_all_hosts() {
    if [ ! -f "$MACHINES_FILE" ]; then
        echo ""
        return
    fi
    python3 -c "
import json
with open('$MACHINES_FILE') as f:
    machines = json.load(f)
if isinstance(machines, list):
    for m in machines:
        host = m.get('host', m.get('ssh_host', '')) if isinstance(m, dict) else str(m)
        if host:
            print(host)
elif isinstance(machines, dict):
    for key, val in machines.items():
        host = val.get('host', val.get('ssh_host', key)) if isinstance(val, dict) else str(val)
        if host:
            print(host)
" 2>/dev/null
}

sync_host() {
    local host="$1"
    local creds
    creds=$(get_creds_for_host "$host")

    if [ ! -f "$creds" ]; then
        echo -e "${RED}FAIL${RESET} $host — credentials file not found: $creds"
        return 1
    fi

    # Ensure remote ~/.claude/ directory exists
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$host" "mkdir -p ~/.claude" 2>/dev/null; then
        echo -e "${RED}FAIL${RESET} $host — SSH connection failed"
        return 1
    fi

    # Copy credentials to root
    if ! scp -o BatchMode=yes -o ConnectTimeout=5 "$creds" "$host:~/.claude/.credentials.json" 2>/dev/null; then
        echo -e "${RED}FAIL${RESET} $host — scp failed"
        return 1
    fi

    # Also copy to oa-agent user if it exists (terminal-app runs as oa-agent)
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$host" \
        'if id oa-agent &>/dev/null; then
            mkdir -p /home/oa-agent/.claude
            cp ~/.claude/.credentials.json /home/oa-agent/.claude/.credentials.json
            chown oa-agent:oa-agent /home/oa-agent/.claude/.credentials.json
        fi' 2>/dev/null

    # Verify auth works
    local verify
    verify=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$host" \
        'echo ping | claude --print 2>&1 | head -5' 2>/dev/null)

    if echo "$verify" | grep -qi "pong\|ping"; then
        echo -e "${GREEN}OK${RESET}   $host — credentials synced and verified"
        return 0
    elif echo "$verify" | grep -qi "401\|authentication_error\|Failed to authenticate"; then
        echo -e "${RED}FAIL${RESET} $host — credentials synced but auth verification failed"
        return 1
    else
        echo -e "${YELLOW}WARN${RESET} $host — credentials synced, verification inconclusive: $(echo "$verify" | head -1)"
        return 0
    fi
}

# Determine target hosts
HOSTS=()
if [ $# -gt 0 ]; then
    HOSTS=("$@")
else
    while IFS= read -r h; do
        [ -n "$h" ] && HOSTS+=("$h")
    done < <(get_all_hosts)
fi

if [ ${#HOSTS[@]} -eq 0 ]; then
    echo "No hosts specified. Usage: $0 [host1] [host2] ..."
    echo "Or create ~/.oa/machines.json with host definitions."
    exit 1
fi

# Sync to each host
FAILED=0
for host in "${HOSTS[@]}"; do
    sync_host "$host" || FAILED=$((FAILED + 1))
done

if [ $FAILED -gt 0 ]; then
    echo -e "\n${RED}$FAILED host(s) failed${RESET}"
    exit 1
else
    echo -e "\n${GREEN}All hosts synced successfully${RESET}"
fi
