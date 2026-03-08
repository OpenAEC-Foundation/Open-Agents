# Research Results Summary

## Drag-and-Drop Library Research (2026-03-08)

### Task Completed ✅
Research the best lightweight drag-and-drop approach for a React kanban board (3 columns: Running, Done, Failed) with agent sessions and real-time updates (polling every 2s).

### Recommendation
**Use @dnd-kit** — 10 kB gzip, actively maintained, perfect for real-time updates without card jumping.

**Key findings:**
- **@dnd-kit**: 10 kB (gzip) ✅ **RECOMMENDED**
- **react-beautiful-dnd**: 38 kB (gzip), deprecated Aug 2025 ❌
- **HTML5 Native**: 0 kB but risky, poor touch support ⚠️

**Why @dnd-kit:**
1. Smallest modern bundle (3.4× lighter than react-beautiful-dnd)
2. Transform-based positioning prevents card jumping during polling updates
3. React 19 compatible, actively maintained
4. Excellent re-render performance with memoization

**Implementation:** Use @dnd-kit/sortable for kanban columns, memoize AgentCard components, separate data state from drag state.

---

# API Congruency Report: bridge.py ↔ TypeScript Client

**Date:** 2026-03-08
**Files analyzed:**
- `src/open_agents/bridge.py`
- `web/src/api/client.ts`
- `web/src/types/index.ts`

---

## 1. Python Endpoints (bridge.py)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/<name>` | Get single agent |
| GET | `/api/agents/<name>/output` | Get live output |
| POST | `/api/agents` | Spawn agent |
| POST | `/api/agents/<name>/kill` | Kill agent |
| POST | `/api/agents/<name>/pause` | Pause agent |
| POST | `/api/agents/<name>/resume` | Resume paused agent (tmux) |
| DELETE | `/api/agents/<name>` | Delete/kill agent |
| GET | `/api/agents/<name>/messages` | Get agent messages |
| POST | `/api/agents/<name>/messages` | Send message to agent |
| POST | `/api/clean` | Clean finished agents |
| GET | `/api/session/status` | Check session status |
| POST | `/api/session/start` | Start tmux session |
| GET | `/api/guardians` | List guardians |
| POST | `/api/guardians/trigger` | Trigger a guardian |
| GET | `/api/health` | Health check |
| GET | `/api/pipeline` | List pipeline agents |
| POST | `/api/run` | Alias: spawn agent |
| POST | `/api/spawn` | Alias: spawn agent |
| GET | `/api/messages/<name>` | Get messages (inbox) |
| POST | `/api/messages` | Send message |
| POST | `/api/messages/broadcast` | Broadcast message |
| POST | `/api/messages/<name>/read` | Mark messages as read |
| POST | `/api/broadcast` | Alias: broadcast |
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create team |
| GET | `/api/teams/<name>` | Get team |
| GET | `/api/tasks/<team>` | List tasks |
| POST | `/api/tasks/<team>` | Create task |
| PUT | `/api/tasks/<team>/<task_id>` | Update task |
| GET | `/api/templates` | List templates |
| GET | `/api/templates/<template_id>` | Load template |
| GET | `/api/checkpoints` | List checkpoints |
| POST | `/api/resume/<agent>` | Resume from checkpoint |

**Total: 34 endpoints**

---

## 2. TypeScript API Calls (client.ts)

| Function | Method | Path |
|----------|--------|------|
| `fetchAgents` | GET | `/api/agents` |
| `fetchAgentDetail` | GET | `/api/agents/<name>` |
| `spawnAgent` | POST | `/api/agents` |
| `killAgent` | POST | `/api/agents/<name>/kill` |
| `cleanAgents` | POST | `/api/clean` |
| `startSession` | POST | `/api/session/start` |
| `fetchMessages` | GET | `/api/messages/<name>` |
| `sendMessage` | POST | `/api/messages` |
| `broadcastMessage` | POST | `/api/messages/broadcast` |
| `markRead` | POST | `/api/messages/<name>/read` |
| `triggerGuardian` | POST | `/api/guardians/trigger` |
| `fetchTemplates` | GET | `/api/templates` |

**Total: 12 API calls**

---

## 3. Endpoint Mismatches

### 3a. Python endpoints NOT called in TypeScript

| Severity | Method | Path | Impact |
|----------|--------|------|--------|
| 🔴 | POST | `/api/agents/<name>/pause` | Pause functionality unavailable in UI |
| 🔴 | POST | `/api/agents/<name>/resume` | Resume (tmux) unavailable in UI |
| 🔴 | GET | `/api/pipeline` | Pipeline view not accessible |
| 🔴 | GET | `/api/teams` | Teams feature not accessible |
| 🔴 | POST | `/api/teams` | Teams creation not accessible |
| 🔴 | GET | `/api/teams/<name>` | Team detail not accessible |
| 🔴 | GET | `/api/tasks/<team>` | Task list not accessible |
| 🔴 | POST | `/api/tasks/<team>` | Task creation not accessible |
| 🔴 | PUT | `/api/tasks/<team>/<task_id>` | Task update not accessible |
| 🔴 | GET | `/api/checkpoints` | Checkpoint list not accessible |
| 🔴 | POST | `/api/resume/<agent>` | Checkpoint resume not accessible |
| 🟡 | GET | `/api/agents/<name>/output` | Live output polling not in client (relies on detail endpoint) |
| 🟡 | DELETE | `/api/agents/<name>` | TS uses `/kill` POST instead; DELETE unused |
| 🟡 | GET | `/api/agents/<name>/messages` | TS uses `/api/messages/<name>` instead |
| 🟡 | POST | `/api/agents/<name>/messages` | TS uses `/api/messages` instead |
| 🟡 | GET | `/api/session/status` | Session status never polled |
| 🟡 | GET | `/api/health` | Health check never called |
| 🟡 | GET | `/api/guardians` | Guardian list not fetched (only trigger is called) |
| 🟡 | GET | `/api/templates/<template_id>` | Individual template load not in client |

### 3b. TypeScript calls NOT in Python

None — all TS calls have matching Python endpoints.

---

## 4. Type Mismatches: `_agent_to_dict` vs `Agent` interface

Python `_agent_to_dict` returns:
```python
{ name, task, workspace, tmux_window, model, parent, status,
  created_at, finished_at, unread_messages, live_output (conditional) }
```

TypeScript `Agent` interface expects:

| Field | In Python `_agent_to_dict` | In TS `Agent` | Severity |
|-------|---------------------------|---------------|----------|
| `name` | ✅ | ✅ | — |
| `task` | ✅ | ✅ | — |
| `workspace` | ✅ | ✅ | — |
| `tmux_window` | ✅ | ✅ | — |
| `model` | ✅ | ✅ | — |
| `status` | ✅ | ✅ | — |
| `parent` | ✅ | ✅ | — |
| `created_at` | ✅ | ✅ | — |
| `finished_at` | ✅ | ✅ | — |
| `unread_messages` | ✅ | ✅ (optional) | — |
| `live_output` | ✅ (conditional) | ✅ (optional) | — |
| `result` | ✅ (conditional) | ✅ (optional) | — |
| `pid` | ❌ missing | `number \| null` | 🔴 |
| `output_file` | ❌ missing | `string \| null` | 🟡 |
| `depth` | ❌ missing | `number` | 🟡 |
| `lineage` | ❌ missing | `string[]` | 🟡 |
| `task_hash` | ❌ missing | `string` | 🟡 |
| `max_children` | ❌ missing | `number` | 🟡 |
| `shared_results_dir` | ❌ missing | `string \| null` | 🟡 |
| `last_activity` | ❌ missing | `number` | 🟡 |
| `auto_cleanup_minutes` | ❌ missing | `number` | 🟡 |
| `project_root` | ❌ missing | `string \| null` | 🟡 |

**10 fields declared in `Agent` interface are never returned by Python.**

---

## 5. Fix Recommendations

### Critical (🔴)

**F-01** — Add `pid` to `_agent_to_dict`
`pid` is declared as non-optional (`number | null`) in the `Agent` interface but never returned by Python. Any code using `agent.pid` will get `undefined` at runtime.
*Fix:* Add `"pid": getattr(rec, "pid", None)` to `_agent_to_dict`.

**F-02** — Add missing TS functions for pause/resume
`POST /api/agents/<name>/pause` and `POST /api/agents/<name>/resume` exist in Python but have no TS counterparts. Pause/resume is completely inaccessible from the UI.
*Fix:* Add to `client.ts`:
```typescript
export async function pauseAgent(name: string): Promise<void> {
  await fetch(`${API}/agents/${encodeURIComponent(name)}/pause`, { method: 'POST' });
}
export async function resumeAgent(name: string): Promise<void> {
  await fetch(`${API}/agents/${encodeURIComponent(name)}/resume`, { method: 'POST' });
}
```

**F-03** — Add TS functions for Teams, Tasks, Checkpoints
11 Python endpoints for teams, tasks, and checkpoints have no TS wrappers. These features are completely inaccessible from the frontend.
*Fix:* Add `fetchTeams`, `createTeam`, `fetchTasks`, `createTask`, `updateTask`, `fetchCheckpoints`, `resumeFromCheckpoint` to `client.ts`.

**F-04** — Add `fetchPipelines` to client.ts
`GET /api/pipeline` is not exposed in TS; pipeline status is invisible in the UI.
*Fix:* Add `export async function fetchPipelines(): Promise<Agent[]>` calling `GET /api/pipeline`.

### Warnings (🟡)

**F-05** — Add missing hierarchy/metadata fields to `_agent_to_dict` or make them optional in TS
Fields `output_file`, `depth`, `lineage`, `task_hash`, `max_children`, `shared_results_dir`, `last_activity`, `auto_cleanup_minutes`, `project_root` are declared as required (non-optional) in the `Agent` interface but absent from Python response.
*Fix (preferred):* Make them optional in `types/index.ts`:
```typescript
pid?: number | null;
output_file?: string | null;
depth?: number;
lineage?: string[];
task_hash?: string;
max_children?: number;
shared_results_dir?: string | null;
last_activity?: number;
auto_cleanup_minutes?: number;
project_root?: string | null;
```
*Alt fix:* Add all fields to `_agent_to_dict` with `getattr(rec, field, None)` fallbacks.

**F-06** — Add `fetchGuardians` to client.ts
`GET /api/guardians` is never called; the guardian list is not fetched.
*Fix:* Add `export async function fetchGuardians()` calling `GET /api/guardians`.

**F-07** — Add `fetchSessionStatus` to client.ts
`GET /api/session/status` is not called; session state cannot be polled on load.

**F-08** — Deduplicate messaging endpoints
Python exposes both `/api/agents/<name>/messages` and `/api/messages/<name>` doing the same thing. TS only uses the latter. Consider removing the agent-scoped aliases in Python or documenting the canonical path.

---

## Summary

| Category | Count |
|----------|-------|
| Python endpoints | 34 |
| TypeScript API calls | 12 |
| 🔴 Critical mismatches | 4 groups (pause/resume, teams, tasks, checkpoints, pipeline, pid field) |
| 🟡 Warnings | 10 missing fields in Agent type + 5 uncovered endpoints |
| TS calls with no Python match | 0 |
