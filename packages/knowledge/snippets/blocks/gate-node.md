---
id: gate-node
name: Gate Node
type: block
blockType: gate
tags: [canvas, node, core]
---

# Gate Node

## Description
A quality checkpoint that evaluates the output of an upstream agent against defined criteria before allowing it to proceed downstream. Gates are the traffic lights of agent pipelines: green (pass) lets the output through, red (fail) blocks it and triggers a revision or escalation path. Gates are intentionally lightweight — they evaluate, they do not produce new content. This separation of concerns keeps evaluation objective and independent from production. Gates can check for completeness, correctness, format compliance, security issues, or any custom criteria.

## Capabilities
- Evaluates upstream output against configurable pass/fail criteria
- Produces structured verdicts with per-criterion pass/fail and reasoning
- Supports three actions on failure: revise (send back to producer), escalate (send to a more capable agent), halt (stop the pipeline)
- Can enforce maximum retry counts to prevent infinite revision loops
- Lightweight execution — uses a cheap model since evaluation is simpler than production
- Provides an audit trail of all gate evaluations for debugging and compliance
- Configurable strictness levels (strict, moderate, lenient) that affect pass thresholds

## Limitations
- Can only evaluate what is explicitly defined in its criteria — cannot catch issues outside its scope
- Quality of evaluation depends on the gate's model and prompt — a weak gate provides false confidence
- Adds latency to every pipeline execution, even when quality is high
- Cannot fix issues itself — can only flag them and route to revision
- Criteria must be defined in advance — gates do not adapt their evaluation criteria at runtime
- Risk of being either too strict (nothing passes) or too lenient (everything passes) without careful calibration
