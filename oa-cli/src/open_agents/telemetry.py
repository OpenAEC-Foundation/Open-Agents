"""Agent run telemetry — write run-log.json per agent run.

Schema:
- RUNS_DIR:  ~/.oa/runs/{run_id}/run-log.json
- RUNS_INDEX: ~/.oa/runs-index.json (list of all runs, last 1000, newest first)
"""

from __future__ import annotations

import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ._filelock import lock_ex, lock_un

RUNS_DIR = Path.home() / ".oa" / "runs"
RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"
MAX_INDEX_SIZE = 1000


def _ensure_dirs() -> None:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)


def start_run(
    agent_name: str,
    task: str,
    model: str,
    workspace: str,
    project_root: Optional[str] = None,
    tags: Optional[list] = None,
) -> str:
    """Create a run-log entry and return the run_id."""
    _ensure_dirs()
    run_id = str(uuid.uuid4())
    run_log = {
        "run_id": run_id,
        "agent_name": agent_name,
        "task": task[:200],
        "model": model,
        "started_at": datetime.now(tz=timezone.utc).isoformat(),
        "finished_at": None,
        "exit_status": "unknown",
        "duration_seconds": None,
        "workspace": workspace,
        "project_root": project_root,
        "tags": tags or [],
    }
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "run-log.json").write_text(json.dumps(run_log, indent=2))
    _update_index(run_id, run_log)
    return run_id


def finish_run(run_id: str, exit_status: str = "success") -> None:
    """Update run-log with finish time and exit status."""
    run_log_path = RUNS_DIR / run_id / "run-log.json"
    if not run_log_path.exists():
        return

    run_log = json.loads(run_log_path.read_text())
    finished_at = datetime.now(tz=timezone.utc).isoformat()
    duration_seconds = None
    started_at_str = run_log.get("started_at")
    if started_at_str:
        try:
            started_dt = datetime.fromisoformat(started_at_str)
            finished_dt = datetime.fromisoformat(finished_at)
            duration_seconds = (finished_dt - started_dt).total_seconds()
        except (ValueError, TypeError):
            pass

    run_log["finished_at"] = finished_at
    run_log["exit_status"] = exit_status
    run_log["duration_seconds"] = duration_seconds
    run_log_path.write_text(json.dumps(run_log, indent=2))
    _update_index_entry(run_id, run_log)


def get_run(run_id: str) -> Optional[dict]:
    """Get a single run log by run_id."""
    run_log_path = RUNS_DIR / run_id / "run-log.json"
    if not run_log_path.exists():
        return None
    return json.loads(run_log_path.read_text())


def list_runs(limit: int = 20, agent_name: Optional[str] = None) -> list:
    """List recent runs, optionally filtered by agent_name. Newest first."""
    index = get_runs_index()
    if agent_name:
        index = [e for e in index if e.get("agent_name") == agent_name]
    return index[:limit]


def get_runs_index() -> list:
    """Return the full runs index (newest first)."""
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


# --- Internal helpers ---

def _make_index_entry(run_id: str, run_log: dict) -> dict:
    """Create a compact index entry from a full run log."""
    return {
        "run_id": run_id,
        "agent_name": run_log.get("agent_name", ""),
        "task": run_log.get("task", "")[:100],
        "model": run_log.get("model", ""),
        "started_at": run_log.get("started_at", ""),
        "finished_at": run_log.get("finished_at"),
        "exit_status": run_log.get("exit_status", "unknown"),
        "duration_seconds": run_log.get("duration_seconds"),
    }


def _atomic_index_write(index: list) -> None:
    """Write index atomically using a temp file + rename."""
    index_dir = RUNS_INDEX.parent
    tmp_fd, tmp_path = tempfile.mkstemp(dir=index_dir, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w") as f:
            json.dump(index, f, indent=2)
        Path(tmp_path).replace(RUNS_INDEX)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise


def _update_index(run_id: str, run_log: dict) -> None:
    """Prepend a new entry to the runs index (atomic, with filelock)."""
    _ensure_dirs()
    lock_file = RUNS_INDEX.with_suffix(".lock")
    lock_file.touch(exist_ok=True)
    with open(lock_file, "r+") as lf:
        lock_ex(lf)
        try:
            index = []
            if RUNS_INDEX.exists():
                try:
                    index = json.loads(RUNS_INDEX.read_text())
                except (json.JSONDecodeError, OSError):
                    index = []
            index.insert(0, _make_index_entry(run_id, run_log))
            index = index[:MAX_INDEX_SIZE]
            _atomic_index_write(index)
        finally:
            lock_un(lf)


def _update_index_entry(run_id: str, run_log: dict) -> None:
    """Update an existing index entry in-place (atomic, with filelock)."""
    _ensure_dirs()
    lock_file = RUNS_INDEX.with_suffix(".lock")
    lock_file.touch(exist_ok=True)
    with open(lock_file, "r+") as lf:
        lock_ex(lf)
        try:
            index = []
            if RUNS_INDEX.exists():
                try:
                    index = json.loads(RUNS_INDEX.read_text())
                except (json.JSONDecodeError, OSError):
                    index = []
            entry = _make_index_entry(run_id, run_log)
            for i, e in enumerate(index):
                if e.get("run_id") == run_id:
                    index[i] = entry
                    break
            _atomic_index_write(index)
        finally:
            lock_un(lf)
