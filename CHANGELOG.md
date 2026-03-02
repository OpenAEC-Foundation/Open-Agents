# Changelog

All notable changes to Open-Agents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
