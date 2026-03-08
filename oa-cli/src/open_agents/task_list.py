"""Shared task list for agent teams — CRUD with fcntl locking."""

from __future__ import annotations

import fcntl
import json
import time
import uuid
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"
TASKS_DIR = OA_DIR / "tasks"

VALID_STATUSES = {"pending", "in_progress", "completed", "blocked"}


def _team_dir(team: str) -> Path:
    path = TASKS_DIR / team
    path.mkdir(parents=True, exist_ok=True)
    return path


def _task_path(team: str, task_id: str) -> Path:
    return _team_dir(team) / f"{task_id}.json"


def _read_task(path: Path) -> dict:
    with open(path, "r") as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            return json.load(f)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _write_task(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            json.dump(data, f, indent=2)
            f.write("\n")
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def create_task(
    team: str,
    title: str,
    description: str = "",
    assigned_to: Optional[str] = None,
    blocked_by: list[str] | None = None,
) -> dict:
    """Create a new task for a team. Returns the task dict."""
    task_id = str(uuid.uuid4())[:8]
    task = {
        "id": task_id,
        "team": team,
        "title": title,
        "description": description,
        "status": "pending",
        "assigned_to": assigned_to,
        "blocked_by": blocked_by or [],
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    _write_task(_task_path(team, task_id), task)
    return task


def update_task(team: str, task_id: str, status: str) -> dict:
    """Update the status of a task. Returns updated task dict."""
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {VALID_STATUSES}")
    path = _task_path(team, task_id)
    if not path.exists():
        raise FileNotFoundError(f"Task '{task_id}' not found in team '{team}'")
    task = _read_task(path)
    task["status"] = status
    task["updated_at"] = time.time()
    _write_task(path, task)
    return task


def get_task(team: str, task_id: str) -> Optional[dict]:
    """Get a single task by ID. Returns None if not found."""
    path = _task_path(team, task_id)
    if not path.exists():
        return None
    return _read_task(path)


def list_tasks(team: str) -> list[dict]:
    """Return all tasks for a team, sorted by creation time."""
    team_dir = TASKS_DIR / team
    if not team_dir.exists():
        return []
    tasks = []
    for json_file in sorted(team_dir.glob("*.json")):
        try:
            tasks.append(_read_task(json_file))
        except Exception:
            continue
    tasks.sort(key=lambda t: t.get("created_at", 0))
    return tasks


def delete_task(team: str, task_id: str) -> bool:
    """Delete a task. Returns True if it existed."""
    path = _task_path(team, task_id)
    if not path.exists():
        return False
    path.unlink()
    return True
