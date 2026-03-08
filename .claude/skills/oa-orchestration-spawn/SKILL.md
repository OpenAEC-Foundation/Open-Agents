---
name: oa-orchestration-spawn
description: "Exact CLI reference for spawning oa agents. Use when: spawning an agent via oa run, configuring agent flags, selecting --model, using --direct, managing agent names. Activates for: oa run, spawn agent, start agent, agent flags, --direct, --model."
allowed-tools: Bash(oa *)
user-invocable: false
---

## Live system state
!`oa status 2>/dev/null | head -15`

# oa-orchestration-spawn

## Quick Reference

### Critical Rules

Include `--direct` in every `oa run` call — without it, agent output goes to volatile `/tmp/oa-agent-*/` and is lost on reboot (Issue #10).

Include `--model` with an explicit model name — never rely on the default `claude` value because the default may change across oa-cli versions; specify `claude/sonnet`, `claude/opus`, or `claude/haiku`.

Do not spawn agents from inside another agent — nested agents ignore `oa run` and use Claude Code's built-in Agent tool instead, making them invisible to `oa status` (Issue #9/#11).

Include the 5-element prompt structure in every agent prompt — unstructured prompts produce inconsistent output because agents have no other source of constraints (Issue #12).

### Decision Tree
```
Task needs execution?
├── Single isolated task → oa run (direct spawn)
├── Complex multi-step task → oa pipeline
└── Hierarchical decomposition → oa delegate
```

## Essential Patterns

### Pattern 1: Minimal spawn
```bash
oa run "task description" --name worker-1 --model claude/sonnet --direct
```

### Pattern 2: Full flag reference
```bash
oa run "task"
  --name worker-name       # agent name (auto-generated if omitted)
  --model claude/sonnet    # REQUIRED: claude/sonnet | claude/opus | claude/haiku | ollama/<model>
  --direct                 # REQUIRED: write to project dir instead of /tmp
  --parent orchestrator    # optional: parent agent name for hierarchy tracking
  --template template-id   # optional: load systemPrompt from agents/library/<id>.json
  --context-skills skill   # optional: inject skill context blocks (comma-separated IDs)
  --guardians              # optional: trigger batch_complete guardians after spawn
```

### Pattern 3: Named parallel workers
```bash
oa run "Research topic A" --name researcher-a --model claude/sonnet --direct
oa run "Research topic B" --name researcher-b --model claude/sonnet --direct
oa run "Research topic C" --name researcher-c --model claude/sonnet --direct
```

### Pattern 4: 5-element prompt structure (required for every agent)
Every oa run prompt MUST contain all 5 elements:

```
You are a [ROLE].

## Input
Read: /absolute/path/to/input.md

## Output
Write to: /absolute/path/to/output.md

## Scope
- Bullet point 1
- Bullet point 2

## Format
Follow structure of: /absolute/path/to/reference.md

## Rules
- English
- Max 400 lines
- ALWAYS/NEVER language, never "you might consider"
- [Domain-specific quality rules]
```

## Agent State Reference

### Status values (from AgentRecord.status)
| Status | Meaning |
|--------|---------|
| `running` | Agent is active in tmux window |
| `done` | Completed successfully |
| `failed` | Exited with error |
| `killed` | Stopped via `oa kill` |
| `timeout` | Exceeded inactivity limit |
| `error` | State error |

### Workspace locations
- **Without --direct**: `/tmp/oa-agent-<id>/` — volatile, lost on reboot
- **With --direct**: Agent writes to current working directory (project root)

### State file
All agent records: `~/.oa/agents.json`

## Model Tiering
| Task Type | Model |
|-----------|-------|
| Scanning, listing, formatting | `claude/haiku` |
| Writing, coding, implementation | `claude/sonnet` |
| Architecture, deep reasoning | `claude/opus` |
| QA, validation, review | `claude/sonnet` |

## Session Prerequisites
```bash
oa start    # must be running before oa run
oa status   # verify session and check running agents
```

## Reference
- Related: oa-orchestration-pipeline, oa-orchestration-communication, oa-orchestration-patterns
