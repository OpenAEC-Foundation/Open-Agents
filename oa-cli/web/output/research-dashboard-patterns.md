# Agent Dashboard Design Patterns
> Research: Modern card-based layouts for AI agent orchestration UIs
> Date: 2026-03-08 | Theme: #0a0a0a / Montserrat / #ff6b00

---

## 1. Pattern Analysis: Reference Products

### Linear — Information Density Champion
Linear's board layout is the gold standard for developer task cards. Key patterns:
- **Card anatomy**: icon + priority dot + title (bold, truncated) + assignee avatar + label pill + due date
- **Status columns**: color-coded headers (grey=backlog, blue=in progress, green=done, red=cancelled)
- **Density**: 4–6 fields per card, 56–72px card height in compact mode, 80–96px in comfortable
- **Typography**: Inter Display for titles, system-sans for metadata; bold title contrasts with muted meta
- **Hover state**: subtle border highlight + action row reveals (assign, label, priority)
- **Drag behavior**: card lifts with shadow + slight rotation (3–4°), column highlights on hover

### Vercel Dashboard — Status Communication
Vercel excels at communicating live deployment state at a glance:
- **Status in favicon**: browser tab icon changes per state (queued=grey, building=animated, error=red, ready=green)
- **Card anatomy**: project name + screenshot thumbnail + branch + commit hash + author + relative time + status pill
- **Status pills**: rounded badge, filled bg for active states, outline for inactive
  - `READY` → green fill `#00c853`
  - `BUILDING` → amber fill `#f59e0b` + pulsing dot
  - `ERROR` → red fill `#ef4444`
  - `QUEUED` → grey outline
- **Real-time**: SWR polling, no full-page refresh — individual card fields update in place
- **Visual preview**: 160×90px screenshot thumbnail — gives spatial memory of project

### Railway.app — Rich State Machine
Railway maps 8 deployment states to distinct visual representations:
- **States**: Initializing → Building → Deploying → Active → Completed → Failed → Crashed → Removed
- **Color coding**:
  - Active = solid green dot
  - Building = animated spinner ring (stroke-dashoffset animation)
  - Failed/Crashed = red icon (X vs !)
  - Completed = grey (terminal state)
  - Removed = dim/opacity-50
- **Canvas layout**: services as nodes on a spatial canvas — interconnected via lines showing dependencies
- **Contextual actions**: right-click or kebab (⋮) reveals state-appropriate actions only:
  - Running → View Logs, Restart, Kill
  - Failed → Redeploy, View Logs, Remove
- **Log streaming**: click card → right panel slides in with live log tail (monospace, auto-scroll)

### Replicate — Async Job Cards
Replicate handles long-running AI model predictions as job cards:
- **Status lifecycle**: `starting` → `processing` → `succeeded` | `failed`
- **Card shows**: model name, version hash, input preview (truncated), elapsed time (live counter), output thumbnail/preview
- **Streaming**: SSE (Server-Sent Events) push output tokens/images into card as they arrive
- **Progress**: for image models, shows % complete with thin progress bar at card bottom
- **Batch view**: list of run cards sorted by recency, newest at top
- **Kill affordance**: `×` button visible on hover for active runs only

---

## 2. Recommended Card Anatomy for oa-cli Agents

### Card Layout (320px wide, min 88px height)

```
┌─────────────────────────────────────────┐
│ ● RUNNING          claude/sonnet    ⋮   │  ← row 1: status + model + menu (12px)
│                                         │
│  research-ui                            │  ← row 2: agent name (16px bold)
│  "Research Modern UI patterns for..."   │  ← row 3: task preview truncated (12px muted)
│                                         │
│  ▶ 2m 14s          parent: orchestrator │  ← row 4: duration + parent (11px dim)
└─────────────────────────────────────────┘
```

### Field Specifications

| Field | Size | Color | Notes |
|-------|------|-------|-------|
| Status dot | 8px circle | See palette | Pulsing if RUNNING |
| Status text | 11px caps | Muted | RUNNING / DONE / FAILED |
| Model badge | 10px pill | #1a1a1a border | `claude/sonnet` monospace |
| Agent name | 16px bold | #f0f0f0 | Montserrat SemiBold, max 1 line |
| Task preview | 12px | #888 | max 2 lines, ellipsis, italic |
| Duration | 11px | #666 | Live counter if running |
| Parent | 11px | #555 | `↳ parent-name` format |

### Status Color Palette

| Status | Dot color | Pill bg | Behavior |
|--------|-----------|---------|----------|
| `running` | `#ff6b00` | `rgba(255,107,0,0.15)` | Pulse animation 1.5s ease |
| `done` | `#22c55e` | `rgba(34,197,94,0.12)` | Static |
| `failed` | `#ef4444` | `rgba(239,68,68,0.12)` | Static + shake on appear |
| `queued` | `#555` | `rgba(80,80,80,0.2)` | Static |
| `crashed` | `#f97316` | `rgba(249,115,22,0.12)` | Blinking 2s |

---

## 3. Live Card Behavior

### Pulse Animation (running state)
```css
@keyframes agent-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.5); }
  70%  { box-shadow: 0 0 0 6px rgba(255, 107, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0); }
}

.status-dot.running {
  background: #ff6b00;
  animation: agent-pulse 1.5s ease-in-out infinite;
}
```

### Live Duration Counter
- Update every second via `setInterval`
- Format: `Xs`, `Xm Xs`, `Xh Xm`
- Color shifts: <30s = normal, 30s–5m = amber, >5m = dim orange (warn on long runs)

### Streaming Output Preview
When expanded (or hover on desktop):
- Show last 2–3 lines of stdout in monospace 10px
- Background: `#111` (slightly lighter than card bg)
- Auto-scroll paused on mouse-hover, resumes on mouse-leave
- Fade-in new lines with `opacity: 0 → 1` over 200ms

### Card Entry/Exit Animations
- **New card**: slide-in from top + fade, 250ms ease-out
- **Status change**: dot recolor + pill text crossfade, 300ms
- **Done/Failed**: card dims slightly (opacity: 0.85) after 3s delay
- **Removed card**: slide-out + shrink height to 0, 300ms ease-in

---

## 4. Layout: Kanban vs List vs Mixed

### Recommendation: Adaptive Layout

**Default: Kanban columns** (Running | Done | Failed)
- 3 columns, each scrollable independently
- Column header: status name + count badge + total duration sum
- Max 4 cards visible before scroll

**Toggle: Compact list** (all agents in one column)
- 48px per card (name + status dot + duration only)
- Good for monitoring many agents at once
- Shortcut: `L` key

**Detail panel**: click any card → right panel slides in (400px)
- Full task text
- Full log stream
- Timing breakdown
- Actions: kill, restart, copy task

### Column Layout (Kanban)
```
[RUNNING (3)]     [DONE (12)]       [FAILED (1)]
 ─────────────     ─────────────     ─────────────
 ┌──────────┐      ┌──────────┐      ┌──────────┐
 │ agent-a  │      │ agent-c  │      │ agent-f  │
 └──────────┘      └──────────┘      └──────────┘
 ┌──────────┐      ┌──────────┐
 │ agent-b  │      │ agent-d  │
 └──────────┘      └──────────┘
```

---

## 5. Card Interactions

### Hover
- Border: `1px solid rgba(255,107,0,0.3)` (orange glow)
- Reveal: kill `×` button (top-right, 20px, `#555` → `#ef4444` on hover)
- Reveal: expand `⌄` chevron (bottom-right)
- Cursor: `pointer`

### Click
- Open detail panel (slide from right, 400px)
- Or expand card inline (toggle, adds log preview block)

### Kebab menu `⋮`
State-aware actions:
- **Running**: View Logs, Kill, Copy Task, Copy ID
- **Done**: View Output, Re-run, Copy Task, Delete
- **Failed**: View Logs, Retry, Copy Task, Delete

### Drag (kanban mode)
- Drag to reorder within column (priority/visual grouping only)
- Cards lift: `translateY(-2px)` + `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`
- Drop zone: dashed orange border `rgba(255,107,0,0.4)`

---

## 6. Visual Design Specifications

### Card Base
```css
.agent-card {
  background: #111;                           /* 1 step up from #0a0a0a */
  border: 1px solid #222;
  border-radius: 8px;
  padding: 12px 14px;
  font-family: 'Montserrat', sans-serif;
  transition: border-color 150ms, box-shadow 150ms;
}
.agent-card:hover {
  border-color: rgba(255, 107, 0, 0.35);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
```

### Typography Scale
| Role | Size | Weight | Color |
|------|------|--------|-------|
| Agent name | 15px | 600 | `#f0f0f0` |
| Task text | 12px | 400 | `#888` |
| Meta (model, parent) | 11px | 400 | `#555` |
| Status label | 10px | 700 | Status color |
| Duration | 12px | 500 | `#777` → amber if >5m |

### Column Headers
```css
.column-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #555;
  padding: 8px 0 12px;
}
.column-header .count {
  background: #1a1a1a;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 10px;
  color: #666;
  margin-left: 6px;
}
```

---

## 7. Key Design Rationale

| Decision | Rationale |
|----------|-----------|
| Orange accent for running | Matches brand (#ff6b00), high-energy = active state |
| Pulse on running only | Prevents visual fatigue; done/failed are terminal states |
| 3-column kanban default | Maps to natural mental model: active / finished / errored |
| Task preview (2 lines) | Lets user scan what each agent does without opening detail |
| Model as monospace pill | Code-adjacent aesthetics signal technical context |
| Duration counter live | Core signal for orchestration — "is this stuck?" |
| Right-panel for detail | Preserves spatial context of kanban while showing full info |
| Contextual kebab actions | Railway pattern — prevents confusion (can't "restart" a running job) |
| Slide-in card animation | Makes new agent spawns visible without jarring page changes |

---

## 8. Anti-Patterns to Avoid

- **No progress bars for unknown duration**: use elapsed time instead — fake progress = distrust
- **No full-page refresh**: use SWR/polling to update card fields in place (Vercel pattern)
- **No status toasts on every update**: too noisy for orchestration with many agents
- **No color alone for status**: always pair color with icon or label (accessibility)
- **No drag-to-different-column**: agents can't be manually moved to Done — status is system-driven
