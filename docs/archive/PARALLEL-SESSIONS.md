# Parallelle Claude Code Sessies — Sprint 10 Remainder

> **Aangemaakt**: 2026-03-05
> **Bron**: MASTERPLAN.md Sprint 10, ROADMAP.md
> **Status Sprint 10**: 56% (9/16 taken afgerond)
>
> Dit document bevat instructies voor **4 parallelle Claude Code sessies** die elk
> onafhankelijk aan Sprint 10 taken werken. Elke sessie draait op een eigen branch
> en gebruikt subagents voor parallellisatie binnen de sessie.

---

## Huidige Status — Wat is AF

| Taak | Status |
|------|--------|
| Code audit (P1/P2/P3 rapport) | DONE |
| ModelDisplayInfo type opruimen | DONE |
| AgentDefinition type consolidatie | DONE |
| Memory cleanup (TTL + hard cap) | DONE |
| CI/CD pipeline (GitHub Actions) | DONE |
| statusColors DRY extractie | DONE |
| @dagrejs/dagre dependency fix | DONE |
| Backend refactor (SSE, singleton, routes) | DONE |
| Frontend refactor (nodeBorderStyle DRY) | DONE |

## Wat nog OPEN staat

| # | Taak | Sessie | Prioriteit |
|---|------|--------|-----------|
| 1 | testCommand() wiring (D-035) | A | HOOG |
| 2 | Non-Claude runtime tool use (D-032) | A | MEDIUM |
| 3 | Test suite uitbreiden | A | HOOG |
| 4 | NodeType D-023 uitbreiden | B | MEDIUM |
| 5 | MCP tool auto-generatie (D-031) | B | MEDIUM |
| 6 | API documentatie (OpenAPI/Swagger) | C | HOOG |
| 7 | README + CONTRIBUTING + CHANGELOG | C | HOOG |
| 8 | v0.1.0 release voorbereiding | C | HOOG |
| 9 | Agent Library schalen (910+ agents) | D | MEDIUM |

---

## Conflict Matrix

```
                   Sessie A        Sessie B         Sessie C         Sessie D
                   (Backend)       (Types+VSC)      (Docs)           (Agents)
─────────────────────────────────────────────────────────────────────────────────
execution-engine     SCHRIJFT        leest            -                -
runtimes/            SCHRIJFT        -                -                -
shared/types.ts      leest           SCHRIJFT         -                -
vscode-extension/    -               SCHRIJFT         -                -
commands/            -               SCHRIJFT         -                -
routes/              leest           -                leest            -
agents/library/      -               -                -                SCHRIJFT
docs/                -               -                SCHRIJFT         -
README.md            -               -                SCHRIJFT         -
tests/               SCHRIJFT        SCHRIJFT(*)      -                -
─────────────────────────────────────────────────────────────────────────────────

(*) Sessie B schrijft tests voor types, Sessie A voor backend — geen overlap
```

**Merge volgorde**: D → C → B → A → v0.1.0 tag
(Agent library eerst = meeste bestanden, minste conflicten. Backend laatst = kan alle types gebruiken.)

---

## Sessie A: Backend Engineering

**Branch**: `feature/sprint-10a-backend-enforcement`
**Focus**: D-035 (bash enforcement), D-032 (non-Claude tool use), test suite
**Raakt**: `packages/backend/src/`, `packages/shared/src/__tests__/`

### Instructie

```
Je bent een backend engineer voor Open-Agents, een visueel agent orchestratie platform.

=== SESSION PROTOCOL ===
1. Lees ROADMAP.md → check huidige status
2. Lees DECISIONS.md → zoek D-035 en D-032
3. Lees MASTERPLAN.md → Sprint 10 sectie
4. git checkout -b feature/sprint-10a-backend-enforcement

=== CONTEXT ===
Sprint 10 (Refactor & Consolidatie) is 56% af. Jij werkt aan 3 resterende taken:

1. **D-035: testCommand() wiring in execution engine**
   - safety-store.ts bevat testCommand(command: string) dat bash commands checkt
   - De execution engine (execution-engine.ts) filtert tools via resolveRules()
     maar controleert NIET de inhoud van bash commands
   - Opdracht: Wire testCommand() in de execution engine zodat bij elke
     "Bash" tool invocation de command content wordt gevalideerd tegen safety rules
   - Bestanden:
     - packages/backend/src/execution-engine.ts (enforcement punt)
     - packages/backend/src/routes/safety.ts (bestaande test API)
     - packages/frontend/src/stores/slices/safetySlice.ts (frontend rules)

2. **D-032: Non-Claude runtime tool use support**
   - Huidige staat: OpenAI, Mistral, Ollama adapters doen text-in/text-out (geen tools)
   - De AgentRuntime interface ondersteunt tool use maar alleen ClaudeSDKRuntime
     implementeert het daadwerkelijk
   - Opdracht: Voeg basis tool use toe aan minimaal OpenAI runtime:
     - OpenAI function calling API integratie
     - Map onze AgentTool types naar OpenAI tool definitions
     - Test met GPT-4o + Read/Write tools
   - Bestanden:
     - packages/backend/src/runtimes/openai.ts
     - packages/backend/src/runtimes/claude-sdk.ts (referentie)
     - packages/shared/src/runtime.ts (interface)

3. **Test suite uitbreiden**
   - Huidige tests: alleen in packages/shared/ en packages/knowledge/
   - Geen tests in packages/backend/
   - Opdracht: Schrijf tests voor:
     - execution-engine.ts: topologische sort, run lifecycle, pause/resume
     - Safety enforcement: tool filtering, bash command validation
     - Runtime adapter interface compliance (alle 4 adapters)
     - Route handlers: agents CRUD, execution start/stop
   - Gebruik Vitest (al geconfigureerd in monorepo)

=== WERKWIJZE ===
- Gebruik subagents (Task tool) voor parallelle taken waar mogelijk
- Start met D-035 (hoogste prioriteit — security gap)
- Daarna D-032 (medium — uitbreiding)
- Parallel: tests schrijven voor elke voltooide taak
- Commit conventie: "fix: wire testCommand enforcement (D-035)",
  "feat: OpenAI tool use support (D-032)", "test: backend test suite"

=== NIET DOEN ===
- Wijzig GEEN shared/src/types.ts (dat doet Sessie B)
- Wijzig GEEN frontend bestanden (behalve als D-035 frontend changes vereist)
- Wijzig GEEN docs/ (dat doet Sessie C)
- Maak GEEN nieuwe agent JSON bestanden (dat doet Sessie D)

=== NA AFRONDING ===
Update ROADMAP.md: vink af:
- [x] testCommand() wiring in execution engine (D-035)
- [x] Non-Claude runtime tool use support (D-032)
- [x] Test suite uitbreiden
Commit: "docs: mark D-035, D-032, test suite as complete"
```

---

## Sessie B: Type System + VS Code Extension

**Branch**: `feature/sprint-10b-types-vscode`
**Focus**: D-023 (NodeType uitbreiding), D-031 (MCP auto-generatie)
**Raakt**: `packages/shared/src/`, `packages/vscode-extension/`, `packages/frontend/src/commands/`

### Instructie

```
Je bent een platform architect voor Open-Agents, een visueel agent orchestratie platform.

=== SESSION PROTOCOL ===
1. Lees ROADMAP.md → check huidige status
2. Lees DECISIONS.md → zoek D-023 en D-031
3. Lees packages/shared/src/types.ts → huidige NodeType definitie
4. Lees packages/frontend/src/commands/ → CommandRegistry patroon
5. Lees packages/vscode-extension/src/mcp/ → huidige MCP tools
6. git checkout -b feature/sprint-10b-types-vscode

=== CONTEXT ===
Sprint 10 (Refactor & Consolidatie) is 56% af. Jij werkt aan 2 taken:

1. **D-023: NodeType uitbreiden**
   - Huidige NodeType: "agent" | "dispatcher" | "aggregator"
   - D-023 taxonomie definieert 6 types:
     * agent (top-level, eigen context window)
     * teammate (peer-to-peer, mailbox communicatie)
     * skill (geen eigen context, deelt parent's)
     * connector (MCP server)
     * gate (hook/conditional)
     * dispatcher (routing logica — bestaat al)
   - "aggregator" is een PoC utility type dat niet in D-023 staat
   - Opdracht:
     a) Breid NodeType uit in packages/shared/src/types.ts
     b) Voeg data interfaces toe: TeammateNodeData, SkillNodeData,
        ConnectorNodeData, GateNodeData
     c) Voeg type guards toe: isTeammateNode(), isSkillNode(), etc.
     d) Behoud "aggregator" als backwards-compatible alias of deprecate
     e) Update isomorfische CanvasNodeData union type
   - Let op: frontend components (AgentNode.tsx, DispatcherNode.tsx,
     AggregatorNode.tsx) hoeven nog NIET aangepast — alleen types

2. **D-031: MCP tool auto-generatie pipeline**
   - Huidige staat: CommandRegistry in packages/frontend/src/commands/ heeft
     getMcpTools() die MCP tool definitions genereert
   - VS Code extension heeft hardcoded MCP tools in packages/vscode-extension/
     src/mcp/tools.ts
   - Opdracht: Verbind de CommandRegistry met de VS Code extension:
     a) Verplaats CommandDef en getMcpTools() naar packages/shared/ zodat
        zowel frontend als vscode-extension ze kunnen gebruiken
     b) Genereer MCP tools vanuit CommandRegistry in plaats van hardcoded
     c) Wire in de VS Code MCP server (packages/vscode-extension/src/mcp/)
     d) Test: nieuwe canvas command → automatisch beschikbaar als MCP tool

=== WERKWIJZE ===
- Gebruik subagents voor parallel research en implementatie
- Start met D-023 (types eerst — andere sessies lezen shared/types.ts)
- Daarna D-031 (bouwt voort op gedeelde types)
- Schrijf tests voor de nieuwe type guards in packages/shared/src/__tests__/

=== NIET DOEN ===
- Wijzig GEEN execution-engine.ts (dat doet Sessie A)
- Wijzig GEEN runtime adapters (dat doet Sessie A)
- Wijzig GEEN docs/ (dat doet Sessie C)
- Maak GEEN nieuwe agent JSON bestanden (dat doet Sessie D)
- Maak GEEN frontend React componenten voor nieuwe node types (dat is Sprint 11+)

=== NA AFRONDING ===
Update ROADMAP.md: vink af:
- [x] NodeType uitbreiden naar D-023 specificatie
- [x] MCP tool auto-generatie pipeline (D-031)
Commit: "docs: mark D-023, D-031 as complete"
```

---

## Sessie C: Documentatie & Release Prep

**Branch**: `feature/sprint-10c-docs-release`
**Focus**: API docs, README, CONTRIBUTING, CHANGELOG, v0.1.0 prep
**Raakt**: `docs/`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`

### Instructie

```
Je bent een technical writer en release engineer voor Open-Agents,
een visueel agent orchestratie platform.

=== SESSION PROTOCOL ===
1. Lees ROADMAP.md → project overzicht en status
2. Lees MASTERPLAN.md → alle sprints en features
3. Lees PRINCIPLES.md → design filosofie
4. Lees REQUIREMENTS.md → FR en NFR lijst
5. Scan packages/backend/src/routes/ → alle API endpoints
6. Scan packages/backend/src/server.ts → route registratie
7. git checkout -b feature/sprint-10c-docs-release

=== CONTEXT ===
Open-Agents is een visueel agent orchestratie platform gebouwd met:
- React 19 + React Flow v12 + Tailwind 4 (frontend)
- Fastify + Node.js (backend)
- pnpm monorepo met 6 packages (frontend, backend, shared, knowledge, vscode-extension, vscode-webview)
- Multi-provider LLM support (Anthropic, OpenAI, Mistral, Ollama)

Alle 9 sprints zijn COMPLEET. Sprint 10 (Refactor) is 56% af.
90 agents geïmplementeerd van de 1015 gedefinieerde.

=== OPDRACHT 1: API Documentatie (OpenAPI/Swagger) ===

Genereer een OpenAPI 3.0 specificatie voor alle backend endpoints:

Backend routes (15 route files):
- /api/health — Health check
- /api/agents — Agent CRUD (GET, POST, PUT, DELETE)
- /api/presets — Preset agents (GET)
- /api/configs — Canvas config CRUD (GET, POST, PUT, DELETE)
- /api/execute — Execution control (POST start, POST pause/resume/cancel, GET status, SSE stream)
- /api/chat — Per-node chat (POST, SSE stream)
- /api/connect — Provider connection test (POST)
- /api/safety — Safety rules CRUD + test (GET, POST, PUT, DELETE, POST test)
- /api/audit — Audit log (GET runs, GET run details)
- /api/generate — LLM asset generation (POST, SSE stream)
- /api/assembly — Assembly pipeline (POST classify, POST generate)
- /api/assistant — AI assistant (POST chat SSE, POST suggestions)
- /api/knowledge — Knowledge registry (GET patterns, principles, blocks, models, tools, estimate-cost, validate)
- /api/templates — Flow/pool templates (GET)
- /api/instructions — User instructions CRUD (GET, PUT)

Sla op als: docs/api/openapi.yaml
Optioneel: voeg Swagger UI toe via @fastify/swagger

=== OPDRACHT 2: README.md herschrijven ===

Herschrijf README.md met:
1. Project beschrijving (kort, krachtig, Engels)
2. Key features lijst
3. Screenshots/ASCII art van canvas
4. Quick Start (prerequisites, install, run)
5. Architecture overzicht (monorepo structuur, 3 engineering lagen)
6. Multi-provider support tabel
7. Agent Library status (90/1000)
8. Development setup
9. Contributing link
10. License (MIT)

=== OPDRACHT 3: CONTRIBUTING.md ===

Schrijf CONTRIBUTING.md:
1. Development setup (pnpm, Node 20+, Docker optioneel)
2. Code conventies (TypeScript strict, Conventional Commits)
3. Branch strategie (feature branches → main)
4. PR process
5. Taalbeleid (Nederlands docs, Engels code)
6. Test verwachtingen

=== OPDRACHT 4: CHANGELOG.md bijwerken ===

Genereer CHANGELOG.md entries uit git history.
Format: Keep a Changelog (https://keepachangelog.com/).
Groepeer per sprint/fase, niet per commit.

=== WERKWIJZE ===
- Gebruik subagents voor parallel werk:
  * Agent 1: Scan alle route bestanden → genereer OpenAPI spec
  * Agent 2: Lees MASTERPLAN + ROADMAP → schrijf README
  * Agent 3: Lees bestaande conventies → schrijf CONTRIBUTING
  * Agent 4: Scan git log → genereer CHANGELOG
- Commit per deliverable: "docs: add OpenAPI spec", "docs: rewrite README",
  "docs: add CONTRIBUTING", "docs: update CHANGELOG"

=== NIET DOEN ===
- Wijzig GEEN broncode (alleen documentatie)
- Wijzig GEEN ROADMAP.md of MASTERPLAN.md (behalve links/referenties)
- Maak GEEN code wijzigingen
- Tag GEEN v0.1.0 release (dat doen we na merge van alle sessies)

=== NA AFRONDING ===
Update ROADMAP.md: vink af:
- [x] API documentatie (OpenAPI/Swagger)
- [x] README + CONTRIBUTING + CHANGELOG
Commit: "docs: mark documentation tasks as complete"
```

---

## Sessie D: Agent Library Scale

**Branch**: `feature/sprint-10d-agent-library`
**Focus**: 910+ nieuwe agents genereren in batches
**Raakt**: `agents/library/`, `AGENTS.md` (alleen lezen)

### Instructie

```
Je bent een content engineer voor Open-Agents, een visueel agent orchestratie platform.

=== SESSION PROTOCOL ===
1. Lees AGENTS.md → 1015 atomaire agent definities in 20 categorieën (A-T)
2. Lees agents/library/ → welke agents bestaan al (90 stuks)
3. Lees agents/presets/ → preset format als referentie
4. git checkout -b feature/sprint-10d-agent-library

=== CONTEXT ===
AGENTS.md definieert 1015 agents in 20 categorieën (A-T).
90 agents zijn al geïmplementeerd in JSON in agents/library/:
- core/ (10): summarize, translate, explain-code, find-bugs, generate-test,
  format-code, generate-commit-msg, check-security, read-file, search-in-files
- text-language/ (10)
- code-dev/ (10)
- review-quality/ (10)
- data-transform/ (10)
- git-versioning/ (8)
- research/ (10)
- communication/ (7)
- file-system/ (5)
- erpnext/ (10)

=== OPDRACHT: Schaal Agent Library ===

Genereer agents in batches per categorie. Elke agent is een JSON bestand met:
{
  "id": "category-name",
  "name": "Descriptive Name",
  "category": "category-id",
  "description": "Wat deze agent doet (1 zin)",
  "model_hint": "haiku" | "sonnet",
  "system_prompt": "Je bent een gespecialiseerde AI die ...",
  "tools": ["Read", "Write", ...],
  "input_spec": "Wat de agent verwacht",
  "output_spec": "Wat de agent retourneert",
  "source": "library",
  "readonly": true
}

=== PRIORITEIT CATEGORIEËN ===

Batch 1 (hoogste waarde — breid bestaande uit):
- J. DevOps & Infrastructure (nieuw, ~50 agents)
- K. Security & Compliance (nieuw, ~50 agents)
- L. Testing & QA (nieuw, ~50 agents)

Batch 2 (nieuwe domeinen):
- M. Database & Data Engineering (~50 agents)
- N. API & Integration (~50 agents)
- O. Cloud & Platform (~50 agents)

Batch 3 (specialistisch):
- P. Machine Learning & AI (~50 agents)
- Q. Frontend & UI (~50 agents)
- R. Documentation & Knowledge (~50 agents)

Batch 4 (enterprise):
- S. Project Management (~50 agents)
- T. Business & Analytics (~50 agents)

=== WERKWIJZE ===
- Gebruik subagents INTENSIEF — elke categorie in een eigen subagent
- Lanceer 3-4 subagents tegelijk voor maximale parallellisatie
- Elke subagent genereert 50 agent JSON bestanden in agents/library/{category}/
- Controleer dat IDs uniek zijn en geen duplicaten van bestaande agents
- model_hint keuze: "haiku" voor classificatie/transformatie/validatie,
  "sonnet" voor generatie/analyse/redenering
- tools: zo min mogelijk, alleen wat de agent echt nodig heeft
- system_prompt: kort (max 200 woorden), gefocust, geen fluff

=== KWALITEITSCRITERIA ===
- Elke agent doet PRECIES ÉÉN ding (atomair principe)
- Beschrijving is helder en specifiek
- Tools zijn minimaal en relevant
- System prompt volgt het patroon: "Je bent een gespecialiseerde [rol] die [taak]."
- Geen overlap met bestaande agents
- JSON is valide en volgt het bestaande format

=== COMMIT STRATEGIE ===
Commit per batch:
- "feat: 50 devops agents (Sprint 9, category J)"
- "feat: 50 security agents (Sprint 9, category K)"
- etc.

=== NA AFRONDING ===
Update ROADMAP.md: Agent Library teller bijwerken (90 → nieuw totaal).
```

---

## Sessie E: Open-VSCode-Controller Stabiliseren

**Repository**: `C:\Users\Freek Heijting\Documents\GitHub\Open-VSCode-Controller` (APART project)
**Focus**: HTTP Bridge testen, CLI testen, MCP Server testen, .vsix bouwen
**Raakt**: Alleen Open-VSCode-Controller repo — GEEN wijzigingen in Open-Agents

> **Toekomst**: Open-VSCode-Controller wordt een integratiepunt voor Open-Agents (D-041).
> Agents op het canvas kunnen straks VS Code programmatisch aansturen via HTTP Bridge / MCP.
> Integratiestrategie (compose/absorb/extension pack) wordt later bepaald.

### Wat is Open-VSCode-Controller?

Programmatische VS Code controle via:
- **HTTP Bridge** (port 7483) — 40+ endpoints: editor, terminal, files, git, debug, extensions
- **MCP Server** (25 tools) — stdio transport, proxy naar HTTP bridge
- **CLI** (`vscode-ctrl`) — command-line interface voor alle endpoints
- **WebSocket** — real-time events (editor changes, terminal events, agent lifecycle)
- **Agent Orchestrator** — spawnt autonome Claude Code agents in sandboxed terminals

### Huidige status

| Phase | Status |
|-------|--------|
| Phase 0: Foundation | COMPLETE |
| Phase 1: HTTP Bridge | ~30% getest |
| Phase 2: CLI | Niet gestart |
| Phase 3: MCP Server | Niet gestart |
| Phase 4: WebSocket Events | Niet gestart |

### Instructie

```
Je werkt aan Open-VSCode-Controller, een VS Code extension die programmatische
controle over VS Code biedt via HTTP Bridge + MCP Server + CLI.

=== SESSION PROTOCOL ===
1. Lees MASTERPLAN.md → welke fases zijn af, welke niet
2. Lees ROADMAP.md → huidige status
3. Lees packages/shared/src/types.ts → API contract (23 interfaces)
4. Lees packages/vscode-extension/src/httpServer.ts → route definities
5. WERK IN: C:/Users/Freek Heijting/Documents/GitHub/Open-VSCode-Controller

=== CONTEXT ===
Phase 0 (Foundation) is COMPLETE. Phase 1 (HTTP Bridge) is ~30% getest.
Phase 2 (CLI), 3 (MCP), 4 (WebSocket) zijn nog niet gestart.

Monorepo met 3 packages:
- packages/shared/ — API types + constants
- packages/vscode-extension/ — HTTP bridge + handlers + MCP server
- packages/cli/ — CLI tool

8 handler modules:
- handlers/editor.ts (9 functies: open, close, getText, insertText, etc.)
- handlers/files.ts (7 functies: read, write, create, delete, list, etc.)
- handlers/terminal.ts (4 functies: list, create, send, kill)
- handlers/window.ts (3 functies: workspace, window state, execute command)
- handlers/extensions.ts (1 functie: list extensions)
- handlers/debug.ts (3 functies: state, start, stop)
- handlers/scm.ts (1 functie: git status)
- handlers/tasks.ts (2 functies: list, run)
- handlers/orchestrator.ts (5 functies: spawn, status, list, kill, results)

=== OPDRACHT: Phase 1-3 afronden ===

**Phase 1: HTTP Bridge testen en stabiliseren**
1. Start Extension Development Host (F5 in VS Code)
2. Test ALLE handler modules systematisch:
   - Editor: GET /editor/active, POST /editor/open, POST /editor/insert,
     POST /editor/replace, GET /editor/text, POST /editor/cursor,
     POST /editor/selection, GET /editor/tabs, POST /editor/close
   - Files: GET /files/read, POST /files/write, POST /files/create,
     DELETE /files/delete, POST /files/rename, GET /files/exists,
     GET /files/list
   - Terminal: GET /terminal/list, POST /terminal/create,
     POST /terminal/send, DELETE /terminal/kill
   - Window: GET /workspace/state, GET /window/state,
     POST /commands/execute
   - Other: GET /extensions/list, GET /debug/state, GET /scm/status,
     GET /tasks/list
3. Fix bugs die je vindt
4. Documenteer wat werkt en wat niet in ROADMAP.md

**Phase 2: CLI testen**
1. Build CLI package: pnpm --filter @vscode-ctrl/cli build
2. Test basiscommando's:
   - vscode-ctrl status
   - vscode-ctrl editor open <file>
   - vscode-ctrl files read <path>
   - vscode-ctrl terminal create --name test
3. Fix eventuele client.ts issues

**Phase 3: MCP Server testen**
1. Configureer .mcp.json in een test workspace
2. Start MCP server via Claude Code
3. Test minimaal deze tools: health, workspace_state, open_file,
   get_active_editor, create_terminal, read_file, list_directory
4. Fix tool parameter validatie issues (Zod schemas)

**Bonus: .vsix bouwen**
1. npm install -g @vscode/vsce
2. cd packages/vscode-extension && vsce package
3. Test installatie in productie VS Code (niet Extension Dev Host)

=== WERKWIJZE ===
- Gebruik subagents (Task tool) voor parallel testen:
  * Agent 1: Editor + Files handlers testen
  * Agent 2: Terminal + Window + Extensions handlers testen
  * Agent 3: CLI commands testen
- Commit per handler groep: "test: verify editor handlers",
  "fix: terminal create handler", etc.

=== NA AFRONDING ===
Update ROADMAP.md met Phase 1-3 status.
Commit als: "feat: stabilize HTTP bridge + CLI + MCP (Phase 1-3)"
```

---

## Uitvoeringsplan

### Stap 1: Branches aanmaken
```bash
git checkout main
git pull origin main
git checkout -b feature/sprint-10a-backend-enforcement
git push -u origin feature/sprint-10a-backend-enforcement

git checkout main
git checkout -b feature/sprint-10b-types-vscode
git push -u origin feature/sprint-10b-types-vscode

git checkout main
git checkout -b feature/sprint-10c-docs-release
git push -u origin feature/sprint-10c-docs-release

git checkout main
git checkout -b feature/sprint-10d-agent-library
git push -u origin feature/sprint-10d-agent-library
```

### Stap 2: Sessies starten
Open 4 Claude Code terminals/tabs. Kopieer de instructie voor elke sessie.

### Stap 3: Merge volgorde
```
1. feature/sprint-10d-agent-library → main   (meeste files, minste conflicten)
2. feature/sprint-10c-docs-release  → main   (alleen docs, geen code)
3. feature/sprint-10b-types-vscode  → main   (shared types, VS Code)
4. feature/sprint-10a-backend-enforcement → main (backend, kan alle types gebruiken)
5. Tag: v0.1.0
```

### Stap 4: Release
Na alle merges:
```bash
git checkout main
git pull origin main
git tag -a v0.1.0 -m "v0.1.0 — First complete iteration"
git push origin v0.1.0
```

---

## Tips per Sessie

### Subagent gebruik
Elke sessie moet subagents (Task tool) gebruiken voor parallellisatie:

| Sessie | Subagent strategie |
|--------|--------------------|
| A | Agent 1: D-035 enforcement code. Agent 2: D-032 OpenAI tool use. Agent 3: Tests schrijven. |
| B | Agent 1: D-023 type definitions. Agent 2: D-031 MCP pipeline. |
| C | Agent 1: OpenAPI scan. Agent 2: README. Agent 3: CONTRIBUTING. Agent 4: CHANGELOG. |
| D | Agent 1-4: Elk een categorie agents (50 per agent). Herhaal voor alle batches. |
| E | Agent 1: Editor+Files handlers. Agent 2: Terminal+Window handlers. Agent 3: CLI commands. |

### Wanneer STOPPEN en overleggen
- Als je een bestand moet wijzigen dat een andere sessie ook wijzigt → STOP
- Als je een architectuurbeslissing moet nemen die niet in DECISIONS.md staat → STOP
- Als een test faalt die niet gerelateerd is aan jouw werk → STOP
- Meld het aan de gebruiker en wacht op instructie

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
