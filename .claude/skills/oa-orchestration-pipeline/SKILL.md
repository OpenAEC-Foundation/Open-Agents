---
name: oa-orchestration-pipeline
description: "Automated planner→workers→combiner pipeline for complex multi-step tasks. Use when a task requires planning then parallel execution then synthesis. Activates for: oa pipeline, pipeline, planner, combiner, multi-step task."
user-invocable: false
allowed-tools: Bash(oa *)
---

## Critical Rules

- Use oa pipeline instead of manual oa run chaining when a task has 3+ sequential steps — because pipeline auto-generates plan.json and spawns workers with correct dependencies.
- NEVER use oa pipeline for simple single-step tasks — because the planner overhead adds latency without benefit; use oa run instead.
- ALWAYS verify the pipeline completes with oa status before collecting results — because workers may still be running when the planner finishes.

## Decision Tree

```
Task complexity?
├── 1-2 steps, clear scope → oa run (direct spawn)
├── 3+ sequential steps, unclear decomposition → oa pipeline
└── Known steps, parallel execution → oa run × N workers manually
```

## Instructions

1. Run oa start if session is not active.
2. Invoke pipeline with a high-level task description.
3. Pipeline spawns a planner agent that writes plan.json.
4. Workers are spawned per plan.json step, in dependency order.
5. Combiner agent synthesizes worker outputs into final result.
6. Collect final output with oa collect.

## Patterns

### Pattern 1: Basic pipeline invocation
```bash
oa pipeline "Research competitor pricing and write a comparison report"
```

### Pattern 2: Pipeline with model override
```bash
oa pipeline "Refactor the auth module across 5 files" --model claude/opus
```

### Pattern 3: Monitor pipeline progress
```bash
oa status            # see planner + workers + combiner
oa collect combiner  # get final output when done
```

## How plan.json Works

The planner agent writes a plan.json to the workspace:
```json
{
  "steps": [
    {"id": "step-1", "task": "Research X", "model": "claude/sonnet"},
    {"id": "step-2", "task": "Write Y", "depends_on": ["step-1"], "model": "claude/sonnet"},
    {"id": "combine", "task": "Synthesize results", "depends_on": ["step-2"]}
  ]
}
```

Workers read this plan and execute steps in order. Dependent steps wait for their prerequisites.

## Timeout Behavior

- Default inactivity timeout: 5 minutes per agent
- Pipeline timeout: sum of all step timeouts
- If a worker times out, the pipeline halts; remaining workers are killed
- Check oa status for timeout status; re-run failed steps manually with oa run

## Anti-Patterns

- Bad: `oa pipeline "Fix typo in README"` — single-step task; use oa run
- Good: `oa run "Fix typo in README" --name fixer --model claude/haiku --direct`
- Bad: Collecting output before pipeline completes — combiner not yet finished
- Good: Poll oa status until combiner shows status: done, then oa collect

## References

- Related: oa-orchestration-spawn, oa-orchestration-patterns, oa-orchestration-communication
