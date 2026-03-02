---
id: atomicity
name: Atomicity
type: principle
tags: [design, modularity]
---

# Atomicity

## Description
Each agent should do one thing well. An atomic agent has a single, clearly defined responsibility. It receives a well-defined input, performs one transformation or analysis, and produces a well-defined output. Atomic agents are composable: they can be combined into complex workflows without internal coupling. The opposite of atomicity is the "god agent" — one agent with a massive system prompt trying to do everything. Atomic agents are easier to test, debug, replace, and reason about.

## Rationale
Atomic agents produce more reliable results because their scope is manageable. When an agent tries to do too many things, it suffers from context dilution: critical instructions get lost in a sea of other instructions. Atomic agents also enable better model routing — a simple, focused task can often be handled by a cheaper model, while a complex multi-concern task requires a premium model even if most of its subtasks are simple. Finally, atomic agents are reusable: an agent that "validates JSON schema" can be used in many different workflows, while an agent that "validates JSON schema and also sends emails and also updates the database" cannot.

## Examples
- Good: An agent that reviews code for security vulnerabilities. Another agent that reviews code for performance. A third that reviews for style. These can be composed into a parallel review pipeline.
- Good: An agent that translates English to Dutch. It does one thing. It can be placed in any pipeline that needs translation.
- Bad: An agent that "plans the project, writes the code, reviews it, writes tests, and deploys." This agent's system prompt will be enormous and its context window will be overwhelmed.
