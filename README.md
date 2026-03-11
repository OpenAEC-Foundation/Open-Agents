[![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=20&pause=1000&color=D97706&width=600&lines=Spawn+AI+agents+in+parallel;No+API+key+required;Works+with+Claude+Code+subscription)](https://git.io/typing-svg)

# Open-Agents

![version](https://img.shields.io/badge/version-v0.3.0-D97706?style=flat-square)
![python](https://img.shields.io/badge/python-3.11+-blue?style=flat-square&logo=python)
![license](https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square)
![agents](https://img.shields.io/badge/agents-1440%2B-EA580C?style=flat-square)
![platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20WSL2-lightgrey?style=flat-square)

**Multi-agent orchestrator for Claude Code.** Spawn and coordinate hundreds of AI agents in parallel via a single CLI — no API key required, powered by your Claude Code subscription. Ideal for developers, teams, and anyone who wants to multiply their AI coding capacity.

---

## Features

- ⚡ **Zero API key setup** — runs directly on your Claude Code subscription
- 🔀 **Parallel agent execution** — spawn multiple agents simultaneously, each in its own tmux window
- 🏗️ **Pipeline orchestration** — automatic Planner → parallel Workers → Combiner flow
- 🤖 **Delegate mode** — spawn an orchestrator that autonomously manages its own workers
- 👥 **Agent Teams** — shared task lists, inter-agent messaging, coordinated workflows
- 🛡️ **Proposal mode** — agents write proposals; you review and apply with `oa apply`
- 🖥️ **Three interfaces** — Terminal CLI, Textual TUI dashboard, React web UI
- 📦 **1440+ agent templates** — 112 categories from code-dev to AEC to healthcare
- 🔌 **MCP Server** — integrate with any MCP-compatible client
- 🧬 **Nested spawning** — agents create child agents with parent/child hierarchy
- 🏥 **Guardian agents** — automatic reflexes on session end (lessons, roadmap, handoff)
- 🌐 **Multi-model** — Claude Opus/Sonnet/Haiku + local Ollama models

---

## Quick Start

```bash
# 1. Install
./install.sh            # Linux / macOS / WSL2

# 2. Start a session
oa start

# 3. Spawn your first agent
oa run "Write a Python function that validates email addresses" --model claude/sonnet

# 4. Check status
oa status
```

---

## Architecture

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
│  1440+ Agent Templates  │  22 Skills  │  Guardians  │
│  112 categories          │  7 domains  │  auto-run   │
└─────────────────────────────────────────────────────┘
```

---

## Commands

| Command | Description |
|---------|-------------|
| `oa start` | Start tmux session |
| `oa run "<task>"` | Spawn an agent |
| `oa status` | Show all agents |
| `oa watch <name>` | Stream live output |
| `oa collect <name>` | Get completed output |
| `oa pipeline "<task>"` | Multi-agent pipeline (Planner → Workers → Combiner) |
| `oa delegate "<task>"` | Autonomous orchestrator agent |
| `oa dashboard` | Textual TUI dashboard |
| `oa web` | React web UI at localhost:5174 |
| `oa team create <n>` | Create agent team |
| `oa send <agent> "msg"` | Inter-agent messaging |
| `oa kill <name>` | Stop an agent |
| `oa clean` | Remove completed workspaces |

### `oa run` Options

| Option | Description |
|--------|-------------|
| `--name NAME` | Agent name (auto-generated if omitted) |
| `--model MODEL` | `claude/opus`, `claude/sonnet`, `claude/haiku`, `ollama/<model>` |
| `--parent NAME` | Parent agent for nested hierarchies |
| `--direct` | Write directly to codebase (skip proposals) |
| `--workspace DIR` | Use existing workspace |
| `--prompt-file FILE` | Read task from file (avoids shell escaping issues) |

### Multi-line Prompts & Special Characters

When your prompt contains single quotes, backticks, `$variables`, or spans multiple lines, use `--prompt-file` to avoid shell parsing issues:

```bash
# Write your prompt to a file
cat > /tmp/task.txt << 'EOF'
Refactor the `parse_user()` function in src/utils.py.
It's broken when input contains $special chars or it's > 100 chars.
EOF

oa run --prompt-file /tmp/task.txt --model claude/sonnet
```

Or use a heredoc variable:
```bash
PROMPT=$(cat << 'EOF'
Your multi-line prompt with 'quotes', `backticks`, and $variables here.
EOF
)
oa run "$PROMPT" --model claude/sonnet
```

---

## Pipeline Orchestration

```bash
oa pipeline "Build a CSV validator library with tests and README"
```

```
Planner (5 min) → plan.json → Subtask agents (parallel, 30 min each) → Combiner (10 min) → result.md
```

---

## Agent Library

**1440+ templates** across **112 categories**, including:

| Domain | Categories | Examples |
|--------|-----------|----------|
| **Development** | code-dev, frontend, backend, testing, devops | Find bugs, generate tests, review code |
| **AEC** | blender, bonsai, ifcopenshell, sverchok | 3D modeling, BIM authoring, IFC processing |
| **Data** | analytics, data-pipeline, ml-ops, database | Transform, visualize, validate |
| **Business** | finance, legal, marketing, hr, logistics | Compliance, content, operations |
| **Infrastructure** | cloud, security, monitoring, iot | Deploy, audit, observe |

---

## Installation

### Linux / macOS / WSL2

```bash
./install.sh
```

### Verify

```bash
oa version
oa doctor     # Check all dependencies
```

### Requirements

| Dependency | Version |
|------------|---------|
| Python | >= 3.11 |
| tmux | any recent |
| Claude Code CLI | latest (active subscription) |

> **Windows**: Use WSL2. Native Windows is not supported.

---

## Visual Canvas (Advanced)

Drag-and-drop React Flow canvas for building complex agent workflows:

```bash
pnpm install && pnpm dev    # localhost:5173
```

160+ pre-built agents, flow + pool patterns, assembly engine (NL → agent graph), safety & audit, multi-provider support.

---

## Contributing

Contributions welcome! Open an issue or submit a PR.

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Organization

| Entity | Role |
|--------|------|
| **OpenAEC Foundation** | Open-source stewardship |
| **Impertio Studio B.V.** | Development & operations |

## License

[Apache-2.0](LICENSE)

---

*Build free. Build together.*
