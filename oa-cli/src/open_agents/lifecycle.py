"""Lifecycle — agent status checking, cleanup, kill, attach, and output capture."""

from __future__ import annotations

import shlex
import time
from pathlib import Path

from .state import (
    AgentRecord,
    get_agent,
    list_agents,
    remove_agent,
    update_agent,
)
from .config import load_config
from .tmux import SESSION_NAME, _tmux
from .workspace import cleanup_workspace, workspace_is_done

_config = load_config()
TIMEOUT_MINUTES = _config.get("timeout_minutes", 60)


def check_agent(name: str) -> str | None:
    """Check if a running agent has finished. Updates state if so.

    Returns the new status or None if agent doesn't exist.

    Voor diepe bomen: een agent is pas 'done' als AL zijn nakomelingen (niet
    alleen directe kinderen) klaar zijn.

    NOTE: cleanup_idle_agents() is NOT called here to avoid O(n²) behavior
    when checking multiple agents. Call it separately (e.g. from a periodic
    timer or after a batch of check_agent calls).
    """
    rec = get_agent(name)
    if rec is None:
        return None
    if rec.status != "running":
        return rec.status

    now = time.time()

    if workspace_is_done(rec.workspace):
        # Controleer of alle nakomelingen klaar zijn (recursief via lineage check)
        all_agents = list_agents()
        # Zoek alle agents waarvan 'name' in hun lineage voorkomt
        descendants = [
            a for a in all_agents
            if name in a.lineage and a.status == "running"
        ]
        if descendants:
            # Nog nakomelingen actief — blijf 'running'
            return "running"

        update_agent(name, status="done", finished_at=now, last_activity=now)

        # Schrijf result naar shared_results_dir als beschikbaar
        if rec.shared_results_dir:
            _write_shared_result(rec)

        return "done"

    # Check if tmux window still exists
    result = _tmux(
        f"list-windows -t {SESSION_NAME} -F '#{{window_name}}'", check=False
    )
    if result.returncode != 0:
        update_agent(name, status="failed", finished_at=now, last_activity=now)
        return "failed"

    windows = result.stdout.strip().split("\n")
    if rec.tmux_window not in windows:
        # Window gone but no .done — agent crashed or was killed externally
        update_agent(name, status="error", finished_at=now, last_activity=now)
        return "error"

    # Check for timeout
    elapsed_minutes = (now - rec.created_at) / 60
    if elapsed_minutes > TIMEOUT_MINUTES:
        # Kill the tmux window and mark as timeout
        _tmux(
            f"kill-window -t {SESSION_NAME}:{shlex.quote(rec.tmux_window)}",
            check=False,
        )
        update_agent(name, status="timeout", finished_at=now, last_activity=now)
        return "timeout"

    return "running"


def cleanup_idle_agents(max_idle_minutes: int = 20) -> list[str]:
    """Ruim idle agents op die te lang inactief zijn.

    Voor elke agent met status 'done' of 'error':
    - Als (now - finished_at) > max_idle_minutes * 60, OF
    - Als (now - last_activity) > max_idle_minutes * 60
    Dan: kill tmux window, verwijder agent uit state.

    Returns lijst van opgeruimde agent namen.
    """
    cleaned = []
    now = time.time()
    threshold = max_idle_minutes * 60

    for rec in list_agents():
        if rec.status not in ("done", "error"):
            continue

        # Gebruik agent's eigen auto_cleanup_minutes als threshold indien kleiner
        agent_threshold = min(threshold, rec.auto_cleanup_minutes * 60)

        finished_idle = (
            rec.finished_at is not None
            and (now - rec.finished_at) > agent_threshold
        )
        activity_idle = (
            rec.last_activity > 0
            and (now - rec.last_activity) > agent_threshold
        )

        if finished_idle or activity_idle:
            # Kill tmux window indien aanwezig
            _tmux(
                f"kill-window -t {SESSION_NAME}:{shlex.quote(rec.tmux_window)}",
                check=False,
            )
            # Verwijder agent uit state
            remove_agent(rec.name)
            cleaned.append(rec.name)

    return cleaned


def touch_agent(name: str) -> bool:
    """Update last_activity timestamp voor een agent. Reset de cleanup timer.

    Wordt aangeroepen als een parent agent een child aanspreekt.
    Returns True als de agent bestaat, anders False.
    """
    rec = get_agent(name)
    if rec is None:
        return False
    update_agent(name, last_activity=time.time())
    return True


def _write_shared_result(rec: AgentRecord) -> None:
    """Kopieer output/result.md naar shared_results_dir/<name>.md."""
    if not rec.shared_results_dir:
        return
    result_src = Path(rec.workspace) / "output" / "result.md"
    if not result_src.exists():
        return
    dest_dir = Path(rec.shared_results_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / f"{rec.name}.md"
    dest_file.write_text(result_src.read_text())


def kill_agent(name: str) -> bool:
    """Kill a running agent: close tmux window, update state.

    Returns True if the agent was killed.
    """
    rec = get_agent(name)
    if rec is None:
        return False

    if rec.status == "running":
        # Kill the tmux window
        _tmux(
            f"kill-window -t {SESSION_NAME}:{shlex.quote(rec.tmux_window)}",
            check=False,
        )

    update_agent(name, status="killed", finished_at=time.time())
    return True


def clean_finished() -> list[str]:
    """Clean up workspaces for all non-running agents. Returns names cleaned."""
    cleaned = []
    for rec in list_agents():
        if rec.status in ("done", "error", "killed", "timeout"):
            cleanup_workspace(rec.workspace)
            remove_agent(rec.name)
            cleaned.append(rec.name)
    return cleaned


def attach_agent(name: str) -> bool:
    """Switch the tmux client to the agent's window.

    Returns True if successful.
    """
    from .tmux import session_exists

    rec = get_agent(name)
    if rec is None:
        return False

    if not session_exists():
        return False

    # Select the agent's window in the oa session
    result = _tmux(
        f"select-window -t {SESSION_NAME}:{shlex.quote(rec.tmux_window)}",
        check=False,
    )
    return result.returncode == 0


def capture_agent_output(tmux_window: str, lines: int = 20) -> str | None:
    """Capture the last N lines from a tmux window pane.

    Returns the captured text, or None if the window doesn't exist.
    """
    result = _tmux(
        f"capture-pane -t {SESSION_NAME}:{shlex.quote(tmux_window)} -p -S -{lines}",
        check=False,
    )
    if result.returncode != 0:
        return None
    return result.stdout.rstrip("\n")
