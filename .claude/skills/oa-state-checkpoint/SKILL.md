---
name: oa-state-checkpoint
description: "CLI reference for checkpoint and resume — crash recovery for long-running agents. Use when an agent crashes mid-task or you need to save progress for later resumption. Activates for: oa checkpoint, oa resume, crash recovery, checkpoint agent."
user-invocable: false
allowed-tools: Bash(oa *)
---

## Critical Rules

- NEVER resume a checkpoint with status `completed` — `oa resume` rejects completed checkpoints; use `oa collect` instead to retrieve output.
- ALWAYS verify the checkpoint exists with `oa checkpoint show <name>` before running `oa resume <name>` — resuming a non-existent checkpoint fails silently.

## Decision Tree

```
Agent crashed or stalled?
├── Check if checkpoint exists    → oa checkpoint show <name>
├── List all incomplete           → oa checkpoint list
├── Agent has checkpoint          → oa resume <name>
└── No checkpoint available       → oa run with the original task
```

## How Checkpoints Work

Checkpoints are saved by the agent itself during execution using the checkpoint module. The orchestrator session uses `oa checkpoint` and `oa resume` to inspect and restart from saved state.

- **Checkpoint file**: `~/.oa/checkpoints/<agent-name>.json`
- **Resume creates**: a new agent named `<name>-resume` with the checkpoint context injected
- **Model preserved**: resume uses the same model as the original agent

## Commands Reference

| Command | What it does |
|---------|-------------|
| `oa checkpoint list` | List all incomplete (non-completed) checkpoints |
| `oa checkpoint show <name>` | Show full checkpoint details for an agent |
| `oa resume <name>` | Spawn a resume agent from the agent's last checkpoint |

## Patterns

### Pattern 1: Inspect and resume after crash
```bash
oa checkpoint list              # see all incomplete checkpoints
oa checkpoint show researcher-a # inspect progress notes and output snapshot
oa resume researcher-a          # spawn researcher-a-resume with checkpoint context
oa status                       # verify resume agent is running
```

### Pattern 2: Monitor resume agent
```bash
oa resume researcher-a          # spawns researcher-a-resume
oa watch researcher-a-resume    # monitor progress
oa collect researcher-a-resume  # retrieve output when done
```

### Pattern 3: Checkpoint data an agent writes
Agents save checkpoints by including instructions in their prompt:
```
## Checkpoint Instructions
Save progress to ~/.oa/checkpoints/<your-name>.json after each major step.
Include: status, progress_notes, output_snapshot.
```

## Crash Recovery Pattern

```
1. oa status                      → confirm agent is failed/not running
2. oa checkpoint show <name>      → read progress_notes to understand what completed
3. oa resume <name>               → spawn resume agent (named <name>-resume)
4. oa watch <name>-resume         → monitor recovery
5. oa collect <name>-resume       → retrieve final output
6. oa clean                       → clean both original and resume workspaces
```

## Anti-Patterns

- Bad: `oa resume <name>` without checking checkpoint status — may resume a completed task unnecessarily.
- Bad: Using `oa resume` as a shortcut for re-running any failed agent — it only works if the agent saved a checkpoint; otherwise use `oa run` with the original task.

## References

- Checkpoint files: `~/.oa/checkpoints/`
- State file: `~/.oa/agents.json`
- Related: oa-state-lifecycle, oa-orchestration-spawn
