# Dashboard Audit: Open-Agents React Web UI

**Audit Date:** 2026-03-11
**Scope:** `/src/components/dashboard/` (15 components) + App.tsx, stores, API client

---

## Executive Summary

The dashboard has **TWO COMPETING ARCHITECTURES** in active code:
- **DashboardTab** (production): 3-pane layout (left sidebar + center MissionControl + right AgentPanel)
- **DashboardTab2** (experimental): Alternative layout (left sidebar + center MissionControl + right TerminalPanel)

Core issue: **Significant component duplication and architectural confusion**. Multiple views render agent lists and mission control in different ways, making maintenance difficult. Data flow is consistent but UI patterns diverge unnecessarily.

---

## Component-by-Component Analysis

### 1. **MissionControl.tsx** (249 lines) — MAIN DASHBOARD VIEW
- **Purpose:** Central agent management table with metrics (running/done/failed/uptime)
- **Status:** ✅ Fully functional, complex state handling
- **Key Features:**
  - MetricTile components showing live stats (running count pulses)
  - Tabular layout with sections (Active/Completed/Failed)
  - AgentRow subcomponent for each agent with inline selection
  - Filter support (passed via props from DashboardTab)
  - No SSE, relies on parent polling
- **Issues:**
  - Single `filteredAgents` prop but uses `allAgents` as fallback — mixed responsibility
  - Heavy use of inline `useMemo` for sections (running/done/failed) — cheap computation, unnecessary
  - 5-column metric tile layout hardcoded (no responsive shrinking)
  - Uptime calculation on every render (not memoized, but cheap)

### 2. **DashboardTab.tsx** (80 lines) — PRIMARY PRODUCTION ENTRY POINT
- **Purpose:** 3-pane dashboard coordinator
- **Status:** ✅ Fully functional
- **Architecture:**
  - Left sidebar: SpawnForm + ActivityFeed + GuardianPanel + PipelinePanel
  - Center: StatsHeader + filter input + MissionControl
  - Right: AgentPanel (side detail view)
- **Flow:** Filters agents → passes to MissionControl
- **Issues:**
  - **DUPLICATE:** DashboardTab2 exists (unused alternative layout)
  - StatsHeader is inline — could be separate component for reuse
  - Filter state lives in DashboardTab but MissionControl accepts filtered agents — odd prop passing

### 3. **DashboardTab2.tsx** (27 lines) — UNUSED ALTERNATIVE LAYOUT
- **Purpose:** Alternate dashboard (appears to be experimental or work-in-progress)
- **Status:** ⚠️ **STUB/DEAD CODE** — Not exported, no routing to it
- **Architecture:**
  - Left: SpawnForm + ActivityFeed
  - Center: MissionControl (no filter!)
  - Right: TerminalPanel (8-tab terminal view)
- **Issues:**
  - **NOT CONNECTED TO ROUTING** — App.tsx has code for it but Sidebar doesn't link to it
  - No filter input like DashboardTab
  - TerminalPanel expects selectedAgent but MissionControl may not propagate it correctly
  - Unclear intent — archive or revive?

### 4. **AgentPanel.tsx** (343 lines) — RIGHT SIDEBAR DETAIL VIEW
- **Purpose:** Rich detail panel for selected agent (info/messages/output tabs)
- **Status:** ✅ Fully functional, complex
- **Key Features:**
  - Three tabs: info (metadata), messages (inter-agent chat), output (live streamed)
  - SSE streaming for live output + polling fallback
  - Breadcrumb ancestry chain (parent hierarchy)
  - Copy output button, send message box
  - Kill button for running agents
- **Data Flow:** Reads selectedAgent from store → fetches detail + messages via API
- **Issues:**
  - Duplicates tab/output rendering logic with AgentDetail.tsx (separate component exists!)
  - `statusBadgeStyle` duplicated from other components (3+ implementations across codebase)
  - No memoization on expensive renders (detail header, ancestor chain)
  - Unused `streamOutput` state during SSE (line 28) — SSE callback doesn't use it, polling does

### 5. **AgentDetail.tsx** (170 lines) — DUPLICATE RIGHT PANEL COMPONENT
- **Purpose:** Alternative detail view for agents (session/output/info tabs)
- **Status:** ✅ Functional but **NEVER USED IN ROUTING**
- **Key Features:**
  - Three tabs: session (live terminal), output (final result), info (metadata)
  - SSE stream with reconnection tracking (shows retry count UI)
  - Terminal component for session view
  - Metadata grid in info tab
- **Data Flow:** Via store selectedAgent + polling
- **Issues:**
  - **DUPLICATE OF AgentPanel** — Nearly identical purpose, different tab names
  - AgentPanel.tsx exists in same folder but AgentDetail is imported in a different tab view
  - Both have live_output + result handling
  - Terminal component used here but not in AgentPanel
  - Why two variants? **Merge needed.**

### 6. **LiveCanvas.tsx** (424 lines) — REACT FLOW GRAPH VISUALIZATION
- **Purpose:** Hierarchical agent tree visualization using ReactFlow
- **Status:** ✅ Fully functional, sophisticated
- **Key Features:**
  - Auto-layout agents in tree structure (parent-child hierarchy)
  - Persistent drag positions (manualPositions map survives re-renders)
  - Message edges between agents (dashed orange arrows, cached max 500)
  - Node selection via click, breadcrumb navigation
  - MinMap + Controls for graph navigation
- **Performance:**
  - Message cache capped at 500 to prevent memory bloat (explicit PERF comment)
  - Uses applyNodeChanges from @xyflow/react for efficient DOM updates
  - useCallback for node change handlers
- **Issues:**
  - **NOT USED IN ACTIVE DASHBOARDS** — Neither DashboardTab nor DashboardTab2 includes it
  - Overkill for current use case (same data in MissionControl table format)
  - Fetches messages every 3s for all agents — expensive polling
  - Message edge labels truncated (27 chars) — fine, but no hover tooltip
  - Status colors hardcoded (not using theme vars in `statusBorderColor`)

### 7. **KanbanBoard.tsx** (134 lines) — KANBAN VIEW (DEAD CODE)
- **Purpose:** 3-column Kanban layout (Running/Done/Failed)
- **Status:** ⚠️ **FUNCTIONAL BUT UNUSED**
- **Features:** Three columns, AgentCard subcomponent
- **Issues:**
  - **NOT INCLUDED IN ANY DASHBOARD** — Standalone component, no routing
  - Uses AgentCard (smaller card UI) instead of AgentRow (table UI)
  - Duplicates column logic seen in MissionControl (running/done/failed filtering)
  - Empty state message helpful but component never shown

### 8. **ActivityFeed.tsx** (86 lines) — ACTIVITY LOG SIDEBAR PANEL
- **Purpose:** Left sidebar panel showing recent agent events (last 20)
- **Status:** ✅ Fully functional, lightweight
- **Features:**
  - Event icons based on color/type (Zap for spawn, Check for done, X for failed, etc.)
  - Time display in GB format (HH:MM)
  - Scrollable list
- **Issues:**
  - Helper function `eventMeta` uses color strings to infer event type — fragile
  - No event filtering or search
  - Hardcoded 20-item limit
  - Color-based type detection couples UI to store implementation

### 9. **AgentList.tsx** (152 lines) — AGENT HIERARCHY SIDEBAR
- **Purpose:** Searchable agent tree list (left sidebar in missing use case)
- **Status:** ✅ Fully functional
- **Features:**
  - Hierarchical display with depth indent (└ symbols)
  - Search by name or task
  - Unread message badge (yellow counter)
  - Status badge per agent
  - SpawnForm embedded at bottom
- **Issues:**
  - **NEVER IMPORTED OR USED** — Standalone component, no routing/parent
  - Renders hierarchy via `getHierarchy()` store selector
  - Indentation via padding-left calc (fine but fragile with depth > 5)
  - Search filters on name + task (good, but no saved filters)

### 10. **AgentCard.tsx** (115 lines) — COMPACT AGENT CARD UI
- **Purpose:** Small card for agent display (KanbanBoard, AgentList)
- **Status:** ✅ Fully functional, reusable
- **Features:**
  - Memo wrapper to prevent re-renders
  - Pulsing status dot for running agents
  - Model badge with color
  - Task preview (2 lines max)
  - Parent indicator
  - Unread message counter
- **Quality:** Well-designed, simple component
- **Issue:** Only used in dead/unused components (KanbanBoard, AgentList)

### 11. **SpawnForm.tsx** (301 lines) — AGENT SPAWN DIALOG
- **Purpose:** Form to spawn new agents with templates
- **Status:** ✅ Fully functional, feature-complete
- **Features:**
  - 5 templates (Custom, Researcher, Developer, Reviewer, Analyzer)
  - Model selection (Claude haiku/sonnet/opus + Ollama dropdown)
  - Advanced: name override, parent selection
  - Feedback messages (success/error with auto-dismiss)
- **Data Flow:** Calls store `spawnAgent()` method
- **Quality:** Good UX with keyboard shortcuts (Ctrl+Enter), template prefilling
- **Issues:**
  - Prefill system via UIStore (prefilledTask, prefilledModel) — works but indirect
  - No validation on task length
  - Ollama toggle is separate button (good UX but might confuse)

### 12. **PipelinePanel.tsx** (331 lines) — PIPELINE ORCHESTRATION UI
- **Purpose:** Spawn multi-stage pipelines (planner → workers → combiner)
- **Status:** ✅ Functional, specialized
- **Features:**
  - Phase detection via regex (name contains "plan"/"work"/"combin")
  - Visual flow diagram with ChevronRight separators
  - Agent list with status badges
  - Form to start new pipeline
- **Issues:**
  - Phase detection is fragile (regex on agent names)
  - `[PIPELINE]` prefix added to task — couples UI to bridge expectations
  - Polling every 2s from `/api/pipeline` endpoint
  - No error handling for API failures (silently catches)
  - Model hardcoded to "claude/sonnet" + form for override

### 13. **TerminalPanel.tsx** (201 lines) — MULTI-TAB TERMINAL VIEW
- **Purpose:** Right-side terminal view with tabs for multiple agents
- **Status:** ✅ Fully functional, focused
- **Features:**
  - Max 8 tabs (LRU eviction)
  - Auto-open new tab when agent selected
  - Live SSE stream + polling fallback
  - Status bar showing model + duration
  - Task preview at bottom
- **Issues:**
  - Hard-coded max 8 tabs — why not 4 or 12? No config
  - Not in production DashboardTab (only in DashboardTab2 which is unused)
  - Auto-scroll logic in useEffect but no scroll-lock button
  - outputRef ref never cleaned up (not an issue since it's a div, but fragile pattern)

### 14. **GuardianPanel.tsx** (122 lines) — PERIODIC TASK TRIGGER UI
- **Purpose:** Run "guardian" agents (automated monitors/checks)
- **Status:** ✅ Fully functional
- **Features:**
  - Collapsible panel
  - Fetch from `/api/guardians`
  - Trigger button per guardian with state (idle/loading/success/error)
  - Last triggered timestamp
- **Issues:**
  - Stateless design — fetched data is ephemeral, no persistence
  - No error logging (catch silently on fetch fail)
  - Only shown if guardians.length > 0 (good, hides UI when empty)
  - Button states use inline style objects (anti-pattern for complex styles)

### 15. **SystemHealth.tsx** (139 lines) — STATS SIDEBAR PANEL
- **Purpose:** Summary stats panel (running count, model distribution, success rate)
- **Status:** ✅ Fully functional
- **Features:**
  - Active agents counter
  - Model distribution bar chart
  - Success rate calculation (done / (done + failed))
  - Uptime calculation
- **Issues:**
  - Success rate calculation assumes done + failed > 0 — may be zero during startup
  - Session tokens hardcoded to "0" (line 111) — dead field
  - Color logic for success bar not theme-aware (hardcoded thresholds: 80%, 50%)
  - Model distribution is O(N) scan, not pre-calculated in store

---

## Specific Questions Answered

### Q1: Which dashboard view is the "main" view users see?
**Answer:** **DashboardTab.tsx** is the only routing entry point (checked in App.tsx):
```tsx
{activeMainTab === 'dashboard' && <DashboardTab />}
```
DashboardTab2 is NOT routable from Sidebar navigation → **dead code**.

### Q2: Are MissionControl and DashboardTab duplicates?
**Answer:** **No, but confusing.**
- DashboardTab is the CONTAINER (routes to it, manages filter state)
- MissionControl is the VIEW COMPONENT (renders the table/metrics)
- DashboardTab wraps MissionControl with filter input + layout

However, **AgentPanel and AgentDetail ARE near-duplicates** (both show agent details in right sidebar).

### Q3: What does LiveCanvas do and is it useful?
**Answer:** LiveCanvas is a **sophisticated React Flow visualization** showing agent hierarchy as an interactive graph with message edges. It's **NOT USED** in any active dashboard, making it **dead code**. If the team wants visual agent hierarchy, it's useful; otherwise, it's overhead.

### Q4: How does agent selection work (consistency check)?
**Answer:** ✅ **Consistent via Zustand store:**
- All components read `selectedAgent` from `useAgentStore((s) => s.selectedAgent)`
- Selection set via `selectAgent(name)` action
- Flow: MissionControl/AgentList click → store update → AgentPanel/LiveCanvas re-render

### Q5: Are there TypeScript errors?
**Answer:** ✅ **NO obvious type errors found**, but potential issues:
- `statusBadgeStyle()` function in AgentPanel (line 7) returns Record<string, string> but uses it as CSSProperties — should be explicit
- LiveCanvas `AgentNodeComponent` accesses `data.agent as Agent` without validation
- No explicit typing on some state objects (outputs: Record<string, string> is fine, but implicit in TerminalPanel)

---

## Data Flow Analysis

### Agent Selection Flow:
```
User clicks agent row in MissionControl
  ↓ (onSelect callback)
Store.selectAgent(name)  [uiStore or agentStore]
  ↓ (store update triggers re-renders)
AgentPanel reads selectedAgent, fetches detail via API
LiveCanvas updates node highlighting
```

### Agent Data Sources:
- **MissionControl, AgentCard, AgentList:** Read from `useAgentStore.agents` (updated via polling)
- **AgentPanel, AgentDetail:** Fetch detail + messages on demand via API client
- **ActivityFeed:** Reads from `useAgentStore.activityLog` (pushed by API)
- **GuardianPanel:** Direct fetch from `/api/guardians`
- **PipelinePanel:** Direct fetch from `/api/pipeline`
- **TerminalPanel:** SSE stream + polling for detail

**Architecture:** Store-first (Zustand), supplemented by direct API calls. Polling interval 2s (aggressive).

---

## Dead Code Identified

| Component | Lines | Status | Reason |
|-----------|-------|--------|--------|
| **AgentList.tsx** | 152 | Unused | No import in routing, no parent |
| **KanbanBoard.tsx** | 134 | Unused | No import in routing, no parent |
| **AgentDetail.tsx** | 170 | Partial | Imported but never rendered |
| **DashboardTab2.tsx** | 27 | Unused | Routes exist in App.tsx but not in Sidebar navigation |
| **LiveCanvas.tsx** | 424 | Unused | Sophisticated but not imported anywhere |

---

## Priority Fix List

### 🔴 **CRITICAL (High Impact)**

1. **Merge AgentPanel + AgentDetail**
   - Both render agent details (info/messages/output)
   - Consolidate into single component with mode prop
   - **Impact:** Reduce code duplication, fewer bugs, easier maintenance
   - **Effort:** 2-3 hours
   - **Files:** Delete AgentDetail.tsx, enhance AgentPanel.tsx

2. **Remove or Integrate DashboardTab2**
   - Currently unreachable dead code
   - Decision: Is TerminalPanel-based view needed? If yes, wire to Sidebar; if no, delete both
   - **Impact:** Clarity on what's actually in use
   - **Effort:** 1 hour (decision + cleanup)
   - **Files:** DashboardTab2.tsx, TerminalPanel.tsx, Sidebar.tsx

3. **Consolidate StatusBadge Styling**
   - `statusBadgeStyle()` defined in AgentPanel, AgentList, MissionControl (3+ times)
   - Extract to shared utility in `stores/` or `utils/`
   - **Impact:** Single source of truth, easier theme changes
   - **Effort:** 1 hour
   - **Files:** Create `/utils/statusColors.ts`, update imports

### 🟡 **IMPORTANT (Medium Impact)**

4. **Remove Unused Components**
   - Delete or archive: AgentList.tsx, KanbanBoard.tsx, LiveCanvas.tsx
   - If keeping LiveCanvas: add routing option to Sidebar
   - **Impact:** Reduce codebase size by ~750 lines
   - **Effort:** 30 min
   - **Files:** Delete unused, update imports

5. **Reduce Polling Frequency**
   - Currently 2s polling (App.tsx, AgentDetail, TerminalPanel, PipelinePanel)
   - Should be 3-5s or configurable
   - **Impact:** Reduced server load
   - **Effort:** 30 min
   - **Files:** App.tsx, all polling intervals

### 🟢 **NICE-TO-HAVE (Low Impact)**

6. **Memoize StatsHeader + MetricTile**
   - Currently re-renders on every DashboardTab render
   - Wrap in memo
   - **Impact:** Smoother UI during agent updates
   - **Effort:** 15 min

7. **Extract MissionControl MetricTile to Separate Component**
   - Currently inline, used only once
   - Move to shared components
   - **Impact:** Reusable for other dashboards (e.g., DashboardTab2)
   - **Effort:** 15 min

---

## Architecture Observations

### Strengths ✅
- **Zustand store** is clean, reactive, no prop drilling for agent list
- **Consistent selection model** across all views
- **SSE + polling fallback** handles real-time output correctly
- **Error boundaries** wrap each tab (App.tsx)
- **Theme system** uses CSS variables, clean visual consistency

### Weaknesses ❌
- **Multiple dead code paths** (DashboardTab2, LiveCanvas, AgentList, KanbanBoard)
- **No shared styling utilities** (status colors, badge styles duplicated 3+ times)
- **Tight coupling to API response shapes** (no validation, assumes fields exist)
- **No error handling in fetch calls** (GuardianPanel, PipelinePanel catch silently)
- **Aggressive polling** (2s intervals) instead of WebSocket or configurable SSE
- **No responsive design** — fixed widths (e.g., 260px sidebar, 320px panel) break on smaller screens

---

## Codebase Size Summary

| Category | Count | Lines | Avg |
|----------|-------|-------|-----|
| **Active Components** | 8 | 1,520 | 190 |
| **Dead/Unused Components** | 5 | 907 | 181 |
| **Utility Components** | 2 | 217 | 108 |
| **Total Dashboard Folder** | 15 | 2,624 | 175 |

**Dead Code Ratio:** 34% (907 / 2,624 lines)

---

## Recommendations for Next Sprint

1. **Week 1:** Merge AgentPanel + AgentDetail, consolidate status colors
2. **Week 2:** Decide on DashboardTab2 fate; remove or route it
3. **Week 3:** Delete unused components (AgentList, KanbanBoard, or add to feature backlog)
4. **Week 4:** Reduce polling to 3s, add optional WebSocket support

