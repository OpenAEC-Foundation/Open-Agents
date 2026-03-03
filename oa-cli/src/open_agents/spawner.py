"""Spawner — agent spawning and model command builders."""

from __future__ import annotations

import re
import shlex
import shutil
import tempfile
import time
from pathlib import Path

from .config import load_config
from .state import (
    AgentRecord,
    add_agent,
    get_agent,
    validate_spawn,
)
from .tmux import SESSION_NAME, _tmux, session_exists
from .workspace import create_workspace

CLAUDE_CMD = "claude"

# Load configurable values from ~/.oa/config.json (with fallback defaults)
_config = load_config()
TIMEOUT_MINUTES = _config.get("timeout_minutes", 60)
DEFAULT_MODEL = _config.get("default_model", "claude")
MAX_DEPTH = _config.get("max_depth", 5)

# Absolute harde limiet (nooit overschrijden)
MAX_DEPTH_ABSOLUTE = 10

CLAUDE_MODEL_MAP = {
    "claude": None,           # default (whatever subscription provides)
    "claude/opus": "opus",
    "claude/sonnet": "sonnet",
    "claude/haiku": "haiku",
}


def _detect_ollama_cmd() -> str:
    """Detect the correct ollama command for the current platform.

    Checks PATH for 'ollama' first (native Linux/macOS), then 'ollama.exe'
    (WSL → Windows interop). Falls back to 'ollama' if neither is found.
    """
    if shutil.which("ollama"):
        return "ollama"
    if shutil.which("ollama.exe"):
        return "ollama.exe"
    return "ollama"


OLLAMA_CMD = _detect_ollama_cmd()


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
    name: str,
    task: str,
    model: str = DEFAULT_MODEL,
    workspace: Path | None = None,
    parent: str | None = None,
    max_depth: int = MAX_DEPTH,
    shared_results_dir: str | None = None,
    project_root: str | Path | None = None,
) -> AgentRecord:
    """Spawn an agent in a tmux window.

    Models:
      - "claude"           → Claude Code CLI (full tools, subscription)
      - "ollama/<model>"   → Ollama local model (text only, free)

    Hiërarchie:
      - parent: naam van de parent-agent (None = root)
      - max_depth: maximale diepte van de boom (default MAX_DEPTH=5)
      - shared_results_dir: gedeeld pad voor output-aggregatie

    1. Valideer spawn (diepte, max_children, task-hash)
    2. Create workspace with CLAUDE.md (or use pre-built workspace)
    3. Create tmux window
    4. Launch the right runtime in that window
    5. Register in state
    """
    if not session_exists():
        raise RuntimeError("No oa session. Run 'oa start' first.")

    # Validate agent name: only lowercase alphanumeric and hyphens, max 62 chars
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,61}', name):
        raise RuntimeError(
            f"Invalid agent name '{name}': must match [a-z0-9-], "
            f"start with alphanumeric, max 62 characters."
        )

    existing = get_agent(name)
    if existing and existing.status == "running":
        raise RuntimeError(f"Agent '{name}' is already running.")

    # --- Hiërarchie validatie ---
    child_depth = 0
    child_lineage: list[str] = []

    if parent is not None:
        # Valideer via state
        allowed, reason = validate_spawn(parent, task, max_depth=max_depth)
        if not allowed:
            raise RuntimeError(f"Spawn geweigerd: {reason}")

        parent_rec = get_agent(parent)
        if parent_rec:
            child_depth = parent_rec.depth + 1
            child_lineage = parent_rec.lineage + [parent]
            # Erft shared_results_dir van parent als niet expliciet opgegeven
            if shared_results_dir is None:
                shared_results_dir = parent_rec.shared_results_dir

    # --- Maak shared_results_dir aan als root-agent (depth=0) ---
    if child_depth == 0 and shared_results_dir is None:
        shared_results_dir = str(Path(tempfile.mkdtemp(prefix="oa-results-")) / "results")
        Path(shared_results_dir).mkdir(parents=True, exist_ok=True)

    # Create workspace (or use provided one)
    if workspace is None:
        workspace = create_workspace(name, task, project_root=project_root)
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
        depth=child_depth,
        lineage=child_lineage,
        shared_results_dir=shared_results_dir,
    )
    add_agent(rec)
    return rec
