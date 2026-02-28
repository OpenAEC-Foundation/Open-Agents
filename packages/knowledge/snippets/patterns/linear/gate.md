---
id: gate
name: Gate Pattern
type: pattern
category: linear
tags: [conditional, filter, quality-control, decision]
minNodes: 2
maxNodes: 4
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1000
  costMultiplier: 1.5
---

# Gate Pattern

## Description
A linear flow with a quality gate: one agent produces output, and a second agent decides whether the output meets criteria before passing it forward. If the gate rejects, the flow can retry or terminate. Useful for enforcing quality standards without full iterative loops.

## Diagram
```
[Input] --> [Producer] --> [Gate] --pass--> [Output]
                             |
                             +--fail--> [Reject / Retry]
```

## When to Use
- Output quality must meet a defined threshold before delivery
- You want a lightweight review step without a full iterative loop
- The pass/fail decision is relatively straightforward
- You need to filter out low-quality or dangerous outputs

## Anti-Patterns
- Do not use when the gate criteria are subjective and hard to define
- Avoid if the producer almost always passes — the gate adds latency without value
- Do not chain multiple gates sequentially — use iterative refinement instead
- Not suitable when the gate agent needs domain expertise the producer lacks

## Node Templates

### Producer
- **Role**: Generates the initial output that must pass quality review.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: Produce output for the given task. Your output will be reviewed by a quality gate. Aim for correctness and completeness on the first attempt.

### Gate
- **Role**: Evaluates the producer's output against defined criteria. Returns PASS or FAIL with reasoning.
- **Model**: anthropic/claude-haiku-4-5
- **Tools**: [Read]
- **Prompt Template**: Review the following output against these criteria. Respond with PASS if all criteria are met, or FAIL with specific reasons. Be strict but fair.

## Edge Flow
Input -> Producer (direct)
Producer -> Gate (output for review)
Gate -> Output (if PASS)
Gate -> Reject/Retry (if FAIL)
