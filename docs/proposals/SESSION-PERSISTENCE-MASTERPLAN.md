# Session Persistence — Definitive Masterplan

> **Status**: FINAL — ready for implementation agents
> **Date**: 2026-03-11
> **Input**: MASTERPLAN-RAW + quality review (MF-1..4) + platform/architecture/UX research
> **Target**: Sprint 19

---

## 1. Problem Statement

Closing a terminal (intentional or accidental) loses session context, agent state, uncommitted
work, and continuity. tmux already separates client from server — agents survive terminal close.
This feature adds the intelligence layer: what to save, when to clean up, how to resume.

## 2. Three Shutdown Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Stop** | `oa stop` | Full cleanup: snapshot → finish agents (timeout) → archive → close tmux |
| **Detach** | Terminal close / `Ctrl+b d` | Light snapshot, agents keep running, guardian monitors |
| **Crash** | Laptop lid / kernel panic / kill -9 | No cleanup — periodic checkpoints are the safety net |

**Critical platform finding**: On Windows Terminal + WSL2, closing the window sends SIGHUP.
The tmux `client-detached` hook does NOT fire. The tmux server survives (WSL2 background tasks),
but the hook is unreliable for the primary "user clicks X" scenario. Periodic checkpoints are
therefore the PRIMARY safety mechanism, not the hook.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  tmux session "oa"                                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  dashboard   │  │  oa-guardian  │  │  agent windows    │  │
│  │  watch oa    │  │  checkpoint   │  │  worker-1, ...    │  │
│  │  status      │  │  + heartbeat  │  │                   │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│                                                             │
│  tmux set-hook client-detached →                            │
│    python -m open_agents.session_cleanup --mode detach      │
└─────────────────────────────────────────────────────────────┘

Storage layout:
  ~/.oa/
  ├── agents.json              # Agent CRUD (existing, unchanged)
  ├── config.json              # Config (extended with on_disconnect)
  ├── session.lock             # Present = session active or unclean shutdown
  ├── session.heartbeat        # Timestamp, written by guardian every 5 min
  ├── sessions/
  │   ├── 20260311T143200Z.json   # Session snapshots (one per event)
  │   └── ...
  ├── checkpoints/             # Per-agent checkpoints (existing, unchanged)
  └── logs/                    # Archived session logs
```

---

## 4. Must-Fix Resolutions

### MF-1: tmux Hook → Python Bridge

**Decision**: tmux hook calls `oa cleanup` CLI command (thin wrapper around `session_cleanup()`).

The tmux `client-detached` hook runs a shell command, not a Python callable. hooks.py is
in-memory only — no persistence, no external trigger. The bridge is simple:

```python
# In tmux.py — register hook during start_session()
def _register_detach_hook() -> None:
    """Register tmux client-detached hook to trigger session cleanup."""
    cmd = "python3 -m open_agents.session_cleanup --mode detach"
    _tmux(f"set-hook -t {SESSION_NAME} client-detached 'run-shell \"{cmd}\"'")
```

hooks.py gets three new events (`on_session_end`, `on_detach`, `on_resume`) added to
`VALID_EVENTS`. The session_cleanup module triggers these after performing its work,
allowing optional user-registered callbacks. But the PRIMARY trigger is the tmux hook →
CLI command path, not the in-memory hook system.

```python
# hooks.py — extend VALID_EVENTS
VALID_EVENTS = {
    "on_idle", "on_task_complete", "on_error", "on_batch_complete",
    "on_session_end", "on_detach", "on_resume",
}
```

### MF-2: Guardian Crash Resilience

**Decision**: tmux `set-hook` as primary (no guardian needed for detach handling).
Heartbeat file as secondary for crash detection.

The guardian daemon is NOT required for detach handling — the tmux hook fires independently.
The guardian's job is periodic checkpoints and heartbeat writing only.

If the guardian crashes:
1. The bash wrapper loop in the `oa-guardian` tmux window restarts it within 5 seconds.
2. `oa status` checks for the guardian window and warns if missing.
3. `oa start` re-creates the guardian window if the tmux session exists but guardian is gone.

If the guardian is dead AND a crash occurs: the last periodic checkpoint (up to 5 min old)
is the recovery point. This is acceptable — 5 min of lost checkpoint data is the worst case.

### MF-3: Session Records Separate from agents.json

**Decision**: Session records stored in `~/.oa/sessions/<ts>.json`, completely separate
from `agents.json`.

Rationale:
- Zero contention between session writes and agent writes
- Natural retention: delete files by age
- Crash-safe: partial write corrupts one session file, not agent state
- Query pattern: only need most recent file at `oa start`

### MF-4: Timeout Default Behavior

**Decision**: After `oa stop` timeout, agents are NOT killed. State snapshot is saved.
`oa start` detects them on next launch. Killing requires `oa stop --force`.

```
oa stop (default, timeout=300s):
  1. Snapshot agent state immediately
  2. Wait up to 300s for running agents to finish
  3. After timeout: save final snapshot, archive logs, close tmux
  4. Agents that were still running → their tmux windows are gone (session closed)
     but their state is preserved in the session record

oa stop --force:
  1. Snapshot agent state
  2. Kill all agent tmux windows immediately
  3. Archive logs, close tmux session
```

---

## 5. Data Structures

### SessionRecord

```python
@dataclass
class SessionRecord:
    """Snapshot of session state at a point in time."""
    schema_version: int = 1
    session_id: str = ""           # ISO timestamp: 20260311T143200Z
    timestamp: str = ""            # ISO 8601 full
    shutdown_mode: str = ""        # "stop" | "detach" | "crash" | "periodic"
    agents: dict = field(default_factory=dict)      # name → AgentRecord as dict
    agent_summary: dict = field(default_factory=dict)  # total/running/done/failed
    git_state: dict = field(default_factory=dict)   # branch, uncommitted_files, last_commit
    project_root: str = ""
```

### ShutdownMode enum

```python
class ShutdownMode:
    CLEAN = "clean"     # No previous session or cleanly stopped
    DETACH = "detach"   # Terminal closed, tmux session still alive
    CRASH = "crash"     # tmux session dead, lock file present
```

### Detection logic at `oa start`

```
session.lock exists?
├── NO  → ShutdownMode.CLEAN → start fresh
└── YES → Previous session not cleanly stopped
    ├── tmux "oa" session alive?
    │   ├── YES → ShutdownMode.DETACH → print resume banner, reattach
    │   └── NO  → ShutdownMode.CRASH → show recovery info
    └── Load latest session record for context
```

---

## 6. New Modules

### 6.1 session.py — Lock + Heartbeat + Detection

```python
"""Session lifecycle: lock file, heartbeat, shutdown detection."""

import time
from pathlib import Path
from .config import OA_DIR
from .tmux import session_exists

LOCK_FILE = OA_DIR / "session.lock"
HEARTBEAT_FILE = OA_DIR / "session.heartbeat"
HEARTBEAT_STALE_SECONDS = 600  # 10 minutes

class ShutdownMode:
    CLEAN = "clean"
    DETACH = "detach"
    CRASH = "crash"

def detect_previous_shutdown() -> tuple[str, dict]:
    """Detect how the previous session ended. Returns (mode, info)."""
    if not LOCK_FILE.exists():
        return ShutdownMode.CLEAN, {}
    info = {"lock_exists": True}
    if session_exists():
        info["tmux_alive"] = True
        return ShutdownMode.DETACH, info
    info["tmux_alive"] = False
    if HEARTBEAT_FILE.exists():
        try:
            last_beat = float(HEARTBEAT_FILE.read_text().strip())
            info["heartbeat_age_seconds"] = time.time() - last_beat
        except (ValueError, OSError):
            info["heartbeat_corrupt"] = True
    return ShutdownMode.CRASH, info

def acquire_session_lock() -> None:
    OA_DIR.mkdir(parents=True, exist_ok=True)
    LOCK_FILE.write_text(str(time.time()))

def release_session_lock() -> None:
    LOCK_FILE.unlink(missing_ok=True)
    HEARTBEAT_FILE.unlink(missing_ok=True)

def write_heartbeat() -> None:
    OA_DIR.mkdir(parents=True, exist_ok=True)
    HEARTBEAT_FILE.write_text(str(time.time()))
```

### 6.2 session_store.py — Session Record CRUD

```python
"""Session record storage: ~/.oa/sessions/<ts>.json"""

import json
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from pathlib import Path
from .config import OA_DIR
from .state import load_agents

SESSIONS_DIR = OA_DIR / "sessions"

@dataclass
class SessionRecord:
    schema_version: int = 1
    session_id: str = ""
    timestamp: str = ""
    shutdown_mode: str = ""
    agents: dict = field(default_factory=dict)
    agent_summary: dict = field(default_factory=dict)
    git_state: dict = field(default_factory=dict)
    project_root: str = ""

def save_session_record(shutdown_mode: str, git_state: dict | None = None) -> Path:
    """Save a session snapshot. Returns path to created file."""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    agents = load_agents()
    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%dT%H%M%SZ")
    record = SessionRecord(
        session_id=ts,
        timestamp=now.isoformat(),
        shutdown_mode=shutdown_mode,
        agents={n: asdict(r) for n, r in agents.items()},
        agent_summary={
            "total": len(agents),
            "running": sum(1 for a in agents.values() if a.status == "running"),
            "done": sum(1 for a in agents.values() if a.status == "done"),
            "failed": sum(1 for a in agents.values()
                         if a.status in ("failed", "error")),
        },
        git_state=git_state or {},
    )
    path = SESSIONS_DIR / f"{ts}.json"
    path.write_text(json.dumps(asdict(record), indent=2))
    return path

def load_latest_session() -> dict | None:
    """Load the most recent session record."""
    if not SESSIONS_DIR.exists():
        return None
    files = sorted(SESSIONS_DIR.glob("*.json"), reverse=True)
    if not files:
        return None
    try:
        return json.loads(files[0].read_text())
    except Exception:
        return None

def cleanup_old_sessions(retention_days: int = 30) -> int:
    """Delete session files older than retention_days."""
    if not SESSIONS_DIR.exists():
        return 0
    import time
    threshold = time.time() - (retention_days * 86400)
    deleted = 0
    for f in SESSIONS_DIR.glob("*.json"):
        if f.stat().st_mtime < threshold:
            f.unlink()
            deleted += 1
    return deleted
```

### 6.3 session_cleanup.py — Entry Point for tmux Hook + oa stop

```python
"""Session cleanup — callable from tmux hook and oa stop."""

import argparse
import subprocess
from .state import load_agents
from .session import release_session_lock
from .session_store import save_session_record

def _capture_git_state() -> dict:
    """Capture current git branch and uncommitted files."""
    state = {}
    try:
        r = subprocess.run(["git", "branch", "--show-current"],
                           capture_output=True, text=True, timeout=5)
        state["branch"] = r.stdout.strip() if r.returncode == 0 else ""
        r = subprocess.run(["git", "status", "--porcelain"],
                           capture_output=True, text=True, timeout=5)
        if r.returncode == 0:
            state["uncommitted_files"] = [
                line[3:] for line in r.stdout.strip().split("\n") if line
            ]
        r = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                           capture_output=True, text=True, timeout=5)
        state["last_commit"] = r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        pass
    return state

def session_cleanup(mode: str = "detach") -> dict:
    """Perform cleanup for the given shutdown mode.

    Args:
        mode: "stop" (full cleanup) or "detach" (snapshot only)

    Returns:
        Summary dict of actions taken.
    """
    summary = {"mode": mode, "actions": []}

    # Always: snapshot agent state + git state
    git_state = _capture_git_state()
    path = save_session_record(shutdown_mode=mode, git_state=git_state)
    summary["actions"].append("state_snapshot")
    summary["snapshot_path"] = str(path)

    if mode == "stop":
        release_session_lock()
        summary["actions"].append("lock_released")

    # mode == "detach": keep lock, keep tmux alive, guardian continues
    return summary

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["stop", "detach"], default="detach")
    args = parser.parse_args()
    result = session_cleanup(args.mode)
    print(f"Cleanup: {result}")
```

### 6.4 guardian.py — Periodic Checkpoint Daemon

```python
"""Guardian daemon — runs in oa-guardian tmux window."""

import time
from .state import load_agents
from .checkpoint import save_checkpoint
from .session_store import save_session_record
from .session import write_heartbeat
from .lifecycle import check_agent
from .config import load_config

def run_guardian() -> None:
    """Periodic checkpoint + heartbeat loop. Self-healing via bash wrapper."""
    config = load_config()
    interval = config.get("periodic_checkpoint_minutes", 5) * 60

    while True:
        agents = load_agents()

        # Layer 1: Per-agent checkpoints
        for name, rec in agents.items():
            check_agent(name)
            if rec.status == "running":
                save_checkpoint(name, {
                    "task": rec.task, "model": rec.model,
                    "created_at": rec.created_at, "status": "running",
                })

        # Layer 2: Session-level snapshot
        save_session_record(shutdown_mode="periodic")

        # Layer 3: Heartbeat for crash detection
        write_heartbeat()

        time.sleep(interval)

if __name__ == "__main__":
    run_guardian()
```

### 6.5 notify.py — Desktop Notifications

```python
"""Cross-platform desktop notifications (WSL2 → Windows toast)."""

import shutil
import subprocess
import sys

def send_notification(title: str, message: str) -> bool:
    """Send a desktop notification. Returns True if sent."""
    if sys.platform == "linux":
        ps = shutil.which("powershell.exe")
        if ps:  # WSL2
            safe_title = title.replace("'", "''")
            safe_msg = message.replace("'", "''")
            subprocess.Popen([
                ps, "-Command",
                f"New-BurntToastNotification -Text '{safe_title}', '{safe_msg}'"
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        ns = shutil.which("notify-send")
        if ns:  # Native Linux with display
            subprocess.Popen([ns, title, message])
            return True
    return False
```

---

## 7. Existing Module Changes

### 7.1 tmux.py — Guardian Window + Detach Hook

```python
# Extend start_session():
def start_session() -> bool:
    if session_exists():
        return False
    _tmux(f"new-session -d -s {SESSION_NAME} -n dashboard")
    _tmux(f"send-keys -t {SESSION_NAME}:dashboard 'watch -t -n3 oa status' Enter")

    # Guardian window with self-healing wrapper
    _tmux(f"new-window -t {SESSION_NAME} -n oa-guardian")
    _tmux(
        f"send-keys -t {SESSION_NAME}:oa-guardian "
        f"'while true; do python3 -m open_agents.guardian; "
        f"echo Guardian restarting in 5s...; sleep 5; done' Enter"
    )

    # Register detach hook → session cleanup
    cmd = "python3 -m open_agents.session_cleanup --mode detach"
    _tmux(f"set-hook -t {SESSION_NAME} client-detached 'run-shell \"{cmd}\"'")

    # Acquire session lock
    from .session import acquire_session_lock
    acquire_session_lock()

    return True

def guardian_is_alive() -> bool:
    """Check if the oa-guardian tmux window exists."""
    result = _tmux(
        f"list-windows -t {SESSION_NAME} -F '#{{window_name}}'",
        check=False,
    )
    if result.returncode != 0:
        return False
    return "oa-guardian" in result.stdout.strip().split("\n")
```

### 7.2 config.py — New Config Keys

```python
DEFAULT_CONFIG = {
    "version": "0.2.0",
    "default_model": "claude",
    "max_workers": 5,
    "timeout_minutes": 60,
    "max_depth": 5,
    "skill_packages": [],
    "agents_library": "",
    # Session persistence (new)
    "periodic_checkpoint_minutes": 5,
    "session_log_max_mb": 50,
    "on_disconnect": {
        "state_snapshot": True,
        "git_stash": False,
        "notify_desktop": True,
        "retention_days": 30,
        "cleanup_timeout_seconds": 300,
        "session_summary": False,
        "auto_doc_update": False,
    },
}
```

### 7.3 hooks.py — Three New Events

Add `on_session_end`, `on_detach`, `on_resume` to `VALID_EVENTS` and add corresponding
decorator functions. No other structural changes — the in-memory hook system remains as-is
for optional user callbacks.

---

## 8. Resume UX at `oa start`

**Automatic resume, `--fresh` to opt out.** No interactive menu.

```
$ oa start

  Session resumed: 2026-03-11 14:32 → 16:47 (2h 15m)
  Agents: 3 done · 1 still running · 1 failed
  Git:    2 uncommitted files  (run `oa stash-show` to review)
  Run `oa session` for details  ·  `oa start --fresh` to discard

  Starting tmux session...
```

After a clean `oa stop`, show a shorter one-liner:
```
  Last session: 2026-03-10 — 5 agents completed  ·  `oa session` for details
```

New CLI commands:
- `oa start --fresh` — discard previous session, start clean
- `oa session` — show full summary of last/current session
- `oa session list` — list recent session records
- `oa session clean` — delete session records older than `retention_days`

---

## 9. `oa stop` Flow (Revised)

```
oa stop [--force]
│
├── Phase 1: SNAPSHOT (instant)
│   ├── save_session_record(shutdown_mode="stop")
│   ├── _capture_git_state()
│   └── Save immediately — no waiting
│
├── Phase 2: FINISH (max cleanup_timeout_seconds, default 300)
│   ├── Wait for running agents to complete
│   ├── Collect output from done agents
│   ├── On timeout: save updated snapshot, proceed
│   └── Agents NOT killed (unless --force)
│
├── Phase 3: ARCHIVE
│   ├── Archive session logs → ~/.oa/logs/
│   ├── Clean old sessions (retention_days)
│   └── Release session lock
│
├── Phase 4: NOTIFY (if notify_desktop: true)
│   └── send_notification("oa-cli", "Session ended — N agents done")
│
└── Phase 5: CLOSE
    └── tmux kill-session -t oa
```

---

## 10. Notification Rules

1. **Only on completion** — never on progress or start
2. **Only when user is absent** — check tmux client-attached status first
3. **One per session** — batch all agent completions into one notification
4. **< 10 words** — e.g. `oa-cli: 4 done, 1 failed — review needed`
5. **Respect OA_SILENT=1** — suppress all notifications
6. **Fail silently** — if PowerShell/BurntToast unavailable, skip without error

---

## 11. Implementation Tasks (for agents)

Implementation is organized in 3 waves, ~12 agent tasks total.

### Wave 1: Foundation (6 tasks)

| # | Task | Agent Instruction | Files |
|---|------|-------------------|-------|
| W1.1 | session.py | Create `oa-cli/src/open_agents/session.py` with `ShutdownMode`, `detect_previous_shutdown()`, `acquire_session_lock()`, `release_session_lock()`, `write_heartbeat()`. Use the code from Section 6.1 as spec. Write unit tests in `tests/test_session.py`. | session.py, test_session.py |
| W1.2 | session_store.py | Create `oa-cli/src/open_agents/session_store.py` with `SessionRecord` dataclass, `save_session_record()`, `load_latest_session()`, `cleanup_old_sessions()`. Use Section 6.2 as spec. Write unit tests. | session_store.py, test_session_store.py |
| W1.3 | session_cleanup.py | Create `oa-cli/src/open_agents/session_cleanup.py` with `session_cleanup()` function and `__main__` entry point. Use Section 6.3 as spec. Must handle both `--mode stop` and `--mode detach`. Write tests. | session_cleanup.py, test_session_cleanup.py |
| W1.4 | guardian.py | Create `oa-cli/src/open_agents/guardian.py` with `run_guardian()`. Uses checkpoint.py, session_store.py, session.py. Must be callable as `python -m open_agents.guardian`. Use Section 6.4 as spec. | guardian.py |
| W1.5 | tmux.py changes | Modify `start_session()` to: (a) create oa-guardian window with bash restart loop, (b) register client-detached hook, (c) call `acquire_session_lock()`. Add `guardian_is_alive()`. Use Section 7.1 as spec. | tmux.py, test_tmux.py |
| W1.6 | config.py changes | Add `periodic_checkpoint_minutes`, `session_log_max_mb`, and `on_disconnect` dict to `DEFAULT_CONFIG`. Use Section 7.2 as spec. | config.py |

### Wave 2: Resume + Stop (4 tasks)

| # | Task | Agent Instruction | Files |
|---|------|-------------------|-------|
| W2.1 | `oa start` resume flow | In the CLI entry point for `oa start`: call `detect_previous_shutdown()`, print resume banner (non-blocking), handle `--fresh` flag. If DETACH: reattach tmux. If CRASH: show recovery info + latest session record. Use Section 8 as spec. | cli.py (or main entry point) |
| W2.2 | `oa stop` revised flow | Rewrite `oa stop` to follow the 5-phase flow from Section 9. Add `--force` flag. Respect `cleanup_timeout_seconds`. Call `session_cleanup(mode="stop")` then close tmux. | cli.py, session_cleanup.py |
| W2.3 | hooks.py extension | Add `on_session_end`, `on_detach`, `on_resume` to VALID_EVENTS. Add decorator functions. Trigger from session_cleanup.py and oa start resume path. | hooks.py, test_hooks.py |
| W2.4 | `oa session` commands | Add CLI commands: `oa session` (show current/last), `oa session list` (list records), `oa session clean` (prune old). Use session_store.py functions. | cli.py |

### Wave 3: Notifications + Polish (2 tasks)

| # | Task | Agent Instruction | Files |
|---|------|-------------------|-------|
| W3.1 | notify.py | Create `oa-cli/src/open_agents/notify.py` with `send_notification()`. WSL2: use powershell.exe + BurntToast. Linux: notify-send. Respect OA_SILENT=1. Use Section 6.5 as spec. Integrate into guardian (notify on all-agents-done) and oa stop. | notify.py, test_notify.py |
| W3.2 | Integration tests | Write integration tests covering: (a) start → detach → resume cycle, (b) start → stop cycle, (c) crash detection via stale lock file, (d) periodic checkpoint creates session records, (e) old session cleanup. Mock tmux calls. | tests/test_session_integration.py |

---

## 12. Configuration Summary

**Visible (Tier 1):**

| Key | Default | Description |
|-----|---------|-------------|
| `on_disconnect.state_snapshot` | `true` | Save agent state on disconnect |
| `on_disconnect.notify_desktop` | `true` | Desktop notification when agents finish |
| `on_disconnect.git_stash` | `false` | Auto-stash uncommitted work (opt-in) |
| `on_disconnect.retention_days` | `30` | How long session files are kept |

**Hidden (Tier 2):**

| Key | Default | Description |
|-----|---------|-------------|
| `on_disconnect.cleanup_timeout_seconds` | `300` | Max wait for agents on `oa stop` |
| `on_disconnect.session_summary` | `false` | AI-generated session summary (costs tokens) |
| `on_disconnect.auto_doc_update` | `false` | Auto-update ROADMAP/LESSONS |

**Top-level:**

| Key | Default | Description |
|-----|---------|-------------|
| `periodic_checkpoint_minutes` | `5` | Guardian checkpoint interval |
| `session_log_max_mb` | `50` | Max log archive size |

**Principle**: Actions that modify the repo or cost money are OFF by default.

---

## 13. Security

- `~/.oa/sessions/` directory: permissions 700 (owner-only)
- Session records may contain agent output with secrets — scrub for known patterns
  (`ghp_`, `sk-`, `AKIA`, etc.) before writing
- Git stash can contain sensitive files — warn user when `git_stash: true`
- Retention policy (30 days default) prevents indefinite secret accumulation

---

## 14. Out of Scope

| Item | Reason |
|------|--------|
| Cloud sync of sessions | Local-only tool (D-048) |
| AI-generated session summary | Wave 3+ / separate feature |
| Auto doc-update (ROADMAP/LESSONS) | Separate "Session Intelligence" feature |
| Token/cost tracking | No API access — subscription model |
| Auto-commit on shutdown | Too dangerous as default |
| Multi-user session sharing | Single-user tool |

---

## 15. Dependencies

- **Sprint 17 (Agent Teams)**: Graceful shutdown protocol (D-052) is a soft dependency.
  Session persistence works without it but benefits from the `shutdown_request` message type
  for graceful agent wrap-up during `oa stop`.
- **portalocker**: Recommended for cross-platform file locking (replaces `fcntl` in state.py
  and checkpoint.py). Not blocking for WSL2-only users but should be done in this sprint.

---

## 16. Disk Space Estimate

- Session record: ~1-2 KB each
- Periodic checkpoint (every 5 min, 8 hour session): ~96 records × 2 KB = ~192 KB/day
- 30-day retention: ~5.6 MB
- Per-agent checkpoints: ~1 KB each, cleaned up with agent
- Total steady-state: < 10 MB

Cleanup: `cleanup_old_sessions(retention_days=30)` runs on `oa stop` and on `oa session clean`.
