---
id: escalation-ladder
name: Escalation Ladder
type: pattern
category: linear
tags: [cost-optimization, model-routing, escalation, progressive]
minNodes: 2
maxNodes: 4
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 1.5
---

# Escalation Ladder

## Description
Starts with the cheapest, fastest model and escalates to progressively more capable (and expensive) models only when the current model signals low confidence, detects complexity beyond its capability, or produces output that fails a quality check. The key insight is that many tasks do not require the most powerful model. By starting cheap and escalating on-demand, you dramatically reduce average cost while maintaining quality for complex cases. Each rung of the ladder includes a confidence assessment that determines whether to pass the result through or escalate.

## Diagram
```
[User Input] --> [Agent A: Fast/Cheap] --confidence high--> [Output]
                        |
                   confidence low
                        |
                        v
                 [Agent B: Mid-Tier] --confidence high--> [Output]
                        |
                   confidence low
                        |
                        v
                 [Agent C: Premium] --> [Output]
```

## When to Use
- You process a high volume of tasks with varying complexity
- Cost optimization is a primary concern
- Most tasks (60-80%) can be handled by cheaper models
- You can define clear confidence signals or quality thresholds
- Latency is acceptable when escalation occurs

## Anti-Patterns
- Do not use when all tasks are known to require premium model capabilities
- Avoid if the cost of failed cheap attempts exceeds the savings (e.g., tasks with side effects)
- Not suitable when confidence assessment itself is unreliable
- Do not use for creative tasks where "confidence" is hard to quantify

## Node Templates

### Agent A: Fast Tier
- **Role**: First attempt using the fastest, cheapest model. Handles straightforward tasks directly. Includes a self-assessment of confidence in its output. If confidence is below threshold (e.g., <0.7), signals for escalation rather than returning a low-quality result.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Grep, Glob]
- **Prompt Template**: You are a fast-response agent. Attempt to complete the given task. After producing your output, assess your confidence on a scale of 0.0 to 1.0. Include a JSON block at the end: {"confidence": 0.X, "reason": "..."}. Be honest about your confidence. If the task requires deep reasoning, complex code, or nuanced analysis, rate your confidence accordingly. A low confidence score is not a failure; it is a valuable signal.

### Agent B: Mid Tier
- **Role**: Handles tasks that the fast tier could not confidently complete. Has stronger reasoning capabilities. Receives both the original task and the fast tier's attempt (if useful). Also includes confidence self-assessment for potential further escalation.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are a mid-tier reasoning agent. You are receiving a task that a faster model was not confident about. You may also receive the previous attempt. Complete the task with thorough reasoning. Assess your confidence: {"confidence": 0.X, "reason": "..."}. If you are confident (>=0.8), return the final result. If not, flag for escalation.

### Agent C: Premium Tier
- **Role**: The most capable model, deployed only for the hardest tasks. Receives the original task, all previous attempts, and their confidence assessments. Expected to produce a definitive, high-quality result.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch]
- **Prompt Template**: You are the premium reasoning agent, deployed for the most complex tasks. You will receive the original task along with previous attempts and their confidence assessments. Use all available information to produce a thorough, high-quality result. Your output is the final answer. Take the time needed for deep analysis.

## Edge Flow
User Input -> Agent A (direct)
Agent A -> Output (if confidence >= 0.8)
Agent A -> Agent B (if confidence < 0.8, passes task + attempt)
Agent B -> Output (if confidence >= 0.8)
Agent B -> Agent C (if confidence < 0.8, passes task + all attempts)
Agent C -> Output (always terminal)
