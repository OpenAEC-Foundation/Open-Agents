---
id: agent-node
name: Agent Node
type: block
blockType: agent
tags: [canvas, node, core]
---

# Agent Node

## Description
The primary building block on the Open-Agents canvas. An agent node represents a top-level autonomous agent with its own identity, system prompt, model assignment, tool permissions, and context window. Agent nodes are the "first-class citizens" of the canvas: they can be connected to other nodes via edges, configured with skills, rules, and hooks, and assigned to orchestration patterns. Each agent node corresponds to a single Claude Code agent (or equivalent from another provider) at runtime. The agent node is the container that holds all configuration for one agent instance.

## Capabilities
- Holds a complete agent configuration: model ID, system prompt, tools, skills, rules, hooks
- Can be connected to other agent nodes via directional edges (sequential, parallel, conditional)
- Supports drag-and-drop configuration of child blocks (skills, tools, hooks, rules)
- Displays real-time execution status (idle, running, completed, failed) during orchestration
- Can be assigned to any role in any routing pattern (worker, reviewer, dispatcher, aggregator)
- Supports model routing — the model can be changed without affecting the rest of the configuration
- Exposes input/output ports for edge connections

## Limitations
- One agent node = one context window. Cannot share context with other agent nodes unless explicitly connected via edges
- Cannot run without a model assignment — a model ID must be configured
- Maximum system prompt length is bounded by the assigned model's context window
- Cannot directly invoke other agent nodes — all communication flows through edges managed by the orchestrator
- Does not persist state between orchestration runs unless connected to an external storage connector
