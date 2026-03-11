"""Shared fixtures for Sprint 17 test suite.

Provides `oa_path` fixture that redirects all ~/.oa module-level paths to a
temporary directory, preventing tests from touching the real ~/.oa directory.
"""

from __future__ import annotations

import pytest

import open_agents.messaging as messaging_module
import open_agents.state as state_module
import open_agents.task_list as task_list_module
import open_agents.teams as teams_module


@pytest.fixture()
def oa_path(tmp_path, monkeypatch):
    """Redirect all ~/.oa paths to a temporary directory for isolation."""
    oa_dir = tmp_path / ".oa"
    oa_dir.mkdir(parents=True, exist_ok=True)

    # task_list.py
    monkeypatch.setattr(task_list_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(task_list_module, "TASKS_DIR", oa_dir / "tasks")

    # teams.py
    monkeypatch.setattr(teams_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(teams_module, "TEAMS_DIR", oa_dir / "teams")
    monkeypatch.setattr(teams_module, "TASKS_DIR", oa_dir / "tasks")
    monkeypatch.setattr(teams_module, "MESSAGES_DIR", oa_dir / "messages")

    # messaging.py
    monkeypatch.setattr(messaging_module, "MESSAGES_DIR", oa_dir / "messages")
    monkeypatch.setattr(messaging_module, "BROADCAST_DIR", oa_dir / "messages" / "_broadcast")

    # state.py (used by broadcast_message → list_agents)
    monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(state_module, "STATE_FILE", oa_dir / "agents.json")
    state_module._cache = None
    state_module._cache_mtime = 0.0

    return oa_dir
