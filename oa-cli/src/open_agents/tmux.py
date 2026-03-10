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

    # Guardian window with self-healing wrapper
    _tmux(f"new-window -t {SESSION_NAME} -n oa-guardian")
    _tmux(
        f"send-keys -t {SESSION_NAME}:oa-guardian "
        f"'while true; do python3 -m open_agents.session_guardian; "
        f"echo Guardian restarting in 5s...; sleep 5; done' Enter"
    )

    # Register detach hook → session cleanup
    cmd = "python3 -m open_agents.session_cleanup --mode detach"
    _tmux(f"set-hook -t {SESSION_NAME} client-detached 'run-shell \"{cmd}\"'")

    # Acquire session lock
    from .session import acquire_session_lock
    acquire_session_lock()

    return True


def guardian_is_alive() -> bool:
    """Check if the oa-guardian tmux window exists."""
    result = _tmux(
        f"list-windows -t {SESSION_NAME} -F '#{{window_name}}'",
        check=False,
    )
    if result.returncode != 0:
        return False
    return "oa-guardian" in result.stdout.strip().split("\n")
