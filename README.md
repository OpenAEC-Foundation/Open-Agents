# Open-Agents

Visual agent orchestration platform. Build AI agent architectures by dragging and connecting blocks on a canvas — no code needed. Multi-provider LLM support (Anthropic, OpenAI, Mistral, Ollama).

## Features

- **Visual Canvas** — Drag-and-drop agent nodes, connect with edges, build complex workflows
- **Two Orchestration Patterns** — Sequential flow (A→B→C) and pool pattern (dispatcher → parallel agents → aggregator)
- **Multi-Provider** — Anthropic (Agent SDK), OpenAI, Mistral, Ollama via runtime adapters
- **90+ Pre-built Agents** — Code review, translation, security audit, data transformation, and more
- **Assembly Engine** — Describe what you want in natural language, get a complete agent graph
- **Safety & Audit** — Per-node permission modes, bash blacklists, tool restrictions, full audit trail
- **Three Deployment Targets** — Standalone web app, VS Code extension, Frappe/ERPNext app

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
npm install -g pnpm

# Install dependencies
pnpm install

# Start both frontend and backend
pnpm dev

# Or start individually
pnpm dev:frontend   # React canvas on http://localhost:5173
pnpm dev:backend    # Fastify API on http://localhost:3001
```

## Architecture

Monorepo with pnpm workspaces:

```
packages/
  shared/            # @open-agents/shared — TypeScript types & model catalog
  frontend/          # React 19 + React Flow v12 + Tailwind 4 + Vite
  backend/           # Fastify API + execution engine + runtime adapters
  knowledge/         # @open-agents/knowledge — routing patterns, model profiles, cost estimation
  vscode-extension/  # VS Code extension with MCP server
  vscode-webview/    # VS Code webview (React Flow canvas)
  frappe-app/        # Frappe/ERPNext app wrapper
agents/
  presets/            # 10 preset agent configs
  library/            # 80+ categorized agent library
templates/
  flows/              # Sequential flow templates
  pools/              # Pool pattern templates
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Canvas editor | React Flow (xyflow v12) |
| Frontend | React 19 + Vite + Tailwind CSS 4 + Zustand |
| Backend | Node.js + Fastify |
| Agent runtime | Claude Agent SDK + OpenAI/Mistral/Ollama adapters |
| Knowledge engine | TypeScript — model profiles, cost estimation, graph validation |
| Assembly | Haiku (intent) + TypeScript (patterns) + Sonnet (graph gen) |
| Monorepo | pnpm workspaces |
| CI/CD | GitHub Actions (typecheck, test, build) |

### Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + provider status |
| POST | `/api/execute` | Execute a canvas configuration |
| GET | `/api/execute/:id/status` | Execution status (SSE stream) |
| POST | `/api/chat` | Agent chat (SSE stream) |
| GET | `/api/presets` | List preset agents |
| GET | `/api/agents` | List library agents |
| GET | `/api/templates` | List flow/pool templates |
| POST | `/api/assembly/generate` | NL → agent graph pipeline |
| POST | `/api/knowledge/validate` | Validate graph structure |
| GET/PUT | `/api/safety` | Safety rules management |
| GET | `/api/runs` | Audit trail — run history |

## Development

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

## Project Documents

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](ROADMAP.md) | Project status (single source of truth) |
| [MASTERPLAN.md](MASTERPLAN.md) | Sprint plan with executable prompts |
| [DECISIONS.md](DECISIONS.md) | Architecture decisions (D-001+) |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Functional & non-functional requirements |
| [PRINCIPLES.md](PRINCIPLES.md) | 11 design principles |
| [AGENTS.md](AGENTS.md) | 1015 agent definitions in 20 categories |

## Organization

| Entity | Role |
|--------|------|
| **Impertio Studio B.V.** | Development & operations |
| **OpenAEC Foundation** | Open-source publication |

## License

[Apache-2.0](LICENSE)

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
