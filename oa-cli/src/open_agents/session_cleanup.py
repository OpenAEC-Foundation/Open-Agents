"""Session cleanup — callable from tmux hook and oa stop.

Usage:
    python3 -m open_agents.session_cleanup --mode detach
    python3 -m open_agents.session_cleanup --mode stop
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from .session_store import create_snapshot, save_session

try:
    from .session import release_session_lock
except ImportError:
    def release_session_lock() -> None:  # type: ignore[misc]
        """Fallback: remove lock file directly when session.py is unavailable."""
        lock = Path.home() / ".oa" / "session.lock"
        lock.unlink(missing_ok=True)


def _capture_git_state() -> dict:
    """Capture current git branch and uncommitted files."""
    state: dict = {}
    try:
        r = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True, text=True, timeout=5,
        )
        state["branch"] = r.stdout.strip() if r.returncode == 0 else ""
        r = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode == 0:
            state["uncommitted_files"] = [
                line[3:] for line in r.stdout.strip().split("\n") if line
            ]
        r = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        state["last_commit"] = r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        pass
    return state


def session_cleanup(mode: str = "detach") -> dict:
    """Perform cleanup for the given shutdown mode.

    Args:
        mode: "stop" (full cleanup + release lock) or "detach" (snapshot only)

    Returns:
        Summary dict of actions taken.
    """
    summary: dict = {"mode": mode, "actions": []}

    git_state = _capture_git_state()
    summary["git_state"] = git_state

    record = create_snapshot(shutdown_mode=mode)
    path = save_session(record)
    summary["actions"].append("state_snapshot")
    summary["snapshot_path"] = str(path)

    if mode == "stop":
        release_session_lock()
        summary["actions"].append("lock_released")

    # mode == "detach": keep lock alive, tmux session continues, guardian runs
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Session cleanup entry point.")
    parser.add_argument("--mode", choices=["stop", "detach"], default="detach")
    args = parser.parse_args()
    result = session_cleanup(args.mode)
    print(f"Cleanup: {result}")
