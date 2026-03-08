---
name: oa-state-workspace
description: "Explains oa agent workspace layout, --direct flag, and how agents write output. Use when understanding where agent files go or how to access agent output. Activates for: workspace, agent output, --direct, /tmp/oa-agent, result.md, project_root."
user-invocable: false
---

## Critical Rules

- ALWAYS use `--direct` in every `oa run` call — because without it, output is written to volatile `/tmp/oa-agent-<uuid>/` which is lost on reboot (L-010).
- NEVER reference agent output with relative paths — because workspace location depends on the `--direct` flag and relative paths break cross-agent references.

## Workspace Locations

| Mode | Workspace | Persistence |
|------|-----------|-------------|
| Without `--direct` | `/tmp/oa-agent-<uuid>/` | Volatile — lost on reboot |
| With `--direct` | Project root (cwd of orchestrator) | Persistent — in project |

## Workspace Structure

```
/tmp/oa-agent-<uuid>/          # default workspace (no --direct)
├── CLAUDE.md                  # auto-generated task instructions
└── output/
    └── result.md              # agent writes primary output here

# With --direct, workspace = project root:
/mnt/c/Users/Freek/Project/
├── CLAUDE.md                  # injected task instructions
└── output/
    └── result.md
```

## How Agents Write Output

1. Agent reads its task from the injected `CLAUDE.md` in the workspace root.
2. Agent writes primary output to `./output/result.md` (relative to its workspace).
3. Agent creates `.done` in the workspace root when fully complete.
4. Orchestrator collects output with `oa collect <agent-name>`.

## Patterns

### Pattern 1: Collect agent output
```bash
# Check completion
oa status

# Collect output (printed to stdout, saved to ~/.oa/collected/<name>.md)
oa collect worker-1
```

### Pattern 2: Pass output between agents using absolute paths
```bash
# researcher-a wrote to /mnt/c/Project/output/result.md
# Pass it to combiner via absolute path in the prompt:
oa run "Read /mnt/c/Project/output/result.md and summarize" --name combiner --model claude/sonnet --direct
```

### project_root inheritance

When `--direct` is used, the agent workspace root is the orchestrator project root. All agents with `--direct` share the same project root, enabling file sharing via absolute paths.

## Anti-Patterns

- Bad: Referencing `./output/result.md` from another agent — resolves differently per workspace
- Good: Use absolute path `/mnt/c/Project/output/worker-name/result.md`
- Bad: Omitting `--direct` — output lost after system reboot
- Good: Include `--direct` in every `oa run` call

## References

- Related: oa-orchestration-spawn, oa-orchestration-pipeline
