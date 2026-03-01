# Audit Remediation — Instructies voor Claude Code Sessies

> **Gegenereerd**: 2026-03-02
> **Context**: Structurele audit van core documenten vs codebase heeft 21 inconsistenties gevonden.
> **Dit bestand**: Bevat 5 parallelle prompts + 1 sequentiële verificatie. Verwijder dit bestand na uitvoering.

---

## Uitvoeringsplan

```
┌──────────────────────────────────────────────────────────┐
│                    PARALLEL (5 sessies)                   │
│                                                          │
│  Sessie A          Sessie B          Sessie C            │
│  DECISIONS.md      REQUIREMENTS.md   types.ts +          │
│  (6 fixes)         (24 FR statussen) execution-engine.ts │
│                                                          │
│  Sessie D          Sessie E                              │
│  OPEN-QUESTIONS.md ROADMAP.md +                          │
│  (refresh)         MASTERPLAN.md                         │
│                    (sync)                                │
└──────────────────┬───────────────────────────────────────┘
                   │ wacht tot alle 5 klaar zijn
                   v
┌──────────────────────────────────────────────────────────┐
│              SEQUENTIEEL (1 sessie)                       │
│  Sessie F: Verificatie + commit                          │
└──────────────────────────────────────────────────────────┘
```

**Elk van de 5 sessies raakt ALLEEN de genoemde bestanden. Geen overlap = geen merge conflicts.**

---

## Sessie A: DECISIONS.md Fixes

**Bestand**: `DECISIONS.md`
**Scope**: 6 beslissingen updaten met implementatienotities

### Prompt (kopieer naar nieuwe Claude Code sessie):

```
Je bent een documentatie-auditor voor het Open-Agents project. Je taak is om DECISIONS.md bij te werken met implementatienotities voor 6 beslissingen. Raak ALLEEN DECISIONS.md aan, geen andere bestanden.

Lees eerst DECISIONS.md en voer dan deze 6 wijzigingen uit:

### Fix 1: D-023 (Agent Taxonomie) — implementatiestatus toevoegen
Voeg ONDER de regel "**Kernvraag**: Wanneer noemen we iets een agent?..." een nieuwe `>` regel toe:
> **Implementatiestatus**: Momenteel geïmplementeerd: Agent Node (`agent`), Dispatcher Node (`dispatcher`), Aggregator (`aggregator` — PoC utility type voor data-merge logica, niet in oorspronkelijke taxonomie). Teammate, Skill Badge, Connector en Gate zijn gepland voor Sprint 4/7-8. Zie `NodeType` in `packages/shared/src/types.ts`.

### Fix 2: D-024 (6-Layer Stack) — status toevoegen
Voeg ONDER de regel "**Kernvraag**: Hoe optimaliseer je de context van elke individuele agent?" een nieuwe `>` regel toe:
> **Implementatiestatus**: Nog niet gebouwd. Gepland voor Sprint 7-8 (Docker isolatie). Huidig PoC draait alle agents in-process op de backend, niet in Docker containers.

### Fix 3: D-025 (Multi-Layered Engineering) — per-laag status toevoegen
Voeg ONDER de regel "**Kernidee**: Open-Agents is niet één laag..." een nieuwe `>` regel toe:
> **Implementatiestatus**: Laag 1 (Orchestratie/Canvas) is werkend (Flow pattern, Sprint 3). Laag 2 (Agent Identiteit) is gedeeltelijk werkend (alleen `agent` node type van D-023). Laag 3 (Workspace/Docker) is nog niet geïmplementeerd (gepland Sprint 7-8).

### Fix 4: D-030 — slice count updaten
In de tabel "Genomen Beslissingen", zoek de rij voor D-030. Vervang "7 slices (canvas, selection, history, ui, settings, execution, workspace)" door "10 slices (canvas, selection, history, ui, settings, execution, workspace, factory, safety, audit)".

### Fix 5: D-031 — MCP pipeline status toevoegen
In de tabel "Genomen Beslissingen", zoek de rij voor D-031. Voeg aan het einde van de "Gekozen" kolom toe: " Fundament gebouwd (CommandRegistry + 4 canvas commands + getMcpTools()). MCP auto-generatie pipeline nog niet end-to-end verbonden met VS Code extension."

### Fix 6: D-035 — bash enforcement gap documenteren
In de tabel "Genomen Beslissingen", zoek de rij voor D-035. Voeg aan het einde van de "Rationale" kolom toe: " Beperking: bash blacklist regels worden momenteel alleen gevalideerd via de test API (POST /safety/test). De execution engine filtert tools maar controleert niet de inhoud van bash commands. Acceptabel voor PoC. End-to-end enforcement gepland voor Sprint 10."

Update ook de "Laatste update" datum onderaan naar 2026-03-03.

Commit NIET. Verifieer dat je alleen DECISIONS.md hebt gewijzigd.
```

---

## Sessie B: REQUIREMENTS.md Status Annotaties

**Bestand**: `REQUIREMENTS.md`
**Scope**: Implementatiestatus toevoegen aan alle 24 FRs

### Prompt (kopieer naar nieuwe Claude Code sessie):

```
Je bent een documentatie-auditor voor het Open-Agents project. Je taak is om REQUIREMENTS.md bij te werken met implementatiestatussen voor alle functionele requirements. Raak ALLEEN REQUIREMENTS.md aan.

Lees eerst REQUIREMENTS.md. Voeg dan voor ELKE FR (FR-01 t/m FR-24) een statusregel toe direct onder de heading, in dit formaat:
> **Status**: XX% — [korte beschrijving wat er is en wat ontbreekt]

Hier zijn de exacte statussen (gebaseerd op code audit):

FR-01 (Visuele Canvas Editor):
> **Status**: 80% — Canvas met drag-drop, zoom, pan, minimap, undo/redo werkt. Snap-to-grid niet geïmplementeerd.

FR-02 (Agent Blokken):
> **Status**: 20% — Alleen Agent node en Dispatcher node werken. Teammate, Skill Badge, Connector, Gate niet geïmplementeerd. `NodeType` in types.ts mist 4 van 6 D-023 block types.

FR-03 (Orchestratie Patronen):
> **Status**: 50% — Flow pattern (sequentieel) volledig werkend (Sprint 3). Pool pattern (dispatcher) en parallelle execution niet geïmplementeerd (Sprint 4).

FR-04 (Factory Portal):
> **Status**: 90% — Factory tab, 5-stap wizard, LLM-powered generatie werken. Alleen Agent asset type beschikbaar; Template, Rule, Skill marked "Coming soon".

FR-05 (Configuratie Generatie):
> **Status**: 70% — Canvas exporteert JSON, import/export werkt. Geen versiebeheer of diff-view.

FR-06 (Agent Runtime Integratie):
> **Status**: 70% — Claude SDK runtime volledig (tool use, multi-turn, streaming). OpenAI, Mistral, Ollama zijn text-in/text-out only (D-032 PoC beperking).

FR-07 (Safety & Rules):
> **Status**: 60% — SafetySettingsView met visuele rule editor werkt. Tool filtering enforced in execution engine. Bash blacklist filtering bestaat maar wordt NIET aangeroepen tijdens runtime (alleen via test API). Audit trail en run history werkend.

FR-08 (Templates & Presets):
> **Status**: 40% — 3 flow templates, 10 agent presets. Geen marketplace, geen template customization wizard.

FR-09 (Semantische Intelligentie):
> **Status**: 25% — GeneratePanel doet single-agent NL generatie. Geen auto-architectuur generatie, geen groeiend context systeem.

FR-10 (UI Skill Levels):
> **Status**: 80% — 3 niveaus (beginner/intermediate/advanced) sturen UI labels en tooltips aan. Geen gedrag-gebaseerde auto-switch.

FR-11 (Ingebouwde User Guide):
> **Status**: 0% — Niet geïmplementeerd. Geen onboarding, contextual help, of tutorials.

FR-12 (Workspace Selectie & Git Integratie):
> **Status**: 0% — Niet geïmplementeerd. Geen workspace browser, Git integratie, of branch viewer.

FR-13 (Switchable Orchestrator Context):
> **Status**: 0% — Niet geïmplementeerd. Geen context selector of specialized contexts.

FR-14 (API-first):
> **Status**: 40% — REST API voor alle operaties. Geen OpenAPI/Swagger docs, geen authenticatie, geen webhooks.

FR-15 (Multi-Provider Model Support):
> **Status**: 70% — 4 providers werken (Anthropic, OpenAI, Mistral, Ollama). Non-Claude providers zijn text-in/text-out only, geen tool use (D-032 PoC beperking).

FR-16 (Knowledge Base & Snippet Engine):
> **Status**: 60% — @open-agents/knowledge package met 35 patterns, 7 principes, 13 blocks. Backend API endpoints werkend. Geen frontend Knowledge UI (geen browser, geen visualisatie).

FR-17 (Self-Assembly Engine):
> **Status**: 25% — GeneratePanel doet single-agent generatie via Sonnet. 5-staps pipeline (Haiku intent → TS pattern match → Sonnet graph → TS cost → TS validate) niet geïmplementeerd.

FR-18 (AI Assembly Assistant):
> **Status**: 0% — Geen AssistantSidebar component. Geen context-aware chat, canvas sync, of suggesties.

FR-19 (Pattern Library Browser):
> **Status**: 20% — Backend API voor patterns bestaat (GET /api/knowledge/patterns). Geen frontend pattern browser met ASCII diagrammen of drag-to-canvas.

FR-20 (Agent Taxonomie & Entiteittypes):
> **Status**: 30% — D-023 taxonomie gedocumenteerd. Type systeem heeft alleen agent/dispatcher/aggregator. Geen skill progressive loading, geen teammate messaging.

FR-21 (Per-Agent Workspace Engineering):
> **Status**: 0% — Niet geïmplementeerd. Geen Docker containers, geen 6-layer stack editor, geen CLAUDE.md/rules/skills configuratie per agent. Gepland Sprint 7-8.

FR-22 (Library Ecosystem):
> **Status**: 10% — Library pagina toont 10 tabs. Alleen Agent library is actief (grid/lijst view, zoek/filter, drag-to-canvas). 9 andere libraries tonen "Coming soon".

FR-23 (LLM-Powered Asset Generation):
> **Status**: 80% — Conversational generatie, preview/edit, refinement, save to library werken voor agent assets. Niet beschikbaar voor templates, rules, skills of andere asset types.

FR-24 (White-Label Theming):
> **Status**: 100% — Volledig geïmplementeerd: themes.ts, impertio.css, ThemePicker, 3 thema's (impertio, neutral, midnight), CSS custom properties met --oa-* tokens, Tailwind v4 @theme mapping.

Update ook de "Laatste update" datum bovenaan naar 2026-03-03 en de "Status" naar "In ontwikkeling — status annotaties toegevoegd per FR".

Commit NIET. Verifieer dat je alleen REQUIREMENTS.md hebt gewijzigd.
```

---

## Sessie C: Shared Types + Execution Engine

**Bestanden**: `packages/shared/src/types.ts`, `packages/backend/src/execution-engine.ts`
**Scope**: Doc comments toevoegen, dead type markeren, TODO toevoegen

### Prompt (kopieer naar nieuwe Claude Code sessie):

```
Je bent een code-auditor voor het Open-Agents project. Je taak is om doc comments en TODO's toe te voegen aan 2 bestanden. Raak ALLEEN deze 2 bestanden aan:
- packages/shared/src/types.ts
- packages/backend/src/execution-engine.ts

Lees beide bestanden eerst. Voer dan deze wijzigingen uit:

### Fix 1: NodeType doc comment (types.ts)
Zoek de regel `export type NodeType = "agent" | "dispatcher" | "aggregator";`
Voeg er een JSDoc comment BOVEN:
/**
 * Node types supported by the canvas.
 * Current PoC: agent, dispatcher, aggregator.
 * Planned (D-023): teammate, skill, connector, gate.
 * "aggregator" is a PoC utility type for merging parallel outputs (not in D-023 taxonomy).
 */

### Fix 2: ModelDisplayInfo deprecation (types.ts)
Zoek `export interface ModelDisplayInfo {`
Voeg er een JSDoc comment BOVEN:
/** @deprecated Use ModelMeta instead. ModelDisplayInfo is unused — will be removed in v0.2.0. */

### Fix 3: AgentNodeData doc comment (types.ts)
Zoek `export interface AgentNodeData {`
Voeg er een JSDoc comment BOVEN:
/** Runtime config for a node on the canvas. Minimal data needed for execution. See also AgentDefinition (library record) and AgentPreset (preset loader). */

### Fix 4: AgentDefinition doc comment (types.ts)
Zoek `export interface AgentDefinition {`
Vervang het bestaande commentaar erboven door:
/**
 * Library record for a user-created or generated agent.
 * Includes metadata (id, timestamps, category, tags) for storage and browsing.
 * See also AgentNodeData (canvas runtime) and AgentPreset (preset loader).
 */

### Fix 5: AgentPreset doc comment (types.ts)
Zoek `export interface AgentPreset {`
Vervang het bestaande commentaar erboven door:
/**
 * A preset agent loaded from agents/presets/*.json.
 * Wraps AgentNodeData inside an `agent` field with display metadata (name, description, category, tags).
 * See also AgentDefinition (library record) and AgentNodeData (canvas runtime).
 */

### Fix 6: Memory cleanup TODO (execution-engine.ts)
Zoek de in-memory Maps aan het begin van het bestand (de regels waar `runs`, `eventBuffers`, `emitters` etc. worden gedeclareerd). Voeg er een TODO comment BOVEN:
// TODO (Sprint 10): Add TTL-based cleanup for completed runs.
// Current in-memory stores (runs, eventBuffers, emitters, runControls) grow without bound.
// Risk: memory leak on long-running development servers.

Commit NIET. Verifieer dat je alleen deze 2 bestanden hebt gewijzigd.
Verifieer met `pnpm --filter @open-agents/shared typecheck` en `pnpm --filter @open-agents/backend typecheck` dat de types nog compileren. Gebruik het volledige pad: /c/Users/"Freek Heijting"/AppData/Roaming/npm/pnpm.cmd
```

---

## Sessie D: OPEN-QUESTIONS.md Refresh

**Bestand**: `OPEN-QUESTIONS.md`
**Scope**: 1 vraag verplaatsen naar beantwoord, 4 nieuwe vragen toevoegen

### Prompt (kopieer naar nieuwe Claude Code sessie):

```
Je bent een documentatie-auditor voor het Open-Agents project. Je taak is om OPEN-QUESTIONS.md bij te werken. Raak ALLEEN OPEN-QUESTIONS.md aan.

Lees eerst OPEN-QUESTIONS.md. Voer dan deze wijzigingen uit:

### Fix 1: Q3 (agent failures) verplaatsen naar "Beantwoord"
Zoek de vraag over agent failures mid-flow (iets als "Hoe gaan we om met agent failures mid-flow?"). Deze is opgelost in Sprint 3. Verplaats naar de "Beantwoord" sectie (maak die aan als die niet bestaat) met deze notitie:
"Opgelost in Sprint 3. execution-engine.ts implementeert retry (max 3 pogingen), skip, en abort decision flow. Frontend ErrorDecisionDialog stelt de vraag aan de gebruiker. Zie D-035 voor enforcement punt."

### Fix 2: 4 nieuwe open vragen toevoegen
Voeg deze 4 nieuwe vragen toe aan de "Open" sectie:

1. **Assembly pipeline tijdlijn**: Sprint 6b (Assembly Engine) en 6c (AI Assistant) zijn gepland maar niet gescheduled. Wat is de prioriteit t.o.v. Sprint 4 (Pool Pattern) en Sprint 8 (Frappe App)? FR-17 en FR-18 staan op 25% en 0%.

2. **Bash safety enforcement gap**: testCommand() in safety-store.ts wordt nooit aangeroepen tijdens executie — alleen via de test API (POST /safety/test). De execution engine filtert tools maar controleert niet de inhoud van bash commands. Is dit acceptabel voor PoC of moet dit voor v0.1.0 opgelost worden? Zie D-035.

3. **Memory management backend**: In-memory stores in execution-engine.ts (runs, eventBuffers, emitters, runControls) groeien onbeperkt. Elke run bewaart alle SSE events. Bij welk punt wordt dit een probleem en moeten we TTL of database-backed storage implementeren? Zie D-026.

4. **NodeType 'aggregator' herkomst**: `NodeType = "agent" | "dispatcher" | "aggregator"` bevat `aggregator` dat niet voorkomt in de D-023 taxonomie (die definieert: agent, teammate, skill, connector, gate, dispatcher). Is aggregator een bewust PoC utility type dat behouden moet worden, of moet het vervangen worden door D-023 types?

Update de "Laatste update" datum.

Commit NIET. Verifieer dat je alleen OPEN-QUESTIONS.md hebt gewijzigd.
```

---

## Sessie E: ROADMAP.md + MASTERPLAN.md Sync

**Bestanden**: `ROADMAP.md`, `MASTERPLAN.md`
**Scope**: Status labels verduidelijken, Sprint 7 nota, Fase 8 items toevoegen

### Prompt (kopieer naar nieuwe Claude Code sessie):

```
Je bent een documentatie-auditor voor het Open-Agents project. Je taak is om ROADMAP.md en MASTERPLAN.md te synchroniseren. Raak ALLEEN deze 2 bestanden aan.

Lees eerst beide bestanden. Voer dan deze wijzigingen uit:

### Fix 1: ROADMAP Fase 3 label verduidelijken
Zoek de regel met "Fase 3 (Orchestratie)" en de progress bar. Vervang met:
**Fase 3 (Orchestratie)**: ██████████░░░░░░░░░░ **50%** — Sprint 3 (Flow Pattern) complete, Sprint 4 (Pool Pattern) pending

### Fix 2: Sprint 7 (VS Code) nota toevoegen
In ROADMAP.md, zoek de sectie over Fase 5 (Deployment) en het Sprint 7 blok. Voeg een nota toe NA de checkboxes:
> **Nota**: Extension is feature-complete als development build (extension.ts, webview panel, status bar, sidebar tree view, MCP server). VSIX packaging en marketplace publicatie vallen onder Sprint 10 (Refactor). MCP tools zijn momenteel hardcoded, niet auto-gegenereerd via D-031 CommandRegistry.

### Fix 3: ROADMAP Fase 8 items toevoegen
In ROADMAP.md, zoek "Fase 8: Refactor & Consolidatie" en de bestaande checkboxes. Voeg deze nieuwe items toe aan het einde van de lijst:
- [ ] NodeType uitbreiden naar D-023 specificatie (teammate, skill, connector, gate)
- [ ] ModelDisplayInfo type opruimen (dead code, vervangen door ModelMeta)
- [ ] AgentDefinition vs AgentNodeData vs AgentPreset type consolidatie
- [ ] testCommand() wiring in execution engine (D-035 bash enforcement gap)
- [ ] Memory cleanup voor completed runs in execution-engine.ts (TTL of database)
- [ ] MCP tool auto-generatie pipeline verbinden met VS Code extension (D-031)
- [ ] Non-Claude runtime tool use support (D-032 PoC beperking opheffen)

### Fix 4: REQUIREMENTS.md datum in ROADMAP header
In ROADMAP.md, update de "Laatste update" datum bovenaan naar 2026-03-03.

### Fix 5: MASTERPLAN.md — geen wijzigingen nodig
Verifieer dat de MASTERPLAN status kolom klopt:
- Sprint 0-3: Done ✓ (Sprint 3 = Flow Pattern, correct als "Done")
- Sprint 4: Planned ✓
- Sprint 5: Done ✓
- Sprint 6a: Done ✓
- Sprint 6b-c: Planned ✓
- Sprint 7: Done ✓ (dev build, correct)
- Sprint 8-10: Planned ✓

Als alles klopt, wijzig MASTERPLAN.md NIET. Als er afwijkingen zijn, fix ze.

Commit NIET. Verifieer dat je alleen ROADMAP.md (en eventueel MASTERPLAN.md) hebt gewijzigd.
```

---

## Sessie F: Verificatie + Commit (SEQUENTIEEL — na A t/m E)

**Bestanden**: Alle gewijzigde bestanden
**Scope**: Cross-check, TypeScript verify, commit

### Prompt (kopieer naar nieuwe Claude Code sessie NADAT alle 5 parallelle sessies klaar zijn):

```
Je bent de eindcontroleur voor een documentatie-audit van het Open-Agents project. 5 parallelle sessies hebben wijzigingen aangebracht in:
- DECISIONS.md (6 implementatienotities)
- REQUIREMENTS.md (24 FR status annotaties)
- packages/shared/src/types.ts (doc comments + deprecation)
- packages/backend/src/execution-engine.ts (TODO comment)
- OPEN-QUESTIONS.md (1 verplaatst, 4 nieuwe vragen)
- ROADMAP.md (labels, nota's, Fase 8 items)

Voer deze verificaties uit:

### 1. TypeScript check
Draai: /c/Users/"Freek Heijting"/AppData/Roaming/npm/pnpm.cmd --filter @open-agents/shared typecheck
Draai: /c/Users/"Freek Heijting"/AppData/Roaming/npm/pnpm.cmd --filter @open-agents/backend typecheck
Draai: /c/Users/"Freek Heijting"/AppData/Roaming/npm/pnpm.cmd --filter @open-agents/frontend typecheck
Alle 3 moeten slagen.

### 2. Cross-doc percentage check
Lees ROADMAP.md en MASTERPLAN.md. Verifieer dat:
- Elk Sprint dat "Done" is in MASTERPLAN ook 100% is in ROADMAP
- ROADMAP percentages kloppen met de checkboxes eronder
- Geen tegenstrijdige claims

### 3. DECISIONS.md coherentie
Lees DECISIONS.md. Verifieer dat:
- Elke genomen beslissing met architecturele impact een implementatienota heeft
- D-023, D-024, D-025 hebben implementatiestatus
- D-030 zegt 10 slices
- D-035 noemt bash enforcement beperking

### 4. REQUIREMENTS.md volledigheid
Lees REQUIREMENTS.md. Verifieer dat:
- ELKE FR (FR-01 t/m FR-24) een > **Status**: XX% regel heeft
- Geen FR ontbreekt
- Percentages zijn realistisch (niet 100% voor iets dat duidelijk onaf is)

### 5. OPEN-QUESTIONS.md
Verifieer dat:
- Q3 over agent failures in "Beantwoord" staat
- 4 nieuwe vragen zijn toegevoegd

### 6. Git status
Draai git status. Controleer dat alleen de verwachte bestanden gewijzigd zijn (geen onverwachte wijzigingen).

### 7. Commit
Als alles klopt, maak een commit:
feat(docs): structural audit — align core docs with codebase reality

- DECISIONS.md: implementation status notes for D-023/024/025/030/031/035
- REQUIREMENTS.md: added implementation status (%) to all 24 FRs
- ROADMAP.md: clarified sprint labels, added Sprint 10 audit items
- OPEN-QUESTIONS.md: resolved Q3, added 4 new questions from audit
- types.ts: doc comments for NodeType, AgentNodeData/Definition/Preset, deprecated ModelDisplayInfo
- execution-engine.ts: TODO for memory cleanup

Als iets NIET klopt, beschrijf het probleem en fix het voor je commit.
```

---

## Samenvatting

| Sessie | Bestanden | Parallel? | Geschatte grootte |
|--------|-----------|-----------|-------------------|
| **A** | DECISIONS.md | Ja | 6 edits |
| **B** | REQUIREMENTS.md | Ja | 24 status regels |
| **C** | types.ts + execution-engine.ts | Ja | 6 doc comments + 1 TODO |
| **D** | OPEN-QUESTIONS.md | Ja | 1 verplaatsing + 4 nieuwe |
| **E** | ROADMAP.md (+ evt MASTERPLAN.md) | Ja | 4 edits |
| **F** | Verificatie + commit | **Sequentieel** | Read-only + commit |

Geen overlap in bestanden → geen merge conflicts bij parallel uitvoeren.

---

*Verwijder dit bestand (AUDIT-INSTRUCTIONS.md) na uitvoering van alle sessies.*
