---
id: de-escalation
name: De-Escalation
type: pattern
category: linear
tags: [cost-optimization, model-routing, planning, delegation]
minNodes: 2
maxNodes: 4
tokenProfile:
  avgInputPerNode: 3000
  avgOutputPerNode: 2000
  costMultiplier: 1.3
---

# De-Escalation

## Description
The inverse of the escalation ladder. Starts with the most capable (and expensive) model for the initial planning, analysis, or decomposition phase, then delegates the execution of well-defined subtasks to cheaper, faster models. The insight is that understanding and planning often require the highest capability, while execution of clearly specified instructions can be done by simpler models. This pattern optimizes cost by spending premium tokens only on the hardest part (figuring out what to do) and using cheap tokens for the bulk of the work (doing it).

## Diagram
```
[User Input] --> [Agent A: Premium Planner] --> [Agent B: Fast Executor] --> [Output]
                        |                              |
                  (detailed plan             (executes plan
                   with clear specs)          step by step)
```

## When to Use
- The task requires sophisticated understanding or planning but straightforward execution
- The planning phase benefits from a model with superior reasoning
- Execution steps are well-defined enough for a cheaper model to handle
- You want to minimize total cost while maintaining quality planning
- The task involves analyzing ambiguous requirements before implementing

## Anti-Patterns
- Do not use when execution itself is complex and requires deep reasoning
- Avoid if the planner cannot produce sufficiently detailed specifications for the executor
- Not suitable when the task is simple enough that a single cheap model handles everything
- Do not use when execution requires adapting to unexpected situations (the cheap model may not handle it)

## Node Templates

### Agent A: Premium Planner
- **Role**: Receives the raw task and produces a highly detailed, unambiguous execution plan. Uses superior reasoning to handle ambiguity, make architectural decisions, and break the work into concrete, executable steps. The plan must be detailed enough that a less capable model can follow it mechanically.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read, Glob, Grep, WebSearch, WebFetch]
- **Prompt Template**: You are a senior architect and planner. Analyze the incoming task thoroughly. Produce a detailed execution plan with the following structure: (1) Summary of what needs to be done and why, (2) Prerequisites and assumptions, (3) Step-by-step instructions — each step must be concrete, unambiguous, and self-contained. Include exact file paths, function names, expected inputs/outputs. (4) Acceptance criteria for the final result. Write the plan so that a junior developer could follow it without asking questions.

### Agent B: Fast Executor
- **Role**: Takes the detailed plan from the premium planner and executes it step by step. Does not need to make architectural decisions or resolve ambiguity — that has already been handled. Focuses on faithful, efficient execution of clearly specified instructions.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: You are an efficient executor. You will receive a detailed execution plan. Follow each step precisely and in order. Do not deviate from the plan. Do not add features or changes not specified in the plan. If a step is unclear, do your best interpretation and note the ambiguity. Complete all steps and report what was done.

### Agent C: Quick Validator (Optional)
- **Role**: Lightweight validation of the executor's output against the planner's acceptance criteria. Only used when the plan includes explicit acceptance criteria that can be checked programmatically or by a fast model.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: You are a validation agent. You will receive: (1) acceptance criteria from the planning phase, (2) output from the execution phase. Check whether the output satisfies all acceptance criteria. Report PASS or FAIL for each criterion. If any criterion fails, describe what is missing or incorrect.

## Edge Flow
User Input -> Agent A (direct, premium model for planning)
Agent A -> Agent B (sequential, passes detailed plan)
Agent B -> Agent C (optional, passes output for validation)
Agent C -> Output (validation result)
