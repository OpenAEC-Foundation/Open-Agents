"""Session lifecycle: lock file, heartbeat, shutdown detection."""

from __future__ import annotations

import time
from pathlib import Path

from .config import OA_DIR
from .tmux import session_exists

LOCK_FILE = OA_DIR / "session.lock"
HEARTBEAT_FILE = OA_DIR / "session.heartbeat"
HEARTBEAT_STALE_SECONDS = 600  # 10 minutes


class ShutdownMode:
    CLEAN = "clean"    # No previous session or cleanly stopped
    DETACH = "detach"  # Terminal closed, tmux session still alive
    CRASH = "crash"    # tmux session dead, lock file present


def detect_previous_shutdown() -> tuple[str, dict]:
    """Detect how the previous session ended. Returns (mode, info)."""
    if not LOCK_FILE.exists():
        return ShutdownMode.CLEAN, {}
    info: dict = {"lock_exists": True}
    if session_exists():
        info["tmux_alive"] = True
        return ShutdownMode.DETACH, info
    info["tmux_alive"] = False
    if HEARTBEAT_FILE.exists():
        try:
            last_beat = float(HEARTBEAT_FILE.read_text().strip())
            info["heartbeat_age_seconds"] = time.time() - last_beat
        except (ValueError, OSError):
            info["heartbeat_corrupt"] = True
    return ShutdownMode.CRASH, info


def acquire_session_lock() -> None:
    """Write lock file to mark session as active."""
    OA_DIR.mkdir(parents=True, exist_ok=True)
    LOCK_FILE.write_text(str(time.time()))


def release_session_lock() -> None:
    """Remove lock and heartbeat files on clean shutdown."""
    LOCK_FILE.unlink(missing_ok=True)
    HEARTBEAT_FILE.unlink(missing_ok=True)


def write_heartbeat() -> None:
    """Update heartbeat timestamp (called by guardian every 5 min)."""
    OA_DIR.mkdir(parents=True, exist_ok=True)
    HEARTBEAT_FILE.write_text(str(time.time()))
