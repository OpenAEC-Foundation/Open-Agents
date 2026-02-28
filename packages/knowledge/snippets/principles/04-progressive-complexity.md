---
id: progressive-complexity
name: Progressive Complexity
type: principle
tags: [design, iteration]
---

# Progressive Complexity

## Description
Start simple, add complexity only when justified. Begin every workflow design with the simplest pattern that could work (usually single-shot). Only introduce multi-agent orchestration, parallel execution, iteration loops, or validation layers when you have evidence that the simpler approach is insufficient. Each added node increases cost, latency, failure surface, and debugging difficulty. Complexity should be earned, not assumed.

## Rationale
Complex multi-agent workflows are seductive — they look impressive on a canvas. But every additional agent introduces: (1) latency from an extra round trip, (2) cost from additional token usage, (3) a potential failure point, (4) a debugging challenge when things go wrong, (5) a maintenance burden as the system evolves. The single-shot pattern handles the majority of real-world tasks. The two-agent chain (do + review) handles most of the rest. Reserve complex orchestration patterns (pyramids, loops, consensus) for the minority of tasks that genuinely require them. This is the YAGNI principle applied to agent design.

## Examples
- Good: Starting with a single agent for code generation. When review feedback shows quality issues, adding a reviewer agent (simple loop). When certain types of reviews require domain expertise, adding specialist reviewers (router). Each addition is justified by a real problem.
- Good: Running a single-agent prototype first, measuring its performance, then adding complexity only where it falls short.
- Bad: Designing a 12-agent pipeline with consensus voting, recursive decomposition, and three quality gates for a task that a single agent handles correctly 95% of the time.
