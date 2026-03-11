# Masterplan - Open-Agents

> **Versie**: 0.7
> **Laatste update**: 2026-03-11
> **Methodiek**: Scrum (korte sprints, snel waarde leveren)
> **Zie ook**: REQUIREMENTS.md, PRINCIPLES.md, ROADMAP.md, SOURCES.md
>
> **Leeswijzer**: Elke taak heeft een label:
> - `[SEQ]` = Sequentieel - moet wachten op vorige taak(en)
> - `[PAR]` = Parallel - kan gelijktijdig met andere `[PAR]` taken
> - Elke sprint bevat **concrete prompts** voor Claude Code uitvoering

---

## Overzicht

| Sprint | Naam | Doel | Afhankelijk van | Status |
|--------|------|------|-----------------|--------|
| 0 | Foundation | Core documenten + dev environment | -- | Done |
| 1 | Proof of Concept | Minimale canvas → Claude Code, e2e | Sprint 0 | Done |
| 2 | Factory Portal | Agents aanmaken via UI | Sprint 1 | Done |
| 3 | Flow Pattern | Sequentiële pipeline werkend | Sprint 1 | Done |
| 4 | Pool Pattern | Dispatcher + parallelle execution | Sprint 3 | Done |
| 5 | Safety & Audit | Rules editor + audit trail | Sprint 1 | Done |
| 6a | Knowledge Base + Snippet Engine | Kennisbibliotheek: routing patterns, model profiles, principes | Sprint 1 | Done |
| 6b | Assembly Engine | NL → Agent Graph self-assembly pipeline | Sprint 6a | Done |
| 6c | AI Assembly Assistant | Sidebar kennispartner + pattern library | Sprint 6b | Done |
| 7 | VS Code Extension | Canvas als VS Code webview + MCP | Sprint 1 | Done |
| 8 | Frappe App | Frappe wrapper + ERPNext templates | Sprint 1 | Done |
| 9 | Agent Library | 1015+ atomaire agents bouwen + Anthropic Agent Teams model | Sprint 2 | In Progress (454/1015) |
| 10 | Refactor & Consolidatie | Refactor van alles uit eerste Scrum iteratie | Sprint 1-9 | Done |
| 11 | VS Code Bridge & Terminal Agents | Echte Claude CLI agents via VS Code bridge. Gemigreerd van Open-VSCode-Controller | Sprint 1 | In Progress (90%) |
| 12 | CLI Agentic Layer (oa-cli) | Tmux-based multi-agent orchestrator op subscription. Python CLI + Textual TUI + Pipeline | -- | Done |
| 13 | Docker Isolation + Non-Claude Tool Use | Container isolatie per agent (D-040) + non-Claude runtime tool use fix (D-032) | Sprint 10 | Planned |
| 14 | Agent Library Scale-up | 900+ agents bouwen in 10 resterende categorieën (doel: 1000+) | Sprint 9 | Planned |
| 15 | oa-cli × packages/ Convergentie | oa-cli als alternatieve execution backend voor het visuele platform | Sprint 12 | Planned |
| 16 | Google A2A Protocol Evaluatie | Agent-to-Agent protocol evaluatie en eventuele integratie | Sprint 13 | Planned |
| 17 | oa-cli Agent Teams Patterns | Shared task list, inter-agent messaging, graceful shutdown, quality hooks (D-052) | Sprint 12 | In Progress (58%) |
| 18 | Dashboard UI & CSS Design Tokens | React web UI refactor: design tokens, ErrorBoundary, ToastProvider, PipelinePanel, TaskBoard | Sprint 12 | In Progress (80%) |
| 19 | Session Persistence | Automatische sessie-herstel: session store, guardian daemon, resume flow, notifications | Sprint 12, 17 | Done |
| 20 | Desktop + Web App | Web-first: xterm.js terminal, Tauri desktop wrapper, shared codebase | Sprint 12, Sprint 15 | Planned |
| 21 | oa-cli als Product | Web UI Command Centre (F1/F2/F3), oa MCP Server, packaging, onboarding | Sprint 12, 17, 18 | Planned |
| 22 | Self-Improvement Foundation | Telemetrie, hooks, context tracking, kwaliteits-gates | Sprint 12 | Planned |
| 22b | Remote Execution (LOW PRIO) | Agents op remote GPU servers (Ollama) | Sprint 22, Sprint 12 | Planned |
| 23 | Self-Improvement Automation | Kennisaccumulatie automatiseren op basis van telemetrie | Sprint 22 | Planned |
| 24 | Iteration Control & Meta-Agent | Zelf-regulerend systeem, skill evolver, meta-agent | Sprint 22, Sprint 23 | Planned |
| 25 | Periodic Analytics & Observability | Diepe analyse agent-ecosysteem op historische data | Sprint 22, Sprint 23 | Planned |
| 26 | CLI Infrastructure Boost | Vervang primitieve subprocess calls door libtmux, watchdog, psutil. Bouw skills die agents en de CLI zelf powertools geven. Slimme tmux-architecturen. | Sprint 12, Sprint 21 | Planned |

```
Sprint 0 ──→ Sprint 1 ──→ Sprint 1.2a ──→ Sprint 1.5
                                              │
              ┌───────┬───────┬───────┬───────┼───────┐
              v       v       v       v       v       v
            S2      S3      S5      S7      S8     S6a
              │       │                              │
              v       v                              v
            (S2)    S4                             S6b
                                                     │
                                                     v
                                                   S6c

Sprint 9 (Agent Library) loopt DOORLOPEND naast alle sprints (vanaf Sprint 2)
Sprint 10 (Refactor) start NA voltooiing van Sprint 1-9

── oa-cli tak (parallel aan packages/ tak) ──────────────────────────────────
Sprint 12 (oa-cli) ──→ Sprint 17 (Agent Teams) ──→ Sprint 19 (Session Persistence) ✅
                   ├──→ Sprint 18 (Dashboard UI) ──→ Sprint 21 (oa-cli als Product)
                   ├──→ Sprint 15 (packages/ convergentie) ──→ Sprint 20 (Desktop+Web)
                   ├──→ Sprint 11 (VS Code Bridge, packages/ tak)
                   └──→ Sprint 22 (Self-Improvement) ──→ Sprint 23 (Automation) ──→ Sprint 24 (Meta-Agent)
                        ├──→ Sprint 21 (MCP Server)                └──→ Sprint 25 (Analytics)
                        ├──→ Sprint 22b (Remote Execution)
                        └──→ Sprint 26 (CLI Infrastructure Boost) [parallel met Sprint 21/22]

Sprint 6a-6c is de Semantische Laag (packages/):
  6a: Knowledge Base (FR-16) — kennisbibliotheek + snippet engine
  6b: Assembly Engine (FR-17) — NL → agent graph generatie
  6c: AI Assistant (FR-18, FR-19) — sidebar + pattern library
```

> **Na Sprint 1.5 kunnen Sprints 2, 3, 5, 6a, 7 en 8 parallel starten.**
> **Sprint 6a → 6b → 6c is sequentieel (elke stap bouwt voort).**
> **Sprint 9 (Agent Library) loopt continu en vult retroactief agents aan in elke sprint.**
> **Sprint 10 (Refactor) is de laatste sprint: consolideert en refactort alles.**

---

## GitHub Issue Workflow

> **Protocol**: Elke sprint-taak die een GitHub issue adresseert volgt dit sluitingsprotocol.

### Sluitingsprotocol

1. **Code committed**: Alle wijzigingen zijn gecommit naar de juiste branch
2. **Tests groen**: Unit tests en/of integration tests slagen
3. **Verificatie**: Functionaliteit handmatig geverifieerd (of via CI)
4. **Issue sluiten**: `gh issue close #<nr> --comment "Implemented in <commit/PR>. <korte beschrijving>."`

### Regels

- Issues blijven **OPEN** in GitHub totdat code committed + getest is
- Sluiten is de **LAATSTE** stap in elke sprint-taak — nooit eerder
- Elke sprint heeft een **GitHub afsluiting** subsectie bij de relevante fase
- Bij meerdere issues in één fix: sluit ze samen met cross-referentie
- Bij gedeeltelijke implementatie: comment met voortgang, laat open

---

## Product North Star

> **Definitie**: Wat is Open-Agents als product wanneer het "klaar" is?

Open-Agents is een **installeerbaar, zelflerend multi-agent platform** dat je via drie interfaces aanstuurt:

| Interface | Beschrijving | Sprint |
|-----------|-------------|--------|
| **CLI** | `oa run`, `oa pipeline`, `oa status` — razendsnel via terminal | Done (Sprint 12) |
| **Web UI** | Command Centre op `localhost:5174` — visueel overzicht + management | Sprint 18/21 |
| **MCP** | Directe aansturing vanuit Claude Code via `mcp__open-agents__*` tools | Sprint 21 |
| **Desktop** | Tauri wrapper rond web UI — native app, geen browser nodig | Sprint 20 |

### Versie-mijlpalen

| Versie | Wanneer klaar | Wat is erin |
|--------|:-------------:|-------------|
| **v0.2.x** | Nu | oa-cli werkend, Agent Teams, Session Persistence, Dashboard basis |
| **v0.3.0** | Sprint 18/21 Done | Web Command Centre volledig, oa MCP Server, PyPI packaging |
| **v0.4.0** | Sprint 22 Done | Telemetrie, hooks, kwaliteits-gates, self-improvement fundament |
| **v1.0.0** | Sprint 23-24 Done | Volledig zelflerend platform met meta-agent |

### Definitie van "applicatie" (oa-cli)

De oa-cli web UI (`oa-cli/web/`) is de primaire grafische interface. Een gebruiker kan:
1. `pip install open-agents-cli` of `curl -sSf https://get.open-agents.dev | sh`
2. `oa setup` (wizard: API keys, tmux check, eerste agent)
3. `oa web` → browser opent op `localhost:5174` → Command Centre

De web UI is **feature-pariteit met CLI** (Sprint 18/21 F1) + **UI-exclusieve features** (Sprint 21 F2/F3).

---

## Direct Actie: Issue #60 — Architectuurdocumentatie

**Status**: Uitvoerbaar zonder blokkades
**Issue**: [#60](https://github.com/OpenAEC-Foundation/Open-Agents/issues/60) — docs: Architectuurdocumentatie (conceptueel model + twee-lagen-structuur)

**Taken:**
- [ ] Maak `docs/architecture.md` met: mermaid diagram twee-lagen-systeem (oa-cli + Visual Canvas), decision tree (wanneer `oa run` vs `oa pipeline` vs direct), isolatie-onderbouwing
- [ ] Update README.md met verwijzing naar docs/architecture.md
- [ ] Geen duplicatie met bestaande docs
- [ ] GitHub: close #60 na publicatie en README-update

---

## Sprint 0: Foundation ✅

**Status**: Done (commit `c3e4e62`)

- [x] Visie verscherpt: van ERPNext-first naar generiek visueel platform
- [x] REQUIREMENTS.md geschreven (14 FR + 5 NFR)
- [x] MASTERPLAN.md geschreven (dit document)
- [x] PRINCIPLES.md geschreven (11 design principles)
- [x] SOURCES.md geschreven (7 secties + research inzichten)
- [x] OPEN-QUESTIONS.md geschreven (5 secties + Pi vergelijking)
- [x] DECISIONS.md geüpdated (D-002/3/5 gesloten, D-006-010 toegevoegd)
- [x] ROADMAP.md geüpdated naar nieuwe richting

---

## Sprint 1: Proof of Concept

**Doel**: Bewijzen dat het concept werkt. Een minimale canvas met 2 blokken die Claude Code aansturen via de Agent SDK.

### Fase 1.1: Framework Beslissingen `[SEQ]` — eerst

> **Prompt**:
> ```
> Je bent de architect van Open-Agents, een visueel agent orchestratie platform.
> Lees REQUIREMENTS.md, PRINCIPLES.md, SOURCES.md en OPEN-QUESTIONS.md.
>
> Neem beslissingen D-006 (frontend framework), D-007 (backend framework) en
> D-008 (mono-repo vs multi-repo). Onderzoek de opties, maak een vergelijking,
> en geef een onderbouwde aanbeveling. Houd rekening met:
> - 3 deployment targets (standalone, VS Code extension, Frappe app)
> - API-first architectuur
> - React Flow (35k stars) vs Vue Flow (native Frappe fit)
> - MCP integratie met Claude Code
>
> Update DECISIONS.md met je keuzes en rationale.
> ```

**Taken:**
- [x] D-006 beslissen: Frontend framework → React + React Flow (xyflow v12)
- [x] D-007 beslissen: Backend framework → Node.js + Fastify
- [x] D-008 beslissen: Mono-repo vs multi-repo → Mono-repo + pnpm workspaces

### Fase 1.2: Project Scaffolding `[SEQ]` — na 1.1

> **Prompt**:
> ```
> Scaffold het Open-Agents project op basis van de beslissingen in DECISIONS.md
> (D-006, D-007, D-008).
>
> Maak aan:
> - Package.json met workspaces (als mono-repo)
> - Frontend project met gekozen framework + canvas library
> - Backend project met gekozen framework + REST API skeleton
> - Gedeelde types/interfaces package
> - Docker-compose voor development
> - README met setup instructies
>
> Zorg dat `npm install && npm run dev` werkt voor zowel frontend als backend.
> Commit als: "feat: scaffold project with [framework] + [backend]"
> ```

**Taken:**
- [x] Mono-repo structuur opzetten (pnpm workspaces)
- [x] Frontend project initialiseren (React + Vite + React Flow v12 + Tailwind 4)
- [x] Backend project initialiseren (Fastify + tsx watch)
- [x] Shared types package (@open-agents/shared)
- [x] Docker-compose dev environment
- [x] Setup instructies (README.md)

### Fase 1.2a: Architecture Foundations `[SEQ]` — na 1.2, voor 1.3

> **Waarom deze fase?** Uit de scope audit (feb 2026) bleken 4 kritieke gaps die
> Sprint 1 blokkeren als ze niet eerst besloten worden. Daarnaast zijn er
> infrastructurele keuzes (CI/CD, testing, state management) die het verschil
> maken tussen "snel bouwen en later alles herschrijven" of "goed beginnen".

> **Prompt**:
> ```
> Je bent de architect van Open-Agents. Neem de volgende beslissingen en
> documenteer ze in DECISIONS.md. Implementeer de infrastructuur direct.
>
> BESLISSINGEN:
>
> D-011: Database (PoC)
>   Opties: A) In-memory Map (geen persistentie, simpelst)
>           B) SQLite via better-sqlite3 (lokaal, geen server)
>           C) PostgreSQL (productie-ready, meer setup)
>   Context: Sprint 1.4 heeft POST/GET /api/configs nodig. PoC draait lokaal.
>
> D-012: Authenticatie (PoC)
>   Opties: A) Geen auth (localhost only, documenteer als beperking)
>           B) Simpele API key in header
>   Context: PoC draait lokaal. Auth is pas nodig bij deployment.
>
> D-013: Claude API Key Beheer
>   Opties: A) Environment variable (ANTHROPIC_API_KEY in .env)
>           B) Gebruiker voert key in via UI (BYOK)
>   Context: Backend roept Claude Agent SDK aan. Key moet ergens vandaan komen.
>
> D-014: Frontend State Management
>   Opties: A) Zustand (klein, simpel, serialiseerbaar, past bij React)
>           B) Redux Toolkit (groter ecosysteem, meer boilerplate)
>           C) React context + useReducer (geen extra dependency)
>   Context: Canvas state (nodes, edges, viewport) + app state (execution,
>   settings). VS Code webview vereist serialiseerbare state (postMessage).
>
> D-015: Agent SDK Interface Strategie
>   Opties: A) Direct SDK calls vanuit route handlers
>           B) Runtime adapter interface (abstractie tussen canvas en SDK)
>   Context: Claude Agent SDK is pre-1.0 (v0.2.63), API wijzigt frequent.
>   Package is hernoemd van claude-code-sdk naar claude-agent-sdk.
>   V2 Session API is unstable (unstable_v2_* prefix).
>   Pi agent-core is product scope (D-002) maar niet PoC scope (D-009).
>   Een adapter beschermt tegen SDK wijzigingen en maakt Pi later toevoegbaar.
>
> INFRASTRUCTUUR (implementeer direct):
>
> 1. CI/CD: .github/workflows/ci.yml met pnpm install, lint, typecheck, build
> 2. Test framework: Vitest configuratie in monorepo + eerste smoke test
> 3. Logging: Pino logger setup in backend (structured JSON)
> 4. .env.example met ANTHROPIC_API_KEY placeholder (gitignored .env)
> 5. Runtime adapter interface in @open-agents/shared:
>    - AgentRuntime interface { execute(config): AsyncIterable<AgentEvent> }
>    - ClaudeSDKRuntime implementeert AgentRuntime
>    - (Later: PiAgentRuntime kan dezelfde interface implementeren)
>
> SCOPE NOTITIE (documenteer in DECISIONS.md bij D-015):
> Pi agent-core blijft in de product-requirements (FR-05, FR-06) als
> complementaire runtime (D-002). Voor de PoC gebruiken we alleen Claude
> Agent SDK (D-009). De runtime adapter interface maakt het toevoegen van
> Pi (of andere runtimes) later een kwestie van één nieuwe implementatie.
>
> Update DECISIONS.md met alle 5 beslissingen.
> Commit als: "feat: architecture foundations — decisions, CI/CD, testing, adapter"
> ```

**Beslissingen:**
- [x] D-026: Database keuze (PoC) → In-memory Map (was D-011 in prompt, hernummerd)
- [x] D-012: Auth strategie (PoC) → Geen auth (localhost only)
- [x] D-013: Claude API key beheer → Environment variable
- [x] D-014: Frontend state management → Zustand
- [x] D-015: Agent SDK interface strategie (runtime adapter) → AgentRuntime interface

**Infrastructuur:**
- [x] CI/CD pipeline (.github/workflows/ci.yml)
- [x] Vitest configuratie + eerste test (5 tests, 2 test files)
- [x] Pino logger setup in backend (Fastify built-in pino)
- [x] .env.example + .env in .gitignore
- [x] Runtime adapter interface (AgentRuntime) in shared package
- [x] ClaudeSDKRuntime implementatie

---

### Fase 1.3: Canvas UI `[PAR]` — parallel met 1.4

> **Prompt**:
> ```
> Bouw de minimale canvas editor voor Open-Agents.
>
> Gebruik React Flow (@xyflow/react v12) en maak:
> 1. Een canvas component met drag-and-drop
> 2. Een "Agent" node type met: naam, model selector, system prompt veld
> 3. Edges tussen nodes (verbindingen trekken)
> 4. Een "Export JSON" knop die de canvas state als JSON exporteert
> 5. Een sidebar met een lijst van beschikbare agent types om te slepen
>
> Het JSON export format moet bevatten:
> - nodes: [{id, type, data: {name, model, systemPrompt, tools}}]
> - edges: [{source, target}]
>
> Geen backend integratie nodig - puur frontend. Test met 2 hardcoded agent
> nodes die je kunt slepen en verbinden.
> ```

**Taken:**
- [x] Canvas component met drag-and-drop
- [x] Agent node type (naam, model, system prompt)
- [x] Edge connections
- [x] JSON export functie
- [x] Sidebar met agent types

### Fase 1.4: Backend API `[PAR]` — parallel met 1.3

> **Prompt**:
> ```
> Bouw de minimale backend API voor Open-Agents.
>
> Endpoints:
> - POST /api/configs - sla een canvas configuratie op (D-011 database)
> - GET /api/configs/:id - haal een configuratie op
> - POST /api/execute - voer een configuratie uit via de runtime adapter (D-015)
> - GET /api/execute/:id/status - status van een executie (streaming via SSE)
>
> De /api/execute endpoint moet:
> 1. De JSON config ontvangen (nodes + edges)
> 2. De RuntimeAdapter (uit Fase 1.2a) gebruiken om agents uit te voeren:
>    - ClaudeSDKRuntime.execute() met:
>      - systemPrompt (de node's system prompt)
>      - tools (de node's allowed tools)
>      - model (de node's model keuze)
>    - Output als AsyncIterable<AgentEvent> streamen via SSE
> 3. Per node: status events (started, output_delta, completed, error)
>
> BELANGRIJK: Gebruik de SDK query() functie, NIET de CLI (`claude -p`).
> De Claude Agent SDK package heet @anthropic-ai/claude-agent-sdk (D-009).
> API key via process.env.ANTHROPIC_API_KEY (D-013).
>
> Error handling (minimaal voor PoC):
> - API timeout: 504 na 5 min
> - Ongeldige config: 400 met validatie errors
> - SDK error: 500 met error message in SSE stream
> - Rate limit: 429 met retry-after header
>
> Maak ook een health check endpoint: GET /api/health
> ```

**Taken:**
- [x] Config CRUD endpoints
- [x] Execute endpoint met Claude Code integratie
- [x] SSE streaming voor real-time output
- [x] Health check

### Fase 1.5: End-to-End Wiring `[SEQ]` — na 1.3 + 1.4

> **Prompt**:
> ```
> Wire de frontend canvas en backend API aan elkaar.
>
> 1. "Run" knop op canvas → POST /api/execute met huidige canvas JSON
> 2. Output panel onder het canvas dat SSE stream toont
> 3. Per-node status indicator: idle → running → done/error
> 4. Test met een simpele 2-node flow:
>    - Node 1: "Analyst" - analyseert een codebase
>    - Node 2: "Reporter" - schrijft een samenvatting
>
> Maak een demo video/screenshot als bewijs dat het end-to-end werkt.
> Commit als: "feat: end-to-end canvas → Claude Code execution working"
> ```

**Taken:**
- [x] Frontend ↔ Backend API connectie
- [x] Run knop + output panel
- [x] Per-node status indicators
- [x] E2E test met 2-node flow
- [x] Demo bewijs (screenshot/video)

### Acceptatiecriteria

- Gebruiker sleept 2 blokken op canvas
- Gebruiker verbindt blokken met een edge
- "Run" voert configuratie uit via Claude Code
- Output verschijnt real-time in de UI

---

## Sprint 2: Factory Portal

**Doel**: Gebruikers kunnen nieuwe agents en andere assets aanmaken via een intuïtieve interface. Factory is de bron voor alle 10 libraries (FR-22) en gebruikt LLM-powered generatie (FR-23).

**Afhankelijk van**: Sprint 1 (werkend canvas + backend)

### Fase 2.1: Factory UI Component `[SEQ]` — eerst

> **Prompt**:
> ```
> Bouw het Factory Portal tabblad voor Open-Agents.
>
> De Factory is het centrale portaal waar gebruikers assets aanmaken.
> Maak een tabblad/pagina met:
> 1. Tab navigatie: Canvas | Factory | Library | Settings
> 2. Factory startscherm met asset types: Agent, Template, Rule
> 3. "Nieuwe Agent" wizard met stappen:
>    - Stap 1: Naam en beschrijving
>    - Stap 2: Model kiezen (Haiku/Sonnet/Opus)
>    - Stap 3: System prompt schrijven (met templates/voorbeelden)
>    - Stap 4: Tools selecteren (checkboxes)
>    - Stap 5: Preview en opslaan
> 4. API: POST /api/agents, GET /api/agents, PUT /api/agents/:id, DELETE /api/agents/:id
>
> Design principle: een niet-technische gebruiker moet in < 2 min een agent
> kunnen aanmaken. Gebruik duidelijke labels, tooltips en voorbeelden.
> ```

**Taken:**
- [x] Tab navigatie systeem
- [x] Factory startscherm
- [x] Agent creation wizard (5 stappen)
- [x] Agent CRUD API endpoints

### Fase 2.2: Asset Library `[PAR]` — parallel met 2.3

> **Prompt**:
> ```
> Bouw de Asset Library voor Open-Agents.
>
> De library is de centrale plek om alle platform assets te browsen (FR-22).
> Er zijn 10 library types (7 atomair + 3 composiet), georganiseerd per
> engineering laag (D-025):
>
> Laag 1 (Orchestratie): Pattern Library, Template Gallery
> Laag 2 (Agent Identiteit): Agent Library, Skill Library, Model Catalog
> Laag 3 (Workspace/Context): Connector Library, Hook Library, Rule Library,
>   Plugin Library, Workspace Template Library
>
> Voor Sprint 2 begin met de Agent Library:
> 1. Tab navigatie tussen library types (uitbreidbaar)
> 2. Grid/lijst view van alle agents (kaartjes met naam, model, beschrijving)
> 3. Zoeken en filteren op naam, type, tags, categorie
> 4. Agent kaartje is sleepbaar naar het canvas (drag from library to canvas)
> 5. Detail view per agent (klik op kaartje → volledige config zien)
> 6. Edit en delete acties
> 7. Community sharing: export/import knoppen
>
> De library haalt data op via GET /api/agents.
> Andere library types worden in latere sprints gevuld.
> ```

**Taken:**
- [x] Library shell met tab navigatie (10 types, uitbreidbaar)
- [x] Agent Library: grid/lijst view
- [x] Zoek en filter functionaliteit
- [x] Drag from library to canvas
- [x] Detail view
- [x] Edit/delete acties

### Fase 2.3: Preset Agents `[PAR]` — parallel met 2.2

> **Prompt**:
> ```
> Maak 10 voorgebouwde agent presets voor de Open-Agents library.
>
> Schrijf voor elke agent een JSON config met: name, description, model,
> systemPrompt, tools[]. Focus op algemeen bruikbare agents:
>
> 1. Code Reviewer - reviewt code op kwaliteit
> 2. Bug Hunter - zoekt bugs in code
> 3. Documentatie Schrijver - genereert docs
> 4. Test Generator - schrijft unit tests
> 5. Refactoring Expert - suggereert refactoring
> 6. Security Auditor - zoekt security issues
> 7. Performance Analyst - analyseert performance
> 8. API Designer - ontwerpt REST APIs
> 9. Database Modeler - ontwerpt database schemas
> 10. DevOps Engineer - schrijft CI/CD configs
>
> Sla op als JSON bestanden in agents/presets/ directory.
> Seed de database bij eerste startup met deze presets.
> ```

**Taken:**
- [x] 10 agent preset JSON bestanden
- [x] Database seeding bij startup

### Fase 2.4: LLM-Powered Asset Generation `[SEQ]` — na 2.1

> **Prompt**:
> ```
> Bouw LLM-powered asset generatie voor de Factory (FR-23).
>
> De Factory gebruikt een LLM om nieuwe assets te genereren voor alle
> library types (FR-22). De LLM kent de platform regels en genereert
> assets die direct bruikbaar zijn.
>
> Drie generatie modes:
> 1. **Conversational**: gebruiker beschrijft in NL wat ze nodig hebben
>    Voorbeeld: "Maak een agent die code reviewed en focust op security"
> 2. **Template-based**: kies een asset type + categorie, LLM vult details in
> 3. **Refinement**: pas bestaand asset aan via chat met LLM suggesties
>
> Implementatie:
> 1. Tekstveld + asset type selector bovenaan de Factory pagina
> 2. Stuur beschrijving + asset type naar backend
> 3. Backend system prompt bevat platform regels:
>    - Agent definities volgen D-023 taxonomie (agent vs skill lakmoestest)
>    - Workspace templates volgen 6-layer stack (D-024)
>    - Skills volgen progressive loading formaat
>    - Alle assets volgen D-020 snippet formaat (Markdown + YAML frontmatter)
> 4. Automatische validatie bij generatie (structuur, consistentie, token efficiency)
> 5. Gegenereerd asset verschijnt als draft → gebruiker reviewt en publiceert
> 6. Batch generatie: meerdere gerelateerde assets in één keer
>    Voorbeeld: agent + bijbehorende skills + workspace template
>
> System prompt voor de generator:
> "Je bent een Open-Agents asset generator. Je genereert assets volgens
> de platform standaarden. Agents volgen de D-023 taxonomie: als het in
> één LLM-call kan, maak het een skill, niet een agent. Kies het lichtste
> model dat de taak aankan. Houd system prompts beknopt en gefocust.
> Workspace templates volgen het 6-layer stack model."
> ```

**Taken:**
- [x] Conversational input veld
- [x] Agent config generator via Claude
- [x] Preview en aanpas flow
- [x] Opslaan naar library

---

## Sprint 3: Flow Pattern

**Doel**: Sequentiële pipeline werkend - Agent A → Agent B → Agent C.

**Afhankelijk van**: Sprint 1 (werkend canvas + execution)

### Fase 3.1: Flow Execution Engine `[SEQ]` — eerst

> **Prompt**:
> ```
> Bouw de flow execution engine voor Open-Agents.
>
> Wanneer een canvas meerdere verbonden nodes heeft (A → B → C):
> 1. Bepaal executievolgorde via topologische sort op de edges
> 2. Voer Node A uit via de RuntimeAdapter (D-015)
> 3. Capture de output van Node A
> 4. Inject output als context in Node B via de systemPrompt parameter:
>    systemPrompt: "Vorige agent output:\n{output_A}\n\n[eigen system prompt]"
> 5. Voer Node B uit, capture output
> 6. Herhaal voor Node C etc.
>
> Backend model:
> - ExecutionRun {id, configId, status, steps: [{nodeId, status, output, startedAt, completedAt}]}
> - POST /api/execute start een run, returns runId
> - GET /api/runs/:id/stream SSE voor real-time updates per step
>
> Session management: gebruik de SDK V2 session API (unstable_v2_*) als
> een stap moet worden hervat. NOTE: deze API is pre-stable (D-015),
> daarom slaan we per-step output ook op in onze eigen database als fallback.
> ```

**Taken:**
- [x] Topologische sort voor executievolgorde
- [x] Sequentiële execution met output passing
- [x] ExecutionRun data model
- [x] SSE streaming per step

### Fase 3.2: Visual Flow Status `[PAR]` — parallel met 3.3

> **Prompt**:
> ```
> Voeg visuele flow status toe aan het canvas.
>
> Tijdens een run moet het canvas real-time tonen:
> 1. Idle nodes: grijze border
> 2. Running node: blauwe border + pulserende animatie
> 3. Completed node: groene border + checkmark
> 4. Failed node: rode border + error icon
> 5. Edge kleurt mee: grijs → blauw (data flowing) → groen (done)
> 6. Output preview: klik op completed node → toon output in panel
>
> Luister naar SSE events van GET /api/runs/:id/stream en update canvas state.
> ```

**Taken:**
- [x] Node status kleuring (idle/running/done/error)
- [x] Edge animatie
- [x] Output preview per node
- [x] SSE event listener

### Fase 3.3: Session Management `[PAR]` — parallel met 3.2

> **Prompt**:
> ```
> Voeg session management toe aan flow execution.
>
> 1. Pause knop: stopt executie na huidige stap (slaat run state op in DB)
> 2. Resume knop: hervat vanaf laatste voltooide stap. Twee strategieen:
>    A) SDK V2 session resume (unstable_v2_resumeSession) als beschikbaar
>    B) Fallback: herstart node met opgeslagen context uit vorige stap
> 3. Restart knop: start hele flow opnieuw (nieuwe ExecutionRun)
> 4. Cancel knop: breekt huidige agent af en stopt flow
>
> RISICO (documenteer): Agent Teams session resume werkt NIET betrouwbaar
> met lopende teammates (bekend SDK issue). Daarom altijd eigen state
> opslaan per stap als fallback. De runtime adapter (D-015) abstraheert dit.
>
> UI: toolbar boven het canvas met Run | Pause | Resume | Restart | Cancel
> Toon elapsed time per stap en totaal.
> ```

**Taken:**
- [x] Pause/Resume met session_id
- [x] Restart en Cancel functionaliteit
- [x] Execution toolbar
- [x] Elapsed time tracking

### Fase 3.4: Error Handling & Templates `[SEQ]` — na 3.1-3.3

> **Prompt**:
> ```
> Voeg error handling en flow templates toe.
>
> Error handling:
> - Als een node faalt: toon error, bied opties (retry, skip, abort)
> - Retry: voer dezelfde node opnieuw uit
> - Skip: ga door naar volgende node zonder output
> - Abort: stop de hele flow
>
> Templates:
> Maak 3 flow templates als presets:
> 1. "Code Review Pipeline": Scout → Reviewer → Reporter
> 2. "Bug Fix Flow": Analyzer → Fixer → Tester
> 3. "Documentation Generator": Scanner → Writer → Formatter
>
> Sla templates op als JSON in templates/flows/ directory.
> Gebruiker kan een template laden via "Load Template" in de toolbar.
> ```

**Taken:**
- [x] Error handling (retry/skip/abort)
- [x] 3 flow templates
- [x] Template laden functionaliteit

---

## Sprint 4: Pool Pattern ✅

**Status**: Done (commit `d274a3e`)

**Doel**: Dispatcher-based orchestratie.

**Afhankelijk van**: Sprint 3 (flow engine werkt)

### Fase 4.1: Dispatcher Node `[SEQ]` — eerst

**Taken:**
- [x] Dispatcher node type — DispatcherNodeData, DispatcherNode.tsx (amber/oranje thema)
- [x] Routing prompt configuratie — routingPrompt textarea, routingModel selector
- [x] Classificatie via Claude — dispatcher-classifier.ts met LLM routing + fallback
- [x] Doorsturen naar juiste agent(s) — executeDispatcherGroup() in execution-engine.ts

### Fase 4.2: Parallel Execution `[SEQ]` — na 4.1

**Taken:**
- [x] Parallelle agent execution — Promise.allSettled + per-agent timeouts via Promise.race
- [x] Canvas status voor meerdere actieve agents — pool:start/pool:complete SSE events, edge kleuring
- [x] Output aggregatie — AggregatorNode (concatenate/synthesize), AggregatorNode.tsx (cyan/teal thema)
- [x] Max concurrency + timeout — maxParallel + timeoutMs configureerbaar per dispatcher
- [x] 2 pool templates: Code Review Pool, Multi-Expert Analysis
- [x] Sidebar: orchestratie sectie met draggable Dispatcher + Aggregator

---

## Sprint 5: Safety & Audit

**Doel**: Visuele safety rules en volledige audit trail.

**Afhankelijk van**: Sprint 1 (basic execution)

### Fase 5.1: Safety Rules Editor + Audit Trail `[PAR]` — parallel

> **Prompt (Safety)**:
> ```
> Bouw een visuele safety rules editor.
>
> Pagina: Settings → Safety Rules
> 1. Per agent configureerbaar:
>    - Allowed tools (checkboxes: Read, Write, Edit, Bash, WebSearch, etc.)
>    - Bash command blacklist (regex patronen, bv. "rm -rf", "DROP TABLE")
>    - File access whitelist (glob patronen, bv. "src/**/*.ts")
>    - Permission mode: read-only | edit | full-access
> 2. Globale regels (gelden voor alle agents)
> 3. Preview: "Test deze regel tegen een voorbeeld commando"
>
> Backend: regels opslaan als JSON, meegeven als --allowedTools aan Claude.
> ```

> **Prompt (Audit)**:
> ```
> Bouw een audit trail systeem.
>
> 1. Log elke agent actie: timestamp, agent, tool_used, input, output, duration
> 2. Run History pagina: lijst van alle uitgevoerde flows/pools
> 3. Per run: tijdlijn van alle agent acties (zoals een git log)
> 4. Filter op: datum, agent, tool, status (success/error)
> 5. "Replay" modus: stap-voor-stap door een historische run lopen
>
> Data model: AuditEntry {runId, nodeId, agentName, tool, input, output,
> status, timestamp, durationMs}
> API: GET /api/audit?runId=X, GET /api/runs (lijst)
> ```

**Taken:**
- [x] `[PAR]` Safety rules editor UI
- [x] `[PAR]` Safety rules backend (opslaan + meegeven aan Claude)
- [x] `[PAR]` Audit trail data model + logging
- [x] `[PAR]` Run history pagina
- [x] `[SEQ]` Replay modus (na audit trail)

---

## Sprint 6a: Knowledge Base + Snippet Engine

**Doel**: Gestructureerde kennisbibliotheek die de assembly engine en AI assistant van intelligentie voorziet (FR-16).

**Afhankelijk van**: Sprint 1.5 (werkende monorepo + build pipeline)

**Bron**: Kennis geëxtraheerd uit Claude Workspace Development Workflows meta-analyse (68 sessies).

### Fase 6a.1: Knowledge Package Setup `[SEQ]` — eerst

> **Prompt**:
> ```
> Maak het @open-agents/knowledge package aan in de monorepo.
>
> Structuur:
> packages/knowledge/
>   package.json
>   src/
>     index.ts
>     engine/
>       model-profiles.ts    # ModelProfile[] met cost/speed/capabilities
>       tool-profiles.ts     # ToolProfile[] met risico-niveaus
>       token-budget.ts      # Budget berekening functies
>       graph-validator.ts   # Structurele validatie (cycles, orphans)
>       cost-estimator.ts    # USD cost berekening per canvas config
>
> Types in packages/shared/src/knowledge-types.ts:
>   ModelProfile, ToolProfile, RoutingPattern, CostEstimate,
>   ValidationResult, OrchestrationPrinciple, BuildingBlock
>
> Schrijf Vitest tests voor alle engine functies.
> ```

**Taken:**
- [x] `packages/knowledge/` package aanmaken in monorepo
- [x] `knowledge-types.ts` in shared package
- [x] `model-profiles.ts` — alle model cost/speed/capability data
- [x] `tool-profiles.ts` — tool beschrijvingen en risico-niveaus
- [x] `token-budget.ts` — budget berekening functies
- [x] `graph-validator.ts` — structurele validatie
- [x] `cost-estimator.ts` — USD cost berekening
- [x] Vitest tests voor alle engine functies

### Fase 6a.2: Snippet Library `[SEQ]` — na 6a.1

> **Prompt**:
> ```
> Schrijf de kennisbibliotheek als markdown snippets met YAML frontmatter.
>
> 20 routing patterns (uit Claude Workspace Development Workflows):
>   patterns/linear/    — single-shot, chain, escalation-ladder, de-escalation
>   patterns/pyramid/   — diamond, pyramid-up, pyramid-down
>   patterns/parallel/  — fan-out, fan-in, map-reduce
>   patterns/iterative/ — simple-loop, spiral, recursive-depth
>   patterns/validation/— pipeline-gate, consensus, debate
>   patterns/efficiency/— lazy-escalation, batch-summarize, cache-check
>   patterns/specialist/— router-specialists
>
> Elk pattern bevat: id, name, category, tags, tokenProfile, minNodes,
> maxNodes, beschrijving, ASCII diagram, when-to-use, node templates
> (role + model + tools + prompt template), edge flow, anti-patterns.
>
> Ook: 7 orchestratie principes + 13 building block profiles als snippets.
>
> Implementeer markdown loader met YAML frontmatter parsing (gray-matter).
> Maak knowledge registry (index + zoeken op tags).
> Maak API routes: GET /api/knowledge/patterns, /principles, /blocks
> ```

**Taken:**
- [x] 35 routing pattern markdown snippets schrijven (20 gepland + 15 bonus)
- [x] 7 orchestratie principes als snippets
- [x] 13 building block profiles als snippets
- [x] Markdown loader met YAML frontmatter parsing
- [x] Knowledge registry (index + search by tags)
- [x] API routes: `GET /api/knowledge/patterns`, `/principles`, `/blocks`
- [x] Tests voor loader en registry

**Acceptatiecriteria:**
- `GET /api/knowledge/patterns` retourneert alle 35 patterns met metadata (20 gepland + 15 bonus)
- `GET /api/knowledge/patterns/diamond` retourneert diamond pattern met node/edge templates
- Cost estimator produceert realistische USD schattingen
- Graph validator vangt cycles, orphans, ongeldige models/tools

---

## Sprint 6b: Assembly Engine (NL → Agent Graph)

**Doel**: Gebruiker beschrijft taak in natuurlijke taal → systeem genereert optimale agent graph (FR-17, D-022).

**Afhankelijk van**: Sprint 6a (knowledge base nodig)

### Fase 6b.1: Intent Classification + Pattern Matching `[SEQ]` — eerst

> **Prompt**:
> ```
> Bouw de eerste twee stappen van de assembly pipeline.
>
> Stap 1 — classifyIntent(description): Haiku (D-017)
>   Input: NL beschrijving van gebruiker
>   Output: TaskIntent {taskType, domain, complexity, estimatedAgentCount,
>           needsParallel, needsValidation, keywords, constraints}
>   System prompt bevat: task type definities, beschikbare patterns, presets
>
> Stap 2 — matchPatterns(intent): Pure TypeScript (geen LLM)
>   Scoring regels:
>     +0.3 category match (sequential→linear, parallel→parallel, etc.)
>     +0.2 node count range match
>     +0.1 per matching tag
>     +0.2 als intent.needsValidation en pattern heeft validation gates
>     -0.2 als "budget-sensitive" en costMultiplier > 3
>   Retourneer top 3 matches gesorteerd op score
>
> API: POST /api/assembly/generate (eerste 2 stappen)
> Tests: 10+ verschillende NL beschrijvingen
> ```

**Taken:**
- [x] `classifyIntent()` met Haiku
- [x] System prompt voor intent classificatie
- [x] `matchPatterns()` score-based matching (pure TypeScript)
- [x] `POST /api/assembly/generate` endpoint (stap 1+2)
- [x] Tests met 10+ NL beschrijvingen

### Fase 6b.2: Graph Generation + Frontend `[SEQ]` — na 6b.1

> **Prompt**:
> ```
> Bouw stap 3-5 van de assembly pipeline + frontend integratie.
>
> Stap 3 — generateGraph(intent, pattern, presets, modelProfiles): Sonnet
>   Genereert concrete CanvasConfig met:
>   - Node namen (niet "specialist-1" maar "Security Auditor")
>   - System prompts afgestemd op de taak
>   - Model selectie met justification
>   - Tool selectie per node
>   - Edges volgens pattern template
>
> Stap 4 — estimateCost(config): TypeScript
> Stap 5 — validateGraph(config): TypeScript
>
> Frontend:
> - GenerateBar.tsx: NL input veld boven het canvas
> - PatternLibrary.tsx: browseable pattern bibliotheek in sidebar (FR-19)
> - CostEstimatePanel.tsx: per-node en totaal cost visualisatie
> - Auto-layout met @dagrejs/dagre (D-019)
>
> E2E test: typ beschrijving → graph verschijnt op canvas
> ```

**Taken:**
- [x] `generateGraph()` met Sonnet
- [x] Cost estimator en graph validator in pipeline wiren
- [x] Auto-layout met `@dagrejs/dagre` (D-019)
- [x] `GenerateBar.tsx` — NL input boven canvas
- [x] `PatternLibrary.tsx` — browseable pattern bibliotheek
- [x] `CostEstimatePanel.tsx` — cost visualisatie
- [x] E2E test: NL beschrijving → graph op canvas

**Acceptatiecriteria:**
- "I want a team that reviews code for quality, security and performance" → dispatcher + 3 specialists + aggregator
- "Build a simple code analysis pipeline" → 2-3 node chain
- Cost estimate getoond bij elk gegenereerd graph
- Gebruiker kan gegenereerd graph bewerken na creatie
- Pattern library toont alle 35 patterns met diagrammen

---

## Sprint 6c: AI Assembly Assistant

**Doel**: Chat panel naast het canvas als kennispartner bij het assembleren (FR-18).

**Afhankelijk van**: Sprint 6b (assembly engine + knowledge base)

### Fase 6c.1: Backend + State Management `[SEQ]` — eerst

> **Prompt**:
> ```
> Bouw de AI Assistant backend en state management.
>
> Backend (assistant-engine.ts):
> - Context-aware system prompt die canvas state meeleest
> - Zes query modes: Explain, Suggest, Generate, Modify, Cost, Pattern
> - SSE streaming voor chat responses
> - CanvasAction types: add-node, remove-node, update-node, replace-all
> - POST /api/assistant/chat (SSE streaming)
> - POST /api/assistant/suggestions (passieve canvas analyse)
>
> Frontend state (Zustand):
> - assistantStore.ts: messages, isLoading, context, sendMessage(), applyAction()
> - useAssistant.ts hook
> - applyAction() dispatcht CanvasAction naar canvasStore
>
> Model: Sonnet voor alle queries (D-018)
> ```

**Taken:**
- [x] `assistant-engine.ts` met context-aware system prompts
- [x] `POST /api/assistant/chat` met SSE streaming
- [x] `POST /api/assistant/suggestions` voor passieve analyse
- [x] `assistantStore.ts` (Zustand)
- [x] `useAssistant.ts` hook
- [x] CanvasAction types + applyAction logic → canvasStore

### Fase 6c.2: Frontend UI `[SEQ]` — na 6c.1

> **Prompt**:
> ```
> Bouw de AssistantSidebar component.
>
> Layout: vast panel rechts van canvas, ~320px breed, inklapbaar
>
> Secties:
> 1. Context selector dropdown (neutral, code-review, security, ERPNext, custom)
> 2. Chat berichten (scrollable, user/assistant bubbles)
> 3. Inline suggestie kaarten met "Apply" knop
> 4. Cost estimate badge (altijd zichtbaar als canvas nodes heeft)
> 5. Input bar onderaan met send knop
>
> Bidirectionele sync:
> - Canvas → Assistant: canvasStore.getCanvasConfig() bij elke API call
> - Assistant → Canvas: "Apply" knop dispatcht CanvasAction naar canvasStore
>
> Integreer in App.tsx layout (sidebar rechts van canvas)
> E2E test: stel vragen, pas suggesties toe
> ```

**Taken:**
- [x] `AssistantSidebar.tsx` component
- [x] Chat message list (user/assistant bubbles)
- [x] Context selector dropdown
- [x] Inline suggestie kaarten met "Apply" knoppen
- [x] Cost estimate badge
- [x] Input bar met send knop
- [x] Collapse/expand toggle
- [x] Integratie in `App.tsx` layout
- [x] E2E test: vraag → antwoord → apply suggestie

**Acceptatiecriteria:**
- Assistant kan uitleggen wat de huidige canvas doet
- Assistant suggereert verbeteringen (ontbrekende validatie, dure models)
- "Add a security check" genereert een CanvasAction die een node toevoegt
- Cost estimate update bij canvas wijzigingen
- Context selector past expertise van de assistant aan

---

## Sprint 7: VS Code Extension

**Doel**: Open-Agents canvas als VS Code extension met MCP integratie naar Claude Code.

**Afhankelijk van**: Sprint 1 (werkend canvas)

> **Technische context** (uit research):
> - VS Code webviews ondersteunen React Flow (bewezen door code-canvas extension)
> - Claude Code extension ID: `anthropic.claude-code`
> - MCP is het officiële extensibility pad (geen direct inter-extension API)
> - draw.io embed hun hele web app in een VS Code webview (bewezen patroon)

### Fase 7.1: Extension Scaffolding `[SEQ]` — eerst

> **Prompt**:
> ```
> Scaffold een VS Code extension voor Open-Agents.
>
> Structuur (monorepo workspace):
> - packages/vscode-extension/ (extension host, TypeScript + tsup)
> - packages/vscode-webview/ (React + Vite, canvas UI)
>
> Extension features:
> - Command: "Open-Agents: Open Canvas" → opent webview panel
> - Command: "Open-Agents: New Agent" → opent Factory in webview
> - Activates on: workspaceContains (altijd beschikbaar)
> - Extension settings: API URL, default model, theme
>
> Webview setup:
> - React + Vite build output naar extension/media/
> - CSP headers correct ingesteld
> - retainContextWhenHidden: true (canvas state behouden)
> - postMessage bridge: extension ↔ webview communicatie
>
> Gebruik de yeoman generator: `yo code` als startpunt.
> ```

**Taken:**
- [x] Extension scaffolding met yeoman
- [x] Webview project (React + Vite)
- [x] Build pipeline (extension + webview)
- [x] postMessage bridge
- [x] VS Code commands registreren

### Fase 7.2: Canvas in Webview `[SEQ]` — na 7.1

> **Prompt**:
> ```
> Port de Open-Agents canvas UI naar de VS Code webview.
>
> 1. Neem de bestaande canvas component uit de standalone app
> 2. Bundle met Vite naar een single JS + CSS file
> 3. Laad in webview HTML met correcte CSP headers
> 4. Zorg dat drag-and-drop, zoom, pan, en node editing werkt
> 5. State sync: webview stuurt canvas changes via postMessage
>    naar extension host, die opslaat in workspace storage
>
> Test: open VS Code, run command "Open-Agents: Open Canvas",
> sleep 2 agent nodes, verbind ze, en export JSON.
> ```

**Taken:**
- [x] Canvas component porten
- [x] Vite bundle voor webview
- [x] CSP headers correct
- [x] State sync via postMessage
- [x] Workspace storage persistentie

### Fase 7.3: MCP Server `[PAR]` — parallel met 7.2

> **Prompt**:
> ```
> Bouw een MCP server die de Open-Agents extension exposeert aan Claude Code.
>
> MCP Tools:
> - get_agent_configs: retourneert alle agent configs als JSON
> - get_canvas_state: retourneert huidige canvas (nodes + edges)
> - create_agent: maakt een nieuwe agent aan (name, prompt, model, tools)
> - update_canvas: past canvas aan (voeg node toe, verwijder edge, etc.)
> - list_templates: toont beschikbare flow/pool templates
> - run_flow: triggert executie van huidige canvas configuratie
>
> Transport: stdio (gespawnd door de VS Code extension)
> Registreer in .claude/settings.json:
>   "mcpServers": { "open-agents": { "command": "node", "args": ["mcp-server.js"] } }
>
> Hiermee kan een gebruiker in Claude Code zeggen:
> "Maak een agent die code reviewed" → Claude roept create_agent tool aan
> → agent verschijnt op canvas in VS Code
> ```

**Taken:**
- [x] MCP server (stdio transport)
- [x] 6 MCP tools implementeren
- [x] Registratie in .claude/settings.json
- [x] Bidirectionele sync (MCP ↔ webview)

### Fase 7.4: Claude Code Integratie `[SEQ]` — na 7.2 + 7.3

> **Prompt**:
> ```
> Wire de VS Code extension, webview en MCP server aan elkaar.
>
> Flow:
> 1. Gebruiker opent Open-Agents canvas in VS Code
> 2. Gebruiker typt in Claude Code: "Bouw een code review pipeline"
> 3. Claude roept MCP tools aan: create_agent (3x) + update_canvas
> 4. Canvas in webview update real-time (MCP → extension → postMessage → webview)
> 5. Gebruiker ziet agents verschijnen op canvas
> 6. Gebruiker klikt "Run" op canvas → execution via backend API
>
> File watcher: als Claude Code bestanden wijzigt in agents/ directory,
> update het canvas automatisch.
>
> Test end-to-end en maak een demo video.
> ```

**Taken:**
- [x] MCP → Extension → Webview sync pipeline
- [x] File watcher op agents/ directory
- [x] End-to-end test
- [ ] Demo video

---

## Sprint 8: Frappe App

**Doel**: Open-Agents als Frappe app in ERPNext ecosysteem.

**Afhankelijk van**: Sprint 1 (werkend canvas)

### Fase 8.1: Frappe App Scaffolding `[SEQ]` — eerst

> **Prompt**:
> ```
> Maak een Frappe app wrapper voor Open-Agents.
>
> 1. `bench new-app open_agents` (of scaffold handmatig)
> 2. Embed de Open-Agents canvas als custom page in Frappe Desk
> 3. Frappe DocTypes:
>    - Agent Config (naam, model, prompt, tools)
>    - Execution Run (config_id, status, steps, output)
>    - Safety Rule (type, pattern, scope)
> 4. REST API endpoints via Frappe's @frappe.whitelist()
>
> De canvas UI wordt geladen als standalone SPA in een Frappe page,
> of via Vue Flow als Frappe Desk Vue-native is.
> ```

**Taken:**
- [x] Frappe app structuur
- [x] Custom DocTypes
- [x] Canvas embedding in Frappe Desk
- [x] Whitelisted API endpoints

### Fase 8.2: ERPNext Templates `[PAR]` — parallel met 8.1

> **Prompt**:
> ```
> Maak 5 ERPNext-specifieke agent templates.
>
> 1. Boekhouding Team (pool):
>    - Factuur Verwerker (verwerkt inkoopfacturen)
>    - BTW Calculator (berekent BTW aangifte)
>    - Rapportage Agent (genereert financiële rapporten)
>
> 2. Inkoop Pipeline (flow):
>    - Behoefte Analyst → Leverancier Matcher → Order Plaatser
>
> 3. HR Onboarding (flow):
>    - Contract Generator → Systeem Provisioner → Welkom Mailer
>
> 4. Project Monitor (pool):
>    - Uren Checker, Budget Tracker, Deadline Watcher
>
> 5. Admin Support (pool):
>    - Backup Monitor, Server Health, Log Analyzer
>
> Elke template bevat agent configs + canvas layout JSON.
> ERPNext API calls via MCP server (frappe.client.get_list, etc.)
> ```

**Taken:**
- [x] 5 ERPNext templates (JSON)
- [ ] MCP server voor ERPNext API
- [x] Template loader in Frappe app

---

## Sprint 9: Agent Library (Doorlopend)

**Doel**: 1000+ atomaire agents bouwen, georganiseerd per categorie (20 categorieën A-T). Elke agent doet één ding. Complexiteit ontstaat uit de architectuur (flows, pools), niet uit individuele agents. 1015 agents zijn reeds gedefinieerd in AGENTS.md.

**Afhankelijk van**: Sprint 2 (Factory portal voor het aanmaken)
**Loopt doorlopend**: Vult retroactief agents aan in elke sprint die ze nodig heeft.

**Referentiemodel**: Anthropic Agent Teams (`code.claude.com/docs/en/agent-teams`)
- Anthropic definieert agents met: duidelijke rol, eigen context window, spawn prompt
- Shared task list met self-claiming = ons Pool pattern
- Sequentiële dependencies = ons Flow pattern
- Plan approval workflow = onze gate nodes
- Quality hooks (`TeammateIdle`, `TaskCompleted`) = onze event triggers

> Zie `AGENTS.md` voor de volledige library van 1015 atomaire agent definities (20 categorieën A-T).

### Fase 9.1: Core Agents (10) `[SEQ]` — eerst, bij Sprint 2

> **Prompt**:
> ```
> Bouw de eerste 10 core agents voor de Open-Agents library.
>
> Elke agent is ATOMAIR — doet precies één ding. Definieer per agent:
> - id, name, category, description
> - input/output specificatie
> - model_hint (haiku voor classificatie/transformatie, sonnet voor generatie/analyse)
> - system_prompt (kort, gefocust, geen fluff)
> - tools (zo min mogelijk)
>
> Start met de meest universeel bruikbare agents:
> 1. summarize — vat tekst samen
> 2. translate — vertaalt tekst
> 3. explain-code — legt code uit
> 4. find-bugs — zoekt bugs
> 5. generate-test — schrijft unit tests
> 6. format-code — formatteert code
> 7. generate-commit-msg — genereert commit bericht uit diff
> 8. check-security — zoekt security issues
> 9. read-file — leest bestandsinhoud
> 10. search-in-files — doorzoekt bestanden
>
> Referentie: Anthropic Agent Teams model — elke agent is een onafhankelijke
> Claude Code sessie met eigen context window en duidelijke rol.
> Net als Anthropic's teammates: onafhankelijk, gespecialiseerd, combineerbaar.
>
> Sla op als individuele YAML bestanden in agents/library/core/.
> ```

**Taken:**
- [x] 10 core agent JSON bestanden (agents/library/core/)
- [x] Agent loader in backend (library-loader.ts, leest JSON, maakt beschikbaar via API)
- [x] Agents zichtbaar in Factory library met category filters

### Fase 9.2: Category Agents (40) `[PAR]` — parallel, bij Sprint 3-5

> **Prompt**:
> ```
> Bouw 40 extra agents verdeeld over 4 categorieën.
>
> Categorieën (10 per categorie):
> A. Text & Taal: detect-language, rewrite-formal, fix-grammar, extract-entities,
>    classify-sentiment, anonymize, extract-action-items, generate-title,
>    compare-texts, generate-questions
>
> B. Code & Development: detect-code-language, add-comments, generate-types,
>    generate-docstring, extract-function, rename-variable, convert-syntax,
>    generate-regex, detect-complexity, list-dependencies
>
> C. Review & Kwaliteit: check-style, check-accessibility, check-performance,
>    check-naming, check-dead-code, check-duplication, rate-readability,
>    check-test-coverage, check-documentation, validate-api-response
>
> D. Data & Transformatie: json-to-yaml, yaml-to-json, csv-to-json,
>    validate-json, validate-yaml, flatten-json, extract-schema,
>    transform-keys, filter-fields, merge-objects
>
> Zelfde atomaire definitie als Fase 9.1.
> Sla op in agents/library/{category}/ per categorie.
> ```

**Taken:**
- [x] `[PAR]` 10 Text & Taal agents (agents/library/text-language/)
- [x] `[PAR]` 10 Code & Development agents (agents/library/code-dev/)
- [x] `[PAR]` 10 Review & Kwaliteit agents (agents/library/review-quality/)
- [x] `[PAR]` 10 Data & Transformatie agents (agents/library/data-transform/)

### Fase 9.3: Specialist Agents (30) `[PAR]` — parallel, bij Sprint 5-8

> **Prompt**:
> ```
> Bouw 30 specialist agents verdeeld over 3 categorieën.
>
> E. Git & Versioning (8): summarize-diff, list-changed-files, check-conflicts,
>    generate-changelog, classify-commit, suggest-branch-name,
>    generate-pr-description, generate-commit-msg
>
> F. Research & Analyse (10): search-codebase, explain-error, find-examples,
>    analyze-architecture, compare-approaches, estimate-impact,
>    find-documentation, analyze-dependencies, profile-codebase,
>    suggest-next-step
>
> G. Communicatie & Rapportage (7): format-markdown, generate-report,
>    draft-email, create-checklist, format-table, generate-diagram-code,
>    create-status-update
>
> H. File & System (5): write-file, list-files, find-file, count-lines,
>    detect-filetype
>
> Sla op in agents/library/{category}/.
> ```

**Taken:**
- [x] `[PAR]` 8 Git & Versioning agents (agents/library/git-versioning/)
- [x] `[PAR]` 10 Research & Analyse agents (agents/library/research/)
- [x] `[PAR]` 7 Communicatie & Rapportage agents (agents/library/communication/)
- [x] `[PAR]` 5 File & System agents (agents/library/file-system/)

### Fase 9.4: ERPNext Agents (10) `[SEQ]` — bij Sprint 8

> **Prompt**:
> ```
> Bouw 10 ERPNext-specifieke atomaire agents.
>
> I. ERPNext & Business:
> 1. validate-doctype — valideert DocType JSON
> 2. generate-doctype — genereert DocType uit beschrijving
> 3. explain-doctype — legt DocType uit
> 4. generate-whitelisted-api — genereert Frappe API endpoint
> 5. validate-fixtures — valideert ERPNext fixtures
> 6. generate-print-format — genereert Jinja print format
> 7. check-permissions — analyseert permissie-matrix
> 8. generate-client-script — genereert JS client script
> 9. generate-report-query — genereert Script Report
> 10. validate-naming-series — valideert naming pattern
>
> Elke agent is atomair maar ERPNext-aware via system prompt.
> Sla op in agents/library/erpnext/.
> ```

**Taken:**
- [x] 10 ERPNext agent JSON bestanden (agents/library/erpnext/)
- [ ] ERPNext MCP server integratie (voor API calls naar ERPNext) — gepland voor latere iteratie

### Fase 9.5: Flow & Pool Templates `[SEQ]` — na 9.1-9.4

> **Prompt**:
> ```
> Maak 10 voorgebouwde flow- en pool-templates die atomaire agents combineren
> tot krachtige workflows. Dit demonstreert de kernfilosofie: individuele
> agents zijn simpel, de architectuur maakt ze krachtig.
>
> Flows:
> 1. Code Review Pipeline: read-file → detect-code-language → check-style →
>    find-bugs → check-security → summarize
> 2. Smart Translator: detect-language → translate → fix-grammar → rewrite-formal
> 3. PR Assistant: list-changed-files → summarize-diff → generate-commit-msg →
>    generate-pr-description
> 4. Bug Fixer: explain-error → search-codebase → suggest-fix → generate-test →
>    generate-commit-msg
> 5. Documentation Generator: analyze-architecture → list-files →
>    generate-docstring → format-markdown → generate-diagram-code
>
> Pools:
> 6. Multi-Reviewer: read-file → [check-style, check-security, check-performance,
>    check-naming] → summarize
> 7. ERPNext Feature Builder: generate-doctype → [generate-whitelisted-api,
>    generate-client-script, generate-print-format] → validate-doctype →
>    generate-test
> 8. Security Audit: list-files → per bestand [check-security, find-bugs] →
>    generate-report
> 9. Codebase Profiler: list-files → [profile-codebase, analyze-dependencies,
>    analyze-architecture] → generate-report
> 10. Onboarding Assistant: explain-code → generate-questions →
>     create-checklist → format-markdown
>
> Sla op als JSON canvas configs in templates/ directory.
> ```

**Taken:**
- [x] 5 flow templates (templates/flows/)
- [x] 7 pool templates (templates/pools/)
- [x] Templates laden via Factory portal (template-loader.ts scant flows/ + pools/)

### Retroactieve Vulling per Sprint

| Sprint | Agents die het nodig heeft | Fase |
|--------|---------------------------|------|
| Sprint 2 (Factory) | 10 core agents als presets | 9.1 |
| Sprint 3 (Flow) | Flow-ready agents (text, code) | 9.2 |
| Sprint 4 (Pool) | Pool-ready agents (review, analyse) | 9.2 |
| Sprint 5 (Safety) | Security agents | 9.2 |
| Sprint 6 (Semantisch) | Alle agents als keuzemenu | 9.1-9.4 |
| Sprint 7 (VS Code) | Core agents beschikbaar via MCP | 9.1 |
| Sprint 8 (Frappe) | ERPNext agents | 9.4 |

---

## Sprint 10: Refactor & Consolidatie

**Doel**: Refactor, opschonen en consolideren van alles wat in de eerste Scrum iteratie (Sprint 1-9) is gebouwd. Technische schuld aflossen, patronen standaardiseren, performance optimaliseren.

**Afhankelijk van**: Sprint 1-9 (alles)

### Fase 10.1: Code Audit `[SEQ]` — eerst

> **Prompt**:
> ```
> Voer een volledige code audit uit op het Open-Agents project.
>
> Analyseer:
> 1. Code duplicatie: vind herhaalde patronen die naar shared utilities kunnen
> 2. Naamgeving inconsistenties: variables, functies, bestanden
> 3. Type safety: ontbrekende types, any-types, onveilige casts
> 4. Error handling: onafgehandelde errors, missing try/catch
> 5. API consistentie: endpoint naamgeving, response formats, status codes
> 6. Frontend component structuur: te grote componenten, ontbrekende memoization
> 7. Test coverage: ontbrekende tests, flaky tests
> 8. Security: hardcoded secrets, SQL injection, XSS, OWASP top-10
> 9. Performance: onnodige re-renders, N+1 queries, grote bundles
> 10. Documentatie: ontbrekende JSDoc, verouderde comments
>
> Genereer een rapport met prioriteit (P1 = kritiek, P2 = belangrijk, P3 = nice-to-have).
> Sla op als docs/audit/sprint-1-audit.md
> ```

**Taken:**
- [x] Code audit rapport genereren (P1/P2/P3: backend 26 issues, frontend ~50 issues, shared Grade A)
- [ ] Issues aanmaken in GitHub per P1/P2 finding

### Fase 10.2: Refactor `[PAR]` — parallel tracks

> **Prompt (Backend)**:
> ```
> Refactor de Open-Agents backend op basis van het audit rapport.
>
> Focus op:
> 1. Gedeelde utilities extraheren (error handling, validation, response formatting)
> 2. API endpoint naamgeving standaardiseren (RESTful conventies)
> 3. Database queries optimaliseren
> 4. Middleware pattern toepassen (auth, logging, error handling)
> 5. Type safety verbeteren (geen `any` types)
> 6. Environment configuration centraliseren
>
> Geen nieuwe features. Alleen opschonen en standaardiseren.
> ```

> **Prompt (Frontend)**:
> ```
> Refactor de Open-Agents frontend op basis van het audit rapport.
>
> Focus op:
> 1. Component decomposition: grote componenten opsplitsen
> 2. State management opschonen (geen prop drilling)
> 3. Shared hooks extraheren
> 4. Consistent styling (design tokens, CSS variables)
> 5. Accessibility verbeteren (ARIA labels, keyboard navigation)
> 6. Bundle size optimaliseren (lazy loading, tree shaking)
>
> Geen nieuwe features. Alleen opschonen en standaardiseren.
> ```

**Taken:**
- [x] `[PAR]` Backend refactor (SSE utilities, KnowledgeRegistry singleton, assemblyRoutes fix, type consolidatie)
- [x] `[PAR]` Frontend refactor (getNodeBorderStyle extractie, nodeBorderStyle DRY across 3 node components)
- [x] `[PAR]` Test suite uitbreiden voor gerefactorde code (155 tests groen, 15 test commando's)
- [ ] `[PAR]` API documentatie bijwerken (OpenAPI/Swagger) → v0.2.0

### Fase 10.3: Consolidatie & Release Prep `[SEQ]` — na 10.2

> **Prompt**:
> ```
> Consolideer het Open-Agents project voor eerste release.
>
> 1. README.md herschrijven: installatie, quick start, screenshots, architectuur
> 2. CONTRIBUTING.md aanmaken: code conventies, PR process, development setup
> 3. CHANGELOG.md genereren uit git history
> 4. Alle DECISIONS.md open beslissingen reviewen en sluiten waar mogelijk
> 5. ROADMAP.md updaten met retrospective van eerste iteratie
> 6. Docker-compose productie config testen
> 7. CI/CD pipeline: lint, test, build, deploy
> 8. Versie 0.1.0 taggen en release notes schrijven
> ```

**Taken:**
- [x] README.md herschrijven (features, architectuur, API endpoints, setup)
- [ ] CONTRIBUTING.md aanmaken → v0.2.0
- [x] CHANGELOG.md genereren (Keep a Changelog format, Sprint 1-10)
- [x] Open beslissingen reviewen (D-043, D-044 toegevoegd en gesloten)
- [x] CI/CD pipeline opzetten (GitHub Actions: typecheck, test, build)
- [x] v0.1.0 release (git tag, CHANGELOG, DECISIONS updates)

### Acceptatiecriteria Sprint 10

- Geen P1 of P2 audit findings open
- Alle tests slagen
- API documentatie compleet en actueel
- README met werkende installatie-instructies
- Docker-compose start zonder errors
- Bundle size < target (te bepalen)
- Lighthouse accessibility score > 90
- v0.1.0 getagd en release notes geschreven

---

## Doorlopende Activiteiten

| Activiteit | Frequentie | Uitvoering |
|-----------|------------|------------|
| Agent library uitbreiden (doel: 1000+) | Elke sprint | `[PAR]` altijd |
| Community templates verzamelen | Vanaf Sprint 3 | `[PAR]` altijd |
| User testing met niet-technische gebruikers | Elke sprint | `[SEQ]` na sprint deliverables |
| API documentatie bijwerken (OpenAPI/Swagger) | Elke sprint | `[PAR]` altijd |
| Security review | Elke 2 sprints | `[SEQ]` na sprint deliverables |

---

## Prompt Gebruik Instructies

De prompts in dit document zijn ontworpen om te kopiëren naar een Claude Code sessie.

**Voor elke prompt:**
1. Open een nieuwe Claude Code sessie in de Open-Agents workspace
2. Kopieer de prompt
3. Laat Claude Code het uitvoeren
4. Review het resultaat
5. Commit als alles werkt

**Parallel uitvoering:**
- `[PAR]` taken kunnen in **aparte Claude Code sessies** tegelijk draaien
- Gebruik aparte terminal tabs of VS Code vensters
- Zorg dat ze niet dezelfde bestanden wijzigen

**Sequentieel:**
- `[SEQ]` taken moeten wachten tot dependencies klaar zijn
- Check dat de vorige fase gecommit en werkend is

---

## Sprint 11: VS Code Bridge & Terminal Agents

**Status**: In Progress
**Bron**: Gemigreerd van `Open-VSCode-Controller` repository
**Migratie-instructies**: Zie `MIGRATION-VSCODE-BRIDGE.md`

### Context

Open-Agents had tot nu toe één manier om agents uit te voeren: via de Anthropic API (ClaudeSDKRuntime). Sprint 11 voegt een tweede runtime toe: **echte Claude Code CLI sessies** in VS Code terminals. Dit geeft agents toegang tot het volledige filesystem, tools (Read/Write/Edit/Bash), en werkt met de gebruiker's Claude subscription — geen API key nodig.

De code komt uit het `Open-VSCode-Controller` project dat als apart prototype is ontwikkeld en nu wordt geïntegreerd als `packages/vscode-bridge`.

### Architectuur

```
Open-Agents Frontend (:5173)
        ↕ HTTP
Open-Agents Backend (:3001)
   ├─ ClaudeSDKRuntime   → Anthropic API (bestaand)
   ├─ OpenAIRuntime       → OpenAI API (bestaand)
   ├─ MistralRuntime      → Mistral API (bestaand)
   ├─ OllamaRuntime       → Local Ollama (bestaand)
   └─ ClaudeCLIRuntime    → VS Code Bridge (NIEUW)
        ↕ HTTP + WebSocket
VS Code Extension Host (:7483)  ← headless backend
   ├─ HTTP Bridge (35+ endpoints)
   ├─ WebSocket events (real-time)
   ├─ MCP Server (25 tools)
   └─ Agent Orchestrator
        ↕ Terminal
   Claude CLI sessies (interactief, zichtbaar)
```

### Taken

**[SEQ] Taak 11.1: Package migratie**
> Kopieer `Open-VSCode-Controller/packages/vscode-extension` naar `packages/vscode-bridge`. Update package.json naam naar `@open-agents/vscode-bridge`. Merge shared types (bridge events, agent types, constants) naar `@open-agents/shared`.

**[SEQ] Taak 11.2: Launch configuratie**
> Maak `.vscode/launch.json` entry voor bridge Extension Host. Kopieer `test-workspace/` met headless settings.

**[PAR] Taak 11.3: ClaudeCLIRuntime (al gedaan)**
> `packages/backend/src/runtimes/claude-cli.ts` — runtime adapter die agents spawnt via bridge. Registratie in `server.ts` met bridge health check.

**[PAR] Taak 11.4: Frontend bridge integratie (al gedaan)**
> `bridgeService.ts` — health check + WebSocket events. `ConnectionIndicator.tsx` — blauw bridge status bolletje.

**[PAR] Taak 11.5: cli/claude model type (al gedaan)**
> `ModelProvider` uitgebreid met `"cli"`. `ModelId` uitgebreid met `"cli/claude"`.

**[SEQ] Taak 11.6: CLI tool migreren**
> `vscode-ctrl` CLI integreren als script of apart package. `init` command voor workspace bootstrap.

**[SEQ] Taak 11.7: E2E verificatie**
> F5 → bridge start → `pnpm dev` → backend detecteert bridge → canvas agent met `cli/claude` → terminal opent → result verschijnt in UI.

### Voortgang

**Gedaan:**
- [x] Shared types mergen — `shared.ts` in `packages/vscode-bridge/src/` re-exporteert alle bridge types van `@open-agents/shared`
- [x] test-workspace migreren — `test-workspace/` bestaat met `CLAUDE.md` + `README.md`
- [x] CLI tool integreren — `cli.ts` bestaat (68 regels) met bridge status check

**Pending:**
- [ ] E2E verificatie: canvas → cli/claude agent → terminal → result

### Wat ClaudeCLIRuntime anders maakt dan ClaudeSDKRuntime

| | ClaudeSDKRuntime | ClaudeCLIRuntime |
|---|---|---|
| **Executie** | API call via Anthropic SDK | Echte `claude` CLI in terminal |
| **Auth** | API key (BYOK) | Claude subscription (OAuth) |
| **Tools** | SDK tool use | Read, Write, Edit, Bash (filesystem) |
| **Zichtbaarheid** | Onzichtbaar (API) | Live terminal, gebruiker kan meekijken |
| **Filesystem** | Geen directe toegang | Volledige toegang via VS Code |
| **Model selector** | `anthropic/claude-sonnet-4-6` | `cli/claude` |

---

## Sprint 12: CLI Agentic Layer (oa-cli)

**Status**: Done
**Beslissingen**: D-045, D-046, D-047
**Architectuur**: claude-code-agentic-layer.md
**Prompts**: open-agents-prompts.md

### Context

De bestaande Open-Agents codebase draait agents via API (ClaudeSDKRuntime). Sprint 12 voegt een fundamenteel andere aanpak toe: **directe Claude Code CLI sessies** georkestreerd via tmux. Dit draait op je subscription — geen API tokens, geen kosten per call. Temp folders als isolatie, CLAUDE.md als context mechanisme.

### Architectuur

```
Gebruiker
    │
    ▼
oa CLI (Python/typer)
    │
    ├── oa start → tmux session "oa"
    ├── oa run   → temp workspace + CLAUDE.md + tmux window + claude CLI
    ├── oa status → ~/.oa/agents.json → rich tabel
    ├── oa dashboard → Textual TUI (live monitoring)
    ├── oa pipeline → planner → subtasks → combiner
    └── oa kill/collect/clean → lifecycle management
```

### Prompt 1: Core CLI

> **Prompt**: Zie `open-agents-prompts.md` Prompt 1
>
> Bouw een terminal-applicatie genaamd "open-agents" — een orchestrator die Claude Code CLI sessies aanstuurt via tmux.

**Taken:**
- [x] `[PAR]` pyproject.toml + projectstructuur (oa-cli/src/open_agents/)
- [x] `[PAR]` state.py — ~/.oa/agents.json CRUD
- [x] `[PAR]` workspace.py — temp folder + CLAUDE.md builder
- [x] `[PAR]` orchestrator.py — agent lifecycle via tmux (spawn, check, kill, clean)
- [x] `[PAR]` monitor.py — rich status tabel
- [x] `[SEQ]` cli.py — 7 typer commando's (start, run, status, dashboard, kill, collect, clean, version)
- [x] `[SEQ]` pip install -e . + testen

### Prompt 2: Textual TUI + Pipeline

> **Prompt**: Zie `open-agents-prompts.md` Prompt 2
>
> Upgrade het dashboard naar Textual TUI en voeg multi-agent pipeline toe.

**Taken:**
- [x] `[PAR]` textual>=0.80 dependency
- [x] `[PAR]` orchestrator.py — `capture_agent_output()` + `workspace` param op `spawn_agent()`
- [x] `[SEQ]` dashboard.py — Textual app: DataTable + DetailPanel, 60/40 split, auto-refresh, key bindings
- [x] `[SEQ]` pipeline.py — 4-fase pipeline: planner → parse → parallel subtasks → combiner
- [x] `[SEQ]` cli.py — dashboard() herwired + pipeline() commando
- [x] `[SEQ]` pip install -e . + testen

### Prompt 3 (Gepland): Polish + Templates

> `oa attach`, workspace templates (YAML), history & replay

### Acceptatiecriteria Sprint 12

- [x] `oa --help` toont 9 commando's
- [x] `oa start` + `oa run "test"` spawnt agent in tmux
- [x] `oa status` toont agent tabel
- [x] `oa dashboard` start Textual TUI
- [x] `oa pipeline "complexe taak"` draait planner → subtasks → combiner
- [x] Alle Python imports succesvol
- [x] `pip install -e .` zonder errors

---

---

## Sprint 13: Docker Isolation + Non-Claude Tool Use

**Status**: Planned
**Doel**: De twee grootste technische schulden uit v0.1.0 oplossen: container isolatie per agent (D-040) en echte tool use voor non-Claude runtimes (D-032).

**Afhankelijk van**: Sprint 10 (v0.1.0 release)

### Prioriteit & Rationale

Twee open problemen blokkeren productie-inzet:
1. **D-040 (Container Isolation)**: Agents draaien nu in-process op de backend (blast radius = volledige host). Autonomous-first model vereist container grenzen voor veiligheid.
2. **D-032 (Non-Claude Tool Use)**: OpenAI, Mistral en Ollama adapters ondersteunen geen tool use — alleen tekst in/uit. Beperkt het platform tot Claude-only voor echte agentic workflows.

### Fase 13.1: Docker Container Isolation (D-040) `[SEQ]` — eerst

> **Prompt**:
> ```
> Implementeer D-040 (autonomous-first agent execution met container isolation).
>
> Refactor de execution engine: runtime.execute() start nu een Docker container
> i.p.v. een in-process call. Vier isolatie-dimensies per container:
>
> 1. Filesystem: temp workspace als Docker volume mount (read/write).
>    Agent config als read-only mount. Workspace weggegooid na run.
> 2. Network: default geen outbound. Whitelist per agent config (bv. api.github.com).
> 3. Secrets: API keys als env vars geïnjecteerd bij container start.
> 4. Resources: Docker --memory en --cpus limits + hard timeout (default 5 min).
>
> Bouw voort op D-024 (6-layer workspace stack) en D-101 (Docker per agent).
>
> Zie DECISIONS.md D-040 Details voor de volledige spec.
> ```

**Taken:**
- [ ] Docker runtime adapter (`docker-runtime.ts`) — container start, logs streamen, cleanup
- [ ] Workspace builder uitbreiden voor Docker volume mount
- [ ] Network policy configuratie per agent (whitelist in agent JSON)
- [ ] Resource limits configuratie (memory, CPU, timeout)
- [ ] Secret injection via Docker env vars (vervang directe .env injectie)
- [ ] Output capture: artifacts uit container halen na afloop
- [ ] Execution engine refactor: `runtime.execute()` delegeert naar docker-runtime
- [ ] Canvas UX: geen permission modals, status indicators: running → completed/failed
- [ ] Safety settings refactor: tool blacklists → container policies (D-035 revisit)
- [ ] Tests voor Docker runtime adapter

### Fase 13.2: Non-Claude Runtime Tool Use (D-032) `[PAR]` — parallel met 13.1

> **Prompt**:
> ```
> Hef de D-032 PoC-beperking op: voeg echte tool use toe voor non-Claude runtimes.
>
> Huidige situatie: OpenAI, Mistral en Ollama adapters gebruiken raw fetch() en
> ondersteunen geen tool use (tekst in/tekst uit).
>
> Doel: alle adapters ondersteunen de AgentRuntime interface volledig, inclusief
> tool use, multi-turn loops en streaming events.
>
> Per adapter:
> - OpenAI: function calling API (tools parameter)
> - Mistral: tool_calls in chat completions
> - Ollama: tool_calls voor lokale modellen die dat ondersteunen
>
> Behoud backwards-compatibiliteit: agents zonder tools blijven werken.
> Voeg integratie tests toe per adapter.
> ```

**Taken:**
- [ ] OpenAI adapter: function calling integratie
- [ ] Mistral adapter: tool_calls integratie
- [ ] Ollama adapter: tool_calls (conditioneel, alleen ondersteunde modellen)
- [ ] AgentRuntime interface uitbreiden met tool definitions
- [ ] Tool result handling in execution engine
- [ ] Integratie tests per adapter
- [ ] Canvas: model selector toont welke adapters tool use ondersteunen

---

## Sprint 14: Agent Library Scale-up

**Status**: Planned
**Doel**: Van 90 naar 300+ agents. Focus op de 10 nog niet geïmplementeerde categorieën (J-T) uit AGENTS.md.

**Afhankelijk van**: Sprint 9 (library infrastructuur werkend)
**Loopt doorlopend**: Vult retroactief agents aan.

### Context

De library heeft 90 agents (categorieën A-I). Nog te implementeren: categorieën J-T (10 categorieën, ~900 agents). Doel is 1000+ atomaire bouwblokken.

### Fase 14.0: Critical Bug Fixes (Issues #9, #10, #11, #12, #22)

> Voeg toe VÓÓR de library scale-up — deze bugs breken kernfunctionaliteit.

**Agent Tool Blokkade (#9 + #11):**
- [ ] Inject `settings.json` block dat Agent tool uitschakelt per oa-agent (`"permissions": {"deny": ["Agent"]}`)
- [ ] Voeg `--can-spawn` flag toe aan `oa run` (agent als orchestrator configureren met PATH + oa instructies)
- [ ] Integration test: delegatie → child agents zichtbaar in `oa status`
- [ ] GitHub: close #9, close #11

**Direct Write Default (#10):**
- [ ] Maak `--direct` default gedrag in `oa run` (voeg `--tmp` toe als opt-out)
- [ ] Upgrade `oa collect` om bestanden in `output/` te tonen/kopiëren
- [ ] GitHub: close #10

**Structured Prompt Templates (#12):**
- [ ] Voeg `--template <name>` flag toe aan `oa run`
- [ ] Maak `~/.oa/prompt-templates/` met L-010 structured templates (skill-research, code-worker, planner)
- [ ] Voeg prompt-validator toe die waarschuwt bij ontbrekende L-010 elementen
- [ ] GitHub: close #12

**Skill System per Agent Type (#22):**
- [ ] Skill loader in `orchestrator.py` — `oa run --type <type>` laadt bijbehorende skills uit `agents/{type}/skills/`
- [ ] `shared-skills/` directory voor cross-agent herbruikbare kennis
- [ ] GitHub: close #22

**Prioriteit voor Sprint 14 (eerste 200 agents):**

| Categorie | Agents | Focus |
|-----------|:------:|-------|
| J. Infrastructure & DevOps | 50 | Docker, CI/CD, cloud, monitoring |
| K. Testing & QA | 50 | Unit, integration, E2E, performance tests |
| L. API & Integration | 50 | REST, GraphQL, webhook, OAuth flows |
| M. Database & Data | 50 | SQL, migrations, schema, queries |

> **Prompt**:
> ```
> Bouw 200 agents in categorieën J-M voor de Open-Agents library.
> Gebruik dezelfde atomaire JSON structuur als categorieën A-I.
> Voeg `maturity` veld toe (D-042): prompt-template | tool-capable | autonomous.
>
> Per categorie: 50 agents verdeeld over subcategorieën.
> Sla op in agents/library/{category}/ per categorie.
> Update AGENTS.md met nieuwe definities.
> ```

**Taken:**
- [ ] 50 Infrastructure & DevOps agents (agents/library/infra-devops/)
- [ ] 50 Testing & QA agents (agents/library/testing-qa/)
- [ ] 50 API & Integration agents (agents/library/api-integration/)
- [ ] 50 Database & Data agents (agents/library/database-data/)
- [ ] Maturity veld toevoegen aan alle bestaande 90 agents (D-042)
- [ ] Library filter UI: filter op maturity niveau
- [ ] Groeipad dashboard: hoeveel agents op welk maturity niveau?

---

## Sprint 15: oa-cli × packages/ Convergentie

**Status**: Planned
**Doel**: oa-cli als alternatieve execution backend voor het visuele platform. Één platform, drie execution runtimes (API, CLI, Tmux).

**Afhankelijk van**: Sprint 12 (oa-cli werkend), Sprint 11 (VS Code bridge)

### Context

Nu zijn er drie onafhankelijke execution paths:
- **packages/backend**: API-based via ClaudeSDKRuntime (Sprint 1-10)
- **packages/vscode-bridge**: VS Code CLI via bridge (Sprint 11)
- **oa-cli**: Tmux-based Python CLI (Sprint 12)

Sprint 15 verbindt deze: het canvas kan kiezen welke runtime een agent uitvoert.

> **Prompt**:
> ```
> Verbind oa-cli als execution runtime voor het Open-Agents visuele platform.
>
> Doel: canvas agent met model selector "tmux/claude" gebruikt oa-cli als backend.
>
> 1. OaCLIRuntime adapter in packages/backend/src/runtimes/oa-cli.ts
>    - Spawnt agent via `oa run "<task>"` commando
>    - Pollt ~/.oa/agents.json voor status updates
>    - Streamt output via SSE naar frontend
>
> 2. "tmux/claude" als nieuwe ModelProvider + ModelId in shared types
>
> 3. Flask bridge uitbreiden: oa web UI kan canvas configs ontvangen
>
> 4. Canvas model selector toont: API, CLI (bridge), Tmux als opties
> ```

**Taken:**
- [ ] `OaCLIRuntime` adapter (`packages/backend/src/runtimes/oa-cli.ts`)
- [ ] `tmux/claude` ModelProvider + ModelId in shared types
- [ ] Status polling vanuit agents.json naar SSE stream
- [ ] Flask bridge: POST /api/canvas endpoint voor canvas config ontvangen
- [ ] Canvas model selector: drie runtime opties visueel
- [ ] E2E test: canvas → tmux/claude agent → oa-cli → result in UI

---

## Sprint 16: Google A2A Protocol Evaluatie

**Status**: Planned
**Doel**: Evalueer Google's Agent-to-Agent (A2A) protocol als mogelijke interoperabiliteitsstandaard.

**Afhankelijk van**: Sprint 13 (Docker isolation stabiel)

### Context

Google A2A is een open protocol voor agent-to-agent communicatie (2025). Mogelijke voordelen:
- Standaard interface voor cross-platform agent orchestratie
- Interoperabiliteit met Google Vertex AI agents, ADK agents
- Alternatief voor onze proprietary JSON config + SSE aanpak

> **Prompt**:
> ```
> Evalueer het Google A2A protocol voor integratie in Open-Agents.
>
> 1. Research: lees de A2A spec en vergelijk met onze huidige architectuur
> 2. PoC: bouw een minimale A2A server die één Open-Agents agent exposeert
> 3. Test: roep de agent aan via een A2A-compatible client
> 4. Beslissing: A) Volledig adopteren B) Gedeeltelijk (naast eigen protocol) C) Niet adopteren
>
> Documenteer bevindingen in DECISIONS.md als D-051.
> ```

**Taken:**
- [ ] A2A spec analyse (vergelijking met huidige canvas JSON + SSE)
- [ ] PoC A2A server adapter (één agent als A2A service)
- [ ] Test met A2A-compatible client
- [ ] Beslissing D-051 documenteren in DECISIONS.md
- [ ] Migratie pad definiëren als A2A geadopteerd wordt

---

## Sprint 17: oa-cli Agent Teams Patterns

**Status**: In Progress (58%) — messaging/teams/CLI volledig; hooks, graceful shutdown, tests, TUI/web nog open
**Doel**: Agent Teams patterns (L-022 t/m L-029) implementeren in oa-cli. Gebaseerd op Claude Code Agent Teams referentie-architectuur.

**Afhankelijk van**: Sprint 12 (oa-cli basis Done)
**Beslissing**: D-052

### Context

Claude Code Agent Teams (experimenteel) implementeert 6 patronen die oa-cli mist:
1. Shared task list met file locking (agents claimen taken, dependencies blokkeren)
2. Inter-agent messaging (DM + broadcast, niet alleen lead ← worker)
3. Graceful shutdown protocol (request → approve/reject)
4. Task dependencies met automatisch unblocking
5. Quality hooks (TeammateIdle, TaskCompleted)
6. Team discovery via config file

Bron: https://code.claude.com/docs/en/agent-teams

> **Prompt**:
> ```
> Je bent de oa-cli architect. Implementeer Agent Teams patterns in de oa-cli
> Python codebase (oa-cli/src/open_agents/).
>
> Referentie: Claude Code Agent Teams docs. Lees LESSONS.md (L-022 t/m L-029)
> en DECISIONS.md (D-052) voor context.
>
> Implementeer in deze volgorde:
> 1. Shared task list: ~/.oa/tasks/<team>/ met JSON files, file locking bij claim
> 2. Task dependencies: blockedBy veld, automatisch unblocking bij complete
> 3. Inter-agent messaging: ~/.oa/messages/<agent>/ mailbox, DM + broadcast
> 4. Team config: ~/.oa/teams/<team>/config.json met members array
> 5. Graceful shutdown: oa shutdown <naam> met approve/reject protocol
> 6. Quality hooks: on_idle en on_task_complete callbacks
>
> CLI commando's toevoegen:
> - oa team create <naam>     — team aanmaken
> - oa team list               — teams tonen
> - oa team delete <naam>      — team opruimen
> - oa task create "<taak>"    — taak toevoegen aan team
> - oa task list                — taken tonen met status
> - oa task claim <id>          — taak claimen (met locking)
> - oa msg <agent> "<tekst>"   — bericht sturen naar agent
> - oa broadcast "<tekst>"     — bericht naar alle agents in team
> - oa shutdown <naam>          — graceful shutdown request
>
> Bestaande code niet breken. Bouw voort op ~/.oa/agents.json state.
> Tests schrijven in oa-cli/tests/.
> ```

**Voltooide taken:**
- [x] Shared task list module (`task_list.py`) — CRUD + file locking + JSON storage in `~/.oa/tasks/<team>/`
- [x] Inter-agent messaging (`messaging.py`) — mailbox per agent, DM + broadcast (send/inbox/broadcast werkend)
- [x] Team config (`teams.py`) — create/list/delete, members array, `~/.oa/teams/<team>/config.json`
- [x] CLI commando's: `oa team`, `oa task`, `oa send`, `oa inbox`, `oa broadcast`

**Pending:**
- [ ] Task dependencies — `blockedBy` veld, auto-unblock bij status=completed
- [ ] Graceful shutdown protocol — request/approve/reject via messaging
- [ ] Quality hooks (`hooks.py`) — on_idle, on_task_complete met configureerbare callbacks
- [ ] AgentRecord uitbreiden: `team` veld, `mailbox_path`
- [ ] Workspace CLAUDE.md template: team context meegeven aan agents
- [ ] Tests voor task list, messaging, team management
- [ ] TUI dashboard: team view met task status en agent communicatie
- [ ] Web UI: team overzicht pagina

**Structured Handoff Protocol (Issue #21):**
- [ ] Definieer `handoff.yaml` schema (from, to, type, task, deliverables, success_criteria)
- [ ] Planner genereert automatisch `handoff.yaml` bij worker-toewijzing
- [ ] Worker valideert handoff bij ontvangst (context_files aanwezig? criteria concreet?)
- [ ] `oa handoffs <pipeline-id>` voor traceerbaarheid
- [ ] GitHub: close #21

---

## Sprint 18: Dashboard UI & CSS Design Tokens — In Progress (80%)

**Status**: In Progress (80%) — Wave 1 compleet; integration tests, API wiring, Wave 2 nog open
**Doel**: Refactor van React web UI (oa-cli/web/) met design tokens, ErrorBoundary/ToastProvider, en visuele pipeline-triggers.
**Afhankelijk van**: Sprint 12 (oa-cli)
**Beslissingen**: zie D-050 (React SPA), D-048 (3 interfaces)

### Voltooide taken

- [x] ErrorBoundary.tsx component (error fallback, error logging, recovery)
- [x] ToastProvider.tsx component + useToast hook (context-based toast notifications)
- [x] PipelinePanel.tsx component (visuele pipeline trigger UI + live status polling)
- [x] TaskBoard.tsx component (kanban bord per team: todo/in_progress/done kolommen)
- [x] Dashboard refactor — 11 React componenten (ConnectionIndicator, ExecutionToolbar, OutputPanel, StatusColors, etc.)
- [x] CSS design token refactoring (hardcoded kleuren → `--token` variabelen, TailwindCSS integration)
- [x] Design docs gecommit (webapp-masterplan-raw.md, webapp-sprint-plan.md, bridge-api-design.md)
- [x] app.tsx gewrapped met ToastProvider en ErrorBoundary per tab

### Pending

- [ ] Integration tests voor ErrorBoundary + ToastProvider
- [ ] PipelinePanel API integration + polling logic volledig verbinden
- [ ] TaskBoard API endpoints en dataflow (ontbrekende endpoints: zie Web UI Sprint Plan)
- [ ] CSS token audit — zorgen dat alle 11 componenten consistent zijn

### Web UI Sprint Plan (gedetailleerd — 3 fasen)

Zie de uitgebreide fasering (F1/F2/F3 taken) in de sectie **Web UI Sprint Plan (2026-03-10)** verderop in dit document.

---

## Sprint 19: Session Persistence — Done ✅

**Status**: Done (2026-03-11)
**Doel**: Automatische sessie-herstel na crash, detach of intentionele stop. Dual safety net: tmux hook + periodic guardian.
**Afhankelijk van**: Sprint 12 (oa-cli), Sprint 17 (hooks.py events)
**Beslissingen**: D-055 (Session Persistence Architecture), D-056 (Session Resume UX)

### Voltooide taken

- [x] `session.py` — lock file, heartbeat, shutdown detection
- [x] `session_store.py` — session records CRUD (`~/.oa/sessions/`)
- [x] `session_cleanup.py` — tmux hook entry point
- [x] `session_guardian.py` — periodic checkpoint daemon
- [x] `notify.py` — cross-platform desktop notifications
- [x] `config.py` — on_disconnect settings
- [x] `hooks.py` — 3 nieuwe events (session_start, session_end, session_resume)
- [x] `tmux.py` — guardian window, detach hook registratie
- [x] `cli.py` — `oa start` resume flow, `oa stop` 5-phase shutdown, `oa session` subcommando's

### Pending (nice-to-have)

- [ ] Integration tests voor session persistence
- [ ] Delegation fix end-to-end testing

---

## Sprint Prompt Relevantie Beoordeling

> **Vraag**: Zijn de bestaande sprint prompts (Sprint 1-10) nog relevant voor latere sprints?

### Conclusie

| Sprint | Prompts | Relevantie voor toekomstige sprints |
|--------|---------|-------------------------------------|
| Sprint 1-9 | Implementatie prompts | **Historisch** — code is af, prompts niet meer uitvoeren |
| Sprint 10 | Refactor prompts | **Gedeeltelijk** — patterns bruikbaar voor Sprint 13 refactor werk |
| Sprint 11 | Bridge migratie | **Actief** — taken 11.1, 11.2, 11.6, 11.7 nog open |
| Sprint 12 | oa-cli prompts | **Referentie** — architectuur beschrijft werkend systeem |
| Sprint 13+ | Nieuwe prompts | **Uitvoeren** — deze sectie bevat de prompts |

**Aanbeveling**: Sprint 1-9 prompts zijn historisch document. Niet hergebruiken voor nieuwe sprints — contexten zijn veranderd (meer dependencies, grotere codebase). Nieuwe sprints (13+) hebben eigen prompts in dit document gekregen die de huidige codebase-state respecteren.

---

---

## Web UI Sprint Plan (2026-03-10)

> **Bron**: webapp-masterplan-raw.md, webapp-sprint-plan.md, bridge-api-design.md
> **Gegenereerd door**: file-archiver agent | **Datum**: 2026-03-10

### Samenvatting webapp sprint plan

- **Doel**: Command Centre dat de volledige kracht van oa-cli visueel maakt — geen feature gaps meer
- **Sprint 1 (MVP)**: Alle CLI-functionaliteit beschikbaar via UI (error handling, toasts, pause/resume, broadcast, xterm.js)
- **Sprint 2 (Power)**: Features die UI superieur maken aan CLI (pipeline tab, taskboard, messages tab, command palette)
- **Sprint 3 (Polish)**: Keyboard-first navigatie, persistente history, desktop-grade UX, visualisaties
- **Tabstructuur**: Dashboard, Agent Detail (slide-over), Pipelines, Teams & Tasks, Templates, Messages, Settings, Builder
- **Nieuwe packages**: `sonner`, `@xterm/xterm`, `cmdk`, `react-hotkeys-hook`, `react-resizable-panels`
- **Nieuwe stores**: `messagingStore`, `pipelineStore`, `taskStore`, `checkpointStore`
- **Technische schuld**: error boundaries, TypeScript types (`unknown` → proper types), SSE reconnect, Tailwind migratie
- **Keyboard shortcuts**: Ctrl+K command palette, `?` overlay, `1-7` tab-switch, J/K navigatie, `/` zoekfocus
- **UI-exclusieve features**: visuele hiërarchie (tree/graph), drag-and-drop pipeline builder, cost dashboard
- **Totale scope**: ~35 nieuwe bestanden, 12 gewijzigde bestanden, 5 nieuwe npm packages

### Fasering

#### Fase 1 — Must-Have MVP (~8-10 dagen)

| ID | Taak | Effort |
|----|------|--------|
| F1-01 | Error boundaries + error state in agentStore | S |
| F1-02 | Toast notificaties (sonner) | S |
| F1-03 | Type-safe API client (geen `unknown` meer) | M |
| F1-04 | Pause/Resume knoppen in AgentPanel | S |
| F1-05 | Broadcast UI (BroadcastButton + modal) | S |
| F1-06 | Mark-read bij messages openen | S |
| F1-07 | Terminal output (xterm.js) | M |
| F1-08 | Hover action bar op KanbanBoard | M |
| F1-09 | StatsHeader (running/done/failed tellers) | S |
| F1-10 | Zoek/filter agents | M |
| F1-11 | SpawnForm uitbreiden (max_children, guardians) | S |
| F1-12 | messagingStore aanmaken (Zustand) | M |

#### Fase 2 — Power Features (~12-14 dagen)

| ID | Taak | Effort |
|----|------|--------|
| F2-01 | Command Palette (Ctrl+K, cmdk) | M |
| F2-02 | Keyboard shortcuts + overlay | M |
| F2-03 | Pipeline tab + trigger API | L |
| F2-04 | TaskBoard in Teams tab (4 kolommen) | L |
| F2-05 | Checkpoint panel + resume | M |
| F2-06 | Messages tab (centraal berichtenoverzicht) | M |
| F2-07 | Template create/edit modal | M |
| F2-08 | Resizable panels (react-resizable-panels) | M |
| F2-09 | Session status indicator in StatsHeader | S |
| F2-10 | GuardianPanel polling + register UI | S |
| F2-11 | Team member remove + team broadcast | M |
| F2-12 | SSE reconnect logica met exponential backoff | S |

#### Fase 3 — Polish & Advanced (~14-16 dagen)

| ID | Taak | Effort |
|----|------|--------|
| F3-01 | View toggle: kanban / tree / list | L |
| F3-02 | Cost dashboard (CostWidget + /api/session/cost) | M |
| F3-03 | Run history / audit trail (HistoryTab) | L |
| F3-04 | Tailwind migratie (inline styles vervangen) | L |
| F3-05 | Pipeline DAG visualisatie (ReactFlow) | L |
| F3-06 | Batch grid view voor pipeline subtasks | M |
| F3-07 | Dode code cleanup (LiveCanvas beslissing) | M |
| F3-08 | Activity Feed persistentie (localStorage) | S |
| F3-09 | Delegate UI (F3-09) | M |
| F3-10 | Retry agent actie (AgentActionBar) | S |
| F3-11 | Onboarding flow verbeteren | S |

### Ontbrekende bridge API endpoints

| Endpoint | Methode | Blokkeert |
|----------|:-------:|-----------|
| `/api/pipeline` | POST | Pipeline tab (F2-03) |
| `/api/pipeline/<id>/status` | GET | Pipeline monitoring |
| `/api/session/stop` | POST | Sessie beheer in UI |
| `/api/agents/<name>/retry` | POST | Retry actie (F3-10) |
| `/api/tasks/<team>/<id>/claim` | POST | Task claiming (F2-04) |
| `/api/tasks/<team>/<id>/complete` | POST | Task dependencies (F2-04) |
| `/api/session/cost` | GET | Cost dashboard (F3-02) |
| `/api/teams/<name>/members/<agent>` | DELETE | Team member management (F2-11) |
| `/api/teams/<name>/broadcast` | POST | Team broadcast (F2-11) |
| `/api/guardians/register` | POST | Guardian registratie (F2-10) |
| `/api/delegate` | POST | Delegate UI (F3-09) |

---

---

## Sprint 20 — Desktop + Web App

**Status**: Planned

> **Doel**: Eén React codebase die zowel als hosted web app als Tauri desktop app werkt, met echte terminal emulatie (xterm.js + node-pty) zodat Claude Code, oa-cli en tmux erin draaien.
>
> **Afhankelijk van**: Sprint 12 (oa-cli), Sprint 15 (convergentie)
>
> **Beslissingen**: D-057, D-058, D-059

### Architectuur

```
React (shared codebase)
  ├── Browser (hosted)          → WebSocketTerminalService → Fastify backend → node-pty
  └── Tauri (desktop wrapper)   → IPCTerminalService       → Rust PTY commands

@open-agents/shared
  └── TerminalService interface (twee implementaties, één useTerminal() hook)
```

### Taken

| # | Taak | Type | Prompt |
|---|------|------|--------|
| T20.1 | [PAR] Terminal backend: Fastify routes + node-pty + WebSocket server | Backend | Bouw een Fastify plugin die node-pty gebruikt om shell processen te spawnen. WebSocket endpoint /ws/terminal/:id voor bidirectionele I/O. Sessie management (create, resize, kill). |
| T20.2 | [PAR] xterm.js React component | Frontend | Bouw een React component <Terminal /> die xterm.js wropt. Addons: fit, web-links, search. Props: sessionId, onData, theme. Connecteert via useTerminal() hook. |
| T20.3 | [SEQ] TerminalService interface | Shared | Definieer een TerminalService interface in @open-agents/shared. Twee implementaties: WebSocketTerminalService (browser) en IPCTerminalService (Tauri). useTerminal() hook gebruikt de juiste service via context. |
| T20.4 | [SEQ] Tauri desktop shell | Desktop | Tauri v2 project dat de React app laadt. Rust commands voor PTY spawning via tauri-plugin-pty. System tray, auto-update, native notifications. |
| T20.5 | [PAR] Multi-terminal tabs/splits | Frontend | Tab bar component + split pane layout. Meerdere terminal sessies naast elkaar. Drag-and-drop tab reordering. |
| T20.6 | [SEQ] tmux + oa-cli integratie | Integration | oa sessions zichtbaar als tabs. oa status als sidebar widget. oa attach opent terminal tab naar agent. oa logs streamt naar terminal. |
| T20.7 | [SEQ] Agent dashboard embedded | Frontend | oa dashboard functionaliteit (Textual TUI equivalent) als React componenten. Agent list, status, logs, kill/attach knoppen. |
| T20.8 | [PAR] Hosted deployment | DevOps | Docker Compose: Fastify backend + nginx voor React static files. SSL termination. WebSocket proxy config. |
| T20.9 | [PAR] Desktop CI/CD builds | DevOps | GitHub Actions workflow: Tauri build voor Windows (.msi), macOS (.dmg), Linux (.AppImage). Auto-release bij tag. |

**Taken:**
- [ ] `[PAR]` T20.1 — Terminal backend: Fastify + node-pty + WebSocket server
- [ ] `[PAR]` T20.2 — xterm.js React component `<Terminal />`
- [ ] `[SEQ]` T20.3 — TerminalService interface in @open-agents/shared (na T20.1 + T20.2)
- [ ] `[SEQ]` T20.4 — Tauri v2 desktop shell met Rust PTY
- [ ] `[PAR]` T20.5 — Multi-terminal tabs/splits
- [ ] `[SEQ]` T20.6 — tmux + oa-cli integratie (na T20.3)
- [ ] `[SEQ]` T20.7 — Agent dashboard embedded als React componenten (na T20.6)
- [ ] `[PAR]` T20.8 — Hosted deployment via Docker Compose
- [ ] `[PAR]` T20.9 — Desktop CI/CD builds (Windows/macOS/Linux)

---

## Sprint 21: oa-cli als Product

**Status**: Planned
**Doel**: oa-cli ombouwen van developer tool naar installeerbaar product. Web UI naar Command Centre, oa MCP Server, packaging en onboarding.
**Afhankelijk van**: Sprint 12 (oa-cli), Sprint 17 (Agent Teams), Sprint 18 (Dashboard basis)
**Beslissingen**: D-050 (React SPA), D-048 (3 interfaces)

### Fase 21.1: Web UI Command Centre — F1 Must-Have MVP

> **Prompt**:
> ```
> Je bent de React-developer van oa-cli web UI (oa-cli/web/).
> Lees de bestaande componenten in oa-cli/web/src/ en de bridge API in oa-cli/src/open_agents/bridge.py.
>
> Implementeer de F1 must-have MVP features (Web UI Sprint Plan fase 1):
>
> F1-01: Error boundaries + error state in agentStore (Zustand)
> F1-02: Toast notificaties via sonner package
> F1-03: Type-safe API client (vervang alle `unknown` types door proper interfaces)
> F1-04: Pause/Resume knoppen in AgentDetail panel + /api/agents/<name>/pause + /resume endpoints
> F1-05: Broadcast UI — BroadcastButton + modal → POST /api/broadcast
> F1-06: Mark-read bij messages openen in MessagesTab
> F1-07: Terminal output via xterm.js (@xterm/xterm) — embed tmux pane output
> F1-08: Hover action bar op KanbanBoard (kill, collect, attach knoppen)
> F1-09: StatsHeader component (running/done/failed/error tellers bovenaan dashboard)
> F1-10: Zoek/filter agents in Dashboard (zoekbalk, status filter dropdown)
> F1-11: SpawnForm uitbreiden met max_children en --guardians flag
> F1-12: messagingStore aanmaken (Zustand) — laadt inbox/messages voor actieve agent
>
> Schrijf naar: oa-cli/web/src/
> Voeg nieuwe npm packages toe aan oa-cli/web/package.json: sonner, @xterm/xterm, @xterm/addon-fit, @xterm/addon-web-links
> Voeg bridge endpoints toe aan oa-cli/src/open_agents/bridge.py waar nodig.
> Alle nieuwe TypeScript types in oa-cli/web/src/api/types.ts
> ```

**Taken F1:**
- [ ] `[PAR]` F1-01 — ErrorBoundary.tsx + error state in agentStore
- [ ] `[PAR]` F1-02 — sonner toast notificaties (vervang ad-hoc alerts)
- [ ] `[PAR]` F1-03 — Type-safe API client (oa-cli/web/src/api/client.ts)
- [ ] `[PAR]` F1-04 — Pause/Resume in AgentDetail + bridge endpoints
- [ ] `[PAR]` F1-05 — BroadcastButton + modal component
- [ ] `[PAR]` F1-06 — Mark-read logica in MessagesTab
- [ ] `[SEQ]` F1-07 — xterm.js Terminal component (na F1-03 types)
- [ ] `[PAR]` F1-08 — KanbanBoard hover action bar
- [ ] `[PAR]` F1-09 — StatsHeader component
- [ ] `[PAR]` F1-10 — Zoek/filter agents in DashboardTab
- [ ] `[PAR]` F1-11 — SpawnForm uitbreiden
- [ ] `[PAR]` F1-12 — messagingStore (Zustand)

### Fase 21.2: Web UI Command Centre — F2 Power Features

> **Prompt**:
> ```
> Bouw de F2 power features die de web UI superieur maken aan de CLI.
>
> F2-01: Command Palette (Ctrl+K) via cmdk package — alle oa commando's als fuzzy search
> F2-02: Keyboard shortcuts overlay (? toets) + react-hotkeys-hook
> F2-03: Pipeline tab — visuele trigger UI + live status polling via /api/pipeline/<id>/status
> F2-04: TaskBoard in Teams tab — 4-koloms kanban (todo/claimed/in_progress/done) + /api/tasks/<team>/<id>/claim
> F2-05: Checkpoint panel + oa resume UI — /api/checkpoint + /api/session/resume
> F2-06: Messages tab — centraal berichtenoverzicht alle agents
> F2-07: Template create/edit modal in Templates tab
> F2-08: Resizable panels (react-resizable-panels) voor detail/main split
> F2-09: Session status indicator in StatsHeader (actieve sessie, uptime)
> F2-10: GuardianPanel — polling + register guardian UI (/api/guardians/register)
> F2-11: Team member remove + team broadcast (/api/teams/<name>/members/<agent> DELETE)
> F2-12: SSE reconnect met exponential backoff
>
> Voeg bridge endpoints toe: /api/pipeline (POST), /api/pipeline/<id>/status (GET),
> /api/session/stop (POST), /api/agents/<name>/retry (POST), /api/tasks/<team>/<id>/claim (POST),
> /api/tasks/<team>/<id>/complete (POST), /api/session/cost (GET),
> /api/teams/<name>/members/<agent> (DELETE), /api/teams/<name>/broadcast (POST),
> /api/guardians/register (POST), /api/delegate (POST)
> ```

**Taken F2:**
- [ ] `[SEQ]` F2-01 — Command Palette (cmdk) + alle oa acties als commands
- [ ] `[PAR]` F2-02 — Keyboard shortcuts + help overlay
- [ ] `[SEQ]` F2-03 — Pipeline tab: trigger + live status (na bridge endpoints)
- [ ] `[SEQ]` F2-04 — TaskBoard teams tab (na F2-03 bridge)
- [ ] `[PAR]` F2-05 — Checkpoint panel + resume UI
- [ ] `[PAR]` F2-06 — Messages tab centraal overzicht
- [ ] `[PAR]` F2-07 — Template create/edit modal
- [ ] `[PAR]` F2-08 — Resizable panels
- [ ] `[PAR]` F2-09 — Session indicator in StatsHeader
- [ ] `[PAR]` F2-10 — GuardianPanel
- [ ] `[PAR]` F2-11 — Team member management
- [ ] `[PAR]` F2-12 — SSE reconnect logica
- [ ] `[SEQ]` Bridge endpoints toevoegen in bridge.py (alle F2 endpoints)

### Fase 21.3: oa MCP Server

**Doel**: Claude Code kan oa-cli direct aansturen via MCP tools. Dit sluit de loop: meta-orchestrator (Claude) → MCP → oa-cli → agents.

> **Prompt**:
> ```
> Bouw een MCP server voor oa-cli die Claude Code native toegang geeft tot agent management.
>
> Locatie: oa-cli/src/open_agents/mcp_server.py (FastMCP)
> Registratie: oa-cli/.mcp.json (project-level MCP config)
>
> MCP tools implementeren:
>
> 1. create_agent(task: str, name: str, model: str, direct: bool) → AgentRecord
>    - Roept oa run aan via subprocess
>    - Returns: agent_id, status, workspace_path
>
> 2. list_agents(status_filter: str | None) → list[AgentRecord]
>    - Leest ~/.oa/agents.json
>    - Filter op status: running/done/failed/all
>
> 3. get_agent_status(name: str) → AgentRecord
>    - Details van één agent
>
> 4. collect_output(name: str) → str
>    - Leest output/result.md uit agent workspace
>    - Returns: volledige tekst content
>
> 5. kill_agent(name: str) → bool
>    - Stop agent via oa kill
>
> 6. send_message(to: str, message: str, from_agent: str) → bool
>    - Inter-agent messaging via messaging.py
>
> 7. run_pipeline(task: str, name: str) → PipelineRecord
>    - Start oa pipeline
>
> 8. get_canvas_state() → CanvasState
>    - Overzicht van alle actieve agents als canvas-achtige structuur
>
> 9. update_canvas(agent_configs: list[AgentConfig]) → bool
>    - Spawn meerdere agents tegelijk vanuit canvas config
>
> 10. list_templates() → list[Template]
>     - Geeft alle agent templates terug uit agents/library/
>
> 11. run_flow(flow_name: str, input: str) → FlowResult
>     - Voert een gedefinieerde flow template uit
>
> Gebruik FastMCP (Python). Start server via: uvicorn open_agents.mcp_server:app
> Voeg `oa mcp` CLI commando toe dat de MCP server start.
> Registreer in /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/.mcp.json
>
> Schrijf naar: oa-cli/src/open_agents/mcp_server.py
> Update: oa-cli/pyproject.toml (FastMCP dependency), oa-cli/src/open_agents/cli.py (oa mcp commando)
> ```

**Taken:**
- [ ] `[SEQ]` `mcp_server.py` — FastMCP server met 11 tools
- [ ] `[PAR]` `oa mcp` CLI commando in cli.py
- [ ] `[PAR]` FastMCP dependency in pyproject.toml
- [ ] `[PAR]` `.mcp.json` in oa-cli/ directory
- [ ] `[SEQ]` E2E test: Claude Code roept `mcp__open-agents__create_agent` aan → agent spawnt in tmux

### Fase 21.4: Packaging & Distribution

**Doel**: oa-cli installeerbaar maken voor eindgebruikers zonder Python-kennis.

> **Prompt**:
> ```
> Maak oa-cli distribueerbaar als productkwaliteit Python package.
>
> 1. PyPI package configuratie:
>    - Hernoem project naar `open-agents-cli` in pyproject.toml
>    - Voeg classifiers, keywords, project.urls toe
>    - README.md als long_description
>    - GitHub Actions workflow: .github/workflows/pypi-release.yml
>      (trigger: tag push vX.X.X → build → twine upload)
>
> 2. One-liner install script: scripts/install.sh
>    - Detecteert OS (Ubuntu, macOS, WSL)
>    - Installeert Python 3.10+ als niet aanwezig
>    - Installeert tmux als niet aanwezig
>    - pip install open-agents-cli
>    - Toont `oa setup` instructie
>
> 3. `oa setup` wizard (cli.py commando):
>    - Stap 1: Check tmux aanwezig
>    - Stap 2: Check claude CLI aanwezig (vraagt om handmatige installatie als niet)
>    - Stap 3: Configureer ~/.oa/config.yaml (default model, timeout, max_agents)
>    - Stap 4: `oa start` uitvoeren
>    - Stap 5: Toon "Getting Started" tips
>
> 4. `oa doctor` commando:
>    - Check: tmux, claude CLI, Python 3.10+, ~/.oa/ aanwezig
>    - Toont ✅/❌ per check met fix instructie
>
> Schrijf naar: oa-cli/pyproject.toml (update), oa-cli/scripts/install.sh (nieuw),
> oa-cli/src/open_agents/cli.py (setup + doctor commando's toevoegen)
> .github/workflows/pypi-release.yml (nieuw)
> ```

**Taken:**
- [ ] `[PAR]` PyPI configuratie in pyproject.toml (classifiers, URLs, metadata)
- [ ] `[PAR]` `scripts/install.sh` — OS-detecterende one-liner installer
- [ ] `[PAR]` `oa setup` wizard commando in cli.py
- [ ] `[PAR]` `oa doctor` commando in cli.py
- [ ] `[SEQ]` `.github/workflows/pypi-release.yml` — auto-publish bij tag

### Acceptatiecriteria Sprint 21

- [ ] `pip install open-agents-cli` werkt vanaf PyPI
- [ ] `oa setup` begeleidt nieuwe gebruiker in < 2 minuten naar eerste agent
- [ ] `oa doctor` geeft duidelijke ✅/❌ per dependency check
- [ ] `oa web` toont Command Centre met StatsHeader, zoekbalk, toast notificaties
- [ ] Ctrl+K opent command palette met alle oa acties
- [ ] Pipeline tab toont visuele trigger + live status
- [ ] Teams tab toont TaskBoard kanban
- [ ] `oa mcp` start MCP server; Claude Code kan `mcp__open-agents__create_agent` aanroepen
- [ ] `.mcp.json` in project root → MCP auto-geladen in Claude Code sessie

### GitHub Issues (Sprint 21)

| Issue | Titel | Fase |
|-------|-------|------|
| [#55](https://github.com/OpenAEC-Foundation/Open-Agents/issues/55) | Emergent Agent Gedrag & Dispatcher Architectuur | Fase 21.3 (MCP dispatcher) |
| [#56](https://github.com/OpenAEC-Foundation/Open-Agents/issues/56) | Observability & Logging Multi-Agent | Fase 21.1 (StatsHeader, xterm.js) |

---

## Sprint 22: Self-Improvement Foundation

**Status**: Planned
**Doel**: Telemetrie, hooks, context tracking en kwaliteits-gates — het fundament voor al het zelflerende gedrag.
**Afhankelijk van**: Sprint 12 (oa-cli basis)
**Issues**: #14, #15, #16, #20, #26, #27, #28, #30, #31, #33, #45 + research #47, #54, #58

### Context

Zonder telemetrie is het systeem een black box. Sprint 22 bouwt de 'boekhouding' van het agent-systeem: elk run wordt gelogd, hooks reageren automatisch, en kwaliteits-gates voorkomen de top-3 faalpatronen.

### Fase 22.1: Agent Run Telemetry (Issue #14) [CRITICAL]

- [ ] Hook in `oa run` na claude CLI — vang exit-code op, lees tmux scrollback
- [ ] Genereer `run-log.json` (run_id, agent_name, task, model, timestamps, exit_status, duration)
- [ ] Maak `~/.oa/runs/` directory structuur met symlinks naar workspaces
- [ ] Onderhoud `~/.oa/runs-index.json` voor snelle queries
- [ ] Voeg `oa logs` commando toe voor inspectie van run-logs
- [ ] GitHub: close #14

### Fase 22.2: Post-Run Hook System (Issue #15) [CRITICAL, na 22.1]

- [ ] Hook runner in `orchestrator.py` — voer scripts uit in `~/.oa/hooks/`
- [ ] Environment variabelen: `OA_RUN_ID`, `OA_RUN_LOG`, `OA_RUN_LOG_PATH`, `OA_AGENT_NAME`
- [ ] Hook directories: `post-run/`, `post-pipeline/`, `on-failure/`, `on-success/`
- [ ] Standaard hooks: `01-log-to-index.sh`, `02-check-success.sh`
- [ ] `oa hooks list` en `oa hooks run <hook>` commando's
- [ ] GitHub: close #15

### Fase 22.3: Context Window Tracking (Issue #16) [CRITICAL]

- [ ] Token-schatting via tmux scrollback buffer (chars × 0.25 ≈ tokens)
- [ ] Context-log per agent naar `~/.oa/context-log/{agent-name}.jsonl`
- [ ] `oa status --context` met tokens, window%, trend, health indicator
- [ ] Configureerbare thresholds in `~/.oa/config.yaml` (green/yellow/red)
- [ ] TUI waarschuwing bij overschrijding threshold
- [ ] GitHub: close #16

### Fase 22.4: Auto-Compaction (Issue #20) [na 22.3]

- [ ] Compaction-trigger bij > 75% context
- [ ] `oa compact <agent>` handmatige trigger
- [ ] Compaction-events in telemetrie
- [ ] GitHub: close #20

### Fase 22.5: Quality Gates [PAR met 22.1]

- [ ] #26 Context Gap Detector: `context_gap_detector.py` module in oa-cli; pre-flight check op `oa run`
- [ ] #26: GitHub: close #26
- [ ] #27 Honesty Enforcer: honesty-enforcer skill template toegevoegd aan globale agent CLAUDE.md
- [ ] #27: GitHub: close #27
- [ ] #28 Adversarial Reviewer: `oa review <naam>` command — spawnt read-only reviewer agent
- [ ] #28: GitHub: close #28
- [ ] #30 Persistent Backlog: `oa backlog` subcommand (list/add/done) + `~/.oa/backlog.yaml`
- [ ] #30: GitHub: close #30
- [ ] #31 File Conflict Preventer: file-ownership YAML per pipeline run; conflict check voor spawn
- [ ] #31: GitHub: close #31
- [ ] #33 Invocation Quality Gate: `invocation_validator.py` met 5-dimensie scoring; pre-flight in `oa run`
- [ ] #33: GitHub: close #33
- [ ] #45 Token Budget Allocator: `--budget <n>` flag; budget-tracking in run-state
- [ ] #45: GitHub: close #45

### Fase 22.6: Research [PAR]

- [ ] #47 CLI Toolchain Evaluatie → `docs/research/cli-toolchain.md` + installatie-script
- [ ] #54 Task Runner Evaluatie → `docs/research/task-runner.md` + workflow format voorstel
- [ ] #58 Context Engineering → `docs/research/context-engineering.md` + context budget model
- [ ] GitHub: close #47, #54, #58 na publicatie rapporten in docs/research/

### Acceptatiecriteria Sprint 22

- Elke `oa run` genereert automatisch `run-log.json`
- Post-run scripts in `~/.oa/hooks/post-run/` worden automatisch aangeroepen
- `oa status --context` toont context-gebruik per actieve agent
- `oa review <naam>` spawnt een adversarial reviewer
- `oa backlog` toont persistente backlog
- Invocation validator waarschuwt bij slechte prompts voor spawn

---

## Sprint 22b: Remote Execution (LOW PRIORITY)

**Status**: Planned (lage prioriteit)
**Doel**: Agents uitvoeren op remote GPU servers (Ollama).
**Afhankelijk van**: Sprint 22 (telemetrie stabiel), Sprint 12
**Issue**: #13

### Taken

- [ ] Remote host configuratie in `~/.config/oa/remotes.json`
- [ ] SSH-gebaseerde tmux session management voor remote agents
- [ ] Ollama model routing (`--model ollama/mistral`)
- [ ] `oa collect` transparant voor locale + remote agents
- [ ] `oa status` toont local/remote agents gescheiden
- [ ] GitHub: close #13

---

## Sprint 23: Self-Improvement Automation

**Status**: Planned
**Doel**: Kennisaccumulatie automatiseren op basis van Sprint 22 telemetrie.
**Afhankelijk van**: Sprint 22 (telemetrie + hooks beschikbaar)
**Issues**: #17, #18, #19, #23, #24, #29, #34, #35, #36, #42, #43 + research #53, #56

### Fase 23.1: Auto Template Generation (Issue #17)

- [ ] Template-evaluator hook bij success-score ≥ threshold
- [ ] YAML template-kandidaat generatie naar `~/.oa/template-candidates/`
- [ ] `oa templates review` CLI voor handmatige goedkeuring
- [ ] GitHub: close #17

### Fase 23.2: Automated Lessons Extraction (Issue #18)

- [ ] Lessons-extractor hook (mini Claude-aanroep na elke run)
- [ ] YAML-lessen met id, datum, categorie, lesson, evidence, confidence
- [ ] Deduplicatie t.o.v. bestaande kennisbasis
- [ ] `~/.oa/knowledge/` structuur (lessons.yaml, failure-patterns.yaml, success-patterns.yaml)
- [ ] `oa knowledge show` CLI
- [ ] GitHub: close #18

### Fase 23.3: Self-Benchmark Workflow (Issue #19)

- [ ] `~/.oa/benchmarks/suite.yaml` definitie met benchmark-taken
- [ ] `oa benchmark run` commando
- [ ] `oa benchmark compare` voor vergelijking van 2 runs
- [ ] `oa benchmark history` voor TUI trend-visualisatie
- [ ] GitHub: close #19

### Fase 23.4: Settings Auto-Tuning (Issue #23)

- [ ] `oa tune` commando — aggregeert telemetrie per model + agent-type
- [ ] Analyse per model (success-rate, token-efficiency, duration)
- [ ] `tune-report.md` met suggesties en onderbouwing
- [ ] `oa tune --apply` voor goedgekeurde suggesties
- [ ] GitHub: close #23

### Fase 23.5: Agent Graveyard & Resurrection (Issue #24)

- [ ] Post-run snapshot in `~/.oa/graveyard/{run-id}/snapshot.json`
- [ ] `oa graveyard` lijst-commando met filters
- [ ] `oa resurrect <run-id>` herstart agent met zelfde config
- [ ] `oa resurrect <run-id> --improve` met lessons-verbeterde CLAUDE.md
- [ ] GitHub: close #24

### Fase 23.6: During/Post-Execution Hooks [PAR]

- [ ] #29 End-to-End Verifier: post-run hook die tests detecteert en uitvoert; FAIL blokkeert done-status
- [ ] #34 Assumption Tracker: during-execution skill-prompt injectie; `assumptions-log.md` in workspace
- [ ] #35 Context Decay Monitor: periodieke tmux-job voor context-kwaliteitsmonitoring
- [ ] #36 Information Loss Detector: combiner-output vergelijking; `information-loss-report.md`
- [ ] #42 Instruction Compliance Checker: post-run script; `compliance-report.md` + score in telemetrie
- [ ] #43 Session State Preserver: session-state.json serialisatie; `oa resume` commando
- [ ] GitHub: close #29, #34, #35, #36, #42, #43 na implementatie

### Fase 23.7: Research [PAR]

- [ ] #53 Agent Pool Management → `docs/research/agent-pool-management.md` + scaling policy
- [ ] #56 Observability & Logging → `docs/research/observability.md` + logging format spec + metrics
- [ ] GitHub: close #53, #56 na publicatie rapporten

### Acceptatiecriteria Sprint 23

- Succesvolle runs genereren automatisch template-kandidaten
- Elke run levert 0-2 nieuwe lessen (geen duplicaten)
- `oa benchmark run` voert suite uit en slaat resultaten op
- `oa resurrect` herstart agent met vorige state
- Hook-systeem ondersteunt during/post hooks per agent-type

---

## Sprint 24: Iteration Control & Meta-Agent

**Status**: Planned
**Doel**: Zelf-regulerend systeem dat eigen iteraties beheert en zichzelf verbetert.
**Afhankelijk van**: Sprint 22 + Sprint 23
**Issues**: #25, #32, #41, #44

### Fase 24.1: Diminishing Returns Detector (Issue #41)

- [ ] Kwaliteitsdelta tracking in iteratieve pipeline-loop
- [ ] Convergence-threshold configureerbaar per pipeline-type
- [ ] `oa pipeline --auto-stop` bij automatisch stoppen
- [ ] GitHub: close #41

### Fase 24.2: Anti-Regression Guard (Issue #44)

- [ ] Referentie-run systeem: `oa test --save-reference` + `oa test --check`
- [ ] Vergelijking na elke agent-configuratie wijziging
- [ ] Automatische alert of rollback bij regressie
- [ ] GitHub: close #44

### Fase 24.3: Skill Evolver (Issue #32)

- [ ] `~/.oa/skill-metrics.yaml` tracking na elk skill-gebruik
- [ ] `oa skill benchmark <naam>` commando
- [ ] skill-evolver agent template in `agents/library/`
- [ ] GitHub: close #32

### Fase 24.4: Meta-Agent OA Improver (Issue #25) [na 24.1-3]

- [ ] `oa improve` entry point
- [ ] Fase 1 diagnose-agent: leest telemetrie + lessons + benchmarks
- [ ] Fase 2 planning-agent: prioriteert max 3 verbeteringen per cyclus
- [ ] Fase 3 parallelle workers: template-verbetering, config-aanpassing, nieuwe skill/hook
- [ ] `oa improve --review` voor human-in-the-loop goedkeuring
- [ ] Veiligheidscheck: verbeteringen mogen geen tests breken
- [ ] GitHub: close #25

---

## Sprint 25: Periodic Analytics & Observability

**Status**: Planned
**Doel**: Diepe analyse van het agent-ecosysteem op basis van verzamelde historische data.
**Afhankelijk van**: Sprint 22 + 23 (minimaal 2-3 sprints productiedata)
**Issues**: #37, #38, #39, #40

### Fase 25.1: Ecosystem Health Dashboard (Issue #37)

- [ ] Python script dat run-logs aggregeert → `health-report.md`
- [ ] Minimaal 5 metrics: success-rate, gem. duur, token-gebruik, error-rate, trending patterns
- [ ] Scheduled uitvoering via `oa schedule` of cron
- [ ] GitHub: close #37

### Fase 25.2: Knowledge Boundary Mapper (Issue #38)

- [ ] Domein-tagging op run-metadata
- [ ] Success-rate per domein → `knowledge-boundary-map.md`
- [ ] Koppeling met skill-ontwikkelingsroadmap
- [ ] GitHub: close #38

### Fase 25.3: Blind Spot Scanner (Issue #39)

- [ ] Failed-run pattern clustering (minimaal 20 runs vereist)
- [ ] Blind spots gecategoriseerd op type en frequentie
- [ ] Aanbevelingen per geïdentificeerde blind spot
- [ ] GitHub: close #39

### Fase 25.4: Cross-Agent Pattern Miner (Issue #40)

- [ ] Pattern extractie uit succesvolle multi-agent runs
- [ ] Auto-gegenereerde library templates op basis van bewezen patronen
- [ ] Kwaliteitsscore per patroon
- [ ] GitHub: close #40

---

## GitHub Issues → Sprint Mapping

> 50 open issues (stand 2026-03-11). Per issue: sprint en status.

### Geïmplementeerd / Gedocumenteerde Workaround

| Issue | Titel | Sprint | Status |
|-------|-------|--------|--------|
| [#9](https://github.com/OpenAEC-Foundation/Open-Agents/issues/9) | Bug: oa agents negeren oa run, gebruiken Claude Code Agent tool | Sprint 12/17 | Workaround gedocumenteerd (L-052, CLAUDE.md) |
| [#10](https://github.com/OpenAEC-Foundation/Open-Agents/issues/10) | Bug: agents schrijven output naar /tmp zonder --direct | Sprint 12 | Workaround: `--direct` flag + CLAUDE.md (L-031) |
| [#12](https://github.com/OpenAEC-Foundation/Open-Agents/issues/12) | Feature: structured task prompt template for oa run | Sprint 12 | Done — 5-element template gedocumenteerd (L-010) |
| [#43](https://github.com/OpenAEC-Foundation/Open-Agents/issues/43) | Session State Preserver | Sprint 19 | Done — session_store.py, oa session |
| [#60](https://github.com/OpenAEC-Foundation/Open-Agents/issues/60) | Architectuurdocumentatie — conceptueel model | Sprint 0/10 | Done — CLAUDE.md, docs/design/ |
| [#47](https://github.com/OpenAEC-Foundation/Open-Agents/issues/47) | CLI Toolchain voor Agentic Orchestration — Overzicht | Sprint 12 | Done — oa-cli gebouwd |

### In Actieve Sprints

| Issue | Titel | Sprint | Status |
|-------|-------|--------|--------|
| [#11](https://github.com/OpenAEC-Foundation/Open-Agents/issues/11) | Nested agent spawning | Sprint 17 | Gedeeltelijk — flat spawning werkt, nested open |
| [#21](https://github.com/OpenAEC-Foundation/Open-Agents/issues/21) | Structured Handoff Protocol | Sprint 17 | In progress — messaging.py gebouwd |
| [#48](https://github.com/OpenAEC-Foundation/Open-Agents/issues/48) | Inter-Agent Communication Protocol Design | Sprint 17 | In progress — send/inbox/broadcast werkend |
| [#49](https://github.com/OpenAEC-Foundation/Open-Agents/issues/49) | CLI-based Message Bus Evaluatie | Sprint 17 | In progress — zie messaging.py |
| [#51](https://github.com/OpenAEC-Foundation/Open-Agents/issues/51) | Tmux als Agent Container Runtime | Sprint 12 | Done — oa-cli gebruikt tmux |
| [#52](https://github.com/OpenAEC-Foundation/Open-Agents/issues/52) | Agent Workspace Templating & Isolation | Sprint 12/19 | Done — workspace builder, session persistence |
| [#53](https://github.com/OpenAEC-Foundation/Open-Agents/issues/53) | Agent Pool Management & Scaling | Sprint 17 | In progress — teams.py |
| [#54](https://github.com/OpenAEC-Foundation/Open-Agents/issues/54) | Orchestration Task Runner Evaluatie | Sprint 12/17 | In progress |
| [#55](https://github.com/OpenAEC-Foundation/Open-Agents/issues/55) | Emergent Agent Gedrag & Dispatcher Architectuur | Sprint 17 | In progress |
| [#61](https://github.com/OpenAEC-Foundation/Open-Agents/issues/61) | Visual Canvas <> oa CLI integratie | Sprint 15 | Planned |

### Gepland — Sprint 22+

> Issues #13-#46 en #56-#59 zijn gemapped naar concrete sprints (22-25).
> Gegroepeerd per sprint:

**Sprint 14 — Bug Fixes & Agent Library Scale-up**

| Issue | Titel | Fase |
|-------|-------|------|
| [#9](https://github.com/OpenAEC-Foundation/Open-Agents/issues/9) | Agent Tool Blokkade | Fase 14.0 |
| [#10](https://github.com/OpenAEC-Foundation/Open-Agents/issues/10) | --direct default | Fase 14.0 |
| [#11](https://github.com/OpenAEC-Foundation/Open-Agents/issues/11) | Nested agent spawning | Fase 14.0 (samen met #9) |
| [#12](https://github.com/OpenAEC-Foundation/Open-Agents/issues/12) | Structured prompt templates | Fase 14.0 |
| [#22](https://github.com/OpenAEC-Foundation/Open-Agents/issues/22) | Skill System per Agent Type | Fase 14.0 |

**Sprint 17 — Agent Teams + Handoff**

| Issue | Titel | Status |
|-------|-------|--------|
| [#21](https://github.com/OpenAEC-Foundation/Open-Agents/issues/21) | Structured Handoff Protocol | Pending — handoff.yaml schema |

**Sprint 22 — Self-Improvement Foundation**

| Issue | Titel | Fase |
|-------|-------|------|
| [#14](https://github.com/OpenAEC-Foundation/Open-Agents/issues/14) | Agent Run Telemetry | Fase 22.1 [CRITICAL] |
| [#15](https://github.com/OpenAEC-Foundation/Open-Agents/issues/15) | Post-Run Hook System | Fase 22.2 [CRITICAL] |
| [#16](https://github.com/OpenAEC-Foundation/Open-Agents/issues/16) | Context Window Tracking | Fase 22.3 [CRITICAL] |
| [#20](https://github.com/OpenAEC-Foundation/Open-Agents/issues/20) | Auto-Compaction Triggers | Fase 22.4 |
| [#26](https://github.com/OpenAEC-Foundation/Open-Agents/issues/26) | Context-Gap-Detector | Fase 22.5 |
| [#27](https://github.com/OpenAEC-Foundation/Open-Agents/issues/27) | Honesty-Enforcer | Fase 22.5 |
| [#28](https://github.com/OpenAEC-Foundation/Open-Agents/issues/28) | Adversarial Reviewer | Fase 22.5 |
| [#30](https://github.com/OpenAEC-Foundation/Open-Agents/issues/30) | Persistent Backlog | Fase 22.5 |
| [#31](https://github.com/OpenAEC-Foundation/Open-Agents/issues/31) | File-Conflict-Preventer | Fase 22.5 |
| [#33](https://github.com/OpenAEC-Foundation/Open-Agents/issues/33) | Invocation Quality Gate | Fase 22.5 |
| [#45](https://github.com/OpenAEC-Foundation/Open-Agents/issues/45) | Token Budget Allocator | Fase 22.5 |
| [#47](https://github.com/OpenAEC-Foundation/Open-Agents/issues/47) | CLI Toolchain Evaluatie | Fase 22.6 (research) |
| [#54](https://github.com/OpenAEC-Foundation/Open-Agents/issues/54) | Task Runner Evaluatie | Fase 22.6 (research) |
| [#58](https://github.com/OpenAEC-Foundation/Open-Agents/issues/58) | Context Engineering | Fase 22.6 (research) |

**Sprint 22b — Remote Execution (LOW PRIORITY)**

| Issue | Titel | Status |
|-------|-------|--------|
| [#13](https://github.com/OpenAEC-Foundation/Open-Agents/issues/13) | --remote flag voor GPU servers | Planned |

**Sprint 23 — Self-Improvement Automation**

| Issue | Titel | Fase |
|-------|-------|------|
| [#17](https://github.com/OpenAEC-Foundation/Open-Agents/issues/17) | Auto Template Generation | Fase 23.1 |
| [#18](https://github.com/OpenAEC-Foundation/Open-Agents/issues/18) | Automated Lessons Extraction | Fase 23.2 |
| [#19](https://github.com/OpenAEC-Foundation/Open-Agents/issues/19) | Self-Benchmark Workflow | Fase 23.3 |
| [#23](https://github.com/OpenAEC-Foundation/Open-Agents/issues/23) | Settings Auto-Tuning | Fase 23.4 |
| [#24](https://github.com/OpenAEC-Foundation/Open-Agents/issues/24) | Agent Graveyard & Resurrection | Fase 23.5 |
| [#29](https://github.com/OpenAEC-Foundation/Open-Agents/issues/29) | End-to-End Verifier | Fase 23.6 |
| [#34](https://github.com/OpenAEC-Foundation/Open-Agents/issues/34) | Assumption Tracker | Fase 23.6 |
| [#35](https://github.com/OpenAEC-Foundation/Open-Agents/issues/35) | Context Decay Monitor | Fase 23.6 |
| [#36](https://github.com/OpenAEC-Foundation/Open-Agents/issues/36) | Information Loss Detector | Fase 23.6 |
| [#42](https://github.com/OpenAEC-Foundation/Open-Agents/issues/42) | Instruction Compliance Checker | Fase 23.6 |
| [#43](https://github.com/OpenAEC-Foundation/Open-Agents/issues/43) | Session State Preserver | Fase 23.6 |
| [#53](https://github.com/OpenAEC-Foundation/Open-Agents/issues/53) | Agent Pool Management | Fase 23.7 (research) |
| [#56](https://github.com/OpenAEC-Foundation/Open-Agents/issues/56) | Observability & Logging | Fase 23.7 (research) |

**Sprint 24 — Iteration Control & Meta-Agent**

| Issue | Titel | Fase |
|-------|-------|------|
| [#25](https://github.com/OpenAEC-Foundation/Open-Agents/issues/25) | Meta-Agent OA Improver | Fase 24.4 |
| [#32](https://github.com/OpenAEC-Foundation/Open-Agents/issues/32) | Skill-Evolver | Fase 24.3 |
| [#41](https://github.com/OpenAEC-Foundation/Open-Agents/issues/41) | Diminishing Returns Detector | Fase 24.1 |
| [#44](https://github.com/OpenAEC-Foundation/Open-Agents/issues/44) | Anti-Regression Guard | Fase 24.2 |

**Sprint 25 — Periodic Analytics & Observability**

| Issue | Titel | Fase |
|-------|-------|------|
| [#37](https://github.com/OpenAEC-Foundation/Open-Agents/issues/37) | Ecosystem Health Dashboard | Fase 25.1 |
| [#38](https://github.com/OpenAEC-Foundation/Open-Agents/issues/38) | Knowledge Boundary Mapper | Fase 25.2 |
| [#39](https://github.com/OpenAEC-Foundation/Open-Agents/issues/39) | Blind Spot Scanner | Fase 25.3 |
| [#40](https://github.com/OpenAEC-Foundation/Open-Agents/issues/40) | Cross-Agent Pattern Miner | Fase 25.4 |

**Research — Informeert Architectuur**

| Issue | Titel | Antwoord / Status |
|-------|-------|-------------------|
| [#47](https://github.com/OpenAEC-Foundation/Open-Agents/issues/47) | CLI Toolchain voor Agentic Orchestration | Beantwoord door implementatie: tmux (runtime), Python+typer (CLI), ripgrep/gh/fzf (tools). Zie D-045. |
| [#48](https://github.com/OpenAEC-Foundation/Open-Agents/issues/48) | Inter-Agent Communication Protocol Design | Beantwoord: filesystem JSON mailbox gekozen. Geïmplementeerd in messaging.py. Zie D-062. |
| [#49](https://github.com/OpenAEC-Foundation/Open-Agents/issues/49) | CLI-based Message Bus Evaluatie | Beantwoord: geen message bus nodig. Filesystem mailbox volstaat voor lokale agents. Zie D-062. |
| [#50](https://github.com/OpenAEC-Foundation/Open-Agents/issues/50) | Agent Registry & Discovery | Beantwoord: agents.json (registry) + teams config.json (discovery). Zie D-045, D-052. |
| [#51](https://github.com/OpenAEC-Foundation/Open-Agents/issues/51) | Tmux als Agent Container Runtime | Beantwoord: tmux gekozen als runtime. Geïmplementeerd in tmux.py. Zie D-045. |
| [#52](https://github.com/OpenAEC-Foundation/Open-Agents/issues/52) | Agent Workspace Templating & Isolation | Beantwoord: custom Python workspace builder. CLAUDE.md-per-agent als isolatie. Zie D-045. |
| [#53](https://github.com/OpenAEC-Foundation/Open-Agents/issues/53) | Agent Pool Management & Scaling | Beantwoord: teams.py + task_list.py voor pool beheer. Zie D-052. |
| [#54](https://github.com/OpenAEC-Foundation/Open-Agents/issues/54) | Orchestration Task Runner Evaluatie | Beantwoord: custom Python pipeline (task_list.py) boven Just/Task/Make. Zie D-047. |
| [#55](https://github.com/OpenAEC-Foundation/Open-Agents/issues/55) | Emergent Agent Gedrag & Dispatcher Architectuur | Gedeeltelijk beantwoord: LLM dispatcher in packages/ (DispatcherNode). Guardrails: D-040, D-051. oa-cli dispatcher: Sprint 21+. |
| [#56](https://github.com/OpenAEC-Foundation/Open-Agents/issues/56) | Observability & Logging Multi-Agent | Gedeeltelijk beantwoord: TUI dashboard (D-046), tmux capture-pane (D-049), LESSONS.md als trace. Zie Sprint 21+. |
| [#57](https://github.com/OpenAEC-Foundation/Open-Agents/issues/57) | A2A Protocol Compatibiliteit | Open onderzoek → Sprint 16. |
| [#58](https://github.com/OpenAEC-Foundation/Open-Agents/issues/58) | Context Engineering Agent Workspaces | Open onderzoek → Sprint 22. |
| [#59](https://github.com/OpenAEC-Foundation/Open-Agents/issues/59) | Security Model Autonome Agent Communicatie | Open onderzoek → Sprint 16/22. |

---

## Sprint 26: CLI Infrastructure Boost

**Status**: Planned
**Doel**: De oa-cli van een set losse subprocess-aanroepen omzetten naar een professionele Python-applicatie die de juiste packages gebruikt. Tegelijkertijd skills bouwen die zowel de CLI zelf als agents die de CLI gebruiken sterker maken. Slimme tmux-architecturen die agent-trees visueel en functioneel rijker maken.
**Afhankelijk van**: Sprint 12 (oa-cli basis), Sprint 21 (product-ready CLI)
**Filosofie**: We bouwen de infrastructuur van onze eigen tool net zo goed als de tool zelf. Goede packages vervangen fragiele subprocess strings. Skills maken kennis herbruikbaar voor elk agent dat ooit met oa werkt.

---

### Context

oa-cli gebruikt nu overal `subprocess.run(["tmux", ...])` — fragiel, niet type-safe, geen foutafhandeling. `psutil` wordt niet gebruikt voor process monitoring. Output polling via sleep-loops in plaats van filesystem events. Dit is technische schuld die groeit naarmate het systeem complexer wordt.

Sprint 26 maakt schoon schip: betere packages, betere architectuur, én skills zodat agents weten hoe ze deze tools moeten gebruiken.

---

### Fase 26.1: libtmux Adapter — Type-safe Tmux Bindings `[SEQ]`

> **Prompt**:
> ```
> Je bent de CLI-engineer van oa-cli.
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/tmux.py
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/lifecycle.py
>
> Vervang alle subprocess tmux-aanroepen door libtmux bindings.
>
> Scope:
> - Installeer libtmux in requirements.txt (>=0.28)
> - Maak oa-cli/src/open_agents/tmux_adapter.py:
>   - TmuxAdapter class met session/window/pane object-model
>   - create_window(), kill_window(), capture_output(lines=200), send_keys()
>   - list_windows(), get_window(name), window_exists(name)
>   - Foutafhandeling: TmuxNotRunning, WindowNotFound, SessionBroken
> - Migreer tmux.py en lifecycle.py naar TmuxAdapter
> - Behoud backward compatibility: alle publieke functies blijven bestaan
>
> Schrijf naar:
> - oa-cli/src/open_agents/tmux_adapter.py (nieuw)
> - oa-cli/src/open_agents/tmux.py (migreer)
> - oa-cli/src/open_agents/lifecycle.py (migreer)
> - oa-cli/requirements.txt (voeg libtmux toe)
>
> Regels:
> - Geen breaking changes in publieke API
> - Alle exceptions type-safe (niet bare except)
> - Minimaal 1 unit test per publieke methode in oa-cli/tests/test_tmux_adapter.py
> ```

**Taken:**
- [ ] `[SEQ]` `tmux_adapter.py` bouwen met libtmux objectmodel
- [ ] `[SEQ]` `tmux.py` migreren naar TmuxAdapter
- [ ] `[SEQ]` `lifecycle.py` migreren naar TmuxAdapter
- [ ] `[PAR]` `tests/test_tmux_adapter.py` schrijven
- [ ] `[PAR]` requirements.txt bijwerken

---

### Fase 26.2: watchdog File Watcher — Vervang Polling `[PAR met 26.1]`

> **Prompt**:
> ```
> Je bent de CLI-engineer van oa-cli.
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/state.py
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/monitor.py
>
> Vervang de polling-loop voor agents.json door een watchdog FileSystemEventHandler.
>
> Scope:
> - Installeer watchdog in requirements.txt (>=4.0)
> - Maak oa-cli/src/open_agents/file_watcher.py:
>   - AgentsJsonWatcher class op basis van watchdog.observers.Observer
>   - Callback-patroon: on_change(callback: Callable) → wordt aangeroepen bij elke wijziging agents.json
>   - start() / stop() lifecycle
>   - Debounce: maximaal 1 callback per 200ms (voorkom burst)
>   - Fallback: als watchdog niet beschikbaar → automatisch terug naar polling (5s interval)
> - Integreer in dashboard.py: verwijder set_interval(2.0) voor agents, gebruik watcher
> - Integreer in bridge.py: SSE events direct bij wijziging agents.json (geen 2s delay)
>
> Schrijf naar:
> - oa-cli/src/open_agents/file_watcher.py (nieuw)
> - oa-cli/src/open_agents/dashboard.py (integreer watcher)
> - oa-cli/src/open_agents/bridge.py (integreer watcher in SSE)
> - oa-cli/requirements.txt (voeg watchdog toe)
> ```

**Taken:**
- [ ] `[PAR]` `file_watcher.py` bouwen met debounce + fallback
- [ ] `[SEQ]` `dashboard.py` — verwijder polling, gebruik AgentsJsonWatcher
- [ ] `[SEQ]` `bridge.py` — SSE reageert direct op file-events
- [ ] `[PAR]` requirements.txt bijwerken

---

### Fase 26.3: psutil Process Monitor — Echte Process Metrics `[PAR met 26.1]`

> **Prompt**:
> ```
> Je bent de CLI-engineer van oa-cli.
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/state.py
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/lifecycle.py
>
> Voeg psutil-gebaseerde process monitoring toe aan oa-cli.
>
> Scope:
> - Installeer psutil in requirements.txt (>=5.9)
> - Maak oa-cli/src/open_agents/process_monitor.py:
>   - ProcessSnapshot dataclass: pid, cpu_percent, memory_mb, num_threads, open_files, create_time
>   - get_snapshot(pid) → ProcessSnapshot | None
>   - get_agent_process_tree(pid) → list[ProcessSnapshot]  (parent + all children)
>   - is_alive(pid) → bool
>   - kill_tree(pid) → bool  (kill process + alle children)
> - Integreer in lifecycle.py: gebruik is_alive() voor status checks
> - Integreer in dashboard.py stats-panel: toon CPU/mem voor actieve agent
> - Voeg `oa status --verbose` toe: toon process metrics per agent
>
> Schrijf naar:
> - oa-cli/src/open_agents/process_monitor.py (nieuw)
> - oa-cli/src/open_agents/lifecycle.py (gebruik is_alive, kill_tree)
> - oa-cli/src/open_agents/dashboard.py (stats-panel uitbreiden)
> - oa-cli/src/open_agents/cli.py (--verbose flag)
> ```

**Taken:**
- [ ] `[PAR]` `process_monitor.py` bouwen
- [ ] `[SEQ]` `lifecycle.py` integreren
- [ ] `[SEQ]` `dashboard.py` stats-panel uitbreiden met CPU/mem
- [ ] `[PAR]` `oa status --verbose` commando

---

### Fase 26.4: Slimme Tmux-Architecturen `[SEQ na 26.1]`

> **Prompt**:
> ```
> Je bent de CLI-architect van oa-cli.
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/tmux_adapter.py
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/teams.py
>
> Bouw slimme tmux-layout architecturen voor agent-teams.
>
> Scope:
> - Maak oa-cli/src/open_agents/tmux_layouts.py:
>   - Layout presets: SOLO, PAIR, QUAD (2×2), HEX (2×3), TREE (sidebar + main)
>   - apply_layout(session, layout, agents: list[str]) → dict[str, pane]
>   - TmuxLayout.TREE: links 30% = agent-tree pane, rechts 70% = actieve agent output pane
>   - TmuxLayout.QUAD: 4-pane grid — ideaal voor 4-worker teams
>   - auto_layout(n_agents) → beste layout voor N agents
> - Commando: `oa layout <team> [--preset QUAD|TREE|auto]`
>   — opent tmux window met gekozen layout, alle agents tegelijk zichtbaar
> - Commando: `oa watch-tree` — opent TREE layout voor alle actieve agents (live updates)
>
> Schrijf naar:
> - oa-cli/src/open_agents/tmux_layouts.py (nieuw)
> - oa-cli/src/open_agents/cli.py (oa layout + oa watch-tree commando's)
> ```

**Taken:**
- [ ] `[SEQ]` `tmux_layouts.py` bouwen met layout presets
- [ ] `[SEQ]` `oa layout` commando implementeren
- [ ] `[SEQ]` `oa watch-tree` commando implementeren

---

### Fase 26.5: Skills Bouwen voor CLI Packages `[PAR met 26.1-26.4]`

Elke package krijgt een skill die agents (en deze Claude-sessie) precies weten hoe ze hem moeten gebruiken.

> **Prompt**:
> ```
> Je bent een skill-architect voor Open-Agents.
> Lees: /home/freek/.claude/skills/ (bestaande skills als format-referentie)
>
> Bouw 4 skills voor de CLI-infrastructure packages:
>
> Skill 1: ~/.claude/skills/libtmux/SKILL.md
>   - Wat is libtmux, wanneer gebruiken vs subprocess
>   - Server/Session/Window/Pane objecthiërarchie
>   - Meest gebruikte patronen: create_window, capture_pane, send_keys, kill_window
>   - Foutafhandeling: LibTmuxException, sessie disconnected
>   - Oa-cli specifiek: TmuxAdapter API reference
>
> Skill 2: ~/.claude/skills/watchdog/SKILL.md
>   - Wat is watchdog, wanneer gebruiken (file events vs polling)
>   - Observer/Handler/Event patroon
>   - Debounce implementatie
>   - Platform-specifiek: inotify (Linux), kqueue (macOS), ReadDirectoryChanges (Windows)
>   - Oa-cli specifiek: AgentsJsonWatcher API
>
> Skill 3: ~/.claude/skills/psutil/SKILL.md
>   - Wat is psutil, process tree navigatie
>   - Meest gebruikte: Process, cpu_percent, memory_info, children(), kill()
>   - Process tree kill patroon (veilig)
>   - Oa-cli specifiek: ProcessMonitor API
>
> Skill 4: ~/.claude/skills/tmux-architectures/SKILL.md
>   - Tmux layout concepten: sessions, windows, panes, split-window
>   - Layout presets in oa-cli (SOLO/PAIR/QUAD/HEX/TREE)
>   - `oa layout` en `oa watch-tree` commando's
>   - Wanneer welke layout kiezen (N agents → beste layout)
>
> Regels:
> - Elke skill: maximaal 150 regels
> - Praktische code-voorbeelden (geen abstracte uitleg)
> - user-invocable: false (auto-laadt als context)
> - Verwijs naar oa-cli source bestanden
> ```

**Taken:**
- [ ] `[PAR]` `~/.claude/skills/libtmux/SKILL.md` schrijven
- [ ] `[PAR]` `~/.claude/skills/watchdog/SKILL.md` schrijven
- [ ] `[PAR]` `~/.claude/skills/psutil/SKILL.md` schrijven
- [ ] `[PAR]` `~/.claude/skills/tmux-architectures/SKILL.md` schrijven

---

### Fase 26.6: Agent Skills voor CLI-gebruik `[PAR met 26.5]`

Skills die agents zelf kunnen gebruiken wanneer ze oa-cli aanroepen of inspectie doen.

> **Prompt**:
> ```
> Je bent een agent-skill-architect.
> Lees: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/CLAUDE.md (hoe agents worden opgezet)
>
> Bouw 2 agent-skills die in agent-prompts worden opgenomen:
>
> Skill 1: agents/skills/oa-cli-usage/SKILL.md
>   - Hoe een agent `oa status`, `oa collect`, `oa send` aanroept vanuit zijn workspace
>   - Wanneer spawn je sub-agents vs doe je het zelf
>   - Flat spawning patroon (L-004)
>   - Output-locaties: /tmp/oa-agent-*/output/ vs --direct
>
> Skill 2: agents/skills/tmux-environment/SKILL.md
>   - Hoe een agent zijn eigen tmux-pane detecteert ($TMUX, $TMUX_PANE)
>   - Hoe hij zijn workspace-pad vindt ($OA_WORKSPACE of via agents.json)
>   - Hoe hij output schrijft zodat `oa collect` hem vindt
>   - Hoe hij andere agents bereikt via oa send/oa inbox
>
> Regels:
> - Maximaal 100 regels per skill
> - Alleen feiten — geen speculatie
> - Schrijf naar: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/skills/
> ```

**Taken:**
- [ ] `[PAR]` `agents/skills/oa-cli-usage/SKILL.md` schrijven
- [ ] `[PAR]` `agents/skills/tmux-environment/SKILL.md` schrijven

---

### Fase 26.7: Architectuurbeslissing Documenteren `[SEQ na 26.1-26.4]`

- [ ] `DECISIONS.md` — D-065: libtmux als primaire tmux-binding (vervangt subprocess)
- [ ] `DECISIONS.md` — D-066: watchdog als primaire file-event mechanisme
- [ ] `DECISIONS.md` — D-067: tmux layout presets voor agent-team visualisatie
- [ ] `LESSONS.md` — nieuwe lessen uit sprint 26

---

### Acceptatiecriteria Sprint 26

- `oa start` gebruikt TmuxAdapter (geen subprocess strings meer in tmux.py)
- Dashboard reageert binnen 500ms op agents.json wijziging (was: 2s polling)
- `oa status --verbose` toont CPU% en memory MB per actieve agent
- `oa layout team-naam --preset QUAD` opent 4-pane tmux layout in één commando
- `oa watch-tree` toont alle actieve agents in TREE layout (live updates)
- 4 CLI-package skills beschikbaar in `~/.claude/skills/`
- 2 agent-skills beschikbaar in `agents/skills/`

---

**Sprint 26 issues mapping:**

| Issue | Titel | Fase |
|-------|-------|------|
| [#47](https://github.com/OpenAEC-Foundation/Open-Agents/issues/47) | CLI Toolchain Evaluatie | Fase 26.1 (libtmux implementatie) |
| [#51](https://github.com/OpenAEC-Foundation/Open-Agents/issues/51) | Tmux als Agent Container Runtime | Fase 26.1 + 26.4 (upgrade) |
| [#56](https://github.com/OpenAEC-Foundation/Open-Agents/issues/56) | Observability & Logging | Fase 26.3 (psutil metrics) |

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
