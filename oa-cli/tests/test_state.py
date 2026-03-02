"""Unit tests for open_agents.state — AgentRecord CRUD + state file format."""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

import open_agents.state as state_module
from open_agents.state import (
    AgentRecord,
    add_agent,
    get_agent,
    list_agents,
    load_agents,
    remove_agent,
    save_agents,
    update_agent,
)


@pytest.fixture(autouse=True)
def isolated_state(tmp_path, monkeypatch):
    """Redirect STATE_FILE and OA_DIR to a temp directory for every test."""
    oa_dir = tmp_path / ".oa"
    state_file = oa_dir / "agents.json"
    monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(state_module, "STATE_FILE", state_file)
    return state_file


def _make_record(name: str = "test-agent", **kwargs) -> AgentRecord:
    return AgentRecord(
        name=name,
        task="do something",
        workspace="/tmp/ws",
        tmux_window=f"agent-{name}",
        **kwargs,
    )


# ---------------------------------------------------------------------------
# load_agents / save_agents — state file format
# ---------------------------------------------------------------------------

class TestStateFileFormat:
    def test_load_agents_returns_empty_when_no_file(self):
        agents = load_agents()
        assert agents == {}

    def test_save_and_load_roundtrip(self):
        rec = _make_record("alpha")
        save_agents({"alpha": rec})

        loaded = load_agents()
        assert "alpha" in loaded
        a = loaded["alpha"]
        assert a.name == "alpha"
        assert a.task == "do something"
        assert a.workspace == "/tmp/ws"
        assert a.status == "running"

    def test_state_file_is_valid_json(self, isolated_state):
        rec = _make_record("beta")
        save_agents({"beta": rec})

        raw = json.loads(isolated_state.read_text())
        assert isinstance(raw, dict)
        assert "beta" in raw
        assert raw["beta"]["name"] == "beta"

    def test_state_file_ends_with_newline(self, isolated_state):
        save_agents({"gamma": _make_record("gamma")})
        text = isolated_state.read_text()
        assert text.endswith("\n")

    def test_save_creates_oa_dir_if_missing(self, isolated_state):
        assert not isolated_state.parent.exists()
        save_agents({"x": _make_record("x")})
        assert isolated_state.exists()

    def test_optional_fields_serialised_as_null(self, isolated_state):
        rec = _make_record("nulltest")
        save_agents({"nulltest": rec})
        raw = json.loads(isolated_state.read_text())
        entry = raw["nulltest"]
        assert entry["pid"] is None
        assert entry["finished_at"] is None
        assert entry["output_file"] is None
        assert entry["parent"] is None


# ---------------------------------------------------------------------------
# add_agent
# ---------------------------------------------------------------------------

class TestAddAgent:
    def test_add_creates_record(self):
        rec = _make_record("new-agent")
        add_agent(rec)
        assert get_agent("new-agent") is not None

    def test_add_overwrites_existing(self):
        add_agent(_make_record("dup", task="first"))
        add_agent(_make_record("dup", task="second"))
        assert get_agent("dup").task == "second"

    def test_add_multiple_agents(self):
        add_agent(_make_record("a1"))
        add_agent(_make_record("a2"))
        add_agent(_make_record("a3"))
        assert len(list_agents()) == 3


# ---------------------------------------------------------------------------
# get_agent
# ---------------------------------------------------------------------------

class TestGetAgent:
    def test_get_existing(self):
        add_agent(_make_record("found"))
        rec = get_agent("found")
        assert rec is not None
        assert rec.name == "found"

    def test_get_missing_returns_none(self):
        assert get_agent("ghost") is None


# ---------------------------------------------------------------------------
# update_agent
# ---------------------------------------------------------------------------

class TestUpdateAgent:
    def test_update_status(self):
        add_agent(_make_record("upd"))
        result = update_agent("upd", status="done")
        assert result is not None
        assert result.status == "done"
        # Persisted
        assert get_agent("upd").status == "done"

    def test_update_finished_at(self):
        add_agent(_make_record("ts"))
        t = time.time()
        update_agent("ts", finished_at=t)
        assert get_agent("ts").finished_at == pytest.approx(t)

    def test_update_multiple_fields(self):
        add_agent(_make_record("multi"))
        update_agent("multi", status="done", pid=1234)
        rec = get_agent("multi")
        assert rec.status == "done"
        assert rec.pid == 1234

    def test_update_nonexistent_returns_none(self):
        result = update_agent("nobody", status="done")
        assert result is None

    def test_update_ignores_unknown_fields(self):
        add_agent(_make_record("safe"))
        # Should not raise
        update_agent("safe", nonexistent_field="value")
        assert get_agent("safe") is not None


# ---------------------------------------------------------------------------
# remove_agent
# ---------------------------------------------------------------------------

class TestRemoveAgent:
    def test_remove_existing(self):
        add_agent(_make_record("del"))
        assert remove_agent("del") is True
        assert get_agent("del") is None

    def test_remove_missing_returns_false(self):
        assert remove_agent("phantom") is False

    def test_remove_only_target(self):
        add_agent(_make_record("keep"))
        add_agent(_make_record("drop"))
        remove_agent("drop")
        assert get_agent("keep") is not None
        assert get_agent("drop") is None


# ---------------------------------------------------------------------------
# list_agents
# ---------------------------------------------------------------------------

class TestListAgents:
    def test_list_empty(self):
        assert list_agents() == []

    def test_list_all(self):
        add_agent(_make_record("r1", status="running"))
        add_agent(_make_record("r2", status="done"))
        records = list_agents()
        assert len(records) == 2

    def test_list_filtered_by_status(self):
        add_agent(_make_record("run1", status="running"))
        add_agent(_make_record("run2", status="running"))
        add_agent(_make_record("done1", status="done"))
        running = list_agents(status="running")
        assert len(running) == 2
        assert all(r.status == "running" for r in running)

    def test_list_filtered_no_match(self):
        add_agent(_make_record("x", status="done"))
        assert list_agents(status="killed") == []

    def test_list_returns_agent_records(self):
        add_agent(_make_record("typed"))
        records = list_agents()
        assert all(isinstance(r, AgentRecord) for r in records)


# ---------------------------------------------------------------------------
# AgentRecord defaults
# ---------------------------------------------------------------------------

class TestAgentRecordDefaults:
    def test_default_model_is_claude(self):
        rec = _make_record()
        assert rec.model == "claude"

    def test_default_status_is_running(self):
        rec = _make_record()
        assert rec.status == "running"

    def test_created_at_is_set(self):
        before = time.time()
        rec = _make_record()
        after = time.time()
        assert before <= rec.created_at <= after

    def test_parent_field(self):
        rec = _make_record(parent="orchestrator")
        assert rec.parent == "orchestrator"
