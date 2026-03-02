---
id: diamond
name: Diamond
type: pattern
category: pyramid
tags: [fork-join, parallel, aggregation, balanced]
minNodes: 4
maxNodes: 4
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 2000
  costMultiplier: 2.5
---

# Diamond

## Description
The classic fork-join pattern shaped like a diamond. One starter agent analyzes the task and splits it into two independent subtasks. Two parallel worker agents process their respective subtasks simultaneously. One aggregator agent combines the results into a unified output. The diamond ensures that independent work streams run in parallel for speed, while the aggregator maintains coherence in the final result. The starter is responsible for creating a clean split with no overlap or dependencies between the two work streams.

## Diagram
```
                [Agent A: Starter]
                   /          \
                  v            v
     [Agent B: Worker 1]  [Agent C: Worker 2]
                  \            /
                   v          v
              [Agent D: Aggregator]
```

## When to Use
- The task naturally splits into two independent concerns (e.g., frontend + backend, analysis + implementation)
- Parallel execution would meaningfully reduce total time
- The two work streams produce outputs that can be cleanly merged
- You want to apply different specializations to different aspects of the same task
- The task has a natural "divide and conquer" structure

## Anti-Patterns
- Do not use when the two subtasks have dependencies on each other
- Avoid when the split is artificial and forces redundant context loading
- Not suitable when the aggregation is trivially simple (just concatenation) — a chain may be simpler
- Do not use when one subtask is dramatically larger than the other (creates idle time)

## Node Templates

### Agent A: Starter
- **Role**: Analyzes the incoming task, identifies two independent work streams, and produces clear specifications for each. Ensures the split is clean: no overlapping scope, no unresolved dependencies between the streams. Passes different specs to each worker.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Glob, Grep]
- **Prompt Template**: You are a task decomposition specialist. Analyze the incoming task and split it into exactly two independent work streams. For each stream, produce: (1) a clear scope description, (2) specific inputs and context needed, (3) expected output format. Ensure the two streams have NO dependencies on each other — they must be executable in parallel. If the task cannot be cleanly split, say so and recommend a different pattern.

### Agent B: Worker 1
- **Role**: Executes the first work stream as specified by the starter. Works independently without knowledge of Worker 2's task. Produces a complete result for its assigned scope.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are a focused execution agent. You will receive a specific work stream specification. Complete it thoroughly within the defined scope. Do not attempt work outside your assigned scope. Produce complete, well-structured output that can be integrated with another work stream by a downstream agent.

### Agent C: Worker 2
- **Role**: Executes the second work stream as specified by the starter. Works independently without knowledge of Worker 1's task. Produces a complete result for its assigned scope.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are a focused execution agent. You will receive a specific work stream specification. Complete it thoroughly within the defined scope. Do not attempt work outside your assigned scope. Produce complete, well-structured output that can be integrated with another work stream by a downstream agent.

### Agent D: Aggregator
- **Role**: Receives outputs from both workers and combines them into a unified, coherent result. Resolves any conflicts or inconsistencies between the two outputs. Ensures the final result reads as a single cohesive deliverable, not two separate pieces glued together.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Grep]
- **Prompt Template**: You are an integration specialist. You will receive outputs from two independent work streams. Your job: (1) review both outputs for completeness and quality, (2) identify any conflicts or inconsistencies, (3) merge them into a single, coherent deliverable. The final output should read as if produced by one author. Resolve conflicts by choosing the higher-quality approach and noting why.

## Edge Flow
User Input -> Agent A (sequential)
Agent A -> Agent B (parallel fork, passes work stream 1 spec)
Agent A -> Agent C (parallel fork, passes work stream 2 spec)
Agent B -> Agent D (join, passes work stream 1 result)
Agent C -> Agent D (join, passes work stream 2 result)
Agent D -> Output (sequential)
