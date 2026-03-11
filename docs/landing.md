# Open-Agents — Landing Page Content

> This document serves as the content source for a GitHub Pages landing page or project website.

---

## Hero

### Spawn AI agents in parallel. No API key required.

**Open-Agents** is a multi-agent orchestrator for Claude Code. Run hundreds of AI agents simultaneously from a single CLI — powered by your existing Claude Code subscription.

```bash
oa start && oa run "Build my feature" --model claude/sonnet
```

[Get Started](#getting-started) · [View on GitHub](https://github.com/OpenAEC-Foundation/Open-Agents)

---

## Features

### ⚡ Zero Configuration
No API keys, no cloud setup, no billing surprises. Open-Agents runs directly on your Claude Code subscription. Install and go.

### 🔀 Massive Parallelism
Spawn dozens of agents simultaneously. Each gets its own isolated tmux workspace, CLAUDE.md instructions, and execution context. Watch them all work in real-time.

### 🏗️ Smart Orchestration
Built-in pipeline engine: a Planner analyzes your task, spawns parallel Workers, then a Combiner merges results. One command: `oa pipeline`.

### 👥 Agent Teams
Create teams of agents with shared task lists and inter-agent messaging. Agents coordinate autonomously — no manual routing needed.

### 🛡️ Safe by Default
Proposal mode means agents write changes to a staging area. Review with `oa review`, apply with `oa apply`. Full control, zero risk.

### 📦 1440+ Ready-Made Agents
Choose from 112 categories — code development, AEC (architecture/engineering), data science, DevOps, healthcare, finance, and more. Each template is tuned with the right model, prompt, and tools.

---

## Demo

> *Placeholder: animated GIF showing `oa start` → `oa run` → `oa status` → agent completing a task*

![Open-Agents Demo](assets/demo.gif)

---

## Getting Started

### 1. Install

```bash
# Linux / macOS / WSL2
./install.sh

# Verify
oa doctor
```

### 2. Start a session

```bash
oa start
```

### 3. Run your first agent

```bash
oa run "Write unit tests for auth.py" --model claude/sonnet
```

### 4. Monitor

```bash
oa status          # Table view
oa dashboard       # Interactive TUI
oa web             # React web UI at localhost:5174
```

### 5. Scale up

```bash
# Multi-agent pipeline
oa pipeline "Build a REST API with tests, docs, and Dockerfile"

# Autonomous delegation
oa delegate "Refactor the entire auth module"

# Agent teams
oa team create backend-crew
oa run "Fix database queries" --name db-fixer
oa run "Add caching layer" --name cache-builder
```

---

## Stats

| Metric | Value |
|--------|-------|
| Agent templates | 1440+ |
| Categories | 112 |
| CLI commands | 21+ |
| Skills | 22 |
| Interfaces | 3 (CLI, TUI, Web) |
| Models supported | Claude Opus/Sonnet/Haiku + Ollama |
| License | Apache-2.0 |

---

## Architecture at a Glance

```
You → oa CLI → tmux session → Claude Code agents (parallel)
                  ↕                    ↕
             TUI / Web UI        Agent Teams & Messaging
                  ↕                    ↕
             MCP Server          Pipeline Orchestrator
```

**Tech stack**: Python 3.11+ · tmux · Claude Code CLI · Textual TUI · React 19 · FastMCP

---

## Who Is This For?

- **Solo developers** who want to parallelize coding tasks
- **Engineering teams** building complex features across multiple files
- **AEC professionals** working with Blender, BIM, and IFC tools
- **Researchers** running multi-source analysis and synthesis
- **Anyone** with a Claude Code subscription who wants to do more, faster

---

## Community

- [GitHub Issues](https://github.com/OpenAEC-Foundation/Open-Agents/issues) — Bug reports & feature requests
- [GitHub Discussions](https://github.com/OpenAEC-Foundation/Open-Agents/discussions) — Questions & ideas
- [Contributing Guide](https://github.com/OpenAEC-Foundation/Open-Agents/blob/main/CONTRIBUTING.md) — How to contribute

---

## Organization

**OpenAEC Foundation** — Open-source stewardship
**Impertio Studio B.V.** — Development & operations

---

*Build free. Build together.*
