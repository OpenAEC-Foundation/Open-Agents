---
id: lazy-escalation
name: Lazy Escalation
type: pattern
category: efficiency
tags: [cost-optimization, lazy-evaluation, conditional, minimal]
minNodes: 1
maxNodes: 3
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 1.2
---

# Lazy Escalation

## Description
The most cost-conscious escalation pattern. Tries the cheapest model first and only escalates if the attempt explicitly fails, returns a low-confidence signal, or encounters an error. Unlike the escalation ladder which pre-plans multiple tiers, lazy escalation is purely reactive: the default path is "cheapest model succeeds" and escalation is the exception. The expected cost multiplier is low (1.2x) because most tasks (70-90%) resolve at the cheapest tier. This pattern is ideal for high-volume automation where most requests are routine but some require heavier processing.

## Diagram
```
[Input] --> [Cheap Agent] --success--> [Output]
                 |
            failure/error
                 |
                 v
           [Mid Agent] --success--> [Output]
                 |
            failure/error
                 |
                 v
          [Premium Agent] --> [Output]
```

## When to Use
- You process high volumes of requests where most are simple
- Cost is a primary concern and you want the lowest average cost per request
- Failures are detectable (error codes, confidence signals, validation checks)
- The cheapest model handles the majority of cases successfully
- You can tolerate slightly higher latency when escalation occurs

## Anti-Patterns
- Do not use when failures are undetectable (the cheap model produces confident but wrong answers)
- Avoid when most tasks genuinely need a premium model (escalation becomes the default, adding overhead)
- Not suitable when side effects occur before failure detection (e.g., partial writes that must be rolled back)
- Do not use for tasks where the cheap model's failure mode is subtly wrong output rather than clear errors

## Node Templates

### Cheap Agent
- **Role**: First attempt with the fastest, cheapest model. Includes built-in error detection and confidence assessment. If the task is within capability, produces the result directly. If the task encounters an error, exceeds complexity thresholds, or the model self-assesses low confidence, it returns a structured failure signal rather than a poor-quality result.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Grep, Glob]
- **Prompt Template**: You are a fast-response agent optimized for cost efficiency. Attempt the task. If you can complete it confidently, return the result. If you encounter ANY of these conditions, return a failure signal instead: (1) the task requires reasoning beyond your capability, (2) you are not confident in your answer, (3) the task requires tools or context you do not have. Failure format: {"status": "escalate", "reason": "...", "partial_work": "..."}. Success format: {"status": "complete", "result": "..."}.

### Mid Agent
- **Role**: Second tier, deployed only when the cheap agent signals failure. Receives the original task plus the cheap agent's failure reason and any partial work. Has more capable reasoning and broader tool access. If it also cannot complete the task, signals for final escalation.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are a mid-tier agent handling a task that a faster model could not complete. Reason for escalation: {escalation_reason}. Partial work from previous attempt: {partial_work}. Complete the task using the previous attempt as a starting point if useful. Use the same success/failure signal format. Only escalate further if genuinely necessary.

### Premium Agent
- **Role**: Final tier, deployed only as a last resort. Receives the full context including all previous attempts and failure reasons. Expected to handle the task definitively. No further escalation is possible.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch]
- **Prompt Template**: You are the premium agent of last resort. Previous agents could not complete this task. Escalation history: {escalation_history}. Complete the task definitively using all available resources and your full reasoning capability. There is no further escalation — your answer is final.

## Edge Flow
User Input -> Cheap Agent (attempt 1)
Cheap Agent -> Output (if status=complete)
Cheap Agent -> Mid Agent (if status=escalate, passes reason + partial work)
Mid Agent -> Output (if status=complete)
Mid Agent -> Premium Agent (if status=escalate, passes full history)
Premium Agent -> Output (always terminal)
