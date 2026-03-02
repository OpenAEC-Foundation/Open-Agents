---
id: pyramid-up
name: Pyramid Up
type: pattern
category: pyramid
tags: [bottom-up, synthesis, many-to-few, aggregation]
minNodes: 4
maxNodes: 8
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 2.0
---

# Pyramid Up

## Description
A bottom-up synthesis pattern where many cheap workers at the base layer each process a portion of the input independently. Their outputs feed into fewer, more capable agents at the middle layer that synthesize and analyze the partial results. Finally, one or two premium agents at the top produce the final consolidated output. This pattern mirrors how organizations work: many analysts gather data, managers synthesize insights, executives make decisions. It is cost-efficient because the bulk of the token usage happens at the cheapest tier.

## Diagram
```
Layer 1 (Base):    [W1] [W2] [W3] [W4]     (cheap, parallel)
                     \   |    |   /
                      v  v    v  v
Layer 2 (Mid):       [Analyst A] [Analyst B]  (mid-tier, parallel)
                         \        /
                          v      v
Layer 3 (Top):         [Synthesizer]          (premium, single)
```

## When to Use
- Large input that must be processed in chunks (e.g., reviewing a large codebase, analyzing many documents)
- The analysis at higher layers requires understanding patterns across multiple chunks
- You want to optimize cost by using cheap models for the bulk of data processing
- The task benefits from progressive abstraction (details -> patterns -> insights)
- Each chunk can be analyzed independently before cross-chunk synthesis

## Anti-Patterns
- Do not use when chunks are interdependent and cannot be analyzed in isolation
- Avoid when the total input is small enough for one agent to handle
- Not suitable when the synthesis requires re-reading the original data (information loss through layers)
- Do not use if the middle layer adds no value over directly aggregating base results

## Node Templates

### Workers (W1-W4): Base Processors
- **Role**: Each worker receives one chunk of the input and processes it independently. Extracts key information, produces structured summaries, or performs initial analysis. Workers do not communicate with each other and have no awareness of other chunks.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Grep, Glob]
- **Prompt Template**: You are a data processing agent. You will receive one chunk of a larger dataset. Analyze this chunk and produce a structured summary containing: (1) key findings, (2) notable patterns or anomalies, (3) relevant metrics or counts, (4) any concerns or issues. Be thorough but concise. Format your output as structured JSON for easy aggregation.

### Analysts (A-B): Mid-Layer Synthesizers
- **Role**: Each analyst receives outputs from 2-3 base workers. Identifies cross-chunk patterns, resolves conflicts between worker outputs, and produces a higher-level analysis. Operates with more context and reasoning capability than the base workers.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep]
- **Prompt Template**: You are a mid-level analysis agent. You will receive structured summaries from multiple data processors. Your job: (1) identify patterns that span across the individual summaries, (2) resolve any conflicting findings, (3) prioritize insights by importance, (4) produce a consolidated analysis that captures what matters most. Go beyond mere aggregation — look for emergent patterns.

### Synthesizer: Top-Layer Decision Maker
- **Role**: Receives the consolidated analyses from the mid-layer and produces the final output. Has the full picture (as synthesized through the layers) and applies the highest level of reasoning to produce conclusions, recommendations, or final deliverables.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit]
- **Prompt Template**: You are the final synthesizer. You will receive consolidated analyses from multiple mid-level analysts. Produce the definitive output: (1) executive summary of all findings, (2) key insights and their implications, (3) prioritized recommendations or next steps, (4) any caveats or areas of uncertainty. Your output is the final deliverable that the user will receive.

## Edge Flow
User Input -> Workers W1-W4 (parallel, each receives one chunk)
W1, W2 -> Analyst A (parallel aggregation)
W3, W4 -> Analyst B (parallel aggregation)
Analyst A, Analyst B -> Synthesizer (final aggregation)
Synthesizer -> Output (sequential)
