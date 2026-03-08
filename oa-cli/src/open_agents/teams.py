"""Team config management — CRUD for agent teams."""

from __future__ import annotations

import fcntl
import json
import shutil
import time
import uuid
from pathlib import Path
from typing import Optional

OA_DIR = Path.home() / ".oa"
TEAMS_DIR = OA_DIR / "teams"


def _team_config_path(name: str) -> Path:
    return TEAMS_DIR / name / "config.json"


def _read_config(path: Path) -> dict:
    with open(path, "r") as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            return json.load(f)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _write_config(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            json.dump(data, f, indent=2)
            f.write("\n")
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def create_team(name: str, members: list[str] | None = None) -> dict:
    """Create a new team. Returns the team config dict."""
    config = {
        "name": name,
        "members": members or [],
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    _write_config(_team_config_path(name), config)
    return config


def get_team(name: str) -> Optional[dict]:
    """Get config for a specific team. Returns None if not found."""
    path = _team_config_path(name)
    if not path.exists():
        return None
    return _read_config(path)


def list_teams() -> list[dict]:
    """Return all teams, sorted by name."""
    if not TEAMS_DIR.exists():
        return []
    teams = []
    for config_file in sorted(TEAMS_DIR.glob("*/config.json")):
        try:
            teams.append(_read_config(config_file))
        except Exception:
            continue
    return teams


def add_member(team: str, agent_name: str) -> dict:
    """Add an agent to a team. Returns updated team config."""
    path = _team_config_path(team)
    if not path.exists():
        raise FileNotFoundError(f"Team '{team}' not found")
    config = _read_config(path)
    if agent_name not in config["members"]:
        config["members"].append(agent_name)
        config["updated_at"] = time.time()
        _write_config(path, config)
    return config


def remove_member(team: str, agent_name: str) -> dict:
    """Remove an agent from a team. Returns updated team config."""
    path = _team_config_path(team)
    if not path.exists():
        raise FileNotFoundError(f"Team '{team}' not found")
    config = _read_config(path)
    config["members"] = [m for m in config["members"] if m != agent_name]
    config["updated_at"] = time.time()
    _write_config(path, config)
    return config


def delete_team(name: str) -> bool:
    """Delete a team and all its config. Returns True if it existed."""
    team_dir = TEAMS_DIR / name
    if not team_dir.exists():
        return False
    shutil.rmtree(team_dir)
    return True


# ---------------------------------------------------------------------------
# Task management
# ---------------------------------------------------------------------------

TASKS_DIR = OA_DIR / "tasks"


def _task_path(team: str, task_id: str) -> Path:
    return TASKS_DIR / team / f"{task_id}.json"


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


def create_task(team: str, description: str, depends_on: list[str] | None = None) -> dict:
    """Create a task in ~/.oa/tasks/<team>/<id>.json.

    If depends_on is provided and non-empty, the task starts as 'blocked',
    otherwise as 'todo'.
    """
    deps = depends_on or []
    status = "blocked" if deps else "todo"
    task: dict = {
        "id": str(uuid.uuid4()),
        "team": team,
        "description": description,
        "status": status,
        "claimed_by": None,
        "depends_on": deps,
        "created_at": time.time(),
        "completed_at": None,
    }
    _write_task(_task_path(team, task["id"]), task)
    return task


def list_tasks(team: str | None = None) -> list[dict]:
    """List all tasks, optionally filtered by team."""
    if not TASKS_DIR.exists():
        return []
    tasks: list[dict] = []
    if team:
        pattern = f"{team}/*.json"
    else:
        pattern = "*/*.json"
    for task_file in sorted(TASKS_DIR.glob(pattern)):
        try:
            tasks.append(_read_task(task_file))
        except Exception:
            continue
    return tasks


def get_task(task_id: str) -> dict | None:
    """Read a single task by ID, searching across all teams."""
    if not TASKS_DIR.exists():
        return None
    for task_file in TASKS_DIR.glob(f"*/{task_id}.json"):
        try:
            return _read_task(task_file)
        except Exception:
            return None
    return None


def claim_task(task_id: str, agent_name: str) -> dict:
    """Claim a task with file locking. Raises ValueError if already claimed."""
    if not TASKS_DIR.exists():
        raise FileNotFoundError(f"Task '{task_id}' not found")
    matches = list(TASKS_DIR.glob(f"*/{task_id}.json"))
    if not matches:
        raise FileNotFoundError(f"Task '{task_id}' not found")
    path = matches[0]
    with open(path, "r+") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            task = json.load(f)
            if task["status"] == "claimed":
                raise ValueError(
                    f"Task '{task_id}' is already claimed by '{task['claimed_by']}'"
                )
            if task["status"] == "done":
                raise ValueError(f"Task '{task_id}' is already done")
            if task["status"] == "blocked":
                raise ValueError(f"Task '{task_id}' is blocked by dependencies")
            task["status"] = "claimed"
            task["claimed_by"] = agent_name
            f.seek(0)
            f.truncate()
            json.dump(task, f, indent=2)
            f.write("\n")
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    return task


def complete_task(task_id: str) -> dict:
    """Mark task done and auto-unblock dependent tasks."""
    if not TASKS_DIR.exists():
        raise FileNotFoundError(f"Task '{task_id}' not found")
    matches = list(TASKS_DIR.glob(f"*/{task_id}.json"))
    if not matches:
        raise FileNotFoundError(f"Task '{task_id}' not found")
    path = matches[0]
    with open(path, "r+") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            task = json.load(f)
            task["status"] = "done"
            task["completed_at"] = time.time()
            f.seek(0)
            f.truncate()
            json.dump(task, f, indent=2)
            f.write("\n")
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)

    # Unblock tasks that depended on this task
    for candidate_file in TASKS_DIR.glob("*/*.json"):
        if candidate_file == path:
            continue
        try:
            with open(candidate_file, "r+") as f:
                fcntl.flock(f, fcntl.LOCK_EX)
                try:
                    candidate = json.load(f)
                    if (
                        candidate.get("status") == "blocked"
                        and task_id in candidate.get("depends_on", [])
                    ):
                        # Remove this dependency
                        candidate["depends_on"] = [
                            d for d in candidate["depends_on"] if d != task_id
                        ]
                        if not candidate["depends_on"]:
                            candidate["status"] = "todo"
                        f.seek(0)
                        f.truncate()
                        json.dump(candidate, f, indent=2)
                        f.write("\n")
                finally:
                    fcntl.flock(f, fcntl.LOCK_UN)
        except Exception:
            continue

    return task


# ---------------------------------------------------------------------------
# Messaging
# ---------------------------------------------------------------------------

MESSAGES_DIR = OA_DIR / "messages"


def _message_path(to_agent: str, message_id: str) -> Path:
    return MESSAGES_DIR / to_agent / f"{message_id}.json"


def _read_message(path: Path) -> dict:
    with open(path, "r") as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            return json.load(f)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _write_message(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            json.dump(data, f, indent=2)
            f.write("\n")
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def send_message(to_agent: str, from_agent: str, content: str) -> dict:
    """Write a message to ~/.oa/messages/<to_agent>/<id>.json."""
    message: dict = {
        "id": str(uuid.uuid4()),
        "from_agent": from_agent,
        "to_agent": to_agent,
        "content": content,
        "sent_at": time.time(),
        "read": False,
    }
    _write_message(_message_path(to_agent, message["id"]), message)
    return message


def get_messages(agent_name: str, unread_only: bool = True) -> list[dict]:
    """Read messages for agent. Marks them as read when unread_only=False."""
    inbox = MESSAGES_DIR / agent_name
    if not inbox.exists():
        return []
    messages: list[dict] = []
    for msg_file in sorted(inbox.glob("*.json")):
        try:
            msg = _read_message(msg_file)
        except Exception:
            continue
        if unread_only and msg.get("read"):
            continue
        messages.append(msg)
        if not unread_only and not msg.get("read"):
            # Mark as read
            with open(msg_file, "r+") as f:
                fcntl.flock(f, fcntl.LOCK_EX)
                try:
                    data = json.load(f)
                    data["read"] = True
                    f.seek(0)
                    f.truncate()
                    json.dump(data, f, indent=2)
                    f.write("\n")
                finally:
                    fcntl.flock(f, fcntl.LOCK_UN)
    return messages


def broadcast(from_agent: str, content: str, team: str | None = None) -> list[dict]:
    """Send message to all members of a team, or all known agents if team is None."""
    if team:
        team_config = get_team(team)
        recipients = team_config["members"] if team_config else []
    else:
        # All agents with an inbox or registered in any team
        known: set[str] = set()
        for t in list_teams():
            known.update(t.get("members", []))
        if MESSAGES_DIR.exists():
            known.update(p.name for p in MESSAGES_DIR.iterdir() if p.is_dir())
        recipients = list(known)

    sent: list[dict] = []
    for recipient in recipients:
        if recipient == from_agent:
            continue
        sent.append(send_message(recipient, from_agent, content))
    return sent
