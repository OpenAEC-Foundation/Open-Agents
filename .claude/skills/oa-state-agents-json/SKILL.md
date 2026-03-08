---
name: oa-state-agents-json
user-invocable: false
description: "Deterministic reference for the Open-Agents state file (agents.json). Use when Claude needs to inspect agent state, read AgentRecord fields, understand status values, or trace state transitions. Activates for: agents.json, agent state, status running/done/failed, AgentRecord fields, ~/.oa/, state file."
---

# oa-state-agents-json

## Quick Reference

### Critical Rules

Find agents.json at `~/.oa/agents.json` (OA_DIR = Path.home() / ".oa", STATE_FILE = OA_DIR / "agents.json") because the path is hardcoded in state.py and never changes.

Use file locking when reading/writing agents.json because the state module uses `fcntl.LOCK_SH` (read) and atomic write via tempfile + rename (write) — direct text editor edits while agents are running will corrupt state.

Check all 6 status values (not just 3) because valid statuses are: `running`, `done`, `failed`, `killed`, `timeout`, `error`.

Use `created_at` (not `started_at`) for the spawn timestamp because the actual field name is `created_at` (float, Unix timestamp) — `started_at` does not exist.

## AgentRecord Schema (state.py)

All fields in the AgentRecord dataclass:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | str | required | Unique agent name (slug) |
| `task` | str | required | Full task description |
| `workspace` | str | required | Absolute path to workspace dir |
| `tmux_window` | str | required | Tmux window name (agent-<name>) |
| `model` | str | "claude" | Model: claude / claude/sonnet / claude/opus / claude/haiku / ollama/<model> |
| `status` | str | "running" | Current status (see below) |
| `pid` | int or None | None | Process ID (rarely set) |
| `created_at` | float | time.time() | Unix timestamp when spawned |
| `finished_at` | float or None | None | Unix timestamp when completed |
| `output_file` | str or None | None | Path to output file (rarely used) |
| `parent` | str or None | None | Parent agent name (None = root) |
| `depth` | int | 0 | Hierarchy depth (0 = root) |
| `lineage` | list | [] | Ancestor names oldest-first |
| `task_hash` | str | "" | SHA256[:16] of normalized task |
| `max_children` | int | 10 | Max direct children this agent may spawn |
| `shared_results_dir` | str or None | None | Shared output aggregation path |
| `last_activity` | float | 0.0 | Timestamp of last activity |
| `auto_cleanup_minutes` | int | 20 | Inactivity timeout before cleanup |
| `project_root` | str or None | None | Project root path (--direct mode only) |

## Status Values

```
running   -- agent is executing in tmux window
done      -- agent completed successfully
failed    -- agent process failed
killed    -- agent was killed via oa kill
timeout   -- agent exceeded timeout
error     -- agent encountered an error
```

## Essential Patterns

### Pattern 1: Read agents.json manually
```bash
cat ~/.oa/agents.json | python3 -m json.tool
```

### Pattern 2: Filter by status
```bash
python3 -c "
import json
agents = json.load(open('$HOME/.oa/agents.json'))
for name, a in agents.items():
    if a['status'] == 'running':
        print(name, a['workspace'])
"
```

### Pattern 3: Check specific agent
```bash
oa status

# Or read JSON directly
python3 -c "
import json
agents = json.load(open('$HOME/.oa/agents.json'))
a = agents.get('my-agent')
print(a['status'], a['workspace'], a['model'])
"
```

### Pattern 4: Status transition flow
```
spawn_agent() called
    --> status = "running", created_at = now
    --> added to agents.json

Agent finishes
    --> check_agent() polls .done file
    --> status updated to "done" (or "failed"/"timeout"/"error")
    --> finished_at = now

oa kill <name>
    --> status = "killed"
    --> tmux window closed
```

### Pattern 5: Hierarchy fields
```
root agent:    depth=0, lineage=[], parent=None
child agent:   depth=1, lineage=["root-name"], parent="root-name"
grandchild:    depth=2, lineage=["root-name","child-name"], parent="child-name"
```

validate_spawn() checks before any child is created:
- depth <= max_depth (default 5, absolute max 10)
- count_children(parent) < parent.max_children (default 10)
- child task_hash not present in any ancestor

## Reference
- `oa-state-workspace` — workspace layout and CLAUDE.md structure
- `oa-state-collect` — reading agent output after completion
