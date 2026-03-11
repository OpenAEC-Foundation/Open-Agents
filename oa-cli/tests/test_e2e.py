"""End-to-end integration tests for the Open-Agents oa-cli stack.

Tests the complete flow: spawn_agent → workspace → AgentRecord → check_agent → collect
All external side effects (tmux, telemetry, session) are mocked.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

import open_agents.state as state_module
import open_agents.spawner as spawner_module
import open_agents.lifecycle as lifecycle_module
from open_agents.state import (
    AgentRecord,
    add_agent,
    get_agent,
    list_agents,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def isolated_state(tmp_path, monkeypatch):
    """Redirect state to a temp directory and reset the in-memory cache."""
    oa_dir = tmp_path / ".oa"
    state_file = oa_dir / "agents.json"
    monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
    monkeypatch.setattr(state_module, "STATE_FILE", state_file)
    state_module._cache = None
    state_module._cache_mtime = 0.0
    return oa_dir


@pytest.fixture()
def fake_workspace(tmp_path):
    """Create a minimal agent workspace directory structure."""
    ws = tmp_path / "agent-ws"
    ws.mkdir()
    (ws / "output").mkdir()
    return ws


# ---------------------------------------------------------------------------
# Test 1: test_spawn_and_collect
# ---------------------------------------------------------------------------


class TestSpawnAndCollect:
    """Integration test for the spawn → check_agent lifecycle."""

    def test_spawn_and_collect(self, fake_workspace, monkeypatch):
        """Spawn a (mocked) agent, simulate .done, verify check_agent returns 'done'
        and telemetry.finish_run is called."""
        agent_name = "test-e2e-agent"
        task = "Echo hello"

        # --- Mock external dependencies ---
        mock_tmux_result = MagicMock()
        mock_tmux_result.returncode = 0
        mock_tmux_result.stdout = "1"

        monkeypatch.setattr(spawner_module, "session_exists", lambda: True)
        monkeypatch.setattr(lifecycle_module, "_tmux", lambda *a, **kw: mock_tmux_result)

        # Mock create_workspace to return our fake workspace
        monkeypatch.setattr(spawner_module, "create_workspace", lambda *a, **kw: fake_workspace)

        # Mock _tmux in spawner (used for new-window and send-keys)
        monkeypatch.setattr(spawner_module, "_tmux", lambda *a, **kw: mock_tmux_result)

        # Mock telemetry
        mock_start_run = MagicMock(return_value="test-run-id-123")
        mock_finish_run = MagicMock()
        monkeypatch.setattr(spawner_module.telemetry, "start_run", mock_start_run)
        monkeypatch.setattr(lifecycle_module._telemetry, "finish_run", mock_finish_run)

        # Mock checkpoint
        monkeypatch.setattr(spawner_module, "save_checkpoint", lambda *a, **kw: None)

        # Mock hooks in lifecycle
        monkeypatch.setattr(lifecycle_module._hooks, "run_hooks", lambda *a, **kw: None)

        # --- Spawn ---
        rec = spawner_module.spawn_agent(
            name=agent_name,
            task=task,
            model="ollama/tinyllama",
            workspace=fake_workspace,
        )

        # Workspace should be our fake workspace
        assert Path(rec.workspace) == fake_workspace

        # AgentRecord should be registered in state
        stored = get_agent(agent_name)
        assert stored is not None
        assert stored.name == agent_name
        assert stored.task == task
        assert stored.status == "running"
        assert stored.model == "ollama/tinyllama"

        # Telemetry start_run should have been called
        mock_start_run.assert_called_once()

        # --- Simulate agent completion: create .done file ---
        done_file = fake_workspace / ".done"
        done_file.touch()
        result_file = fake_workspace / "output" / "result.md"
        result_file.write_text("# Done\nTask completed successfully.\n")

        # --- Mock workspace_is_done to detect real .done file ---
        # (workspace_is_done checks for fake_workspace/.done)
        import open_agents.workspace as workspace_module
        real_workspace_is_done = workspace_module.workspace_is_done
        monkeypatch.setattr(lifecycle_module, "workspace_is_done", real_workspace_is_done)

        # --- Check agent ---
        status = lifecycle_module.check_agent(agent_name)

        assert status == "done"

        # State should be updated
        final_rec = get_agent(agent_name)
        assert final_rec.status == "done"
        assert final_rec.finished_at is not None

        # Telemetry finish_run should have been called
        mock_finish_run.assert_called_once_with("test-run-id-123", exit_status="success")

    def test_workspace_is_created(self, fake_workspace, monkeypatch):
        """Workspace directory and output subdir should exist after spawn."""
        agent_name = "ws-check-agent"

        mock_tmux_result = MagicMock()
        mock_tmux_result.returncode = 0
        mock_tmux_result.stdout = "2"

        monkeypatch.setattr(spawner_module, "session_exists", lambda: True)
        monkeypatch.setattr(spawner_module, "_tmux", lambda *a, **kw: mock_tmux_result)
        monkeypatch.setattr(spawner_module, "create_workspace", lambda *a, **kw: fake_workspace)
        monkeypatch.setattr(spawner_module.telemetry, "start_run", lambda **kw: None)
        monkeypatch.setattr(spawner_module, "save_checkpoint", lambda *a, **kw: None)

        rec = spawner_module.spawn_agent(
            name=agent_name,
            task="Check workspace creation",
            model="ollama/tinyllama",
            workspace=fake_workspace,
        )

        assert Path(rec.workspace).exists()
        assert (Path(rec.workspace) / "output").exists()

    def test_agent_still_running_without_done_file(self, fake_workspace, monkeypatch):
        """check_agent returns 'running' when .done file is absent."""
        agent_name = "still-running"

        mock_tmux_result = MagicMock()
        mock_tmux_result.returncode = 0
        mock_tmux_result.stdout = "3"

        monkeypatch.setattr(spawner_module, "session_exists", lambda: True)
        monkeypatch.setattr(spawner_module, "_tmux", lambda *a, **kw: mock_tmux_result)
        monkeypatch.setattr(spawner_module, "create_workspace", lambda *a, **kw: fake_workspace)
        monkeypatch.setattr(spawner_module.telemetry, "start_run", lambda **kw: None)
        monkeypatch.setattr(spawner_module, "save_checkpoint", lambda *a, **kw: None)

        # Lifecycle mocks
        monkeypatch.setattr(lifecycle_module, "_tmux", lambda *a, **kw: mock_tmux_result)

        spawner_module.spawn_agent(
            name=agent_name,
            task="Long running task",
            model="ollama/tinyllama",
            workspace=fake_workspace,
        )

        # No .done file → still running (window listed)
        mock_window_result = MagicMock()
        mock_window_result.returncode = 0
        mock_window_result.stdout = f"agent-{agent_name}\n"

        def tmux_router(*args, **kwargs):
            cmd = args[0] if args else ""
            if "list-windows" in cmd:
                return mock_window_result
            return mock_tmux_result

        monkeypatch.setattr(lifecycle_module, "_tmux", tmux_router)

        import open_agents.workspace as workspace_module
        monkeypatch.setattr(lifecycle_module, "workspace_is_done", workspace_module.workspace_is_done)

        status = lifecycle_module.check_agent(agent_name)
        assert status == "running"


# ---------------------------------------------------------------------------
# Test 2: test_template_loading
# ---------------------------------------------------------------------------


AGENTS_LIBRARY = Path(__file__).parents[2] / "agents" / "library"


@pytest.mark.skipif(
    not AGENTS_LIBRARY.exists(),
    reason="agents/library not found at expected path",
)
class TestTemplateLoading:
    """Test _load_template() with real template files from agents/library."""

    def _load_template(self, template_id: str) -> dict:
        """Extract _load_template logic for testing (no typer.Exit side effects)."""
        library_dir = AGENTS_LIBRARY
        lookup = template_id.lstrip("/")
        if lookup.endswith(".json"):
            lookup = lookup[:-5]

        for json_file in library_dir.rglob("*.json"):
            rel_no_ext = (
                str(json_file.relative_to(library_dir))
                .replace("\\", "/")
                .removesuffix(".json")
            )
            stem = json_file.stem
            if stem == lookup or rel_no_ext == lookup:
                return json.loads(json_file.read_text())

        # Second pass: match by 'id' field
        for json_file in library_dir.rglob("*.json"):
            try:
                data = json.loads(json_file.read_text())
            except Exception:
                continue
            if isinstance(data, dict) and data.get("id") == lookup:
                return data

        raise FileNotFoundError(f"Template '{template_id}' not found")

    def test_load_template_by_stem(self):
        """Strategy 1: load by exact file stem."""
        data = self._load_template("api-contract-validator")
        assert "systemPrompt" in data
        assert isinstance(data["systemPrompt"], str)
        assert len(data["systemPrompt"]) > 0

    def test_load_template_by_relative_path(self):
        """Strategy 2: load by relative path without extension."""
        data = self._load_template("code-dev/api-contract-validator")
        assert "systemPrompt" in data

    def test_load_template_by_id_field(self):
        """Strategy 3: load by JSON 'id' field."""
        data = self._load_template("code-dev-api-contract-validator")
        assert data.get("id") == "code-dev-api-contract-validator"

    def test_template_has_system_prompt(self):
        """All templates must have a non-empty systemPrompt."""
        data = self._load_template("api-contract-validator")
        assert "systemPrompt" in data
        assert data["systemPrompt"].strip() != ""

    def test_template_has_model_hint(self):
        """Templates should have a modelHint field."""
        data = self._load_template("api-contract-validator")
        assert "modelHint" in data
        assert isinstance(data["modelHint"], str)

    def test_load_template_not_found_raises(self):
        """Non-existent template raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            self._load_template("this-template-does-not-exist-xyz")

    def test_multiple_templates_have_required_fields(self):
        """Spot-check several templates for required fields."""
        templates_to_check = [
            "code-dev/api-contract-validator",
            "code-dev/dead-code-detector",
            "code-dev/mock-generator",
        ]
        required_fields = {"systemPrompt", "modelHint"}

        for template_id in templates_to_check:
            try:
                data = self._load_template(template_id)
                missing = required_fields - set(data.keys())
                assert not missing, f"Template '{template_id}' missing fields: {missing}"
            except FileNotFoundError:
                pytest.skip(f"Template '{template_id}' not available in this environment")


# ---------------------------------------------------------------------------
# Test 3: test_agent_name_validation
# ---------------------------------------------------------------------------


class TestAgentNameValidation:
    """Test that spawn_agent enforces name validation rules."""

    def _mock_spawn_deps(self, monkeypatch, fake_workspace):
        """Set up minimal mocks for spawn_agent to reach name validation."""
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "1"
        monkeypatch.setattr(spawner_module, "session_exists", lambda: True)
        monkeypatch.setattr(spawner_module, "_tmux", lambda *a, **kw: mock_result)
        monkeypatch.setattr(spawner_module, "create_workspace", lambda *a, **kw: fake_workspace)
        monkeypatch.setattr(spawner_module.telemetry, "start_run", lambda **kw: None)
        monkeypatch.setattr(spawner_module, "save_checkpoint", lambda *a, **kw: None)

    @pytest.mark.parametrize("invalid_name", [
        "MyAgent",           # uppercase letters not allowed
        "my agent",          # spaces not allowed
        "my_agent",          # underscores not allowed
        "A" * 63,            # too long (>62 chars)
        "-bad-start",        # starts with hyphen
        "",                  # empty string
        "agent!name",        # special character
        "UPPERCASE",         # all uppercase
    ])
    def test_invalid_names_are_rejected(self, invalid_name, fake_workspace, monkeypatch):
        """spawn_agent should raise RuntimeError for invalid agent names."""
        self._mock_spawn_deps(monkeypatch, fake_workspace)
        with pytest.raises(RuntimeError, match="Invalid agent name"):
            spawner_module.spawn_agent(
                name=invalid_name,
                task="Test task",
                model="ollama/tinyllama",
                workspace=fake_workspace,
            )

    @pytest.mark.parametrize("valid_name", [
        "myagent",
        "my-agent",
        "agent-123",
        "a",
        "a" * 62,            # exactly 62 chars
        "test-e2e-agent",
        "researcher-1",
        "abc-def-ghi",
        "0agent",            # starts with digit (valid per regex)
    ])
    def test_valid_names_are_accepted(self, valid_name, fake_workspace, monkeypatch):
        """spawn_agent should succeed with valid agent names."""
        self._mock_spawn_deps(monkeypatch, fake_workspace)
        rec = spawner_module.spawn_agent(
            name=valid_name,
            task="Test task",
            model="ollama/tinyllama",
            workspace=fake_workspace,
        )
        assert rec.name == valid_name
        assert get_agent(valid_name) is not None

    def test_name_63_chars_is_rejected(self, fake_workspace, monkeypatch):
        """A name of exactly 63 characters should be rejected (max is 62)."""
        self._mock_spawn_deps(monkeypatch, fake_workspace)
        long_name = "a" * 63
        with pytest.raises(RuntimeError, match="Invalid agent name"):
            spawner_module.spawn_agent(
                name=long_name,
                task="Test task",
                model="ollama/tinyllama",
                workspace=fake_workspace,
            )

    def test_name_62_chars_is_accepted(self, fake_workspace, monkeypatch):
        """A name of exactly 62 characters is at the boundary and should be accepted."""
        self._mock_spawn_deps(monkeypatch, fake_workspace)
        boundary_name = "a" * 62
        rec = spawner_module.spawn_agent(
            name=boundary_name,
            task="Test task",
            model="ollama/tinyllama",
            workspace=fake_workspace,
        )
        assert rec.name == boundary_name

    def test_duplicate_running_agent_rejected(self, fake_workspace, monkeypatch):
        """Spawning an agent with an existing 'running' name raises RuntimeError."""
        self._mock_spawn_deps(monkeypatch, fake_workspace)

        # First spawn succeeds
        spawner_module.spawn_agent(
            name="dup-agent",
            task="First task",
            model="ollama/tinyllama",
            workspace=fake_workspace,
        )

        # Second spawn with same name should fail (still running)
        with pytest.raises(RuntimeError, match="already running"):
            spawner_module.spawn_agent(
                name="dup-agent",
                task="Second task",
                model="ollama/tinyllama",
                workspace=fake_workspace,
            )
