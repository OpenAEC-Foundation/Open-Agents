# UX Best Practices — Agent Command Centre / Orchestration Dashboard

> **Research door**: UX Researcher agent (research-ux)
> **Datum**: 2026-03-08
> **Platform context**: Open-Agents — CLI-first multi-agent orchestration met companion web UI
> **Bronnen**: LiveCanvas.tsx analyse + vergelijkingsplatforms (Langflow, n8n, Dify, Vercel, GitHub Actions, Linear)

---

## 1. De 10 Essentiële Features van een Agent Command Centre

### Feature 1: Live Status Overview (Always Visible)
**Wat**: Één gecentraliseerde view van alle lopende agents met status, model, taak en duration.
**Waarom**: Operators moeten in 2 seconden de health van hun systeem kunnen beoordelen.
**Open-Agents implementatie**: De huidige `oa status` tabel + LiveCanvas dekken dit. Verbetering: voeg een sticky header-bar toe met globale tellingen (running: N | done: N | failed: N).

### Feature 2: Hiërarchie Visualisatie (Parent/Child Tree)
**Wat**: Visuele boom die parent→child relaties toont met animated edges voor actieve verbindingen.
**Waarom**: Bij 10+ agents is tekst onleesbaar; visuele hiërarchie maakt de orchestratie-structuur begrijpelijk.
**Open-Agents implementatie**: LiveCanvas.tsx heeft dit al (recursive tree layout). Verbeterpunt: toon ook team-lidmaatschap als kleur-ring om nodes.

### Feature 3: Real-Time Log Viewer (Per Agent)
**Wat**: Live streaming van agent output in een sidebar/detail panel bij het selecteren van een agent.
**Waarom**: Debugging vereist dat je ziet wat een agent nu doet, niet alleen zijn status.
**Open-Agents implementatie**: `oa watch <naam>` in CLI. Web UI mist dit nog — voeg een output-panel toe dat tmux capture-pane streamt via polling elke 1-2s.

### Feature 4: 1-Klik Agent Actions
**Wat**: Kill / Collect / Retry / Copy Output — direct op de node zichtbaar bij hover.
**Waarom**: De meest frequente acties moeten 0 navigatie kosten.
**Open-Agents implementatie**: TUI heeft K=Kill. LiveCanvas heeft nog geen hover-actions. Voeg een action-bar toe die verschijnt bij node hover of select.

### Feature 5: Spawn From Template (Quick Launch)
**Wat**: Een template picker die de gebruiker in 3 klikken een agent laat starten (template → naam invullen → spawn).
**Waarom**: Herhaalbare taken moeten als workflow ingepast zijn, niet als CLI-commando's uit het hoofd.
**Open-Agents implementatie**: Agents library bestaat al (284 templates). Koppel deze aan een "Quick Spawn" modal in de web UI.

### Feature 6: Inter-Agent Message Visualisatie
**Wat**: Animated dashed edges tussen agents die recent berichten hebben uitgewisseld, met berichtpreview als edge label.
**Waarom**: Maakt het communicatiepatroon zichtbaar — welke agents coördineren?
**Open-Agents implementatie**: LiveCanvas.tsx heeft dit al (messageEdges met oranje dashed style). Goed. Voeg een message feed toe in het detail panel.

### Feature 7: Global Search + Filter
**Wat**: Zoek op agentnaam, taak-tekst, status of model. Filter de canvas/tabel naar subset.
**Waarom**: Bij 20+ agents raak je anders de controle kwijt.
**Open-Agents implementatie**: Ontbreekt. Voeg een zoekbalk toe bovenaan die nodes filtert (dimmed vs visible).

### Feature 8: Resource & Cost Dashboard
**Wat**: Totale token gebruik, geschatte kosten per agent/session, model-verdeling (haiku/sonnet/opus).
**Waarom**: Operators willen weten wat een batch kost voordat het uit de hand loopt.
**Open-Agents implementatie**: Knowledge package heeft cost estimator. Integreer dit in de web UI als een "Session Cost" widget in de header.

### Feature 9: Audit Trail / Run History
**Wat**: Lijst van alle vorige agent runs met taak, model, duration, status en output link.
**Waarom**: Reproducibility en debugging na het feit.
**Open-Agents implementatie**: Sprint 5 heeft RunHistoryView geïmplementeerd. Zorg dat dit ook in de web UI beschikbaar is.

### Feature 10: Keyboard-First Navigation
**Wat**: Volledige bediening zonder muis: arrow keys voor node selectie, shortcuts voor acties.
**Waarom**: Power users (developers) verwachten dit; verhoogt workflow speed 2-3x.
**Open-Agents implementatie**: TUI heeft K/C/R/Q. Web UI heeft geen keyboard shortcuts. Voeg `?` toe voor shortcut overlay (Linear-stijl).

---

## 2. Informatie die ALTIJD Zichtbaar Moet Zijn

### Persistente Header Bar (altijd in beeld)
```
[running: 3] [done: 12] [failed: 1] | Session cost: ~$0.42 | [oa start: 14:23] | [? shortcuts]
```

### Per Agent Node (minimaal 220px card)
| Element | Prioriteit | Huidige status |
|---------|-----------|----------------|
| Naam | P0 | ✅ |
| Status (kleur + icon) | P0 | ✅ |
| Model (badge) | P1 | ✅ |
| Taak (truncated) | P1 | ✅ |
| Duration | P1 | ✅ |
| Unread messages badge | P2 | ✅ |
| Parent naam | P2 | ❌ (alleen via edge) |
| Token gebruik | P3 | ❌ |

### Detail Panel (bij geselecteerde agent)
- Volledige taakomschrijving
- Live output stream (laatste 50 regels)
- Alle berichten (in/out chronologisch)
- Start tijd + elapsed + ETA (als bekend)
- Model + workspace pad
- Action buttons: Kill / Collect / Retry / Copy

---

## 3. Real-Time Feedback: Polling vs Streaming vs SSE

### Vergelijking

| Methode | Latency | Complexity | Server Load | Best Voor |
|---------|---------|-----------|-------------|-----------|
| Polling (setInterval) | 1-5s | Laag | Hoog (N×agents) | Agent status lijst |
| Long Polling | 0.5-2s | Middel | Middel | Notificaties |
| SSE (Server-Sent Events) | <100ms | Middel | Laag | Log streaming |
| WebSocket | <50ms | Hoog | Laag | Interactief (chat) |

### Concrete aanbeveling voor Open-Agents

**Status polling (huidige aanpak)**: Behoud 2-3s interval voor agent status tabel. Acceptabel — agents veranderen niet per milliseconde.

**Log streaming**: Gebruik SSE voor live output van geselecteerde agent. Pattern:
```
GET /api/agents/:name/logs/stream → text/event-stream
data: {"line": "...", "ts": 1234567890}\n\n
```
Flask bridge heeft al SSE-infrastructuur (Sprint 4). Extend naar log streaming.

**Message edges**: Huidige 3s polling voor messages is goed. Bij >50 agents: switch naar SSE-broadcast bij nieuwe messages.

**Nooit WebSocket** voor status-only — te veel overhead voor de use case.

### Huidige LiveCanvas aanpak
- Agent status: store refresh (implied polling van parent)
- Messages: `setInterval(fetchAllMessages, 3000)` — correct
- Aanbeveling: voeg `EventSource` toe voor log streaming per agent

---

## 4. Agent Hiërarchie Visualisatie — Beste Patronen

### Patroon 1: Tree Layout (huidige aanpak) ✅
**Wanneer**: Duidelijke parent/child structuur, max 3 levels diep.
**LiveCanvas implementatie**: Recursive `placeTree()` met X_GAP=260, Y_GAP=160.
**Verbeteringen**:
- Voeg level-indicators toe (depth badges op nodes)
- Kleur-code roots vs children vs leaves anders
- Toon team-naam als groep-kader om related agents

### Patroon 2: Swimlane per Status
**Wanneer**: Veel agents, minder parent/child focus, meer status overzicht.
**Kolommen**: Pending | Running | Done | Failed
**Voordeel**: Direct zichtbaar wat geblokkeerd is.
**Nadeel**: Verliest hiërarchie-informatie.
**Aanbeveling**: Voeg toggle toe (Tree View ↔ Swimlane View).

### Patroon 3: Minimap + Zoomed Detail (n8n-stijl)
**Wat**: Kleine overview map rechtsonder, main canvas voor detail.
**LiveCanvas**: MiniMap is al aanwezig. Goed.
**Verbetering**: Klikken op minimap node → select + center dat node.

### Patroon 4: Collapsible Subtrees
**Wat**: Klik op parent-node → vouw children in/uit.
**Wanneer**: Diep geneste pipelines (3+ levels).
**Implementatie**: Voeg `collapsed` veld toe aan node data; filter children uit layoutAgents als collapsed.

### Referentie: GitHub Actions
GitHub Actions toont job-dependency graph als DAG met status-kleur per job. Elke job heeft expand-knop voor step details. Dit is het beste model voor pipeline-visualisatie.

**Concrete feature**: "Expand Agent" knop op node die children laat zien in een inline panel.

---

## 5. 1-Klik Acties per Agent

### Prioriteit ranking (op frequentie)

| Actie | Trigger | Shortcut | Implementatie |
|-------|---------|----------|--------------|
| **Kill** | Stop runaway agent | `K` | `oa kill <naam>` |
| **Collect** | Haal output op | `C` | `oa collect <naam>` |
| **Copy output** | Clipboard | `Y` (yank) | Copy textarea content |
| **Attach** | Live kijken in tmux | `A` | `oa attach <naam>` |
| **Retry** | Herstart met zelfde config | `R` | `oa run` met zelfde params |
| **Spawn child** | Subtask spawnen | `S` | Open quick-spawn modal met parent=agent |
| **Send message** | DM naar agent | `M` | Open message compose modal |
| **View workspace** | Open in file explorer | `W` | `xdg-open workspace_path` |

### UI implementatie
Hover over agent node → verschijnt een action toolbar direct onder de node:
```
[Kill] [Collect] [Copy] [Attach] [Retry] [...]
```

Geselecteerde node → action bar in detail panel rechts + keyboard shortcuts actief.

### Wat Langflow doet
Langflow heeft een rightclick context menu per node: Edit / Delete / Duplicate / Run from here. "Run from here" is bijzonder krachtig voor pipelines — herstart vanaf een specifiek punt.

**Open-Agents equivalent**: "Resume from checkpoint" — `oa checkpoint restore` voor agents die checkpoints ondersteunen.

---

## 6. Hoe Vergelijkingsplatforms Status Tonen

### Langflow (Visual Flow Builder)
- **Status**: Kleur-ring om elke node (grijs/blauw pulsing/groen/rood)
- **Feedback**: Loading spinner in node tijdens executie
- **Logs**: Bottom panel met execution logs per run
- **Patroon**: Node-centric — alles rondom de node
- **Open-Agents toepassing**: Identiek aan huidige aanpak. Voeg loading spinner toe aan running nodes.

### n8n (Workflow Automation)
- **Status**: Execution history sidebar met run timestamps + status icons
- **Feedback**: Per-node output preview na executie (hover toont result)
- **Error handling**: Red border + error message inline op node
- **Patroon**: Run-centric — je selecteert een run, ziet alle node states voor die run
- **Open-Agents toepassing**: Voeg "run snapshot" toe aan audit trail — freeze node states op het moment van failure.

### Dify (LLM Ops)
- **Status**: Conversation trace view — timeline van LLM calls met tokens/latency per step
- **Feedback**: Token counter live tijdens generatie
- **Monitoring**: Kosten per run prominent weergegeven
- **Patroon**: LLM-centric — focus op model performance
- **Open-Agents toepassing**: Voeg model-performance metrics toe aan detail panel (tokens, latency, cost per agent).

### Vercel Dashboard (Deployment Monitoring)
- **Status**: Build log streaming — real-time output in monospace terminal-style panel
- **Feedback**: Progress indicator met fase-namen (Building → Deploying → Ready)
- **Alerting**: Email/Slack webhook bij failure
- **Patroon**: Phase-based progress — niet alleen groen/rood maar welke fase
- **Open-Agents toepassing**: Toon "phase" in agent card: Initializing → Running → Collecting → Done. Pipeline agents hebben al fase-structuur.

### GitHub Actions (Job Monitoring)
- **Status**: Job matrix — 2D grid van jobs × environments
- **Feedback**: Collapsible step logs met timestamps
- **Filtering**: Filter op status, branch, actor
- **Patroon**: Matrix/grid — beste voor batch agents
- **Open-Agents toepassing**: Voeg "batch view" toe voor oa pipeline runs — toon alle subtask agents als grid.

### Linear (Issue Tracking + Keyboard-First)
- **Status**: Kleur-coded labels (Todo/In Progress/Done/Cancelled) met custom workflows
- **Feedback**: Realtime updates via WebSocket — je ziet anderen typen
- **Keyboard**: `C` = create, `E` = edit, `Ctrl+K` = command palette, `/` = quick search
- **Patroon**: Command palette — één shortcut voor alles
- **Open-Agents toepassing**: Implementeer `Ctrl+K` command palette in web UI met alle acties searchable.

---

## 7. Keyboard Shortcuts — Standaard in Dev Tools

### Universele standaards (verwacht door developers)

| Shortcut | Actie | Platform |
|---------|-------|---------|
| `Ctrl+K` / `Cmd+K` | Command palette | Linear, VS Code, Vercel |
| `G` then `H` | Go to home/dashboard | GitHub, Linear |
| `?` | Shortcut help overlay | GitHub, Linear, Notion |
| `/` | Quick search / filter | GitHub, Linear, Slack |
| `Escape` | Dismiss / deselect | Universeel |
| `Enter` | Open / confirm | Universeel |
| `Arrow keys` | Navigeer tussen items | Universeel |
| `J/K` | Volgende/vorige item | GitHub, vim-stijl |
| `Ctrl+Z` | Undo | Universeel |
| `Ctrl+Shift+F` | Global search | VS Code |

### Open-Agents specifieke shortcuts

| Shortcut | Actie |
|---------|-------|
| `Ctrl+K` | Command palette (spawn / kill / collect / send) |
| `?` | Shortcut help overlay |
| `/` | Filter agents by name/status |
| `J/K` of `↑/↓` | Navigeer tussen agents in lijst |
| `Enter` | Open detail panel voor geselecteerde agent |
| `K` | Kill geselecteerde agent |
| `C` | Collect output geselecteerde agent |
| `S` | Spawn new agent (open modal) |
| `M` | Message geselecteerde agent |
| `A` | Attach tmux sessie geselecteerde agent |
| `R` | Retry geselecteerde agent |
| `Escape` | Deselect / sluit panel |
| `1/2/3` | Switch views (Canvas / List / Batch) |
| `F` | Fit view (zoom to fit all agents) |

### TUI (huidige Textual dashboard)
Bestaande: K=Kill, C=Collect, R=Refresh, Q=Quit.
Voeg toe: S=Spawn, M=Message, A=Attach, `/`=filter, `?`=help.

---

## 8. Spawn From Template — Beste Workflow

### Het probleem
Huidige flow: `oa run "<lange taakbeschrijving>" --name <naam> --model claude/sonnet --direct`
Dit vereist kennis van CLI syntax en alle parameters. Drempel is te hoog voor herhaald gebruik.

### Beste patroon: 3-stap modal (Linear / Vercel style)

**Stap 1: Template kiezen**
- Zoekbalk + categoriefilter (15 categorieën zoals in library)
- Grid van template cards: naam, beschrijving, model hint, category badge
- Recent used templates bovenaan (localStorage)
- "Blank agent" optie voor custom

**Stap 2: Parameters invullen**
```
Agent naam: [auto-generated of custom input]
Taak: [template taak prefilled, editbaar]
Model: [template modelHint, dropdown]
Parent: [dropdown van running agents, optional]
```

**Stap 3: Preview + Spawn**
- Toon gegenereerd `oa run` commando (kopieerbaar)
- [Spawn] knop → agent verschijnt direct op canvas

### Wat n8n doet
n8n heeft een "node panel" die via drag-and-drop template nodes aan canvas toevoegt. Bij drop: configuratie panel opent direct. Geen extra modal stap.

**Open-Agents equivalent**: Drag template uit library → laat op canvas vallen → modal opent voor naam/taak invullen.

### Dify's aanpak
Dify heeft "Explore" — een template marketplace met community submissions. Gebruiker klikt "Use template" → direct geconfigureerd.

**Open-Agents equivalent**: Voeg "Quick Spawn" knop toe aan elke agent in de library browser. Klik → modal pre-filled met template config.

### Geadviseerde implementatie prioriteit
1. **P0**: Quick Spawn modal in web UI (3 stappen, template + naam + spawn)
2. **P1**: Recent templates in modal (localStorage, max 5)
3. **P2**: Drag-from-library naar canvas
4. **P3**: Team-spawn: spawn meerdere agents tegelijk uit een workflow template

---

## 9. Concrete Feature Prioriteiten voor Open-Agents

### Must Have (P0) — Blocking usability issues

| Feature | Component | Effort |
|---------|-----------|--------|
| Live log streaming in web UI | `AgentDetailPanel.tsx` + Flask SSE route | Medium |
| Hover action bar op nodes | `LiveCanvas.tsx` — AgentNodeComponent | Small |
| Global shortcut: `Ctrl+K` command palette | Nieuwe component `CommandPalette.tsx` | Medium |
| Quick Spawn modal | Nieuwe component `SpawnModal.tsx` | Medium |
| Persistent header met global stats | `App.tsx` header bar | Small |

### Should Have (P1) — Significantly improves workflow

| Feature | Component | Effort |
|---------|-----------|--------|
| Status filter `/` in canvas | `LiveCanvas.tsx` + store | Small |
| Swimlane view toggle | Nieuw layout algoritme | Medium |
| Cost tracker per session | Flask bridge + `CostWidget.tsx` | Medium |
| `?` shortcut help overlay | `ShortcutsHelp.tsx` | Small |
| Phase-based progress in agent card | `AgentNodeComponent` + agent state | Medium |

### Nice to Have (P2) — Power user features

| Feature | Component | Effort |
|---------|-----------|--------|
| Collapsible subtrees | `LiveCanvas.tsx` | Medium |
| Batch grid view voor pipeline agents | Nieuwe `BatchGrid.tsx` view | Large |
| "Run from checkpoint" button | Agent detail panel + oa-cli | Large |
| Community template marketplace | Backend + UI | Large |

---

## 10. Design Principes voor Open-Agents Dashboard

### Principe 1: CLI is de bron van waarheid
Het dashboard visualiseert wat de CLI doet. Nooit andersom forceren. Commands die via UI worden gegeven, genereren CLI-equivalenten die zichtbaar zijn.

### Principe 2: Information density over whitespace
Developers willen data, geen marketing. Gebruik compacte cards (220-280px), kleine fonts (10-13px), dense tables. Zie Linear vs Notion.

### Principe 3: Status = kleur + icon + tekst (niet alleen kleur)
Kleurenblindheid: altijd drie signalen. LiveCanvas doet dit al goed.

### Principe 4: Failure is first-class
Errors krijgen prominent real estate. Niet verstopt achter een filter. Failed agents staan bovenaan, met één-klik retry.

### Principe 5: Progressieve onthulling
Node toont naam + status + model. Hover toont actions. Select toont logs + berichten. Geen modal voor basis-info.

### Principe 6: Keyboard = snelpad naar alles
Elke actie die >5x per dag wordt gedaan, moet een keyboard shortcut hebben. `?` toont altijd de lijst.

---

## Samenvatting: Top 5 Quick Wins voor Open-Agents

1. **Hover action bar** op canvas nodes (Kill/Collect/Copy) — 2u implementatie
2. **Persistent stats header** (running/done/failed teller) — 1u implementatie
3. **`?` shortcut overlay** — 1u implementatie
4. **Live log streaming** via SSE in detail panel — 4u implementatie
5. **Quick Spawn modal** gekoppeld aan library — 4u implementatie

Totaal: ~12u engineering voor fundamentele UX-verbetering van het command centre.

---

*Research gebaseerd op: LiveCanvas.tsx code analyse, ROADMAP.md feature overzicht, en best practices van Langflow, n8n, Dify, Vercel, GitHub Actions, Linear.*
