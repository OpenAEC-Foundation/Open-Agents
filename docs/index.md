# Open-Agents

**Spawn AI agents. Orchestrate anything. Build free.**

Open-Agents is a multi-agent orchestrator for [Claude Code](https://claude.ai/code). With a single CLI command, you can spawn and coordinate hundreds of AI agents in parallel — no API key required, powered by your Claude Code subscription.

---

## Why Open-Agents?

Most AI tools give you one conversation. Open-Agents gives you an army.

Instead of doing everything in a single Claude session, you delegate work to specialized agents that run in parallel tmux windows. While one agent writes tests, another reviews code, and a third generates documentation — all at the same time.

```bash
# Spawn 4 agents in seconds
oa run "Research React 19 new features" --name researcher --model claude/sonnet --direct
oa run "Write unit tests for auth module" --name tester --model claude/sonnet --direct
oa run "Generate OpenAPI docs from bridge.py" --name documenter --model claude/haiku --direct
oa run "Review PR #42 for security issues" --name reviewer --model claude/opus --direct

# See them all running
oa status
```

```
┌─────────────┬────────┬─────────┬──────────────────────────────┐
│ NAME        │ MODEL  │ STATUS  │ TASK                         │
├─────────────┼────────┼─────────┼──────────────────────────────┤
│ researcher  │ sonnet │ running │ Research React 19 new...     │
│ tester      │ sonnet │ running │ Write unit tests for auth... │
│ documenter  │ haiku  │  done   │ Generate OpenAPI docs...     │
│ reviewer    │ opus   │ running │ Review PR #42 for security.. │
└─────────────┴────────┴─────────┴──────────────────────────────┘
```

---

## Key Features

### 1612+ Agent Templates
Over 1612 ready-to-use agent templates across 112 categories — from software development to AEC (Architecture, Engineering & Construction), data analytics, finance, and more. Use them as-is or as a starting point for your own agents.

### No API costs
Open-Agents runs through Claude Code CLI using your existing subscription. There are no per-token API charges. Run 50 agents in parallel — the cost is the same as running one.

### Bidirectional feedback loop
Agents don't just run and disappear. They report back to you (the "meta" orchestrator), ask questions when blocked, and can spawn sub-agents for sub-tasks. You stay in control of complex workflows without micromanaging.

---

## Install in 30 seconds

```bash
# Clone and install
git clone https://github.com/OpenAEC-Foundation/Open-Agents.git
cd Open-Agents
./install.sh

# Start a session
oa start

# Spawn your first agent
oa run "Write a Python web scraper for Hacker News" --model claude/sonnet --direct
```

→ [Full installation guide](getting-started/installation.md)
→ [5-minute quickstart](getting-started/quickstart.md)

---

## Architecture overview

```
┌─────────────────────────────────────────────────────┐
│                    oa CLI (Python)                   │
│  start · run · status · pipeline · delegate · web   │
├──────────┬──────────┬───────────┬───────────────────┤
│  tmux    │ Textual  │ React     │ MCP Server        │
│  session │ TUI      │ Web UI    │ (FastMCP)         │
├──────────┴──────────┴───────────┴───────────────────┤
│              Claude Code CLI (subscription)          │
│         Claude Opus · Sonnet · Haiku · Ollama        │
├─────────────────────────────────────────────────────┤
│  1612+ Agent Templates  │  Skills  │  Guardians      │
└─────────────────────────────────────────────────────┘
```

Each agent is a Claude Code process running in its own tmux window. They can communicate with each other, spawn children, and report results back to you.

---

## Three interfaces

| Interface | Command | Use for |
|-----------|---------|---------|
| **Terminal CLI** | `oa status` | Day-to-day control |
| **TUI Dashboard** | `oa dashboard` | Real-time overview of all agents |
| **React Web UI** | `oa web` | Visual canvas, flow builder |

---

*Built by [OpenAEC Foundation](https://github.com/OpenAEC-Foundation) · [MIT License](https://github.com/OpenAEC-Foundation/Open-Agents/blob/main/LICENSE)*
