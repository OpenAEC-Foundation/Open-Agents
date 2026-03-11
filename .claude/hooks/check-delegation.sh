#!/bin/bash
# PreToolUse hook: suggests oa run delegation for implementation work
# Reads tool_input from stdin as JSON
# Never blocks — only warns

export PATH="$HOME/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

# Read JSON input from stdin
input=$(cat)

# Extract tool name from environment (Claude Code passes it as CLAUDE_TOOL_NAME)
tool_name="${CLAUDE_TOOL_NAME:-}"

# If tool is Bash and contains oa run, delegation is already happening — OK
if echo "$input" | grep -q '"command"'; then
    command=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)
    if echo "$command" | grep -q "oa run"; then
        exit 0
    fi
fi

# If tool is Edit or Write on implementation files, check if any agent is running
if echo "$input" | grep -qE '"path".*\.(py|ts|tsx)"'; then
    if ! oa status 2>/dev/null | grep -q " running "; then
        echo "💡 Implementatiewerk — overweeg oa run te gebruiken" >&2
    fi
fi

exit 0
