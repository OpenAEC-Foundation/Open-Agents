"""Tests for the delegation fix — workspace CLAUDE.md, hook setup, and spawner PATH."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from open_agents.workspace import (
    _AGENT_PATH,
    _BLOCK_AGENT_HOOK,
    _agent_settings,
    create_workspace,
    cleanup_workspace,
)
from open_agents.spawner import _build_claude_command


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture()
def workspace(tmp_path):
    """Create a workspace and clean it up after the test."""
    # Redirect tempfile.mkdtemp to use tmp_path so we control the location
    ws_dir = tmp_path / "workspace"
    ws_dir.mkdir()
    with patch("open_agents.workspace.tempfile.mkdtemp", return_value=str(ws_dir)):
        ws = create_workspace("test-agent", "Do something", project_root="/tmp/project")
    yield ws
    cleanup_workspace(ws)


@pytest.fixture()
def workspace_no_project(tmp_path):
    """Workspace without project_root (default mode)."""
    ws_dir = tmp_path / "workspace-default"
    ws_dir.mkdir()
    with patch("open_agents.workspace.tempfile.mkdtemp", return_value=str(ws_dir)):
        ws = create_workspace("test-agent", "Do something")
    yield ws
    cleanup_workspace(ws)


# ---------------------------------------------------------------------------
# Workspace CLAUDE.md tests
# ---------------------------------------------------------------------------

class TestWorkspaceClaudeMd:
    def test_workspace_claudemd_has_delegation_instructions(self, workspace):
        """CLAUDE.md contains oa run instructions for sub-agent spawning."""
        content = (workspace / "CLAUDE.md").read_text()
        assert "oa run" in content, "CLAUDE.md should contain 'oa run' instructions"

    def test_workspace_claudemd_has_path(self, workspace):
        """CLAUDE.md contains the PATH export for oa-cli availability."""
        content = (workspace / "CLAUDE.md").read_text()
        assert "export PATH=" in content, "CLAUDE.md should contain PATH export"
        assert _AGENT_PATH in content, "CLAUDE.md should contain the full _AGENT_PATH"

    def test_workspace_claudemd_blocks_agent_tool(self, workspace):
        """CLAUDE.md mentions that the Agent tool is FORBIDDEN."""
        content = (workspace / "CLAUDE.md").read_text()
        assert "Agent tool" in content, "CLAUDE.md should mention 'Agent tool'"
        assert "VERBODEN" in content or "GEBLOKKEERD" in content or "BLOCKED" in content.upper(), (
            "CLAUDE.md should indicate the Agent tool is blocked/forbidden"
        )

    def test_workspace_claudemd_has_delegation_instructions_default_mode(self, workspace_no_project):
        """CLAUDE.md in default mode also contains oa run instructions."""
        content = (workspace_no_project / "CLAUDE.md").read_text()
        assert "oa run" in content

    def test_workspace_claudemd_has_path_default_mode(self, workspace_no_project):
        """CLAUDE.md in default mode also contains PATH export."""
        content = (workspace_no_project / "CLAUDE.md").read_text()
        assert "export PATH=" in content
        assert _AGENT_PATH in content


# ---------------------------------------------------------------------------
# Hook setup tests
# ---------------------------------------------------------------------------

class TestHookSetup:
    def test_workspace_has_claude_settings(self, workspace):
        """.claude/settings.json exists in the workspace."""
        settings_file = workspace / ".claude" / "settings.json"
        assert settings_file.exists(), ".claude/settings.json should exist"

    def test_workspace_settings_has_hook_config(self, workspace):
        """.claude/settings.json contains the Agent tool hook configuration."""
        settings_file = workspace / ".claude" / "settings.json"
        settings = json.loads(settings_file.read_text())
        assert "hooks" in settings
        assert "PreToolUse" in settings["hooks"]
        hooks = settings["hooks"]["PreToolUse"]
        matchers = [h.get("matcher") for h in hooks]
        assert "Agent" in matchers, "settings.json should have a hook matching 'Agent'"

    def test_workspace_has_block_hook(self, workspace):
        """.claude/hooks/block-agent-tool.sh exists in the workspace."""
        hook = workspace / ".claude" / "hooks" / "block-agent-tool.sh"
        assert hook.exists(), ".claude/hooks/block-agent-tool.sh should exist"

    def test_block_hook_is_executable(self, workspace):
        """block-agent-tool.sh has execute permissions."""
        hook = workspace / ".claude" / "hooks" / "block-agent-tool.sh"
        assert os.access(hook, os.X_OK), "block-agent-tool.sh should be executable"

    def test_block_hook_exits_2(self, workspace):
        """block-agent-tool.sh exits with code 2 (blocked signal for Claude Code)."""
        hook = workspace / ".claude" / "hooks" / "block-agent-tool.sh"
        result = subprocess.run(
            ["bash", str(hook)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 2, (
            f"block-agent-tool.sh should exit 2, got {result.returncode}"
        )

    def test_block_hook_outputs_message(self, workspace):
        """block-agent-tool.sh outputs a redirect message to stderr."""
        hook = workspace / ".claude" / "hooks" / "block-agent-tool.sh"
        result = subprocess.run(
            ["bash", str(hook)],
            capture_output=True,
            text=True,
        )
        assert "oa run" in result.stderr, "Hook should mention 'oa run' in its message"


# ---------------------------------------------------------------------------
# Spawner tests
# ---------------------------------------------------------------------------

class TestSpawnerCommand:
    def test_spawner_uses_full_path(self, tmp_path):
        """_build_claude_command exports the full _AGENT_PATH so oa-cli is available."""
        cmd = _build_claude_command(tmp_path, "test-agent")
        assert "export PATH=" in cmd, "_build_claude_command should export PATH"
        assert _AGENT_PATH in cmd, "_build_claude_command should include full _AGENT_PATH"

    def test_spawner_command_with_model(self, tmp_path):
        """_build_claude_command includes the model flag when specified."""
        cmd = _build_claude_command(tmp_path, "test-agent", claude_model="sonnet")
        assert "--model sonnet" in cmd

    def test_spawner_command_without_model(self, tmp_path):
        """_build_claude_command omits model flag when not specified."""
        cmd = _build_claude_command(tmp_path, "test-agent", claude_model=None)
        assert "--model" not in cmd

    def test_spawner_command_unsets_claudecode(self, tmp_path):
        """_build_claude_command unsets CLAUDECODE to prevent nesting issues."""
        cmd = _build_claude_command(tmp_path, "test-agent")
        assert "unset CLAUDECODE" in cmd

    def test_spawner_command_changes_to_workspace(self, tmp_path):
        """_build_claude_command cd's into the workspace directory."""
        cmd = _build_claude_command(tmp_path, "test-agent")
        assert f"cd {tmp_path}" in cmd
