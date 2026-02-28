---
id: rule-block
name: Rule Block
type: block
blockType: gate
tags: [canvas, node, policy]
---

# Rule Block

## Description
A conditional rule that attaches to an agent node and enforces a policy during execution. Rules are human-readable conditions with actions: "IF the agent tries to modify files outside /src, THEN block and warn." Rules sit between skills (which are instructions in the system prompt) and hooks (which are infrastructure-level interceptors). Rules are expressed in natural language or simple condition syntax and are injected into the agent's system prompt as behavioral constraints. Unlike hooks, agents are aware of rules and can reason about them.

## Capabilities
- Expresses behavioral constraints in natural language or simple condition-action format
- Injected into the agent's system prompt as explicit constraints (the agent sees and respects them)
- Supports conditions based on: file paths, tool usage, output content, iteration count, token usage
- Multiple rules can be attached to a single agent (composable)
- Rules can be global (apply to all agents) or agent-specific
- Visual rule editor with condition builder and action selector
- Supports severity levels: warn (log but allow), block (prevent action), escalate (notify human)

## Limitations
- Rules are advisory when injected into system prompts — models may not always follow them perfectly
- Complex conditional logic is hard to express in natural language rules
- No runtime evaluation engine — rules are enforced through prompt injection, not code execution
- For hard enforcement, hooks should be used instead of (or in addition to) rules
- Too many rules create a lengthy system prompt that may overwhelm the agent's attention
- Rule conflicts are not automatically detected — contradictory rules may confuse the agent
