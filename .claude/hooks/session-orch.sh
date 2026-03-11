#!/bin/bash
# PreToolUse hook: checks if session-orch agent is active
# Called on Edit and Write tools
# Never blocks — only warns

export PATH="$HOME/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

if oa status 2>/dev/null | grep "session-orch" | grep -q " running "; then
    exit 0
else
    echo "⚠️  Geen session-orch actief. Start met: oa session-start" >&2
    exit 0
fi
