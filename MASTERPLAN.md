# Masterplan - Open-Agents

> **Versie**: 0.2
> **Laatste update**: 2026-02-28
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
| 1 | Proof of Concept | Minimale canvas → Claude Code, e2e | Sprint 0 | **Active** |
| 2 | Factory Portal | Agents aanmaken via UI | Sprint 1 | Planned |
| 3 | Flow Pattern | Sequentiële pipeline werkend | Sprint 1 | Planned |
| 4 | Pool Pattern | Dispatcher + parallelle execution | Sprint 3 | Planned |
| 5 | Safety & Audit | Rules editor + audit trail | Sprint 1 | Planned |
| 6 | Semantische Laag | Natural language → architectuur | Sprint 2, 3 | Planned |
| 7 | VS Code Extension | Canvas als VS Code webview + MCP | Sprint 1 | Planned |
| 8 | Frappe App | Frappe wrapper + ERPNext templates | Sprint 1 | Planned |
| 9 | Agent Library | 100 atomaire agents bouwen + Anthropic Agent Teams model | Sprint 2 | Planned |
| 10 | Refactor & Consolidatie | Refactor van alles uit eerste Scrum iteratie | Sprint 1-9 | Planned |

```
Sprint 0 ──→ Sprint 1 ──┬──→ Sprint 2 ──→ Sprint 6
                         ├──→ Sprint 3 ──→ Sprint 4
                         ├──→ Sprint 5
                         ├──→ Sprint 7
                         └──→ Sprint 8

Sprint 9 (Agent Library) loopt DOORLOPEND naast alle sprints (vanaf Sprint 2)
Sprint 10 (Refactor) start NA voltooiing van Sprint 1-9
```

> **Na Sprint 1 kunnen Sprints 2, 3, 5, 7 en 8 parallel starten.**
> **Sprint 9 (Agent Library) loopt continu en vult retroactief agents aan in elke sprint.**
> **Sprint 10 (Refactor) is de laatste sprint: consolideert en refactort alles.**

---

## Sprint 0: Foundation ✅

**Status**: Done (commit `c3e4e62`)

- [x] Visie verscherpt: van ERPNext-first naar generiek visueel platform
- [x] REQUIREMENTS.md geschreven (12 FR + 5 NFR)
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
- [ ] Mono-repo structuur opzetten
- [ ] Frontend project initialiseren
- [ ] Backend project initialiseren
- [ ] Shared types package
- [ ] Docker-compose dev environment
- [ ] Setup instructies

### Fase 1.3: Canvas UI `[PAR]` — parallel met 1.4

> **Prompt**:
> ```
> Bouw de minimale canvas editor voor Open-Agents.
>
> Gebruik [gekozen canvas library] en maak:
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
- [ ] Canvas component met drag-and-drop
- [ ] Agent node type (naam, model, system prompt)
- [ ] Edge connections
- [ ] JSON export functie
- [ ] Sidebar met agent types

### Fase 1.4: Backend API `[PAR]` — parallel met 1.3

> **Prompt**:
> ```
> Bouw de minimale backend API voor Open-Agents.
>
> Endpoints:
> - POST /api/configs - sla een canvas configuratie op (JSON)
> - GET /api/configs/:id - haal een configuratie op
> - POST /api/execute - voer een configuratie uit via Claude Code Agent SDK
> - GET /api/execute/:id/status - status van een executie (streaming via SSE)
>
> De /api/execute endpoint moet:
> 1. De JSON config ontvangen (nodes + edges)
> 2. Voor elke node een Claude Code `claude -p` aanroep doen met:
>    - --append-system-prompt (de node's system prompt)
>    - --allowedTools (de node's tools)
>    - --output-format stream-json
> 3. Output streamen via Server-Sent Events
>
> Gebruik de Claude Code CLI via child_process of de Agent SDK package.
> Maak ook een health check endpoint: GET /api/health
> ```

**Taken:**
- [ ] Config CRUD endpoints
- [ ] Execute endpoint met Claude Code integratie
- [ ] SSE streaming voor real-time output
- [ ] Health check

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
- [ ] Frontend ↔ Backend API connectie
- [ ] Run knop + output panel
- [ ] Per-node status indicators
- [ ] E2E test met 2-node flow
- [ ] Demo bewijs (screenshot/video)

### Acceptatiecriteria

- Gebruiker sleept 2 blokken op canvas
- Gebruiker verbindt blokken met een edge
- "Run" voert configuratie uit via Claude Code
- Output verschijnt real-time in de UI

---

## Sprint 2: Factory Portal

**Doel**: Gebruikers kunnen nieuwe agents aanmaken via een intuïtieve interface.

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
- [ ] Tab navigatie systeem
- [ ] Factory startscherm
- [ ] Agent creation wizard (5 stappen)
- [ ] Agent CRUD API endpoints

### Fase 2.2: Asset Library `[PAR]` — parallel met 2.3

> **Prompt**:
> ```
> Bouw de Asset Library voor Open-Agents.
>
> Een overzichtspagina die alle aangemaakte assets toont:
> 1. Grid/lijst view van alle agents (kaartjes met naam, model, beschrijving)
> 2. Zoeken en filteren op naam, type, tags
> 3. Agent kaartje is sleepbaar naar het canvas (drag from library to canvas)
> 4. Detail view per agent (klik op kaartje → volledige config zien)
> 5. Edit en delete acties
>
> De library haalt data op via GET /api/agents.
> ```

**Taken:**
- [ ] Grid/lijst view
- [ ] Zoek en filter functionaliteit
- [ ] Drag from library to canvas
- [ ] Detail view
- [ ] Edit/delete acties

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
- [ ] 10 agent preset JSON bestanden
- [ ] Database seeding bij startup

### Fase 2.4: Conversational Agent Creation `[SEQ]` — na 2.1

> **Prompt**:
> ```
> Voeg een conversational mode toe aan de Factory.
>
> Naast de wizard kan de gebruiker ook een agent aanmaken door te typen:
> "Maak een agent die code reviewed en focust op security"
>
> Implementatie:
> 1. Tekstveld bovenaan de Factory pagina
> 2. Stuur beschrijving naar Claude via Agent SDK
> 3. Claude genereert: name, description, model, systemPrompt, tools
> 4. Toon gegenereerde config als preview
> 5. Gebruiker kan aanpassen en opslaan
>
> System prompt voor de generator:
> "Je bent een agent configuratie generator. Op basis van een beschrijving
> genereer je een complete agent config met name, description, model
> (haiku/sonnet/opus), systemPrompt en tools. Kies het lichtste model
> dat de taak aankan. Houd system prompts beknopt en gefocust."
> ```

**Taken:**
- [ ] Conversational input veld
- [ ] Agent config generator via Claude
- [ ] Preview en aanpas flow
- [ ] Opslaan naar library

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
> 2. Voer Node A uit via Claude Agent SDK
> 3. Capture de output van Node A
> 4. Inject output als context in Node B's prompt: "--append-system-prompt
>    'Vorige agent output: {output_A}'"
> 5. Voer Node B uit, capture output
> 6. Herhaal voor Node C etc.
>
> Backend model:
> - ExecutionRun {id, configId, status, steps: [{nodeId, status, output, startedAt, completedAt}]}
> - POST /api/execute start een run, returns runId
> - GET /api/runs/:id/stream SSE voor real-time updates per step
>
> Gebruik `--resume` als een stap moet worden hervat na een pauze.
> ```

**Taken:**
- [ ] Topologische sort voor executievolgorde
- [ ] Sequentiële execution met output passing
- [ ] ExecutionRun data model
- [ ] SSE streaming per step

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
- [ ] Node status kleuring (idle/running/done/error)
- [ ] Edge animatie
- [ ] Output preview per node
- [ ] SSE event listener

### Fase 3.3: Session Management `[PAR]` — parallel met 3.2

> **Prompt**:
> ```
> Voeg session management toe aan flow execution.
>
> 1. Pause knop: stopt executie na huidige stap (slaat session_id op)
> 2. Resume knop: hervat met `--resume <session_id>` vanaf laatste stap
> 3. Restart knop: start hele flow opnieuw
> 4. Cancel knop: breekt huidige agent af en stopt flow
>
> UI: toolbar boven het canvas met Run | Pause | Resume | Restart | Cancel
> Toon elapsed time per stap en totaal.
> ```

**Taken:**
- [ ] Pause/Resume met session_id
- [ ] Restart en Cancel functionaliteit
- [ ] Execution toolbar
- [ ] Elapsed time tracking

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
- [ ] Error handling (retry/skip/abort)
- [ ] 3 flow templates
- [ ] Template laden functionaliteit

---

## Sprint 4: Pool Pattern

**Doel**: Dispatcher-based orchestratie.

**Afhankelijk van**: Sprint 3 (flow engine werkt)

### Fase 4.1: Dispatcher Node `[SEQ]` — eerst

> **Prompt**:
> ```
> Maak een nieuw node type: Dispatcher.
>
> De Dispatcher is een speciaal canvas blok dat:
> 1. Meerdere uitgaande edges heeft (naar pool agents)
> 2. Een inkomend verzoek ontvangt
> 3. Via Claude classificeert welke agent(s) het moeten afhandelen
> 4. Het verzoek doorstuurt naar de juiste agent(s)
>
> Visueel: Dispatcher node is groter, heeft een ander icoon (router symbool),
> en toont welke agents in zijn pool zitten.
>
> Config: dispatcher node heeft een "routing prompt" die Claude gebruikt
> om te bepalen welke connected agents relevant zijn.
>
> Voorbeeld routing prompt:
> "Classificeer het volgende verzoek en bepaal welke specialist(en) het
> moeten afhandelen. Beschikbare specialisten: {connected_agent_names}.
> Antwoord met een JSON array van agent namen."
> ```

**Taken:**
- [ ] Dispatcher node type
- [ ] Routing prompt configuratie
- [ ] Classificatie via Claude
- [ ] Doorsturen naar juiste agent(s)

### Fase 4.2: Parallel Execution `[SEQ]` — na 4.1

> **Prompt**:
> ```
> Voeg parallelle agent execution toe aan de pool pattern.
>
> Wanneer de dispatcher meerdere agents selecteert:
> 1. Start alle geselecteerde agents gelijktijdig (Promise.all of worker threads)
> 2. Toon op canvas: alle actieve agents blauw, idle agents grijs
> 3. Verzamel alle outputs
> 4. Als er een "aggregator" node na de pool zit: combineer outputs als context
>
> Beperkingen:
> - Max 5 parallelle agents (configureerbaar)
> - Timeout per agent: 5 min (configureerbaar)
> - Als 1 agent faalt: andere gaan door, fout wordt gelogd
>
> API: POST /api/execute met mode: "pool"
> SSE stream bevat events per parallel agent.
> ```

**Taken:**
- [ ] Parallelle agent execution
- [ ] Canvas status voor meerdere actieve agents
- [ ] Output aggregatie
- [ ] Max concurrency + timeout

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
- [ ] `[PAR]` Safety rules editor UI
- [ ] `[PAR]` Safety rules backend (opslaan + meegeven aan Claude)
- [ ] `[PAR]` Audit trail data model + logging
- [ ] `[PAR]` Run history pagina
- [ ] `[SEQ]` Replay modus (na audit trail)

---

## Sprint 6: Semantische Laag

**Doel**: De app begrijpt natural language en genereert architecturen automatisch.

**Afhankelijk van**: Sprint 2 (Factory) + Sprint 3 (Flow pattern)

### Fase 6.1: Natural Language → Architecture `[SEQ]` — eerst

> **Prompt**:
> ```
> Bouw de semantische laag voor Open-Agents.
>
> Input: gebruiker typt "Ik wil een team dat mijn pull requests reviewed
> op code kwaliteit, security en performance"
>
> Output: automatisch gegenereerde canvas architectuur met:
> - Dispatcher node (ontvangt PR)
> - 3 specialist agents (Quality, Security, Performance)
> - Aggregator node (combineert feedback)
>
> Implementatie:
> 1. Tekstveld bovenaan de app (naast canvas tabs)
> 2. Stuur beschrijving naar Claude met system prompt:
>    "Je bent een agent architectuur generator. Op basis van een beschrijving
>    genereer je een JSON canvas configuratie met nodes en edges.
>    Gebruik deze node types: agent, dispatcher, aggregator.
>    Kies voor elke agent het juiste model en tools.
>    Antwoord met valid JSON: {nodes: [...], edges: [...]}"
> 3. Parse JSON response
> 4. Render op canvas (met auto-layout via dagre of ELK)
> 5. Gebruiker kan aanpassen en dan uitvoeren
> ```

**Taken:**
- [ ] NL input veld
- [ ] Architecture generation prompt
- [ ] JSON parsing en validatie
- [ ] Auto-layout op canvas

### Fase 6.2: Smart Suggestions `[SEQ]` — na 6.1

> **Prompt**:
> ```
> Voeg smart suggestions toe aan het canvas.
>
> Het systeem analyseert de huidige canvas configuratie en suggereert:
> 1. "Je hebt een Reviewer maar geen Tester - wil je die toevoegen?"
> 2. "Deze flow heeft geen error handling - voeg een Safety node toe?"
> 3. "Agent X gebruikt Opus maar de taak is simpel - Sonnet is goedkoper"
>
> Implementatie:
> - Analyseer canvas state bij elke wijziging
> - Stuur config naar Claude met prompt: "Analyseer deze agent architectuur
>   en geef max 3 verbeter-suggesties. Focus op: ontbrekende stappen,
>   model optimalisatie, safety gaps."
> - Toon suggesties als banner/toast boven het canvas
> - Klik op suggestie → voert wijziging automatisch door
> ```

**Taken:**
- [ ] Canvas state analyse
- [ ] Suggestie-generatie via Claude
- [ ] Suggestie UI (banners/toasts)
- [ ] One-click suggestie toepassen

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
- [ ] Extension scaffolding met yeoman
- [ ] Webview project (React + Vite)
- [ ] Build pipeline (extension + webview)
- [ ] postMessage bridge
- [ ] VS Code commands registreren

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
- [ ] Canvas component porten
- [ ] Vite bundle voor webview
- [ ] CSP headers correct
- [ ] State sync via postMessage
- [ ] Workspace storage persistentie

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
- [ ] MCP server (stdio transport)
- [ ] 6 MCP tools implementeren
- [ ] Registratie in .claude/settings.json
- [ ] Bidirectionele sync (MCP ↔ webview)

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
- [ ] MCP → Extension → Webview sync pipeline
- [ ] File watcher op agents/ directory
- [ ] End-to-end test
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
- [ ] Frappe app structuur
- [ ] Custom DocTypes
- [ ] Canvas embedding in Frappe Desk
- [ ] Whitelisted API endpoints

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
- [ ] 5 ERPNext templates (JSON)
- [ ] MCP server voor ERPNext API
- [ ] Template loader in Frappe app

---

## Sprint 9: Agent Library (Doorlopend)

**Doel**: 100 atomaire agents bouwen, georganiseerd per categorie. Elke agent doet één ding. Complexiteit ontstaat uit de architectuur (flows, pools), niet uit individuele agents.

**Afhankelijk van**: Sprint 2 (Factory portal voor het aanmaken)
**Loopt doorlopend**: Vult retroactief agents aan in elke sprint die ze nodig heeft.

**Referentiemodel**: Anthropic Agent Teams (`code.claude.com/docs/en/agent-teams`)
- Anthropic definieert agents met: duidelijke rol, eigen context window, spawn prompt
- Shared task list met self-claiming = ons Pool pattern
- Sequentiële dependencies = ons Flow pattern
- Plan approval workflow = onze gate nodes
- Quality hooks (`TeammateIdle`, `TaskCompleted`) = onze event triggers

> Zie `AGENTS.md` voor de volledige library van 100 atomaire agent definities.

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
| Agent library uitbreiden (doel: 100+) | Elke sprint | `[PAR]` altijd |
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
