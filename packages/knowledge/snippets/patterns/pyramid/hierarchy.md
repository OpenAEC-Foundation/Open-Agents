---
id: hierarchy
name: Hierarchy Pattern
type: pattern
category: pyramid
tags: [delegation, management, multi-level, coordination]
minNodes: 3
maxNodes: 8
tokenProfile:
  avgInputPerNode: 2200
  avgOutputPerNode: 1800
  costMultiplier: 3.0
---

# Hierarchy Pattern

## Description
A multi-level management structure where a top-level agent delegates to mid-level coordinators, who in turn delegate to worker agents. This mirrors organizational hierarchies: strategic decisions at the top, tactical coordination in the middle, and task execution at the bottom. Useful for large, complex projects that require both high-level oversight and specialized execution.

## Diagram
```
              [Manager]
             /         \
     [Coordinator A]  [Coordinator B]
      /        \           |
[Worker 1] [Worker 2] [Worker 3]
```

## When to Use
- The task is large enough to require multiple levels of decomposition
- Different levels require different capabilities (reasoning vs execution)
- You need clear accountability at each level
- The work naturally organizes into teams or domains

## Anti-Patterns
- Do not use for tasks that a flat fan-out can handle
- Avoid if the hierarchy adds latency without improving quality
- Not suitable when workers need to communicate directly across teams
- Do not use when the coordination overhead exceeds the execution work

## Node Templates

### Manager
- **Role**: Top-level orchestrator. Decomposes the task into major work areas and assigns them to coordinators with clear objectives.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read, Glob, Grep]
- **Prompt Template**: You are a project manager. Decompose the task into major work areas. For each area, define clear objectives, scope boundaries, and success criteria. Assign each area to a coordinator.

### Coordinator A
- **Role**: Mid-level coordinator. Receives a work area from the manager and breaks it into specific executable tasks for workers.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Glob, Grep]
- **Prompt Template**: You are a team coordinator. You receive a work area with objectives. Break it into specific tasks with clear instructions that individual workers can execute independently.

### Worker 1
- **Role**: Task executor. Receives a specific task and completes it according to instructions.
- **Model**: anthropic/claude-haiku-4-5
- **Tools**: [Read, Write, Edit, Bash]
- **Prompt Template**: You are a task executor. Complete the assigned task precisely as instructed. Report your output clearly.

## Edge Flow
Input -> Manager (direct)
Manager -> Coordinator A (delegation)
Manager -> Coordinator B (delegation)
Coordinator A -> Worker 1 (task assignment)
Coordinator A -> Worker 2 (task assignment)
Coordinator B -> Worker 3 (task assignment)
Workers -> Coordinators -> Manager -> Output (aggregation chain)
