# Open-Agents

Multi-agent orchestrator for Claude Code. Spawn and coordinate multiple AI agents in parallel via the `oa` CLI — no API key required, uses your Claude Code subscription directly.

## What is Open-Agents?

**`oa`** is the primary tool: a tmux-based CLI that lets you spawn, monitor, and orchestrate multiple Claude Code agents in parallel. Each agent gets its own isolated workspace, CLAUDE.md instructions, and tmux window. Interact via the terminal, a Textual TUI dashboard, or a local React web UI.

**Visual Canvas** (`packages/`) is the advanced option: a drag-and-drop canvas (React Flow) for building complex agent workflows with a Node.js backend, assembly engine, and 160+ pre-built library agents (including 73 AEC domain agents).

---

## Requirements

| Dependency | Version | Notes |
|------------|---------|-------|
| Python | >= 3.11 | Required |
| tmux | any recent | Linux / macOS only |
| [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | latest | Active subscription required |
| Node.js | >= 20 | Visual Canvas only |
| pnpm | >= 9 | Visual Canvas only |

> **Windows**: Use WSL2. Native Windows is not supported (tmux requirement).

---

## Installation

### Linux / macOS

```bash
./install.sh
```

### Windows

```powershell
.\install.ps1
```

The installer checks for Python 3.10+, Node.js, tmux, and Claude Code CLI, installs missing dependencies, and builds the web UI automatically.

Verify the installation:

```bash
oa version
```

---

## Quick Start

```bash
# 1. Start the oa session
oa start

# 2. Spawn an agent with a task
oa run "Write a Python function that validates email addresses" --model claude/sonnet

# 3. Check status
oa status

# 4. View live output
oa watch <agent-name>

# 5. Run a multi-agent pipeline
oa pipeline "Build a CSV validator library with tests and README"

# 6. Open the interactive TUI dashboard
oa dashboard

# 7. Create an agent team for collaborative work
oa team create my-project
oa run "Refactor authentication module" --name auth-worker

# 8. Open the web UI for visual monitoring
oa web
```

---

## Features

- **Zero API key setup** — runs directly on your Claude Code subscription
- **Parallel agent execution** — spawn multiple Claude Code agents simultaneously, each isolated in its own tmux window and workspace
- **Nested spawning** — agents can create their own child agents with parent/child relationships and duplicate task prevention
- **Proposal mode** — agents write proposals instead of modifying files directly; you review and apply with `oa apply`
- **Pipeline orchestration** — automatic Planner → parallel Workers → Combiner flow for complex tasks
- **Delegate mode** — spawn an orchestrator agent that autonomously creates and manages its own worker agents
- **Agent Teams** — shared task lists, inter-agent messaging, and coordinated workflows (Sprint 17)
- **Guardian agents** — automatic reflexes triggered on session end and batch completion
- **Interactive TUI dashboard** — real-time Textual dashboard with agent table, live output, and keyboard shortcuts
- **Web UI** — React SPA at `localhost:5174` with agent monitoring and canvas builder
- **Multi-model support** — Claude (default), Claude Opus 4.6, Claude Sonnet 4.6, or local Ollama models
- **Skill packages** — external knowledge domains (AEC: 73 Blender/BIM/IFC agents)
- **Pre-built templates** — 10+ agent templates for common workflows (code review, testing, translation)
- **Visual Canvas** (advanced) — drag-and-drop React Flow canvas for building complex multi-agent workflows

---

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `oa start` | Start the `oa` tmux session with a dashboard window |
| `oa run "<task>"` | Spawn an agent in a new tmux window with its own workspace |
| `oa status` | Show status table of all agents (name, status, task, duration, workspace) |
| `oa dashboard` | Open the interactive Textual TUI dashboard |
| `oa web` | Start the web UI at [localhost:5174](http://localhost:5174) |
| `oa version` | Show CLI version |

### Agent Management

| Command | Description |
|---------|-------------|
| `oa attach <name>` | Switch to a running agent's tmux window for live interaction |
| `oa watch <name>` | Stream a running agent's output in real-time |
| `oa kill <name>` | Stop a running agent and close its tmux window |
| `oa collect <name>` | Display the output of a completed agent (`output.md`) |
| `oa clean` | Clean up workspaces of all completed agents |

### Agent Teams (Collaborative Workflows)

| Command | Description |
|---------|-------------|
| `oa team create <name>` | Create a new agent team with shared task list |
| `oa team list` | Show all teams and their members |
| `oa task list [team]` | View tasks in a team (filters by status, owner) |
| `oa task create <team> "<description>"` | Add a task to a team |
| `oa send <agent> "<message>"` | Send a direct message to an agent |
| `oa inbox <agent>` | Check messages for an agent |
| `oa broadcast "<message>"` | Send a message to all agents in a team |

### Proposal Workflow

| Command | Description |
|---------|-------------|
| `oa review <name>` | View proposals written by an agent |
| `oa apply <name>` | Apply an agent's proposals to the codebase |
| `oa apply <name> --dry-run` | Preview what would change without applying |
| `oa apply <name> --file <x>` | Apply a specific proposal file |

### Orchestration

| Command | Description |
|---------|-------------|
| `oa pipeline "<task>"` | Run an automated multi-agent pipeline (Planner → Workers → Combiner) |
| `oa delegate "<task>"` | Spawn an orchestrator agent that creates and manages workers automatically |

---

## `oa run` Options

```bash
oa run "Write unit tests for auth.py"
oa run "Analyze codebase for security issues" --name sec-audit
oa run "Translate README to English" --model claude/sonnet
oa run "Generate documentation" --model ollama/qwen3:8b
```

| Option | Short | Description |
|--------|-------|-------------|
| `--name NAME` | `-n` | Agent name (auto-generated if omitted) |
| `--model MODEL` | `-m` | Model selection (see Model Selection below) |
| `--parent NAME` | `-p` | Parent agent name (enables nested spawning with hierarchy) |
| `--workspace DIR` | `-w` | Use an existing workspace directory |
| `--direct` | `-d` | Write directly to codebase (skip proposal mode) |

---

## Model Selection

| Model string | Description |
|-------------|-------------|
| `claude` | Claude Code CLI (default) — uses your subscription |
| `claude/opus` | Claude Opus 4.6 — maximum reasoning capability |
| `claude/sonnet` | Claude Sonnet 4.6 — balanced quality and speed |
| `ollama/<model>` | Local Ollama model, e.g. `ollama/qwen3:8b` |

```bash
oa run "Complex architecture analysis" --model claude/opus
oa run "Write unit tests" --model claude/sonnet
oa run "Generate code comments" --model ollama/llama3.2
```

---

## Pipeline Orchestration

`oa pipeline` runs an automated multi-stage pipeline:

```
Planner agent
    ↓
  plan.json (JSON with subtasks)
    ↓
Subtask agents (parallel)
    ↓
Combiner agent
    ↓
  result.md (combined final output)
```

1. **Planner** (timeout: 5 min) — Analyzes the task and writes a `plan.json` with up to 10 subtasks
2. **Subtask agents** (timeout: 30 min each) — Run in parallel, each in their own workspace
3. **Combiner** (timeout: 10 min) — Merges all subtask outputs into a coherent final result

```bash
oa pipeline "Build a CSV validator library with tests, type hints, and README"
```

---

## Skill Packages & Domain Agents

Agents can be backed by **external skill packages** — curated collections of agents with deep domain knowledge, tools, and prompt templates for specific technologies or domains.

### AEC (Architecture, Engineering, Construction) — 73 Agents

The first production skill package provides domain-specific agents for:

| Skill package | Agents | Domain |
|---------------|--------|--------|
| `aec-blender` | 24 | Blender 3D modeling, geometry nodes, rendering |
| `aec-bonsai` | 19 | Bonsai BIM authoring, IFC classification, spatial structure |
| `aec-ifcopenshell` | 16 | IfcOpenShell IFC parsing, validation, transformation |
| `aec-sverchok` | 14 | Sverchok parametric/generative design nodes |

These agents are loaded automatically into the Library UI and can be dragged onto the canvas.

---

## Proposal Mode

All agents operate in **proposal mode** by default — they write proposed file changes to `./output/proposals/` instead of modifying your codebase directly. This keeps your files safe.

```bash
# Spawn an agent
oa run "Refactor the auth module to use JWT"

# Review what it proposes
oa review auth-refactor

# Apply the proposals if you're happy
oa apply auth-refactor

# Or preview first
oa apply auth-refactor --dry-run
```

---

## Guardian Agents

Guardian agents are automatic reflexes that trigger at session end and batch completion. They can:

- **Summarize learnings** from completed tasks into project documentation
- **Update the roadmap** with progress and blockers
- **Generate handoff notes** for team continuity

Guardian agents are defined in templates and run autonomously:

```bash
# Guardian agents trigger automatically on `oa stop`
oa stop
```

Guardian templates include:
- `guardian-lessons` — Extract insights from session logs
- `guardian-roadmap` — Update ROADMAP.md with progress
- `guardian-handoff` — Create handoff notes for next session

---

## Visual Canvas (Advanced)

The `packages/` ecosystem provides a visual drag-and-drop canvas for building complex agent workflows:

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
npm install -g pnpm
pnpm install

# Start frontend and backend together
pnpm dev

# Or separately
pnpm dev:frontend   # React canvas at http://localhost:5173
pnpm dev:backend    # Fastify API at http://localhost:3001
```

**Features:**
- Drag-and-drop agent nodes connected by edges
- Flow pattern (A→B→C) and Pool pattern (dispatcher → parallel agents → aggregator)
- 160+ pre-built agents across 25 categories including AEC (architecture, engineering, construction)
- Assembly Engine: describe a workflow in natural language → automatic canvas generation
- AI Assembly Assistant (sidebar chatbot)
- Safety & Audit: per-node permissions, bash blacklists, full audit trail
- Multi-provider: Anthropic Agent SDK, OpenAI, Mistral, Ollama
- Deployment targets: standalone web app, VS Code extension, Frappe/ERPNext app

---

## Architecture

Two ecosystems in one repository:

```
oa-cli/                  # Python CLI orchestrator (tmux-based)
  src/open_agents/       # CLI, orchestrator, TUI dashboard, pipeline, bridge
    cli.py               # 12 CLI commands (typer)
    orchestrator.py      # tmux session + agent spawning
    dashboard.py         # Textual TUI dashboard
    pipeline.py          # Planner → subtasks → combiner pipeline
    bridge.py            # Flask bridge server for web UI
    state.py             # Agent state (~/.oa/agents.json)
    workspace.py         # Workspace builder + CLAUDE.md generation
  web/                   # React SPA web UI (Vite + React 19)

packages/                # TypeScript monorepo (pnpm workspaces)
  shared/                # @open-agents/shared — TypeScript types & model catalog
  frontend/              # React 19 + React Flow v12 + Tailwind 4 + Vite
  backend/               # Fastify API + execution engine + runtime adapters
  knowledge/             # @open-agents/knowledge — routing patterns, model profiles, cost estimation
  vscode-extension/      # VS Code extension with MCP server
  vscode-webview/        # VS Code webview (React Flow canvas)
  frappe-app/            # Frappe/ERPNext app wrapper

agents/
  presets/               # 10 preset agent configs
  library/               # 160+ categorized agent library
    aec-blender/         # Blender 3D modeling agents
    aec-bonsai/          # Bonsai BIM authoring agents
    aec-ifcopenshell/    # IfcOpenShell IFC processing agents
    aec-sverchok/        # Sverchok parametric design agents

templates/
  flows/                 # Sequential flow templates
  pools/                 # Pool pattern templates
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| CLI orchestrator | Python 3.10+ + typer + rich + tmux |
| TUI dashboard | Textual (>=0.80) — 60/40 split with live output |
| CLI web UI | React 19 + Vite + Flask bridge (localhost:5174) |
| Canvas editor | React Flow (xyflow v12) |
| Canvas frontend | React 19 + Vite + Tailwind CSS 4 + Zustand |
| Canvas backend | Node.js + Fastify + TypeScript |
| Agent runtime | Claude Code CLI (subscription) + Claude Agent SDK + OpenAI/Mistral/Ollama adapters |
| Knowledge engine | TypeScript — model profiles, cost estimation, graph validation |
| Assembly | Haiku 4.5 (intent) + TypeScript (patterns) + Sonnet 4.6 (graph gen) |
| Skill packages | Markdown definitions + Python/YAML agent configs |
| Orchestration | Pipeline (Planner → Workers → Combiner) + Agent Teams (task lists, messaging) |
| Monorepo | pnpm workspaces |
| CI/CD | GitHub Actions (typecheck, test, build) |

---

## Development (Visual Canvas)

```bash
# TypeScript check all packages
pnpm typecheck

# Run tests
pnpm test

# Build all packages
pnpm build

# Build VS Code extension
pnpm build:ext
```

---

## Project Documents

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](docs/ROADMAP.md) | Project status (single source of truth) |
| [MASTERPLAN.md](docs/MASTERPLAN.md) | Sprint plan with executable prompts |
| [DECISIONS.md](docs/DECISIONS.md) | Architecture decisions (D-001+) |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Functional & non-functional requirements |
| [PRINCIPLES.md](docs/PRINCIPLES.md) | 11 design principles |
| [AGENTS.md](docs/AGENTS.md) | 1015+ agent definitions in 25 categories |

---

## Organization

| Entity | Role |
|--------|------|
| **Impertio Studio B.V.** | Development & operations |
| **OpenAEC Foundation** | Open-source publication |

## License

[Apache-2.0](LICENSE)

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
