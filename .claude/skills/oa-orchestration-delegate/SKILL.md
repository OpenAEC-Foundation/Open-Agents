---
name: oa-orchestration-delegate
description: "CLI reference for oa delegate — automatic orchestrator+workers spawning. Use when a task needs hierarchical decomposition with an orchestrator managing parallel workers. Activates for: oa delegate, delegate task, orchestrator, max-workers, --orchestrator-model."
user-invocable: false
disable-model-invocation: true
allowed-tools: Bash(oa *)
---

## Critical Rules

- ALWAYS use `oa delegate` instead of `oa run` when the task needs autonomous decomposition — the orchestrator handles subtask breakdown so you don't have to (D-051).
- NEVER skip `--model` for workers — without it the default may change between oa-cli versions; always specify `claude/sonnet`, `claude/opus`, or `claude/haiku`.
- NEVER use `oa delegate` from inside another agent — nested spawning creates invisible agents outside `oa status` (L-009).

## Decision Tree

```
Task needs execution?
├── Single isolated task, you define the scope → oa run
├── Multi-step pipeline, you define the steps  → oa pipeline
└── Complex task, let AI decompose it          → oa delegate
```

Use `oa delegate` when the decomposition itself is non-trivial and you want an orchestrator agent to analyze, break down, and coordinate workers automatically.

## Instructions

1. Run `oa start` and verify session with `oa status` before delegating.
2. Choose worker model (`--model`) and orchestrator model (`--orchestrator-model`).
3. Set `--max-workers` to control concurrency (default: 5).
4. Run `oa delegate "<task>"` — the orchestrator spawns and manages workers.
5. Monitor with `oa status` and collect results via `oa collect <name>`.

## Patterns

### Pattern 1: Minimal delegate
```bash
oa delegate "Analyze all Python files in /project and write a report" \
  --name analysis-orchestrator \
  --model claude/sonnet \
  --orchestrator-model claude/opus
```

### Pattern 2: Full flag reference
```bash
oa delegate "task description"
  --name base-name              # base name for the orchestrator agent
  --model claude/sonnet         # REQUIRED: model for worker agents
  --orchestrator-model claude/opus  # orchestrator model (default: claude/opus)
  --max-workers 5               # max concurrent workers per batch (default: 5)
```

### Pattern 3: Controlled batch size
```bash
oa delegate "Process 20 documents in /data/" \
  --name doc-processor \
  --model claude/haiku \
  --orchestrator-model claude/sonnet \
  --max-workers 3
```

## Anti-Patterns

- Bad: `oa delegate "small single-step task"` — orchestrator overhead not justified for simple work; use `oa run` instead.
- Bad: `oa delegate "task" --model claude` — bare model name may change; always specify `claude/sonnet`, `claude/haiku`, or `claude/opus`.
- Bad: Calling `oa delegate` inside an agent prompt — spawns invisible nested agents; delegate only from the orchestrator session.

## References

- Related: oa-orchestration-spawn, oa-orchestration-pipeline, oa-state-lifecycle
