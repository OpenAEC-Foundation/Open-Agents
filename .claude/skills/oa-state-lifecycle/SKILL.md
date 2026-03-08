---
name: oa-state-lifecycle
description: "CLI reference for managing running agents: stopping, cleaning, attaching, watching, listing. Use when checking agent state, stopping agents, or cleaning workspaces. Activates for: oa kill, oa clean, oa attach, oa watch, oa status, agent lifecycle."
user-invocable: false
allowed-tools: Bash(oa *)
---

## Critical Rules

- NEVER use `oa kill` on an agent that is still producing output — check `oa status` first to confirm the agent is stuck or unwanted before killing (data loss risk).
- ALWAYS use `oa clean` only after verifying finished agents via `oa status` — clean removes workspaces of all finished agents simultaneously.

## Decision Tree

```
What do you need?
├── See all agents + statuses         → oa status
├── Stop a specific running agent     → oa kill <name>
├── Remove finished agent workspaces  → oa clean
├── Watch a running agent live        → oa watch <name>
└── Jump into agent tmux window       → oa attach <name>
```

## Commands Reference

| Command | What it does | When to use |
|---------|-------------|-------------|
| `oa status` | Show all agents with status, model, workspace | Before any lifecycle action |
| `oa kill <name>` | Stop agent + close tmux window | Agent is stuck, wrong task, or unwanted |
| `oa clean` | Remove workspaces of all finished agents | After batch completes, disk cleanup |
| `oa watch <name>` | Stream agent output in real-time (Ctrl-C to stop) | Monitor progress without attaching |
| `oa attach <name>` | Attach to agent's tmux pane directly | Interactive inspection of running agent |
| `oa collect <name>` | Show output.md from completed agent | After agent finishes |

## Patterns

### Pattern 1: Check and stop
```bash
oa status                  # see what is running
oa kill stuck-agent        # stop a specific agent
```

### Pattern 2: Batch cleanup after completion
```bash
oa status                  # confirm all agents are done
oa clean                   # remove all finished workspaces
```

### Pattern 3: Monitor live progress
```bash
oa watch researcher-a      # stream output, Ctrl-C to stop
```

### Pattern 4: Interactive inspection
```bash
oa attach researcher-a     # attach tmux; Ctrl-b n/p to navigate windows
```

## Status Values

| Status | Meaning | Next action |
|--------|---------|-------------|
| `running` | Active in tmux window | watch, attach, or wait |
| `done` | Completed successfully | collect, then clean |
| `failed` | Exited with error | collect to inspect output |
| `killed` | Stopped via `oa kill` | clean when ready |
| `timeout` | Exceeded inactivity limit | collect to inspect |

## Anti-Patterns

- Bad: `oa attach <name>` on a non-running agent — attach fails; use `oa collect` for finished agents.
- Bad: Running `oa clean` before collecting output — workspaces deleted before you read results; collect first.
- Bad: Using `oa watch` as a replacement for `oa collect` — watch shows live tmux pane, not the structured output.md.

## References

- State file: `~/.oa/agents.json`
- Related: oa-orchestration-spawn, oa-state-checkpoint
