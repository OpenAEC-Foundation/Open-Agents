"""Pipeline — multi-agent orchestration: planner -> subtasks -> combiner."""

from __future__ import annotations

import hashlib
import json
import shutil
import time
from pathlib import Path

from rich.console import Console

from .lifecycle import check_agent
from .spawner import spawn_agent
from .tmux import session_exists, start_session
from .state import get_agent
from .workspace import read_output

console = Console()

PLANNER_TIMEOUT = 5 * 60  # 5 minutes
SUBTASK_TIMEOUT = 30 * 60  # 30 minutes
COMBINER_TIMEOUT = 10 * 60  # 10 minutes
MAX_SUBTASKS = 10
POLL_INTERVAL = 5  # seconds


def _create_planner_workspace(task: str) -> Path:
    """Create a workspace with a planner-specific CLAUDE.md."""
    import tempfile

    workspace = Path(tempfile.mkdtemp(prefix="oa-planner-"))
    (workspace / "output").mkdir()

    claude_md = workspace / "CLAUDE.md"
    claude_md.write_text(
        f"# Planner Agent\n"
        f"\n"
        f"## Opdracht\n"
        f"Analyseer de volgende taak en splits deze op in subtaken.\n"
        f"\n"
        f"## Taak\n"
        f"{task}\n"
        f"\n"
        f"## Output\n"
        f"Schrijf een JSON bestand naar ./output/plan.json met exact dit formaat:\n"
        f"\n"
        f"```json\n"
        f'{{\n'
        f'  "task": "originele opdracht",\n'
        f'  "subtasks": [\n'
        f'    {{"name": "korte-naam", "task": "volledige beschrijving", "depends_on": []}}\n'
        f"  ]\n"
        f"}}\n"
        f"```\n"
        f"\n"
        f"## Regels\n"
        f"- Maximaal {MAX_SUBTASKS} subtasks\n"
        f"- Elke subtask moet zelfstandig uitvoerbaar zijn\n"
        f"- Geef korte maar beschrijvende namen (slug-style: lowercase, hyphens)\n"
        f"- depends_on mag leeg zijn (wordt in v1 niet afgedwongen)\n"
        f"- Schrijf ALLEEN het JSON bestand, geen andere output\n"
        f"- Maak een .done file als je klaar bent\n"
    )
    return workspace


def _create_combiner_workspace(
    task: str, subtask_outputs: dict[str, str | None]
) -> Path:
    """Create a workspace for the combiner with all subtask outputs."""
    import tempfile

    workspace = Path(tempfile.mkdtemp(prefix="oa-combiner-"))
    (workspace / "output").mkdir()
    inputs_dir = workspace / "inputs"
    inputs_dir.mkdir()

    # Write each subtask output as a file
    for name, output in subtask_outputs.items():
        content = output if output else f"[Subtask '{name}' produced no output or failed]"
        (inputs_dir / f"{name}.md").write_text(content)

    claude_md = workspace / "CLAUDE.md"
    claude_md.write_text(
        f"# Combiner Agent\n"
        f"\n"
        f"## Opdracht\n"
        f"Combineer de resultaten van meerdere subtaken tot een samenhangend eindresultaat.\n"
        f"\n"
        f"## Originele taak\n"
        f"{task}\n"
        f"\n"
        f"## Subtask outputs\n"
        f"Alle subtask resultaten staan in ./inputs/ als losse .md bestanden.\n"
        f"Lees ze allemaal.\n"
        f"\n"
        f"## Output\n"
        f"- Schrijf een gecombineerd resultaat naar ./output/result.md\n"
        f"- Het resultaat moet een coherente samenvatting/combinatie zijn van alle subtask outputs\n"
        f"- Vermeld welke subtasks zijn geslaagd en welke niet\n"
        f"- Maak een .done file als je klaar bent\n"
    )
    return workspace


def _wait_for_agent(name: str, timeout: float) -> str:
    """Poll until an agent finishes or times out. Returns final status."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = check_agent(name)
        if status is None:
            return "error"
        if status != "running":
            return status
        time.sleep(POLL_INTERVAL)
    return "timeout"


def _parse_plan(workspace: str | Path) -> dict | None:
    """Parse plan.json from a planner workspace."""
    plan_file = Path(workspace) / "output" / "plan.json"
    if not plan_file.exists():
        return None
    try:
        plan = json.loads(plan_file.read_text())
    except (json.JSONDecodeError, OSError):
        return None

    # Validate structure
    if not isinstance(plan, dict):
        return None
    if "subtasks" not in plan or not isinstance(plan["subtasks"], list):
        return None
    for st in plan["subtasks"]:
        if not isinstance(st, dict) or "name" not in st or "task" not in st:
            return None

    # Enforce max
    plan["subtasks"] = plan["subtasks"][:MAX_SUBTASKS]
    return plan


def _pipeline_id(task: str) -> str:
    """Generate a short unique suffix for pipeline agent names."""
    h = hashlib.md5(f"{task}{time.time()}".encode()).hexdigest()[:6]
    return h


def run_pipeline(task: str) -> None:
    """Execute the full pipeline: planner -> subtasks -> combiner."""

    # Generate unique pipeline ID to avoid name collisions
    pid = _pipeline_id(task)

    # Ensure tmux session
    if not session_exists():
        start_session()
        console.print("[green]Started oa tmux session.[/green]")

    # --- Phase 1: Planner ---
    console.print("\n[bold cyan][1/4] Spawning planner agent...[/bold cyan]")
    planner_ws = _create_planner_workspace(task)
    planner_name = f"pipe-plan-{pid}"

    try:
        rec = spawn_agent(planner_name, task, workspace=planner_ws)
    except RuntimeError as e:
        console.print(f"[red]Failed to spawn planner: {e}[/red]")
        return

    console.print(f"  Workspace: {rec.workspace}")
    console.print("[dim]  Waiting for planner...[/dim]")

    planner_status = _wait_for_agent(planner_name, PLANNER_TIMEOUT)
    if planner_status != "done":
        console.print(
            f"[red]Planner failed with status: {planner_status}[/red]"
        )
        console.print(f"[dim]Check workspace: {rec.workspace}[/dim]")
        return

    # --- Phase 2: Parse plan ---
    console.print("\n[bold cyan][2/4] Parsing plan...[/bold cyan]")
    plan = _parse_plan(rec.workspace)
    if plan is None:
        console.print("[red]Could not parse plan.json from planner output.[/red]")
        console.print(f"[dim]Check workspace: {rec.workspace}/output/[/dim]")
        return

    subtasks = plan["subtasks"]
    console.print(f"  Found {len(subtasks)} subtasks:")
    for st in subtasks:
        console.print(f"    - {st['name']}: {st['task'][:60]}...")

    # --- Phase 3: Spawn subtasks in parallel ---
    console.print(
        f"\n[bold cyan][3/4] Spawning {len(subtasks)} subtask agents...[/bold cyan]"
    )
    subtask_agents: list[tuple[str, str, str]] = []  # (agent_name, workspace, subtask_name)

    for st in subtasks:
        agent_name = f"pipe-{pid}-{st['name']}"
        try:
            sub_rec = spawn_agent(agent_name, st["task"])
            subtask_agents.append((agent_name, sub_rec.workspace, st["name"]))
            console.print(f"  [green]Spawned: {agent_name}[/green]")
        except RuntimeError as e:
            console.print(f"  [red]Failed to spawn {agent_name}: {e}[/red]")
            subtask_agents.append((agent_name, "", st["name"]))

    # Wait for all subtasks
    console.print("[dim]  Waiting for all subtasks...[/dim]")
    deadline = time.time() + SUBTASK_TIMEOUT
    pending = {name for name, ws, _ in subtask_agents if ws}

    while pending and time.time() < deadline:
        time.sleep(POLL_INTERVAL)
        for name in list(pending):
            status = check_agent(name)
            if status != "running":
                pending.discard(name)
                console.print(f"  {name}: {status}")

    if pending:
        console.print(
            f"[yellow]  {len(pending)} subtask(s) timed out: {', '.join(pending)}[/yellow]"
        )

    # Collect outputs
    subtask_outputs: dict[str, str | None] = {}
    for agent_name, ws, st_name in subtask_agents:
        if ws:
            rec = get_agent(agent_name)
            output = read_output(ws) if rec else None
            subtask_outputs[st_name] = output
        else:
            subtask_outputs[st_name] = None

    # --- Phase 4: Combiner ---
    console.print("\n[bold cyan][4/4] Spawning combiner agent...[/bold cyan]")
    combiner_ws = _create_combiner_workspace(task, subtask_outputs)
    combiner_name = f"pipe-comb-{pid}"

    try:
        combiner_rec = spawn_agent(combiner_name, task, workspace=combiner_ws)
    except RuntimeError as e:
        console.print(f"[red]Failed to spawn combiner: {e}[/red]")
        console.print("[yellow]Subtask outputs are still available in their workspaces.[/yellow]")
        return

    console.print("[dim]  Waiting for combiner...[/dim]")
    combiner_status = _wait_for_agent(combiner_name, COMBINER_TIMEOUT)

    if combiner_status != "done":
        console.print(
            f"[yellow]Combiner finished with status: {combiner_status}[/yellow]"
        )
        console.print("[yellow]Subtask outputs are still available in their workspaces.[/yellow]")
        return

    # --- Print result ---
    result = read_output(combiner_rec.workspace)
    if result:
        console.print("\n[bold green]Pipeline complete![/bold green]\n")
        console.print(result)
    else:
        console.print(
            "[yellow]Combiner finished but produced no output.[/yellow]"
        )
        console.print(f"[dim]Check workspace: {combiner_rec.workspace}[/dim]")
