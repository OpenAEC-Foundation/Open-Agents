# Changelog

All notable changes to Open-Agents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Docker lifecycle volledig (#68)**: `lifecycle.py` detecteert nu `tmux_window.startswith("docker:")` prefix voor alle drie lifecycle-functies: `check_agent()` pollt `docker inspect --format={{.State.Status}}`, `kill_agent()` roept `docker stop` aan, `capture_agent_output()` haalt output via `docker logs --tail N`. `Dockerfile.agent` aangemaakt in repo root (ubuntu:22.04 + Node 20 + Python 3.11 + claude CLI + oa-cli, non-root user `oa-agent`).
- **VS Code Bridge tests (#72)**: `test_vscode_bridge.py` — 18 tests voor alle REST endpoints (/health, /agents, /agents/<name>, /agents/spawn, /agents/<name>/kill, /agents/<name>/logs). TypeScript shared types in `packages/shared/src/bridge-types.ts` al actief via `@open-agents/shared` dep in `packages/vscode-extension`.
- **Terminal backend (#70)**: `packages/backend/src/routes/terminal.ts` — WebSocket PTY route via node-pty (graceful degradation als niet geïnstalleerd). `packages/frontend/src/components/Terminal.tsx` — xterm.js v5 React component met FitAddon, WebLinksAddon, SearchAddon, ResizeObserver-gebaseerde auto-resize.
- **Local-first Chat UI (#63)**: `bridge.py` — `POST /api/chat`, `POST /api/chat/stream` (SSE), `GET /api/chat/models`. Provider-agnostisch: `claude/*` → Anthropic SDK (lazy import), `ollama/*` → lokale Ollama /api/chat. `ChatPanel.tsx` — React SSE streaming chat in oa-cli web UI, model selector, localStorage history (max 100 msgs). 14 tests in `test_chat_api.py`.

### Fixed
- **spawner.py — root-detectie vóór SSH-spawn (#64)**: `spawn_remote_agent()` controleert nu via `ssh id -u` of de remote user root is (UID 0). Als ja: directe `RuntimeError` met concrete fix-instructies i.p.v. silent failure na 1 seconde.
- **template_loader.py — `_archive/` uitgesloten van scans (#66)**: Active template scans slaan `agents/library/_archive/` over via `EXCLUDED_DIRS`. Gearchiveerde templates verschijnen niet in de UI of via `oa run --template`.
- **template_loader.py — schema-validatie toegevoegd (#66)**: `_validate_template()` controleert required fields (`name`, `systemPrompt`) en detecteert legacy `prompt` key. Ongeldigde templates worden gelogd als warning en overgeslagen. `validate_library()` toegevoegd voor CI.
- **SpawnForm.tsx — machine-sectie verborgen bij geen remote machines (#75)**: De Machine-selector wordt nu alleen gerenderd als er niet-lokale machines geconfigureerd zijn. Solo-devs zien geen lege/verwarrende machine-selector.

### Closed (stale — already implemented)
- #65 check-delegation.sh false positive: al opgelost op regel 38 van de hook
- #67 `oa run --template`: al geïmplementeerd in cli.py
- #71 `oa mcp` + PyPI workflow: al aanwezig in cli.py + publish-pypi.yml
- #73 SpawnForm auth header: al `authHeaders()` correct
- #74 Bridge FileNotFoundError tmux: al opgelost in `run_bridge()`

### Closed (duplicate/symptoom)
- #77 Remote agent duration 1s: symptoom van #64 (root server fail), duration-code was altijd correct

---

## [0.3.0] - 2026-03-11

### Added
- **Telemetry system**: run logs, analytics, and per-run metrics tracking
- **Post-run hooks**: configurable shell commands triggered after agent completion
- **Context window tracking**: monitor token usage and context consumption per agent
- **Agent library**: 1567 templates across 106 categories (expanded from 90 templates/10 categories)
- **Docker runtime adapter**: containerised agent execution via `packages/backend`
- **A2A protocol PoC adapter**: Agent-to-Agent communication protocol proof-of-concept
- **Terminal WebSocket server**: real-time terminal streaming via WebSocket
- **`oa mcp` CLI command**: start and manage MCP server from the CLI
- **Web UI — xterm.js integration**: full terminal emulation in the browser
- **Web UI — command palette**: keyboard-driven command palette for agent management
- **Web UI — keyboard shortcuts**: global keyboard shortcut bindings in the web UI

### Changed
- **modelHint normalised**: agent library templates now use official Anthropic model IDs (`claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `claude-opus-4-6`) instead of shorthand aliases

### Fixed
- **tmux window index conflict**: resolved race condition causing duplicate tmux window indices when spawning multiple agents simultaneously
- **Telemetry `finish_run` integration**: telemetry now correctly records run completion timestamps and exit codes

---

### Added
- ErrorBoundary en ToastProvider componenten voor robuuste UI error handling
- PipelinePanel: visuele pipeline trigger component met live status polling
- TaskBoard: kanban bord per team met todo/in_progress/done kolommen
- 170 agent templates in 17 nieuwe categorieën (analytics, blockchain, healthcare, iot, audio, video, image-processing, legal, marketing, product-management, security, devops, mobile, physics, education, finance, logistics)
- Design documentation (webapp masterplan, sprint 18 plan, bridge API design)

### Changed
- Dashboard componenten (11 items): hardcoded kleuren vervangen door CSS design tokens
- app.tsx: wrapped met ToastProvider en ErrorBoundary per tab

### Technical Details
- No external component libraries for ErrorBoundary/ToastProvider (custom implementation)
- CSS design tokens: `--color-*`, `--spacing-*`, `--typography-*` variables
- PipelinePanel API integration: `GET /api/pipelines`, live status via polling (2s interval)
- TaskBoard API integration: `GET /api/tasks/<team>`, WebSocket ready for real-time updates

---

## [0.2.0] - 2026-03-02

### Added
- oa-cli: Python CLI orchestrator with 12+ commands (`oa start/run/status/dashboard/kill/collect/clean/pipeline/web/attach/watch/version`)
- oa-cli: Textual TUI dashboard with live agent monitoring (60/40 split, DataTable + detail panel, auto-refresh, key bindings)
- oa-cli: Pipeline orchestrator (planner → subtasks → combiner) with custom CLAUDE.md templates per phase
- oa-cli: React SPA web UI (Command Centre) on localhost:5174 with Vite + React 19 + TypeScript (dark theme, live session viewer, agent spawn form)
- oa-cli: Flask bridge server (`bridge.py`) — localhost-only API wrapping oa-cli functions for web UI
- oa-cli: Proposal mode — agents write proposals instead of direct file modifications
- oa-cli: `review` and `apply` commands for proposal approval workflow
- oa-cli: `--workspace` flag for custom agent workspaces
- oa-cli: Multi-model support (`claude/opus`, `claude/sonnet`, `claude/haiku`, `ollama/*`)
- oa-cli: Agent lifecycle management via tmux (spawn, check, kill, timeout detection)
- oa-cli: Workspace builder with auto-generated CLAUDE.md per agent
- oa-cli: State persistence in `~/.oa/agents.json`
- oa-cli: Live output capture via `tmux capture-pane` (TUI, web UI, and `oa watch`)
- oa-cli: Three UI interfaces sharing one state: CLI, Textual TUI, React SPA (D-048)

### Changed
- CLAUDE.md v4: oa-cli as primary orchestration, Session Recovery Protocol updated
- MASTERPLAN.md: Sprint 6c/10 status fixed, Sprint 13-16 added
- ROADMAP.md: Phase 9 (CLI Agentic Layer) at 100%
- Project focus shifted from packages/ (visual canvas) to oa-cli (CLI orchestration)
- `oa run --model` expanded with additional model options (claude/opus, claude/sonnet, claude/haiku, ollama/*)

### Fixed
- REQUIREMENTS.md: Outdated percentages corrected
- OPEN-QUESTIONS.md: Answered questions marked as resolved
- Dependencies: typer, rich, textual (≥0.80), flask (≥3.0), flask-cors (≥5.0)

---

## [0.1.0] - 2026-02-28

First milestone release — 10 sprints of the first Scrum iteration complete.

### Added
- **Sprint 1 (PoC)**: Visual canvas with React Flow v12, backend API with Fastify, end-to-end agent execution, white-label theming (3 themes), multi-provider BYOK key management, skill level toggle, per-node chat via Agent SDK, execution engine with topological sort
- **Sprint 2 (Factory)**: Tab navigation (Canvas/Factory/Library/Settings), agent creation wizard, CRUD API endpoints, 10 library types, agent library with grid/list view, drag-to-canvas, LLM-powered asset generation, model metadata (MODEL_CATALOG)
- **Sprint 3 (Flow Pattern)**: Sequential pipeline orchestration, visual flow status (edge coloring, node borders, status icons), session management (pause/resume/cancel), error handling (retry/skip/abort), ExecutionToolbar, OutputPanel, 3 flow templates, 4 runtime adapters (Claude SDK, OpenAI, Mistral, Ollama)
- **Sprint 4 (Pool Pattern)**: Dispatcher-based routing with LLM classification, parallel agent execution (Promise.allSettled), AggregatorNode (concatenate/synthesize), DispatcherNode + AggregatorNode components, 2 pool templates
- **Sprint 5 (Safety & Audit)**: Safety rules editor (SafetySettingsView), audit trail and run history (RunHistoryView), replay controls
- **Sprint 6a (Knowledge Base)**: @open-agents/knowledge package, 35 routing pattern snippets, 7 orchestration principles, 13 building block profiles, markdown loader, knowledge API routes
- **Sprint 6b (Assembly Engine)**: Intent classification (Haiku), pattern matching (TypeScript), graph generation (Sonnet), cost estimation, graph validation, GenerateBar/PatternLibrary/CostEstimatePanel components, auto-layout with dagre
- **Sprint 6c (AI Assistant)**: Context-aware assembly assistant (Sonnet streaming), bidirectional canvas sync, smart suggestions with one-click Apply
- **Sprint 7 (VS Code Extension)**: Extension scaffolding, webview panel with React Flow canvas, MCP server (6 tools), status bar, sidebar tree view
- **Sprint 8 (Frappe App)**: Frappe app structure, custom DocTypes, canvas embedding (iframe + postMessage), whitelisted API endpoints, 5 ERPNext templates
- **Sprint 9 (Agent Library)**: 90 agents in 10 categories, library loader with source/readonly tracking, category filter UI, 7 flow/pool templates
- **Sprint 10 (Refactor)**: CI/CD pipeline (GitHub Actions), test suite (155 tests across 12 files), README/CHANGELOG rewrite

### Changed
- **Sprint 10 (Refactor)**: AgentDefinition now extends AgentNodeData (type consolidation), duplicated statusColors → shared STATUS_COLORS constant, nodeBorderStyle → shared getNodeBorderStyle(), SSE utilities extracted to sse.ts, KnowledgeRegistry centralized to singleton

### Fixed
- **Sprint 10**: Memory leak in execution engine (TTL-based cleanup for completed runs), missing @dagrejs/dagre dependency, assemblyRoutes never registered in server.ts, CRLF line ending bug in knowledge loader on Windows

### Removed
- **Sprint 10**: Deprecated ModelDisplayInfo type

---

*Maintained by [Impertio Studio B.V.](https://impertio.nl)*
