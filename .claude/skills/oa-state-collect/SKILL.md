---
name: oa-state-collect
user-invocable: false
description: "Deterministic reference for collecting agent output in Open-Agents. Use when Claude needs to retrieve completed agent results, understand output file locations, or choose between collect/watch/attach commands. Activates for: oa collect, output/result.md, agent output, oa watch, oa attach, read agent results."
---

# oa-state-collect

## Quick Reference

### Critical Rules

Use `oa collect <name>` only after the agent has finished because if status is still "running", collect exits with a warning and returns nothing.

Expect the primary output at `<workspace>/output/result.md` because that is where agents are instructed to write. Fallback: first `.md` file found in `<workspace>/output/` if result.md is absent.

Check oa status after collecting because an agent marked done may still be writing its final output — a brief delay is normal.

Avoid using `oa attach` to read output because attach switches tmux window focus for live interaction; it does not return output to the calling shell.

Avoid using the `output_file` field in AgentRecord for the output path because agents write to `output/result.md` relative to their workspace — use `<workspace>/output/result.md` directly.

## Commands

### `oa collect <name>` — Read completed agent output
```bash
oa collect my-agent
```
- Calls `check_agent(name)` to refresh status from .done file
- Exits with warning if status is still "running"
- Calls `read_output(rec.workspace)` from workspace.py
- Prints contents of `<workspace>/output/result.md` to stdout
- Falls back to first .md file in `<workspace>/output/` if result.md missing
- Prints warning if output directory has no .md files at all

### `oa watch <name>` — Stream live tmux pane output
```bash
oa watch my-agent
```
- Streams last 40 lines of the agent tmux pane every second
- Clears screen and redraws (like watch -n1)
- Exits automatically when agent status changes from "running"
- Press Ctrl-C to stop watching early
- Use this to monitor progress of a running agent

### `oa attach <name>` — Switch to agent tmux window
```bash
oa attach my-agent
```
- Switches terminal focus to the agent tmux window (tmux select-window)
- Only works for status="running" agents
- Returns control to caller when user navigates away (Ctrl-b n/p)
- Use for interactive inspection, NOT for capturing output

## Essential Patterns

### Pattern 1: Collect output after agent completes
```bash
oa status                    # check status column
oa collect my-agent          # read output/result.md

# Read workspace path and file directly if oa collect fails
cat ~/.oa/agents.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
ws = d['my-agent']['workspace']
print(ws)
" | xargs -I{} cat {}/output/result.md
```

### Pattern 2: Poll until done, then collect
```bash
while true; do
    STATUS=$(python3 -c "import json; d=json.load(open('$HOME/.oa/agents.json')); print(d.get('my-agent',{}).get('status','unknown'))")
    echo "Status: $STATUS"
    [ "$STATUS" != "running" ] && break
    sleep 5
done
oa collect my-agent
```

### Pattern 3: Output file locations
```
<workspace>/output/result.md   <- PRIMARY (agents should always write here)
<workspace>/output/error.md    <- written if agent gets stuck (constraint in CLAUDE.md)
<workspace>/output/*.md        <- fallback: any .md file (read_output picks first sorted)
<workspace>/.done              <- completion signal (presence = done, content = irrelevant)
```

### Pattern 4: Distinguish collect vs watch vs attach
| Command | When | Output | Blocking |
|---------|------|--------|---------|
| `oa collect <name>` | After completion | Prints result.md | No |
| `oa watch <name>` | While running | Streams pane live | Yes (Ctrl-C) |
| `oa attach <name>` | While running | Switches tmux window | Yes (manual) |

### Pattern 5: Read output programmatically (Python)
```python
from open_agents.workspace import read_output
from open_agents.state import get_agent

rec = get_agent("my-agent")
output = read_output(rec.workspace)  # returns str or None
if output:
    print(output)
```

### Pattern 6: Check if workspace is done (before collecting)
```bash
ls /tmp/oa-agent-<uuid>/.done
```
Python equivalent:
```python
from open_agents.workspace import workspace_is_done
workspace_is_done("/tmp/oa-agent-<uuid>")  # -> True/False
```

## Reference
- `oa-state-workspace` — workspace layout, output/ directory structure
- `oa-state-agents-json` — AgentRecord fields including workspace path
