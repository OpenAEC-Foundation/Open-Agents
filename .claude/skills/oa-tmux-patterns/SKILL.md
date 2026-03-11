---
description: Reference guide for tmux patterns used in oa-cli. Auto-loads when debugging tmux issues, agent window management, or capture-pane operations.
user-invocable: false
---

# oa-cli Tmux Patterns Reference

## Session Structure

All agents run inside a single tmux session named **`oa`**.

| Window | Name | Purpose |
|--------|------|---------|
| 0 | `dashboard` | `watch -t -n3 oa status` (live status) |
| 1 | `oa-guardian` | Self-healing guardian loop |
| 2..N | `agent-{name}` | One window per running agent |

## Window Naming

Agent windows follow the convention: `agent-{name}`

- Example: `oa run --name my-agent` → window `agent-my-agent`
- The window name is stored in `AgentRecord.tmux_window`
- Window targeting uses the numeric index (from `new-window -P`) to avoid ambiguity when duplicate names exist

## Key Tmux Operations

All tmux calls go through `_tmux(args: str)` in `tmux.py`:
```python
def _tmux(args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["tmux"] + shlex.split(args), capture_output=True, text=True, check=check)
```

| Operation | Command Pattern |
|-----------|----------------|
| Check session exists | `has-session -t oa` (check=False) |
| Create session | `new-session -d -s oa -n dashboard` |
| Create agent window | `new-window -t oa: -n 'agent-{name}' -P -F '#{window_index}'` |
| Run command in window | `send-keys -t oa:{window_index} '/path/to/.oa-run.sh' Enter` |
| List windows | `list-windows -t oa -F '#{window_name}'` |
| Capture pane output | `capture-pane -t oa:'agent-{name}' -p -S -{lines}` |
| Kill window | `kill-window -t oa:'agent-{name}'` (check=False) |
| Select window | `select-window -t oa:'agent-{name}'` |
| Register hook | `set-hook -t oa client-detached 'run-shell "..."'` |

## Safety Patterns

1. **`shlex.split()` for argument safety**: All tmux commands use `shlex.split(args)` + list-based `subprocess.run()` — never `shell=True` with user data
2. **`shlex.quote()` for window names**: Window names from user input are always quoted: `shlex.quote(window_name)`
3. **`check=False` for probes**: Existence checks (`has-session`, `list-windows`, `capture-pane`) use `check=False` — returncode checked explicitly
4. **Index targeting over name targeting**: `new-window -P` returns the numeric index; subsequent `send-keys` targets that index to avoid window-name collision
5. **Script file instead of inline command**: The full agent command is written to `.oa-run.sh` in the workspace, then `send-keys` executes just the script path — avoids multi-line quoting issues

## Session Lifecycle

```
oa start → start_session() → new-session oa + dashboard + guardian windows
oa run   → spawn_agent()   → new-window agent-{name} → send-keys .oa-run.sh
oa stop  → session cleanup → kill-session oa
```

Guardian window runs: `while true; do python3 -m open_agents.session_guardian; sleep 5; done`

Hook registered on `client-detached` event → triggers `session_cleanup --mode detach`

## Debugging Tips

**Check if session is alive:**
```bash
tmux has-session -t oa
tmux list-windows -t oa
```

**Inspect agent window output:**
```bash
tmux capture-pane -t oa:agent-{name} -p -S -50
```

**Check if agent is still running (window exists):**
```bash
tmux list-windows -t oa -F '#{window_name}' | grep agent-{name}
```

**Attach to an agent window:**
```bash
tmux select-window -t oa:agent-{name}
# or via oa-cli:
oa attach {name}
```

**Check completion:**
```bash
ls /tmp/oa-agent-{name}/.done        # exists = done
cat /tmp/oa-agent-{name}/output/result.md
```

**View live agent output via `oa watch`:**
```bash
oa watch {name}   # uses capture-pane in a loop
```
