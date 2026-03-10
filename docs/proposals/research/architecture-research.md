# Session Persistence — Architecture Research

> **Date**: 2026-03-11
> **Scope**: Q2, Q3, Q7, Q8, Q9, Q10 from SESSION-PERSISTENCE-MASTERPLAN-RAW.md
> **Method**: Analysis of actual codebase (state.py, checkpoint.py, lifecycle.py, hooks.py, tmux.py, config.py)

---

## Q2: Daemon Within tmux Session

### Analysis

`tmux.py` reveals a minimal tmux abstraction. `start_session()` creates a session
named `"oa"` with a single window `"dashboard"` running `watch -t -n3 oa status`.
There is no mechanism for additional persistent windows or background daemons.

tmux natively supports running any process in a named window. A Python script
launched in its own window survives terminal disconnects and runs as long as the
tmux server lives.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A: Dedicated tmux window `oa-guardian`** | Visible in `tmux list-windows`, killable, logs capturable via `capture-pane` | Uses a window slot; user might accidentally close it |
| **B: Background subprocess from `oa start`** | Invisible to user, no window clutter | Not managed by tmux; harder to inspect; dies if parent dies before detach |
| **C: systemd/cron-based** | Survives even tmux death | Platform-dependent (no systemd on Windows/WSL1); overkill for this use case |

### Recommendation

**Option A** — dedicated tmux window. It integrates naturally with the existing
tmux-based architecture, is inspectable, and restarts automatically with `oa start`.

### Self-healing on guardian crash

The guardian script itself can crash. Two mitigations:

1. **Wrapper loop**: The tmux window runs a bash while-loop that restarts the
   Python guardian on exit.
2. **Health check in `oa status`**: If the guardian window is missing, `oa status`
   warns the user and `oa start` re-creates it.

### Code Sketch

```python
# In tmux.py — extend start_session()

def start_session() -> bool:
    if session_exists():
        return False
    _tmux(f"new-session -d -s {SESSION_NAME} -n dashboard")
    _tmux(
        f"send-keys -t {SESSION_NAME}:dashboard "
        f"'watch -t -n3 oa status' Enter"
    )
    # Guardian window with self-healing wrapper
    _tmux(f"new-window -t {SESSION_NAME} -n oa-guardian")
    _tmux(
        f"send-keys -t {SESSION_NAME}:oa-guardian "
        f"'while true; do python -m open_agents.guardian; "
        f"echo \"Guardian crashed, restarting in 5s...\"; sleep 5; done' Enter"
    )
    return True


def guardian_is_alive() -> bool:
    """Check if the oa-guardian window exists."""
    result = _tmux(
        f"list-windows -t {SESSION_NAME} -F '#{{window_name}}'",
        check=False,
    )
    if result.returncode != 0:
        return False
    return "oa-guardian" in result.stdout.strip().split("\n")
```

```python
# guardian.py — new module

import time
from .state import load_agents
from .checkpoint import save_checkpoint
from .lifecycle import check_agent

INTERVAL_SECONDS = 300  # 5 minutes

def run_guardian():
    """Periodic checkpoint daemon. Runs inside tmux oa-guardian window."""
    while True:
        agents = load_agents()
        for name, rec in agents.items():
            # Refresh status
            check_agent(name)
            # Periodic checkpoint for running agents
            if rec.status == "running":
                save_checkpoint(name, {
                    "task": rec.task,
                    "model": rec.model,
                    "created_at": rec.created_at,
                    "status": "running",
                })
        _save_session_heartbeat()
        time.sleep(INTERVAL_SECONDS)

def _save_session_heartbeat():
    """Write a heartbeat timestamp to ~/.oa/session.lock."""
    from .config import OA_DIR
    lock_file = OA_DIR / "session.lock"
    lock_file.write_text(str(time.time()))

if __name__ == "__main__":
    run_guardian()
```

---

## Q3: Hard Crash vs Clean Detach Detection

### Analysis

Currently `start_session()` in `tmux.py` only checks `session_exists()` (whether
the tmux session named `"oa"` is alive). There is no mechanism to distinguish
between a clean `oa stop`, a terminal detach, or a hard crash. No lock files,
PID files, or heartbeat mechanisms exist.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A: Lock file `~/.oa/session.lock`** | Simple; deleted on clean stop; existence at start = crash | Stale on hard crash (that's the point); must handle edge cases |
| **B: PID file + process check** | Can verify if process is truly dead | PID reuse is possible (rare but real); more complex |
| **C: Heartbeat file (timestamp)** | Distinguishes crash from detach: stale heartbeat = crash, recent = detach | Requires guardian daemon (Q2) to write heartbeats |
| **D: Lock + heartbeat combined** | Lock presence = not-clean-shutdown; heartbeat staleness = crash vs detach | Slightly more complex, but most informative |

### Recommendation

**Option D** — combined lock + heartbeat. The lock file signals "session is active
or was not cleanly stopped." The heartbeat timestamp (written by guardian every 5
minutes) distinguishes a crash (stale heartbeat) from a detach (recent heartbeat,
tmux session still alive).

### Detection Logic at `oa start`

```
Lock file exists?
├── NO  → Clean previous shutdown. Start fresh.
└── YES → Previous session was NOT cleanly stopped.
    ├── tmux "oa" session alive?
    │   ├── YES → User detached (closed terminal). Resume.
    │   └── NO  → Hard crash or `kill -9`.
    │       ├── Heartbeat < 10 min old? → Recent crash. Show recovery.
    │       └── Heartbeat > 10 min old? → Old crash. Show recovery + warning.
    └── Remove stale lock, show session summary.
```

### Code Sketch

```python
# session.py — new module

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
    """Detect how the previous session ended.

    Returns (mode, info_dict).
    """
    if not LOCK_FILE.exists():
        return ShutdownMode.CLEAN, {}

    info = {"lock_exists": True}

    # tmux session still alive?
    if session_exists():
        info["tmux_alive"] = True
        return ShutdownMode.DETACH, info

    # tmux dead — check heartbeat staleness
    info["tmux_alive"] = False
    if HEARTBEAT_FILE.exists():
        try:
            last_beat = float(HEARTBEAT_FILE.read_text().strip())
            age = time.time() - last_beat
            info["heartbeat_age_seconds"] = age
            info["heartbeat_stale"] = age > HEARTBEAT_STALE_SECONDS
        except (ValueError, OSError):
            info["heartbeat_corrupt"] = True

    return ShutdownMode.CRASH, info

def acquire_session_lock() -> None:
    """Create the session lock file."""
    OA_DIR.mkdir(parents=True, exist_ok=True)
    LOCK_FILE.write_text(str(time.time()))

def release_session_lock() -> None:
    """Remove the session lock file (clean shutdown)."""
    LOCK_FILE.unlink(missing_ok=True)
    HEARTBEAT_FILE.unlink(missing_ok=True)

def write_heartbeat() -> None:
    """Update the heartbeat timestamp. Called by guardian daemon."""
    OA_DIR.mkdir(parents=True, exist_ok=True)
    HEARTBEAT_FILE.write_text(str(time.time()))
```

---

## Q7: Cleanup as Separate Script vs in CLI

### Analysis

The current CLI is defined in `oa-cli/src/open_agents/`. `lifecycle.py` already
has cleanup functions: `cleanup_idle_agents()`, `clean_finished()`, and
`kill_agent()`. These are called from CLI commands. There is no separate entry
point for cleanup.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A: `oa-cleanup` separate entry point** | Can be called from tmux hooks without full CLI boot; testable in isolation | Another binary to install and maintain; discoverability issue |
| **B: `oa stop --cleanup`** | Discoverable; part of existing CLI; no new entry point | Requires full CLI initialization; harder to call from tmux hook scripts |
| **C: Function in lifecycle.py, callable from tmux hook** | Maximum reuse; testable as unit; tmux hook calls `python -m open_agents.cleanup` | Need a thin `__main__` wrapper; slightly indirect |

### Recommendation

**Option C** — cleanup as a function in lifecycle.py with a thin `__main__`-style
module for tmux hook invocation. This maximizes code reuse (the function is also
called by `oa stop`) while allowing direct invocation from tmux hooks.

The tmux `client-detached` hook would run:
```bash
python -m open_agents.session_cleanup --mode detach
```

And `oa stop` would call the same function internally with `--mode stop`.

### Code Sketch

```python
# session_cleanup.py — thin entry point for tmux hooks

import argparse
import sys
from .state import load_agents, save_agents
from .session import release_session_lock, ShutdownMode

def session_cleanup(mode: str = "detach") -> dict:
    """Perform cleanup appropriate for the shutdown mode.

    Args:
        mode: "stop" (full cleanup) or "detach" (snapshot only)

    Returns:
        Summary dict of actions taken.
    """
    summary = {"mode": mode, "actions": []}

    # Always: snapshot agent state
    agents = load_agents()
    snapshot = _create_session_snapshot(agents)
    summary["actions"].append("state_snapshot")
    summary["snapshot_path"] = str(snapshot)

    if mode == "stop":
        # Full cleanup: release lock, archive logs
        release_session_lock()
        summary["actions"].append("lock_released")

    # mode == "detach": keep lock, keep tmux alive
    # Guardian daemon continues running

    return summary

def _create_session_snapshot(agents) -> "Path":
    """Serialize current agent state to ~/.oa/sessions/<ts>.json."""
    from datetime import datetime, timezone
    from pathlib import Path
    from .config import OA_DIR
    import json
    from dataclasses import asdict

    sessions_dir = OA_DIR / "sessions"
    sessions_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    path = sessions_dir / f"{ts}.json"
    data = {name: asdict(rec) for name, rec in agents.items()}
    path.write_text(json.dumps(data, indent=2))
    return path

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["stop", "detach"], default="detach")
    args = parser.parse_args()
    result = session_cleanup(args.mode)
    print(f"Cleanup complete: {result}")
```

---

## Q8: Concurrent Writes Prevention

### Analysis

`state.py` uses two concurrency mechanisms:

1. **`fcntl.flock(LOCK_SH)`** on reads — shared lock allowing concurrent readers.
2. **Atomic write via `tempfile.mkstemp()` + `Path.replace()`** on writes — the
   `save_agents()` function writes to a temp file then atomically renames it.

The atomic write pattern is solid: `Path.replace()` is an atomic filesystem
operation on POSIX. Two concurrent writers will each write their own temp file;
the last `replace()` wins. However, this creates a **lost update** problem:

```
Timeline:
  T1: cleanup reads agents.json          → {A: running, B: done}
  T2: agent update reads agents.json     → {A: running, B: done}
  T3: cleanup writes {A: running}        → (removed B)
  T4: agent update writes {A: done, B: done} → (overwrites cleanup's removal)
```

Neither writer sees the other's changes. The atomic write prevents corruption
but not logical conflicts.

**Note**: `fcntl` does NOT work on native Windows. It only works in WSL. Since
oa-cli targets WSL/Linux environments (tmux dependency), this is acceptable but
should be documented.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A: Current approach (atomic write, no locking on write)** | Simple; prevents corruption | Lost updates possible between concurrent writers |
| **B: Exclusive lock around read-modify-write** | Prevents lost updates | fcntl locks are advisory only; adds latency; must avoid deadlocks |
| **C: Separate files for session records** | Eliminates contention entirely for session data | Agents still share agents.json; doesn't solve agent-vs-agent conflicts |
| **D: Compare-and-swap with mtime check** | Detects conflicts; can retry | More complex; still needs retry logic |

### Recommendation

**Option C + B combined**: Session records go in a SEPARATE file (see Q9), which
eliminates the most dangerous concurrent write scenario (cleanup vs agent update).
For agent-vs-agent write conflicts within `agents.json`, add an exclusive lock
around the read-modify-write cycle in `update_agent()`:

```python
def update_agent_locked(name: str, **kwargs) -> Optional[AgentRecord]:
    """Atomic read-modify-write with exclusive file lock."""
    _ensure_dir()
    with open(STATE_FILE, "r+") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            raw = json.load(f)
            if name not in raw:
                return None
            for k, v in kwargs.items():
                raw[name][k] = v
            f.seek(0)
            f.truncate()
            json.dump(raw, f, indent=2)
            f.write("\n")
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    # Invalidate cache
    global _cache
    _cache = None
    return AgentRecord(**raw[name])
```

This is a targeted fix: only `update_agent()` needs the locked pattern, since
`add_agent()` and `remove_agent()` are less contention-prone (called from the
orchestrator, not from agents themselves).

---

## Q9: Session Record Storage

### Analysis

Currently all agent data lives in a single `~/.oa/agents.json`. There is no
session-level storage. The masterplan proposes session records containing agent
snapshots, git state, timestamps, and shutdown mode.

### Options

| Option | Growth | Query Speed | Concurrent Access | Cleanup |
|--------|--------|-------------|-------------------|---------|
| **A: In agents.json** | Unbounded growth of one file | Fast (single read) | Worst — session writes conflict with agent writes | Hard — must parse entire file |
| **B: `~/.oa/sessions/<ts>.json`** | One file per session; predictable | O(n) to list all; O(1) to read one | Best — no conflict with agents.json | Easy — delete old files by date |
| **C: `~/.oa/sessions.json`** | Single file grows linearly | Fast for recent; slow for old | Medium — only session writers conflict | Medium — must rewrite entire file |

### Recommendation

**Option B** — one file per session. Rationale:

1. **Zero contention** with `agents.json` — the guardian daemon and cleanup
   scripts write session files while agents independently update `agents.json`.
2. **Natural retention**: `find ~/.oa/sessions/ -mtime +30 -delete` handles
   cleanup without parsing JSON.
3. **Crash safety**: A partial write corrupts only one session file, not the
   entire session history.
4. **Query pattern**: At `oa start`, we only need the most recent file
   (`ls -t | head -1`), which is O(1) on the filesystem.

### Code Sketch

```python
# session_store.py

import json
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import asdict
from .config import OA_DIR
from .state import load_agents

SESSIONS_DIR = OA_DIR / "sessions"

def save_session_record(shutdown_mode: str, git_state: dict = None) -> Path:
    """Save a session record snapshot."""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

    agents = load_agents()
    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%dT%H%M%SZ")

    agent_summary = {
        "total": len(agents),
        "running": sum(1 for a in agents.values() if a.status == "running"),
        "done": sum(1 for a in agents.values() if a.status == "done"),
        "failed": sum(1 for a in agents.values() if a.status in ("failed", "error")),
    }

    record = {
        "session_id": ts,
        "timestamp": now.isoformat(),
        "shutdown_mode": shutdown_mode,
        "agents": {name: asdict(rec) for name, rec in agents.items()},
        "agent_summary": agent_summary,
        "git_state": git_state or {},
    }

    path = SESSIONS_DIR / f"{ts}.json"
    path.write_text(json.dumps(record, indent=2))
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
    """Delete session files older than retention_days. Returns count deleted."""
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

---

## Q10: Integration with checkpoint.py

### Analysis

`checkpoint.py` provides per-agent checkpoints stored as individual JSON files
in `~/.oa/checkpoints/<agent_name>.json`. Each checkpoint contains: `agent_name`,
`task`, `model`, `created_at`, `updated_at`, `status`, `progress_notes`,
`output_snapshot`.

Key functions: `save_checkpoint()`, `load_checkpoint()`, `update_progress()`,
`update_snapshot()`, `complete_checkpoint()`, `fail_checkpoint()`,
`list_incomplete()`, `resume_from_checkpoint()`.

A session-level checkpoint is fundamentally different: it captures ALL agents
plus session metadata (git state, shutdown mode, etc.). The per-agent checkpoint
pattern stores one file per agent; a session checkpoint is one file per snapshot.

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A: Extend `save_checkpoint()` with session scope** | Code reuse; single checkpoint API | Conflates two different concepts; `save_checkpoint(agent_name)` signature doesn't fit session-level use |
| **B: New `session_checkpoint()` function in checkpoint.py** | Same module, different function; keeps checkpoint concept together | Module grows; session checkpoints have different schema |
| **C: Separate session_store.py (Q9)** | Clean separation; session records ARE the session checkpoints | No code reuse from checkpoint.py |

### Recommendation

**Option C** — session records (Q9) ARE the session-level checkpoints. The
per-agent `checkpoint.py` and session-level `session_store.py` serve different
purposes and have different schemas. Trying to unify them adds complexity without
benefit.

However, the guardian daemon (Q2) should call BOTH:
- `checkpoint.save_checkpoint()` for each running agent (existing pattern)
- `session_store.save_session_record()` for the session-level snapshot (new)

This gives us two layers of recovery:
1. **Agent-level**: Resume individual agents from their checkpoint
2. **Session-level**: Resume the entire session context (which agents existed,
   git state, what was the user doing)

### Code Sketch

```python
# In guardian.py — the periodic daemon from Q2

import time
from .state import load_agents
from .checkpoint import save_checkpoint
from .session_store import save_session_record
from .session import write_heartbeat
from .lifecycle import check_agent

AGENT_CHECKPOINT_INTERVAL = 300   # 5 minutes
SESSION_SNAPSHOT_INTERVAL = 300   # 5 minutes

def run_guardian():
    """Periodic checkpoint + heartbeat daemon."""
    while True:
        agents = load_agents()

        # Layer 1: Per-agent checkpoints (existing pattern)
        for name, rec in agents.items():
            check_agent(name)  # refresh status
            if rec.status == "running":
                save_checkpoint(name, {
                    "task": rec.task,
                    "model": rec.model,
                    "created_at": rec.created_at,
                    "status": "running",
                })

        # Layer 2: Session-level snapshot (new)
        save_session_record(shutdown_mode="periodic")

        # Layer 3: Heartbeat for crash detection (Q3)
        write_heartbeat()

        time.sleep(AGENT_CHECKPOINT_INTERVAL)
```

### Integration Points Summary

```
┌─────────────────────────────────────────────────┐
│  Guardian Daemon (tmux oa-guardian window)       │
│  Runs every 5 minutes                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌───────────────────────┐    │
│  │ checkpoint.py │  │ session_store.py      │    │
│  │ Per-agent     │  │ Per-session           │    │
│  │ ~/.oa/        │  │ ~/.oa/sessions/       │    │
│  │  checkpoints/ │  │  <ts>.json            │    │
│  │  <name>.json  │  │                       │    │
│  └──────────────┘  └───────────────────────┘    │
│                                                 │
│  ┌──────────────┐                               │
│  │ session.py   │  Heartbeat + lock file        │
│  │ ~/.oa/       │                               │
│  │  session.lock│                               │
│  │  session.    │                               │
│  │   heartbeat  │                               │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
```

---

## Summary of Recommendations

| Question | Recommendation | Key Rationale |
|----------|---------------|---------------|
| Q2 | Dedicated `oa-guardian` tmux window with bash restart loop | Integrates with existing tmux architecture; inspectable; self-healing |
| Q3 | Lock file + heartbeat file combined | Distinguishes clean/detach/crash; heartbeat written by guardian |
| Q7 | Function in lifecycle, thin `__main__` module for tmux hooks | Maximum reuse; callable from both `oa stop` and tmux hooks |
| Q8 | Separate session files (eliminate contention) + exclusive lock for `update_agent()` | Atomic writes prevent corruption but not lost updates; lock fixes that |
| Q9 | `~/.oa/sessions/<ts>.json` — one file per session | Zero contention; natural retention; crash-safe |
| Q10 | Separate `session_store.py`; guardian calls both checkpoint.py and session_store.py | Different schemas, different purposes; guardian unifies them |

### New Modules Required

| Module | Purpose |
|--------|---------|
| `guardian.py` | Periodic daemon: checkpoints, session snapshots, heartbeats |
| `session.py` | Lock file and heartbeat management; shutdown mode detection |
| `session_store.py` | Session record CRUD in `~/.oa/sessions/` |
| `session_cleanup.py` | Thin entry point for tmux hook invocation |

### Existing Modules Modified

| Module | Changes |
|--------|---------|
| `tmux.py` | `start_session()` creates `oa-guardian` window |
| `config.py` | Add `on_disconnect` and `periodic_checkpoint_minutes` to `DEFAULT_CONFIG` |
| `hooks.py` | Add `on_session_end`, `on_detach`, `on_resume` to `VALID_EVENTS` |
| `state.py` | Add `update_agent_locked()` with exclusive file lock |
