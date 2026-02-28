---
id: observe-before-act
name: Observe Before Act
type: principle
tags: [safety, methodology]
---

# Observe Before Act

## Description
Read and understand before making changes. Every agent that modifies state (writes files, runs commands, updates databases, sends messages) should first observe the current state of the system. This means reading existing files before editing them, understanding the codebase structure before adding new code, and verifying assumptions before acting on them. The observe-then-act sequence prevents blind modifications that conflict with existing work, violate established patterns, or break working functionality.

## Rationale
Agents that act without observing are the most common source of bugs in agentic workflows. Common failures: overwriting a file without reading it first (destroying existing content), adding code that duplicates existing functionality (because the agent did not check), making changes that violate the project's conventions (because the agent did not observe the patterns in use). The observation phase is cheap — reading files and running searches costs far fewer tokens than fixing the damage from blind modifications. This principle also applies to multi-agent systems: before an agent modifies a shared resource, it should verify that no other agent has modified it since the plan was created.

## Examples
- Good: Before editing a file, the agent reads the entire file (or at least the surrounding context), understands its structure, identifies the right location for the change, and then makes a minimal, targeted edit.
- Good: Before implementing a new feature, the agent searches the codebase for existing implementations of similar features, understands the patterns in use, and follows them.
- Bad: An agent receives "add a login endpoint" and immediately writes a new file without checking if a login endpoint already exists, what framework the project uses, or what the existing endpoint patterns look like.
