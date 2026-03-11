---
description: Reference guide for oa-cli internal architecture. Auto-loads when working on oa-cli code, agent spawning, or CLI infrastructure.
user-invocable: false
---

# oa-cli Architecture Reference

## Module Map

`/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/`

| Module | Purpose |
|--------|---------|
| `spawner.py` | Agent spawning: builds runtime commands, creates tmux windows, registers state |
| `tmux.py` | Low-level tmux wrappers: session create/check, window ops, `_tmux()` helper |
| `state.py` | Agent state persistence: CRUD on `~/.oa/agents.json`, `AgentRecord` dataclass |
| `workspace.py` | Workspace builder: `tempfile` dir + `CLAUDE.md` generator per agent |
| `lifecycle.py` | Status polling, kill, cleanup, capture-pane, timeout enforcement |
| `monitor.py` | Periodic status refresh loop (called by dashboard) |
| `session.py` | Session lock acquisition and cleanup |
| `guardian.py` | Self-healing watchdog that keeps the guardian tmux window alive |
| `messaging.py` | Inter-agent inbox/send/broadcast via mailbox files |
| `pipeline.py` | `oa pipeline`: planner → workers → combiner orchestration |

## Data Flow: `oa run` → Agent Running

1. **`spawn_agent()`** in `spawner.py` called
2. `validate_spawn()` — depth, max_children, task-hash dedup checks
3. `create_workspace(name, task, ...)` in `workspace.py` — creates `/tmp/oa-agent-<name>/` with `CLAUDE.md`, `output/`, `.claude/settings.json`, Agent-tool block hook
4. `_tmux("new-window ...")` — creates window `agent-{name}` in the `oa` session
5. Command written to `.oa-run.sh` script in workspace (avoids tmux send-keys quoting issues)
6. `_tmux("send-keys ... Enter")` — executes the script
7. `AgentRecord` created and persisted to `~/.oa/agents.json`
8. **Completion**: agent writes `output/result.md` and `touch .done`
9. `check_agent()` polls `.done` existence → updates status to `done`

## State Model

`AgentRecord` (dataclass in `state.py`):

| Field | Type | Notes |
|-------|------|-------|
| `name` | str | Unique, `[a-z0-9-]`, max 62 chars |
| `task` | str | Full task description |
| `workspace` | str | `/tmp/oa-agent-<name>` |
| `tmux_window` | str | `agent-{name}` |
| `model` | str | `claude`, `claude/sonnet`, `ollama/<model>` |
| `status` | str | `running → done / error / killed / timeout` |
| `parent` | Optional[str] | Parent agent name |
| `depth` | int | 0=root, 1=direct child, max=MAX_DEPTH (default 5) |
| `lineage` | list[str] | Ancestor chain (oldest first) |
| `shared_results_dir` | Optional[str] | Aggregation dir for batch agents |
| `project_root` | Optional[str] | Set in `--direct` mode |

**State file**: `~/.oa/agents.json` (read with shared lock, written atomically via tmp+rename)

## Key Design Decisions

- **subprocess not libtmux**: uses `subprocess.run(["tmux"] + shlex.split(args))` for safety and no extra dependency
- **Polling not inotify**: `check_agent()` polls `.done` file existence — simple, cross-platform, no race
- **Sync not async**: all operations synchronous; guardian runs in separate tmux window
- **Script file not send-keys quoting**: command written to `.oa-run.sh` to avoid shell quoting hell
- **Atomic state writes**: tmp file + `Path.replace()` to prevent JSON corruption on concurrent writes
- **In-memory cache**: `state.py` caches agents dict keyed by file mtime to avoid repeated JSON parses

## File Paths

| Path | Purpose |
|------|---------|
| `~/.oa/agents.json` | Agent state registry |
| `~/.oa/config.json` | Config (timeout_minutes, default_model, max_depth) |
| `/tmp/oa-agent-<name>/` | Agent workspace |
| `/tmp/oa-agent-<name>/.done` | Completion signal |
| `/tmp/oa-agent-<name>/output/result.md` | Agent output |
| `/tmp/oa-agent-<name>/CLAUDE.md` | Agent instructions |
| `/tmp/oa-agent-<name>/.oa-run.sh` | Runtime script executed in tmux |
