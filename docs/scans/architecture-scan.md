# Architecture Scan — Open-Agents Codebase

**Date:** 2026-03-08
**Scanner:** scanner-architecture agent
**Scope:** oa-cli Python backend, TypeScript frontend, Tauri bridge

---

## Overview

Total Issues Found: **15** (High: 5 | Medium: 5 | Low: 5)

---

## HIGH Priority Issues

### [HIGH] web/src-tauri/src/lib.rs — No Graceful Bridge Restart

**Issue:** The Python bridge process spawning has minimal error recovery. `get_bridge_status()` always returns `true` even if the process has died. No watchdog, no auto-restart, no health checks.

**Impact:** A crashed Python Flask bridge leaves users with a non-functional UI despite the Tauri app still running. Clicks hang indefinitely with no feedback.

**Fix:**
1. Implement health check that pings the bridge endpoint on interval
2. Add exponential backoff retry logic for bridge startup failures
3. Implement watchdog thread that monitors the Python process PID and restarts on exit
4. Track proper process state (not just checking if Mutex option is `Some`)

---

### [HIGH] src/open_agents/bridge.py — Missing API Endpoints (Frontend/Backend Sync Gap)

**Issue:** Several critical API endpoints are missing:
- No `/api/chat` endpoint (ChatSession exists in CLI but not exposed)
- No `/api/guardians/trigger` endpoint
- No `/api/pipeline` endpoint (pipeline exists in CLI only)
- No batch spawn endpoints
- Missing `/api/agents/{name}/pause` and `/api/agents/{name}/resume`

**Impact:** Web UI cannot access core CLI functionality. Users must drop to terminal for pipelines and guardians, breaking the web interface value proposition.

**Fix:**
1. Add missing endpoints that proxy to Python functions
2. Create a mapping doc: CLI commands → API endpoints
3. Add OpenAPI/Swagger spec for API documentation
4. Implement batch operation endpoints

---

### [HIGH] web/src/types/index.ts — TypeScript Types Out of Sync with Python Backend

**Issue:** TypeScript `Agent` interface is missing critical fields that Python `AgentRecord` has:
- Missing: `depth`, `lineage`, `shared_results_dir`, `project_root`, `last_activity`, `auto_cleanup_minutes`
- `Message` interface is incomplete (missing internal `_file` field)
- `SpawnAgentBody` is missing `--direct`, `--workspace`, `--template` options

**Impact:** When backend sends agent data with new fields, frontend silently drops them. This breaks hierarchy display and agent status tracking. TypeScript compiler provides false confidence.

**Fix:**
1. Auto-generate TypeScript types from Python dataclasses using `datamodel-codegen` or similar
2. Add pre-commit hook to validate type sync
3. Include all Python `AgentRecord` fields in TypeScript `Agent` interface
4. Enable `strict: true` in tsconfig.json

---

### [HIGH] src/open_agents/messaging.py — Circular Dependency Risk

**Issue:** `broadcast_message()` imports `list_agents()` from `state`, and `monitor.py` imports `unread_count()` from `messaging`. While not a direct cycle, this creates fragile coupling:
```python
# messaging.py
from .state import list_agents  # pulls in entire state module

# monitor.py
from .messaging import unread_count  # messaging might need state
```

**Impact:** Refactoring either module risks breaking imports. No strict cycle detection during development.

**Fix:**
1. Move `unread_count()` to a separate lightweight module
2. Change `broadcast_message()` to accept agent list as parameter instead of importing
3. Use explicit dependency injection for inter-module communication

---

### [HIGH] src/open_agents/state.py — Race Condition in File-Based Locking

**Issue:** Multiple concurrent agents can call `load_agents()` and `save_agents()`. While `fcntl` locks are used:
- Lock scope is minimal (only around JSON I/O)
- No transaction isolation between load and save
- Check-then-act pattern is unsafe: `if not existing: add_agent()` can race under high concurrency

**Impact:** With 10+ simultaneous agent spawns, duplicate agent records or lost updates are possible. State file could become corrupted.

**Fix:**
1. Use exclusive locks for the entire read-modify-write cycle in `add_agent()`
2. Implement compare-and-swap semantics or migrate to SQLite
3. Add checksums/versioning to detect corruption
4. Add concurrent test suite

---

## MEDIUM Priority Issues

### [MED] src/open_agents/bridge.py — Inconsistent Error Response Formats

**Issue:** API error responses use inconsistent formats:
- Some endpoints: `{"error": "message"}` with 404
- Others: `{"error": "message"}` with 400
- Some return 501 with `{"error": "module not available"}`
- No standard error code field or error ID for debugging

**Impact:** Frontend error handling cannot distinguish between error types. Users see generic "failed" messages with no actionable info.

**Fix:**
1. Define standard ErrorResponse: `{"code": string, "message": string, "details": {}}`
2. Create error codes enum (AGENT_NOT_FOUND, MODULE_UNAVAILABLE, etc.)
3. Apply consistently across all endpoints
4. Add correlation IDs for error tracking

---

### [MED] src/open_agents/cli.py + spawner.py — Tight Coupling

**Issue:** `cli.py` is 891+ lines doing too much: argument parsing, business logic, skills loading, template resolution, spawner calls, and Rich formatting. `spawner.py` directly manipulates tmux, creates workspaces, and writes shell scripts — no interface abstraction.

**Impact:** Impossible to use the spawner from web API without tmux. Cannot swap backends (Docker, Kubernetes, remote execution) without modifying core logic.

**Fix:**
1. Extract `AgentSpawnerBackend` protocol/interface
2. Create `TmuxSpawner`, `LocalSpawner` implementations
3. Move CLI presentation to separate "CLI Presenter" layer
4. Use dependency injection for spawner selection

---

### [MED] src/open_agents/lifecycle.py — Missing Error Boundaries

**Issue:** `check_agent()` performs multiple operations without isolation:
- `workspace_is_done()` reads filesystem (can fail)
- Lists agents and filters by lineage (can fail)
- Calls tmux commands (can fail)
- Updates agent state

If any step fails, agent state becomes inconsistent.

**Impact:** A single filesystem error or tmux permission issue can leave agents in undefined states (neither running nor done).

**Fix:**
1. Wrap each operation in try-except with specific exceptions
2. Log all failures with full context
3. Add retry logic for transient failures (file locks)
4. Health check before state mutations

---

### [MED] web/src/stores/agentStore.ts — Zustand Initialization Race Condition

**Issue:** `fetchAgents()` uses `initialLoadDone` flag to avoid creating activity events on first load, but:
- Called immediately in `App.tsx` on mount
- UI components may read incomplete state before initial load completes
- No `isLoading` state exposed to UI

**Impact:** UI briefly shows empty agent list even when agents exist — visual flicker and user confusion.

**Fix:**
1. Add `isLoading: boolean` state to store
2. Expose loading state to UI components
3. Show skeleton/placeholder during initial load
4. Defer activity event logic until `initialLoadDone`

---

### [MED] src/open_agents/spawner.py — No Validation of Agent Hierarchy Depth

**Issue:** `MAX_DEPTH_ABSOLUTE = 10` is hardcoded. `spawn_agent()` accepts `max_depth` but doesn't validate it against `MAX_DEPTH_ABSOLUTE`. Orchestrators can construct unlimited-depth hierarchy instructions.

**Impact:** A buggy or malicious orchestrator could spawn infinitely deep hierarchies, exhausting system resources.

**Fix:**
1. Move `MAX_DEPTH_ABSOLUTE` to configuration file
2. Validate `max_depth < MAX_DEPTH_ABSOLUTE` in `spawn_agent()`
3. Add circuit breaker to prevent explosion
4. Document depth limits in CLI help text

---

## LOW Priority Issues

### [LOW] src/open_agents/hooks.py — Unused Dead Code

**Issue:** `hooks.py` is defined but never imported or used anywhere in the codebase.

**Impact:** Maintenance burden; developers don't know if this is intentional or accidental.

**Fix:** Remove `hooks.py` or document intended usage in `ROADMAP.md`.

---

### [LOW] utils.py + agentStore.ts — Duplicated Model Display Formatting

**Issue:** Model display formatting logic exists in both `utils.py` (`_MODEL_DISPLAY` dict) and `agentStore.ts` (`modelColor()` function). Both are correct but duplicated.

**Impact:** Minor maintenance burden. Updating one requires updating both.

**Fix:** Create shared configuration or code-generated constants that both layers use.

---

### [LOW] src/open_agents/guardians.py — Incomplete Guardian System

**Issue:** Guardians are hardcoded in `GUARDIANS` dict. `register_guardian()` exists but:
- No persistence — registered guardians lost on process exit
- No way to list/manage dynamic guardians
- Hardcoded file paths break in other environments

**Impact:** Guardian feature is non-functional for dynamic use cases in production.

**Fix:** Store guardians in `~/.oa/guardians.json`, load on startup, make paths configurable.

---

### [LOW] src/open_agents/cli.py — Incomplete Command Docstrings

**Issue:** Many commands have minimal docstrings. `start()`, `pipeline()`, `delegate()` lack explanations of how they work, expected output, and error scenarios.

**Impact:** Users must read source code to understand CLI behavior.

**Fix:** Add comprehensive docstrings with usage patterns, expected output, and error scenarios.

---

### [LOW] src/open_agents/bridge.py — Template Endpoints Not Exposed in Web UI

**Issue:** `/api/templates` and `/api/templates/<id>` exist but:
- Never used in web UI (no UI component for templates)
- `template_loader` module wrapped in try-catch that silently fails
- Frontend has no way to apply templates when spawning agents

**Impact:** Template feature is inaccessible to users via web UI.

**Fix:** Either remove unused template endpoints or implement template selection UI in `SpawnForm.tsx`.

---

## Action Priority Matrix

| Priority | Issue | Effort | Risk if Ignored |
|----------|-------|--------|----------------|
| 1 | Bridge restart/watchdog | Medium | High (data loss, UX failure) |
| 2 | State file race conditions | Medium | High (data corruption) |
| 3 | TypeScript type sync | Low | Medium (silent data loss) |
| 4 | Missing API endpoints | High | Medium (feature gap) |
| 5 | Error response format | Low | Medium (debugging difficulty) |
| 6 | Lifecycle error boundaries | Low | Medium (undefined agent states) |
| 7 | Circular dependency risk | Medium | Low (future-proofing) |
| 8 | Zustand loading state | Low | Low (UX polish) |
| 9 | Spawner abstraction | High | Low (extensibility) |
| 10 | Guardian persistence | Medium | Low (feature completeness) |
