# Performance Scan — Open-Agents Codebase
**Date:** 2026-03-08
**Scanned paths:**
- `oa-cli/src/open_agents/`
- `oa-cli/web/src/`

---

## FRONTEND (React/TypeScript)

### [HIGH] web/src/App.tsx:19
**Bottleneck:** `setInterval(fetchAgents, 2000)` polls the entire agent list every 2 seconds globally
**Impact:** Full re-render of all components on every poll, unnecessary network traffic, high CPU utilization
**Fix:** Implement exponential backoff, debounce polling, or replace with WebSocket/Server-Sent Events

---

### [HIGH] web/src/LiveCanvas.tsx:212
**Bottleneck:** `setInterval(fetchAllMessages, 3000)` fetches messages for every agent sequentially in a loop every 3 seconds
**Impact:** N API calls every 3 seconds (N = agent count), layout thrashing, high network overhead
**Fix:** Batch message fetching via single endpoint, add request caching/deduplication

---

### [HIGH] web/src/AgentPanel.tsx:35
**Bottleneck:** Selected agent detail polls every 2 seconds while App.tsx global polling already runs in parallel
**Impact:** Duplicate API calls, unnecessary re-renders of AgentPanel, overlapping data fetches
**Fix:** Reuse global store state; only fetch if selected agent identity changes

---

### [HIGH] web/src/LiveCanvas.tsx:89-154
**Bottleneck:** `layoutAgents()` recalculates complex tree layout on every agent-list change without caching
**Impact:** O(n²) hierarchy calculation, recreates hundreds of node/edge objects on each poll
**Fix:** Wrap in `useMemo` with correct dependency array; memoize node sub-components

---

### [HIGH] web/src/SpawnForm.tsx:12
**Bottleneck:** `useAgentStore.getRunning()` called on every render without memoization
**Impact:** Filters full agent list on each render to populate parent dropdown
**Fix:** Memoize selector with `useShallow` or implement a dedicated derived selector in the store

---

### [MED] web/src/AgentDetail.tsx:26
**Bottleneck:** `setInterval(() => fetchDetail(selectedAgent), 1500)` — most aggressive poll at 1500 ms
**Impact:** Excessive API requests, higher CPU/memory, potential memory leak if not properly cleaned
**Fix:** Increase interval to 3–5 seconds; implement smart refresh that skips poll when agent status is terminal (done/error)

---

### [MED] web/src/Header.tsx:15
**Bottleneck:** `setInterval(() => setNow(Date.now()), 1000)` updates state every second for a clock display
**Impact:** Unnecessary state update 60× per minute; triggers full header re-render each time
**Fix:** Use CSS animation for the clock, or memoize child components with `React.memo`

---

### [MED] web/src/LiveCanvas.tsx:163
**Bottleneck:** `messageCache` ref stores messages but never evicts; edge set grows unbounded
**Impact:** Memory leak — cache grows for entire session lifetime; redundant re-rendering of stale edges
**Fix:** Implement LRU cache with size cap (e.g. 500 entries); clear cache on component unmount

---

### [MED] web/src/App.tsx — component tree
**Bottleneck:** `DashboardTab`, `BuilderTab`, and sibling tab components rendered without `React.memo`
**Impact:** All tab content re-renders on every App-level state change, even for inactive tabs
**Fix:** Wrap each tab component with `React.memo`; memoize tab-selector logic

---

## BACKEND (Python)

### [HIGH] src/open_agents/bridge.py:67-75
**Bottleneck:** `api_list_agents()` calls `list_agents()` twice, then calls `check_agent()` for each running agent individually — N+1 pattern
**Impact:** 2N+1 file reads from `~/.oa/agents.json` per request
**Fix:** Load agents once; batch status checks; add a short-lived in-memory cache (e.g. 1 s TTL)

---

### [HIGH] src/open_agents/state.py:105-131
**Bottleneck:** `add_agent()`, `update_agent()`, and `remove_agent()` each load the entire JSON file twice per call
**Impact:** File-locking contention; high disk I/O; scales O(n) per write operation
**Fix:** Implement in-memory cache with write-through; or migrate state storage to SQLite

---

### [HIGH] src/open_agents/dashboard.py:310-315
**Bottleneck:** `_refresh_agents()` calls `list_agents()` twice with a status-check loop in between
**Impact:** Full file read → check all running agents → full file read again on every refresh
**Fix:** Single load with in-process status updates; return updated list directly from status check

---

### [MED] src/open_agents/bridge.py:84
**Bottleneck:** `api_get_agent()` calls `get_agent()` twice: before and after `check_agent()`
**Impact:** Unnecessary duplicate file I/O
**Fix:** Return the updated record directly from `check_agent()` to avoid the second lookup

---

### [MED] src/open_agents/state.py:151
**Bottleneck:** `get_children()` does a linear scan over all agents to find children of a parent
**Impact:** O(n) per call; O(n²) for hierarchy traversal of deep trees
**Fix:** Build and cache a `parent_id → [children]` map on load; invalidate only on relevant mutations

---

### [MED] src/open_agents/messaging.py:106
**Bottleneck:** `broadcast_message()` calls `list_agents(status="running")` → full JSON load even when few agents are running
**Impact:** Full file scan on every broadcast
**Fix:** Maintain a running-agents set in memory; update it on status transitions

---

### [MED] src/open_agents/tmux.py:38-41
**Bottleneck:** Dashboard pane runs `watch -n3 oa status` in tmux — redundant with 2-second frontend polling
**Impact:** Duplicate periodic status checks waste CPU on server
**Fix:** Remove `watch` or increase to ≥10 seconds; rely on frontend polling instead

---

## MEMORY & LIFECYCLE

### [MED] web/src/LiveCanvas.tsx:163
**Bottleneck:** `messageCache.current` is never cleared; accumulates for the entire component lifetime
**Impact:** Memory leak for long-running sessions
**Fix:** Implement bounded LRU cache; clear on component unmount via `useEffect` return

### [MED] web/src/App.tsx, AgentPanel.tsx, AgentDetail.tsx
**Bottleneck:** Multiple overlapping `setInterval` calls on the same endpoints without `AbortController`
**Impact:** Intervals may fire after component unmount; stale fetch responses can overwrite fresh state
**Fix:** Use `AbortController` to cancel in-flight fetches on cleanup; ensure every `setInterval` is cleared in the `useEffect` return

---

## BUNDLE SIZE

### [LOW] web/src — ReactFlow integration
**Bottleneck:** Full `@xyflow/react` (~200 KB) imported for the agent hierarchy canvas
**Impact:** Large initial bundle; library overkill for a relatively simple tree layout
**Fix:** Consider a lightweight custom SVG/canvas solution for the common case; keep ReactFlow as an optional deep-visualization mode

---

## Priority Summary

| Priority | Item |
|----------|------|
| **P0 — Critical** | Reduce polling (2000 ms → 5000 ms+) or replace with WebSocket/SSE |
| **P0 — Critical** | Fix N+1 reads in `bridge.py`; add caching layer |
| **P0 — Critical** | Implement in-memory state cache in `state.py` (or migrate to SQLite) |
| **P1 — High** | Memoize `layoutAgents()`, `getRunning()`, major tab components |
| **P1 — High** | Fix unbounded `messageCache` memory leak |
| **P2 — Medium** | Deduplicate polling intervals; add `AbortController` cleanup |
| **P2 — Medium** | Remove redundant `watch -n3` in tmux dashboard pane |
| **P3 — Low** | Evaluate replacing ReactFlow with lighter SVG solution |
