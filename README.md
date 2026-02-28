# Open-Agents

Visual agent orchestration platform. Build AI agent architectures by dragging and connecting blocks on a canvas — no code needed. The platform generates configurations that drive Claude agents via the Anthropic Agent SDK.

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
  shared/        # TypeScript types & interfaces
  frontend/      # React + React Flow v12 + Vite + Tailwind 4
  backend/       # Fastify API + Claude Agent SDK
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Canvas editor | React Flow (xyflow v12) | 24k stars, market leader, VS Code webview proven |
| Frontend | React 19 + Vite + Tailwind CSS 4 | Modern, fast, large ecosystem |
| Backend | Node.js + Fastify | TypeScript everywhere, native SSE, 2-3x faster than Express |
| Agent runtime | Claude Agent SDK (TS) | Official Anthropic SDK, streaming, sessions, hooks, MCP |
| Monorepo | pnpm workspaces | Shared types, single CI/CD |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/configs` | Save a canvas configuration |
| GET | `/api/configs/:id` | Get a configuration |
| GET | `/api/configs` | List all configurations |
| POST | `/api/execute` | Execute a configuration |
| GET | `/api/execute/:id/status` | Execution status (SSE) |

## Project Documents

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](ROADMAP.md) | Project status (single source of truth) |
| [MASTERPLAN.md](MASTERPLAN.md) | Sprint plan with executable prompts |
| [DECISIONS.md](DECISIONS.md) | Architecture decisions |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Functional & non-functional requirements |
| [PRINCIPLES.md](PRINCIPLES.md) | Design principles |
| [SOURCES.md](SOURCES.md) | Research & references |

## Vision

Three deployment targets from one codebase:
1. **Standalone web app** (self-hosted or cloud)
2. **VS Code extension** (webview + Claude Code integration via MCP)
3. **Frappe app** (ERPNext ecosystem)

## Organization

| Entity | Role |
|--------|------|
| **Impertio Studio B.V.** | Development & operations |
| **OpenAEC Foundation** | Open-source publication |

## License

[Apache-2.0](LICENSE)

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
