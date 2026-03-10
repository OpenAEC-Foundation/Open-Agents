# Scavenger Findings — Session Persistence

> **Agent**: scavenger | **Date**: 2026-03-11
> **Scope**: Relevant prior research and decisions for Session Persistence feature
> **Output path**: docs/proposals/research/scavenger-findings.md

---

## 1. SESSION-PERSISTENCE-MASTERPLAN-RAW.md

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN-RAW.md`

**Relevance**: This IS the primary design document for Session Persistence. Contains the full problem statement, three shutdown modes, session record schema, and resume UX.

**Key content**:

Three shutdown modes identified:
- **Bewust stoppen** (`oa stop`): Full cleanup pipeline (snapshot → finish → document → notify → cleanup)
- **Onbewust sluiten** (kruisje/crash): Light cleanup via `client-detached` hook + agents continue running
- **Harde crash**: No cleanup possible — rely on periodic checkpoints only

Session Record schema (JSON):
```json
{
  "session_id": "2026-03-11T14-32-00",
  "shutdown_mode": "stop|detach|crash",
  "agents": { "worker-1": { "status": "done", "output_path": "..." } },
  "git_state": { "branch": "main", "uncommitted_files": [], "stash_ref": null }
}
```

Actions matrix: A1 (agent snapshot, P1), A2 (git status, P1), A3 (git stash, P2), B1 (graceful shutdown signal, P2), B3 (collect output, P1).

---

## 2. SESSION-PERSISTENCE-AGENT-ORCHESTRATION.md

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-AGENT-ORCHESTRATION.md`

**Relevance**: Full 7-phase agent pipeline (15-17 agents) already designed to implement session persistence. Tells us what research has been done and what's still needed.

**Key content**:

Pipeline phases:
1. RESEARCH (3 parallel agents: researcher-platform, researcher-architecture, researcher-ux)
2. CORE DOCS VULLEN (writer-decisions, writer-roadmap)
3. MASTERPLAN REFINED
4. ENGINEERING (schema + architecture)
5. IMPLEMENTATIE (3 batches: session-store, tmux-hooks, notifications)
6. TESTING & REVIEW
7. DOCUMENTATIE

Research questions covered: Q1 (tmux hooks on Windows), Q2 (daemon in tmux), Q3 (crash detection), Q4 (desktop notifications), Q6 (fcntl on Windows), Q7-Q10 (architecture), Q11-Q12 (UX).

---

## 3. Platform Research (already done)

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/platform-research.md`

**Relevance**: Answers Q1, Q4, Q6 — critical technical questions for session persistence implementation.

**Key findings**:

**Q1 — tmux `client-detached` hook on Windows**:
- Hook fires on clean detach (`Ctrl+b d`) but NOT when Windows Terminal window is closed (SIGHUP kills the client without clean detach)
- tmux server survives due to WSL2 background task support
- **Critical finding**: "Do not rely on `client-detached` alone for crash/close safety. Use it as a supplement to periodic checkpoints."
- The primary "onbewust sluiten" use case silently bypasses the hook on Windows Terminal + WSL2

**Q4 — Desktop notifications from WSL**:
- `powershell.exe` is in WSL2 PATH by default
- BurntToast module works: `powershell.exe -Command "New-BurntToastNotification -Text 'title', 'msg'"`
- Recommended implementation:
  ```python
  def send_notification(title, message):
      ps = shutil.which("powershell.exe")
      if ps:
          subprocess.Popen([ps, "-Command", f"New-BurntToastNotification -Text '{title}', '{message}'"])
  ```
- Risk: single quotes in message break the PowerShell command

**Q6 — fcntl on Windows**:
- `state.py` imports `fcntl` at module level — blocker for native Windows
- `portalocker` library as cross-platform alternative
- Existing `save_agents()` already uses atomic rename — good pattern

---

## 4. Architecture Research (already done)

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/architecture-research.md`

**Relevance**: Answers Q2 (daemon design), Q3 (crash detection) — core architectural decisions.

**Key findings**:

**Q2 — Guardian daemon in tmux**:
- Recommended: **dedicated tmux window `oa-guardian`** with self-healing wrapper loop
- Code sketch provided for `guardian.py` module with 5-minute periodic checkpoint
- Health check: `oa status` warns if guardian window is missing; `oa start` re-creates it

**Q3 — Hard crash vs clean detach detection**:
- Recommended: **Lock file + heartbeat combined**
  - Lock file: present = session not cleanly stopped
  - Heartbeat: timestamp written every 5 min by guardian; stale = crash, recent = detach
- Detection logic:
  ```
  Lock exists? → NO = clean start
               → YES + tmux alive = detach
               → YES + tmux dead + recent heartbeat = crash
               → YES + tmux dead + stale heartbeat = old crash
  ```
- New `session.py` module proposed with `detect_previous_shutdown()` function

---

## 5. UX Research (already done)

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/ux-research.md`

**Relevance**: Answers Q11 (interactive vs automatic resume), Q12 (config surface).

**Key findings**:

**Q11 — Resume UX**:
- Recommendation: **Automatic resume, `--fresh` to opt out**. No interactive menu.
- Banner on `oa start`:
  ```
  Session resumed: 2026-03-11 14:32 → 16:47 (2h 15m)
  Agents: 3 done · 1 still running · 1 failed
  Run `oa session` for full summary  ·  `oa start --fresh` to discard
  ```
- tmux, tmuxinator, VS Code, Zellij all default to resume — oa-cli should match

**Q12 — Config surface**:
- 4 visible options: `state_snapshot` (true), `notify_desktop` (true), `git_stash` (false), `retention_days` (30)
- 3 hidden options: `session_summary`, `auto_doc_update`, `cleanup_timeout_seconds`
- Principle: "actions that modify the repo or cost money are off by default"

---

## 6. D-057 — Guardian Agents Decision

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/DECISIONS.md`

**Relevance**: D-057 directly addresses session-end lifecycle and automatic state preservation.

**Key content**:
> "Guardian agents als reflexen — `session_end` en `batch_complete` triggers. Automatische updates van LESSONS.md, ROADMAP.md, HANDOFF.md zonder menselijke herinnering. Systeem verbetert zichzelf door reflectie op elke sessie-afsluiting en batch-voltooiing. Implementatie in oa-cli guardians.py module."

This confirms `guardians.py` already exists and has `session_end` + `batch_complete` triggers — a direct foundation for session persistence lifecycle hooks.

---

## 7. D-052 — Agent Teams Patterns (open decision)

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/DECISIONS.md`

**Relevance**: D-052 is open — decision to adopt Claude Code Agent Teams patterns including **graceful shutdown protocol** still unresolved.

**Key content**:
> "Claude Code Agent Teams implementeert patterns die oa-cli mist: shared task list met file locking, inter-agent messaging (DM + broadcast), graceful shutdown protocol, task dependencies, quality hooks (TeammateIdle/TaskCompleted)"

The graceful shutdown protocol (agents can approve/reject shutdown requests) is directly relevant to the "Bewust stoppen" mode in session persistence. D-052 being open means this architectural dependency is unresolved.

---

## 8. Sprint 17 Research — Graceful Shutdown Protocol

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/design/sprint17-research.md`

**Relevance**: Sprint 17 designed the graceful shutdown protocol (G4) that session persistence depends on.

**Key content**:

Graceful shutdown gap (G4):
- `oa team shutdown <agent-name>` — sends `shutdown_request` message
- Agent responds with `shutdown_response` (approved/rejected + reason)
- Lead CLI waits up to 30s for response
- New message type field: `"type": "shutdown_request" | "shutdown_response"`

Existing infrastructure that session persistence can build on:
- `guardians.py`: `batch_complete`, `session_end` event hooks already exist
- `messaging.py`: mailbox per agent, DM + broadcast
- `state.py`: `~/.oa/agents.json` CRUD with fcntl locking

Build order for Sprint 17 (dependencies):
1. `claim_task()` → 2. auto-unblock → 3. `oa task claim` → 4. message `type` field → 5. guardian hooks → 6. graceful shutdown → 7. `oa team cleanup`

---

## 9. MASTERPLAN — Sprint 19 Slot

**Source**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/MASTERPLAN.md`

**Relevance**: Session persistence is planned for Sprint 19 in the roadmap.

**Key content**:
> Sprint 17: "oa-cli Agent Teams Patterns | Shared task list, inter-agent messaging, graceful shutdown, quality hooks (D-052)"

Sprint 19 is the target sprint for Session Persistence implementation based on the orchestration plan.

---

## Summary

All three research files exist and are complete (platform, architecture, UX). The SESSION-PERSISTENCE-MASTERPLAN-RAW.md is complete. The AGENT-ORCHESTRATION plan has all 7 phases documented.

**What's missing / still needed**:
1. D-055 and D-056 need session persistence-related decisions written (writer-decisions agent in Phase 2)
2. Sprint 19 entry in ROADMAP.md and MASTERPLAN.md not yet written
3. D-052 (graceful shutdown) is still open — this is a dependency
4. Implementation modules not yet created: `session.py`, `guardian.py` (extended), `notify.py`

**Critical architectural risk**: `client-detached` hook does NOT fire on Windows Terminal close (SIGHUP). Periodic checkpoints are the real safety net, not the hook.
