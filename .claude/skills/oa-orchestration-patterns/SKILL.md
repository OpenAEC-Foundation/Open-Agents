---
name: oa-orchestration-patterns
description: "4 reusable agent orchestration patterns: Research Swarm, Build Pipeline, Review Chain, Batch Processor. Use when choosing how to structure multi-agent work. Activates for: orchestration pattern, research swarm, build pipeline, review chain, batch processor."
user-invocable: false
---

## Critical Rules

- Keep batch sizes 3-5 agents — because larger batches saturate context and produce inconsistent quality.
- NEVER mix patterns in one workflow without explicit handoff points — because agents cannot coordinate across pattern boundaries without messaging.

## Decision Tree

```
What is the task shape?
├── Multiple independent information sources → Research Swarm
├── Sequential build with unknown steps → Build Pipeline (oa pipeline)
├── Output that needs QA validation → Review Chain
└── Same template on N inputs → Batch Processor
```

## Patterns

### Pattern 1: Research Swarm
3 parallel researchers + 1 combiner. Use for multi-topic investigation.

```bash
oa run "Research topic A: write findings to /tmp/proj/research-a.md" --name researcher-a --model claude/sonnet --direct
oa run "Research topic B: write findings to /tmp/proj/research-b.md" --name researcher-b --model claude/sonnet --direct
oa run "Research topic C: write findings to /tmp/proj/research-c.md" --name researcher-c --model claude/sonnet --direct
# After all done:
oa run "Read /tmp/proj/research-*.md and synthesize into /tmp/proj/final.md" --name combiner --model claude/sonnet --direct
```

Models: sonnet for researchers, sonnet for combiner.

### Pattern 2: Build Pipeline
Planner → N builders → validator. Use for feature implementation or doc generation.

```bash
oa pipeline "Implement feature X with tests and documentation"
# Or manually:
oa run "Plan the implementation: write plan.md with steps" --name planner --model claude/opus --direct
# After planner done, spawn builders per plan step
oa run "Implement step 1 per /tmp/proj/plan.md" --name builder-1 --model claude/sonnet --direct
oa run "Validate all outputs against spec" --name validator --model claude/sonnet --direct
```

Models: opus for planner, sonnet for builders, sonnet for validator.

### Pattern 3: Review Chain
1 writer → 1 reviewer → 1 fixer (if needed). Use for QA-critical output.

```bash
oa run "Write the API documentation to /tmp/proj/api-docs.md" --name writer --model claude/sonnet --direct
# After writer done:
oa run "Review /tmp/proj/api-docs.md against spec. Write issues to /tmp/proj/review.md" --name reviewer --model claude/sonnet --direct
# After reviewer done, conditionally:
oa run "Fix issues in /tmp/proj/api-docs.md listed in /tmp/proj/review.md" --name fixer --model claude/sonnet --direct
```

Models: sonnet throughout. Use opus for writer only when content is architecturally complex.

### Pattern 4: Batch Processor
N workers on the same template. Use for file migration, format conversion, bulk generation.

```bash
# For each file in batch (max 5 at a time):
oa run "Convert /tmp/proj/file1.md to JSON. Write to /tmp/proj/file1.json" --name converter-1 --model claude/haiku --direct
oa run "Convert /tmp/proj/file2.md to JSON. Write to /tmp/proj/file2.json" --name converter-2 --model claude/haiku --direct
oa run "Convert /tmp/proj/file3.md to JSON. Write to /tmp/proj/file3.json" --name converter-3 --model claude/haiku --direct
```

Models: haiku for repetitive/structured work. Batch size: 3-5 max.

## Quality Gate After Any Pattern

After every agent batch, verify before proceeding:
1. Count — expected N outputs? got N?
2. Content — complete, not truncated?
3. Format — matches reference structure?
4. Cross-reference — outputs consistent with each other?

## Anti-Patterns

- Bad: 10 parallel agents on the same task — overwhelms context, produces inconsistent quality
- Good: 3-5 parallel agents max, then a combiner
- Bad: Skipping the validator in a Build Pipeline — unvalidated output propagates errors
- Good: Always include a validator/reviewer as the final step

## References

- Related: oa-orchestration-spawn, oa-orchestration-pipeline, oa-orchestration-communication
