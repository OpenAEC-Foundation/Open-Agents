"""Tests for AgentManager background polling."""

from __future__ import annotations

import threading
import time
from typing import Optional
from unittest.mock import MagicMock, call, patch

import pytest

from open_agents.auto_manager import AgentManager
from open_agents.state import AgentRecord


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_record(name: str, status: str = "running") -> AgentRecord:
    return AgentRecord(
        name=name,
        task=f"task for {name}",
        workspace=f"/tmp/fake-{name}",
        tmux_window=f"agent-{name}",
        status=status,
    )


# ---------------------------------------------------------------------------
# Unit tests (no real threads, no real state)
# ---------------------------------------------------------------------------

class TestAgentManagerCallbacks:
    """Test that callbacks fire correctly for status changes."""

    def _make_manager(self):
        done_cb = MagicMock()
        error_cb = MagicMock()
        mgr = AgentManager(
            on_agent_done=done_cb,
            on_agent_error=error_cb,
            poll_interval=60,  # long interval — we call _poll_once manually
        )
        return mgr, done_cb, error_cb

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_done_callback_fires(self, mock_check, mock_list):
        """on_agent_done is called when an agent transitions to 'done'."""
        rec = _make_record("agent-a")
        mock_list.return_value = [rec]
        mock_check.return_value = "done"

        mgr, done_cb, error_cb = self._make_manager()
        mgr._poll_once()

        done_cb.assert_called_once_with(rec)
        error_cb.assert_not_called()

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_error_callback_fires(self, mock_check, mock_list):
        """on_agent_error is called when an agent transitions to 'error'."""
        rec = _make_record("agent-b")
        mock_list.return_value = [rec]
        mock_check.return_value = "error"

        mgr, done_cb, error_cb = self._make_manager()
        mgr._poll_once()

        error_cb.assert_called_once_with(rec, "error")
        done_cb.assert_not_called()

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_timeout_callback_fires(self, mock_check, mock_list):
        """on_agent_error is called for 'timeout' status."""
        rec = _make_record("agent-c")
        mock_list.return_value = [rec]
        mock_check.return_value = "timeout"

        mgr, done_cb, error_cb = self._make_manager()
        mgr._poll_once()

        error_cb.assert_called_once_with(rec, "timeout")

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_killed_callback_fires(self, mock_check, mock_list):
        """on_agent_error is called for 'killed' status."""
        rec = _make_record("agent-d")
        mock_list.return_value = [rec]
        mock_check.return_value = "killed"

        mgr, done_cb, error_cb = self._make_manager()
        mgr._poll_once()

        error_cb.assert_called_once_with(rec, "killed")

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_still_running_no_callback(self, mock_check, mock_list):
        """No callback fires when agent is still running."""
        rec = _make_record("agent-e")
        mock_list.return_value = [rec]
        mock_check.return_value = "running"

        mgr, done_cb, error_cb = self._make_manager()
        mgr._poll_once()

        done_cb.assert_not_called()
        error_cb.assert_not_called()


class TestDuplicateNotificationPrevention:
    """Test that callbacks are NOT fired more than once per agent."""

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_done_callback_not_fired_twice(self, mock_check, mock_list):
        """on_agent_done fires only once even if poll runs multiple times."""
        rec = _make_record("agent-x")
        mock_list.return_value = [rec]
        mock_check.return_value = "done"

        done_cb = MagicMock()
        error_cb = MagicMock()
        mgr = AgentManager(on_agent_done=done_cb, on_agent_error=error_cb, poll_interval=60)

        mgr._poll_once()
        mgr._poll_once()
        mgr._poll_once()

        assert done_cb.call_count == 1

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_error_callback_not_fired_twice(self, mock_check, mock_list):
        """on_agent_error fires only once even if poll runs multiple times."""
        rec = _make_record("agent-y")
        mock_list.return_value = [rec]
        mock_check.return_value = "error"

        done_cb = MagicMock()
        error_cb = MagicMock()
        mgr = AgentManager(on_agent_done=done_cb, on_agent_error=error_cb, poll_interval=60)

        mgr._poll_once()
        mgr._poll_once()

        assert error_cb.call_count == 1

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_multiple_agents_independent_notification(self, mock_check, mock_list):
        """Each agent is notified independently."""
        rec1 = _make_record("agent-1")
        rec2 = _make_record("agent-2")
        mock_list.return_value = [rec1, rec2]
        mock_check.side_effect = lambda name: "done" if name == "agent-1" else "error"

        done_cb = MagicMock()
        error_cb = MagicMock()
        mgr = AgentManager(on_agent_done=done_cb, on_agent_error=error_cb, poll_interval=60)

        mgr._poll_once()

        done_cb.assert_called_once_with(rec1)
        error_cb.assert_called_once_with(rec2, "error")


class TestRecentCompletions:
    """Test get_recent_completions tracking."""

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_recent_completions_populated(self, mock_check, mock_list):
        """get_recent_completions returns done agents (up to last 5)."""
        records = [_make_record(f"agent-{i}") for i in range(7)]
        mock_list.return_value = records
        mock_check.return_value = "done"

        done_cb = MagicMock()
        error_cb = MagicMock()
        mgr = AgentManager(on_agent_done=done_cb, on_agent_error=error_cb, poll_interval=60)

        mgr._poll_once()

        completions = mgr.get_recent_completions()
        assert len(completions) == 5  # maxlen=5

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_recent_completions_only_done(self, mock_check, mock_list):
        """Error agents are NOT added to recent completions."""
        rec = _make_record("agent-err")
        mock_list.return_value = [rec]
        mock_check.return_value = "error"

        mgr = AgentManager(on_agent_done=MagicMock(), on_agent_error=MagicMock(), poll_interval=60)
        mgr._poll_once()

        assert mgr.get_recent_completions() == []


class TestGetRunningCount:
    """Test get_running_count."""

    @patch("open_agents.auto_manager.list_agents")
    def test_running_count(self, mock_list):
        mock_list.return_value = [_make_record(f"a{i}") for i in range(3)]

        mgr = AgentManager(on_agent_done=MagicMock(), on_agent_error=MagicMock())
        assert mgr.get_running_count() == 3
        mock_list.assert_called_with(status="running")


class TestStartStop:
    """Test daemon thread lifecycle."""

    @patch("open_agents.auto_manager.list_agents", return_value=[])
    def test_start_creates_daemon_thread(self, _mock_list):
        mgr = AgentManager(
            on_agent_done=MagicMock(),
            on_agent_error=MagicMock(),
            poll_interval=0.05,
        )
        mgr.start()
        assert mgr._thread is not None
        assert mgr._thread.is_alive()
        assert mgr._thread.daemon is True
        mgr.stop()

    @patch("open_agents.auto_manager.list_agents", return_value=[])
    def test_stop_terminates_thread(self, _mock_list):
        mgr = AgentManager(
            on_agent_done=MagicMock(),
            on_agent_error=MagicMock(),
            poll_interval=0.05,
        )
        mgr.start()
        mgr.stop()
        assert mgr._thread is None

    @patch("open_agents.auto_manager.list_agents", return_value=[])
    def test_start_idempotent(self, _mock_list):
        """Calling start() twice doesn't create two threads."""
        mgr = AgentManager(
            on_agent_done=MagicMock(),
            on_agent_error=MagicMock(),
            poll_interval=0.05,
        )
        mgr.start()
        first_thread = mgr._thread
        mgr.start()  # Should be a no-op
        assert mgr._thread is first_thread
        mgr.stop()


class TestCallbackExceptionHandling:
    """Test that exceptions in callbacks don't crash the manager."""

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_exception_in_done_callback_doesnt_crash(self, mock_check, mock_list):
        rec = _make_record("agent-crash")
        mock_list.return_value = [rec]
        mock_check.return_value = "done"

        def bad_callback(r):
            raise RuntimeError("Simulated callback error")

        mgr = AgentManager(on_agent_done=bad_callback, on_agent_error=MagicMock(), poll_interval=60)
        # Should not raise
        mgr._poll_once()

    @patch("open_agents.auto_manager.list_agents")
    @patch("open_agents.auto_manager.check_agent")
    def test_exception_in_check_agent_doesnt_crash(self, mock_check, mock_list):
        rec = _make_record("agent-check-fail")
        mock_list.return_value = [rec]
        mock_check.side_effect = RuntimeError("check_agent exploded")

        mgr = AgentManager(on_agent_done=MagicMock(), on_agent_error=MagicMock(), poll_interval=60)
        # Should not raise
        mgr._poll_once()
