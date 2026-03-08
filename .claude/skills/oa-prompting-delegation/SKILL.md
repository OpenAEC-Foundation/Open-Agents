---
name: oa-prompting-delegation
description: "Decide when and how to delegate tasks to oa agents. Use when evaluating task scope, choosing between inline work and agent spawning, or structuring a delegation plan. Activates for: delegate, spawn, auto-delegate, parallel agents, oa pipeline, delegation plan."
user-invocable: false
---

## Critical Rules

- ALWAYS spawn agents flat from the orchestrator session — because nested agents (agent spawning agent) are invisible to `oa status` (Issue #9/#11).
- NEVER delegate tasks that require live MCP access — because oa agents do not have MCP tool access; only the orchestrator session does.

## Decision Tree

```
Task scope?
├── Single file, < 30 min → do it inline (no agent needed)
├── Touches > 3 files → parallel agents, one per file scope
├── Needs 2+ data sources → research swarm (3× researcher + 1 combiner)
├── N identical operations → N parallel workers on same template
├── 3+ sequential steps with clear handoffs → oa pipeline
├── Large/unclear scope → formulate delegation plan first
└── Output needs QA → spawn reviewer after writer completes
```

## Auto-Delegation Triggers

| Trigger | Pattern | Agent Structure |
|---------|---------|----------------|
| Multi-file changes (> 3 files) | Parallel writers | One agent per file scope |
| Multi-source research | Research swarm | 3× researcher (sonnet) + 1 combiner |
| Batch operations | Same template, N inputs | N parallel workers (haiku or sonnet) |
| Complex workflow (3+ steps) | Pipeline | `oa pipeline "<task>"` |
| Large scope | Delegation plan | Planner (opus) → builders (sonnet) → validator |
| Review needed | Review chain | Writer → reviewer → fixer (if needed) |

## Instructions

1. Evaluate the task against the auto-delegation triggers above.

2. If delegating, formulate a delegation plan before spawning:
   - Name each agent and its exact scope
   - Define input/output file paths
   - Identify dependencies between agents
   - Choose model tier per agent (haiku/sonnet/opus)

3. Spawn all independent agents in parallel (one `oa run` per agent):
   ```bash
   oa run "Research topic A, write to /tmp/results/a.md" --name researcher-a --model claude/sonnet --direct
   oa run "Research topic B, write to /tmp/results/b.md" --name researcher-b --model claude/sonnet --direct
   ```

4. For sequential pipelines with 3+ steps, use `oa pipeline`:
   ```bash
   oa pipeline "Analyze codebase, write tests, then validate coverage"
   ```

5. After all agents complete, run quality gates before proceeding:
   - Count: expected N outputs? Got N?
   - Content: complete, not truncated?
   - Format: matches reference structure?

## Patterns

### Pattern 1: Parallel research swarm
```bash
oa run "Research Claude API pricing, write summary to /tmp/research/pricing.md" \
  --name researcher-pricing --model claude/sonnet --direct
oa run "Research Claude API rate limits, write summary to /tmp/research/limits.md" \
  --name researcher-limits --model claude/sonnet --direct
oa run "Combine /tmp/research/*.md into /tmp/research/final.md" \
  --name combiner --model claude/sonnet --direct
```

### Pattern 2: Batch file processor
```bash
# Run same template on N files
for f in src/components/*.tsx; do
  oa run "Add TypeScript strict types to $f, write back to same path" \
    --name "typer-$(basename $f .tsx)" --model claude/haiku --direct
done
```

### Pattern 3: Delegation plan format
```
Delegation plan:
- Agent researcher-a (sonnet): Read /docs/spec.md → write /tmp/research/spec-summary.md
- Agent researcher-b (sonnet): Read /docs/api.md → write /tmp/research/api-summary.md
- Agent combiner (sonnet): Read /tmp/research/*.md → write /tmp/final-report.md
Dependencies: combiner waits for researcher-a and researcher-b
```

## Anti-Patterns

- Bad: Spawning agents from inside an agent prompt — nested agents are invisible to `oa status`.
- Good: Always spawn from the main orchestrator session.
- Bad: Using oa pipeline for 2-step tasks — inline is faster and simpler.
- Good: Use `oa pipeline` only for 3+ sequential steps with unclear intermediate structure.
- Bad: No delegation plan for 5+ agent spawns — leads to conflicting output files.
- Good: Formulate plan with named agents, paths, and dependencies before spawning.

## References

- Related: oa-orchestration-spawn, oa-teams-coordination, oa-library-discovery
