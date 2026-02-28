---
id: inverted-pyramid
name: Inverted Pyramid
type: pattern
category: pyramid
tags: [aggregation, synthesis, many-to-one, reduction]
minNodes: 3
maxNodes: 6
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 2.0
---

# Inverted Pyramid

## Description
Multiple specialist agents each produce independent outputs from the same input, and a single synthesizer agent combines them into one coherent result. Unlike the diamond pattern which splits the task, here every agent receives the full input but applies a different lens or perspective. The synthesizer must reconcile potentially conflicting viewpoints.

## Diagram
```
[Input] --> [Specialist A]  \
[Input] --> [Specialist B]  --> [Synthesizer] --> [Output]
[Input] --> [Specialist C]  /
```

## When to Use
- You want multiple perspectives on the same input
- Different specializations each add unique value
- The final output benefits from synthesizing diverse viewpoints
- You need comprehensive coverage that no single agent provides

## Anti-Patterns
- Do not use when perspectives are redundant rather than complementary
- Avoid if the synthesizer cannot meaningfully reconcile different viewpoints
- Not suitable when one perspective clearly dominates
- Do not use for tasks where a single expert is sufficient

## Node Templates

### Specialist A
- **Role**: Analyzes the input from perspective A (e.g., technical feasibility).
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob]
- **Prompt Template**: Analyze the following input from your specialized perspective. Provide detailed findings and recommendations. Focus on your area of expertise.

### Specialist B
- **Role**: Analyzes the input from perspective B (e.g., business impact).
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, WebSearch]
- **Prompt Template**: Analyze the following input from your specialized perspective. Provide detailed findings and recommendations. Focus on your area of expertise.

### Synthesizer
- **Role**: Combines outputs from all specialists into a unified, balanced recommendation.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write]
- **Prompt Template**: You receive analyses from multiple specialists. Synthesize them into a coherent recommendation. Highlight agreements, resolve conflicts, and produce a balanced final output.

## Edge Flow
Input -> Specialist A (parallel)
Input -> Specialist B (parallel)
Input -> Specialist C (parallel)
Specialists -> Synthesizer (join)
Synthesizer -> Output (direct)
