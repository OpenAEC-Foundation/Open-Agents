"""Unit tests for open_agents.orchestrator — model mapping and command builders."""

from __future__ import annotations

import shlex
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

import open_agents.orchestrator as orch_module
from open_agents.orchestrator import (
    CLAUDE_CMD,
    CLAUDE_MODEL_MAP,
    OLLAMA_CMD,
    SESSION_NAME,
    _build_claude_command,
    _build_ollama_command,
)


# ---------------------------------------------------------------------------
# CLAUDE_MODEL_MAP
# ---------------------------------------------------------------------------

class TestClaudeModelMap:
    def test_default_claude_maps_to_none(self):
        assert CLAUDE_MODEL_MAP["claude"] is None

    def test_opus_maps_to_opus(self):
        assert CLAUDE_MODEL_MAP["claude/opus"] == "opus"

    def test_sonnet_maps_to_sonnet(self):
        assert CLAUDE_MODEL_MAP["claude/sonnet"] == "sonnet"

    def test_haiku_maps_to_haiku(self):
        assert CLAUDE_MODEL_MAP["claude/haiku"] == "haiku"

    def test_map_has_exactly_four_entries(self):
        assert len(CLAUDE_MODEL_MAP) == 4

    def test_all_values_except_default_are_strings(self):
        for key, value in CLAUDE_MODEL_MAP.items():
            if key != "claude":
                assert isinstance(value, str), f"Expected str for {key}, got {type(value)}"


# ---------------------------------------------------------------------------
# _build_claude_command
# ---------------------------------------------------------------------------

class TestBuildClaudeCommand:
    def test_contains_cd_to_workspace(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent")
        assert f"cd {tmp_path}" in cmd

    def test_contains_claude_cmd(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent")
        assert CLAUDE_CMD in cmd

    def test_contains_dangerously_skip_permissions(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent")
        assert "--dangerously-skip-permissions" in cmd

    def test_contains_prompt_flag(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent")
        assert " -p " in cmd

    def test_prompt_contains_claude_md_instruction(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent")
        assert "CLAUDE.md" in cmd

    def test_no_model_flag_when_claude_model_is_none(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent", claude_model=None)
        assert "--model" not in cmd

    def test_model_flag_included_when_specified(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent", claude_model="opus")
        assert "--model opus" in cmd

    def test_model_flag_for_sonnet(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent", claude_model="sonnet")
        assert "--model sonnet" in cmd

    def test_contains_touch_done(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent")
        assert "touch .done" in cmd

    def test_contains_agent_name_in_finish_echo(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "my-special-agent")
        assert "my-special-agent" in cmd

    def test_unsets_claudecode_env(self, tmp_path):
        cmd = _build_claude_command(tmp_path, "myagent")
        assert "unset CLAUDECODE" in cmd

    def test_returns_string(self, tmp_path):
        assert isinstance(_build_claude_command(tmp_path, "myagent"), str)

    def test_agent_name_is_shell_quoted(self, tmp_path):
        """Agent name with spaces should be shell-safe."""
        cmd = _build_claude_command(tmp_path, "agent with spaces")
        # shlex.quote wraps the name in quotes so it doesn't break the shell
        quoted = shlex.quote("agent with spaces")
        assert quoted in cmd


# ---------------------------------------------------------------------------
# _build_ollama_command
# ---------------------------------------------------------------------------

class TestBuildOllamaCommand:
    def test_contains_cd_to_workspace(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert f"cd {tmp_path}" in cmd

    def test_contains_ollama_cmd(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert OLLAMA_CMD in cmd

    def test_contains_model_name(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert "llama3" in cmd

    def test_model_name_is_quoted(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3:8b")
        assert shlex.quote("llama3:8b") in cmd

    def test_pipes_task_txt(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert "cat task.txt" in cmd

    def test_redirects_output_to_result_md(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert "output/result.md" in cmd

    def test_strips_ansi_codes_with_sed(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert "sed" in cmd

    def test_sets_term_dumb(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert "TERM=dumb" in cmd

    def test_redirects_stderr_to_dev_null(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert "2>/dev/null" in cmd

    def test_contains_touch_done(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "myagent", "llama3")
        assert "touch .done" in cmd

    def test_contains_agent_name_in_finish_echo(self, tmp_path):
        cmd = _build_ollama_command(tmp_path, "my-agent", "llama3")
        assert "my-agent" in cmd

    def test_returns_string(self, tmp_path):
        assert isinstance(_build_ollama_command(tmp_path, "myagent", "llama3"), str)

    def test_different_model_reflected_in_command(self, tmp_path):
        cmd1 = _build_ollama_command(tmp_path, "a", "llama3")
        cmd2 = _build_ollama_command(tmp_path, "a", "mistral")
        assert "llama3" in cmd1
        assert "mistral" in cmd2
        assert "llama3" not in cmd2


# ---------------------------------------------------------------------------
# spawn_agent — mocked tmux calls
# ---------------------------------------------------------------------------

class TestSpawnAgentMocked:
    """Integration-level tests for spawn_agent with all subprocess calls mocked."""

    def _mock_run(self, returncode=0, stdout="", stderr=""):
        m = MagicMock()
        m.returncode = returncode
        m.stdout = stdout
        m.stderr = stderr
        return m

    @pytest.fixture()
    def mock_subprocess(self):
        """Mock subprocess.run to avoid real tmux calls."""
        with patch("open_agents.tmux.subprocess.run") as mock_run:
            mock_run.return_value = self._mock_run()
            yield mock_run

    @pytest.fixture()
    def isolated_state(self, tmp_path, monkeypatch):
        import open_agents.state as state_module
        import open_agents.spawner as spawner_module
        oa_dir = tmp_path / ".oa"
        monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
        monkeypatch.setattr(state_module, "STATE_FILE", oa_dir / "agents.json")
        # Disable GPU routing so ollama/* models are not re-routed to remote hosts
        monkeypatch.setattr(spawner_module, "load_config", lambda: {"timeout_minutes": 60, "prefer_gpu": False})

    def test_spawn_raises_when_no_session(self, mock_subprocess, isolated_state):
        """spawn_agent raises if the oa session doesn't exist."""
        mock_subprocess.return_value = self._mock_run(returncode=1)
        with pytest.raises(RuntimeError, match="No oa session"):
            from open_agents.orchestrator import spawn_agent
            spawn_agent("agent1", "task")

    def test_spawn_claude_agent(self, tmp_path, mock_subprocess, isolated_state):
        """spawn_agent creates an AgentRecord for a Claude agent."""
        # First call = session_exists (returncode 0 = exists)
        mock_subprocess.return_value = self._mock_run(returncode=0)

        ws = tmp_path / "ws"
        ws.mkdir()
        (ws / "output").mkdir()

        from open_agents.orchestrator import spawn_agent
        rec = spawn_agent("claude-agent", "do something", model="claude", workspace=ws)

        assert rec.name == "claude-agent"
        assert rec.model == "claude"
        assert rec.status == "running"

    def test_spawn_ollama_agent(self, tmp_path, mock_subprocess, isolated_state):
        """spawn_agent creates an AgentRecord for an Ollama agent."""
        mock_subprocess.return_value = self._mock_run(returncode=0)

        ws = tmp_path / "ws"
        ws.mkdir()
        (ws / "output").mkdir()

        from open_agents.orchestrator import spawn_agent
        rec = spawn_agent("ollama-agent", "do something", model="ollama/llama3", workspace=ws)

        assert rec.name == "ollama-agent"
        assert rec.model == "ollama/llama3"
        assert rec.status == "running"

    def test_spawn_raises_when_agent_already_running(
        self, tmp_path, mock_subprocess, isolated_state
    ):
        """spawn_agent raises if agent with same name is already running."""
        mock_subprocess.return_value = self._mock_run(returncode=0)

        ws = tmp_path / "ws"
        ws.mkdir()
        (ws / "output").mkdir()

        from open_agents.orchestrator import spawn_agent

        # First spawn succeeds
        spawn_agent("dup-agent", "task", model="claude", workspace=ws)

        # Second spawn with same name should raise
        with pytest.raises(RuntimeError, match="already running"):
            spawn_agent("dup-agent", "task", model="claude", workspace=ws)


# ---------------------------------------------------------------------------
# session_exists / start_session — mocked
# ---------------------------------------------------------------------------

class TestSessionMocked:
    def _mock_run(self, returncode=0):
        m = MagicMock()
        m.returncode = returncode
        return m

    def test_session_exists_true_when_returncode_zero(self):
        with patch("open_agents.tmux.subprocess.run") as mock_run:
            mock_run.return_value = self._mock_run(returncode=0)
            from open_agents.orchestrator import session_exists
            assert session_exists() is True

    def test_session_exists_false_when_returncode_nonzero(self):
        with patch("open_agents.tmux.subprocess.run") as mock_run:
            mock_run.return_value = self._mock_run(returncode=1)
            from open_agents.orchestrator import session_exists
            assert session_exists() is False


class TestParseOllamaPs:
    """Tests for spawner._parse_ollama_ps() (issue #79 / L-088)."""

    def _ps(self, *rows: str) -> str:
        header = "NAME              ID              SIZE      PROCESSOR          CONTEXT  UNTIL\n"
        return header + "\n".join(rows)

    def test_empty_output_returns_zero(self):
        from open_agents.spawner import _parse_ollama_ps
        assert _parse_ollama_ps("") == 0.0

    def test_header_only_returns_zero(self):
        from open_agents.spawner import _parse_ollama_ps
        assert _parse_ollama_ps("NAME  ID  SIZE  PROCESSOR  CONTEXT  UNTIL") == 0.0

    def test_single_model(self):
        from open_agents.spawner import _parse_ollama_ps
        output = self._ps("mistral:7b  abc123  4.4 GB  100% GPU  2048  4 minutes from now")
        assert _parse_ollama_ps(output) == pytest.approx(4.4)

    def test_multiple_models_summed(self):
        from open_agents.spawner import _parse_ollama_ps
        output = self._ps(
            "mistral:7b    abc123  4.4 GB  100% GPU  2048  4 minutes from now",
            "codestral:22b def456  13.0 GB  100% GPU  4096  2 minutes from now",
        )
        assert _parse_ollama_ps(output) == pytest.approx(17.4)

    def test_large_model_qwen32b(self):
        from open_agents.spawner import _parse_ollama_ps
        output = self._ps("qwen2.5:32b  xyz789  19.0 GB  100% GPU  8192  1 minutes from now")
        assert _parse_ollama_ps(output) == pytest.approx(19.0)

    def test_malformed_line_ignored(self):
        from open_agents.spawner import _parse_ollama_ps
        output = self._ps(
            "mistral:7b  abc123  4.4 GB  100% GPU  2048  4 minutes from now",
            "corrupted line without size token",
        )
        assert _parse_ollama_ps(output) == pytest.approx(4.4)


class TestVramEstimates:
    """Verify _VRAM_ESTIMATES contains required models (issue #79)."""

    def test_large_models_present(self):
        from open_agents.spawner import _VRAM_ESTIMATES
        required = ["mixtral:8x7b", "qwen2.5:14b", "qwen2.5:32b", "gemma3:27b", "llama3.1:8b"]
        for model in required:
            assert model in _VRAM_ESTIMATES, f"Missing VRAM estimate for {model}"

    def test_mixtral_exceeds_gpu_capacity(self):
        from open_agents.spawner import _VRAM_ESTIMATES, _GPU_TOTAL_VRAM
        assert _VRAM_ESTIMATES["mixtral:8x7b"] > _GPU_TOTAL_VRAM

    def test_qwen32b_fits_just_under_capacity(self):
        from open_agents.spawner import _VRAM_ESTIMATES, _GPU_TOTAL_VRAM
        assert _VRAM_ESTIMATES["qwen2.5:32b"] < _GPU_TOTAL_VRAM
