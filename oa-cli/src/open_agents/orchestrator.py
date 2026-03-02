"""Orchestrator — agent lifecycle management via tmux subprocess calls."""

from __future__ import annotations

import shlex
import subprocess
import tempfile
import time
from pathlib import Path

from .state import (
    AgentRecord,
    add_agent,
    get_agent,
    get_children,
    get_lineage,
    list_agents,
    update_agent,
    validate_spawn,
)
from .workspace import cleanup_workspace, create_workspace, workspace_is_done

SESSION_NAME = "oa"
CLAUDE_CMD = "claude"
OLLAMA_CMD = "ollama.exe"  # WSL → Windows interop
TIMEOUT_MINUTES = 60
DEFAULT_MODEL = "claude"

# Hiërarchie limieten
MAX_DEPTH = 5           # Standaard maximale diepte (configureerbaar)
MAX_DEPTH_ABSOLUTE = 10 # Absolute harde limiet (nooit overschrijden)


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
    name: str,
    task: str,
    model: str = DEFAULT_MODEL,
    workspace: Path | None = None,
    parent: str | None = None,
    max_depth: int = MAX_DEPTH,
    shared_results_dir: str | None = None,
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
        depth=child_depth,
        lineage=child_lineage,
        shared_results_dir=shared_results_dir,
    )
    add_agent(rec)
    return rec


def check_agent(name: str) -> str | None:
    """Check if a running agent has finished. Updates state if so.

    Returns the new status or None if agent doesn't exist.

    Voor diepe bomen: een agent is pas 'done' als AL zijn nakomelingen (niet
    alleen directe kinderen) klaar zijn.
    """
    rec = get_agent(name)
    if rec is None:
        return None
    if rec.status != "running":
        return rec.status

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

        update_agent(name, status="done", finished_at=time.time())

        # Schrijf result naar shared_results_dir als beschikbaar
        if rec.shared_results_dir:
            _write_shared_result(rec)

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
    from .state import remove_agent

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


def spawn_with_orchestrator(
    name: str,
    task: str,
    worker_model: str = "claude/sonnet",
    orchestrator_model: str = "claude/opus",
    max_workers: int = 5,
    max_depth: int = MAX_DEPTH,
) -> AgentRecord:
    """Spawn an orchestrator that delegates work to sub-agents (D-051).

    Creates an orchestrator agent with a specialized CLAUDE.md that instructs it
    to decompose the task, spawn workers, monitor them, and review their output.
    The orchestrator never does work itself.
    """
    if not session_exists():
        raise RuntimeError("No oa session. Run 'oa start' first.")

    orch_name = f"orch-{name}"
    existing = get_agent(orch_name)
    if existing and existing.status == "running":
        raise RuntimeError(f"Orchestrator '{orch_name}' is already running.")

    # Maak shared_results_dir aan voor de hele boom
    shared_results_dir = str(
        Path(tempfile.mkdtemp(prefix=f"oa-results-{orch_name}-")) / "results"
    )
    Path(shared_results_dir).mkdir(parents=True, exist_ok=True)

    # Build orchestrator workspace
    workspace = _create_orchestrator_workspace(
        orch_name, task, worker_model, max_workers,
        depth=0, max_depth=max_depth, shared_results_dir=shared_results_dir,
    )

    # Spawn the orchestrator agent
    return spawn_agent(
        name=orch_name,
        task=task,
        model=orchestrator_model,
        workspace=workspace,
        shared_results_dir=shared_results_dir,
    )


def _create_orchestrator_workspace(
    orch_name: str,
    task: str,
    worker_model: str,
    max_workers: int,
    depth: int = 0,
    max_depth: int = MAX_DEPTH,
    shared_results_dir: str | None = None,
) -> Path:
    """Create a workspace with orchestrator-specific CLAUDE.md.

    Uitgebreid met:
    - Kennis van eigen diepte en maximale diepte
    - Instructies voor shared_results_dir rapportage
    - Instructies voor recursief spawnen van sub-orchestrators
    """
    workspace = Path(tempfile.mkdtemp(prefix=f"oa-orch-{orch_name}-"))
    (workspace / "output").mkdir()
    (workspace / "output" / "proposals").mkdir()

    remaining_depth = max_depth - depth
    can_spawn_sub_orchs = remaining_depth > 1

    results_section = ""
    if shared_results_dir:
        results_section = (
            f"## RAPPORTAGE\n"
            f"Gedeelde resultatenmap: `{shared_results_dir}`\n"
            f"Na voltooiing: kopieer je `./output/result.md` naar "
            f"`{shared_results_dir}/{orch_name}.md`\n"
            f"Lees ook de resultaten van je workers via `{shared_results_dir}/<worker-naam>.md`\n\n"
        )

    sub_orch_section = ""
    if can_spawn_sub_orchs:
        sub_orch_section = (
            f"## RECURSIEF SPAWNEN (DIEPTE {depth}/{max_depth})\n"
            f"Je zit op diepte {depth}. Je mag nog {remaining_depth - 1} niveaus dieper gaan.\n"
            f"Als een subtaak te complex is voor een worker, spawn dan een sub-orchestrator:\n"
            f"```bash\n"
            f"oa orchestrate \"<complexe-subtaak>\" --name <subnaam> "
            f"--model {worker_model} --parent {orch_name} --max-depth {max_depth}\n"
            f"```\n"
            f"Sub-orchestrators krijgen automatisch `--parent {orch_name}` mee.\n\n"
        )
    else:
        sub_orch_section = (
            f"## DIEPTELIMIET BEREIKT (DIEPTE {depth}/{max_depth})\n"
            f"Je zit op maximale diepte. Je mag GEEN sub-orchestrators meer spawnen.\n"
            f"Gebruik alleen directe workers voor alle subtaken.\n\n"
        )

    claude_md = (
        f"# Orchestrator: {orch_name} (depth={depth})\n\n"
        f"## JE ROL\n"
        f"Je bent een ORCHESTRATOR op diepte {depth} van {max_depth}.\n"
        f"Je voert NOOIT zelf werk uit.\n"
        f"Je enige taken: analyseren, delegeren, monitoren, en reviewen.\n\n"
        f"## DE TAAK\n{task}\n\n"
        f"## REGELS (STRIKT)\n"
        f"1. Je SCHRIJFT GEEN CODE. Je WIJZIGT GEEN BESTANDEN buiten je workspace.\n"
        f"2. Je DELEGEERT alle werk naar workers via `oa run`.\n"
        f"3. Elke worker krijgt `--parent {orch_name}` zodat de hierarchie klopt.\n"
        f"4. Workers schrijven resultaat direct naar `./output/result.md` in hun workspace.\n"
        f"5. Je spawnt maximaal {max_workers} workers tegelijk per batch.\n"
        f"6. Na elke batch wacht je tot alle workers klaar zijn (`oa status`).\n"
        f"7. Je reviewt worker output via `oa collect <worker-naam>`.\n\n"
        f"{sub_orch_section}"
        f"{results_section}"
        f"## WORKER MODEL\n"
        f"Gebruik `--model {worker_model}` bij het spawnen van workers.\n\n"
        f"## STAPPEN\n"
        f"1. Analyseer de taak — lees relevante bronbestanden\n"
        f"2. Ontleed in subtaken — zorg dat geen twee workers hetzelfde bestand wijzigen\n"
        f"3. Spawn workers:\n"
        f'   ```bash\n'
        f'   export PATH="/home/freek/.local/bin:$PATH"\n'
        f'   oa run "<subtaak>" --name <naam> --model {worker_model} --parent {orch_name}\n'
        f'   ```\n'
        f"4. Monitor: `oa status`\n"
        f"5. Collect output: `oa collect <naam>`\n"
        f"6. Aggregeer resultaten van workers via shared results dir\n"
        f"7. Schrijf samenvatting naar ./output/result.md\n"
        f"8. Maak .done als je klaar bent\n\n"
        f"## GELEERDE LESSEN\n"
        f"- L-001: Blijf draaien tot alle workers klaar zijn\n"
        f"- L-002: ALLE workers krijgen --parent flag\n"
        f"- L-003: Twee workers mogen NOOIT hetzelfde bestand wijzigen\n"
        f"- L-004: Review output na elke batch\n"
        f"- L-010: Jij delegeert, jij doet zelf NIKS\n"
        f"- L-011: Controleer je diepte voordat je sub-orchestrators spawnt\n"
        f"- L-012: Schrijf altijd naar shared_results_dir na voltooiing\n"
    )

    (workspace / "CLAUDE.md").write_text(claude_md)
    return workspace
