"""Tests for the feedback loop system — parent injection, notifications, and watch-inbox."""

from __future__ import annotations

import threading
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from open_agents.workspace import create_workspace, _feedback_loop_instructions
from open_agents.notification import notify_tmux, start_notification_watcher


class TestFeedbackLoopInstructions:
    """Test that CLAUDE.md contains feedback loop instructions."""

    def test_feedback_instructions_contain_parent_name(self):
        """Feedback instructions should reference the parent agent name."""
        instructions = _feedback_loop_instructions("child-agent", "my-parent")
        assert "my-parent" in instructions
        assert "child-agent" in instructions
        assert "oa send my-parent" in instructions

    def test_feedback_instructions_contain_all_lifecycle_events(self):
        """All 5 lifecycle events should be present."""
        instructions = _feedback_loop_instructions("child", "parent")
        assert "START" in instructions or "Gestart" in instructions
        assert "MILESTONE" in instructions or "Milestone" in instructions
        assert "BLOKKADE" in instructions or "Geblokkeerd" in instructions
        assert "DONE" in instructions or "KLAAR" in instructions
        assert "FOUT" in instructions

    def test_default_parent_is_meta(self):
        """When no parent specified, parent_name defaults to 'meta'."""
        ws = create_workspace("test-agent", "test task")
        try:
            claude_md = (ws / "CLAUDE.md").read_text()
            assert "Je spawner heet: **meta**" in claude_md
        finally:
            import shutil
            shutil.rmtree(ws, ignore_errors=True)

    def test_custom_parent_name(self):
        """When parent_name is given, it appears in CLAUDE.md."""
        ws = create_workspace("child-agent", "test task", parent_name="orchestrator")
        try:
            claude_md = (ws / "CLAUDE.md").read_text()
            assert "Je spawner heet: **orchestrator**" in claude_md
            assert "oa send orchestrator" in claude_md
        finally:
            import shutil
            shutil.rmtree(ws, ignore_errors=True)

    def test_direct_mode_includes_feedback(self):
        """Feedback instructions should be present in direct write mode too."""
        ws = create_workspace("direct-agent", "test task", project_root="/tmp/fake-project", parent_name="boss")
        try:
            claude_md = (ws / "CLAUDE.md").read_text()
            assert "Je spawner heet: **boss**" in claude_md
            assert "DIRECT WRITE MODE" in claude_md
        finally:
            import shutil
            shutil.rmtree(ws, ignore_errors=True)


class TestNotification:
    """Test tmux notification functions."""

    @patch("open_agents.notification.subprocess.run")
    def test_notify_tmux_calls_subprocess(self, mock_run):
        """notify_tmux should call tmux display-message."""
        result = notify_tmux("Hello world", "agent-1")
        assert result is True
        mock_run.assert_called_once()
        args = mock_run.call_args
        cmd = args[0][0]
        assert "tmux" in cmd
        assert "display-message" in cmd

    @patch("open_agents.notification.subprocess.run", side_effect=FileNotFoundError)
    def test_notify_tmux_handles_missing_tmux(self, mock_run):
        """notify_tmux should return False if tmux is not available."""
        result = notify_tmux("Hello", "agent-1")
        assert result is False

    @patch("open_agents.notification.subprocess.run")
    def test_notify_tmux_truncates_long_messages(self, mock_run):
        """Long messages should be truncated."""
        long_msg = "x" * 200
        notify_tmux(long_msg, "agent-1")
        cmd = mock_run.call_args[0][0]
        # The display message (5th arg) should be truncated
        display_msg = cmd[4]
        assert len(display_msg) < 200

    @patch("open_agents.notification.read_inbox", return_value=[])
    def test_start_notification_watcher_returns_thread(self, mock_inbox):
        """start_notification_watcher should return a daemon thread and stop event."""
        thread, stop_event = start_notification_watcher(poll_interval=0.1)
        assert isinstance(thread, threading.Thread)
        assert isinstance(stop_event, threading.Event)
        assert thread.daemon is True
        stop_event.set()
        thread.join(timeout=2)
