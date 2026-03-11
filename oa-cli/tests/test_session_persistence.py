"""Integration tests for Session Persistence feature (W3.2)."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_agent_rec(status="done", task="test task", output_file="/tmp/out.txt"):
    rec = MagicMock()
    rec.status = status
    rec.task = task
    rec.output_file = output_file
    rec.model = "claude/sonnet"
    rec.created_at = time.time()
    return rec


# ---------------------------------------------------------------------------
# SessionRecord & Store tests
# ---------------------------------------------------------------------------

class TestSessionStore:

    def test_create_snapshot(self, tmp_path):
        """create_snapshot() returns a valid SessionRecord."""
        with (
            patch("open_agents.session_store.SESSIONS_DIR", tmp_path / "sessions"),
            patch("open_agents.session_store.load_agents", return_value={}),
            patch("open_agents.session_store._git_state", return_value={"branch": "main"}),
            patch("open_agents.session_store.load_config", return_value={"version": "0.2.0"}),
        ):
            from open_agents.session_store import create_snapshot, SCHEMA_VERSION
            record = create_snapshot(shutdown_mode="stop")
            assert record.shutdown_mode == "stop"
            assert record.schema_version == SCHEMA_VERSION
            assert isinstance(record.session_id, str)
            assert record.started_at > 0

    def test_schema_version(self, tmp_path):
        """schema_version is always 1."""
        with (
            patch("open_agents.session_store.SESSIONS_DIR", tmp_path / "sessions"),
            patch("open_agents.session_store.load_agents", return_value={}),
            patch("open_agents.session_store._git_state", return_value={}),
            patch("open_agents.session_store.load_config", return_value={}),
        ):
            from open_agents.session_store import create_snapshot, SCHEMA_VERSION
            assert SCHEMA_VERSION == 1
            record = create_snapshot()
            assert record.schema_version == 1

    def test_save_and_load(self, tmp_path):
        """save + load round-trip preserves all fields."""
        sessions_dir = tmp_path / "sessions"
        sessions_dir.mkdir()
        with (
            patch("open_agents.session_store.SESSIONS_DIR", sessions_dir),
        ):
            from open_agents.session_store import SessionRecord, save_session, load_session
            record = SessionRecord(
                session_id="test-001",
                schema_version=1,
                started_at=1000.0,
                shutdown_mode="stop",
                agents_snapshot={"agent1": {"status": "done"}},
                agent_summary={"total": 1},
                git_state={"branch": "main"},
                config_snapshot={"version": "0.2.0"},
                ended_at=2000.0,
                duration_seconds=1000.0,
                project_root="/tmp/project",
            )
            save_session(record)
            loaded = load_session("test-001")
            assert loaded is not None
            assert loaded.session_id == "test-001"
            assert loaded.shutdown_mode == "stop"
            assert loaded.started_at == 1000.0
            assert loaded.ended_at == 2000.0
            assert loaded.project_root == "/tmp/project"
            assert loaded.agents_snapshot == {"agent1": {"status": "done"}}

    def test_list_sessions(self, tmp_path):
        """list_sessions returns multiple sessions, newest first."""
        sessions_dir = tmp_path / "sessions"
        sessions_dir.mkdir()
        with patch("open_agents.session_store.SESSIONS_DIR", sessions_dir):
            from open_agents.session_store import SessionRecord, save_session, list_sessions
            for i, sid in enumerate(["s-001", "s-002", "s-003"]):
                r = SessionRecord(
                    session_id=sid,
                    schema_version=1,
                    started_at=float(i * 100),
                    shutdown_mode="stop",
                )
                path = sessions_dir / f"{sid}.json"
                import json, dataclasses
                path.write_text(json.dumps(dataclasses.asdict(r)))
                # Stagger mtime
                os.utime(path, (i * 100, i * 100))

            records = list_sessions()
            ids = [r.session_id for r in records]
            # s-003 has highest mtime (200), s-001 lowest (0)
            assert ids.index("s-003") < ids.index("s-001")

    def test_get_latest(self, tmp_path):
        """get_latest_session returns the most recent session."""
        sessions_dir = tmp_path / "sessions"
        sessions_dir.mkdir()
        with patch("open_agents.session_store.SESSIONS_DIR", sessions_dir):
            from open_agents.session_store import SessionRecord, list_sessions, get_latest_session
            import dataclasses
            for i, sid in enumerate(["old-session", "new-session"]):
                r = SessionRecord(
                    session_id=sid,
                    schema_version=1,
                    started_at=float(i),
                    shutdown_mode="stop",
                )
                path = sessions_dir / f"{sid}.json"
                path.write_text(json.dumps(dataclasses.asdict(r)))
                os.utime(path, (i * 100, i * 100))

            latest = get_latest_session()
            assert latest is not None
            assert latest.session_id == "new-session"

    def test_cleanup_old(self, tmp_path):
        """cleanup_sessions deletes files older than retention_days."""
        sessions_dir = tmp_path / "sessions"
        sessions_dir.mkdir()
        with patch("open_agents.session_store.SESSIONS_DIR", sessions_dir):
            from open_agents.session_store import SessionRecord, cleanup_sessions
            import dataclasses
            # Old file: 40 days ago
            old = SessionRecord(session_id="old", schema_version=1, started_at=0.0, shutdown_mode="stop")
            old_path = sessions_dir / "old.json"
            old_path.write_text(json.dumps(dataclasses.asdict(old)))
            old_mtime = time.time() - 40 * 86400
            os.utime(old_path, (old_mtime, old_mtime))

            # Recent file: 1 day ago
            new = SessionRecord(session_id="new", schema_version=1, started_at=time.time(), shutdown_mode="stop")
            new_path = sessions_dir / "new.json"
            new_path.write_text(json.dumps(dataclasses.asdict(new)))

            deleted = cleanup_sessions(retention_days=30)
            assert deleted == 1
            assert not old_path.exists()
            assert new_path.exists()


# ---------------------------------------------------------------------------
# Session Lifecycle tests
# ---------------------------------------------------------------------------

class TestSessionLifecycle:

    def test_acquire_release_lock(self, tmp_path):
        """Lock file is created on acquire and removed on release."""
        lock = tmp_path / "session.lock"
        heartbeat = tmp_path / "session.heartbeat"
        with (
            patch("open_agents.session.OA_DIR", tmp_path),
            patch("open_agents.session.LOCK_FILE", lock),
            patch("open_agents.session.HEARTBEAT_FILE", heartbeat),
        ):
            from open_agents.session import acquire_session_lock, release_session_lock
            acquire_session_lock()
            assert lock.exists()
            release_session_lock()
            assert not lock.exists()

    def test_detect_clean(self, tmp_path):
        """No lock file → CLEAN shutdown mode."""
        lock = tmp_path / "session.lock"
        heartbeat = tmp_path / "session.heartbeat"
        with (
            patch("open_agents.session.LOCK_FILE", lock),
            patch("open_agents.session.HEARTBEAT_FILE", heartbeat),
        ):
            from open_agents.session import detect_previous_shutdown, ShutdownMode
            mode, info = detect_previous_shutdown()
            assert mode == ShutdownMode.CLEAN
            assert info == {}

    def test_detect_crash(self, tmp_path):
        """Lock file present + tmux dead → CRASH."""
        lock = tmp_path / "session.lock"
        lock.write_text(str(time.time()))
        heartbeat = tmp_path / "session.heartbeat"
        with (
            patch("open_agents.session.LOCK_FILE", lock),
            patch("open_agents.session.HEARTBEAT_FILE", heartbeat),
            patch("open_agents.session.session_exists", return_value=False),
        ):
            from open_agents.session import detect_previous_shutdown, ShutdownMode
            mode, info = detect_previous_shutdown()
            assert mode == ShutdownMode.CRASH
            assert info["lock_exists"] is True
            assert info["tmux_alive"] is False

    def test_detect_detach(self, tmp_path):
        """Lock file present + tmux alive → DETACH."""
        lock = tmp_path / "session.lock"
        lock.write_text(str(time.time()))
        heartbeat = tmp_path / "session.heartbeat"
        with (
            patch("open_agents.session.LOCK_FILE", lock),
            patch("open_agents.session.HEARTBEAT_FILE", heartbeat),
            patch("open_agents.session.session_exists", return_value=True),
        ):
            from open_agents.session import detect_previous_shutdown, ShutdownMode
            mode, info = detect_previous_shutdown()
            assert mode == ShutdownMode.DETACH
            assert info["tmux_alive"] is True

    def test_heartbeat(self, tmp_path):
        """write_heartbeat writes a valid timestamp to the heartbeat file."""
        heartbeat = tmp_path / "session.heartbeat"
        with (
            patch("open_agents.session.OA_DIR", tmp_path),
            patch("open_agents.session.HEARTBEAT_FILE", heartbeat),
        ):
            from open_agents.session import write_heartbeat
            before = time.time()
            write_heartbeat()
            after = time.time()
            assert heartbeat.exists()
            ts = float(heartbeat.read_text().strip())
            assert before <= ts <= after


# ---------------------------------------------------------------------------
# Session Cleanup tests
# ---------------------------------------------------------------------------

class TestSessionCleanup:

    def _mock_cleanup_deps(self, tmp_path):
        sessions_dir = tmp_path / "sessions"
        sessions_dir.mkdir()
        lock = tmp_path / "session.lock"
        lock.write_text(str(time.time()))
        return sessions_dir, lock

    def test_cleanup_detach(self, tmp_path):
        """Detach mode: snapshot saved, lock NOT removed."""
        sessions_dir, lock = self._mock_cleanup_deps(tmp_path)
        with (
            patch("open_agents.session_store.SESSIONS_DIR", sessions_dir),
            patch("open_agents.session_cleanup.create_snapshot") as mock_snap,
            patch("open_agents.session_cleanup.save_session") as mock_save,
            patch("open_agents.session_cleanup.release_session_lock") as mock_release,
            patch("open_agents.session_cleanup._capture_git_state", return_value={}),
        ):
            fake_record = MagicMock()
            mock_snap.return_value = fake_record
            mock_save.return_value = sessions_dir / "fake.json"

            from open_agents.session_cleanup import session_cleanup
            summary = session_cleanup(mode="detach")

            mock_snap.assert_called_once_with(shutdown_mode="detach")
            mock_save.assert_called_once_with(fake_record)
            mock_release.assert_not_called()
            assert "state_snapshot" in summary["actions"]
            assert "lock_released" not in summary["actions"]

    def test_cleanup_stop(self, tmp_path):
        """Stop mode: snapshot saved AND lock released."""
        sessions_dir, lock = self._mock_cleanup_deps(tmp_path)
        with (
            patch("open_agents.session_store.SESSIONS_DIR", sessions_dir),
            patch("open_agents.session_cleanup.create_snapshot") as mock_snap,
            patch("open_agents.session_cleanup.save_session") as mock_save,
            patch("open_agents.session_cleanup.release_session_lock") as mock_release,
            patch("open_agents.session_cleanup._capture_git_state", return_value={}),
        ):
            fake_record = MagicMock()
            mock_snap.return_value = fake_record
            mock_save.return_value = sessions_dir / "fake.json"

            from open_agents.session_cleanup import session_cleanup
            summary = session_cleanup(mode="stop")

            mock_snap.assert_called_once_with(shutdown_mode="stop")
            mock_save.assert_called_once_with(fake_record)
            mock_release.assert_called_once()
            assert "state_snapshot" in summary["actions"]
            assert "lock_released" in summary["actions"]


# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------

class TestConfig:

    def test_disconnect_config_defaults(self, tmp_path):
        """get_disconnect_config() returns correct default keys and values."""
        with patch("open_agents.config.CONFIG_PATH", tmp_path / "nonexistent.json"):
            from open_agents.config import get_disconnect_config
            cfg = get_disconnect_config()
            assert cfg["state_snapshot"] is True
            assert cfg["git_stash"] is False
            assert cfg["notify_desktop"] is True
            assert cfg["retention_days"] == 30
            assert cfg["cleanup_timeout_seconds"] == 300

    def test_disconnect_config_user_override(self, tmp_path):
        """User config overrides default on_disconnect values."""
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps({"on_disconnect": {"retention_days": 7}}))
        with patch("open_agents.config.CONFIG_PATH", config_path):
            from open_agents.config import get_disconnect_config
            cfg = get_disconnect_config()
            assert cfg["retention_days"] == 7
            assert cfg["git_stash"] is False  # default preserved

    def test_periodic_checkpoint_minutes(self, tmp_path):
        """get_periodic_checkpoint_minutes() returns the configured value."""
        with patch("open_agents.config.CONFIG_PATH", tmp_path / "none.json"):
            from open_agents.config import get_periodic_checkpoint_minutes
            minutes = get_periodic_checkpoint_minutes()
            assert minutes == 5

    def test_periodic_checkpoint_minutes_custom(self, tmp_path):
        """get_periodic_checkpoint_minutes() respects user config."""
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps({"periodic_checkpoint_minutes": 15}))
        with patch("open_agents.config.CONFIG_PATH", config_path):
            from open_agents.config import get_periodic_checkpoint_minutes
            assert get_periodic_checkpoint_minutes() == 15


# ---------------------------------------------------------------------------
# Hooks tests
# ---------------------------------------------------------------------------

class TestHooks:

    def setup_method(self):
        """Clear all hooks before each test."""
        from open_agents.hooks import clear_hooks
        clear_hooks()

    def test_new_hook_events(self):
        """on_session_end, on_detach, on_resume are valid events."""
        from open_agents.hooks import VALID_EVENTS
        assert "on_session_end" in VALID_EVENTS
        assert "on_detach" in VALID_EVENTS
        assert "on_resume" in VALID_EVENTS

    def test_hook_decorators_register(self):
        """Decorator-based registration adds hooks to HOOKS dict."""
        from open_agents.hooks import on_session_end, on_detach, on_resume, HOOKS, clear_hooks
        clear_hooks()

        @on_session_end
        def handle_end(ctx): pass

        @on_detach
        def handle_detach(ctx): pass

        @on_resume
        def handle_resume(ctx): pass

        assert handle_end in HOOKS["on_session_end"]
        assert handle_detach in HOOKS["on_detach"]
        assert handle_resume in HOOKS["on_resume"]

    def test_hook_trigger_calls_registered(self):
        """trigger_hook calls all registered handlers for an event."""
        from open_agents.hooks import register_hook, trigger_hook, clear_hooks
        clear_hooks()
        called = []

        def my_hook(ctx):
            called.append(ctx)

        register_hook("on_session_end", my_hook)
        result = trigger_hook("on_session_end", {"session_id": "abc"})
        assert len(called) == 1
        assert called[0]["session_id"] == "abc"
        assert "my_hook" in result

    def test_invalid_event_raises(self):
        """register_hook raises ValueError for unknown events."""
        from open_agents.hooks import register_hook
        with pytest.raises(ValueError, match="Unknown hook event"):
            register_hook("on_nonexistent", lambda ctx: None)


# ---------------------------------------------------------------------------
# Notify tests
# ---------------------------------------------------------------------------

class TestNotify:

    def test_silent_mode(self, monkeypatch):
        """OA_SILENT=1 prevents notifications from being sent."""
        monkeypatch.setenv("OA_SILENT", "1")
        from open_agents.notify import send_notification
        result = send_notification("Test", "Message")
        assert result is False

    def test_non_linux(self, monkeypatch):
        """Non-linux platform returns False."""
        monkeypatch.delenv("OA_SILENT", raising=False)
        with patch("open_agents.notify.sys") as mock_sys:
            mock_sys.platform = "win32"
            from open_agents.notify import send_notification
            result = send_notification("Test", "Message")
            assert result is False

    def test_linux_no_tools(self, monkeypatch):
        """Linux with no notification tools returns False."""
        monkeypatch.delenv("OA_SILENT", raising=False)
        with (
            patch("open_agents.notify.sys.platform", "linux"),
            patch("open_agents.notify.shutil.which", return_value=None),
        ):
            from open_agents.notify import send_notification
            result = send_notification("Test", "Message")
            assert result is False
