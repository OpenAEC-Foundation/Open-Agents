---
id: simple-loop
name: Simple Loop
type: pattern
category: iterative
tags: [iteration, refinement, feedback, quality]
minNodes: 2
maxNodes: 2
tokenProfile:
  avgInputPerNode: 3000
  avgOutputPerNode: 2500
  costMultiplier: 3.0
---

# Simple Loop

## Description
The fundamental iterative pattern: an executor agent produces output, a reviewer agent evaluates it against quality criteria, and if the output does not meet the threshold, the reviewer sends feedback back to the executor for another attempt. The loop continues until the reviewer approves the output or a maximum iteration count is reached. This pattern is the agent equivalent of a code review cycle — draft, review, revise, review again. The key to making this pattern effective is clear, actionable feedback from the reviewer and a well-defined quality threshold that prevents infinite loops.

## Diagram
```
                    +--[feedback]--+
                    |              |
                    v              |
[User Input] --> [Executor] --> [Reviewer] --pass--> [Output]
                                   |
                              (max iterations
                               reached? -> Output)
```

## When to Use
- The task benefits from iterative refinement (writing, code generation, design)
- Quality criteria can be clearly defined and evaluated
- First drafts are typically good enough as a starting point but need polish
- You want to approach a quality target progressively rather than hoping for perfection on the first attempt
- The reviewer can provide specific, actionable feedback

## Anti-Patterns
- Do not use when the executor cannot meaningfully improve from reviewer feedback (wrong model for the task)
- Avoid if quality criteria are subjective and the reviewer cannot provide consistent evaluations
- Not suitable when the cost of multiple iterations exceeds the value of quality improvement
- Do not use without a maximum iteration limit — infinite loops waste tokens
- Avoid when the first attempt is typically sufficient (use single-shot instead)

## Node Templates

### Executor
- **Role**: Produces the work output. On the first iteration, works from the user's original request. On subsequent iterations, incorporates the reviewer's feedback to improve the previous output. Must track what changed between iterations to avoid regression. Should prioritize addressing the reviewer's specific feedback items rather than making unrelated changes.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are an iterative executor. On the first pass, produce your best output for the given task. On subsequent passes, you will receive specific feedback from a reviewer. Address EVERY feedback item explicitly. Do not regress on previously approved aspects. After making changes, include a brief changelog: what you changed and why. If you disagree with a feedback item, explain your reasoning.

### Reviewer
- **Role**: Evaluates the executor's output against defined quality criteria. Produces a structured evaluation with a pass/fail decision and, if failing, specific actionable feedback items. Each feedback item should be concrete enough for the executor to act on without guessing. The reviewer must be consistent across iterations — do not introduce new criteria mid-loop.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: You are a quality reviewer. Evaluate the output against these criteria: [defined per task]. For each criterion, score PASS or FAIL with a brief explanation. If ANY criterion fails, produce specific, actionable feedback for each failure. Format: {"verdict": "pass|fail", "iteration": N, "criteria": [{"name": "...", "status": "pass|fail", "feedback": "..."}], "summary": "..."}. Be consistent — do not introduce new criteria after the first review. Maximum iterations: 3.

## Edge Flow
User Input -> Executor (sequential, initial task)
Executor -> Reviewer (sequential, passes output for evaluation)
Reviewer -> Output (if verdict is "pass" or max iterations reached)
Reviewer -> Executor (if verdict is "fail", passes feedback for next iteration)
