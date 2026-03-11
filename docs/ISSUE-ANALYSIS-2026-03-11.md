# Open-Agents — Issue Analysis 2026-03-11

## Executive Summary

**12 issues analyzed** across Sprint 11–22+ roadmap. **7 critical blockers** prevent production deployment, Hetzner integration, and roadmap continuation. **5 should-have items** improve template infrastructure and product maturity. Critical path items: remote agent spawning (root user), Docker isolation, terminal backend, telemetry foundation, and MCP CLI completeness. Key finding: Sprint 20–22 unfinished items block all downstream sprints (23–25).

---

## Priority Matrix

| # | Title | Priority | Effort | Hetzner | Sprint | Status |
|---|-------|----------|--------|---------|--------|--------|
| #70 | Terminal Backend (Fastify + node-pty + WebSocket) | **CRITICAL** | L | direct-blocker | Sprint 20 | 20% complete |
| #68 | Docker Container Isolation per Agent | **CRITICAL** | L | direct-blocker | Sprint 13 | Open |
| #71 | 'oa mcp' CLI Command + GitHub Actions PyPI Release | **CRITICAL** | M | indirect | Sprint 21 | Unfinished |
| #69 | Sprint 22 Telemetry (Agent Run, Post-Run Hooks, Context Window) | **CRITICAL** | M | indirect | Sprint 22 | Unfinished |
| #64 | Remote Agent Spawn Fails on Root — Permission Bypass Blocked | **CRITICAL** | S | direct-blocker | Sprint 22b | Open |
| #73 | /api/machines Auth Header Bug (Bearer vs X-API-Token) | **CRITICAL** | S | direct-blocker | Sprint 11 | Code appears fixed, needs verification |
| #74 | Bridge Server FileNotFoundError for tmux Outside Session | **CRITICAL** | S | direct-blocker | Sprint 11 | Code appears fixed, needs verification |
| #63 | Local-First Chat UI — Open WebUI as Reference | should-have | M | indirect | Sprint 20/21 | Open |
| #65 | Hook False Positive — check-delegation.sh && in Prompt Strings | should-have | S | indirect | Sprint 22 | Open |
| #66 | Agent Templates Schema Validation (14 'prompt' vs 'systemPrompt', 156 missing 'tags') | should-have | S | indirect | Current | Open |
| #67 | 'oa run --template <name>' CLI Feature | should-have | M | indirect | Sprint 13 | Blocked by #66 |
| #72 | VS Code Bridge Completion (Shared Types + E2E + CLI Integration) | should-have | L | none | Sprint 11 | 80% complete |

---

## Critical / Blockers

### #70: Terminal Backend (Fastify + node-pty + WebSocket + xterm.js)

**Status:** In Progress (20% complete)
**Sprint:** Sprint 20 (Desktop + Web App)
**Effort:** L (6+ weeks across 5 parallel workstreams)
**Hetzner Impact:** **Direct blocker** — no web terminal = no remote agent access

**Problem:**
Sprint 20 is severely incomplete. Current state: xterm.js React component exists (partial); everything else missing:
- ❌ Fastify backend + node-pty + WebSocket server
- ❌ TerminalService abstraction layer
- ❌ Multi-terminal tabs/splits UI
- ❌ tmux integration for oa session visibility
- ❌ Agent dashboard embedding
- ❌ Docker Compose deployment
- ❌ Tauri v2 desktop CI/CD pipelines

**Proposed Solution:**
Decompose into 5 parallel workstreams:
1. **Backend Infrastructure** (2 sprints): Fastify + node-pty + WebSocket
2. **Frontend Refinement** (1 sprint): xterm.js polish + addons (web-links, fit, search)
3. **Integration** (1 sprint): TerminalService abstraction + multi-terminal plumbing
4. **tmux Integration** (1 sprint): surface oa session/agent state
5. **Deployment** (2 sprints): Docker Compose + Tauri CI/CD

Recommend front-loading backend + frontend parallel work; defer multi-terminal to post-MVP.

---

### #68: Docker Container Isolation per Agent

**Status:** Open
**Sprint:** Sprint 13
**Effort:** L (> 3 days)
**Hetzner Impact:** **Direct blocker** — required for multi-user/production safety

**Problem:**
Currently, agents execute with full host permissions. This is unsafe for multi-user or production deployment. Blocking issue for Sprint 13.

**Proposed Solution:**
Implement multi-part Docker isolation:
1. `docker-runtime.ts` adapter for container lifecycle (start, logs, cleanup)
2. Workspace builder mounting 6-layer stack in container volumes
3. Network whitelist per agent config
4. Resource limits (memory, CPU, timeout) via Docker flags
5. Secret injection as environment variables
6. Artifact capture post-execution
7. Refactor `runtime.execute()` to docker-runtime
8. Align safety blacklists with container policies

This is critical path for production safety and regulatory compliance.

---

### #71: 'oa mcp' CLI Command + GitHub Actions PyPI Release Workflow

**Status:** Unfinished
**Sprint:** Sprint 21 (marked Done, but 2 items pending)
**Effort:** M (1.5 sprints)
**Hetzner Impact:** Indirect (production readiness)

**Problem:**
Sprint 21 completion blocked by two critical gaps:
1. **'oa mcp' CLI Command** (missing): No CLI interface to manage mcp_server.py lifecycle
2. **GitHub Actions PyPI Workflow** (missing): No auto-publish on git tag
3. **E2E test coverage** (missing): No automated Claude Code → MCP → oa-cli → agent flow validation

**Proposed Solution:**
1. **'oa mcp' subcommand** (1 sprint):
   - `oa mcp start` — launch mcp_server.py in tmux session
   - `oa mcp stop` — gracefully terminate
   - `oa mcp status` — check if running
   - Integrate with existing oa session lifecycle

2. **GitHub Actions PyPI Workflow** (0.5 sprint):
   - Trigger on git tag `v*`
   - Build distribution (`python -m build`)
   - Publish to PyPI via trusted GitHub action

3. **E2E Test** (1 sprint):
   - Spawn Claude Code session
   - Trigger MCP call → oa-cli agent spawn → tmux session
   - Verify agent execution and output

---

### #69: Sprint 22 Telemetry (Agent Run, Post-Run Hooks, Context Window Tracking)

**Status:** Unfinished
**Sprint:** Sprint 22 (Self-Improvement Foundation, marked Done but incomplete)
**Effort:** M (2–3 sprints for full implementation)
**Hetzner Impact:** Indirect (blocks downstream sprints)

**Problem:**
Sprint 22 is nominally closed, but three critical unimplemented items form the data foundation for entire roadmap:
1. **Agent Run Telemetry** — track duration, token usage, success/failure per execution
2. **Post-Run Hook System** — execute automated hooks when agents finish (e.g., auto-extract lessons)
3. **Context Window Tracking** — monitor context usage, trigger compaction at thresholds

Without these, Sprints 23 (lesson extractor), 24 (meta-agent), and 25 (analytics) cannot function.

**Proposed Solution:**
Implement in sequential order:
1. **Agent Run Telemetry** — instrument each agent run with timing, token delta, success/failure signals
2. **Context Window Tracking** — add context usage meter to Agent SDK; trigger compaction hooks
3. **Post-Run Hook System** — build hook registry; trigger on completion; enable lesson extraction pipeline

---

### #64: Remote Agent Spawn Fails on Root — `--dangerously-skip-permissions` Blocked

**Status:** Open
**Sprint:** Sprint 22b (Remote Execution)
**Effort:** S (< 1 day)
**Hetzner Impact:** **Direct blocker** — Hetzner GPU server runs Claude Code as root

**Problem:**
Remote agent spawning via `oa run --remote hetzner` fails immediately:
```
--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons
```

**Root Cause:**
`spawn_remote_agent()` in `oa-cli/src/open_agents/spawner.py` (lines 75–93) uses `--dangerously-skip-permissions`. Claude Code v1.x blocks this flag when running as root for security.

**Proposed Solution:**
**Option A (Recommended):** Create non-root user (`agents`) on Hetzner server. Update `remotes.json` to specify `remote_user: agents`. Use SSH key-based auth for passwordless spawning.

**Option B:** Replace `--dangerously-skip-permissions` with `--allowedTools` flag. Build allowlist of safe tools (bash, file I/O) instead of blanket permission skip.

**Option C:** Add conditional logic — detect remote user via SSH; if root, use Option B; else use current behavior.

**Recommendation:** Option A + create deployment docs (Option C as fallback).

---

### #73: /api/machines Auth Header Bug (Bearer vs X-API-Token)

**Status:** Open (code inspection shows fix appears applied)
**Sprint:** Sprint 11 (hotfix candidate)
**Effort:** S (< 1 day)
**Hetzner Impact:** **Direct blocker** — machine selector in web UI

**Problem:**
SpawnForm was manually constructing `Authorization: Bearer <token>` instead of correct `X-API-Token: <token>` header. Breaks `/api/machines` endpoint.

**Current Status:**
Code inspection (SpawnForm.tsx:72–79) reveals the correct implementation:
- ✅ Uses `authHeaders()` helper (imported from `client.ts`)
- ✅ Correctly constructs `X-API-Token` header
- ✅ Avoids broken `Authorization: Bearer` pattern

**Proposed Solution:**
**Verification required:** Confirm this fix is merged to main branch. If issue still open, likely the fix was applied but issue not yet closed. Recommend:
1. Verify current main branch HEAD has `authHeaders()` usage in SpawnForm.tsx
2. Close issue once confirmed + merged

**Impact if unfixed:** Machine selector functionality broken; Hetzner integration workflow blocked.

---

### #74: Bridge Server FileNotFoundError for tmux Outside Session

**Status:** Open (code inspection shows fix appears applied)
**Sprint:** Sprint 11 (hotfix candidate)
**Effort:** S (< 1 day)
**Hetzner Impact:** **Direct blocker** — background bridge launch fails

**Problem:**
Bridge server throws FileNotFoundError for tmux when started outside tmux session (e.g., `oa web &`). Root cause: parent process environment lacks standard binary paths.

**Current Status:**
Code inspection (bridge.py:846–858) reveals correct implementation:
- ✅ Ensures `/usr/bin`, `/usr/local/bin`, `/bin` in PATH before Flask starts
- ✅ Prepends missing paths to `os.environ["PATH"]`
- ✅ Resolves root cause: `subprocess` in `check_agent()` can now find `/usr/bin/tmux`

**Proposed Solution:**
**Verification required:** Confirm this fix is merged. If issue still open, likely the fix was applied but issue not yet closed.

**Test plan:** `oa web & sleep 1 && curl http://localhost:5174/api/agents` should return agent list without 500 FileNotFoundError.

**Impact if unfixed:** Background bridge launch broken; web UI agent status polling fails; any environment without `/usr/bin` in PATH (Docker, CI/CD) fails.

---

## Should-Have

### #63: Local-First Chat UI — Open WebUI as Reference, Not Foundation

**Priority:** should-have
**Effort:** M (1–3 days)
**Sprint:** Sprint 20/21 (Web UI Command Centre phase)

**Problem:** Open WebUI shifted toward OpenAI/paid provider integrations, creating vendor lock-in. Open Agents needs its own chat interface with local-first guarantees.

**Proposed Solution:**
1. Design minimal chat UI component wrapping `oa-cli` agent execution
2. REST endpoint `/api/chat` with SSE streaming (already implemented in MASTERPLAN)
3. Reference Open WebUI's conversation history, model selector, markdown rendering; skip multi-user roles
4. Integrate into Sprint 21 Web UI Command Centre, not separate service
5. MVP: Single conversation thread, agent selector dropdown, markdown responses

**Blocks:** Chat interface design and prototyping within Sprint 21.

---

### #65: Hook False Positive — check-delegation.sh Counts `&&` in Prompt Strings

**Priority:** should-have
**Effort:** S (< 1 day)
**Sprint:** Sprint 22 (quality hooks)

**Problem:** `check-delegation.sh` counts all `&&` in full bash command, including those in string arguments. False positives block legitimate multi-step `oa run` prompts.

**Example:**
```bash
oa run 'step 1 && step 2 && step 3' --name agent --model claude/sonnet --direct
```
Gets blocked because hook sees `&&` characters without distinguishing outer syntax from argument content.

**Proposed Solution (Recommended):** If command starts with `oa run`, exit 0 immediately. `oa run` **is** the delegation; anything inside arguments is not shell syntax.

**Alternative:** Only parse "outer" bash command (before first quote). Ignore string arguments entirely.

---

### #66: Agent Templates Schema Validation (14 'prompt' vs 'systemPrompt', 156 missing 'tags')

**Priority:** should-have
**Effort:** S (< 1 day)
**Sprint:** Current

**Problem:** 1177+ templates lack schema validation. Results in silent failures:
- 14 templates use incorrect field name `prompt` instead of `systemPrompt`
- 156 templates completely missing required `tags` field
- No validation catches errors during load

**Proposed Solution:**
1. Implement JSON schema validator in `template_loader.py` enforcing required fields
2. One-time migration: rename `prompt` → `systemPrompt` in 14 templates, add default `tags: []` to 156 templates
3. Add CI validation step checking all templates against schema on every commit
4. Consider template versioning for future schema changes

**Blocks:** Better template tooling, template execution feature (#67), library reliability.

---

### #67: 'oa run --template <name>' CLI Feature

**Priority:** should-have
**Effort:** M (1–3 days)
**Sprint:** Sprint 13

**Problem:** 1177+ templates in library exist as documentation-only. No CLI mechanism to invoke them directly. Blocks workflow automation and platform usability.

**Proposed Solution:**
Add `--template` flag to `oa run` command:
1. CLI resolves template name (e.g., `core/iterative-planner`, `aec-blender/bonsai-ifc-loader`)
2. Extracts `systemPrompt` and `modelHint` as defaults from template JSON
3. Applies to agent spawn
4. Other flags (`--model`, `--name`) can override template defaults

Requires resolver logic, flag integration, and integration tests. Makes templates truly executable.

**Blocked by:** #66 (schema validation should be completed first for consistent structure).

---

### #72: VS Code Bridge Completion (Shared Types Merge + E2E + CLI Integration)

**Priority:** should-have
**Effort:** L (Large)
**Sprint:** Sprint 11 (currently 80% complete)

**Problem:** Sprint 11 blocked by three pending items:
1. **Shared types merge** — bridge events, agent types, constants currently scattered across bridge.py, web components, client.ts
2. **CLI tool integration** — bridge needs full integration with `oa` CLI tool
3. **Missing E2E verification** — no end-to-end test: `canvas → cli/claude agent → terminal → result`

**Proposed Solution:**
Decompose into subtasks in priority order:
1. Shared types merge first (unblocks others)
2. CLI integration
3. E2E test suite
4. Test-workspace migration

Estimated 15–20 hours across team. Block Sprint 12 work until E2E canvas passes.

**Blocks:** Full VS Code Bridge feature release, E2E testing pipeline maturity, CLI agent spawning from web UI with correct model selection.

---

## Direct Action Items (S Effort — Can Start Today)

| Item | Issue | Action | Effort | Owner |
|------|-------|--------|--------|-------|
| Fix/Verify Auth Header | #73 | Verify `authHeaders()` usage in SpawnForm.tsx main branch; merge + close if pending | S | QA/reviewer |
| Fix/Verify tmux PATH | #74 | Verify PATH initialization in `run_bridge()` on main; merge + close if pending | S | QA/reviewer |
| Hook False Positive | #65 | Patch `check-delegation.sh`: exit 0 if command starts with `oa run` | S | DevOps/QA |
| Template Schema | #66 | Implement JSON schema validator in `template_loader.py`; run one-time migration | S | Backend engineer |
| Remote Root Issue | #64 | Create non-root user `agents` on Hetzner server; update `remotes.json`; test spawn | S | DevOps |

---

## Dependency Map

```
Sprint 20 Terminal Backend (L effort)
    ├─→ BLOCKS: Hetzner deployment
    ├─→ BLOCKS: Desktop product launch
    └─→ ENABLES: Agent visibility in web UI

Sprint 22 Telemetry (#69)
    ├─→ UNBLOCKS: Sprint 23 (Lesson Extractor)
    ├─→ UNBLOCKS: Sprint 24 (Meta-Agent)
    └─→ UNBLOCKS: Sprint 25 (Analytics)

Sprint 13 Docker Isolation (#68)
    └─→ REQUIRED FOR: Production deployment safety

#64 Remote Root User
    └─→ BLOCKS: All Hetzner agent spawning

#65 Hook False Positive
    └─→ BLOCKS: Clean oa run usage without workarounds

#66 Template Schema
    └─→ UNBLOCKS: #67 (oa run --template feature)

#70 Terminal Backend
    ├─→ BLOCKS: #63 (Chat UI in web interface)
    └─→ BLOCKS: Hetzner deployment
```

---

## Recommended Execution Priority

**Critical Path (Week 1):**
1. **#64 (Remote root)** — S effort, unblocks Hetzner entirely
2. **#73 + #74 verification** — S effort each, enable Hetzner web UI integration
3. **#66 (Template schema)** — S effort, unblocks #67

**Critical Path (Week 2–3):**
4. **#71 ('oa mcp' CLI + PyPI)** — M effort, unblocks production release
5. **#69 (Telemetry)** — M effort, unblocks Sprints 23–25

**Critical Path (Long-term):**
6. **#70 (Terminal backend)** — L effort (6+ weeks), longest lead time
7. **#68 (Docker isolation)** — L effort, required for production safety

**Should-Have (Parallel, lower priority):**
8. **#63 (Chat UI)** — Integrate into Sprint 21 Web UI completion
9. **#65 (Hook fix)** — Quick fix, improve DX
10. **#67 (--template CLI)** — Waits for #66
11. **#72 (VS Code Bridge)** — Sprint 11 completion (80% done)

---

**Analysis Complete: 2026-03-11**
**Batches Analyzed:** batch-63-64-65, batch-66-67-68, batch-69-70-71, batch-72-73-74
**Total Issues:** 12 | **Critical:** 7 | **Should-Have:** 5 | **Hetzner Blockers:** 6
