---
id: debate
name: Debate Pattern
type: pattern
category: iterative
tags: [iterative, adversarial, argumentation, critical-thinking]
minNodes: 3
maxNodes: 4
tokenProfile:
  avgInputPerNode: 3000
  avgOutputPerNode: 2500
  costMultiplier: 5.0
---

# Debate Pattern

## Description
Two agents argue opposing positions on a topic, while a judge agent evaluates their arguments across multiple rounds. Each debater sees the other's arguments and must respond. The judge synthesizes the strongest points from both sides into a balanced conclusion. This adversarial approach surfaces issues and perspectives that a single agent might miss.

## Diagram
```
[Input] --> [Debater A] <--> [Debater B]
                |                 |
                v                 v
              [Judge] --> [Output]
```

## When to Use
- The topic has legitimate multiple perspectives
- You want to stress-test an idea or proposal
- Critical analysis is more important than speed
- The task benefits from adversarial thinking

## Anti-Patterns
- Do not use for factual tasks with clear correct answers
- Avoid when the debate is performative rather than substantive
- Not suitable when one side is clearly stronger (waste of tokens)
- Do not use for more than 3 rounds — diminishing returns

## Node Templates

### Debater A
- **Role**: Argues for position A. Responds to counterarguments from Debater B. Must be intellectually honest.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, WebSearch]
- **Prompt Template**: Argue for the following position. If you receive counterarguments, address them directly. Be persuasive but intellectually honest. Concede valid points.

### Debater B
- **Role**: Argues for position B. Responds to arguments from Debater A. Seeks weaknesses in the opposing position.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, WebSearch]
- **Prompt Template**: Argue against the following position. Identify weaknesses, edge cases, and counterexamples. If you receive arguments from the other side, respond directly.

### Judge
- **Role**: Evaluates arguments from both sides and produces a balanced synthesis.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read]
- **Prompt Template**: You have observed a debate between two positions. Evaluate the strongest arguments from each side. Produce a balanced conclusion that incorporates the best insights from both perspectives.

## Edge Flow
Input -> Debater A (round 1 argument)
Input -> Debater B (round 1 argument)
Debater A <-> Debater B (iterative rounds)
Both -> Judge (final arguments)
Judge -> Output (synthesis)
