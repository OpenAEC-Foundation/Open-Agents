---
id: recursive-depth
name: Recursive Depth
type: pattern
category: iterative
tags: [recursion, decomposition, tree, divide-and-conquer]
minNodes: 1
maxNodes: 4
tokenProfile:
  avgInputPerNode: 3000
  avgOutputPerNode: 2500
  costMultiplier: 5.0
---

# Recursive Depth

## Description
An agent recursively breaks down a problem into smaller sub-problems, processes each sub-problem (potentially spawning further recursion), and assembles the results bottom-up. This pattern creates a tree-structured execution where the depth of recursion depends on problem complexity. Each recursive call receives a narrower scope but the same processing logic. A depth limit prevents runaway recursion. This pattern excels at problems with fractal-like structure: codebases (repo -> packages -> modules -> functions), documents (book -> chapters -> sections -> paragraphs), or organizational hierarchies.

## Diagram
```
[Problem] --> [Decomposer]
                   |
         +---------+---------+
         v         v         v
    [Sub-P 1] [Sub-P 2] [Sub-P 3]
         |         |
    +----+----+    |
    v         v    v
 [Sub-1a] [Sub-1b] [Leaf]
    |         |
    v         v
  [Leaf]   [Leaf]

All leaves --> [Assembler] --> [Output]
```

## When to Use
- The problem has natural hierarchical or tree-like structure
- Sub-problems have the same shape as the parent problem but smaller scope
- The depth of decomposition is not known in advance and depends on complexity
- You want to handle arbitrary complexity by recursing deeper when needed
- The final result can be assembled from the results of all sub-problems

## Anti-Patterns
- Do not use without a strict depth limit (recursive patterns can explode in cost)
- Avoid when the problem does not have natural sub-problem structure (forcing recursion adds overhead)
- Not suitable when sub-problems are interdependent (recursion assumes independence)
- Do not use when a flat parallel approach (fan-out) would be equally effective with less overhead
- Avoid when the assembly step cannot meaningfully combine sub-problem results

## Node Templates

### Decomposer
- **Role**: Examines the current problem scope and decides whether to: (a) solve it directly if it is small enough (base case), or (b) decompose it into smaller sub-problems and recurse. Implements the recursion logic including depth tracking and the base case condition. When decomposing, ensures sub-problems are independent, collectively exhaustive, and non-overlapping.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Glob, Grep]
- **Prompt Template**: You are a recursive decomposition agent. Current depth: {depth}/{max_depth}. Analyze the problem scope you received. Decision rules: (1) If the scope is small enough to solve directly (e.g., single file, single function, single paragraph), solve it and return the result as a leaf node. (2) If the scope is too large, decompose it into 2-4 independent sub-problems. For each sub-problem, specify: id, scope description, required context, and expected output format. (3) If at max depth, solve directly regardless of scope size. Output format: {"action": "solve|decompose", "result": "..." or "subproblems": [...]}

### Leaf Solver
- **Role**: Handles the base case of the recursion. Receives a narrowly scoped sub-problem and solves it directly. Produces a complete, self-contained result for its specific scope. Does not need to understand the broader problem context.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Write, Edit, Bash, Grep]
- **Prompt Template**: You are a focused solver for a specific sub-problem. Solve the following narrowly scoped task completely. Your result will be combined with other sub-problem results by an assembler. Produce structured output that includes: (1) sub-problem identifier, (2) complete solution, (3) any dependencies or connections to other sub-problems you noticed.

### Assembler
- **Role**: Collects results from all leaf solvers and sub-tree assemblies, then combines them into a coherent whole. Works bottom-up: first combines leaf results at the deepest level, then combines those into higher-level results, until the entire tree is assembled into the final output. Handles cross-references and ensures consistency across sub-problem boundaries.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit]
- **Prompt Template**: You are a recursive assembler. You will receive results from multiple sub-problems that collectively cover the original problem. Assemble them bottom-up: (1) start with the deepest level results, (2) combine sibling results into their parent scope, (3) resolve any cross-references or boundary issues, (4) ensure the assembled result is coherent and complete. The final output should read as if the entire problem was solved by a single agent.

## Edge Flow
User Input -> Decomposer (recursive entry point)
Decomposer -> Leaf Solver (if base case, direct solve)
Decomposer -> Decomposer (if decompose, recurse on each sub-problem)
Leaf Solvers -> Assembler (bottom-up collection)
Sub-Assemblers -> Assembler (hierarchical assembly)
Assembler -> Output (final unified result)
