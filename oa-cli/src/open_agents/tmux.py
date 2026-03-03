"""Tmux — low-level tmux session and window operations."""

from __future__ import annotations

import subprocess

SESSION_NAME = "oa"


def _run(cmd: str, check: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command and return result."""
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, check=check
    )


def _tmux(args: str, check: bool = True) -> subprocess.CompletedProcess:
    """Run a tmux command."""
    return _run(f"tmux {args}", check=check)


def session_exists() -> bool:
    """Check if the 'oa' tmux session exists."""
    result = _tmux(f"has-session -t {SESSION_NAME}", check=False)
    return result.returncode == 0


def start_session() -> bool:
    """Create the oa tmux session with a dashboard window.

    Returns True if created, False if already exists.
    """
    if session_exists():
        return False

    _tmux(f"new-session -d -s {SESSION_NAME} -n dashboard")
    # Start watch loop that refreshes oa status every 3 seconds
    _tmux(
        f"send-keys -t {SESSION_NAME}:dashboard "
        f"'watch -t -n3 oa status' Enter"
    )
    return True
