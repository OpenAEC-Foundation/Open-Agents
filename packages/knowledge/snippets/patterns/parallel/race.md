---
id: race
name: Race Pattern
type: pattern
category: parallel
tags: [parallel, competition, fastest-wins, redundancy]
minNodes: 2
maxNodes: 5
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 3.0
---

# Race Pattern

## Description
Multiple agents receive the same task and race to produce the best result. A judge agent evaluates all outputs and selects the winner. This trades cost for quality — you pay for N parallel executions but get the best-of-N results. Useful when solution quality is critical and the optimal approach is uncertain.

## Diagram
```
[Input] --> [Racer A] \
[Input] --> [Racer B]  --> [Judge] --> [Output]
[Input] --> [Racer C] /
```

## When to Use
- Solution quality is more important than cost
- The optimal approach is uncertain and multiple strategies are valid
- You want to compare different models or prompting strategies
- The task has significant variance in output quality

## Anti-Patterns
- Do not use for routine tasks where one approach consistently wins
- Avoid when cost is a primary concern (you pay for all racers)
- Not suitable when outputs are difficult to objectively compare
- Do not use when the judging criteria are subjective

## Node Templates

### Racer A
- **Role**: Produces a solution using approach A. Works independently without knowledge of other racers.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: Solve the following task to the best of your ability. Produce a complete, high-quality solution. Your output will be compared against alternative solutions.

### Racer B
- **Role**: Produces a solution using approach B or a different model.
- **Model**: openai/gpt-4o
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: Solve the following task to the best of your ability. Produce a complete, high-quality solution. Your output will be compared against alternative solutions.

### Judge
- **Role**: Evaluates all racer outputs and selects the best one based on defined criteria.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read]
- **Prompt Template**: Evaluate the following solutions against these criteria: correctness, completeness, code quality, and clarity. Select the best solution and explain your reasoning.

## Edge Flow
Input -> Racer A (parallel)
Input -> Racer B (parallel)
Input -> Racer C (parallel)
Racers -> Judge (join)
Judge -> Output (selection)
