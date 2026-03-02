---
id: skill-badge
name: Skill Badge
type: block
blockType: agent
tags: [canvas, node, attachment]
---

# Skill Badge

## Description
A skill attachment that adds specialized capability to an agent node. Skills are reusable instruction sets (markdown files) that get injected into an agent's context when triggered. A skill badge appears as a visual badge on the agent node, indicating which skills the agent has access to. Skills are one of the six layers in the agent identity stack (CLAUDE.md, skills, rules, MCP, hooks, tools). They represent learned procedures — "how to do X" — that augment the agent's base capability without changing its core identity.

## Capabilities
- Attaches to any agent node as a visual badge overlay
- Injects skill-specific instructions into the agent's system prompt at runtime
- Supports trigger conditions — skills can activate based on task type, keywords, or explicit invocation
- Multiple skills can be attached to a single agent (composable)
- Skills are reusable — the same skill badge can be attached to multiple agent nodes
- Drag-and-drop attachment on the canvas
- Skills can include examples, templates, and step-by-step procedures

## Limitations
- Consumes context window space — too many active skills dilute the agent's focus
- Skills are static text — they do not execute code or provide tools (use connectors for tools)
- No prioritization between skills — if two skills give conflicting instructions, the agent must resolve the conflict
- Skills do not have their own model or execution context — they augment the parent agent only
- Cannot be used standalone — must be attached to an agent node
- Skill quality depends entirely on the skill author — poorly written skills degrade agent performance
