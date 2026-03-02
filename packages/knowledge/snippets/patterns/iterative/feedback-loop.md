---
id: feedback-loop
name: Feedback Loop
type: pattern
category: iterative
tags: [iterative, refinement, improvement, quality]
minNodes: 2
maxNodes: 3
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 2000
  costMultiplier: 4.0
---

# Feedback Loop

## Description
A producer agent creates output, a reviewer agent evaluates it and provides feedback, and the producer revises based on that feedback. This cycle repeats until quality criteria are met or a maximum iteration count is reached. The pattern ensures continuous improvement through explicit feedback.

## Diagram
```
[Input] --> [Producer] --> [Reviewer] --pass--> [Output]
                ^              |
                |              |
                +----fail------+
```

## When to Use
- Output quality improves significantly with iteration
- A clear quality rubric exists for the reviewer
- The producer can meaningfully incorporate feedback
- You need high-quality output and are willing to trade latency for quality

## Anti-Patterns
- Do not use when the producer cannot improve based on feedback
- Avoid unbounded loops — always set a maximum iteration count
- Not suitable when quality criteria are vague or subjective
- Do not use when the first attempt is usually sufficient

## Node Templates

### Producer
- **Role**: Creates or revises output based on the task and any feedback from the reviewer.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: Produce output for the given task. If you receive feedback from a previous review, address each point specifically. Explain what you changed and why.

### Reviewer
- **Role**: Evaluates the producer's output against quality criteria. Provides specific, actionable feedback or approves the output.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: Review the following output against these criteria. If it meets all criteria, respond with APPROVED. Otherwise, provide specific, actionable feedback for each issue found. Be constructive and precise.

## Edge Flow
Input -> Producer (direct)
Producer -> Reviewer (output for review)
Reviewer -> Output (if APPROVED)
Reviewer -> Producer (if feedback, loop back)
Max iterations: 3
