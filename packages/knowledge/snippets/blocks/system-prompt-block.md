---
id: system-prompt-block
name: System Prompt Block
type: block
blockType: agent
tags: [canvas, node, configuration]
---

# System Prompt Block

## Description
The system prompt configuration block for an agent node. Contains the agent's core identity: who it is, what it does, how it should behave, and what constraints it operates under. The system prompt is the most important piece of agent configuration — it shapes every response the agent produces. This block provides a visual editor for composing, previewing, and versioning system prompts. It corresponds to the CLAUDE.md layer in the agent identity stack and is the first thing injected into the agent's context window at runtime.

## Capabilities
- Rich text editor for composing system prompts with markdown support
- Template variables that are resolved at runtime (e.g., {task_description}, {current_date}, {agent_name})
- Version history — tracks changes to the system prompt over time with diff view
- Token count display — shows how many tokens the system prompt consumes
- Preview mode — shows the fully resolved prompt as the agent will see it at runtime
- Supports importing prompts from a shared prompt library
- Can reference external files (skill files, rule files) that get composed into the final prompt

## Limitations
- Must fit within the assigned model's system prompt allowance (varies by provider)
- Long system prompts reduce the available context window for the actual task
- Prompt quality is the user's responsibility — the block provides tools, not intelligence
- Cannot enforce that the agent follows the system prompt (models may deviate under complex conditions)
- Template variables must be defined and provided by the orchestration context at runtime
- No built-in prompt optimization — the user must manually optimize for token efficiency
