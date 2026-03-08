"""Team config management — CRUD for agent teams."""

from __future__ import annotations

import fcntl
import json
import shutil
import time
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
