<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f0400,25:7c2d12,55:b45309,80:EA580C,100:f97316&height=280&section=header&text=Open-Agents&fontSize=85&fontColor=ffffff&fontAlignY=38&animation=fadeIn&desc=Spawn%20AI%20agents.%20Orchestrate%20anything.%20Build%20free.&descAlignY=56&descSize=22&descFontColor=ffffff" width="100%"/>

<img src="https://raw.githubusercontent.com/OpenAEC-Foundation/Open-Agents/main/docs/assets/oa-logo-horizontal.svg" alt="Open-Agents logo" width="420"/>

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1200&color=D97706&center=true&vCenter=true&width=720&height=60&lines=Agents+that+spawn+agents+that+spawn+agents.;One+root.+Infinite+trees.;Orchestrate+self-evolving+agent+hierarchies.;Agents+call+each+other+%E2%80%94+you+just+set+the+root.;No+API+key.+Powered+by+your+Claude+subscription.;1612%2B+agent+templates.+112+categories.;Open-source.+Zero+lock-in.+Built+free." alt="Typing animation"/>

<br/><br/>

[![version](https://img.shields.io/badge/version-v0.3.1-D97706?style=for-the-badge)](https://github.com/OpenAEC-Foundation/Open-Agents/releases)
[![agents](https://img.shields.io/badge/agents-1612%2B-16A34A?style=for-the-badge)](https://github.com/OpenAEC-Foundation/Open-Agents/tree/main/agents/library)
[![python](https://img.shields.io/badge/python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![license](https://img.shields.io/badge/license-MIT-D97706?style=for-the-badge)](LICENSE)
[![OpenAEC](https://img.shields.io/badge/OpenAEC-Foundation-EA580C?style=for-the-badge)](https://github.com/OpenAEC-Foundation)

<br/><br/>

<img src="https://img.shields.io/badge/1612%2B-Agent%20Templates-D97706?style=for-the-badge" alt="1612+ Agent Templates"/>
<img src="https://img.shields.io/badge/150%2B-Skills-EA580C?style=for-the-badge" alt="150+ Skills"/>
<img src="https://img.shields.io/badge/112-Categories-EA580C?style=for-the-badge" alt="112 Categories"/>
<img src="https://img.shields.io/badge/21%2B-CLI%20Commands-D97706?style=for-the-badge" alt="21+ CLI Commands"/>
<img src="https://img.shields.io/badge/Zero-API%20Costs-16A34A?style=for-the-badge" alt="Zero API Costs"/>

</div>

**Multi-agent orchestrator for Claude Code.** Spawn and coordinate hundreds of AI agents in parallel via a single CLI — no API key required, powered by your Claude Code subscription. Ideal for developers, teams, and anyone who wants to multiply their AI coding capacity.

---

## Demo

```bash
# Spawn 4 parallel agents in seconds
oa run "Research React 19 new features" --name researcher --model claude/sonnet --direct
oa run "Write unit tests for auth module" --name tester --model claude/sonnet --direct
oa run "Generate OpenAPI docs from bridge.py" --name documenter --model claude/haiku --direct
oa run "Review PR #42 for security issues" --name reviewer --model claude/opus --direct

# Watch them work
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

## Features

| | |
|---|---|
| 🤖 **1612+ Agent Templates** | 112 categories from code-dev to AEC to healthcare |
| ⚡ **Parallel Execution** | Spawn hundreds of agents simultaneously in tmux |
| 🔄 **Bidirectional Feedback Loop** | Agents report back; orchestrator iterates |
| 🐳 **Pipeline Orchestration** | Planner → parallel Workers → Combiner, automated |
| 📊 **Three Interfaces** | Terminal CLI, Textual TUI dashboard, React web UI |
| 🔌 **MCP + Agent Messaging** | Integrate with any MCP client; inter-agent DMs |
| 🧬 **Nested Spawning** | Agents create child agents up to 6 levels deep |
| 🌐 **Multi-model** | Claude Opus / Sonnet / Haiku + local Ollama models |

---

## Quick Start

```bash
# Install
./install.sh            # Linux / macOS / WSL2

# Start a session
oa start

# Spawn your first agent
oa run "Write a Python web scraper" --model claude/sonnet --direct

# Check status
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
│  1612+ Agent Templates  │  22 Skills  │  Guardians  │
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

**1612+ templates** across **112 categories**, including:

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
| Python | >= 3.10 |
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

[MIT](LICENSE)

---

<div align="center">

*Build free. Build together.*

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:f97316,25:EA580C,55:b45309,80:7c2d12,100:0f0400&height=120&section=footer" width="100%"/>

</div>
