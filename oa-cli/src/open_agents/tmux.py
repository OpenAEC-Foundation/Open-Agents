"""Tmux — low-level tmux session and window operations."""

from __future__ import annotations

import shlex
import subprocess

SESSION_NAME = "oa"


# FIX: Use argument list instead of shell=True to prevent command injection.
# shell=True with user-controlled data (agent names, task strings) is vulnerable
# to arbitrary OS command execution if any caller omits shlex.quote.
def _run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and return result."""
    return subprocess.run(
        cmd, capture_output=True, text=True, check=check
    )


def _tmux(args: str, check: bool = True) -> subprocess.CompletedProcess:
    """Run a tmux command."""
    # FIX: Split args with shlex and prepend 'tmux' to build safe argument list
    return _run(["tmux"] + shlex.split(args), check=check)


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
