# ROADMAP - Open-Agents

> Dit is de SINGLE SOURCE OF TRUTH voor project status en voortgang.
> Claude Project Instructies verwijzen hiernaar - geen dubbele tracking.
>
> **Laatste update**: 2026-03-02
> **Status**: Sprint 12 (oa-cli) Done — Sprint 11 (VS Code Bridge) In Progress — Sprint 13+ Planned
> **Visie**: Visueel agent orchestratie platform
> **Zie ook**: MASTERPLAN.md (sprints), REQUIREMENTS.md (requirements), PRINCIPLES.md (uitgangspunten)

---

## Project Status

| Categorie | Voltooid | Totaal |
|-----------|:--------:|:------:|
| Research & Visie | 3 | 3 |
| Core Documenten | 7 | 7 |
| PoC Canvas | 1 | 1 |
| Factory Portal | 1 | 1 |
| Orchestratie (Flow + Pool) | 2 | 2 |
| Safety & Audit | 1 | 1 |
| Knowledge Base + Snippet Engine | 1 | 1 |
| Assembly Engine (NL → Graph) | 1 | 1 |
| AI Assembly Assistant | 1 | 1 |
| VS Code Extension | 1 | 1 |
| Frappe App | 1 | 1 |
| Library Ecosystem (10 types) | 0 | 10 |
| LLM Asset Generation (Factory) | 1 | 1 |
| Agent Library (doel: 1000+) | 90 | 1000 |
| CLI Agentic Layer (oa-cli) | 1 | 1 |
| VS Code Bridge (Sprint 11) | 0 | 1 |
| Agent Teams Patterns (Sprint 17) | 0 | 12 |

**Fase 0 (Foundation)**: ████████████████████ **100%** - documenten, visie, research
**Fase 1 (PoC)**: ████████████████████ **100%** - canvas UI, backend API, e2e wiring, theming, BYOK
**Fase 2 (Factory)**: ████████████████████ **100%** - tabs, wizard, library, CRUD API, presets, LLM-powered generation
**Fase 3 (Orchestratie)**: ████████████████████ **100%** — Sprint 3 (Flow Pattern) + Sprint 4 (Pool Pattern) complete
**Fase 4 (Intelligence)**: ████████████████████ **100%** - safety & audit (Sprint 5)
**Fase 4a (Knowledge)**: ████████████████████ **100%** - knowledge base + snippet engine (Sprint 6a)
**Fase 4b (Assembly)**: ████████████████████ **100%** - NL → agent graph self-assembly (Sprint 6b)
**Fase 4c (Assistant)**: ████████████████████ **100%** - AI assembly assistant sidebar (Sprint 6c)
**Fase 5 (Deployment)**: ████████████████████ **100%** - VS Code extension (Sprint 7) + Frappe app (Sprint 8)
**Fase 6 (Scale)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 7 (Agent Library)**: ██░░░░░░░░░░░░░░░░░░ **9%** - 90/1000 agents geïmplementeerd (10 categorieën, library loader)
**Fase 8 (Refactor)**: ████████████████████ **100%** - v0.1.0 released (14 taken afgerond, 6 doorgeschoven naar v0.2.0)
**Fase 9 (CLI Agentic Layer)**: ████████████████████ **100%** - oa-cli werkend: 12 commando's, Textual TUI, pipeline orchestrator, React web UI
**Fase 10 (VS Code Bridge)**: ██████████░░░░░░░░░░ **50%** - Sprint 11 in progress: ClaudeCLIRuntime, bridgeService, ConnectionIndicator werkend; package migratie + E2E verificatie nog open

---

## Fase Overzicht

### Fase 0: Foundation (Complete)

- [x] Pi.dev research en documentatie
- [x] OpenAgents projectplan geschreven
- [x] GitHub repo aangemaakt onder OpenAEC-Foundation
- [x] Repository structuur opgezet
- [x] Visie verscherpt: van ERPNext-first naar visueel platform
- [x] Anthropic Agent SDK + Skills + Context Windows research
- [x] Visuele editor libraries research (React Flow, Vue Flow, Rete.js)
- [x] Vergelijkbare platforms analyse (Langflow, Flowise, Dify, n8n)
- [x] OpenAEC repos inventaris (36 repos, relevante tools geïdentificeerd)
- [x] REQUIREMENTS.md geschreven
- [x] MASTERPLAN.md geschreven
- [x] PRINCIPLES.md geschreven
- [x] SOURCES.md geschreven
- [x] OPEN-QUESTIONS.md geschreven
- [x] DECISIONS.md geüpdate met nieuwe beslissingen
- [x] ROADMAP.md geüpdate (dit document)

### Fase 1: Proof of Concept (Sprint 1) — Complete

- [x] Frontend framework gekozen (D-006): React + React Flow
- [x] Backend framework gekozen (D-007): Node.js + Fastify
- [x] Minimale canvas met 2 agent-blokken
- [x] Blokken visueel verbinden
- [x] Canvas exporteert naar JSON configuratie
- [x] Config triggert Claude Code via Agent SDK
- [x] End-to-end flow werkend
- [x] Bonus: White-label theming (D-029) met 3 thema's
- [x] Bonus: Multi-provider BYOK key management
- [x] Bonus: Skill level toggle (beginner/intermediate/advanced)
- [x] Bonus: Per-node chat via Agent SDK
- [x] Bonus: Execution engine met topologische sort

### Fase 2: Factory & Asset Library (Sprint 2)

- [x] Tab navigatie systeem (Canvas | Factory | Library | Settings)
- [x] Factory portal tabblad met asset type keuze
- [x] Agent creation wizard (5-stap: naam, model, prompt, tools, review)
- [x] Agent CRUD API endpoints (POST/GET/PUT/DELETE /api/agents)
- [x] Library ecosystem shell met 10 library types (FR-22)
- [x] Agent Library met grid/lijst view, zoek/filter, drag-to-canvas, detail panel
- [x] Settings page (provider management, thema, skill level)
- [x] Model metadata gecentraliseerd (MODEL_CATALOG in shared types)
- [x] Preset agents als seed in agent library (10 presets)
- [x] LLM-powered asset generatie (FR-23): conversational input, AI generation, preview/edit, refinement, save to library

### Fase 3: Orchestratie Patronen (Sprint 3-4)

**Sprint 3 — Flow Pattern (Complete):**
- [x] Flow pattern: sequentiële pipeline (A→B→C) — topologische sort, output passing
- [x] Visual flow status: edge kleuring (idle/running/completed/error), node border ring, status icons
- [x] Session management: pause, resume, cancel met step-boundary control
- [x] Error handling: retry/skip/abort decision dialog, max 3 retries
- [x] ExecutionToolbar met state machine (idle→running→paused→completed)
- [x] Output panel met elapsed time per step, focus scroll bij node click
- [x] 3 flow templates: Code Review Pipeline, Bug Fix Flow, Documentation Generator
- [x] Runtime adapters: abort signal support (Claude SDK, OpenAI, Mistral, Ollama)

**Sprint 4 — Pool Pattern (Complete):**
- [x] Pool pattern: dispatcher-based routing — DispatcherNode met LLM classificatie, routing prompt, model selector
- [x] Parallelle agent execution — Promise.allSettled, timeouts, graceful failure, pool:start/pool:complete SSE events
- [x] AggregatorNode — concatenate/synthesize strategieën, optioneel LLM synthesis
- [x] Frontend: DispatcherNode + AggregatorNode componenten, Sidebar orchestratie sectie, OutputPanel pool icons
- [x] 2 pool templates: Code Review Pool, Multi-Expert Analysis
- [x] Patronen combineerbaar — flow + pool nodes op hetzelfde canvas

### Fase 4: Intelligence (Sprint 5, 6a, 6b, 6c)

**Sprint 5 — Safety & Audit (Complete):**
- [x] Safety rules editor (visueel) — SafetySettingsView in Settings tab
- [x] Audit trail en run history — RunHistoryView in Runs tab + ReplayControls

**Sprint 6a — Knowledge Base + Snippet Engine (FR-16) (Complete):**
- [x] `@open-agents/knowledge` package in monorepo
- [x] Hardcoded engine: model profiles, tool profiles, token budgets, graph validator, cost estimator
- [x] 35 routing pattern snippets (Diamond, Escalation, Map-Reduce, etc.) (20 gepland + 15 bonus)
- [x] 7 orchestratie principes + 13 building block profiles als snippets
- [x] Markdown loader + knowledge registry
- [x] Knowledge API routes (patterns, principles, blocks, models, tools, estimate-cost, validate)

**Sprint 6b — Assembly Engine (FR-17, D-022) (Complete):**
- [x] Intent classificatie (Haiku) — NL → TaskIntent
- [x] Pattern matching (TypeScript) — intent → top 3 patterns
- [x] Graph generatie (Sonnet) — pattern → CanvasConfig met nodes, edges, prompts
- [x] Cost estimatie + graph validatie
- [x] GenerateBar, PatternLibrary, CostEstimatePanel componenten
- [x] Auto-layout met dagre
- [x] Assembly API routes (POST /api/assembly/generate, POST /api/assembly/classify)
- [x] Assembly store slice (Zustand) met apply-to-canvas

**Sprint 6c — AI Assembly Assistant (FR-18, FR-19) (Complete):**
- [x] Assistant engine met context-aware prompts (Sonnet streaming via Anthropic Messages API)
- [x] Chat API (SSE streaming) — POST /api/assistant/chat + POST /api/assistant/suggestions
- [x] AssistantSidebar component (chat + suggesties + context selector + action cards)
- [x] Bidirectionele canvas sync (CanvasAction → canvasStore: add/remove/update node, add edge, replace all)
- [x] Smart suggestions met one-click Apply (orphan detection, model cost, validation agent)

### Fase 5: Deployment Targets (Sprint 7-8) — Complete

**Sprint 7 — VS Code Extension (Complete):**
- [x] Extension scaffolding: package.json manifest, commands, settings, keybinding
- [x] Webview panel met React Flow canvas
- [x] MCP server met 6 tools
- [x] Status bar met live backend health check
- [x] Sidebar tree view met Quick Actions + Tips
- [x] Build pipeline: tsup (extension CJS) + Vite (webview)

**Sprint 8 — Frappe App (Complete):**
- [x] Frappe app structuur (packages/frappe-app/)
- [x] Custom DocTypes (Agent Config, Execution Run, Safety Rule)
- [x] Canvas embedding in Frappe Desk (iframe met postMessage bridge)
- [x] Whitelisted API endpoints (proxy naar backend)
- [x] 5 ERPNext templates (Boekhouding, Inkoop, HR, Project, Admin)

> **Nota**: VS Code extension is feature-complete als development build. VSIX packaging en marketplace publicatie vallen onder Sprint 10 (Refactor). MCP tools zijn momenteel hardcoded, niet auto-gegenereerd via D-031 CommandRegistry.

### Fase 6: Scale & Community

- [ ] Community template marketplace
- [ ] Multi-tenant deployment
- [ ] Performance optimalisatie
- [ ] Documentatie en tutorials

### Toekomstige Integratie: Open-VSCode-Controller (D-041)

> Open-VSCode-Controller biedt programmatische VS Code controle via HTTP Bridge
> (40+ endpoints), MCP Server (25 tools), CLI en Agent Orchestrator.
> Repo: `OpenAEC-Foundation/Open-VSCode-Controller`

- [ ] Open-VSCode-Controller stabiliseren (Phase 1-3) — zie `docs/PARALLEL-SESSIONS.md` Sessie E
- [ ] Integratiestrategie bepalen (D-041: compose / absorb / extension pack)
- [ ] Bridge client of MCP proxy implementeren in Open-Agents
- [ ] Agent execution via VS Code terminals als alternatief runtime

### Fase 7: Agent Library (Doorlopend — Sprint 9)

> Loopt parallel naast alle sprints. Vult retroactief agents aan per fase.
> Referentiemodel: Anthropic Agent Teams. Zie AGENTS.md voor de volledige library.

- [x] 1015 atomaire agents gedefinieerd in AGENTS.md (20 categorieën A-T)
- [x] 10 core agents geïmplementeerd: summarize, translate, explain-code, find-bugs, generate-test, format-code, generate-commit-msg, check-security, read-file, search-in-files
- [x] 80 category + specialist agents geïmplementeerd: text-language (10), code-dev (10), review-quality (10), data-transform (10), git-versioning (8), research (10), communication (7), file-system (5), erpnext (10)
- [x] Library loader (library-loader.ts) + source/readonly tracking + category filter UI
- [x] 7 flow & pool templates (PR Assistant, Smart Translator, Multi-Reviewer, Security Audit, Codebase Profiler, ERPNext Feature Builder, Onboarding Assistant)
- [ ] Overige 910+ agents (doorlopend)

### Fase 8: Refactor & Consolidatie (Sprint 10)

> Laatste sprint van de eerste Scrum iteratie. Refactort en consolideert alles.

- [x] Code audit (P1/P2/P3 rapport) — backend 26 issues, frontend ~50 issues, shared Grade A
- [x] ModelDisplayInfo type opruimen (dead code, vervangen door ModelMeta)
- [x] AgentDefinition vs AgentNodeData vs AgentPreset type consolidatie — AgentDefinition extends AgentNodeData
- [x] Memory cleanup voor completed runs in execution-engine.ts (TTL + hard cap)
- [x] CI/CD pipeline — GitHub Actions (typecheck, test, build)
- [x] Duplicated statusColors extractie → shared STATUS_COLORS constant
- [x] Missing @dagrejs/dagre dependency fix (backend typecheck)
- [x] Backend refactor — SSE utilities (sse.ts), KnowledgeRegistry singleton, assemblyRoutes registration fix
- [x] Frontend refactor — getNodeBorderStyle extractie, nodeBorderStyle DRY across 3 node components
- [x] Test suite basis (types.test.ts — 15 tests voor type guards, MODEL_CATALOG, getModelMeta, TOOL_DISPLAY)
- [x] Test suite uitbreiden — match-patterns (16 tests), SSE utilities (7 tests), CRLF bugfix in loader
- [x] README.md herschreven (features, architectuur, API endpoints, setup)
- [x] CHANGELOG.md aangemaakt (Keep a Changelog format, Sprint 1-10)
- [x] v0.1.0 release — CHANGELOG, DECISIONS (D-043, D-044), git tag
- [ ] NodeType uitbreiden naar D-023 specificatie (teammate, skill, connector, gate) → v0.2.0
- [x] testCommand() wiring in execution engine (D-035) — prompt injectie + post-hoc scanning + audit logging, 15 tests
- [ ] MCP tool auto-generatie pipeline verbinden met VS Code extension (D-031) → v0.2.0
- [ ] Non-Claude runtime tool use support (D-032 PoC beperking opheffen) → v0.2.0
- [ ] Test suite verdere uitbreiding (execution engine state machine, frontend components) → v0.2.0
- [ ] API documentatie (OpenAPI/Swagger) → v0.2.0

---

## Sprint 11: VS Code Bridge & Terminal Agents — In Progress

**Bron**: Gemigreerd van Open-VSCode-Controller (D-043)

- [x] ClaudeCLIRuntime adapter (`packages/backend/src/runtimes/claude-cli.ts`)
- [x] `cli/claude` ModelProvider + ModelId in shared types
- [x] Bridge health check + runtime registratie in server.ts
- [x] Frontend bridgeService (health + WebSocket)
- [x] ConnectionIndicator met bridge status
- [x] MIGRATION-VSCODE-BRIDGE.md instructiedocument
- [ ] Package migratie: `vscode-extension` → `packages/vscode-bridge`
- [ ] Shared types mergen (bridge events, agent types, constants)
- [ ] Launch configuratie (.vscode/launch.json)
- [ ] test-workspace migreren
- [ ] CLI tool integreren
- [ ] E2E verificatie: canvas → cli/claude agent → terminal → result

---

## Sprint 12: CLI Agentic Layer (oa-cli) — Complete

**Bron**: claude-code-agentic-layer.md + open-agents-prompts.md
**Beslissingen**: D-045 (oa-cli architectuur), D-046 (Textual TUI), D-047 (Pipeline orchestrator)

**Prompt 1 — Core CLI (Complete):**
- [x] Python pakket `oa-cli/` met pyproject.toml (open-agents-cli v0.1.0)
- [x] `oa start` — tmux session 'oa' aanmaken met dashboard window
- [x] `oa run "<taak>"` — agent spawnen: temp workspace + CLAUDE.md + tmux window + claude CLI
- [x] `oa status` — rich tabel met alle agents (naam, status, taak, duration, workspace)
- [x] `oa dashboard` — tmux attach (later vervangen door TUI in prompt 2)
- [x] `oa kill <naam>` — agent stoppen + tmux window sluiten
- [x] `oa collect <naam>` — output tonen van voltooide agent
- [x] `oa clean` — workspaces opruimen van voltooide agents
- [x] `oa version` — versie tonen
- [x] State management via ~/.oa/agents.json
- [x] Workspace builder met CLAUDE.md generatie
- [x] Timeout detectie (30 min default)
- [x] Alle 9 basis commando's getest en werkend

**Prompt 2 — TUI Dashboard + Pipeline (Complete):**
- [x] Textual TUI dashboard (D-046): 60/40 split, DataTable + detail panel, auto-refresh 2s
- [x] `capture_agent_output()` — live tmux pane capture
- [x] `oa dashboard` herwired naar Textual app (vervangt tmux attach)
- [x] Key bindings: K=Kill, C=Collect, R=Refresh, Q=Quit
- [x] Pipeline orchestrator (D-047): planner → parse plan.json → parallel subtasks → combiner
- [x] `spawn_agent()` uitgebreid met optioneel `workspace` parameter
- [x] Custom CLAUDE.md templates voor planner en combiner
- [x] Timeouts: planner 5min, subtasks 30min, combiner 10min
- [x] Error handling per pipeline fase
- [x] `oa pipeline "<taak>"` commando werkend
- [x] `pip install -e .` succesvol met textual>=0.80

**Prompt 2b — Web UI + Extra Commands (Complete):**
- [x] React SPA web UI (`oa-cli/web/`) met Vite + React 19 + TypeScript
- [x] Flask bridge server (`bridge.py`) — localhost-only, serveert React SPA + API endpoints
- [x] `oa web` — start web UI op localhost (React SPA + Flask bridge)
- [x] `oa attach <naam>` — tmux window selecteren voor live sessie
- [x] `oa watch <naam>` — real-time output streaming in terminal
- [x] `oa run --model` parameter — model selectie (claude, ollama/<model>)
- [x] `oa run --parent` parameter — agent hiërarchie
- [x] Live session viewing via `tmux capture-pane` in web UI en TUI
- [x] UI beslissingen: D-048 (3 interfaces), D-049 (live viewing), D-050 (React SPA)
- [x] Totaal 12 CLI commando's: start, run, status, dashboard, attach, watch, kill, collect, clean, pipeline, web, version

---

---

## Sprint 13+: Planning

### Sprint 13: Docker Isolation + Non-Claude Tool Use — Planned

**Doel**: Container isolatie per agent (D-040) + non-Claude runtime tool use (D-032 PoC-beperking opheffen)

**Prioriteit**: Hoog — blokkeert productie-inzet
**Afhankelijk van**: Sprint 10 (v0.1.0)

**Docker Container Isolation (D-040):**
- [ ] Docker runtime adapter (`docker-runtime.ts`) — container start, logs streamen, cleanup
- [ ] Workspace builder voor Docker volume mount (D-024 6-layer stack in container)
- [ ] Network policy per agent (whitelist in agent JSON config)
- [ ] Resource limits (memory, CPU, timeout) via Docker flags
- [ ] Secret injection als Docker env vars
- [ ] Output capture: artifacts uit container na afloop
- [ ] Execution engine refactor: `runtime.execute()` → docker-runtime
- [ ] Safety settings: tool blacklists → container policies (D-035 + D-040 convergentie)

**Non-Claude Runtime Tool Use (D-032):**
- [ ] OpenAI adapter: function calling API
- [ ] Mistral adapter: tool_calls in chat completions
- [ ] Ollama adapter: tool_calls (conditioneel, ondersteunde modellen)
- [ ] AgentRuntime interface: tool definitions parameter
- [ ] Tool result handling in execution engine
- [ ] Canvas: model selector toont tool use support per adapter

---

### Sprint 14: Agent Library Scale-up — Planned

**Doel**: Van 90 naar 300+ agents (categorieën J-M als eerste batch)
**Afhankelijk van**: Sprint 9 (library infrastructuur)

- [ ] 50 Infrastructure & DevOps agents (agents/library/infra-devops/)
- [ ] 50 Testing & QA agents (agents/library/testing-qa/)
- [ ] 50 API & Integration agents (agents/library/api-integration/)
- [ ] 50 Database & Data agents (agents/library/database-data/)
- [ ] Maturity veld (D-042) toevoegen aan alle 90 bestaande agents
- [ ] Library filter UI: filter op maturity niveau
- [ ] Groeipad dashboard in UI

---

### Sprint 15: oa-cli × packages/ Convergentie — Planned

**Doel**: oa-cli als derde execution runtime naast API en VS Code bridge
**Afhankelijk van**: Sprint 12 (oa-cli Done), Sprint 11 (VS Code bridge)

- [ ] `OaCLIRuntime` adapter in `packages/backend/src/runtimes/oa-cli.ts`
- [ ] `tmux/claude` als ModelProvider + ModelId in shared types
- [ ] Status polling: agents.json → SSE stream naar frontend
- [ ] Flask bridge: POST /api/canvas voor canvas config
- [ ] Canvas model selector: API | CLI (bridge) | Tmux als drie opties
- [ ] E2E test: canvas → tmux/claude → oa-cli → result in UI

---

### Sprint 16: Google A2A Protocol Evaluatie — Planned

**Doel**: Evalueer Google A2A als interoperabiliteitsstandaard
**Afhankelijk van**: Sprint 13 (Docker isolation stabiel)

- [ ] A2A spec analyse vs huidige canvas JSON + SSE architectuur
- [ ] PoC A2A server adapter (één Open-Agents agent als A2A service)
- [ ] Test met A2A-compatible client
- [ ] Beslissing D-051 documenteren in DECISIONS.md

---

### Sprint 17: oa-cli Agent Teams Patterns — Planned

**Doel**: Agent Teams patterns (D-052, L-022 t/m L-029) implementeren in oa-cli
**Afhankelijk van**: Sprint 12 (oa-cli basis Done)
**Bron**: Claude Code Agent Teams referentie-architectuur

- [ ] Shared task list (`task_list.py`) — CRUD, file locking, JSON storage in `~/.oa/tasks/<team>/`
- [ ] Task dependencies — `blockedBy` veld, auto-unblock bij status=completed
- [ ] Inter-agent messaging (`messaging.py`) — mailbox per agent, DM + broadcast
- [ ] Team config (`teams.py`) — create/list/delete, members array, `~/.oa/teams/<team>/config.json`
- [ ] Graceful shutdown protocol — request/approve/reject via messaging
- [ ] Quality hooks (`hooks.py`) — on_idle, on_task_complete callbacks
- [ ] CLI commando's: `oa team`, `oa task`, `oa msg`, `oa broadcast`, `oa shutdown`
- [ ] AgentRecord uitbreiden: `team` veld, `mailbox_path`
- [ ] Workspace CLAUDE.md template: team context meegeven aan agents
- [ ] Tests voor task list, messaging, team management
- [ ] TUI dashboard: team view met task status
- [ ] Web UI: team overzicht pagina

---

## Model Routing Strategie

| Vraag type | Model | Waarom |
|-----------|-------|--------|
| Simpele lookup | Haiku 4.5 | Snel, goedkoop |
| Standaard werk | Sonnet 4.6 | Balans kwaliteit/snelheid |
| Complexe analyse | Opus 4.6 | Maximale redenering |
| Code generatie | Sonnet 4.6 | Sterk in code, snel genoeg |
| Intent classificatie (D-017) | Haiku 4.5 | Assembly stap 1: NL → TaskIntent, minimale kosten |
| Graph generatie (D-017) | Sonnet 4.6 | Assembly stap 3: pattern → concrete agent graph |
| AI Assistant chat (D-018) | Sonnet 4.6 | Interactieve hulp bij assembleren, gebalanceerd |
| Pattern matching (D-022) | TypeScript | Assembly stap 2: geen LLM, deterministische scoring |
| Cost + validatie (D-022) | TypeScript | Assembly stap 4+5: geen LLM, betrouwbare berekening |
| Factory asset generatie (D-028) | Sonnet 4.6 | Genereert library assets volgens platform regels |

---

## Legenda

| Symbool | Betekenis |
|:-------:|-----------|
| [x] | Voltooid |
| [ ] | Gepland |

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
