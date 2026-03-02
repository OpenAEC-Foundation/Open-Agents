---
id: single-shot
name: Single Shot
type: pattern
category: linear
tags: [simple, single-agent, quick, low-cost]
minNodes: 1
maxNodes: 1
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 1.0
---

# Single Shot

## Description
The simplest possible pattern: one agent receives a task, processes it, and returns a result. No orchestration, no handoffs, no loops. This is the default starting point for any workflow and should be the baseline against which more complex patterns are measured. If a single agent can solve the problem, there is no reason to add complexity.

## Diagram
```
[User Input] --> [Agent A] --> [Output]
```

## When to Use
- The task is well-defined and scoped (e.g., "write a unit test for this function")
- A single model has sufficient capability for the task
- Latency matters more than thoroughness
- You are prototyping and want fast iteration
- The context window of one model can hold all relevant information

## Anti-Patterns
- Do not use when the task requires multiple distinct skill sets (e.g., code generation + security review)
- Do not use for tasks where quality must be validated by a separate perspective
- Avoid when input data exceeds the context window of the chosen model
- Not suitable for tasks requiring iterative refinement based on external feedback

## Node Templates

### Agent A
- **Role**: General-purpose task executor. Receives the full task description and all necessary context, produces the final output directly.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: You are a focused task executor. You will receive a single, well-defined task. Complete it directly and thoroughly. Do not ask clarifying questions unless the task is genuinely ambiguous. Provide your output in the format requested. If no format is specified, use the most natural format for the content.

## Edge Flow
User Input -> Agent A (direct)
Agent A -> Output (direct)
