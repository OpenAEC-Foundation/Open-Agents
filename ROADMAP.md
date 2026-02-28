# ROADMAP - Open-Agents

> Dit is de SINGLE SOURCE OF TRUTH voor project status en voortgang.
> Claude Project Instructies verwijzen hiernaar - geen dubbele tracking.
>
> **Laatste update**: 2026-03-02
> **Status**: Sprint 1 - Proof of Concept COMPLETE
> **Visie**: Visueel agent orchestratie platform
> **Zie ook**: MASTERPLAN.md (sprints), REQUIREMENTS.md (requirements), PRINCIPLES.md (uitgangspunten)

---

## Project Status

| Categorie | Voltooid | Totaal |
|-----------|:--------:|:------:|
| Research & Visie | 3 | 3 |
| Core Documenten | 7 | 7 |
| PoC Canvas | 1 | 1 |
| Factory Portal | 0 | 1 |
| Orchestratie (Flow + Pool) | 0 | 2 |
| Safety & Audit | 0 | 1 |
| Knowledge Base + Snippet Engine | 0 | 1 |
| Assembly Engine (NL → Graph) | 0 | 1 |
| AI Assembly Assistant | 0 | 1 |
| VS Code Extension | 0 | 1 |
| Frappe App | 0 | 1 |
| Library Ecosystem (10 types) | 0 | 10 |
| LLM Asset Generation (Factory) | 0 | 1 |
| Agent Library (doel: 1000+) | 0 | 1000 |

**Fase 0 (Foundation)**: ████████████████████ **100%** - documenten, visie, research
**Fase 1 (PoC)**: ████████████████████ **100%** - canvas UI, backend API, e2e wiring, theming, BYOK
**Fase 2 (Factory)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 3 (Orchestratie)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 4 (Intelligence)**: ░░░░░░░░░░░░░░░░░░░░ **0%** - safety & audit
**Fase 4a (Knowledge)**: ░░░░░░░░░░░░░░░░░░░░ **0%** - knowledge base + snippet engine (Sprint 6a)
**Fase 4b (Assembly)**: ░░░░░░░░░░░░░░░░░░░░ **0%** - NL → agent graph self-assembly (Sprint 6b)
**Fase 4c (Assistant)**: ░░░░░░░░░░░░░░░░░░░░ **0%** - AI assembly assistant sidebar (Sprint 6c)
**Fase 5 (Deployment)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 6 (Scale)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 7 (Agent Library)**: ░░░░░░░░░░░░░░░░░░░░ **0%** - 1000+ atomaire agents (doorlopend, 1015 gedefinieerd)
**Fase 8 (Refactor)**: ░░░░░░░░░░░░░░░░░░░░ **0%** - consolidatie eerste Scrum iteratie

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

- [ ] Factory portal tabblad
- [ ] Agent creation wizard
- [ ] LLM-powered asset generatie (FR-23): conversational, template-based, refinement
- [ ] Library ecosystem shell met 10 library types (FR-22)
- [ ] Agent Library als eerste gevulde library
- [ ] Eerste 10 voorgebouwde agents

### Fase 3: Orchestratie Patronen (Sprint 3-4)

- [ ] Flow pattern: sequentiële pipeline (A→B→C)
- [ ] Output passing tussen agents
- [ ] Session management (pause, resume, fork)
- [ ] Pool pattern: dispatcher-based routing
- [ ] Parallelle agent execution
- [ ] Patronen combineerbaar

### Fase 4: Intelligence (Sprint 5, 6a, 6b, 6c)

**Sprint 5 — Safety & Audit:**
- [ ] Safety rules editor (visueel)
- [ ] Audit trail en run history

**Sprint 6a — Knowledge Base + Snippet Engine (FR-16):**
- [ ] `@open-agents/knowledge` package in monorepo
- [ ] Hardcoded engine: model profiles, tool profiles, token budgets, graph validator, cost estimator
- [ ] 20 routing pattern snippets (Diamond, Escalation, Map-Reduce, etc.)
- [ ] 7 orchestratie principes + 13 building block profiles als snippets
- [ ] Markdown loader + knowledge registry
- [ ] Knowledge API routes

**Sprint 6b — Assembly Engine (FR-17, D-022):**
- [ ] Intent classificatie (Haiku) — NL → TaskIntent
- [ ] Pattern matching (TypeScript) — intent → top 3 patterns
- [ ] Graph generatie (Sonnet) — pattern → CanvasConfig met nodes, edges, prompts
- [ ] Cost estimatie + graph validatie
- [ ] GenerateBar, PatternLibrary, CostEstimatePanel componenten
- [ ] Auto-layout met dagre

**Sprint 6c — AI Assembly Assistant (FR-18, FR-19):**
- [ ] Assistant engine met context-aware prompts
- [ ] Chat API (SSE streaming)
- [ ] AssistantSidebar component (chat + suggesties + cost + context selector)
- [ ] Bidirectionele canvas sync (CanvasAction → canvasStore)
- [ ] Smart suggestions met one-click Apply

### Fase 5: Deployment Targets (Sprint 7-8)

- [ ] VS Code extension met webview canvas
- [ ] Integratie met Claude Code extension
- [ ] Frappe app wrapper
- [ ] ERPNext use case templates
- [ ] Docker agent isolation

### Fase 6: Scale & Community

- [ ] Community template marketplace
- [ ] Multi-tenant deployment
- [ ] Performance optimalisatie
- [ ] Documentatie en tutorials

### Fase 7: Agent Library (Doorlopend — Sprint 9)

> Loopt parallel naast alle sprints. Vult retroactief agents aan per fase.
> Referentiemodel: Anthropic Agent Teams. Zie AGENTS.md voor de volledige library.

- [x] 1015 atomaire agents gedefinieerd in AGENTS.md (20 categorieën A-T)
- [ ] 10 core agents geïmplementeerd (bij Sprint 2)
- [ ] 50 category agents geïmplementeerd: text, code, review, data (bij Sprint 3-5)
- [ ] 100 specialist agents geïmplementeerd: git, research, API, DevOps (bij Sprint 5-8)
- [ ] 65 ERPNext agents geïmplementeerd (bij Sprint 8)
- [ ] 10 flow & pool templates die agents combineren

### Fase 8: Refactor & Consolidatie (Sprint 10)

> Laatste sprint van de eerste Scrum iteratie. Refactort en consolideert alles.

- [ ] Code audit (P1/P2/P3 rapport)
- [ ] Backend refactor (utilities, API standaardisatie, types)
- [ ] Frontend refactor (component decomposition, accessibility)
- [ ] Test suite uitbreiden
- [ ] API documentatie (OpenAPI/Swagger)
- [ ] README + CONTRIBUTING + CHANGELOG
- [ ] CI/CD pipeline
- [ ] v0.1.0 release

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
