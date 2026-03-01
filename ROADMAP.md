# ROADMAP - Open-Agents

> Dit is de SINGLE SOURCE OF TRUTH voor project status en voortgang.
> Claude Project Instructies verwijzen hiernaar - geen dubbele tracking.
>
> **Laatste update**: 2026-03-04
> **Status**: Sprint 9 - Agent Library COMPLETE, Sprint 6c + 10 remaining
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
| AI Assembly Assistant | 0 | 1 |
| VS Code Extension | 1 | 1 |
| Frappe App | 1 | 1 |
| Library Ecosystem (10 types) | 0 | 10 |
| LLM Asset Generation (Factory) | 1 | 1 |
| Agent Library (doel: 1000+) | 90 | 1000 |

**Fase 0 (Foundation)**: ████████████████████ **100%** - documenten, visie, research
**Fase 1 (PoC)**: ████████████████████ **100%** - canvas UI, backend API, e2e wiring, theming, BYOK
**Fase 2 (Factory)**: ████████████████████ **100%** - tabs, wizard, library, CRUD API, presets, LLM-powered generation
**Fase 3 (Orchestratie)**: ████████████████████ **100%** — Sprint 3 (Flow Pattern) + Sprint 4 (Pool Pattern) complete
**Fase 4 (Intelligence)**: ████████████████████ **100%** - safety & audit (Sprint 5)
**Fase 4a (Knowledge)**: ████████████████████ **100%** - knowledge base + snippet engine (Sprint 6a)
**Fase 4b (Assembly)**: ████████████████████ **100%** - NL → agent graph self-assembly (Sprint 6b)
**Fase 4c (Assistant)**: ░░░░░░░░░░░░░░░░░░░░ **0%** - AI assembly assistant sidebar (Sprint 6c)
**Fase 5 (Deployment)**: ████████████████████ **100%** - VS Code extension (Sprint 7) + Frappe app (Sprint 8)
**Fase 6 (Scale)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 7 (Agent Library)**: ██░░░░░░░░░░░░░░░░░░ **9%** - 90/1000 agents geïmplementeerd (10 categorieën, library loader)
**Fase 8 (Refactor)**: ████████░░░░░░░░░░░░ **41%** - 7/17 taken afgerond (code audit, type consolidatie, memory fix, CI/CD)

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

**Sprint 6c — AI Assembly Assistant (FR-18, FR-19):**
- [ ] Assistant engine met context-aware prompts
- [ ] Chat API (SSE streaming)
- [ ] AssistantSidebar component (chat + suggesties + cost + context selector)
- [ ] Bidirectionele canvas sync (CanvasAction → canvasStore)
- [ ] Smart suggestions met one-click Apply

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
- [ ] Backend refactor (utilities, API standaardisatie)
- [ ] Frontend refactor (component decomposition, accessibility)
- [ ] Test suite uitbreiden
- [ ] API documentatie (OpenAPI/Swagger)
- [ ] README + CONTRIBUTING + CHANGELOG
- [ ] v0.1.0 release
- [ ] NodeType uitbreiden naar D-023 specificatie (teammate, skill, connector, gate)
- [ ] testCommand() wiring in execution engine (D-035 bash enforcement gap)
- [ ] MCP tool auto-generatie pipeline verbinden met VS Code extension (D-031)
- [ ] Non-Claude runtime tool use support (D-032 PoC beperking opheffen)

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
