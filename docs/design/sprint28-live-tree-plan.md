# Sprint 28: Live Agent Tree Visualisatie — Implementatieplan

**Datum**: 2026-03-12
**Beslissing**: D-060 (Recursive Agent Tree als kernfilosofie)
**Principe**: 3.4.1 — "Informatie daalt diep de boom in. Resultaten stijgen gecheckt omhoog."

---

## 1. Huidige Staat

### Wat is er al

**Backend (oa-cli bridge — Python/Flask):**
- `AgentRecord` in `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/state.py` bevat tree-velden: `parent`, `depth`, `lineage`, `max_children`, `shared_results_dir`
- `GET /api/agents` in `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/bridge.py` retourneert al `parent`, `depth`, `lineage` per agent (via `_agent_to_dict()`, regels 863-888)
- Boom-navigatie helpers bestaan: `get_children()`, `count_children()`, `get_lineage()`, `validate_spawn()` (state.py:257-335)
- `canvas_export.py` converteert agents al naar React Flow-compatibele nodes/edges met parent→child edges
- Bridge draait op `http://localhost:5001` (Flask)

**Frontend (React + React Flow + Zustand):**
- `@xyflow/react` is geinstalleerd (in `packages/frontend/node_modules/@xyflow/`)
- `CanvasPage.tsx` gebruikt React Flow met `AgentNode`, `DispatcherNode`, `AggregatorNode` node types
- `AgentNode.tsx` toont status kleuren (idle/running/completed/error) met borders en animaties
- `STATUS_COLORS` en `getNodeBorderStyle()` in `constants.ts`
- App tabs: `canvas | runs | factory | library | settings` — **geen dashboard/tree tab**
- `bridgeService.ts` verbindt met VS Code bridge op `localhost:7483` (NIET de oa-cli bridge op 5001)
- `apiConfig.ts` biedt configureerbare API base URL

**Wat ontbreekt:**
- Geen "Dashboard" tab of "AgentTreeView" component
- Geen service die de oa-cli bridge (`localhost:5001/api/agents`) pollt
- Geen tree-specifiek endpoint dat de boom als hiërarchie retourneert (bestaande `/api/agents` is een platte lijst)
- Geen Zustand slice voor live agent tree state
- Geen live polling/WebSocket voor tree updates
- Geen click-through naar agent output vanuit tree nodes

---

## 2. Gap Analyse

| Laag | Wat ontbreekt | Impact |
|------|---------------|--------|
| **Bridge API** | Endpoint dat agents als boom-structuur retourneert (genest) | Frontend moet zelf tree bouwen uit platte lijst — minder efficiënt maar werkbaar |
| **Bridge API** | Tree-diff endpoint (alleen gewijzigde agents sinds timestamp) | Polling stuurt steeds volledige lijst — acceptabel voor <100 agents |
| **Frontend service** | `oaBridgeService.ts` — verbinding met oa-cli bridge (port 5001) | Geen data source voor live agents |
| **Frontend store** | `liveTreeSlice.ts` — Zustand slice voor tree state + polling | Geen state management |
| **Frontend component** | `AgentTreeView.tsx` — React Flow boom weergave | Kern-feature ontbreekt |
| **Frontend component** | `LiveAgentNode.tsx` — tree-specifieke node met status badge, taak preview, elapsed time | AgentNode.tsx is voor canvas config, niet voor live monitoring |
| **Frontend routing** | "Dashboard" tab in App.tsx | Geen navigatie naar tree view |
| **Frontend component** | `DashboardPage.tsx` — container met tree + controls | Geen page component |

---

## 3. Architectuur

### Dataflow

```
oa-cli (tmux agents)
    ↓ (file: ~/.oa/agents.json)
bridge.py (Flask, port 5001)
    ↓ (HTTP: GET /api/agents + GET /api/agents/<name>/output)
oaBridgeService.ts (fetch, polling)
    ↓ (Zustand update)
liveTreeSlice (tree state: nodes, edges, polling interval)
    ↓ (React re-render)
AgentTreeView (React Flow)
    ↓ (click event)
OutputPanel / OutputModal (agent output weergave)
```

### Component Structuur

```
App.tsx
├── DashboardPage.tsx (nieuwe tab: "Dashboard")
│   ├── DashboardToolbar.tsx (refresh, auto-poll toggle, zoom controls)
│   └── AgentTreeView.tsx (React Flow wrapper)
│       ├── LiveAgentNode.tsx (custom node: naam, model, status, elapsed)
│       └── LiveEdge.tsx (animated edge bij running, kleur per status)
│
├── services/
│   └── oaBridgeService.ts (HTTP client voor oa-cli bridge)
│
└── stores/slices/
    └── liveTreeSlice.ts (tree state, polling, node selection)
```

### State Management (liveTreeSlice)

```typescript
interface LiveTreeSlice {
  // Data
  liveAgents: LiveAgent[];           // platte lijst van bridge API
  treeNodes: Node[];                  // React Flow nodes (berekend)
  treeEdges: Edge[];                  // React Flow edges (berekend)

  // Polling
  pollingActive: boolean;
  pollingInterval: number;            // ms (default: 3000)
  lastPollAt: number;

  // Selection
  selectedAgentName: string | null;
  selectedAgentOutput: string | null;

  // Actions
  fetchLiveAgents: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  setPollingInterval: (ms: number) => void;
  selectAgent: (name: string) => void;
  fetchAgentOutput: (name: string) => Promise<void>;
}

interface LiveAgent {
  name: string;
  task: string;
  model: string;
  status: "running" | "done" | "failed" | "killed" | "timeout" | "error";
  parent: string | null;
  depth: number;
  lineage: string[];
  created_at: number;
  finished_at: number | null;
  live_output?: string;
  unread_messages: number;
}
```

---

## 4. Implementatiefases

### Fase 1: Data Laag — Bridge Service + Zustand Slice

**Doel:** Frontend kan live agent data ophalen van de oa-cli bridge.

**Taken:**

1. **Maak `oaBridgeService.ts`**
   - Pad: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/services/oaBridgeService.ts`
   - Functies:
     - `fetchLiveAgents(): Promise<LiveAgent[]>` — GET `http://localhost:5001/api/agents`
     - `fetchAgentOutput(name: string): Promise<string>` — GET `http://localhost:5001/api/agents/{name}/output`
     - `fetchAgentDetail(name: string): Promise<LiveAgent>` — GET `http://localhost:5001/api/agents/{name}`
   - Configureerbare base URL via environment variable of constante
   - Error handling: return lege array bij connectie-fout (bridge kan offline zijn)

2. **Maak `liveTreeSlice.ts`**
   - Pad: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/stores/slices/liveTreeSlice.ts`
   - State: `liveAgents`, `treeNodes`, `treeEdges`, `pollingActive`, `selectedAgentName`, `selectedAgentOutput`
   - `fetchLiveAgents()`: roept `oaBridgeService.fetchLiveAgents()` aan, converteert naar React Flow nodes/edges
   - Tree-conversie logica: parent→child edges, dagre layout (al beschikbaar via `@dagrejs` in backend node_modules — ook toevoegen aan frontend of handmatige layout op basis van depth)
   - Polling via `setInterval` met cleanup

3. **Registreer slice in `appStore.ts`**
   - Importeer en merge `createLiveTreeSlice`
   - Voeg `LiveTreeSlice` toe aan `AppState` type in `types.ts`

4. **Voeg `LiveAgent` type toe aan shared package**
   - Pad: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/shared/src/types.ts`
   - Exporteer vanuit `index.ts`

**Input:** Bestaande bridge API (`/api/agents`), bestaande `_agent_to_dict()` output
**Output:** Werkende Zustand slice die live agents ophaalt en als React Flow nodes/edges aanbiedt

**Agent assignment:** 1x builder (sonnet) — `sprint28-planner-fase1-data`

**Referentiebestanden:**
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/bridge.py` (regels 139-163, 863-888)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/stores/slices/executionSlice.ts` (als voorbeeld voor slice structuur)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/services/apiConfig.ts`
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/canvas_export.py` (tree→nodes/edges conversie)

---

### Fase 2: React Components — AgentTreeView + LiveAgentNode

**Doel:** Visuele boom van live agents als React Flow diagram.

**Afhankelijk van:** Fase 1 (slice moet werken)

**Taken:**

1. **Maak `LiveAgentNode.tsx`**
   - Pad: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/components/LiveAgentNode.tsx`
   - Read-only node (geen editable fields — dit is monitoring, niet configuratie)
   - Toont: agent naam, model badge, status indicator (kleur + icoon), elapsed time, taak preview (eerste 60 chars)
   - Status kleuren: idle=grijs, running=blauw (met pulse animatie), done=groen, failed=rood, killed=oranje
   - Click handler: selecteert agent voor output weergave
   - Unread messages badge (getal) als `unread_messages > 0`
   - Compacte styling: 200px breed, afgeronde hoeken, consistent met bestaand `AgentNode.tsx` design

2. **Maak `AgentTreeView.tsx`**
   - Pad: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/components/AgentTreeView.tsx`
   - React Flow wrapper met:
     - `nodeTypes = { liveAgent: LiveAgentNode }`
     - Dark background, Controls, MiniMap
     - `fitView` op eerste load en bij node count wijziging
     - Edge styling: animated bij running→running, groen bij done→done, rood bij error
   - Leest `treeNodes` en `treeEdges` uit liveTreeSlice
   - Geen drag-to-create of connect — pure visualisatie

3. **Maak `DashboardPage.tsx`**
   - Pad: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/pages/DashboardPage.tsx`
   - Layout: toolbar boven, AgentTreeView links (70%), agent output panel rechts (30%)
   - Toolbar: "Polling: ON/OFF" toggle, interval selector (1s/3s/5s/10s), "Refresh Now" button, agent count badge
   - Output panel: toont `selectedAgentOutput` (terminal-stijl, monospace, dark bg)
   - Empty state: "No agents running. Start agents via `oa run` to see them here."

4. **Voeg "Dashboard" tab toe aan `App.tsx`**
   - Voeg `"dashboard"` toe aan `AppTab` type in shared/types.ts
   - Voeg tab object toe in `App.tsx` tabs array (als eerste tab)
   - Render `DashboardPage` bij `activeTab === "dashboard"`

**Input:** Werkende liveTreeSlice uit Fase 1
**Output:** Zichtbare boom in "Dashboard" tab met statische data

**Agent assignment:** 1x builder (sonnet) — `sprint28-planner-fase2-components`

**Referentiebestanden:**
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/components/AgentNode.tsx` (design referentie)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/pages/CanvasPage.tsx` (React Flow setup)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/constants.ts` (STATUS_COLORS)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/App.tsx` (tab navigatie)

---

### Fase 3: Live Updates — Polling + Auto-Refresh

**Doel:** Boom updatet automatisch wanneer agents spawnen, voltooien of falen.

**Afhankelijk van:** Fase 2 (components moeten renderen)

**Taken:**

1. **Implementeer polling in `liveTreeSlice.ts`**
   - `startPolling()`: start `setInterval` met configureerbare interval (default 3000ms)
   - `stopPolling()`: clear interval
   - Auto-start polling wanneer Dashboard tab actief wordt
   - Auto-stop wanneer gebruiker naar andere tab navigeert
   - Optimalisatie: vergelijk `liveAgents` met vorige state, skip re-render als niets veranderd is (shallow compare op status + count)

2. **Auto-layout bij tree wijziging**
   - Wanneer het aantal nodes wijzigt of parent-relaties veranderen: herbereken layout
   - Layout strategie: top-down tree (root bovenaan)
   - X-positie: `depth * 280` (horizontale spreiding per niveau)
   - Y-positie: kinderen verticaal verdeeld onder parent, 120px spacing
   - Of: gebruik dagre library voor automatische tree layout (als dependency toevoegen)

3. **Edge animatie synchroniseren**
   - Edge van running parent naar running child: `animated: true`, blauwe kleur
   - Edge van completed parent naar running child: `animated: true`, blauwe kleur (data flow)
   - Edge van completed→completed: statisch, groene kleur
   - Edge naar/van error node: rode kleur

4. **Polling lifecycle in `DashboardPage.tsx`**
   - `useEffect` met `startPolling()` op mount, `stopPolling()` op unmount
   - Of: koppel aan `activeTab === "dashboard"` via store watcher

**Input:** Werkende components uit Fase 2
**Output:** Boom die elke 3 seconden automatisch ververst met actuele agent statussen

**Agent assignment:** 1x builder (sonnet) — `sprint28-planner-fase3-polling`

**Referentiebestanden:**
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/stores/slices/executionSlice.ts` (SSE/polling patterns)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/services/bridgeService.ts` (reconnect pattern)

---

### Fase 4: Interactiviteit — Click-through, Zoom, Details

**Doel:** Gebruiker kan agents inspecteren, output bekijken en de boom navigeren.

**Afhankelijk van:** Fase 3 (polling moet werken)

**Taken:**

1. **Click-to-select agent**
   - Single click op node: selecteert agent, toont output in zijpaneel
   - `fetchAgentOutput(name)` haalt live output op (running) of result (done)
   - Output panel scrollt automatisch naar onder bij running agents (tail-follow)

2. **Agent detail overlay**
   - Double-click op node: opent detail modal/drawer met:
     - Volledige taak beschrijving
     - Model + status
     - Elapsed time / duration
     - Parent + children lijst
     - Live terminal output (als running)
     - Result output (als done/failed)

3. **Zoom en navigatie**
   - MiniMap voor overzicht bij grote bomen
   - "Fit View" button in toolbar
   - "Focus Root" button: centreert op root node(s)
   - Keyboard: `Escape` deselects, `F` fits view

4. **Status-gebaseerde visuele feedback**
   - Running nodes: subtiele pulse glow animatie (CSS `@keyframes`)
   - Failed nodes: rode border + shake animatie (eenmalig)
   - Done nodes: groene checkmark overlay
   - Node border dikte: 2px normaal, 3px selected

5. **Agent count + session info in toolbar**
   - "Running: 3 | Done: 5 | Failed: 1" counters
   - Totale elapsed time van de sessie
   - "Clean" button (calls `POST /api/clean`) met bevestigingsdialoog

**Input:** Werkende live polling uit Fase 3
**Output:** Volledig interactieve live agent tree

**Agent assignment:** 1x builder (sonnet) — `sprint28-planner-fase4-interaction`

**Referentiebestanden:**
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/components/OutputPanel.tsx` (output weergave)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/packages/frontend/src/components/ErrorDecisionDialog.tsx` (modal patterns)
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/bridge.py` (regels 190-204: output endpoint)

---

## 5. Agent Assignments — Overzicht

| Fase | Agent Naam | Model | Scope | Input | Output |
|------|-----------|-------|-------|-------|--------|
| 1 | `sprint28-planner-fase1-data` | claude/sonnet | oaBridgeService.ts + liveTreeSlice.ts + types | Bestaande bridge API + store patterns | Werkende data laag |
| 2 | `sprint28-planner-fase2-components` | claude/sonnet | LiveAgentNode.tsx + AgentTreeView.tsx + DashboardPage.tsx + App.tsx tab | Fase 1 output + AgentNode.tsx referentie | Zichtbare boom |
| 3 | `sprint28-planner-fase3-polling` | claude/sonnet | Polling logica + auto-layout + edge animatie | Fase 2 output | Live updates |
| 4 | `sprint28-planner-fase4-interaction` | claude/sonnet | Click handlers + output panel + zoom + toolbar | Fase 3 output | Interactieve boom |

**Sequentie:** Fase 1 → Fase 2 → Fase 3 → Fase 4 (serieel — elke fase bouwt voort op de vorige)

**Optioneel (stretch goal):**

| Fase | Agent Naam | Model | Scope |
|------|-----------|-------|-------|
| 5 | `sprint28-planner-fase5-export` | claude/haiku | Export boom als draw.io XML of PNG screenshot |
| 6 | `sprint28-planner-fase6-bridge-tree` | claude/sonnet | `GET /api/agents/tree` endpoint in bridge.py — retourneert geneste boom i.p.v. platte lijst |

---

## 6. Technische Beslissingen

| Keuze | Besluit | Rationale |
|-------|---------|-----------|
| **Layout engine** | Handmatige top-down layout (depth * X, index * Y) | Simpeler dan dagre dependency toevoegen. Canvas_export.py doet het al zo. Dagre kan later als upgrade. |
| **Polling vs WebSocket** | Polling (3s interval) | Bridge heeft al WebSocket support maar de bestaande `/api/agents` endpoint is HTTP. Polling is simpeler en voldoende voor <100 agents. WebSocket upgrade in Sprint 29+. |
| **Bridge URL** | `http://localhost:5001` (hardcoded + env override) | oa-cli bridge draait altijd lokaal. Bestaande `apiConfig.ts` pattern volgen voor configureerbaarheid. |
| **Node component** | Nieuw `LiveAgentNode` i.p.v. hergebruik `AgentNode` | AgentNode is voor canvas configuratie (editable fields). LiveAgentNode is read-only monitoring. Andere UX. |
| **Tab plaatsing** | "Dashboard" als eerste tab (voor "Canvas") | Dashboard is de primaire monitoring view. Canvas is voor configuratie. Monitoring > configuratie in dagelijks gebruik. |

---

## 7. Afhankelijkheden

- **oa-cli bridge moet draaien** — `oa start` activeert de bridge op port 5001. Zonder bridge toont het Dashboard een "Bridge offline" melding.
- **`@xyflow/react`** — al geinstalleerd in frontend package
- **Geen nieuwe npm dependencies nodig** (tenzij dagre layout gewenst — dan `@dagrejs/dagre`)
- **Shared types** — `LiveAgent` type + `"dashboard"` toevoegen aan `AppTab`

---

## 8. Validatie Checklist

- [ ] Kan een agent Fase 1 uitvoeren met alleen dit plan + referentiebestanden? **Ja** — bestanden, paden, types en API-endpoints zijn expliciet.
- [ ] Zijn alle afhankelijkheden expliciet? **Ja** — Fase 1→2→3→4 keten is beschreven met input/output per fase.
- [ ] Zijn component-namen consistent met codebase? **Ja** — volgt patronen: `XxxPage.tsx`, `XxxNode.tsx`, `xxxSlice.ts`, `xxxService.ts`.
- [ ] Zijn paden absoluut? **Ja** — alle referentiebestanden met volledige `/mnt/c/...` paden.
- [ ] Is het uitvoerbaar zonder verdere uitleg? **Ja** — elke fase heeft concrete taken met input, output en referenties.
