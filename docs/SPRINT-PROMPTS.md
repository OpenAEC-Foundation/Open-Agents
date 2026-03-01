# Sprint Prompts — Open-Agents

> **Doel**: Kopieerbare prompts voor Claude Code sessies om de resterende sprints uit te voeren.
> **Gegenereerd**: 2026-03-02
> **Laatste update**: 2026-03-03
> **Bron**: MASTERPLAN.md

---

## Status Overzicht

| Sessie | Sprint | Status | Branch |
|--------|--------|--------|--------|
| A | 4 Pool Pattern | **Pending** | `feature/sprint-4-pool` |
| B | 6b Assembly Engine | **COMPLETE** | `feature/sprint-6b-assembly` |
| C | 8 Frappe App | **COMPLETE** | `feature/sprint-6b-assembly` |
| D | 9 Agent Library | **Pending** | (nog aan te maken) |
| E | 6c AI Assistant | **Pending** (wacht op 6b ✅) | (nog aan te maken) |
| F | 10 Refactor | **Pending** (wacht op alles) | (nog aan te maken) |

## Executie Schema (bijgewerkt)

```
BESCHIKBAAR (kan NU starten):
├── Sessie A: Sprint 4  — Pool Pattern         → feature/sprint-4-pool
├── Sessie D: Sprint 9  — Agent Library         → feature/sprint-9-agents
└── Sessie E: Sprint 6c — AI Assistant          → feature/sprint-6c-assistant
                                                   (6b is COMPLETE)

SEQUENTIEEL (na bovenstaande):
└── Sessie F: Sprint 10 — Refactor              → wacht op ALLES

⚠️  Sessie A en E wijzigen mogelijk beide CanvasPage.tsx en appStore.
    Start ze op aparte branches en merge sequentieel naar main.
```

---

## ~~Sessie B: Sprint 6b — Assembly Engine~~ ✅ COMPLETE

> Voltooid op `feature/sprint-6b-assembly` branch. Bevat:
> classifyIntent(), matchPatterns(), generateGraph(), assembly API routes,
> GenerateBar.tsx, PatternLibrary.tsx, CostEstimatePanel.tsx, assemblySlice.

---

## ~~Sessie C: Sprint 8 — Frappe App~~ ✅ COMPLETE

> Voltooid op `feature/sprint-6b-assembly` branch. Bevat:
> packages/frappe-app/, DocTypes, canvas embedding, whitelisted API,
> 5 ERPNext templates in templates/erpnext/.

---

## Sessie A: Sprint 4 — Pool Pattern `[BESCHIKBAAR]`

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

## Sessie D: Sprint 9 — Agent Library `[BESCHIKBAAR]`

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

**Fase 9.2: Category Agents (40)** — 4 categorieën, 10 per stuk
**Fase 9.3: Specialist Agents (30)** — 4 categorieën
**Fase 9.4: Agent Loader** — YAML loader + GET /api/agents/library

Zie MASTERPLAN.md Sprint 9 voor volledige details.

**Acceptatiecriteria:**
- 90 YAML agent bestanden in agents/library/
- Backend loader leest ze en serveert via API
- Agents verschijnen in de Library tab van de frontend

Commit als: "feat: 90 atomic agents in 8 categories (Sprint 9)"
```

---

## Sessie E: Sprint 6c — AI Assistant `[BESCHIKBAAR — 6b is COMPLETE]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees ROADMAP.md, DECISIONS.md (D-018) en MASTERPLAN.md (Sprint 6c sectie).

=== CONTEXT ===
Sprint 6b (Assembly Engine) is COMPLEET. De assembly pipeline staat in:
- POST /api/assembly/generate — NL → intent → patterns → graph
- classifyIntent(), matchPatterns(), generateGraph() functies
- GenerateBar.tsx, PatternLibrary.tsx, CostEstimatePanel.tsx componenten
- Auto-layout met dagre

=== OPDRACHT: Sprint 6c — AI Assembly Assistant ===

Zie MASTERPLAN.md Sprint 6c voor volledige details.

**Acceptatiecriteria:**
- Assistant kan uitleggen wat de huidige canvas doet
- Assistant suggereert verbeteringen
- "Add a security check" genereert een CanvasAction die een node toevoegt
- Cost estimate update bij canvas wijzigingen
- Context selector past expertise van de assistant aan

Commit als: "feat: AI assembly assistant sidebar (Sprint 6c)"
```

---

## Sessie F: Sprint 10 — Refactor `[SEQ — wacht op ALLES]`

```
Je werkt aan Open-Agents, een visueel agent orchestratie platform.
Lees ROADMAP.md en MASTERPLAN.md (Sprint 10 sectie).

=== OPDRACHT: Sprint 10 — Refactor & Consolidatie ===

Fase 10.1: Code Audit → docs/audit/sprint-1-audit.md
Fase 10.2: Refactor (backend + frontend parallel)
Fase 10.3: Consolidatie & Release (README, CONTRIBUTING, CHANGELOG, v0.1.0)

Zie MASTERPLAN.md Sprint 10 voor volledige details.

Commit als: "refactor: code audit + consolidation (Sprint 10)"
```

---

## Quick Reference

| Sessie | Sprint | Branch | Status | Start |
|--------|--------|--------|--------|-------|
| A | 4 Pool Pattern | `feature/sprint-4-pool` | Pending | Nu |
| B | 6b Assembly Engine | `feature/sprint-6b-assembly` | **COMPLETE** | -- |
| C | 8 Frappe App | `feature/sprint-6b-assembly` | **COMPLETE** | -- |
| D | 9 Agent Library | `feature/sprint-9-agents` | Pending | Nu |
| E | 6c AI Assistant | `feature/sprint-6c-assistant` | Pending | Nu (6b klaar) |
| F | 10 Refactor | `feature/sprint-10-refactor` | Pending | Na alles |

**Merge volgorde**: D → A → E → F (conflict-vrije eerst, dan sequentieel)

---

*Bijgewerkt door Claude Code — 2026-03-03*
