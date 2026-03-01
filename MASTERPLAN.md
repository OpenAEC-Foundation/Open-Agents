# Masterplan - Open-Agents

> **Versie**: 0.5
> **Laatste update**: 2026-03-03
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
| 6c | AI Assembly Assistant | Sidebar kennispartner + pattern library | Sprint 6b | Planned |
| 7 | VS Code Extension | Canvas als VS Code webview + MCP | Sprint 1 | Done |
| 8 | Frappe App | Frappe wrapper + ERPNext templates | Sprint 1 | Done |
| 9 | Agent Library | 1000+ atomaire agents bouwen + Anthropic Agent Teams model | Sprint 2 | Planned |
| 10 | Refactor & Consolidatie | Refactor van alles uit eerste Scrum iteratie | Sprint 1-9 | Planned |

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

Sprint 6a-6c is de nieuwe Semantische Laag, opgesplitst in:
  6a: Knowledge Base (FR-16) - kennisbibliotheek + snippet engine
  6b: Assembly Engine (FR-17) - NL → agent graph generatie
  6c: AI Assistant (FR-18, FR-19) - sidebar + pattern library

Sprint 9 (Agent Library) loopt DOORLOPEND naast alle sprints (vanaf Sprint 2)
Sprint 10 (Refactor) start NA voltooiing van Sprint 1-9
```

> **Na Sprint 1.5 kunnen Sprints 2, 3, 5, 6a, 7 en 8 parallel starten.**
> **Sprint 6a → 6b → 6c is sequentieel (elke stap bouwt voort).**
> **Sprint 9 (Agent Library) loopt continu en vult retroactief agents aan in elke sprint.**
> **Sprint 10 (Refactor) is de laatste sprint: consolideert en refactort alles.**

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
- [ ] `assistant-engine.ts` met context-aware system prompts
- [ ] `POST /api/assistant/chat` met SSE streaming
- [ ] `POST /api/assistant/suggestions` voor passieve analyse
- [ ] `assistantStore.ts` (Zustand)
- [ ] `useAssistant.ts` hook
- [ ] CanvasAction types + applyAction logic → canvasStore

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
- [ ] `AssistantSidebar.tsx` component
- [ ] Chat message list (user/assistant bubbles)
- [ ] Context selector dropdown
- [ ] Inline suggestie kaarten met "Apply" knoppen
- [ ] Cost estimate badge
- [ ] Input bar met send knop
- [ ] Collapse/expand toggle
- [ ] Integratie in `App.tsx` layout
- [ ] E2E test: vraag → antwoord → apply suggestie

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
- [ ] 10 core agent YAML bestanden
- [ ] Agent loader in backend (leest YAML, maakt beschikbaar via API)
- [ ] Agents zichtbaar in Factory library

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
- [ ] `[PAR]` 10 Text & Taal agents
- [ ] `[PAR]` 10 Code & Development agents
- [ ] `[PAR]` 10 Review & Kwaliteit agents
- [ ] `[PAR]` 10 Data & Transformatie agents

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
- [ ] `[PAR]` 8 Git & Versioning agents
- [ ] `[PAR]` 10 Research & Analyse agents
- [ ] `[PAR]` 7 Communicatie & Rapportage agents
- [ ] `[PAR]` 5 File & System agents

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
- [ ] 10 ERPNext agent YAML bestanden
- [ ] ERPNext MCP server integratie (voor API calls naar ERPNext)

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
- [ ] 5 flow templates (JSON canvas configs)
- [ ] 5 pool templates (JSON canvas configs)
- [ ] Templates laden via Factory portal

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
- [ ] Code audit rapport genereren
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
- [ ] `[PAR]` Backend refactor
- [ ] `[PAR]` Frontend refactor
- [ ] `[PAR]` Test suite uitbreiden voor gerefactorde code
- [ ] `[PAR]` API documentatie bijwerken (OpenAPI/Swagger)

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
- [ ] README.md herschrijven
- [ ] CONTRIBUTING.md aanmaken
- [ ] CHANGELOG.md genereren
- [ ] Open beslissingen reviewen
- [ ] CI/CD pipeline opzetten
- [ ] v0.1.0 release

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

*Impertio Studio B.V. — AI ecosystems, deployed right.*
