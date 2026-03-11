"""Tests for vscode_bridge.py — REST/SSE API for the VS Code extension.

Covers all endpoints:
- GET /health
- GET /agents
- GET /agents/<name>
- POST /agents/spawn
- POST /agents/<name>/kill
- GET /agents/<name>/logs
"""

from __future__ import annotations

import json
import time

import pytest

import open_agents.state as state_module
from open_agents.state import AgentRecord, add_agent, save_agents


@pytest.fixture()
def bridge_client(tmp_path, monkeypatch):
    """Flask test client for vscode_app with isolated state."""
    oa_dir = tmp_path / ".oa"
    oa_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(state_module, "STATE_FILE", oa_dir / "agents.json")
    state_module._cache = None

    from open_agents.vscode_bridge import vscode_app
    vscode_app.config["TESTING"] = True
    with vscode_app.test_client() as client:
        yield client


def _make_record(name: str = "agent-1", status: str = "running") -> AgentRecord:
    return AgentRecord(
        name=name,
        task="test task",
        workspace="/tmp/ws",
        tmux_window="w1",
        model="claude",
        status=status,
        created_at=time.time(),
    )


class TestHealth:
    def test_returns_ok(self, bridge_client):
        resp = bridge_client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"
        assert data["port"] == 5175
        assert "version" in data


class TestAgentsList:
    def test_empty_list(self, bridge_client):
        resp = bridge_client.get("/agents")
        assert resp.status_code == 200
        assert resp.get_json() == []

    def test_returns_agents(self, bridge_client, monkeypatch):
        rec = _make_record(status="done")
        add_agent(rec)
        # Prevent check_agent from modifying state (no tmux in tests)
        monkeypatch.setattr("open_agents.vscode_bridge.check_agent", lambda name: "done")

        resp = bridge_client.get("/agents")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 1
        assert data[0]["name"] == "agent-1"
        assert data[0]["status"] == "done"

    def test_agent_fields_present(self, bridge_client, monkeypatch):
        rec = _make_record(status="done")
        add_agent(rec)
        monkeypatch.setattr("open_agents.vscode_bridge.check_agent", lambda name: "done")

        resp = bridge_client.get("/agents")
        agent = resp.get_json()[0]
        for field in ("name", "task", "workspace", "tmux_window", "model", "status", "created_at"):
            assert field in agent, f"Missing field: {field}"


class TestAgentGet:
    def test_not_found(self, bridge_client):
        resp = bridge_client.get("/agents/nonexistent")
        assert resp.status_code == 404
        assert "error" in resp.get_json()

    def test_found_done_agent(self, bridge_client, monkeypatch):
        rec = _make_record(status="done")
        add_agent(rec)
        monkeypatch.setattr("open_agents.vscode_bridge.check_agent", lambda name: "done")
        monkeypatch.setattr("open_agents.vscode_bridge.read_output", lambda ws: "result text")

        resp = bridge_client.get("/agents/agent-1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["name"] == "agent-1"
        assert data["live_output"] == "result text"

    def test_running_agent_gets_live_output(self, bridge_client, monkeypatch):
        rec = _make_record(status="running")
        add_agent(rec)
        monkeypatch.setattr("open_agents.vscode_bridge.check_agent", lambda name: "running")
        monkeypatch.setattr("open_agents.vscode_bridge.capture_agent_output", lambda tw, lines=50: "live output")

        resp = bridge_client.get("/agents/agent-1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["live_output"] == "live output"


class TestAgentsSpawn:
    def test_missing_task_returns_400(self, bridge_client):
        resp = bridge_client.post("/agents/spawn", json={})
        assert resp.status_code == 400
        assert "error" in resp.get_json()

    def test_spawn_success(self, bridge_client, monkeypatch):
        rec = _make_record(status="running")
        monkeypatch.setattr("open_agents.vscode_bridge.session_exists", lambda: True)
        monkeypatch.setattr("open_agents.vscode_bridge.spawn_agent", lambda name, task, model="claude": rec)

        resp = bridge_client.post("/agents/spawn", json={"task": "test task", "name": "agent-1"})
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["name"] == "agent-1"
        assert data["status"] == "running"

    def test_spawn_auto_generates_name(self, bridge_client, monkeypatch):
        rec = _make_record(name="auto-name", status="running")
        monkeypatch.setattr("open_agents.vscode_bridge.session_exists", lambda: True)
        monkeypatch.setattr("open_agents.vscode_bridge.generate_agent_name", lambda task: "auto-name")
        monkeypatch.setattr("open_agents.vscode_bridge.spawn_agent", lambda name, task, model="claude": rec)

        resp = bridge_client.post("/agents/spawn", json={"task": "some task"})
        assert resp.status_code == 201
        assert resp.get_json()["name"] == "auto-name"

    def test_spawn_runtime_error_returns_400(self, bridge_client, monkeypatch):
        monkeypatch.setattr("open_agents.vscode_bridge.session_exists", lambda: True)
        monkeypatch.setattr("open_agents.vscode_bridge.spawn_agent",
                            lambda name, task, model="claude": (_ for _ in ()).throw(RuntimeError("spawn failed")))

        resp = bridge_client.post("/agents/spawn", json={"task": "task", "name": "agent-x"})
        assert resp.status_code == 400
        assert "spawn failed" in resp.get_json()["error"]

    def test_spawn_starts_session_if_needed(self, bridge_client, monkeypatch):
        started = []
        rec = _make_record(status="running")
        monkeypatch.setattr("open_agents.vscode_bridge.session_exists", lambda: False)
        monkeypatch.setattr("open_agents.vscode_bridge.start_session", lambda: started.append(True))
        monkeypatch.setattr("open_agents.vscode_bridge.spawn_agent", lambda name, task, model="claude": rec)

        bridge_client.post("/agents/spawn", json={"task": "task", "name": "agent-1"})
        assert started, "start_session should have been called"


class TestAgentKill:
    def test_not_found(self, bridge_client, monkeypatch):
        monkeypatch.setattr("open_agents.vscode_bridge.kill_agent", lambda name: False)
        resp = bridge_client.post("/agents/nonexistent/kill")
        assert resp.status_code == 404

    def test_kill_success(self, bridge_client, monkeypatch):
        monkeypatch.setattr("open_agents.vscode_bridge.kill_agent", lambda name: True)
        resp = bridge_client.post("/agents/agent-1/kill")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "killed"


class TestAgentLogs:
    def test_not_found(self, bridge_client):
        resp = bridge_client.get("/agents/nonexistent/logs")
        assert resp.status_code == 404

    def test_logs_running_agent(self, bridge_client, monkeypatch):
        rec = _make_record(status="running")
        add_agent(rec)
        monkeypatch.setattr("open_agents.vscode_bridge.capture_agent_output",
                            lambda tw, lines=50: "running output")

        resp = bridge_client.get("/agents/agent-1/logs")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["output"] == "running output"
        assert data["status"] == "running"

    def test_logs_done_agent_reads_file(self, bridge_client, monkeypatch):
        rec = _make_record(status="done")
        add_agent(rec)
        monkeypatch.setattr("open_agents.vscode_bridge.read_output", lambda ws: "file output")

        resp = bridge_client.get("/agents/agent-1/logs")
        assert resp.status_code == 200
        assert resp.get_json()["output"] == "file output"

    def test_logs_custom_line_count(self, bridge_client, monkeypatch):
        rec = _make_record(status="running")
        add_agent(rec)
        captured_lines = []
        monkeypatch.setattr("open_agents.vscode_bridge.capture_agent_output",
                            lambda tw, lines=50: captured_lines.append(lines) or "out")

        bridge_client.get("/agents/agent-1/logs?lines=100")
        assert captured_lines == [100]
