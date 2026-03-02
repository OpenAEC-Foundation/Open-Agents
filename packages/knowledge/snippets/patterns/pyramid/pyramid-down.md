---
id: pyramid-down
name: Pyramid Down
type: pattern
category: pyramid
tags: [top-down, delegation, planning, distribution]
minNodes: 3
maxNodes: 8
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 2000
  costMultiplier: 2.5
---

# Pyramid Down

## Description
A top-down delegation pattern where one senior planner at the top decomposes a large task into independent subtasks and distributes them to multiple workers below. The planner uses a capable model to understand the full scope, make architectural decisions, and create detailed specifications. Workers execute their assigned subtasks in parallel using cheaper or specialized models. This pattern is effective when the decomposition itself is the hard part and execution is relatively straightforward once properly specified. Unlike the diamond pattern, the pyramid-down can have many workers and does not necessarily include an aggregation step — the planner's decomposition may produce independently valuable outputs.

## Diagram
```
Layer 1 (Top):         [Planner]              (premium, single)
                      /    |     \
                     v     v      v
Layer 2 (Workers):  [W1]  [W2]  [W3]  ...     (cheap, parallel)
                     |     |      |
                     v     v      v
                   [O1]  [O2]   [O3]           (independent outputs)
```

## When to Use
- A complex task needs to be broken down by an expert before workers can execute
- The decomposition requires understanding of the full picture, but execution of parts does not
- Subtasks are independent and can run in parallel
- You want to maximize parallelism to minimize total execution time
- The task is naturally hierarchical (project -> features -> tasks)

## Anti-Patterns
- Do not use when the decomposition is trivial (use fan-out instead)
- Avoid when subtask results need to be integrated into a single deliverable (add an aggregation layer)
- Not suitable when workers need to coordinate with each other during execution
- Do not use when the number of subtasks is unpredictable (the planner cannot pre-allocate workers)

## Node Templates

### Planner
- **Role**: Receives the full task and decomposes it into independent subtasks. Makes all architectural and strategic decisions. Creates detailed, self-contained specifications for each subtask so workers can execute without further guidance. Determines how many workers are needed and what each should do.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read, Glob, Grep, WebSearch]
- **Prompt Template**: You are a senior architect and project planner. Analyze the incoming task and decompose it into N independent subtasks. For each subtask, produce a complete specification: (1) unique identifier, (2) clear scope and objectives, (3) all necessary context and inputs, (4) expected output format, (5) acceptance criteria. Subtasks MUST be independent — no subtask may depend on the output of another. If dependencies exist, restructure the decomposition. Output a JSON array of subtask specifications.

### Workers (W1-WN): Task Executors
- **Role**: Each worker receives one subtask specification from the planner and executes it independently. Workers are interchangeable — any worker can handle any subtask. Each produces its output without knowledge of other workers or the broader task context.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are a task executor. You will receive a detailed subtask specification. Execute it precisely according to the specification. Follow the scope, produce the expected output format, and satisfy all acceptance criteria. Do not expand beyond the specified scope. Report completion status and any issues encountered.

### Optional Assembler
- **Role**: If the subtask outputs need to be combined, an assembler collects all worker outputs and integrates them. This node is optional and only needed when the task requires a unified final deliverable.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit]
- **Prompt Template**: You are an assembly agent. You will receive outputs from multiple independent workers. Integrate them into a single, cohesive deliverable. Resolve any inconsistencies. Ensure consistent formatting, naming, and style. The final output should appear as a unified work product.

## Edge Flow
User Input -> Planner (sequential)
Planner -> Workers W1-WN (parallel fan-out, each receives one subtask spec)
Workers W1-WN -> Independent Outputs (direct, or to optional Assembler)
Optional Assembler -> Unified Output (if aggregation needed)
