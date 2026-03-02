---
id: fan-in
name: Fan-In
type: pattern
category: parallel
tags: [aggregation, convergence, synthesis, many-to-one]
minNodes: 3
maxNodes: 10
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 2000
  costMultiplier: 2.0
---

# Fan-In

## Description
Multiple independent inputs or work streams converge into a single aggregator agent that synthesizes them into one unified output. This is the complement of fan-out: where fan-out distributes one input to many workers, fan-in collects many outputs into one result. The aggregator must understand the relationships between inputs, resolve conflicts, eliminate redundancy, and produce a coherent whole. The input sources may be other agents, external data feeds, user inputs, or any combination. The key challenge is in the aggregation logic — naive concatenation is not fan-in; true fan-in requires intelligent synthesis.

## Diagram
```
[Source 1] \
[Source 2]  --> [Aggregator] --> [Unified Output]
[Source 3] /
```

## When to Use
- Multiple independent analyses of the same subject need to be combined
- You are collecting results from a previous fan-out or parallel execution phase
- Different data sources or perspectives need to be synthesized into one view
- You want a single coherent output from multiple contributors
- Cross-referencing multiple inputs adds value beyond what any single input provides

## Anti-Patterns
- Do not use when inputs are truly independent and do not benefit from aggregation (just return them separately)
- Avoid when the aggregation is trivially simple (mere concatenation does not justify a separate agent)
- Not suitable when the aggregator would need to re-process all original data to do its job (information loss)
- Do not use when inputs arrive at very different times and freshness matters (stale data problem)

## Node Templates

### Source Agents (S1-SN)
- **Role**: Each source produces an independent output — whether from data analysis, research, computation, or external data retrieval. Sources may be heterogeneous (different models, different tools, different specializations) or homogeneous (same processing on different data).
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob, WebSearch]
- **Prompt Template**: You are a specialist data source. Produce your analysis or output as a structured document. Include: (1) your source identifier, (2) key findings in a consistent format, (3) confidence level for each finding, (4) any caveats or limitations. Your output will be combined with other sources by a downstream aggregator.

### Aggregator
- **Role**: Receives all source outputs and produces a single unified result. Performs intelligent synthesis: identifies common themes, resolves contradictions, ranks findings by confidence, fills gaps where sources complement each other, and produces a coherent narrative or structured output that represents the best understanding from all sources combined.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit]
- **Prompt Template**: You are a synthesis specialist. You will receive outputs from N independent sources. Your job: (1) identify common findings across sources (higher confidence when multiple sources agree), (2) resolve any contradictions (explain which source is more reliable and why), (3) identify unique insights from individual sources, (4) produce a unified output that is more valuable than any individual source. Structure your output clearly with provenance tracking (which source contributed which insight).

## Edge Flow
Source 1 -> Aggregator (converge)
Source 2 -> Aggregator (converge)
Source 3 -> Aggregator (converge)
Aggregator -> Unified Output (sequential)
