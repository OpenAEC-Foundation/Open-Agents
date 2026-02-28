---
id: fail-gracefully
name: Fail Gracefully
type: principle
tags: [resilience, error-handling]
---

# Fail Gracefully

## Description
Agents should handle errors, recognize when they are stuck, and escalate appropriately rather than producing low-quality output silently. Graceful failure means: (1) detecting that something went wrong (tool errors, model confusion, confidence below threshold), (2) reporting the failure with useful context (what was attempted, what went wrong, what was the state), (3) either retrying with a different approach, escalating to a more capable agent, or returning a partial result with clear caveats. The worst failure mode is silent: an agent confidently returns incorrect results with no indication of problems.

## Rationale
In multi-agent systems, failures propagate through the pipeline. An agent that silently produces bad output will cause all downstream agents to produce bad output too — a cascade failure that is extremely hard to debug. By contrast, an agent that fails explicitly allows the orchestrator to take corrective action: retry, escalate, route to a different specialist, or inform the user. Graceful failure is especially important in iterative patterns (loops, spirals) where a single bad iteration can corrupt the entire refinement process. Building failure awareness into every agent creates a self-healing system that degrades gracefully under pressure rather than collapsing.

## Examples
- Good: An agent attempts to parse a complex JSON structure. When parsing fails, it returns a structured error with the specific parse failure location and the raw input, allowing the orchestrator to route to a more capable parser or ask the user for clarification.
- Good: A code generation agent includes confidence self-assessment. When confidence is below 0.7, it flags the output for human review rather than silently shipping potentially buggy code.
- Bad: An agent encounters an API error, catches the exception silently, and returns an empty result as if everything worked. Downstream agents process the empty result and produce nonsensical output.
