---
id: hook-block
name: Hook Block
type: block
blockType: gate
tags: [canvas, node, lifecycle]
---

# Hook Block

## Description
A lifecycle hook that executes at specific points during an agent's execution. Hooks intercept the agent's execution flow at defined moments (PreToolUse, PostToolUse, PreMessage, PostMessage) and can inspect, modify, or block the action. Hooks are the enforcement mechanism for policies that cannot be expressed through system prompts alone — they operate at the infrastructure level, not the instruction level. A hook can prevent an agent from writing to certain directories, log all tool usage for audit, or inject additional context before specific tool calls.

## Capabilities
- Supports four lifecycle events: PreToolUse (before a tool is called), PostToolUse (after a tool returns), PreMessage (before the agent produces a response), PostMessage (after the agent's response)
- Can inspect the action payload (tool name, arguments, response) and make allow/deny/modify decisions
- Runs outside the agent's context window — the agent does not know hooks exist
- Supports shell command hooks (run a script) and inline condition hooks (pattern matching)
- Multiple hooks can be attached to the same event (executed in order)
- Provides logging and audit trail of all hook executions
- Can modify tool arguments or responses before they reach the agent (transformation hooks)

## Limitations
- Hooks add latency to every intercepted event — keep hook logic lightweight
- Complex hook conditions are hard to debug (they operate outside the agent's visible context)
- PreToolUse deny actions may confuse the agent (the tool is available but mysteriously fails)
- Cannot access the agent's internal reasoning — can only inspect external actions (tool calls, messages)
- Hook errors can break the entire agent execution if not handled gracefully
- Shell command hooks depend on the runtime environment — portability concerns across different deployment targets
