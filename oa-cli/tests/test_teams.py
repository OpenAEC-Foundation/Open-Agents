"""Tests for open_agents.teams — team management (Sprint 17).

Coverage: create_team, list_teams, add_member, delete_team.
"""

from __future__ import annotations

import pytest

from open_agents.teams import add_member, create_team, delete_team, get_team, list_teams


@pytest.fixture(autouse=True)
def isolated(oa_path):
    """Ensure all teams paths use the isolated tmp directory."""
    return oa_path


# ---------------------------------------------------------------------------
# test_create_team
# ---------------------------------------------------------------------------


def test_create_team():
    """create_team returns a config dict and persists to disk."""
    cfg = create_team("alpha")
    assert cfg["name"] == "alpha"
    assert cfg["members"] == []
    assert "created_at" in cfg

    # get_team confirms it was written
    loaded = get_team("alpha")
    assert loaded is not None
    assert loaded["name"] == "alpha"


# ---------------------------------------------------------------------------
# test_list_teams
# ---------------------------------------------------------------------------


def test_list_teams():
    """list_teams returns all created teams, sorted by name."""
    assert list_teams() == []

    create_team("zebra")
    create_team("apple")
    create_team("mango")

    teams = list_teams()
    names = [t["name"] for t in teams]
    assert names == sorted(names)
    assert set(names) == {"zebra", "apple", "mango"}


# ---------------------------------------------------------------------------
# test_add_member
# ---------------------------------------------------------------------------


def test_add_member():
    """add_member appends an agent to a team's members list."""
    create_team("squad")

    updated = add_member("squad", "agent-1")
    assert "agent-1" in updated["members"]

    add_member("squad", "agent-2")
    cfg = get_team("squad")
    assert "agent-1" in cfg["members"]
    assert "agent-2" in cfg["members"]

    # Adding the same member twice is idempotent
    add_member("squad", "agent-1")
    cfg = get_team("squad")
    assert cfg["members"].count("agent-1") == 1


# ---------------------------------------------------------------------------
# test_delete_team
# ---------------------------------------------------------------------------


def test_delete_team():
    """delete_team removes the team; deleting a non-existent team returns False."""
    create_team("to-delete")
    assert get_team("to-delete") is not None

    result = delete_team("to-delete")
    assert result is True
    assert get_team("to-delete") is None

    # Deleting again (non-existent) returns False
    assert delete_team("to-delete") is False
