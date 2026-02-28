---
id: chain
name: Sequential Chain
type: pattern
category: linear
tags: [pipeline, sequential, multi-step, transformation]
minNodes: 2
maxNodes: 5
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 2000
  costMultiplier: 2.0
---

# Sequential Chain

## Description
A linear pipeline where each agent processes the output of the previous agent. Agent A produces a result, which becomes the input for Agent B, whose output feeds Agent C, and so on. Each agent in the chain specializes in one transformation or analysis step. The chain enforces a strict ordering: no agent runs until its predecessor completes. This pattern is ideal when a task naturally decomposes into sequential stages with clear input/output contracts.

## Diagram
```
[User Input] --> [Agent A: Plan] --> [Agent B: Execute] --> [Agent C: Polish] --> [Output]
                      |                    |                      |
                  (plan doc)          (raw output)         (final output)
```

## When to Use
- The task has clear, sequential stages (e.g., research -> draft -> review)
- Each stage requires a different specialization or model capability
- The output of one stage is the natural input for the next
- You want to keep each agent's context small and focused
- Debugging requires tracing through discrete steps

## Anti-Patterns
- Do not use when stages are independent and could run in parallel (use fan-out instead)
- Avoid long chains (5+ nodes) where errors compound through stages
- Not suitable when early stages need feedback from later stages (use iterative patterns)
- Do not force a chain when a single agent could handle all stages within its context window

## Node Templates

### Agent A: Planner
- **Role**: Analyzes the task, breaks it down into a structured plan, and identifies what information is needed. Produces a structured plan document that the executor can follow.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Glob, Grep, WebSearch]
- **Prompt Template**: You are a planning specialist. Analyze the incoming task and produce a structured execution plan. Your plan should include: (1) clear objectives, (2) step-by-step instructions, (3) required inputs and expected outputs, (4) potential risks or edge cases. Format your plan as a numbered list with clear sections. Do not execute the plan yourself.

### Agent B: Executor
- **Role**: Takes the plan from Agent A and executes it step by step. Produces the raw work output (code, text, analysis, etc.) following the plan faithfully.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: You are an execution specialist. You will receive a structured plan. Follow it step by step, producing the requested output. If a step is unclear, make a reasonable interpretation and note your assumption. Do not deviate from the plan unless you identify a critical error in it. Produce complete, working output.

### Agent C: Polisher
- **Role**: Reviews and refines the raw output from Agent B. Fixes errors, improves quality, ensures consistency, and produces the final deliverable.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Edit, Grep]
- **Prompt Template**: You are a quality and polish specialist. You will receive raw output from a previous agent. Review it for: (1) correctness, (2) completeness, (3) consistency, (4) clarity. Fix any issues you find. Improve formatting and readability. Your output is the final deliverable, so it must be production-ready.

## Edge Flow
User Input -> Agent A (sequential)
Agent A -> Agent B (sequential, passes plan document)
Agent B -> Agent C (sequential, passes raw output)
Agent C -> Output (sequential, delivers final result)
