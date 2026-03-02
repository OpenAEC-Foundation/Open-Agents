---
id: mcp-server-block
name: MCP Server Block
type: block
blockType: connector
tags: [canvas, node, integration]
---

# MCP Server Block

## Description
Defines an MCP (Model Context Protocol) server configuration that can be attached to connector nodes. The MCP server block specifies the server's transport (stdio, HTTP/SSE), command or URL, arguments, environment variables, and authentication credentials. This block is the configuration layer for external integrations: databases (PostgreSQL, SQLite), file systems, cloud APIs (GitHub, Slack, Jira), and custom services. Multiple connector nodes can reference the same MCP server block, enabling server reuse across the canvas.

## Capabilities
- Supports both stdio transport (local process) and HTTP/SSE transport (remote server)
- Configurable command, arguments, and environment variables for stdio servers
- URL and authentication configuration for HTTP/SSE servers
- Auto-discovers available tools from the MCP server on connection
- Displays tool catalog with descriptions and parameter schemas
- Supports environment variable references for sensitive values (${API_KEY} syntax)
- Connection health monitoring with auto-reconnect on transient failures
- Can be shared across multiple connector nodes (server pooling)

## Limitations
- MCP server must be installed and accessible from the runtime environment
- Stdio servers run as local processes — resource consumption scales with the number of instances
- HTTP/SSE servers require network access — firewall and proxy configurations may be needed
- Tool availability depends on the MCP server's implementation — not all tools may be relevant
- Authentication token refresh is not handled automatically — expired tokens cause connection failures
- Cannot modify the MCP server's behavior — only configures connection parameters
- Environment variables must be provided at deployment time — cannot be set from the canvas UI at runtime
