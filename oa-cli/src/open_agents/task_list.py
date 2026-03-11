"""Shared task list for agent teams — CRUD with cross-platform file locking."""

from __future__ import annotations

import json
import time
import uuid

from ._filelock import lock_ex, lock_sh, lock_un
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
        lock_sh(f)
        try:
            return json.load(f)
        finally:
            lock_un(f)


def _write_task(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        lock_ex(f)
        try:
            json.dump(data, f, indent=2)
            f.write("\n")
        finally:
            lock_un(f)


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


def claim_task(team: str, task_id: str, agent_name: str) -> dict:
    """Claim a task for an agent using exclusive file locking.

    Only pending tasks can be claimed. Sets status to in_progress.
    Raises FileNotFoundError if task not found, ValueError if not claimable.
    """
    path = _task_path(team, task_id)
    if not path.exists():
        raise FileNotFoundError(f"Task '{task_id}' not found in team '{team}'")

    with open(path, "r+") as f:
        lock_ex(f)
        try:
            task = json.load(f)
            if task["status"] != "pending":
                raise ValueError(
                    f"Task '{task_id}' cannot be claimed (status: {task['status']})"
                )
            task["status"] = "in_progress"
            task["assigned_to"] = agent_name
            task["updated_at"] = time.time()
            f.seek(0)
            f.truncate()
            json.dump(task, f, indent=2)
            f.write("\n")
        finally:
            lock_un(f)
    return task


def complete_task(team: str, task_id: str) -> dict:
    """Mark a task as completed and auto-unblock dependent tasks.

    Any task in the same team that lists this task_id in blocked_by
    will have it removed. If blocked_by becomes empty and the task
    is blocked, its status changes to pending.
    """
    task = update_task(team, task_id, "completed")

    # Auto-unblock dependent tasks
    team_dir = TASKS_DIR / team
    if team_dir.exists():
        for json_file in team_dir.glob("*.json"):
            if json_file.stem == task_id:
                continue
            try:
                dep_task = _read_task(json_file)
                if task_id in dep_task.get("blocked_by", []):
                    dep_task["blocked_by"].remove(task_id)
                    dep_task["updated_at"] = time.time()
                    if not dep_task["blocked_by"] and dep_task["status"] == "blocked":
                        dep_task["status"] = "pending"
                    _write_task(json_file, dep_task)
            except Exception:
                continue

    return task


def delete_task(team: str, task_id: str) -> bool:
    """Delete a task. Returns True if it existed."""
    path = _task_path(team, task_id)
    if not path.exists():
        return False
    path.unlink()
    return True
