# Tech Stack Analysis — Open-Agents Web UI

> Geanalyseerd op 2026-03-08 | Scope: web app stack capabilities & gaps

---

## 1. Huidige Dependencies

### Runtime dependencies

| Package | Versie | Gebruik |
|---------|--------|---------|
| `react` + `react-dom` | ^19.2.4 | UI framework (concurrent mode, Suspense) |
| `zustand` | ^5.0.0 | Global state management |
| `@xyflow/react` | ^12.6.0 | Agent flow/graph visualisatie |
| `@radix-ui/react-slot` | ^1.1.2 | Composition primitive voor componenten |
| `@radix-ui/react-tabs` | ^1.1.2 | Toegankelijke tabs |
| `@radix-ui/react-dialog` | ^1.1.4 | Modal dialogs |
| `@radix-ui/react-tooltip` | ^1.1.6 | Tooltips |
| `lucide-react` | ^0.511.0 | Icon set (500+ icons) |
| `class-variance-authority` | ^0.7.1 | Variant-gebaseerde class utilities |
| `clsx` | ^2.1.1 | Conditional classnames |
| `tailwind-merge` | ^2.6.0 | Conflicterende Tailwind classes mergen |
| `@tauri-apps/api` | ^2.5.0 | Tauri core API (IPC, events) |
| `@tauri-apps/plugin-shell` | ^2.2.0 | Shell commands vanuit frontend |
| `@tauri-apps/plugin-process` | ^2.2.0 | Process management |
| `@tauri-apps/plugin-fs` | ^2.2.0 | Filesystem toegang |
| `@tauri-apps/plugin-dialog` | ^2.2.0 | Native file dialogs |
| `@tauri-apps/plugin-os` | ^2.2.0 | OS-informatie |

### Dev dependencies

| Package | Versie | Gebruik |
|---------|--------|---------|
| `vite` | ^7.3.1 | Build tool + dev server |
| `@vitejs/plugin-react` | ^5.1.4 | React Fast Refresh + JSX |
| `tailwindcss` | ^4.1.0 | Utility-first CSS (v4 met Vite plugin) |
| `@tailwindcss/vite` | ^4.1.0 | Tailwind v4 Vite integratie |
| `typescript` | ^5.9.3 | Type safety |
| `@tauri-apps/cli` | ^2.5.0 | Tauri build toolchain |

---

## 2. Sterktes van de huidige stack

### Framework maturity
- **React 19** met concurrent features beschikbaar; geen legacy class components
- **Zustand 5** is lightweight en heeft geen boilerplate; goed voor kleine-tot-middelgrote apps
- **@xyflow/react 12.6** is de meest recente stabiele versie; ondersteunt subflows, edge groups, custom nodes/edges, minimap, controls
- **Tauri 2** geeft native desktop integratie (filesystem, shell, native dialogs) zonder Electron overhead

### Build tooling
- **Vite 7** met esbuild minification is extreem snel (HMR < 50ms)
- **Tailwind v4** met Vite plugin: geen PostCSS configuratie nodig, snellere builds
- **TypeScript 5.9** met strenge typing; `@` alias geconfigureerd in vite.config.ts

### Real-time
- `EventSource` / SSE al geïmplementeerd in `streamAgentOutput` (client.ts:192) — geen extra library nodig voor streaming
- Dual-mode: werkt zowel in browser (via Vite proxy `/api → :5174`) als in Tauri (directe verbinding met `http://127.0.0.1:5174`)

### Radix UI
- Accessibility-first primitives; keyboard navigatie en ARIA gratis
- Geen opinionated styling → makkelijk te themen via Tailwind

---

## 3. Real-time: Polling vs SSE

### Huidige situatie
**App.tsx:28** — Agent list wordt gepolld via `setInterval(fetchAgents, 2000)` elke 2 seconden.

**client.ts:192-203** — Agent output wordt gestreamd via `EventSource`:
```ts
export function streamAgentOutput(name: string, onData: (output: string, status: string) => void): () => void {
  const es = new EventSource(`${API}/agents/${encodeURIComponent(name)}/stream`);
  es.onmessage = (event) => { ... };
  return () => es.close();
}
```

### Analyse
| Aspect | Polling (agents list) | SSE (agent output) |
|--------|-----------------------|--------------------|
| Latency | ~2s gemiddeld | <100ms |
| Overhead | HTTP request elke 2s | 1 open verbinding |
| Reconnect | Automatisch | Browser reconnect ingebouwd |
| Geschikt voor | Status wijzigingen | Log streaming |

**Aanbeveling**: Polling voor agent list is acceptabel (status wijzigt niet 100x/s). SSE voor output is de juiste keuze. **Overweeg** een SSE endpoint voor de volledige agent list als schaalbaarheid later een issue wordt.

---

## 4. State Management: Zustand Stores

### AgentStore (agentStore.ts)
**Goed opgezet:**
- Activity log met max 50 events (slice voorkomt memory leak)
- `prevAgentStatuses` diff-algoritme detecteert status changes
- Computed getters: `getRunning()`, `getDone()`, `getFailed()`, `getHierarchy()`, `getModelDistribution()`
- `initialLoadDone` guard voorkomt false activity events bij eerste load

**Verbeterpunten:**
- Geen error state in de store — fouten worden silently gecatcht (`catch {}`)
- `fetchDetail` en `fetchAgents` zijn gescheiden — geen coördinatie bij concurrent calls
- Messaging, teams, tasks, guardians hebben **geen eigen store** — enkel API calls in client.ts, state wordt lokaal in componenten bijgehouden (fragile)

### uiStore (geïmporteerd in App.tsx, niet geanalyseerd)
- Bevat `activeMainTab` en `themeId` — UI-only state
- Architectuurpatroon is correct (UI state gescheiden van domain state)

### Ontbrekende stores
- `messagingStore` — inbox, ongelezen tellers, polling
- `templatesStore` — gecachte templates
- `pipelineStore` — pipeline status/stappen

---

## 5. ReactFlow: Huidig gebruik vs Mogelijkheden

### @xyflow/react 12.6 features
| Feature | Status |
|---------|--------|
| Custom nodes | Waarschijnlijk in gebruik (agent nodes) |
| Custom edges | Mogelijk nog standaard |
| Subflows / groups | **Niet in gebruik** (parents zichtbaar in data, maar geen visuele groepering) |
| Minimap | Onbekend |
| Edge labels | Onbekend |
| Animated edges | Onbekend |
| `useNodesState` / `useEdgesState` | Aanbevolen pattern |

### Mogelijkheden die benut kunnen worden
1. **NodeGroup / SubFlow**: Toon parent-child hiërarchie als ingeklapte subgraph — `buildHierarchy()` in agentStore levert al de data
2. **Custom edge types**: Animeer actieve verbindingen (running agents) vs statische (done)
3. **Handles per poort**: Input/output handles voor agent communicatie visualisatie
4. **ReactFlow controls**: Zoom, fit-view, minimap — stuk beter dan handmatige implementatie
5. **`useReactFlow()` hook**: Programmatisch navigeren naar geselecteerde agent

---

## 6. Aanbevolen packages toe te voegen

### 1. Terminal emulator in browser
```bash
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
```
- **@xterm/xterm** `^5.5.0` — officiële xterm.js (hernoemd van `xterm`)
- **@xterm/addon-fit** — past terminal aan container grootte aan
- **@xterm/addon-web-links** — klikbare URLs in output
- Alternatief: `@codemirror/view` voor read-only log viewer (lichter, geen pseudo-TTY)

### 2. Real-time log streaming
SSE is al aanwezig. Aanvulling nodig voor **buffer management** in terminal:
```bash
npm install @xterm/xterm  # zie boven
```
Geen extra library nodig — `EventSource` + xterm.js `terminal.write()` is de complete oplossing.

### 3. Keyboard shortcut management
```bash
npm install hotkeys-js
# of
npm install @github/hotkey
# of (meest modern)
npm install react-hotkeys-hook
```
**Aanbeveling**: `react-hotkeys-hook ^4.5.0`
- React hooks API: `useHotkeys('ctrl+k', handler)`
- Scope-aware (werkt niet in inputs tenzij gewenst)
- TypeScript-native

### 4. Notifications / Toasts
```bash
npm install sonner
```
- **sonner** `^1.7.0` — meest moderne toast library voor React
- Minimaal: 2.4KB gzipped
- Promise-based toasts (spawn → loading → done/error)
- Alternatief: `@radix-ui/react-toast` (al in Radix ecosysteem, meer boilerplate)

### 5. Draggable panels / resizable layout
```bash
npm install react-resizable-panels
```
- **react-resizable-panels** `^2.1.7` — door shadcn/ui gebruikt, goed getest
- Horizontale en verticale splits
- Persistente panel sizes via `localStorage`
- Alternatief: `allotment ^1.20.0` (VS Code-stijl, iets zwaarder)

---

## 7. Technische Schuld & Risico's

### Kritiek
| Issue | Locatie | Risico |
|-------|---------|--------|
| Silent error swallowing | agentStore.ts:171, 183 | Fouten zijn onzichtbaar voor gebruiker |
| Geen error boundaries | App.tsx | Render errors crashen volledige app |
| `unknown` return types | client.ts (teams, tasks, etc.) | Type safety verloren, runtime errors mogelijk |

### Matig
| Issue | Locatie | Risico |
|-------|---------|--------|
| Polling voor agent list | App.tsx:28 | Bij veel agents (>50): overkill requests |
| Geen retry/exponential backoff | client.ts | Network flaps → silent failure |
| Messaging zonder eigen store | client.ts | State verloren bij tab switch |
| SSE zonder reconnect handler | client.ts:192 | Langlopende streams kunnen doodlopen |

### Laag
| Issue | Locatie | Risico |
|-------|---------|--------|
| Inline `<style>` in App.tsx | App.tsx:38-57 | Moeilijk te overschrijven/themen |
| `localStorage` direct in component | App.tsx:16 | Niet testbaar, moeilijk te mocken |
| Tauri detection via `__TAURI_INTERNALS__` | client.ts:3 | Fragile duck typing |

### Technische schuld prioriteit
1. **Hoog**: Voeg error boundaries toe + toon errors in UI
2. **Hoog**: Typ de `unknown` API returns in client.ts
3. **Medium**: SSE reconnect logica toevoegen (auto-reconnect na 5s bij close)
4. **Medium**: `messagingStore` en `templatesStore` aanmaken
5. **Laag**: Overweeg SSE voor agent list polling vervangen

---

## 8. Snelle winsten (direct implementeerbaar)

| Feature | Package | Effort |
|---------|---------|--------|
| Toast notificaties | `sonner` | 1-2u |
| Keyboard shortcuts | `react-hotkeys-hook` | 1-2u |
| Resizable sidebar/panels | `react-resizable-panels` | 2-4u |
| Terminal output viewer | `@xterm/xterm` + addon-fit | 4-6u |
| Error boundaries | Ingebouwd React | 1u |
| SSE reconnect | Eigen util | 1u |

---

*Analyse: research-techstack agent | Stack versie: package.json v0.2.0*
