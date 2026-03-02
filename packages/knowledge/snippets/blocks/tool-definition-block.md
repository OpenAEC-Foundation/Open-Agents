---
id: tool-definition-block
name: Tool Definition Block
type: block
blockType: agent
tags: [canvas, node, configuration]
---

# Tool Definition Block

## Description
The tool selection and configuration block for an agent node. Defines which tools the agent is allowed to use at runtime. Tools are the agent's hands — they enable the agent to interact with the world beyond pure text generation. The tool definition block provides a visual interface for selecting from available tools (Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch) and configuring per-tool settings such as path restrictions, command allowlists, and domain filters. This block implements the principle of least privilege: agents should only have the tools they need.

## Capabilities
- Visual checklist of all available tools with enable/disable toggles
- Per-tool configuration: path restrictions for file tools, command allowlists for Bash, domain filters for web tools
- Tool presets — predefined combinations for common roles (reader: Read+Grep+Glob, writer: Read+Write+Edit+Bash, researcher: Read+WebSearch+WebFetch)
- Shows tool usage statistics from previous runs (which tools the agent actually used)
- Permission inheritance rules when used with subagent nodes (subagent cannot exceed parent's permissions)
- Supports MCP tools from connected connector nodes alongside built-in tools
- Warning indicators when an agent has tools that seem unnecessary or is missing tools it likely needs

## Limitations
- Cannot add custom tools beyond the built-in set and MCP-provided tools
- Tool restrictions are advisory — they configure what the model is offered, but clever prompts might work around restrictions
- Complex Bash command restrictions are hard to define comprehensively (allowlist vs blocklist tradeoff)
- No runtime tool permission changes — tools are fixed for the duration of an agent's execution
- MCP tool availability depends on connector node health — if a connector is down, its tools are unavailable
- Tool configuration does not include usage quotas (cannot limit "max 5 file writes per execution")
