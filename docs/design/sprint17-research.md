# Sprint 17 Research: Claude Code Agent Teams → oa-cli

> Researcher: sprint17-researcher | Date: 2026-03-08
> Sources: Claude Code docs (code.claude.com/docs/en/agent-teams), oa-cli codebase
> Purpose: Direct input for Sprint 17 architect

---

## 1. What Claude Code Agent Teams Does — 6 Patterns

Agent Teams is an experimental Claude Code feature for coordinating multiple Claude Code instances. These are the 6 core patterns:

### P1 — Shared Task List with Self-Claiming
File-based task list under `~/.claude/tasks/{team-name}/`. Teammates read the list, atomically claim pending tasks (status: pending → in_progress), and mark them done. Claiming uses file locking to prevent two agents grabbing the same task simultaneously.

### P2 — Inter-Agent Messaging (DM + Broadcast)
Each agent has a mailbox. Teammates send direct messages (1:1) or broadcast to all. Broadcasts are delivered automatically — agents don't need to poll. Used for sharing findings, asking questions, and sending shutdown/approval requests.

### P3 — Task Dependencies + Auto-Unblock
Tasks have a `blockedBy` list (other task IDs). When a dependency completes, blocked tasks automatically move to pending. No manual intervention needed.

### P4 — Graceful Shutdown Protocol
Lead sends a shutdown request to a teammate. Teammate can **approve** (exits cleanly) or **reject** (continues working, explains why). Prevents work loss from hard kills. Replaces `kill` for coordinated teardown.

### P5 — Quality Hooks (TeammateIdle / TaskCompleted)
Two hook events:
- `TeammateIdle`: fires when teammate finishes and goes idle. Return exit code 2 to send feedback and keep agent working.
- `TaskCompleted`: fires when task is being marked done. Return exit code 2 to prevent completion and send feedback.
Enables automated QA gates without human intervention.

### P6 — Team Discovery via Config File
Team config at `~/.claude/teams/{team-name}/config.json` contains a `members` array with name, agent ID, and role. Any agent can read this file to discover teammates without going through the lead.

**Architecture summary:**

| Component    | File Path                              | Role                                      |
|:-------------|:---------------------------------------|:------------------------------------------|
| Team config  | `~/.claude/teams/{name}/config.json`   | Member list, lead identity, team metadata |
| Task list    | `~/.claude/tasks/{name}/{task}.json`   | Work items with status and dependencies   |
| Mailbox      | Per-agent inbox                        | DM and broadcast message delivery         |

---

## 2. Gap Analysis: oa-cli Has vs Missing

### Already Implemented

| Feature              | Module          | Status                                           |
|:---------------------|:----------------|:-------------------------------------------------|
| Team config CRUD     | `teams.py`      | `~/.oa/teams/{name}/config.json`, fcntl locking  |
| Task list CRUD       | `task_list.py`  | `~/.oa/tasks/{team}/{id}.json`, fcntl locking    |
| Task statuses        | `task_list.py`  | pending, in_progress, completed, blocked         |
| Task dependencies    | `task_list.py`  | `blocked_by` field stored — NOT enforced         |
| DM messaging         | `messaging.py`  | `~/.oa/messages/{agent}/inbox/`, fcntl locking   |
| Broadcast messaging  | `messaging.py`  | Delivers to all running agents' inboxes          |
| CLI: team commands   | `cli.py`        | `oa team create/list/add-member/delete`          |
| CLI: task commands   | `cli.py`        | `oa task create/list/done/update`                |
| CLI: messaging       | `cli.py`        | `oa send/inbox/broadcast`                        |
| Guardian hooks       | `guardians.py`  | `batch_complete`, `session_end` event hooks      |
| Hard kill            | `cli.py`        | `oa kill <name>` — closes tmux window            |

### Gaps (Sprint 17 must build)

| Gap | Priority | Effort |
|:----|:---------|:-------|
| **G1**: `claim_task()` — atomic claim (status + assigned_to in one locked write) | HIGH | S |
| **G2**: Auto-unblock — when task completes, check blocked_by and unblock dependents | HIGH | S |
| **G3**: `oa task claim <team> <task_id> --agent <name>` CLI command | HIGH | S |
| **G4**: Graceful shutdown — message type `shutdown_request`, teammate response | MEDIUM | M |
| **G5**: `TeammateIdle` + `TaskCompleted` hooks in existing guardian system | MEDIUM | M |
| **G6**: `oa team cleanup <name>` — remove tasks + config atomically | LOW | S |
| **G7**: TeamConfig: add `lead` and `status` fields | LOW | XS |
| **G8**: Message `type` field for structured protocol messages | LOW | XS |

S = <1h, M = 2-4h, XS = 15min

---

## 3. File Structure Proposal

oa-cli already uses the right structure. No changes needed for directories. Additions are in file schemas only.

```
~/.oa/
├── agents.json                    # AgentRecord state (existing)
├── teams/
│   └── {team-name}/
│       └── config.json            # TeamConfig (existing, needs lead + status fields)
├── tasks/
│   └── {team-name}/
│       └── {task_id}.json         # TaskRecord (existing, needs claimed_at + heartbeat)
├── messages/
│   ├── _broadcast/                # Broadcast log (existing)
│   └── {agent-name}/
│       └── inbox/
│           └── {ts}-{sender}.json # Message (existing, needs type field)
└── hooks/
    └── guardians.json             # Guardian hooks (existing)
```

---

## 4. State Schemas

### TaskRecord (current → proposed)

```json
{
  "id": "a1b2c3d4",
  "team": "sprint17",
  "title": "Implement claim_task()",
  "description": "Atomic task claiming with fcntl LOCK_EX",
  "status": "in_progress",
  "assigned_to": "agent-alpha",
  "blocked_by": [],
  "created_at": 1741420800.0,
  "updated_at": 1741420900.0,

  // NEW FIELDS (Sprint 17):
  "claimed_at": 1741420890.0,      // timestamp of last claim (null if not claimed)
  "heartbeat": 1741420910.0,       // last activity from assigned agent (null if unassigned)
  "completed_at": null             // set when status → completed
}
```

### TeamConfig (current → proposed)

```json
{
  "name": "sprint17",
  "members": ["agent-alpha", "agent-beta"],
  "created_at": 1741420800.0,
  "updated_at": 1741420900.0,

  // NEW FIELDS (Sprint 17):
  "lead": "orchestrator-1",        // name of the lead/orchestrator agent
  "status": "active"               // active | cleaned_up
}
```

### Message (current → proposed)

```json
{
  "from": "agent-alpha",
  "to": "agent-beta",
  "content": "I found the root cause, check src/auth.py:42",
  "timestamp": 1741420900.0,
  "read": false,

  // NEW FIELD (Sprint 17):
  "type": "message"
  // types: "message" | "shutdown_request" | "shutdown_response" |
  //        "plan_approval_request" | "plan_approval_response" |
  //        "task_claim_notification"
}
```

---

## 5. CLI Command Build Order (Dependencies First)

Build in this sequence — each step unblocks the next:

```
Step 1: task_list.py — claim_task() function
  └── Atomic: open with LOCK_EX, read, check pending, set in_progress + assigned_to, write
  └── Returns (success: bool, task: dict)
  └── Needed by: G1, G3

Step 2: task_list.py — auto-unblock in update_task()
  └── After setting status=completed, scan all tasks in team for blocked_by containing this id
  └── For each: if all blocked_by IDs are now completed → set status=pending
  └── Needed by: P3 (dependencies), G2

Step 3: cli.py — oa task claim <team> <task_id> [--agent <name>]
  └── Calls claim_task(); agent name defaults to $OA_AGENT_NAME env var
  └── Needed by: agents doing self-coordination

Step 4: messaging.py — add type field to send_message()
  └── Optional type param, default "message"
  └── Needed by: G4, G8

Step 5: guardians.py — TeammateIdle + TaskCompleted hooks
  └── Fire TeammateIdle when agent status transitions to done/failed
  └── Fire TaskCompleted when update_task() sets status=completed (before auto-unblock)
  └── Exit code 2 = block the transition (keep agent working / prevent task completion)
  └── Needed by: G5

Step 6: cli.py — graceful shutdown
  └── oa team shutdown <agent-name> — sends shutdown_request message
  └── Agent checks inbox, responds with shutdown_response (approved/rejected + reason)
  └── Lead CLI command waits up to 30s for response
  └── Needed by: G4

Step 7: cli.py — oa team cleanup <name>
  └── Check all team members are not running; fail if any are
  └── Delete ~/.oa/tasks/{name}/ and ~/.oa/teams/{name}/
  └── Needed by: G6
```

---

## 6. Risks and Edge Cases (File Locking on WSL/Windows)

### R1 — fcntl on WSL NTFS (CRITICAL)
`fcntl.flock()` works on WSL Linux filesystem (`~/.oa/` = `/home/freek/.oa/`). It **silently does nothing** on NTFS mounts (`/mnt/c/`). Currently safe because all state is under `~/.oa/`. Risk: if a user moves or symlinks `~/.oa/` to `/mnt/c/`, locking fails silently with no error.

**Mitigation**: Add preflight check in `setup` command:
```python
import os, stat
oa_dir_stat = os.statvfs(OA_DIR)
# f_type 0x6969 = NFS, 0x5346544e = NTFS via WSL — locking unreliable
```

### R2 — Race Condition in Current task_list.py
Current `update_task()` does: read with LOCK_SH → release → write with LOCK_EX. Between the two locks, another agent can modify the same file. `claim_task()` must use a **single fd** opened with `"r+"` mode and LOCK_EX throughout the entire read-modify-write cycle.

```python
def claim_task(team, task_id, agent_name):
    path = _task_path(team, task_id)
    with open(path, "r+") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            task = json.load(f)
            if task["status"] != "pending":
                return False, task  # already claimed
            task["status"] = "in_progress"
            task["assigned_to"] = agent_name
            task["claimed_at"] = time.time()
            f.seek(0)
            f.truncate()
            json.dump(task, f, indent=2)
            return True, task
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
```

### R3 — Stale In-Progress Tasks
If an agent crashes while claiming a task, the task stays `in_progress` forever. Blocked dependent tasks never unblock.

**Mitigation**: `heartbeat` field + auto-reset. Lead or orchestrator runs a background check: if `heartbeat` is older than N minutes and agent is not running → reset to `pending`. Add `oa task reset-stale <team>` command.

### R4 — Dependency Cycles
If task A has `blocked_by: [B]` and B has `blocked_by: [A]`, both stay blocked forever.

**Mitigation**: Validate at `create_task()` time. Build adjacency graph from existing tasks and run cycle detection (DFS) before writing. Raise `ValueError` if cycle detected.

### R5 — Shutdown Race
Agent receives shutdown_request but completes its current tool call first (which may write files). Lead has already started cleanup. Result: partial writes after cleanup.

**Mitigation**: Shutdown request includes a deadline. Agent responds with `eta_seconds`. Lead waits `max(30s, eta)` before proceeding. If no response in 60s, hard kill.

### R6 — teams.py write-without-atomic
`_write_config()` in `teams.py` opens with `"w"` (truncates immediately) then acquires LOCK_EX. Same pattern that `state.py` already fixed with temp-file + rename. Apply the same fix to both `teams.py` and `task_list.py`.

---

## Summary: What to Build First

| Sprint 17 Phase | Deliverables |
|:----------------|:-------------|
| Phase A (foundation) | `claim_task()` with single-fd locking, auto-unblock in `update_task()`, atomic write fix in `teams.py` + `task_list.py` |
| Phase B (CLI) | `oa task claim`, `type` field in messages, `oa team cleanup` |
| Phase C (hooks) | `TeammateIdle` + `TaskCompleted` in guardian system |
| Phase D (protocol) | Graceful shutdown (send → wait → response), heartbeat reset command |

Start with Phase A. It fixes the race condition risk and unlocks all coordination features that depend on it.
