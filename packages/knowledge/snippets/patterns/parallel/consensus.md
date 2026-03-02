---
id: consensus
name: Consensus Pattern
type: pattern
category: parallel
tags: [parallel, voting, agreement, reliability]
minNodes: 3
maxNodes: 7
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 3.5
---

# Consensus Pattern

## Description
Multiple agents independently solve the same task, then a consensus agent compares outputs to find agreement. Where agents agree, confidence is high. Where they disagree, the consensus agent investigates the discrepancy. This is especially valuable for tasks where correctness is critical (e.g., security analysis, financial calculations).

## Diagram
```
[Input] --> [Agent A] \
[Input] --> [Agent B]  --> [Consensus] --> [Output]
[Input] --> [Agent C] /
```

## When to Use
- Correctness is critical and errors are costly
- You want to identify uncertain areas through disagreement
- Independent verification adds significant value
- The task has objectively verifiable correct answers

## Anti-Patterns
- Do not use for creative tasks where diversity is the goal, not convergence
- Avoid when all agents use the same model and prompts (they will agree trivially)
- Not suitable when consensus is impossible due to inherent ambiguity
- Do not use when cost is the primary concern

## Node Templates

### Agent A
- **Role**: Independent solver. Produces a solution without knowledge of other agents.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: Solve the following task independently. Show your reasoning. Produce a clear, verifiable answer.

### Agent B
- **Role**: Independent solver using a different approach or model.
- **Model**: openai/gpt-4o
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: Solve the following task independently. Show your reasoning. Produce a clear, verifiable answer.

### Consensus
- **Role**: Compares all solutions, identifies agreements and disagreements, produces a verified final answer.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read]
- **Prompt Template**: Compare the following independent solutions. Identify where they agree (high confidence) and disagree (needs investigation). For disagreements, determine which answer is correct and explain why. Produce a verified final answer.

## Edge Flow
Input -> Agent A (parallel)
Input -> Agent B (parallel)
Input -> Agent C (parallel)
Agents -> Consensus (join)
Consensus -> Output (verified result)
