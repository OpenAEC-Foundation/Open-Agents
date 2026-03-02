---
id: aggregator-node
name: Aggregator Node
type: block
blockType: aggregator
tags: [canvas, node, core]
---

# Aggregator Node

## Description
A convergence node that collects outputs from multiple upstream agents and combines them into a single unified result. The aggregator is the counterpart of the dispatcher: where a dispatcher fans out, the aggregator fans in. It waits for all (or a configurable subset of) upstream agents to complete, then processes their combined outputs. Aggregation can range from simple concatenation to intelligent synthesis that resolves conflicts, deduplicates findings, and produces a coherent narrative from disparate inputs.

## Capabilities
- Collects outputs from multiple upstream agent nodes (fan-in)
- Configurable completion policy: wait for all, wait for majority, wait for first N, or timeout
- Supports multiple aggregation strategies: concatenate, merge, synthesize, vote, rank
- Can weight inputs differently based on source agent confidence or priority
- Resolves conflicts between upstream outputs when they disagree
- Produces a single unified output from multiple inputs
- Provides provenance tracking — which upstream agent contributed which part of the output

## Limitations
- Must wait for upstream agents to complete before processing (introduces latency)
- Quality depends heavily on the aggregation strategy — poor strategies lose important information
- Cannot handle upstream agents that produce incompatible output formats without transformation
- Memory pressure when many upstream agents produce large outputs simultaneously
- Cannot request additional information from upstream agents — works only with what it receives
- Increasing number of upstream sources increases the context window requirements for synthesis
