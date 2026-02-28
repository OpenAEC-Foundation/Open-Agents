# Sprint Prompts — Open-Agents

> **Doel**: Kopieerbare prompts voor Claude Code sessies om de resterende sprints uit te voeren.
> **Gegenereerd**: 2026-03-02
> **Bron**: MASTERPLAN.md

---

## Executie Schema

```
PARALLEL GROEP 1 (kan NU allemaal tegelijk starten):
├── Sessie A: Sprint 4  — Pool Pattern         → feature/sprint-4-pool
├── Sessie B: Sprint 6b — Assembly Engine       → feature/sprint-6b-assembly
├── Sessie C: Sprint 8  — Frappe App            → feature/sprint-8-frappe
└── Sessie D: Sprint 9  — Agent Library         → feature/sprint-9-agents

SEQUENTIEEL (na Groep 1):
├── Sessie E: Sprint 6c — AI Assistant          → wacht op Sessie B (6b)
└── Sessie F: Sprint 10 — Refactor              → wacht op ALLES

⚠️  Sessie A en B wijzigen beide execution-engine.ts en CanvasPage.tsx.
    Start ze op aparte branches en merge sequentieel naar main.
```

---

## Sessie A: Sprint 4 — Pool Pattern `[PAR]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees ROADMAP.md, DECISIONS.md en MASTERPLAN.md (Sprint 4 sectie).

=== CONTEXT ===
Sprint 3 (Flow Pattern) is COMPLEET. De execution engine staat in:
- packages/backend/src/execution-engine.ts (topologische sort, SSE, pause/resume/cancel)
- packages/frontend/src/components/ExecutionToolbar.tsx (state machine)
- packages/frontend/src/components/ErrorDecisionDialog.tsx (retry/skip/abort)
- 4 runtime adapters: claude-sdk.ts, openai.ts, mistral.ts, ollama.ts

=== OPDRACHT: Sprint 4 — Pool Pattern ===

**Fase 4.1: Dispatcher Node**
1. Maak een nieuw node type "Dispatcher" in de frontend:
   - Visueel groter dan agent nodes, router icoon
   - Meerdere uitgaande edges (naar pool agents)
   - Config: "routing prompt" die Claude gebruikt om te classificeren
   - Voorbeeld routing prompt:
     "Classificeer het volgende verzoek en bepaal welke specialist(en) het
     moeten afhandelen. Beschikbare specialisten: {connected_agent_names}.
     Antwoord met een JSON array van agent namen."
2. Registreer het Dispatcher node type in React Flow
3. Voeg toe aan de Sidebar als sleepbaar element
4. Backend: herken dispatcher nodes in de execution engine

**Fase 4.2: Parallel Execution**
1. Wanneer de dispatcher meerdere agents selecteert:
   - Start alle geselecteerde agents gelijktijdig (Promise.allSettled)
   - Toon op canvas: alle actieve agents blauw, idle agents grijs
   - Verzamel alle outputs
   - Als er een "aggregator" node na de pool zit: combineer outputs als context
2. Beperkingen:
   - Max 5 parallelle agents (configureerbaar in settings)
   - Timeout per agent: 5 min (configureerbaar)
   - Als 1 agent faalt: andere gaan door, fout wordt gelogd
3. API: POST /api/execute met mode: "pool"
4. SSE stream bevat events per parallel agent

**Acceptatiecriteria:**
- Dispatcher node sleepbaar op canvas met routing prompt
- Classificatie via Claude werkt (stuurt naar juiste agents)
- Parallelle execution met Promise.allSettled
- Canvas toont meerdere actieve nodes tegelijk
- Output aggregatie werkt
- Bestaande flow pattern blijft ongewijzigd werken

Update ROADMAP.md en MASTERPLAN.md checkboxen als je klaar bent.
Commit als: "feat: pool pattern with dispatcher + parallel execution (Sprint 4)"
```

---

## Sessie B: Sprint 6b — Assembly Engine `[PAR]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees ROADMAP.md, DECISIONS.md (D-017, D-019, D-022) en MASTERPLAN.md (Sprint 6b sectie).

=== CONTEXT ===
Sprint 6a (Knowledge Base) is COMPLEET. De knowledge infrastructure staat in:
- packages/knowledge/ — @open-agents/knowledge package
- packages/knowledge/src/engine/ — model-profiles, tool-profiles, token-budget, graph-validator, cost-estimator
- packages/knowledge/snippets/ — 35 routing patterns, 7 principes, 13 building blocks
- packages/knowledge/src/loader.ts — markdown loader met gray-matter
- packages/knowledge/src/registry.ts — KnowledgeRegistry met search
- packages/backend/src/routes/knowledge.ts — 8 API endpoints

=== OPDRACHT: Sprint 6b — Assembly Engine (NL → Agent Graph) ===

**Fase 6b.1: Intent Classification + Pattern Matching**

1. `classifyIntent(description)` — Haiku (D-017)
   Input: NL beschrijving van gebruiker
   Output: TaskIntent {taskType, domain, complexity, estimatedAgentCount,
           needsParallel, needsValidation, keywords, constraints}
   System prompt bevat: task type definities, beschikbare patterns, presets
   Gebruik Anthropic SDK direct (niet via runtime adapter, dit is interne pipeline)

2. `matchPatterns(intent)` — Pure TypeScript, GEEN LLM (D-022)
   Gebruik de KnowledgeRegistry om patterns op te halen.
   Scoring regels:
     +0.3 category match (sequential→linear, parallel→parallel, etc.)
     +0.2 node count range match
     +0.1 per matching tag
     +0.2 als intent.needsValidation en pattern heeft validation gates
     -0.2 als "budget-sensitive" en costMultiplier > 3
   Retourneer top 3 matches gesorteerd op score

3. API: POST /api/assembly/generate (eerste 2 stappen)
4. Tests: 10+ verschillende NL beschrijvingen

**Fase 6b.2: Graph Generation + Frontend**

1. `generateGraph(intent, pattern, presets, modelProfiles)` — Sonnet (D-017)
   Genereert concrete CanvasConfig met:
   - Node namen (niet "specialist-1" maar "Security Auditor")
   - System prompts afgestemd op de taak
   - Model selectie met justification
   - Tool selectie per node
   - Edges volgens pattern template

2. Stap 4 — `estimateCost(config)`: hergebruik cost-estimator uit knowledge package
3. Stap 5 — `validateGraph(config)`: hergebruik graph-validator uit knowledge package

4. Frontend componenten:
   - GenerateBar.tsx: NL input veld boven het canvas (prominent, met placeholder text)
   - PatternLibrary.tsx: browseable pattern bibliotheek in sidebar (FR-19)
   - CostEstimatePanel.tsx: per-node en totaal cost visualisatie
   - Auto-layout met @dagrejs/dagre (D-019) — installeer als dependency

5. Wire alles: typ beschrijving → intent → patterns → graph → canvas

**Acceptatiecriteria:**
- "I want a team that reviews code for quality, security and performance"
  → dispatcher + 3 specialists + aggregator
- "Build a simple code analysis pipeline" → 2-3 node chain
- Cost estimate getoond bij elk gegenereerd graph
- Gebruiker kan gegenereerd graph bewerken na creatie
- Pattern library toont alle 35 patterns met diagrammen

Update ROADMAP.md en MASTERPLAN.md checkboxen als je klaar bent.
Commit als: "feat: assembly engine — NL to agent graph pipeline (Sprint 6b)"
```

---

## Sessie C: Sprint 8 — Frappe App `[PAR]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees ROADMAP.md, DECISIONS.md en MASTERPLAN.md (Sprint 8 sectie).

=== CONTEXT ===
Open-Agents is een React + Fastify monorepo. De canvas UI draait standalone
op port 5173, backend op port 3001. We willen dit ook als Frappe app
beschikbaar maken voor ERPNext gebruikers.

=== OPDRACHT: Sprint 8 — Frappe App ===

**Fase 8.1: Frappe App Scaffolding**
1. Scaffold een Frappe app `open_agents` (handmatig, geen bench nodig):
   - packages/frappe-app/ directory in de monorepo
   - Standaard Frappe app structuur (hooks.py, modules/, etc.)
2. Frappe DocTypes:
   - Agent Config (naam, model, prompt, tools) — maps to onze agent JSON
   - Execution Run (config_id, status, steps, output) — maps to run data
   - Safety Rule (type, pattern, scope) — maps to safety rules
3. Embed de Open-Agents canvas als custom Frappe page:
   - /app/open-agents route in Frappe Desk
   - Laad de React SPA als iframe of standalone embed
   - API proxy: Frappe whitelisted endpoints → backend REST API
4. REST API endpoints via @frappe.whitelist()

**Fase 8.2: ERPNext Templates**
Maak 5 ERPNext-specifieke agent templates als JSON canvas configs:

1. Boekhouding Team (pool):
   - Factuur Verwerker, BTW Calculator, Rapportage Agent
2. Inkoop Pipeline (flow):
   - Behoefte Analyst → Leverancier Matcher → Order Plaatser
3. HR Onboarding (flow):
   - Contract Generator → Systeem Provisioner → Welkom Mailer
4. Project Monitor (pool):
   - Uren Checker, Budget Tracker, Deadline Watcher
5. Admin Support (pool):
   - Backup Monitor, Server Health, Log Analyzer

Sla op in templates/erpnext/ directory.
Elke template: agent configs + canvas layout + edges.

**Acceptatiecriteria:**
- Frappe app structuur correct en installeerbaar
- DocTypes gedefinieerd met juiste velden
- Canvas laadbaar vanuit Frappe Desk
- 5 ERPNext templates als JSON beschikbaar

Update ROADMAP.md en MASTERPLAN.md checkboxen als je klaar bent.
Commit als: "feat: Frappe app wrapper + ERPNext templates (Sprint 8)"
```

---

## Sessie D: Sprint 9 — Agent Library `[PAR]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees AGENTS.md (1015 agent definities) en MASTERPLAN.md (Sprint 9 sectie).

=== CONTEXT ===
Er zijn 10 agent presets in agents/presets/ als JSON (Code Reviewer, Bug Hunter, etc.).
AGENTS.md bevat 1015 atomaire agent definities in 20 categorieën (A-T).
De Factory portal (Sprint 2) kan agents laden via GET /api/agents en GET /api/presets.

=== OPDRACHT: Sprint 9 — Agent Library ===

**Fase 9.1: Core Agents (10)**
Schrijf 10 core agent YAML bestanden in agents/library/core/.
Agents: summarize, translate, explain-code, find-bugs, generate-test,
format-code, generate-commit-msg, check-security, read-file, search-in-files.

Per agent YAML formaat:
  id: summarize
  name: Summarize
  category: core
  description: Vat tekst samen in kernpunten
  model_hint: haiku
  tools: []
  system_prompt: |
    Je bent een tekst-samenvatter. Vat de gegeven tekst samen in maximaal
    5 bullet points. Focus op de kernboodschap en belangrijkste feiten.
    Wees beknopt maar volledig.

**Fase 9.2: Category Agents (40)** — 4 categorieën, 10 per stuk:
A. Text & Taal: detect-language, rewrite-formal, fix-grammar, extract-entities,
   classify-sentiment, anonymize, extract-action-items, generate-title,
   compare-texts, generate-questions
B. Code & Development: detect-code-language, add-comments, generate-types,
   generate-docstring, extract-function, rename-variable, convert-syntax,
   generate-regex, detect-complexity, list-dependencies
C. Review & Kwaliteit: check-style, check-accessibility, check-performance,
   check-naming, check-dead-code, check-duplication, rate-readability,
   check-test-coverage, check-documentation, validate-api-response
D. Data & Transformatie: json-to-yaml, yaml-to-json, csv-to-json,
   validate-json, validate-yaml, flatten-json, extract-schema,
   transform-keys, filter-fields, merge-objects

Sla op in agents/library/{category}/ directories.

**Fase 9.3: Specialist Agents (30)**:
E. Git & Versioning (8): summarize-diff, list-changed-files, check-conflicts,
   generate-changelog, classify-commit, suggest-branch-name,
   generate-pr-description, generate-commit-msg
F. Research & Analyse (10): search-codebase, explain-error, find-examples,
   analyze-architecture, compare-approaches, estimate-impact,
   find-documentation, analyze-dependencies, profile-codebase, suggest-next-step
G. Communicatie & Rapportage (7): format-markdown, generate-report,
   draft-email, create-checklist, format-table, generate-diagram-code,
   create-status-update
H. File & System (5): write-file, list-files, find-file, count-lines,
   detect-filetype

Sla op in agents/library/{category}/ directories.

**Fase 9.4: Agent Loader**
Maak een YAML loader in de backend die agents/library/ recursief leest
en beschikbaar maakt via GET /api/agents/library.
Installeer js-yaml als dependency.

**Acceptatiecriteria:**
- 90 YAML agent bestanden in agents/library/ (10 core + 40 category + 30 specialist + 10 ERPNext)
- Backend loader leest ze en serveert via API
- Agents verschijnen in de Library tab van de frontend

Update ROADMAP.md en MASTERPLAN.md checkboxen als je klaar bent.
Commit als: "feat: 90 atomic agents in 8 categories (Sprint 9)"
```

---

## Sessie E: Sprint 6c — AI Assistant `[SEQ — wacht op Sessie B]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees ROADMAP.md, DECISIONS.md (D-018) en MASTERPLAN.md (Sprint 6c sectie).

=== CONTEXT ===
Sprint 6b (Assembly Engine) is COMPLEET. De assembly pipeline staat in:
- POST /api/assembly/generate — NL → intent → patterns → graph
- classifyIntent(), matchPatterns(), generateGraph() functies
- GenerateBar.tsx, PatternLibrary.tsx, CostEstimatePanel.tsx componenten
- Auto-layout met dagre

De knowledge base (Sprint 6a) levert patterns, principes en building blocks.

=== OPDRACHT: Sprint 6c — AI Assembly Assistant ===

**Fase 6c.1: Backend + State Management**

1. assistant-engine.ts:
   - Context-aware system prompt die canvas state meeleest
   - Zes query modes: Explain, Suggest, Generate, Modify, Cost, Pattern
   - SSE streaming voor chat responses
   - CanvasAction types: add-node, remove-node, update-node, replace-all
   - Model: Sonnet voor alle queries (D-018)

2. API endpoints:
   - POST /api/assistant/chat (SSE streaming) — chat met canvas context
   - POST /api/assistant/suggestions — passieve canvas analyse

3. Frontend state (Zustand — voeg toe aan bestaande appStore):
   - assistantSlice: messages, isLoading, context, suggestions
   - sendMessage() action — POST naar /api/assistant/chat
   - applyAction() action — dispatcht CanvasAction naar canvasSlice

**Fase 6c.2: Frontend UI**

1. AssistantSidebar.tsx:
   - Vast panel rechts van canvas, ~320px breed, inklapbaar
   - Context selector dropdown (neutral, code-review, security, ERPNext, custom)
   - Chat berichten (scrollable, user/assistant bubbles)
   - Inline suggestie kaarten met "Apply" knop
   - Cost estimate badge (altijd zichtbaar als canvas nodes heeft)
   - Input bar onderaan met send knop

2. Bidirectionele sync:
   - Canvas → Assistant: canvasSlice.getCanvasConfig() bij elke API call
   - Assistant → Canvas: "Apply" knop dispatcht CanvasAction naar canvasSlice

3. Integreer in App.tsx layout (sidebar rechts van canvas)

**Acceptatiecriteria:**
- Assistant kan uitleggen wat de huidige canvas doet
- Assistant suggereert verbeteringen (ontbrekende validatie, dure models)
- "Add a security check" genereert een CanvasAction die een node toevoegt
- Cost estimate update bij canvas wijzigingen
- Context selector past expertise van de assistant aan

Update ROADMAP.md en MASTERPLAN.md checkboxen als je klaar bent.
Commit als: "feat: AI assembly assistant sidebar (Sprint 6c)"
```

---

## Sessie F: Sprint 10 — Refactor `[SEQ — wacht op ALLES]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees ROADMAP.md en MASTERPLAN.md (Sprint 10 sectie).

=== OPDRACHT: Sprint 10 — Refactor & Consolidatie ===

**Fase 10.1: Code Audit**
Voer een volledige code audit uit. Analyseer:
1. Code duplicatie
2. Naamgeving inconsistenties
3. Type safety (any-types, onveilige casts)
4. Error handling gaps
5. API consistentie (endpoint naamgeving, response formats)
6. Frontend component structuur (te grote componenten)
7. Test coverage
8. Security (hardcoded secrets, XSS, OWASP top-10)
9. Performance (re-renders, bundle size)
10. Documentatie

Sla rapport op als docs/audit/sprint-1-audit.md met P1/P2/P3 prioriteiten.

**Fase 10.2: Refactor (parallel tracks)**
Backend: utilities extraheren, API standaardiseren, type safety, middleware.
Frontend: component decomposition, shared hooks, accessibility, bundle size.
Geen nieuwe features — alleen opschonen.

**Fase 10.3: Consolidatie & Release**
1. README.md herschrijven (installatie, quick start, architectuur)
2. CONTRIBUTING.md aanmaken
3. CHANGELOG.md genereren uit git history
4. Open beslissingen in DECISIONS.md reviewen
5. CI/CD pipeline finaliseren
6. v0.1.0 taggen

Update ROADMAP.md en MASTERPLAN.md als je klaar bent.
Commit als: "refactor: code audit + consolidation (Sprint 10)"
```

---

## Quick Reference

| Sessie | Sprint | Branch | Type | Start |
|--------|--------|--------|------|-------|
| A | 4 Pool Pattern | `feature/sprint-4-pool` | PAR | Nu |
| B | 6b Assembly Engine | `feature/sprint-6b-assembly` | PAR | Nu |
| C | 8 Frappe App | `feature/sprint-8-frappe` | PAR | Nu |
| D | 9 Agent Library | `feature/sprint-9-agents` | PAR | Nu |
| E | 6c AI Assistant | `feature/sprint-6c-assistant` | SEQ | Na B |
| F | 10 Refactor | `feature/sprint-10-refactor` | SEQ | Na alles |

**Merge volgorde**: D → C → A → B → E → F (of: conflict-vrije eerst, dan A/B sequentieel)

---

*Gegenereerd door Claude Code — 2026-03-02*
