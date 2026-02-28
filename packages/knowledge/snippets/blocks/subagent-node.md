---
id: subagent-node
name: Subagent Node
type: block
blockType: agent
tags: [canvas, node, core]
---

# Subagent Node

## Description
A child agent that operates within the scope of a parent agent node. Subagents have their own context window but inherit certain configuration from their parent: base system prompt extensions, tool permissions (can be restricted but not expanded beyond parent), and model constraints. The parent agent can spawn subagents at runtime to handle subtasks, and subagent results are returned directly to the parent's context. This maps to Claude Code's subagent model where a main agent delegates specific tasks to child agents that run in isolated contexts but report back.

## Capabilities
- Operates in its own isolated context window (does not consume parent's context)
- Inherits parent's tool permissions as a maximum scope (parent can restrict further)
- Can receive specific instructions and context from the parent agent
- Returns results directly to the parent's context when complete
- Can use a different (typically cheaper) model than the parent for cost optimization
- Supports timeout configuration — parent can set time/token limits on subagent execution
- Multiple subagents can run in parallel under the same parent

## Limitations
- Cannot communicate with other subagents directly — all communication goes through the parent
- Cannot exceed the parent's tool permissions (can only use a subset)
- Lifetime is bounded by the parent's execution — when the parent completes, subagents are terminated
- Cannot access the parent's full context window — only receives explicitly passed context
- Does not appear as a top-level node on the canvas — visually nested within the parent agent node
- Cannot spawn its own subagents (single level of nesting to prevent complexity explosion)
