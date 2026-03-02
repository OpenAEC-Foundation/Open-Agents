---
id: context-isolation
name: Context Isolation
type: principle
tags: [architecture, context]
---

# Context Isolation

## Description
Agents should not share context windows unless explicitly designed to do so. Each agent operates within its own context window, receiving only the inputs it needs and returning only the outputs that downstream agents require. Shared context is a deliberate architectural choice, not an accident. When agents do share context (e.g., a subagent inheriting its parent's context), this should be a conscious decision documented in the pattern design. The default should be isolation with explicit message passing.

## Rationale
Context isolation prevents several classes of problems. First, it avoids context pollution: when Agent A's irrelevant information leaks into Agent B's context, it degrades Agent B's performance by wasting context window space and potentially confusing the model. Second, it enables security boundaries: sensitive information processed by one agent does not automatically become available to all other agents. Third, it forces clean interface design: when agents must explicitly pass messages, the interface contracts are clear and testable. Fourth, it enables heterogeneous deployment: isolated agents can run on different models, different providers, or different machines without shared-memory assumptions.

## Examples
- Good: Agent A produces a summary and passes only the summary to Agent B. Agent B never sees Agent A's raw input. This keeps Agent B's context clean and focused.
- Good: A security-sensitive agent processes PII data and returns only anonymized results to downstream agents. The PII never leaves the secure agent's context.
- Bad: All agents in a pipeline share a global context object that accumulates all intermediate results. By the time the last agent runs, its context is full of irrelevant data from earlier stages.
