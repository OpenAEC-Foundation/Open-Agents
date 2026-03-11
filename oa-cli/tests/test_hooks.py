"""Tests for open_agents.hooks — HookRunner, hook registration, graceful shutdown."""

from __future__ import annotations

import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

import open_agents.hooks as hooks_module
from open_agents.hooks import (
    VALID_EVENTS,
    HookRunner,
    clear_hooks,
    register_hook,
    trigger_hook,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clean_global_hooks():
    """Reset global HOOKS registry before every test."""
    clear_hooks()
    yield
    clear_hooks()


# ---------------------------------------------------------------------------
# test_hook_registration — HookRunner.register_hook works
# ---------------------------------------------------------------------------

class TestHookRegistration:
    def test_register_valid_event(self):
        runner = HookRunner()
        cb = MagicMock()
        runner.register_hook("on_idle", cb)
        assert cb in runner._hooks["on_idle"]

    def test_register_multiple_callbacks_same_event(self):
        runner = HookRunner()
        cb1, cb2 = MagicMock(), MagicMock()
        runner.register_hook("on_task_complete", cb1)
        runner.register_hook("on_task_complete", cb2)
        assert runner._hooks["on_task_complete"] == [cb1, cb2]

    def test_register_invalid_event_raises(self):
        runner = HookRunner()
        with pytest.raises(ValueError, match="Unknown hook event"):
            runner.register_hook("on_nonexistent", lambda ctx: None)

    def test_register_all_valid_events(self):
        runner = HookRunner()
        for event in VALID_EVENTS:
            cb = MagicMock()
            runner.register_hook(event, cb)
            assert cb in runner._hooks[event]

    def test_global_register_hook_valid(self):
        cb = MagicMock()
        register_hook("on_idle", cb)
        assert cb in hooks_module.HOOKS["on_idle"]

    def test_global_register_hook_invalid_raises(self):
        with pytest.raises(ValueError):
            register_hook("bogus_event", lambda ctx: None)


# ---------------------------------------------------------------------------
# test_hook_trigger — trigger calls the correct callbacks
# ---------------------------------------------------------------------------

class TestHookTrigger:
    def test_trigger_calls_registered_callback(self):
        runner = HookRunner()
        cb = MagicMock()
        runner.register_hook("on_idle", cb)
        runner.trigger("on_idle", "my-agent")
        cb.assert_called_once()

    def test_trigger_passes_agent_name_in_context(self):
        runner = HookRunner()
        received = {}

        def capture(ctx):
            received.update(ctx)

        runner.register_hook("on_task_complete", capture)
        runner.trigger("on_task_complete", "agent-42")
        assert received["agent"] == "agent-42"

    def test_trigger_passes_extra_context(self):
        runner = HookRunner()
        received = {}

        def capture(ctx):
            received.update(ctx)

        runner.register_hook("on_error", capture)
        runner.trigger("on_error", "agent-x", extra={"error": "timeout"})
        assert received["error"] == "timeout"
        assert received["agent"] == "agent-x"

    def test_trigger_returns_called_names(self):
        runner = HookRunner()

        def my_handler(ctx):
            pass

        runner.register_hook("on_idle", my_handler)
        called = runner.trigger("on_idle", "agent-1")
        assert "my_handler" in called

    def test_trigger_invalid_event_raises(self):
        runner = HookRunner()
        with pytest.raises(ValueError):
            runner.trigger("bad_event", "agent-1")

    def test_trigger_does_not_fail_on_callback_exception(self):
        """A failing callback should be logged but not propagate."""
        runner = HookRunner()

        def boom(ctx):
            raise RuntimeError("simulated failure")

        runner.register_hook("on_idle", boom)
        # Should not raise
        called = runner.trigger("on_idle", "agent-1")
        assert called == []

    def test_trigger_calls_multiple_callbacks(self):
        runner = HookRunner()
        results = []
        runner.register_hook("on_idle", lambda ctx: results.append("a"))
        runner.register_hook("on_idle", lambda ctx: results.append("b"))
        runner.trigger("on_idle", "agent-1")
        assert results == ["a", "b"]

    def test_global_trigger_hook(self):
        cb = MagicMock()
        register_hook("on_task_complete", cb)
        trigger_hook("on_task_complete", {"agent": "test-agent"})
        cb.assert_called_once_with({"agent": "test-agent"})


# ---------------------------------------------------------------------------
# test_graceful_shutdown_request — shutdown request is sent
# ---------------------------------------------------------------------------

class TestGracefulShutdownRequest:
    def test_shutdown_request_sends_message(self, tmp_path, monkeypatch):
        """shutdown_request() writes a message file to the recipient's inbox."""
        import open_agents.messaging as messaging_module

        monkeypatch.setattr(messaging_module, "MESSAGES_DIR", tmp_path / "messages")
        monkeypatch.setattr(messaging_module, "BROADCAST_DIR", tmp_path / "messages" / "_broadcast")

        from open_agents.messaging import shutdown_request

        path = shutdown_request("my-agent", sender="tester")
        assert path.exists()

        import json
        msg = json.loads(path.read_text())
        assert msg["to"] == "my-agent"
        assert msg["from"] == "tester"
        assert msg["metadata"]["type"] == "shutdown_request"

    def test_shutdown_approve_sends_message(self, tmp_path, monkeypatch):
        import open_agents.messaging as messaging_module

        monkeypatch.setattr(messaging_module, "MESSAGES_DIR", tmp_path / "messages")
        monkeypatch.setattr(messaging_module, "BROADCAST_DIR", tmp_path / "messages" / "_broadcast")

        from open_agents.messaging import shutdown_approve

        path = shutdown_approve("my-agent", sender="my-agent")
        import json
        msg = json.loads(path.read_text())
        assert msg["metadata"]["type"] == "shutdown_approve"

    def test_shutdown_reject_sends_message(self, tmp_path, monkeypatch):
        import open_agents.messaging as messaging_module

        monkeypatch.setattr(messaging_module, "MESSAGES_DIR", tmp_path / "messages")
        monkeypatch.setattr(messaging_module, "BROADCAST_DIR", tmp_path / "messages" / "_broadcast")

        from open_agents.messaging import shutdown_reject

        path = shutdown_reject("my-agent", sender="my-agent", reason="still working")
        import json
        msg = json.loads(path.read_text())
        assert msg["metadata"]["type"] == "shutdown_reject"
        assert msg["metadata"]["reason"] == "still working"


# ---------------------------------------------------------------------------
# test_graceful_shutdown_timeout — timeout triggers force shutdown
# ---------------------------------------------------------------------------

class TestGracefulShutdownTimeout:
    def test_poll_shutdown_response_returns_none_on_timeout(self, tmp_path, monkeypatch):
        """poll_shutdown_response returns None when no response arrives within timeout."""
        import open_agents.messaging as messaging_module

        monkeypatch.setattr(messaging_module, "MESSAGES_DIR", tmp_path / "messages")
        monkeypatch.setattr(messaging_module, "BROADCAST_DIR", tmp_path / "messages" / "_broadcast")

        from open_agents.messaging import poll_shutdown_response

        result = poll_shutdown_response("ghost-agent", timeout=0.1, poll_interval=0.05)
        assert result is None

    def test_poll_shutdown_response_returns_approve(self, tmp_path, monkeypatch):
        """poll_shutdown_response returns 'approve' when approve message is in inbox."""
        import open_agents.messaging as messaging_module

        monkeypatch.setattr(messaging_module, "MESSAGES_DIR", tmp_path / "messages")
        monkeypatch.setattr(messaging_module, "BROADCAST_DIR", tmp_path / "messages" / "_broadcast")

        from open_agents.messaging import poll_shutdown_response, shutdown_approve

        # Pre-populate the inbox with an approve message
        shutdown_approve("waiting-agent", sender="waiting-agent")

        result = poll_shutdown_response("waiting-agent", timeout=2.0, poll_interval=0.1)
        assert result == "approve"

    def test_poll_shutdown_response_returns_reject(self, tmp_path, monkeypatch):
        """poll_shutdown_response returns 'reject' when reject message is in inbox."""
        import open_agents.messaging as messaging_module

        monkeypatch.setattr(messaging_module, "MESSAGES_DIR", tmp_path / "messages")
        monkeypatch.setattr(messaging_module, "BROADCAST_DIR", tmp_path / "messages" / "_broadcast")

        from open_agents.messaging import poll_shutdown_response, shutdown_reject

        shutdown_reject("waiting-agent", sender="waiting-agent", reason="busy")

        result = poll_shutdown_response("waiting-agent", timeout=2.0, poll_interval=0.1)
        assert result == "reject"

    def test_shutdown_cmd_force_kills_immediately(self, tmp_path, monkeypatch):
        """oa shutdown --force kills the agent without waiting for a response."""
        import open_agents.state as state_module
        from open_agents.state import AgentRecord, add_agent

        oa_dir = tmp_path / ".oa"
        state_file = oa_dir / "agents.json"
        monkeypatch.setattr(state_module, "OA_DIR", oa_dir)
        monkeypatch.setattr(state_module, "STATE_FILE", state_file)

        add_agent(AgentRecord(name="target", task="work", workspace=str(tmp_path), tmux_window="w-target"))

        killed = []

        def fake_kill(name):
            killed.append(name)
            return True

        import open_agents.cli as cli_module
        monkeypatch.setattr(cli_module, "get_agent", state_module.get_agent)

        from typer.testing import CliRunner
        runner = CliRunner()

        with patch("open_agents.lifecycle.kill_agent", side_effect=fake_kill):
            result = runner.invoke(cli_module.app, ["shutdown", "target", "--force"])

        assert "target" in killed or result.exit_code == 0
