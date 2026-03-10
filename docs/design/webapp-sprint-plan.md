# Web App Sprint Plan — Gedetailleerd

> **Versie**: 1.0
> **Datum**: 2026-03-08
> **Bron**: webapp-masterplan-raw.md
> **Auteur**: webapp-planner agent

---

## Leeswijzer

- **Paden**: alle paden relatief aan `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/web/src/`
- **NIEUW** = bestand moet aangemaakt worden
- **Effort**: S = <2u, M = 2-4u, L = 4-8u
- **Taak ID**: F{fase}-{volgnummer}

---

## Fase 1: Must-Have MVP

**Doel**: CLI gaps dichten, error handling, fundamentele UX.

---

### F1-01 — Error Boundaries + Error State in agentStore

**Doel**: Gebruiker ziet foutmeldingen i.p.v. stille failures.

**Bestanden**:
- `stores/agentStore.ts` — WIJZIG
- `components/shared/ErrorBoundary.tsx` — NIEUW
- `App.tsx` — WIJZIG

**Afhankelijkheden**: Geen (kan direct starten)

**Stappen**:
1. Maak `components/shared/ErrorBoundary.tsx`: React class component met `componentDidCatch`, toont fallback UI met foutmelding + retry knop
2. In `stores/agentStore.ts`: voeg `error: string | null` en `isLoading: boolean` toe aan de interface (regel 82-103)
3. In `fetchAgents` (regel 114): zet `isLoading: true` voor de fetch, `isLoading: false` in finally, en `error: foutmelding` in catch (regel 171-173 — vervang lege catch)
4. Doe hetzelfde voor `fetchDetail` (regel 176-183), `spawnAgent` (regel 189-195), `killAgent` (regel 197-200), `cleanAgents` (regel 202-206)
5. In `App.tsx`: wrap elke tab-render (regel 62-68) in `<ErrorBoundary>`

**Test**: Zet bridge server uit → UI toont foutmelding i.p.v. wit scherm. Console bevat geen uncaught errors.

---

### F1-02 — Toast Notificaties (sonner)

**Doel**: Gebruiker krijgt real-time feedback bij agent events.

**Bestanden**:
- `package.json` — WIJZIG (voeg `sonner` toe)
- `components/shared/ToastProvider.tsx` — NIEUW
- `App.tsx` — WIJZIG
- `stores/agentStore.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. `npm install sonner`
2. Maak `components/shared/ToastProvider.tsx`: exporteert `<Toaster />` van sonner met theme="dark", position="bottom-right"
3. In `App.tsx` (regel 37): voeg `<ToastProvider />` toe als eerste child van de root div
4. In `agentStore.ts` `fetchAgents` (rond regel 130-146): bij elke `newEvents.push()` ook `toast()` aanroepen — `toast.success()` voor spawn/done, `toast.error()` voor error/failed
5. In `spawnAgent` (regel 189): `toast.success('Agent gespawned')` na succesvolle spawn
6. In catch blokken: `toast.error(error.message)` tonen

**Test**: Spawn een agent → toast verschijnt rechtsonder. Kill een agent → status-toast verschijnt.

---

### F1-03 — Type-Safe API Client

**Doel**: Geen `unknown` return types meer; IDE autocompletion werkt overal.

**Bestanden**:
- `types/index.ts` — WIJZIG
- `api/client.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `types/index.ts`: voeg toe:
   ```typescript
   export interface Team { name: string; members: string[]; created_at: number; }
   export interface Task { id: string; title: string; description: string; status: 'todo'|'claimed'|'done'|'blocked'; assignee?: string; team: string; depends_on?: string[]; }
   export interface Checkpoint { agent: string; timestamp: number; state: string; resumable: boolean; }
   export interface Guardian { name: string; type: string; config: Record<string, unknown>; last_triggered?: number; }
   export interface SessionStatus { running: boolean; pid?: number; uptime?: number; agent_count?: number; }
   ```
2. In `client.ts`: vervang alle `Promise<unknown>` returns:
   - `fetchTeams` (regel 87) → `Promise<Team[]>`
   - `createTeam` (regel 92) → `Promise<Team>`
   - `addTeamMember` (regel 105) → `Promise<Team>`
   - `fetchTasks` (regel 116) → `Promise<Task[]>`
   - `createTask` (regel 121) → `Promise<Task>`, parameter `task: Partial<Task>`
   - `updateTask` (regel 130) → `Promise<Task>`, parameter `update: Partial<Task>`
   - `fetchCheckpoints` (regel 141) → `Promise<Checkpoint[]>`
   - `resumeFromCheckpoint` (regel 146) → `Promise<{ success: boolean }>`
   - `fetchGuardians` (regel 153) → `Promise<Guardian[]>`
   - `fetchSessionStatus` (regel 207) → `Promise<SessionStatus>`
3. Voeg imports toe bovenaan client.ts: `import type { Team, Task, Checkpoint, Guardian, SessionStatus } from '../types';`

**Test**: TypeScript compiler (`tsc --noEmit`) geeft geen errors. IDE toont correcte types bij hover.

---

### F1-04 — Pause/Resume Knoppen

**Doel**: Gebruiker kan agents pauzeren/hervatten vanuit de UI.

**Bestanden**:
- `components/dashboard/AgentPanel.tsx` — WIJZIG
- `stores/agentStore.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `agentStore.ts`: voeg `pauseAgent` en `resumeAgent` actions toe die `api.pauseAgent()` / `api.resumeAgent()` aanroepen + `fetchAgents()` daarna
2. In `AgentPanel.tsx`: voeg twee knoppen toe naast de bestaande "Kill" knop:
   - "Pause" knop (zichtbaar als status === 'running') → roept `pauseAgent(name)` aan
   - "Resume" knop (zichtbaar als status === 'paused') → roept `resumeAgent(name)` aan
3. Gebruik iconen: `⏸` voor pause, `▶` voor resume
4. Disable de knop tijdens uitvoering (loading state)

**Test**: Running agent → klik Pause → status wordt 'paused'. Klik Resume → status wordt 'running'.

---

### F1-05 — Broadcast UI

**Doel**: Gebruiker kan broadcast berichten sturen naar alle agents.

**Bestanden**:
- `components/dashboard/BroadcastButton.tsx` — NIEUW
- `components/dashboard/DashboardTab.tsx` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. Maak `BroadcastButton.tsx`: knop die een textarea modal opent
2. Modal bevat: "Van" input (default: "orchestrator"), "Bericht" textarea, "Verstuur" knop
3. Bij submit: roep `api.broadcastMessage(from, content)` aan
4. Toon toast bij succes: "Broadcast verstuurd naar alle agents"
5. Voeg `<BroadcastButton />` toe in `DashboardTab.tsx` naast de bestaande action knoppen

**Test**: Typ bericht → klik verstuur → toast verschijnt. Check met `oa inbox <agent>` dat bericht is ontvangen.

---

### F1-06 — Mark-Read bij Messages Openen

**Doel**: Unread count klopt na het bekijken van berichten.

**Bestanden**:
- `components/dashboard/AgentPanel.tsx` — WIJZIG
- `api/client.ts` — (al aanwezig, regel 66-69)

**Afhankelijkheden**: Geen

**Stappen**:
1. In `AgentPanel.tsx`: zoek de plek waar berichten geladen worden (messages tab/sectie)
2. Voeg een `useEffect` toe die `api.markRead(agentName)` aanroept wanneer de messages-sectie zichtbaar wordt
3. Na markRead: herlaad berichten om `read: true` te reflecteren
4. Update de `unread_messages` count op de agent in de store

**Test**: Agent met unread berichten → open messages → unread badge verdwijnt.

---

### F1-07 — Terminal Output (xterm.js)

**Doel**: Agent output ziet eruit als echte terminal i.p.v. platte textarea.

**Bestanden**:
- `package.json` — WIJZIG
- `components/dashboard/TerminalOutput.tsx` — NIEUW
- `components/dashboard/AgentPanel.tsx` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. `npm install @xterm/xterm @xterm/addon-fit`
2. Maak `TerminalOutput.tsx`:
   - Gebruik `useRef` voor terminal container div
   - `useEffect` die `new Terminal({ theme: { background: '#0a0e17' }, fontSize: 13 })` initialiseert
   - Props: `agentName: string`
   - Roep `api.streamAgentOutput(agentName, (output) => terminal.write(output))` aan
   - Cleanup: close terminal + stop stream bij unmount
   - Gebruik `FitAddon` voor auto-resize
3. In `AgentPanel.tsx`: vervang de bestaande output textarea/pre door `<TerminalOutput agentName={name} />`
4. Importeer xterm CSS: `import '@xterm/xterm/css/xterm.css'`

**Test**: Open agent detail → output scrollt live mee in terminal-stijl. Resize venster → terminal past mee.

---

### F1-08 — Hover Action Bar op KanbanBoard

**Doel**: Snelle acties direct op agent kaarten zonder detail te openen.

**Bestanden**:
- `components/dashboard/AgentActionBar.tsx` — NIEUW
- `components/dashboard/AgentCard.tsx` — WIJZIG
- `components/dashboard/KanbanBoard.tsx` — WIJZIG

**Afhankelijkheden**: F1-04 (pause/resume in store)

**Stappen**:
1. Maak `AgentActionBar.tsx`: horizontale balk met icon-buttons:
   - Kill (☠), Pause (⏸), Resume (▶), Collect (📥), Message (💬)
   - Props: `agent: Agent`, `onKill`, `onPause`, `onResume`, `onCollect`, `onMessage`
   - Alleen relevante knoppen tonen op basis van agent.status
2. In `AgentCard.tsx`: toon `<AgentActionBar />` bij hover (CSS `group-hover:visible`)
3. Wire de callbacks naar de juiste store actions
4. In `KanbanBoard.tsx`: zorg dat de action bar niet buiten de kaart overflow veroorzaakt

**Test**: Hover over agent kaart → action bar verschijnt. Klik Kill → agent wordt gekilld zonder detail te openen.

---

### F1-09 — StatsHeader

**Doel**: Altijd zichtbaar overzicht van running/done/failed counts.

**Bestanden**:
- `components/layout/StatsHeader.tsx` — NIEUW
- `App.tsx` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. Maak `StatsHeader.tsx`:
   - Lees `useAgentStore` → `getRunning().length`, `getDone().length`, `getFailed().length`, `agents.length`
   - Toon: `🟢 {running} running | ✅ {done} done | 🔴 {failed} failed | Total: {total}`
   - Toon session uptime: bereken vanuit `useUIStore.sessionStart`
   - Styling: vaste hoogte (36px), border-bottom, monospace font
2. In `App.tsx` (regel 61): voeg `<StatsHeader />` toe boven de tab content, binnen de `flex-1` div
3. Zorg dat de header niet mee-scrollt met tab content

**Test**: Spawn agents → tellers updaten real-time. Altijd zichtbaar ongeacht welke tab actief is.

---

### F1-10 — Zoek/Filter Agents

**Doel**: Snel agents vinden in grote lijsten.

**Bestanden**:
- `components/dashboard/SearchFilter.tsx` — NIEUW
- `components/dashboard/KanbanBoard.tsx` — WIJZIG
- `stores/uiStore.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `uiStore.ts`: voeg toe: `agentFilter: string`, `statusFilter: string | null`, `setAgentFilter`, `setStatusFilter`
2. Maak `SearchFilter.tsx`:
   - Tekst input voor naam zoeken (debounced 200ms)
   - Dropdown/buttons voor status filter: All | Running | Done | Failed
   - Model filter dropdown (populated vanuit agents)
3. In `KanbanBoard.tsx`: filter agents op basis van `uiStore.agentFilter` en `uiStore.statusFilter` voordat ze gerenderd worden
4. Keyboard shortcut: `/` focust het zoekveld

**Test**: Typ "planner" → alleen agents met "planner" in naam zichtbaar. Selecteer "Running" → alleen running agents.

---

### F1-11 — SpawnForm Uitbreiden

**Doel**: Alle spawn opties beschikbaar in UI.

**Bestanden**:
- `components/dashboard/SpawnForm.tsx` — WIJZIG
- `types/index.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `types/index.ts` `SpawnAgentBody` (regel 60-65): voeg toe: `max_children?: number`, `auto_cleanup_minutes?: number`, `guardians?: string[]`
2. In `SpawnForm.tsx`: voeg drie velden toe onder de bestaande velden:
   - `max_children`: number input (default: 10, min: 0)
   - `auto_cleanup_minutes`: number input (default: 0 = uit, min: 0)
   - `guardians`: multi-select of komma-gescheiden tekstveld
3. Stuur de nieuwe velden mee in de `spawnAgent()` body
4. Lees defaults uit `settingsStore` als die beschikbaar zijn
5. Toon deze velden in een "Geavanceerd" collapsible sectie (standaard dicht)

**Test**: Open SpawnForm → klap "Geavanceerd" open → stel max_children=5 in → spawn → agent heeft correct max_children.

---

### F1-12 — messagingStore Aanmaken

**Doel**: Centraal state management voor alle berichten.

**Bestanden**:
- `stores/messagingStore.ts` — NIEUW
- `types/index.ts` — WIJZIG (Message type al aanwezig)

**Afhankelijkheden**: Geen

**Stappen**:
1. Maak `stores/messagingStore.ts` met Zustand:
   ```typescript
   interface MessagingStore {
     inboxes: Record<string, Message[]>;    // per agent
     unreadCounts: Record<string, number>;
     broadcastHistory: Message[];
     fetchInbox: (agent: string) => Promise<void>;
     sendMessage: (from: string, to: string, content: string) => Promise<void>;
     broadcast: (from: string, content: string) => Promise<void>;
     markRead: (agent: string) => Promise<void>;
   }
   ```
2. Implementeer elke action met de bijbehorende `api.*` calls
3. `fetchInbox`: slaat resultaat op in `inboxes[agent]`, update `unreadCounts[agent]`
4. `broadcast`: roept `api.broadcastMessage` aan, voegt bericht toe aan `broadcastHistory`
5. `markRead`: roept `api.markRead` aan, zet `unreadCounts[agent] = 0`

**Test**: Importeer store in een component → `fetchInbox('test')` → `inboxes.test` bevat berichten.

---

## Fase 1 — Overzicht

### Dependency Grafiek

```
F1-01 ──┐
F1-02 ──┤
F1-03 ──┤
F1-04 ──┼── F1-08 (hover bar heeft pause/resume nodig)
F1-05 ──┤
F1-06 ──┤
F1-07 ──┤
F1-09 ──┤
F1-10 ──┤
F1-11 ──┤
F1-12 ──┘
```

### 100% Parallel (geen dependencies)
F1-01, F1-02, F1-03, F1-04, F1-05, F1-06, F1-07, F1-09, F1-10, F1-11, F1-12

### Quick Wins (< 1u)
- **F1-06** Mark-read: 3 regels code toevoegen
- **F1-09** StatsHeader: simpel component, puur lezen uit store
- **F1-04** Pause/Resume: 2 knoppen + 2 store actions

### Kritiek Pad Fase 1
1. F1-01 (error handling) → zonder dit crasht de UI bij fouten
2. F1-03 (types) → basis voor alle verdere development
3. F1-02 (toasts) → feedback loop voor gebruiker
4. F1-12 (messagingStore) → basis voor Fase 2 Messages tab
5. F1-07 (xterm.js) → grootste UX verbetering

---

## Fase 2: Power Features

**Doel**: Features die UI superieur maken aan CLI.

---

### F2-01 — Command Palette (Ctrl+K)

**Doel**: Snelle fuzzy-search over alle acties, Vercel-stijl.

**Bestanden**:
- `package.json` — WIJZIG
- `components/shared/CommandPalette.tsx` — NIEUW
- `stores/uiStore.ts` — WIJZIG
- `App.tsx` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. `npm install cmdk react-hotkeys-hook`
2. In `uiStore.ts`: voeg `commandPaletteOpen: boolean` + `toggleCommandPalette` toe
3. Maak `CommandPalette.tsx` met `cmdk`:
   - Groepen: "Agents" (spawn, kill geselecteerde), "Navigation" (tabs), "Actions" (broadcast, clean)
   - Fuzzy search over alle commands
   - Enter = uitvoeren, Escape = sluiten
4. In `App.tsx`: voeg `<CommandPalette />` toe + `useHotkeys('ctrl+k', toggleCommandPalette)`
5. Dynamische items: lijst van running agents als "Kill {name}" commands

**Test**: Ctrl+K → palette opent → typ "spawn" → "Spawn Agent" verschijnt → Enter → SpawnForm opent.

---

### F2-02 — Keyboard Shortcuts + Overlay

**Doel**: Power-user navigatie zonder muis.

**Bestanden**:
- `package.json` — WIJZIG (react-hotkeys-hook, al in F2-01)
- `components/shared/ShortcutsOverlay.tsx` — NIEUW
- `stores/uiStore.ts` — WIJZIG
- `App.tsx` — WIJZIG

**Afhankelijkheden**: F2-01 (deelt react-hotkeys-hook installatie)

**Stappen**:
1. In `uiStore.ts`: voeg `shortcutsOpen: boolean` + `toggleShortcuts` toe
2. Maak `ShortcutsOverlay.tsx`: modal met alle shortcuts in tabelformaat (zie masterplan Bijlage)
3. In `App.tsx`: registreer alle global hotkeys:
   - `?` → toggle shortcuts overlay
   - `1-7` → switch tabs (`setMainTab`)
   - `s` → focus SpawnForm
   - `Escape` → sluit panels/modals
4. Per-tab hotkeys in de tab-componenten zelf (J/K navigatie in Dashboard)

**Test**: Druk `?` → overlay toont. Druk `2` → navigeert naar Builder tab. Druk Escape → overlay sluit.

---

### F2-03 — Pipeline Tab

**Doel**: Pipelines starten en monitoren vanuit de UI.

**Bestanden**:
- `components/pipeline/PipelineTab.tsx` — NIEUW
- `stores/pipelineStore.ts` — NIEUW
- `types/index.ts` — WIJZIG
- `App.tsx` — WIJZIG
- `stores/uiStore.ts` — WIJZIG (MainTab type uitbreiden)

**Afhankelijkheden**: F1-03 (types)

**Stappen**:
1. In `types/index.ts`:
   - Voeg toe: `export interface Pipeline { id: string; task: string; status: 'planning'|'running'|'done'|'error'; steps: PipelineStep[]; created_at: number; }`
   - `export interface PipelineStep { name: string; status: string; agent?: string; output?: string; }`
   - Voeg `'pipeline'` toe aan `MainTab` union type
2. Maak `stores/pipelineStore.ts`:
   - `pipelines: Pipeline[]`, `fetchPipelines`, `triggerPipeline(task: string)`
   - Polling elke 3 seconden voor actieve pipelines
3. Maak `components/pipeline/PipelineTab.tsx`:
   - Trigger form: textarea + model select + "Start Pipeline" knop
   - Actieve pipelines lijst met stap-indicatoren (planning → subtasks → combining → done)
   - Per pipeline: klikbaar voor detail (toont per-stap output)
4. In `App.tsx`: voeg `{activeMainTab === 'pipeline' && <PipelineTab />}` toe
5. In `Sidebar.tsx`: voeg Pipeline tab item toe

**Test**: Vul taak in → klik Start → pipeline verschijnt in lijst → stappen updaten real-time.

---

### F2-04 — TaskBoard in Teams Tab

**Doel**: Visueel takenbeheer per team.

**Bestanden**:
- `components/teams/TaskBoard.tsx` — NIEUW
- `components/teams/TaskCard.tsx` — NIEUW
- `stores/taskStore.ts` — NIEUW
- `components/teams/TeamsTab.tsx` — WIJZIG

**Afhankelijkheden**: F1-03 (Task type)

**Stappen**:
1. Maak `stores/taskStore.ts`:
   - `tasks: Record<string, Task[]>` (per team)
   - `fetchTasks(team)`, `createTask(team, task)`, `claimTask(team, taskId, agent)`, `completeTask(team, taskId)`
2. Maak `TaskCard.tsx`: toont titel, beschrijving, status badge, assignee, claim/complete knoppen
3. Maak `TaskBoard.tsx`: 4-koloms kanban (todo | claimed | done | blocked)
   - Kolommen filteren tasks op status
   - "Nieuwe taak" knop bovenaan met inline form
4. In `TeamsTab.tsx`: integreer `<TaskBoard team={selectedTeam} />` onder team details
5. Voeg een team-selector toe als er meerdere teams zijn

**Test**: Selecteer team → taken verschijnen in kolommen. Maak nieuwe taak → verschijnt in "todo". Claim → verhuist naar "claimed".

---

### F2-05 — Checkpoint Panel + Resume

**Doel**: Checkpoints bekijken en agents hervatten.

**Bestanden**:
- `components/dashboard/CheckpointPanel.tsx` — NIEUW
- `stores/checkpointStore.ts` — NIEUW
- `components/dashboard/AgentPanel.tsx` — WIJZIG

**Afhankelijkheden**: F1-03 (Checkpoint type)

**Stappen**:
1. Maak `stores/checkpointStore.ts`:
   - `checkpoints: Checkpoint[]`, `fetchCheckpoints()`, `resumeFromCheckpoint(agent: string)`
2. Maak `CheckpointPanel.tsx`:
   - Lijst van checkpoints gesorteerd op timestamp (nieuwste eerst)
   - Per checkpoint: agent naam, tijdstip, state beschrijving
   - "Resume" knop per checkpoint (alleen als `resumable === true`)
   - Bevestigingsdialoog voor resume actie
3. In `AgentPanel.tsx`: voeg een "Checkpoints" tab toe naast bestaande tabs
4. Laad checkpoints bij mount van het panel

**Test**: Agent met checkpoint → open panel → checkpoint zichtbaar → klik Resume → agent herstart.

---

### F2-06 — Messages Tab (Centraal)

**Doel**: Alle berichten op één plek, niet meer per agent zoeken.

**Bestanden**:
- `components/messages/MessagesTab.tsx` — NIEUW
- `components/messages/MessageComposer.tsx` — NIEUW
- `stores/messagingStore.ts` — WIJZIG (uit F1-12)
- `App.tsx` — WIJZIG
- `stores/uiStore.ts` — WIJZIG
- `types/index.ts` — WIJZIG (MainTab)

**Afhankelijkheden**: F1-12 (messagingStore)

**Stappen**:
1. Voeg `'messages'` toe aan `MainTab` type in `types/index.ts`
2. Maak `MessageComposer.tsx`: from/to select (lijst van agents), textarea, send knop + broadcast toggle
3. Maak `MessagesTab.tsx`:
   - Links: lijst van agents met unread badges
   - Rechts: geselecteerde inbox met berichten (chat-stijl)
   - Bovenaan: MessageComposer
   - Broadcast sectie: apart paneel met broadcast geschiedenis
4. In `messagingStore.ts`: voeg `fetchAllInboxes()` toe die voor elke bekende agent de inbox ophaalt
5. In `App.tsx` + `Sidebar.tsx`: voeg Messages tab toe

**Test**: Open Messages tab → selecteer agent → berichten zichtbaar. Stuur bericht → verschijnt in inbox. Broadcast → verschijnt bij alle agents.

---

### F2-07 — Template Create/Edit

**Doel**: Templates beheren vanuit de UI.

**Bestanden**:
- `components/templates/TemplateEditor.tsx` — NIEUW
- `components/templates/TemplatesTab.tsx` — WIJZIG
- `stores/templateStore.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. Maak `TemplateEditor.tsx`: modal form met:
   - Naam, beschrijving, categorie (dropdown), modelHint (select), systemPrompt (textarea met monospace)
   - Save + Cancel knoppen
   - Mode: "create" of "edit" (vult velden voor)
2. In `TemplatesTab.tsx`: voeg "Nieuw Template" knop toe die editor in create mode opent
3. Op elke TemplateCard: "Edit" en "Duplicate" knoppen
4. In `templateStore.ts`: voeg `createTemplate()`, `updateTemplate()`, `deleteTemplate()` actions toe
5. API calls toevoegen in `client.ts` als die nog niet bestaan (POST/PUT/DELETE /api/templates)

**Test**: Klik "Nieuw Template" → vul in → save → template verschijnt in lijst. Edit → wijzig naam → save → naam updated.

---

### F2-08 — Resizable Panels

**Doel**: Flexibele layout, gebruiker bepaalt panel-breedtes.

**Bestanden**:
- `package.json` — WIJZIG
- `App.tsx` — WIJZIG
- `components/dashboard/DashboardTab.tsx` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. `npm install react-resizable-panels`
2. In `DashboardTab.tsx`: wrap sidebar + main + detail in `<PanelGroup direction="horizontal">`
3. Voeg `<PanelResizeHandle />` toe tussen panels
4. Sla panel sizes op in localStorage voor persistentie
5. Minimum breedte per panel: sidebar 200px, main 400px, detail 300px

**Test**: Sleep de divider tussen panels → breedtes passen aan. Herlaad pagina → breedtes behouden.

---

### F2-09 — Session Status Indicator

**Doel**: Gebruiker ziet of de oa sessie draait.

**Bestanden**:
- `components/layout/StatsHeader.tsx` — WIJZIG (uit F1-09)

**Afhankelijkheden**: F1-09 (StatsHeader)

**Stappen**:
1. In `StatsHeader.tsx`: roep `api.fetchSessionStatus()` aan elke 5 seconden
2. Toon indicator: groene stip + "Session active" of rode stip + "No session"
3. Als geen sessie: toon "Start Session" knop die `api.startSession()` aanroept
4. Toon session uptime als die beschikbaar is vanuit de API

**Test**: oa sessie draait → groene indicator. Stop sessie → rode indicator + start knop.

---

### F2-10 — GuardianPanel Polling + Register

**Doel**: Guardians real-time updaten, nieuwe registreren.

**Bestanden**:
- `components/dashboard/GuardianPanel.tsx` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `GuardianPanel.tsx`: vervang eenmalige `useEffect` fetch door polling interval (elke 10s)
2. Cleanup interval bij unmount
3. Voeg "Registreer Guardian" form toe: naam input, type select, config JSON textarea
4. Submit roept nieuw API endpoint aan (als dat beschikbaar is, anders disabled met tooltip)

**Test**: Guardian status verandert → UI updatet binnen 10s. Registratie form is zichtbaar (disabled als API ontbreekt).

---

### F2-11 — Team Member Remove + Team Broadcast

**Doel**: Volledig team management in UI.

**Bestanden**:
- `components/teams/TeamsTab.tsx` — WIJZIG
- `api/client.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `client.ts`: voeg `removeTeamMember(team: string, agent: string)` toe — DELETE `/api/teams/{team}/members/{agent}`
2. In `TeamsTab.tsx` member lijst: voeg "X" knop toe per member die `removeTeamMember` aanroept
3. Voeg "Broadcast naar Team" knop toe die `api.broadcastMessage(from, content)` aanroept met team context
4. Bevestigingsdialoog voor member verwijdering
5. Herlaad team data na elke mutatie

**Test**: Verwijder member → verdwijnt uit lijst. Broadcast → bericht verstuurd naar team members.

---

### F2-12 — SSE Reconnect Logica

**Doel**: Live output herstelt automatisch na verbindingsverlies.

**Bestanden**:
- `api/client.ts` — WIJZIG (regel 192-203)

**Afhankelijkheden**: Geen

**Stappen**:
1. In `streamAgentOutput` (regel 192): voeg `onerror` handler toe
2. Bij error: sluit huidige EventSource, wacht 3 seconden, maak nieuwe EventSource aan
3. Maximum 5 reconnect pogingen, daarna callback met error status
4. Voeg `onReconnect` callback parameter toe zodat UI reconnect-status kan tonen
5. Exponential backoff: 1s, 2s, 4s, 8s, 16s

**Test**: Start stream → verbreek verbinding (stop bridge) → herstart bridge → stream herstelt automatisch.

---

## Fase 2 — Overzicht

### Dependency Grafiek

```
F1-03 ──┬── F2-03 (Pipeline, types nodig)
        └── F2-04 (TaskBoard, types nodig)
F1-09 ──── F2-09 (Session indicator in StatsHeader)
F1-12 ──── F2-06 (Messages tab bouwt voort op messagingStore)
F2-01 ──── F2-02 (Shortcuts deelt react-hotkeys-hook)
```

### 100% Parallel
F2-01, F2-04, F2-05, F2-07, F2-08, F2-10, F2-11, F2-12

### Quick Wins
- **F2-09** Session indicator: klein UI toevoeginkje
- **F2-12** SSE reconnect: paar regels in bestaande functie
- **F2-10** Guardian polling: interval toevoegen

### Kritiek Pad Fase 2
1. F2-01 (Command Palette) → dagelijkse productivity booster
2. F2-03 (Pipeline Tab) → unblocked pipeline monitoring
3. F2-06 (Messages Tab) → centraal communicatie hub
4. F2-04 (TaskBoard) → team coordinatie

---

## Fase 3: Polish & Advanced

**Doel**: Desktop-grade UX, visualisaties, history.

---

### F3-01 — View Toggle: Kanban / Tree / List

**Doel**: Gebruiker kiest weergave die past bij situatie.

**Bestanden**:
- `components/dashboard/ViewToggle.tsx` — NIEUW
- `components/dashboard/AgentList.tsx` — WIJZIG (hergebruik als list view)
- `components/dashboard/DashboardTab.tsx` — WIJZIG
- `stores/uiStore.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `uiStore.ts`: voeg `dashboardView: 'kanban' | 'tree' | 'list'` + setter toe
2. Maak `ViewToggle.tsx`: drie icon-buttons die de view wisselen
3. In `DashboardTab.tsx`: conditioneel renderen op basis van `dashboardView`:
   - `kanban` → bestaande `<KanbanBoard />`
   - `list` → bestaande `<AgentList />` (tabelweergave)
   - `tree` → bestaande `<LiveCanvas />` (reactiveren)
4. Zorg dat alle drie views dezelfde filter/search respecteren (uit F1-10)

**Test**: Klik tree → hiërarchische weergave. Klik list → tabel. Klik kanban → terug naar standaard.

---

### F3-02 — Cost Dashboard

**Doel**: Inzicht in token/kosten verbruik per sessie.

**Bestanden**:
- `components/dashboard/CostWidget.tsx` — NIEUW
- `components/layout/StatsHeader.tsx` — WIJZIG

**Afhankelijkheden**: F1-09 (StatsHeader), API endpoint `/api/session/cost`

**Stappen**:
1. Maak `CostWidget.tsx`: compact widget dat geschatte kosten toont
2. Toont: totale sessie kosten, kosten per agent (top 5), kosten per model
3. Haal data op via `fetch('/api/session/cost')` elke 30 seconden
4. Fallback als endpoint niet beschikbaar: toon "Cost tracking niet beschikbaar"
5. In `StatsHeader.tsx`: voeg compact cost indicator toe (bijv. "$0.42")

**Test**: Sessie met agents → kosten worden getoond. API niet beschikbaar → friendly fallback.

---

### F3-03 — Run History / Audit Trail

**Doel**: Bekijk eerdere sessies en agent runs.

**Bestanden**:
- `components/history/HistoryTab.tsx` — NIEUW
- `types/index.ts` — WIJZIG (MainTab + HistoryEntry type)
- `App.tsx` — WIJZIG
- `stores/uiStore.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. Voeg `'history'` toe aan `MainTab` type
2. Definieer `HistoryEntry` type: `{ agent: string; task: string; model: string; status: string; duration: number; timestamp: number; }`
3. Maak `HistoryTab.tsx`: tabel met sorteerbare kolommen (naam, status, model, duur, tijdstip)
4. Lees data uit `~/.oa/session-log.json` via nieuw API endpoint
5. Zoek/filter functionaliteit, date range picker
6. In App.tsx + Sidebar: voeg History tab toe

**Test**: Open History → eerdere runs zichtbaar. Sorteer op duur → langste bovenaan.

---

### F3-04 — Tailwind Migratie (Inline Styles)

**Doel**: Consistente styling, makkelijker te themen.

**Bestanden**:
- `components/dashboard/DashboardTab.tsx` — WIJZIG
- `components/dashboard/AgentPanel.tsx` — WIJZIG
- `components/dashboard/AgentCard.tsx` — WIJZIG
- `components/dashboard/KanbanBoard.tsx` — WIJZIG
- Alle componenten met inline `style={{}}` — WIJZIG

**Afhankelijkheden**: Geen (maar doe na functionaliteit)

**Stappen**:
1. Inventariseer alle componenten met `style={{` via grep
2. Per component: vervang inline styles door Tailwind utility classes
3. Maak custom Tailwind kleuren aan in `tailwind.config` voor oa-specifieke kleuren (oa-bg, oa-text, etc.) — waarschijnlijk al gedaan
4. Test elke component visueel na migratie
5. Verwijder ongebruikte CSS uit `App.tsx` `<style>` tag

**Test**: UI ziet er identiek uit na migratie. Dark theme werkt correct. Geen inline style attributen meer in gerenderude HTML.

---

### F3-05 — Pipeline DAG Visualisatie

**Doel**: Visuele stappengrafiek van pipeline flow.

**Bestanden**:
- `components/pipeline/PipelineDAG.tsx` — NIEUW
- `components/pipeline/PipelineTab.tsx` — WIJZIG (uit F2-03)

**Afhankelijkheden**: F2-03 (PipelineTab)

**Stappen**:
1. ReactFlow is al als dependency aanwezig (gebruikt in BuilderTab)
2. Maak `PipelineDAG.tsx`: vertaal pipeline steps naar ReactFlow nodes+edges
3. Node types: "planner" (blauw), "worker" (groen), "combiner" (oranje)
4. Edge labels: tonen data flow
5. Status kleuren op nodes: running=pulsend, done=groen, error=rood
6. In `PipelineTab.tsx`: toon DAG onder de pipeline details

**Test**: Actieve pipeline → DAG toont stappen als connected nodes. Stap compleet → node kleurt groen.

---

### F3-06 — Batch Grid View

**Doel**: Matrix-weergave van pipeline subtasks.

**Bestanden**:
- `components/pipeline/BatchGrid.tsx` — NIEUW
- `components/pipeline/PipelineTab.tsx` — WIJZIG

**Afhankelijkheden**: F2-03 (PipelineTab)

**Stappen**:
1. Maak `BatchGrid.tsx`: grid layout met kaartjes per subtask
2. Elke kaart toont: agent naam, model, status, korte output preview
3. Kleurcodering per status
4. Click op kaart → opent agent detail
5. In `PipelineTab.tsx`: toggle tussen DAG en Grid view

**Test**: Pipeline met 5 subtasks → grid toont 5 kaarten. Klik kaart → agent detail opent.

---

### F3-07 — Dode Code Cleanup

**Doel**: Codebase opschonen, maintenance verminderen.

**Bestanden**:
- `components/dashboard/LiveCanvas.tsx` — WIJZIG of VERWIJDER
- Gerelateerde imports — WIJZIG

**Afhankelijkheden**: F3-01 (beslissing: reactiveren of verwijderen)

**Stappen**:
1. Beslissing nemen: als tree view in F3-01 LiveCanvas hergebruikt → behouden en opschonen
2. Als niet hergebruikt → volledig verwijderen: bestand + alle imports
3. Zoek naar andere ongebruikte exports/componenten via TypeScript compiler
4. Verwijder ongebruikte dependencies uit `package.json`

**Test**: `npm run build` slaagt zonder warnings. Geen ongebruikte imports in output.

---

### F3-08 — Activity Feed Persistentie

**Doel**: Events overleven page refresh.

**Bestanden**:
- `components/dashboard/ActivityFeed.tsx` — WIJZIG
- `stores/agentStore.ts` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. In `agentStore.ts`: sla `activityLog` op in localStorage bij elke update
2. Bij initialisatie: laad `activityLog` uit localStorage
3. Maximum 200 events bewaren, oudste verwijderen
4. Voeg filter toe in `ActivityFeed.tsx`: filter op event type (spawn, status change, clean)
5. Optioneel: sync met server-side session-log als dat API endpoint beschikbaar is

**Test**: Genereer events → refresh pagina → events zijn nog zichtbaar.

---

### F3-09 — Delegate UI

**Doel**: Orchestrator + workers pattern vanuit UI starten.

**Bestanden**:
- `components/dashboard/DelegateForm.tsx` — NIEUW
- `api/client.ts` — WIJZIG

**Afhankelijkheden**: Geen (maar API endpoint moet bestaan)

**Stappen**:
1. In `client.ts`: voeg `delegateTask(task: string, options: object)` toe — POST `/api/delegate`
2. Maak `DelegateForm.tsx`: taak textarea, model select, worker count input
3. Submit roept `delegateTask` aan
4. Resultaat: toont gespawnde orchestrator + workers in dashboard
5. Fallback als API niet beschikbaar: disabled met tooltip

**Test**: Vul taak in → delegate → orchestrator + workers verschijnen in dashboard.

---

### F3-10 — Retry Agent Actie

**Doel**: Failed agents herstarten met dezelfde configuratie.

**Bestanden**:
- `components/dashboard/AgentActionBar.tsx` — WIJZIG (uit F1-08)
- `stores/agentStore.ts` — WIJZIG
- `api/client.ts` — WIJZIG

**Afhankelijkheden**: F1-08 (AgentActionBar)

**Stappen**:
1. In `client.ts`: voeg `retryAgent(name: string)` toe — POST `/api/agents/{name}/retry`
2. In `agentStore.ts`: voeg `retryAgent` action toe
3. In `AgentActionBar.tsx`: voeg "Retry" knop toe (zichtbaar bij status error/failed/killed)
4. Bij retry: toon toast "Agent herstart..."
5. Fallback: als retry API niet beschikbaar, spawn nieuwe agent met zelfde task/model

**Test**: Failed agent → klik Retry → nieuwe agent spawnt met zelfde configuratie.

---

### F3-11 — Onboarding Flow Verbeteren

**Doel**: Nieuwe gebruikers sneller productief.

**Bestanden**:
- `components/Onboarding.tsx` — WIJZIG

**Afhankelijkheden**: Geen

**Stappen**:
1. Voeg stappen toe: "Controleer of oa bridge draait" met auto-detect
2. Toon sessie status check (groen/rood indicator)
3. Quick-start: "Spawn je eerste agent" inline form
4. Link naar documentatie/keyboard shortcuts
5. Verplaats `localStorage.getItem('oa_onboarded')` naar settingsStore

**Test**: Nieuwe gebruiker (clear localStorage) → onboarding verschijnt → stappen doorlopen → dashboard.

---

## Fase 3 — Overzicht

### Dependency Grafiek

```
F2-03 ──┬── F3-05 (Pipeline DAG bouwt op PipelineTab)
        └── F3-06 (Batch Grid bouwt op PipelineTab)
F1-08 ──── F3-10 (Retry knop in ActionBar)
F3-01 ──── F3-07 (LiveCanvas beslissing)
```

### 100% Parallel
F3-01, F3-02, F3-03, F3-04, F3-08, F3-09, F3-11

### Quick Wins
- **F3-08** Activity Feed persistentie: localStorage read/write
- **F3-10** Retry agent: 1 knop + 1 API call
- **F3-11** Onboarding verbeteren: bestaand component uitbreiden

### Kritiek Pad Fase 3
1. F3-04 (Tailwind migratie) → technische schuld oplossen
2. F3-01 (View toggle) → beslissing over LiveCanvas
3. F3-05 (Pipeline DAG) → visueel superieur aan CLI

---

## Totaaloverzicht

### Nieuwe Bestanden (alle fasen)

| Bestand | Fase |
|---------|------|
| `components/shared/ErrorBoundary.tsx` | F1 |
| `components/shared/ToastProvider.tsx` | F1 |
| `components/dashboard/BroadcastButton.tsx` | F1 |
| `components/dashboard/TerminalOutput.tsx` | F1 |
| `components/dashboard/AgentActionBar.tsx` | F1 |
| `components/dashboard/SearchFilter.tsx` | F1 |
| `components/layout/StatsHeader.tsx` | F1 |
| `stores/messagingStore.ts` | F1 |
| `components/shared/CommandPalette.tsx` | F2 |
| `components/shared/ShortcutsOverlay.tsx` | F2 |
| `components/pipeline/PipelineTab.tsx` | F2 |
| `components/pipeline/PipelineDAG.tsx` | F3 |
| `components/pipeline/BatchGrid.tsx` | F3 |
| `components/teams/TaskBoard.tsx` | F2 |
| `components/teams/TaskCard.tsx` | F2 |
| `components/messages/MessagesTab.tsx` | F2 |
| `components/messages/MessageComposer.tsx` | F2 |
| `components/templates/TemplateEditor.tsx` | F2 |
| `components/dashboard/ViewToggle.tsx` | F3 |
| `components/dashboard/CostWidget.tsx` | F3 |
| `components/dashboard/DelegateForm.tsx` | F3 |
| `components/history/HistoryTab.tsx` | F3 |
| `stores/pipelineStore.ts` | F2 |
| `stores/taskStore.ts` | F2 |
| `stores/checkpointStore.ts` | F2 |

### Nieuwe Packages

| Package | Fase | Commando |
|---------|------|----------|
| `sonner` | F1 | `npm i sonner` |
| `@xterm/xterm @xterm/addon-fit` | F1 | `npm i @xterm/xterm @xterm/addon-fit` |
| `cmdk` | F2 | `npm i cmdk` |
| `react-hotkeys-hook` | F2 | `npm i react-hotkeys-hook` |
| `react-resizable-panels` | F2 | `npm i react-resizable-panels` |

### Aanbevolen Startvolgorde Fase 1

1. **Parallel blok A** (dag 1-2): F1-01, F1-02, F1-03, F1-06, F1-09
2. **Parallel blok B** (dag 2-4): F1-04, F1-05, F1-11, F1-12
3. **Parallel blok C** (dag 4-6): F1-07, F1-10
4. **Na F1-04**: F1-08 (dag 5-6)

Maximale parallellisatie: 5 agents tegelijk op blok A.
