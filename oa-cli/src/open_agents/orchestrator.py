"""Orchestrator — agent lifecycle management via tmux subprocess calls."""

from __future__ import annotations

import shlex
import subprocess
import time
from pathlib import Path

from .state import AgentRecord, add_agent, get_agent, update_agent
from .workspace import cleanup_workspace, create_workspace, workspace_is_done

SESSION_NAME = "oa"
CLAUDE_CMD = "claude"
OLLAMA_CMD = "ollama.exe"  # WSL → Windows interop
TIMEOUT_MINUTES = 60
DEFAULT_MODEL = "claude"


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


CLAUDE_MODEL_MAP = {
    "claude": None,           # default (whatever subscription provides)
    "claude/opus": "opus",
    "claude/sonnet": "sonnet",
    "claude/haiku": "haiku",
}


def _build_claude_command(workspace: Path, name: str, claude_model: str | None = None) -> str:
    """Build the shell command for a Claude Code agent.

    claude_model: None for default, or 'opus'/'sonnet'/'haiku' for specific model.
    """
    claude_prompt = "Lees CLAUDE.md en voer de taak uit. Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."
    model_flag = f" --model {claude_model}" if claude_model else ""
    return (
        f"cd {workspace} && "
        f"unset CLAUDECODE && "
        f"{CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {shlex.quote(claude_prompt)}; "
        f"touch .done; "
        f"echo '--- Agent {shlex.quote(name)} finished ---'"
    )


def _build_ollama_command(workspace: Path, name: str, ollama_model: str) -> str:
    """Build the shell command for an Ollama agent.

    Ollama models are text-in/text-out — no file I/O or tools.
    We pipe CLAUDE.md as prompt and capture output to result.md.
    TERM=dumb prevents ollama from writing spinner/progress ANSI codes.
    """
    return (
        f"cd {workspace} && "
        f"TERM=dumb cat CLAUDE.md | {OLLAMA_CMD} run {shlex.quote(ollama_model)} "
        f"2>/dev/null | sed 's/\\x1b\\[[0-9;]*[a-zA-Z]//g' "
        f"> output/result.md; "
        f"touch .done; "
        f"echo '--- Agent {shlex.quote(name)} finished ---'"
    )


def spawn_agent(
    name: str, task: str, model: str = DEFAULT_MODEL, workspace: Path | None = None,
    parent: str | None = None,
) -> AgentRecord:
    """Spawn an agent in a tmux window.

    Models:
      - "claude"           → Claude Code CLI (full tools, subscription)
      - "ollama/<model>"   → Ollama local model (text only, free)

    1. Create workspace with CLAUDE.md (or use pre-built workspace)
    2. Create tmux window
    3. Launch the right runtime in that window
    4. Register in state
    """
    if not session_exists():
        raise RuntimeError("No oa session. Run 'oa start' first.")

    existing = get_agent(name)
    if existing and existing.status == "running":
        raise RuntimeError(f"Agent '{name}' is already running.")

    # Create workspace (or use provided one)
    if workspace is None:
        workspace = create_workspace(name, task)
    else:
        workspace = Path(workspace)

    # Create tmux window
    window_name = f"agent-{name}"
    _tmux(f"new-window -t {SESSION_NAME} -n {shlex.quote(window_name)}")

    # Build runtime-specific command
    if model.startswith("ollama/"):
        ollama_model = model.split("/", 1)[1]
        agent_command = _build_ollama_command(workspace, name, ollama_model)
    elif model.startswith("claude/"):
        claude_model = CLAUDE_MODEL_MAP.get(model)
        if claude_model is None:
            # Allow direct model names like claude/claude-sonnet-4-6
            claude_model = model.split("/", 1)[1]
        agent_command = _build_claude_command(workspace, name, claude_model)
    else:
        agent_command = _build_claude_command(workspace, name)

    # Write command to a temp script to avoid tmux send-keys quoting issues
    script = workspace / ".oa-run.sh"
    script.write_text(f"#!/bin/bash\n{agent_command}\n")
    script.chmod(0o755)
    _tmux(
        f"send-keys -t {SESSION_NAME}:{shlex.quote(window_name)} "
        f"{shlex.quote(str(script))} Enter"
    )

    # Record state
    rec = AgentRecord(
        name=name,
        task=task,
        workspace=str(workspace),
        tmux_window=window_name,
        model=model,
        status="running",
        created_at=time.time(),
        parent=parent,
    )
    add_agent(rec)
    return rec


def check_agent(name: str) -> str | None:
    """Check if a running agent has finished. Updates state if so.

    Returns the new status or None if agent doesn't exist.
    """
    rec = get_agent(name)
    if rec is None:
        return None
    if rec.status != "running":
        return rec.status

    if workspace_is_done(rec.workspace):
        # An orchestrator (agent with children, or that IS a parent of others)
        # can only be "done" when ALL agents in the session are done.
        from .state import list_agents
        all_agents = list_agents()
        children = [a for a in all_agents if a.parent == name]
        if children:
            # This is a parent agent — stay running while ANY other agent is active
            others_running = [
                a for a in all_agents
                if a.name != name and a.status == "running"
            ]
            if others_running:
                return "running"
        update_agent(name, status="done", finished_at=time.time())
        return "done"

    # Check if tmux window still exists
    result = _tmux(
        f"list-windows -t {SESSION_NAME} -F '#{{window_name}}'", check=False
    )
    if result.returncode != 0:
        update_agent(name, status="failed", finished_at=time.time())
        return "failed"

    windows = result.stdout.strip().split("\n")
    if rec.tmux_window not in windows:
        # Window gone but no .done — agent crashed or was killed externally
        update_agent(name, status="error", finished_at=time.time())
        return "error"

    # Check for timeout
    elapsed_minutes = (time.time() - rec.created_at) / 60
    if elapsed_minutes > TIMEOUT_MINUTES:
        # Kill the tmux window and mark as timeout
        _tmux(
            f"kill-window -t {SESSION_NAME}:{shlex.quote(rec.tmux_window)}",
            check=False,
        )
        update_agent(name, status="timeout", finished_at=time.time())
        return "timeout"

    return "running"


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
    from .state import list_agents, remove_agent

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
