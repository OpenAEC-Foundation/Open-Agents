"""Session persistence — stores session records as individual JSON files in ~/.oa/sessions/.

Storage: ~/.oa/sessions/<session_id>.json
Uses atomic write (tempfile + rename) — no fcntl, cross-platform safe.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .config import OA_DIR, load_config
from .state import load_agents

SESSIONS_DIR = OA_DIR / "sessions"
SCHEMA_VERSION = 1


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")


def _ensure_dir() -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


def _session_path(session_id: str) -> Path:
    return SESSIONS_DIR / f"{session_id}.json"


# ---------------------------------------------------------------------------
# Dataclass
# ---------------------------------------------------------------------------

@dataclass
class SessionRecord:
    session_id: str
    schema_version: int
    started_at: float
    shutdown_mode: str                          # stop | detach | crash
    agents_snapshot: dict = field(default_factory=dict)
    agent_summary: dict = field(default_factory=dict)
    git_state: dict = field(default_factory=dict)
    config_snapshot: dict = field(default_factory=dict)
    ended_at: Optional[float] = None
    duration_seconds: Optional[float] = None
    project_root: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _git_state() -> dict:
    """Collect current git state via subprocess."""
    def _run(*args: str) -> str:
        try:
            result = subprocess.run(
                list(args),
                capture_output=True, text=True, timeout=5
            )
            return result.stdout.strip()
        except Exception:
            return ""

    branch = _run("git", "rev-parse", "--abbrev-ref", "HEAD")
    last_commit = _run("git", "log", "-1", "--pretty=%H %s")
    status_output = _run("git", "status", "--short")
    uncommitted = [
        line.strip() for line in status_output.splitlines() if line.strip()
    ] if status_output else []

    return {
        "branch": branch or "unknown",
        "last_commit": last_commit or "unknown",
        "uncommitted_files": uncommitted,
        "stash_ref": _run("git", "stash", "list") or "",
    }


def _agent_summary(snapshot: dict) -> dict:
    total = len(snapshot)
    done = sum(1 for a in snapshot.values() if a.get("status") == "done")
    running = sum(1 for a in snapshot.values() if a.get("status") == "running")
    failed = sum(1 for a in snapshot.values() if a.get("status") in ("failed", "error"))
    return {"total": total, "done": done, "running": running, "failed": failed}


def _write_atomic(path: Path, data: dict) -> None:
    """Write JSON atomically via tempfile + rename."""
    _ensure_dir()
    tmp_fd, tmp_path = tempfile.mkstemp(dir=SESSIONS_DIR, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        Path(tmp_path).replace(path)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise


def _from_dict(data: dict) -> SessionRecord:
    data.setdefault("schema_version", 1)
    data.setdefault("ended_at", None)
    data.setdefault("duration_seconds", None)
    data.setdefault("project_root", None)
    data.setdefault("agents_snapshot", {})
    data.setdefault("agent_summary", {})
    data.setdefault("git_state", {})
    data.setdefault("config_snapshot", {})
    return SessionRecord(
        session_id=data["session_id"],
        schema_version=data["schema_version"],
        started_at=data["started_at"],
        shutdown_mode=data.get("shutdown_mode", "crash"),
        agents_snapshot=data["agents_snapshot"],
        agent_summary=data["agent_summary"],
        git_state=data["git_state"],
        config_snapshot=data["config_snapshot"],
        ended_at=data["ended_at"],
        duration_seconds=data["duration_seconds"],
        project_root=data["project_root"],
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def save_session(record: SessionRecord) -> Path:
    """Persist a SessionRecord to ~/.oa/sessions/<session_id>.json."""
    path = _session_path(record.session_id)
    _write_atomic(path, asdict(record))
    return path


def load_session(session_id: str) -> Optional[SessionRecord]:
    """Load a single session by ID. Returns None if not found."""
    path = _session_path(session_id)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        return _from_dict(data)
    except Exception:
        return None


def list_sessions(limit: int = 10) -> list[SessionRecord]:
    """Return up to `limit` sessions, most recent first."""
    _ensure_dir()
    paths = sorted(
        SESSIONS_DIR.glob("*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    records: list[SessionRecord] = []
    for p in paths[:limit]:
        try:
            data = json.loads(p.read_text())
            records.append(_from_dict(data))
        except Exception:
            continue
    return records


def get_latest_session() -> Optional[SessionRecord]:
    """Return the most recently saved session, or None."""
    sessions = list_sessions(limit=1)
    return sessions[0] if sessions else None


def cleanup_sessions(retention_days: int = 30) -> int:
    """Delete session files older than `retention_days`. Returns count deleted."""
    _ensure_dir()
    cutoff = time.time() - retention_days * 86400
    deleted = 0
    for p in SESSIONS_DIR.glob("*.json"):
        try:
            if p.stat().st_mtime < cutoff:
                p.unlink()
                deleted += 1
        except Exception:
            continue
    return deleted


def create_snapshot(
    shutdown_mode: str = "stop",
    project_root: Optional[str] = None,
) -> SessionRecord:
    """Build a SessionRecord from current system state.

    Reads agents via load_agents(), git state via subprocess,
    and config via load_config().
    """
    now = time.time()
    session_id = _now_iso()

    agents = load_agents()
    snapshot: dict = {}
    for name, rec in agents.items():
        snapshot[name] = {
            "status": rec.status,
            "task": rec.task,
            "output_path": rec.output_file,
        }

    summary = _agent_summary(snapshot)
    git = _git_state()
    config = load_config()

    return SessionRecord(
        session_id=session_id,
        schema_version=SCHEMA_VERSION,
        started_at=now,
        shutdown_mode=shutdown_mode,
        agents_snapshot=snapshot,
        agent_summary=summary,
        git_state=git,
        config_snapshot=config,
        project_root=project_root,
    )
