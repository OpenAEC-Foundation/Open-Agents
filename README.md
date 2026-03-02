# Open-Agents

Multi-agent orchestrator voor Claude Code. Spawn en coördineer meerdere AI-agents via de `oa` CLI — geen API key nodig, gebruikt je Claude Code subscription direct. Optioneel: een visueel drag-and-drop canvas voor complexe workflows.

## Wat is Open-Agents?

**`oa`** is de primaire tool: een tmux-gebaseerde CLI waarmee je meerdere Claude Code agents parallel kunt spawnen, monitoren en orkestreren. Elke agent krijgt zijn eigen workspace, CLAUDE.md instructies en tmux window. Je werkt via de terminal, een Textual TUI dashboard of de lokale React web UI.

**Visual Canvas** (packages/) is de geavanceerde optie: een drag-and-drop canvas (React Flow) voor het bouwen van complexe agent-workflows met een Node.js backend, assembly engine en 90+ library agents.

---

## Prerequisites

- Python >= 3.11
- tmux
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) met actieve subscription
- (Voor Visual Canvas) Node.js >= 20, pnpm >= 9

---

## Installatie

```bash
cd oa-cli
pip install -e .
```

De `oa` binary wordt geïnstalleerd in `~/.local/bin`. Voeg dit toe aan je PATH als dat nog niet het geval is:

```bash
# In ~/.bashrc of ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"
```

Controleer de installatie:

```bash
oa version
```

---

## Quick Start

```bash
# 1. Start een tmux sessie
oa start

# 2. Spawn een agent met een taak
oa run "Schrijf een Python functie die e-mailadressen valideert"

# 3. Bekijk de status van alle agents
oa status

# 4. Open de interactieve TUI dashboard
oa dashboard

# 5. Voer een multi-agent pipeline uit
oa pipeline "Bouw een CSV validator library met tests en README"

# 6. Open de web UI
oa web
```

---

## CLI Commando's

### `oa start`
Start de `oa` tmux sessie met een dashboard window.

```bash
oa start
```

### `oa run "<taak>"`
Spawn een agent in een nieuw tmux window. De agent krijgt een eigen workspace met CLAUDE.md instructies.

```bash
oa run "Schrijf unit tests voor auth.py"
oa run "Analyseer de codebase op security issues" --name sec-audit
oa run "Vertaal README naar Engels" --model claude/sonnet
oa run "Genereer documentatie" --model ollama/qwen3:8b
```

**Opties:**

| Optie | Kort | Beschrijving |
|-------|------|-------------|
| `--name NAME` | `-n` | Agent naam (auto-gegenereerd als leeg) |
| `--model MODEL` | `-m` | Model selectie (zie Model Selectie) |
| `--parent NAME` | `-p` | Parent/orchestrator agent (voor hiërarchie) |
| `--workspace DIR` | `-w` | Gebruik bestaande workspace directory |

### `oa status`
Toon de status van alle agents in een rich tabel (naam, status, taak, duratie, workspace).

```bash
oa status
```

### `oa dashboard`
Open de interactieve Textual TUI dashboard met 60/40 split: agent tabel links, live output rechts. Auto-refresh elke 2 seconden.

```bash
oa dashboard
# Keybindings: K=Kill, C=Collect, R=Refresh, Q=Quit
```

### `oa attach <naam>`
Switch naar het tmux window van een draaiende agent voor live interactie.

```bash
oa attach write-3a9f2b
# Gebruik Ctrl-b n/p om tussen tmux windows te navigeren
```

### `oa watch <naam>`
Stream de output van een draaiende agent real-time in de terminal (via tmux capture-pane).

```bash
oa watch write-3a9f2b
# Ctrl-C om te stoppen
```

### `oa kill <naam>`
Stop een draaiende agent en sluit het tmux window.

```bash
oa kill write-3a9f2b
```

### `oa collect <naam>`
Toon de output van een voltooide agent (leest `output.md` uit de workspace).

```bash
oa collect write-3a9f2b
```

### `oa clean`
Ruim workspaces op van alle voltooide agents.

```bash
oa clean
```

### `oa pipeline "<taak>"`
Voer een multi-agent pipeline uit. Zie [Pipeline Orchestratie](#pipeline-orchestratie).

```bash
oa pipeline "Bouw een REST API met tests en documentatie"
```

### `oa web`
Start de lokale web UI (React SPA + Flask bridge server) op http://localhost:5174.

```bash
oa web
oa web --port 8080
```

### `oa version`
Toon de CLI versie.

```bash
oa version
```

---

## Model Selectie

Gebruik `--model` bij `oa run` om het model te kiezen:

| Model string | Beschrijving |
|-------------|-------------|
| `claude` | Claude Code CLI (default) — gebruikt je subscription |
| `claude/opus` | Claude Opus 4.6 — maximale redenering |
| `claude/sonnet` | Claude Sonnet 4.6 — balans kwaliteit/snelheid |
| `ollama/<model>` | Lokaal Ollama model, bijv. `ollama/qwen3:8b` |

```bash
oa run "Complexe architectuur analyse" --model claude/opus
oa run "Schrijf unit tests" --model claude/sonnet
oa run "Genereer comments" --model ollama/llama3.2
```

---

## Pipeline Orchestratie

`oa pipeline` voert een automatische meertraps pipeline uit:

```
Planner agent
    ↓
  plan.json (JSON met subtaken)
    ↓
Subtask agents (parallel)
    ↓
Combiner agent
    ↓
  result.md (gecombineerd eindresultaat)
```

**Hoe het werkt:**

1. **Planner** (timeout: 5 min) — Analyseert de taak en schrijft een `plan.json` met maximaal 10 subtaken
2. **Subtask agents** (timeout: 30 min elk) — Draaien parallel, elk in eigen workspace
3. **Combiner** (timeout: 10 min) — Combineert alle subtask outputs tot een samenhangend resultaat

```bash
oa pipeline "Bouw een CSV validator library met tests, type hints en README"
```

De pipeline print voortgang per fase en het eindresultaat direct in de terminal.

---

## Visual Canvas (Geavanceerd)

Het `packages/` ecosysteem biedt een visueel drag-and-drop canvas voor het bouwen van complexe agent-workflows:

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
npm install -g pnpm
pnpm install

# Start frontend en backend tegelijk
pnpm dev

# Of apart
pnpm dev:frontend   # React canvas op http://localhost:5173
pnpm dev:backend    # Fastify API op http://localhost:3001
```

**Features:**
- Drag-and-drop agent nodes, verbinden met edges
- Flow pattern (A→B→C) en Pool pattern (dispatcher → parallel agents → aggregator)
- 90+ pre-built agents (code review, vertaling, security audit, data transformatie)
- Assembly Engine: beschrijf een workflow in natuurlijke taal → automatisch canvas
- AI Assembly Assistant (sidebar chatbot)
- Safety & Audit: per-node permissies, bash blacklists, volledige audit trail
- Multi-provider: Anthropic Agent SDK, OpenAI, Mistral, Ollama
- Deployment targets: standalone web app, VS Code extension, Frappe/ERPNext app

---

## Architectuur

Twee ecosystemen in één repo:

```
oa-cli/                  # Python CLI orchestrator (tmux-based)
  src/open_agents/       # CLI, orchestrator, TUI dashboard, pipeline, bridge
    cli.py               # 12 CLI commando's (typer)
    orchestrator.py      # tmux sessie + agent spawning
    dashboard.py         # Textual TUI dashboard
    pipeline.py          # Planner → subtasks → combiner pipeline
    bridge.py            # Flask bridge server voor web UI
    state.py             # Agent state (~/.oa/agents.json)
    workspace.py         # Workspace builder + CLAUDE.md generatie
  web/                   # React SPA web UI (Vite + React 19)

packages/                # TypeScript monorepo (pnpm workspaces)
  shared/                # @open-agents/shared — TypeScript types & model catalog
  frontend/              # React 19 + React Flow v12 + Tailwind 4 + Vite
  backend/               # Fastify API + execution engine + runtime adapters
  knowledge/             # @open-agents/knowledge — routing patterns, model profiles, cost estimation
  vscode-extension/      # VS Code extension met MCP server
  vscode-webview/        # VS Code webview (React Flow canvas)
  frappe-app/            # Frappe/ERPNext app wrapper

agents/
  presets/               # 10 preset agent configs
  library/               # 80+ gecategoriseerde agent library

templates/
  flows/                 # Sequential flow templates
  pools/                 # Pool pattern templates
```

### Tech Stack

| Laag | Technologie |
|------|------------|
| CLI orchestrator | Python + typer + rich + tmux |
| TUI dashboard | Textual (≥0.80) |
| CLI web UI | React 19 + Vite + Flask bridge |
| Canvas editor | React Flow (xyflow v12) |
| Canvas frontend | React 19 + Vite + Tailwind CSS 4 + Zustand |
| Canvas backend | Node.js + Fastify |
| Agent runtime | Claude Code CLI (subscription) + Claude Agent SDK + OpenAI/Mistral/Ollama adapters |
| Knowledge engine | TypeScript — model profiles, cost estimation, graph validation |
| Assembly | Haiku (intent) + TypeScript (patterns) + Sonnet (graph gen) |
| Monorepo | pnpm workspaces |
| CI/CD | GitHub Actions (typecheck, test, build) |

---

## Development (Visual Canvas)

```bash
# TypeScript check alle packages
pnpm typecheck

# Tests draaien
pnpm test

# Build alle packages
pnpm build

# Build VS Code extension
pnpm build:ext
```

---

## Project Documenten

| Document | Doel |
|----------|------|
| [ROADMAP.md](ROADMAP.md) | Project status (single source of truth) |
| [MASTERPLAN.md](MASTERPLAN.md) | Sprint plan met uitvoerbare prompts |
| [DECISIONS.md](DECISIONS.md) | Architectuurbeslissingen (D-001+) |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Functionele & non-functionele requirements |
| [PRINCIPLES.md](PRINCIPLES.md) | 11 design principes |
| [AGENTS.md](AGENTS.md) | 1015 agent definities in 20 categorieën |

---

## Organisatie

| Entiteit | Rol |
|----------|-----|
| **Impertio Studio B.V.** | Development & operations |
| **OpenAEC Foundation** | Open-source publicatie |

## Licentie

[Apache-2.0](LICENSE)

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
