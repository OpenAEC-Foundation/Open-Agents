---
id: handoff
name: Handoff Pattern
type: pattern
category: linear
tags: [delegation, routing, specialization, triage]
minNodes: 2
maxNodes: 5
tokenProfile:
  avgInputPerNode: 1800
  avgOutputPerNode: 1500
  costMultiplier: 1.8
---

# Handoff Pattern

## Description
A triage agent analyzes the incoming task and routes it to the most appropriate specialist agent. Unlike the chain where every agent runs, the handoff selects exactly one downstream agent based on task characteristics. This enables cost-effective routing — simple tasks go to fast/cheap models, complex tasks go to capable/expensive models.

## Diagram
```
[Input] --> [Router] --type A--> [Specialist A] --> [Output]
                     --type B--> [Specialist B] --> [Output]
                     --type C--> [Specialist C] --> [Output]
```

## When to Use
- Incoming tasks have clearly different types requiring different skills
- You want to optimize cost by routing simple tasks to cheaper models
- Different tasks require different tool sets
- You need a single entry point that fans out to specialists

## Anti-Patterns
- Do not use when all tasks need the same processing — just use single-shot
- Avoid if the routing decision is ambiguous or context-dependent
- Do not use when multiple specialists need to collaborate on one task
- Not suitable if the number of specialist types exceeds 5-6 (becomes hard to route)

## Node Templates

### Router
- **Role**: Analyzes the incoming task and determines which specialist should handle it. Must be fast and cheap.
- **Model**: anthropic/claude-haiku-4-5
- **Tools**: [Read]
- **Prompt Template**: Analyze the following task and classify it into one of these categories. Respond with only the category name. Be decisive — pick the single best match.

### Specialist A
- **Role**: Handles tasks of type A with domain-specific expertise and tools.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash]
- **Prompt Template**: You are a specialist for type A tasks. Handle the following task using your specialized knowledge and tools.

### Specialist B
- **Role**: Handles tasks of type B with domain-specific expertise and tools.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob]
- **Prompt Template**: You are a specialist for type B tasks. Handle the following task using your specialized knowledge and tools.

## Edge Flow
Input -> Router (direct)
Router -> Specialist A (conditional, type A)
Router -> Specialist B (conditional, type B)
Specialist -> Output (direct)
