# Web App Masterplan — RAW

> **Versie**: 0.1 (raw draft)
> **Datum**: 2026-03-08
> **Auteur**: webapp-architect agent
> **Input**: cli-inventory, webapp-inventory, ux-best-practices, tech-stack-analysis, ROADMAP, client.ts

---

## 1. Visie & Doelen

### Wat is de ideale web UI over 3 sprints?

Een **Command Centre** dat de volledige kracht van oa-cli visueel maakt. Niet een vereenvoudigde wrapper, maar een power-user dashboard dat CLI-gebruikers sneller maakt en nieuwe gebruikers onboardt zonder terminal-kennis.

**Sprint 1 (MVP)**: Alle CLI-functionaliteit beschikbaar via UI — geen feature gaps meer.
**Sprint 2 (Power)**: Visuele workflow tools die de UI superieur maken aan CLI (pipeline builder, batch view, cost tracking).
**Sprint 3 (Polish)**: Keyboard-first navigatie, persistente history, desktop-grade UX.

### Welke gebruikersproblemen lost het op?

| Probleem | Huidige situatie | Oplossing |
|----------|-----------------|-----------|
| Overzicht verlies bij 10+ agents | CLI `oa status` is een platte tabel | Kanban + hiërarchie + filters |
| Geen live output zonder terminal | `oa watch` vereist tmux attach | SSE streaming + xterm.js in browser |
| Pipeline onzichtbaar | `oa pipeline` is blocking CLI | Visuele pipeline stappen met status per fase |
| Team taken onbeheerd | `oa task` CLI-only, geen overzicht | Taskboard per team met drag-and-drop |
| Kosten onbekend | Geen tracking | Cost dashboard per sessie/agent |
| Herhaalde taken lastig | CLI commando's onthouden | Template quick-spawn in 3 klikken |
| Communicatie onzichtbaar | `oa inbox` per agent apart | Centraal message center + broadcast UI |

---

## 2. Feature Inventarisatie

### 2a. CLI features die UI MIST (gap-lijst)

| CLI Feature | API Endpoint | UI Status | Prioriteit |
|-------------|-------------|-----------|------------|
| `oa pipeline <task>` | GET /api/pipeline (lijst only) | Geen trigger, geen status view | P0 |
| `oa broadcast <msg>` | POST /api/broadcast | Bestaat in client.ts, niet in UI | P0 |
| `oa pause/resume` | POST /api/agents/:name/pause+resume | Bestaat in client.ts, niet in UI | P0 |
| `oa checkpoint list/show` | GET /api/checkpoints | Bestaat in client.ts, niet in UI | P1 |
| `oa resume <name>` | POST /api/resume/:agent | Bestaat in client.ts, niet in UI | P1 |
| `oa task create/list/claim/done` | GET/POST/PUT /api/tasks/:team | Bestaat in client.ts, niet in UI | P0 |
| `oa delegate <task>` | Geen API endpoint | Ontbreekt volledig | P1 |
| `oa stop` | Geen POST /api/session/stop | Ontbreekt volledig | P1 |
| `oa watch <name>` | GET /api/agents/:name/stream (SSE) | SSE werkt, maar output tab is beperkt | P0 |
| `oa inbox --mark-read` | POST /api/messages/:name/read | Bestaat in client.ts, nooit aangeroepen | P1 |
| `oa shutdown-request` | Via messaging | Geen dedicated UI | P2 |
| `oa guardians --register` | Geen API endpoint | Geen registratie UI | P2 |
| `oa templates --category` | GET /api/templates | Templates tab bestaat, maar geen edit/create | P1 |
| `oa setup` | Geen API | CLI-only, niet relevant voor web | — |
| `oa attach` | Geen API | Terminal-only, niet relevant voor web | — |

### 2b. Features alleen via UI zinvol (nieuw)

| Feature | Waarom alleen UI | Prioriteit |
|---------|-----------------|------------|
| Visuele hiërarchie (tree/graph) | Tekst kan geen boomstructuur tonen | P0 |
| Drag-and-drop pipeline builder | Visuele compositie vereist canvas | P1 |
| Cost dashboard met grafieken | Visuele data presentatie | P1 |
| Command palette (Ctrl+K) | Snelle fuzzy-search over alle acties | P0 |
| Keyboard shortcut overlay (?) | Discoverability | P0 |
| Toast notificaties | Real-time feedback bij events | P0 |
| Resizable panels | Flexibele layout per gebruiker | P1 |
| Batch grid view (pipeline agents) | Matrix weergave per run | P2 |
| Run history / audit trail | Volledige sessie-geschiedenis | P1 |

### 2c. Features die UI al heeft (behouden/verbeteren)

| Feature | Status | Verbetering nodig |
|---------|--------|------------------|
| Agent spawnen (SpawnForm) | Werkt | Uitbreiden: max_children, auto_cleanup_minutes, guardians |
| Agent killen | Werkt | Toevoegen: pause/resume knoppen |
| Live output (SSE) | Werkt | Verbeteren: xterm.js i.p.v. textarea, reconnect logica |
| Berichten sturen | Werkt (per agent) | Centraal message center toevoegen |
| Guardians bekijken + triggeren | Werkt | Polling toevoegen (nu eenmalig bij mount) |
| Templates zoeken/filteren/spawnen | Werkt | Edit/create toevoegen |
| Teams CRUD | Werkt | Taken koppelen, member verwijderen |
| KanbanBoard | Werkt | Filters, zoekbalk, hover actions toevoegen |
| Activity Feed | Werkt (in-memory) | Persisteren via session-log.json |

---

## 3. Tabstructuur Voorstel

### Tab 1: Dashboard (hoofdtab)

| Aspect | Detail |
|--------|--------|
| **Doel** | Centraal overzicht van alle agents, snel handelen |
| **Key features** | KanbanBoard met filters, global stats header, SpawnForm, ActivityFeed, GuardianPanel |
| **CLI commando's** | `oa status`, `oa run`, `oa kill`, `oa clean`, `oa watch`, `oa pause/resume` |
| **Verbeteringen** | Hover action bar (kill/collect/retry), zoekbalk (/), view toggle (kanban/tree/list), persistent stats header |

### Tab 2: Agent Detail (slide-over panel, geen tab)

| Aspect | Detail |
|--------|--------|
| **Doel** | Diepgaand inzicht in één agent |
| **Key features** | Info, Output (xterm.js), Messages, Checkpoints |
| **CLI commando's** | `oa watch`, `oa collect`, `oa inbox`, `oa send`, `oa checkpoint show`, `oa resume` |
| **Verbeteringen** | xterm.js terminal, markRead, checkpoint resume knop, retry knop |

### Tab 3: Pipelines

| Aspect | Detail |
|--------|--------|
| **Doel** | Pipeline orchestratie starten en monitoren |
| **Key features** | Pipeline trigger form, actieve pipelines met stap-status, visuele DAG per pipeline |
| **CLI commando's** | `oa pipeline`, `oa delegate`, GET /api/pipeline |
| **Nieuw** | Pipeline trigger API (POST /api/pipeline), stap-weergave (planner→subtasks→combiner) |

### Tab 4: Teams & Tasks

| Aspect | Detail |
|--------|--------|
| **Doel** | Team management + task board |
| **Key features** | Team CRUD, member beheer (add+remove), taskboard per team (todo/claimed/done/blocked), task create/claim/complete |
| **CLI commando's** | `oa team *`, `oa task *`, `oa broadcast` |
| **Nieuw** | Taskboard UI, broadcast knop per team, active agents per team view |

### Tab 5: Templates

| Aspect | Detail |
|--------|--------|
| **Doel** | Agent templates beheren en gebruiken |
| **Key features** | Zoeken, filteren, quick-spawn, preview systemPrompt, create/edit/duplicate/delete |
| **CLI commando's** | `oa templates`, `oa run --template` |
| **Verbeteringen** | Template editor, full prompt preview, recent-used sectie |

### Tab 6: Messages (nieuw)

| Aspect | Detail |
|--------|--------|
| **Doel** | Centraal berichtenoverzicht |
| **Key features** | Inbox per agent, broadcast sturen, unread badges, mark-read, message history |
| **CLI commando's** | `oa inbox`, `oa send`, `oa broadcast`, `oa shutdown-request` |
| **Nieuw** | Volledig nieuw — vervangt versnipperde message UI in AgentPanel |

### Tab 7: Settings

| Aspect | Detail |
|--------|--------|
| **Doel** | Configuratie |
| **Key features** | Default model, timeout, max concurrent agents, API keys, theme, Ollama endpoint |
| **Verbeteringen** | Settings daadwerkelijk doorvoeren naar SpawnForm defaults |

### Tab 8: Builder (bestaand, low priority)

| Aspect | Detail |
|--------|--------|
| **Doel** | Visuele workflow editor |
| **Status** | Bestaat maar is niet actief verbonden aan runtime |
| **Prioriteit** | P2 — pas activeren als pipeline API beschikbaar is |

---

## 4. Component Architectuur

### 4a. Nieuwe componenten bouwen

| Component | Tab | Beschrijving |
|-----------|-----|-------------|
| `CommandPalette.tsx` | Global | Ctrl+K fuzzy search over alle acties (spawn, kill, navigate, filter) |
| `ShortcutsOverlay.tsx` | Global | ? overlay met alle keyboard shortcuts |
| `StatsHeader.tsx` | Global | Persistent header: running/done/failed tellers, session cost, session uptime |
| `PipelineTab.tsx` | Pipelines | Pipeline trigger + status overview |
| `PipelineDAG.tsx` | Pipelines | ReactFlow DAG van pipeline stappen |
| `TaskBoard.tsx` | Teams | Kanban per team: todo/claimed/done/blocked kolommen |
| `TaskCard.tsx` | Teams | Taak kaart met claim/complete acties |
| `MessagesTab.tsx` | Messages | Centraal berichten overzicht |
| `MessageComposer.tsx` | Messages | Bericht/broadcast composer |
| `BroadcastButton.tsx` | Messages/Teams | Broadcast naar alle agents of team |
| `TerminalOutput.tsx` | Detail | xterm.js component voor live output |
| `CheckpointPanel.tsx` | Detail | Checkpoint lijst + resume knop |
| `AgentActionBar.tsx` | Dashboard | Hover/select actions: kill, collect, retry, pause, resume, message |
| `SearchFilter.tsx` | Dashboard | Zoek+filter agents op naam, status, model |
| `ToastProvider.tsx` | Global | Sonner toast wrapper voor event notificaties |

### 4b. Bestaande componenten herbouwen/uitbreiden

| Component | Actie | Detail |
|-----------|-------|--------|
| `AgentPanel.tsx` | Uitbreiden | + pause/resume knoppen, + markRead, + checkpoint tab, + xterm.js output |
| `SpawnForm.tsx` | Uitbreiden | + max_children, + auto_cleanup_minutes, + guardians select, + default model from settings |
| `KanbanBoard.tsx` | Uitbreiden | + hover action bar, + zoekbalk, + status filter, + view toggle (kanban/tree/list) |
| `TeamsTab.tsx` | Herbouwen | + taskboard, + member remove, + broadcast, + active agents view |
| `TemplatesTab.tsx` | Uitbreiden | + create/edit modal, + full prompt preview, + recent-used |
| `GuardianPanel.tsx` | Uitbreiden | + polling (nu eenmalig), + register UI |
| `ActivityFeed.tsx` | Uitbreiden | + persist via session-log API, + filter op event type |
| `App.tsx` | Uitbreiden | + StatsHeader, + CommandPalette, + ToastProvider, + ShortcutsOverlay |

### 4c. Store structuur

| Store | Status | Inhoud |
|-------|--------|--------|
| `agentStore` | Bestaat | agents, selectedAgent, activityLog — **uitbreiden**: error state, loading state |
| `templateStore` | Bestaat | templates, search, category — **OK** |
| `uiStore` | Bestaat | activeTab, theme — **uitbreiden**: commandPaletteOpen, shortcutsOpen |
| `messagingStore` | **Nieuw** | inbox per agent, unreadCounts, broadcastHistory — centraliseer berichten |
| `pipelineStore` | **Nieuw** | activePipelines, pipelineHistory — pipeline status tracking |
| `taskStore` | **Nieuw** | tasks per team, filters — task CRUD state |
| `checkpointStore` | **Nieuw** | checkpoints lijst, resumeStatus |
| `settingsStore` | Bestaat | defaultModel, timeout, etc. — **uitbreiden**: effectief doorvoeren |

---

## 5. API Gaps

### 5a. Ontbrekende bridge endpoints (moet gebouwd worden)

| Endpoint | Method | Beschrijving | Blokkeert |
|----------|--------|-------------|-----------|
| `/api/session/stop` | POST | Stop tmux sessie | Sessie beheer in UI |
| `/api/pipeline` | POST | Start pipeline met taak | Pipeline tab |
| `/api/pipeline/<id>/status` | GET | Pipeline stap-status | Pipeline monitoring |
| `/api/delegate` | POST | Start orchestrator + workers | Delegate UI |
| `/api/guardians/register` | POST | Registreer guardian | Guardian registratie UI |
| `/api/tasks/<team>/<id>/claim` | POST | Claim taak met file-lock | Task claiming |
| `/api/tasks/<team>/<id>/complete` | POST | Complete + auto-unblock | Task dependencies |
| `/api/agents/<name>/retry` | POST | Herstart agent met zelfde config | Retry actie |
| `/api/checkpoints/<name>` | GET | Detail van één checkpoint | Checkpoint detail view |
| `/api/session/cost` | GET | Geschatte kosten per sessie | Cost dashboard |
| `/api/teams/<name>/members/<agent>` | DELETE | Verwijder team lid | Team member management |
| `/api/teams/<name>/broadcast` | POST | Broadcast naar team members | Team broadcast |

### 5b. Bestaande endpoints zonder UI (moet UI voor gebouwd worden)

| Endpoint | UI Component nodig |
|----------|-------------------|
| `broadcastMessage` (client.ts:58) | BroadcastButton + MessageComposer |
| `markRead` (client.ts:66) | Auto-aanroep in AgentPanel bij openen messages |
| `pauseAgent` (client.ts:72) | Pause knop in AgentPanel + AgentActionBar |
| `resumeAgent` (client.ts:76) | Resume knop in AgentPanel + AgentActionBar |
| `fetchPipelines` (client.ts:80) | PipelineTab |
| `fetchTasks` (client.ts:116) | TaskBoard in TeamsTab |
| `createTask` (client.ts:121) | TaskBoard create form |
| `updateTask` (client.ts:130) | TaskCard status update |
| `fetchCheckpoints` (client.ts:141) | CheckpointPanel in AgentDetail |
| `resumeFromCheckpoint` (client.ts:146) | Resume knop in CheckpointPanel |
| `fetchSessionStatus` (client.ts:207) | Session indicator in StatsHeader |

---

## 6. Tech Stack Aanbevelingen

### 6a. Packages toevoegen

| Package | Versie | Doel | Prioriteit |
|---------|--------|------|------------|
| `@xterm/xterm` + `@xterm/addon-fit` | ^5.5.0 | Terminal output viewer in browser | P0 |
| `react-hotkeys-hook` | ^4.5.0 | Keyboard shortcuts (Ctrl+K, ?, J/K, etc.) | P0 |
| `sonner` | ^1.7.0 | Toast notificaties bij agent events | P0 |
| `react-resizable-panels` | ^2.1.7 | Resizable sidebar/detail panels | P1 |
| `cmdk` | ^1.0.0 | Command palette UI (Vercel-stijl) | P0 |

### 6b. Technische schuld oplossen

| Issue | Locatie | Actie | Prioriteit |
|-------|---------|-------|------------|
| Silent error swallowing | agentStore.ts catch {} | Error state in store + toast bij fout | P0 |
| Geen error boundaries | App.tsx | React ErrorBoundary wrapper per tab | P0 |
| `unknown` return types | client.ts (teams, tasks, checkpoints, guardians) | Proper TypeScript types definieren | P0 |
| Dubbele styling paradigma's | Inline styles vs Tailwind | Migreer alle inline styles naar Tailwind | P1 |
| Dode code LiveCanvas | LiveCanvas.tsx + gerelateerde imports | Verwijderen of reactiveren als tree-view optie | P1 |
| SSE zonder reconnect | client.ts:192 | Auto-reconnect na 5s bij connection loss | P1 |
| Messaging zonder eigen store | AgentPanel component state | Verplaats naar messagingStore (Zustand) | P0 |
| Polling zonder backoff | App.tsx, AgentPanel | Exponential backoff bij falen | P2 |
| startSession zonder feedback | SpawnForm | Check fetchSessionStatus, toon sessie-indicator | P1 |
| localStorage direct in component | App.tsx onboarding | Verplaats naar settingsStore | P2 |
| Tauri detection fragile | client.ts:3 `__TAURI_INTERNALS__` | Robustere check of env variabele | P2 |

---

## 7. Fasering (RAW)

### Fase 1: Must-Have MVP (Sprint A — ~2 weken)

**Doel**: Alle CLI gaps dichten, fundamentele UX verbeteringen.

| # | Taak | Componenten | Effort |
|---|------|------------|--------|
| 1.1 | Error boundaries + error state in agentStore | App.tsx, agentStore.ts | S |
| 1.2 | Toast notificaties (sonner) | ToastProvider, agentStore events | S |
| 1.3 | Type-safe API client | client.ts — alle `unknown` → proper types | M |
| 1.4 | Pause/Resume knoppen | AgentPanel, AgentActionBar | S |
| 1.5 | Broadcast UI | BroadcastButton, MessageComposer | S |
| 1.6 | Mark-read aanroep | AgentPanel messages tab | S |
| 1.7 | Terminal output (xterm.js) | TerminalOutput.tsx, AgentPanel | M |
| 1.8 | Hover action bar op KanbanBoard kaarten | AgentActionBar, KanbanBoard | M |
| 1.9 | StatsHeader (running/done/failed) | StatsHeader.tsx, App.tsx | S |
| 1.10 | Zoek/filter agents | SearchFilter.tsx, KanbanBoard | M |
| 1.11 | SpawnForm uitbreiden (max_children, cleanup) | SpawnForm.tsx | S |
| 1.12 | messagingStore aanmaken | messagingStore.ts | M |

**Totaal Fase 1**: ~8-10 dagen engineering

### Fase 2: Power Features (Sprint B — ~2 weken)

**Doel**: Features die de UI superieur maken aan CLI.

| # | Taak | Componenten | Effort |
|---|------|------------|--------|
| 2.1 | Command Palette (Ctrl+K) | CommandPalette.tsx (cmdk) | M |
| 2.2 | Keyboard shortcuts (react-hotkeys-hook) | ShortcutsOverlay.tsx, alle tabs | M |
| 2.3 | Pipeline tab + trigger API | PipelineTab.tsx, bridge POST /api/pipeline | L |
| 2.4 | TaskBoard in Teams tab | TaskBoard.tsx, TaskCard.tsx, taskStore | L |
| 2.5 | Checkpoint panel + resume | CheckpointPanel.tsx, checkpointStore | M |
| 2.6 | Messages tab (centraal) | MessagesTab.tsx, messagingStore uitbreiden | M |
| 2.7 | Template create/edit | Template editor modal in TemplatesTab | M |
| 2.8 | Resizable panels | react-resizable-panels integratie | M |
| 2.9 | Session status indicator | StatsHeader + fetchSessionStatus | S |
| 2.10 | GuardianPanel polling + register | GuardianPanel.tsx uitbreiden | S |
| 2.11 | Team member remove + broadcast | TeamsTab.tsx herbouw | M |
| 2.12 | SSE reconnect logica | client.ts streamAgentOutput | S |

**Totaal Fase 2**: ~12-14 dagen engineering

### Fase 3: Polish & Advanced (Sprint C — ~2 weken)

**Doel**: Desktop-grade UX, data visualisatie, history.

| # | Taak | Componenten | Effort |
|---|------|------------|--------|
| 3.1 | View toggle: kanban/tree/list | KanbanBoard, LiveCanvas reactivering | L |
| 3.2 | Cost dashboard | CostWidget.tsx, bridge /api/session/cost | M |
| 3.3 | Run history / audit trail | HistoryTab.tsx, session-log.json API | L |
| 3.4 | Tailwind migratie (inline styles weg) | DashboardTab, AgentPanel, etc. | L |
| 3.5 | Pipeline DAG visualisatie | PipelineDAG.tsx (ReactFlow) | L |
| 3.6 | Batch grid view | BatchGrid.tsx voor pipeline subtasks | M |
| 3.7 | Dode code cleanup (LiveCanvas etc.) | Verwijder of integreer als tree-view | M |
| 3.8 | Activity Feed persistentie | ActivityFeed + session-log API | S |
| 3.9 | Collapsible subtrees in tree view | LiveCanvas/tree layout | M |
| 3.10 | Onboarding flow verbeteren | Onboarding.tsx | S |
| 3.11 | Delegate UI | Delegate form + bridge endpoint | M |
| 3.12 | Retry agent actie | AgentActionBar + bridge retry endpoint | S |

**Totaal Fase 3**: ~14-16 dagen engineering

---

## 8. Risico's & Open Vragen

### Risico's

| Risico | Impact | Mitigatie |
|--------|--------|----------|
| Bridge server (Flask) is single-threaded | Hoog bij veel SSE streams + polling | Overweeg async framework (Quart) of worker threads |
| Pipeline API ontbreekt volledig | Blokkeert Fase 2 pipeline tab | Bridge endpoint bouwen als eerste prio in Fase 2 |
| LiveCanvas dode code vs reactivering | Verwarring, maintenance burden | Beslissing nemen: tree-view reactiveren OF volledig verwijderen |
| Dubbele styling (inline + Tailwind) | Inconsistente look, moeilijk te themen | Fase 3 migratie, maar kan veel werk zijn |
| Tauri dependencies in package.json | Build-complexiteit, niet-Tauri gebruikers | Optionele dependency of aparte build target |
| Polling schaalt niet bij 50+ agents | Performance degradatie | SSE voor agent list als P2 overweging |
| Geen tests voor UI componenten | Regressies bij refactoring | Component tests toevoegen parallel aan development |

### Open vragen

| Vraag | Context | Wie beslist |
|-------|---------|-------------|
| LiveCanvas reactiveren of verwijderen? | Substantiële code die niet gebruikt wordt | Product owner |
| Flask → async framework? | Single-threaded blocking is een bottleneck | Tech lead |
| Builder tab activeren of uitstellen? | ReactFlow workflow editor bestaat maar is niet connected | Product owner |
| Cost tracking: waar komen token data vandaan? | Agents loggen geen token gebruik; knowledge package heeft estimator | Backend team |
| Pipeline API: sync of async? | CLI pipeline is blocking; web moet async zijn | Backend team |
| Tauri als primaire distributie of optioneel? | Dependencies al aanwezig maar Sprint 18 is planned | Product owner |
| Team broadcast: alleen naar running members? | CLI broadcast gaat naar alle agents, niet per team | Product owner |
| Message persistence: hoelang bewaren? | Momenteel ongelimiteerd in ~/.oa/messages/ | Ops/Product |

---

## Bijlage: Keyboard Shortcuts Schema

| Shortcut | Actie | Scope |
|----------|-------|-------|
| `Ctrl+K` | Command palette | Global |
| `?` | Shortcuts overlay | Global |
| `/` | Filter agents | Dashboard |
| `J` / `K` | Volgende/vorige agent | Dashboard |
| `Enter` | Open agent detail | Dashboard |
| `Escape` | Sluit panel/modal | Global |
| `S` | Spawn agent modal | Dashboard |
| `K` (bij selectie) | Kill agent | Dashboard |
| `C` | Collect output | Dashboard |
| `R` | Retry agent | Dashboard |
| `M` | Message agent | Dashboard |
| `P` | Pause/resume toggle | Dashboard |
| `1-7` | Switch tabs | Global |
| `F` | Fit view (tree mode) | Dashboard |

---

*Einde masterplan — 8 secties, concreet en actionable.*
