---
id: spiral
name: Spiral
type: pattern
category: iterative
tags: [progressive, refinement, depth, incremental]
minNodes: 2
maxNodes: 3
tokenProfile:
  avgInputPerNode: 3500
  avgOutputPerNode: 3000
  costMultiplier: 4.0
---

# Spiral

## Description
Each iteration adds a new layer of depth, detail, or sophistication to the previous output. Unlike the simple loop which fixes problems, the spiral intentionally starts with a high-level skeleton and progressively enriches it. Iteration 1 produces a rough outline. Iteration 2 fills in details. Iteration 3 adds nuance, edge cases, and polish. This mirrors how experts approach complex work: first get the structure right, then fill in the content, then refine. The spiral pattern is particularly effective for complex creative or analytical tasks where trying to produce the final version in one pass leads to incoherence or missing structure.

## Diagram
```
[Input] --> [Drafter] --> [Enricher] --> [Drafter] --> [Enricher] --> ... --> [Output]
              |              |              |              |
          (skeleton)    (add detail)   (add nuance)   (final polish)
           Pass 1         Pass 1        Pass 2          Pass 2
```

## When to Use
- Complex documents that benefit from outline-first, details-later approach
- Architecture designs where high-level structure must be validated before details are added
- Creative writing where plot/structure should precede prose quality
- Any task where premature detail leads to structural problems
- Tasks where the depth of analysis should increase with each pass

## Anti-Patterns
- Do not use for simple tasks that can be completed in one pass
- Avoid when each iteration does not meaningfully add to the output (diminishing returns)
- Not suitable when the user needs a quick result — spiraling takes multiple passes
- Do not use when the output format is rigid and does not allow progressive enrichment
- Avoid when later passes tend to overwrite or contradict earlier structural decisions

## Node Templates

### Drafter
- **Role**: On each pass, produces or extends the output at the current depth level. Pass 1: creates the high-level skeleton (structure, headings, key points). Pass 2: adds details, examples, and supporting content. Pass 3: adds nuance, edge cases, transitions, and polish. The drafter must respect the structure established in earlier passes and only add depth, not restructure.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are a progressive drafter. You work in spiral passes, each adding more depth. Current pass: {pass_number}. Pass 1 rules: Create the skeleton — main sections, key points, overall structure. Keep it concise. Pass 2 rules: Fill in details — examples, explanations, code implementations. Do not change the structure. Pass 3 rules: Add nuance — edge cases, error handling, transitions, polish. Respect all previous work. Mark sections you have enriched with [ENRICHED:pass_N].

### Enricher
- **Role**: Evaluates the current state of the output and determines what depth level has been achieved and what the next pass should focus on. Provides guidance to the drafter about which sections need more depth, what kind of content should be added, and whether the overall structure needs adjustment before more detail is added.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep]
- **Prompt Template**: You are a depth evaluator. Review the current output and assess: (1) what depth level has been achieved (skeleton/detailed/polished), (2) which sections need more depth, (3) what specific content should be added in the next pass, (4) whether the structure is sound enough to support more detail (if not, flag structural issues before proceeding). Output a structured enrichment plan for the next pass. Maximum 3 passes total.

## Edge Flow
User Input -> Drafter (pass 1, produces skeleton)
Drafter -> Enricher (evaluates depth, plans next pass)
Enricher -> Drafter (pass 2, adds detail per enrichment plan)
Drafter -> Enricher (evaluates depth, plans final pass)
Enricher -> Drafter (pass 3, adds nuance and polish)
Drafter -> Output (final result after all passes)
