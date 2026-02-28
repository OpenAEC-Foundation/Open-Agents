---
id: connector-node
name: Connector Node
type: block
blockType: connector
tags: [canvas, node, core]
---

# Connector Node

## Description
Represents a connection to an external service via MCP (Model Context Protocol). A connector node bridges the agent canvas with the outside world: databases, APIs, file systems, cloud services, and any system that exposes an MCP interface. Connectors are not agents themselves — they do not have models or system prompts. Instead, they provide tools that agents can use. When an agent node is connected to a connector node, the agent gains access to the connector's tools in addition to its built-in tools.

## Capabilities
- Connects to any MCP-compatible server (local or remote)
- Exposes MCP tools to connected agent nodes
- Supports authentication configuration (API keys, OAuth tokens, certificates)
- Can be shared across multiple agent nodes (one database connector used by many agents)
- Provides health monitoring — displays connection status (connected, disconnected, error)
- Supports tool filtering — an agent can be configured to use only a subset of a connector's tools
- Hot-reloadable — connector configuration can be changed without restarting the orchestration

## Limitations
- Depends on the external MCP server being available and responsive
- Cannot process or transform data itself — only provides the transport and tool interface
- Authentication credentials must be securely managed (never stored in plaintext on the canvas)
- Network latency to external services adds to overall execution time
- Tool schemas are defined by the MCP server — the connector cannot modify them
- One connector node per MCP server — cannot multiplex multiple servers through a single connector
