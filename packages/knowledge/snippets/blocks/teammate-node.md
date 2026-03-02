---
id: teammate-node
name: Teammate Node
type: block
blockType: agent
tags: [canvas, node, core]
---

# Teammate Node

## Description
A peer agent that communicates with other agents via mailbox-style asynchronous messaging. Unlike subagents that have a parent-child relationship, teammates are equals — no hierarchy, no shared context, no permission inheritance. Each teammate has its own independent configuration and communicates through explicit message passing. This maps to Claude Code's multi-agent "teammate" model where agents collaborate on shared objectives without one controlling the others. Teammates can send messages to specific other teammates, broadcast to all, or post to a shared message board.

## Capabilities
- Fully independent agent with its own model, tools, system prompt, and context window
- Asynchronous mailbox messaging — can send and receive structured messages to/from other teammates
- Can operate on shared file system resources (reading/writing files that other teammates also access)
- Supports named channels for organized communication (e.g., "code-review", "status-update")
- Can be configured with awareness of other teammates' roles for targeted communication
- Runs independently and concurrently with other teammates
- Can join or leave a team dynamically during orchestration

## Limitations
- No shared context window — must communicate everything through explicit messages
- No guaranteed message ordering between teammates (asynchronous)
- Potential for conflicting file modifications when multiple teammates write to the same files
- Higher coordination overhead compared to subagents (no automatic result collection)
- Requires careful design of message protocols to avoid deadlocks or missing messages
- Cannot directly invoke another teammate's tools — can only request action via messages
