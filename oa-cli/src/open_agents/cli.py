"""CLI — typer commands for the Open Agents orchestrator."""

from __future__ import annotations

import json
import time
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

from . import __version__
from .config import OA_DIR, CONFIG_PATH, DEFAULT_CONFIG, load_config
from .monitor import print_status
from .utils import format_model_rich, generate_agent_name
from .lifecycle import attach_agent, check_agent, clean_finished, kill_agent
from .orchestrator import spawn_with_orchestrator
from .spawner import spawn_agent
from .tmux import session_exists, start_session
from .state import get_agent, list_agents
from .messaging import broadcast_message, mark_read, read_inbox, send_message, unread_count
from .workspace import read_output
from .guardians import list_guardians, log_event, register_guardian, trigger_guardian

app = typer.Typer(
    name="oa",
    help="Open Agents — tmux-based multi-agent orchestrator for Claude Code.",
    no_args_is_help=True,
)
console = Console()

AGENTS_LIBRARY_DIR = Path(__file__).parents[4] / "agents" / "library"


def _load_template(template_id: str) -> dict:
    """Search all JSON files in agents/library/ for a template with the given id (filename stem)."""
    if not AGENTS_LIBRARY_DIR.exists():
        console.print(f"[red]Agents library not found at {AGENTS_LIBRARY_DIR}[/red]")
        raise typer.Exit(1)

    for json_file in AGENTS_LIBRARY_DIR.rglob("*.json"):
        if json_file.stem == template_id:
            try:
                return json.loads(json_file.read_text())
            except Exception:
                console.print(f"[red]Failed to parse template file: {json_file}[/red]")
                raise typer.Exit(1)

    console.print(f"[red]Template '{template_id}' not found in agents/library/[/red]")
    raise typer.Exit(1)


def _run_preflight_gate() -> bool:
    """Run preflight checks and return True if all pass, False otherwise.

    On failure, prints a Rich error panel with fix hints per failing check.
    """
    from . import preflight

    results = preflight.check_all()
    failed = [r for r in results if not r.ok]
    if not failed:
        return True

    lines = []
    for r in failed:
        lines.append(f"[bold red]{r.name}[/bold red]: {r.message}")
        if r.fix_hint:
            lines.append(f"  [dim]Fix:[/dim] {r.fix_hint}")

    console.print(
        Panel(
            "\n".join(lines),
            title="[red bold]Preflight checks failed[/red bold]",
            border_style="red",
        )
    )
    console.print("[dim]Run 'oa setup' to see the full report.[/dim]")
    return False


@app.command()
def setup():
    """Run preflight checks and initialise the ~/.oa/ directory."""
    from . import preflight

    results = preflight.check_all()
    preflight.print_report(results, console=console)

    # Create ~/.oa/ directory if it doesn't exist
    OA_DIR.mkdir(parents=True, exist_ok=True)

    # Write config.json with defaults (don't overwrite existing keys)
    if CONFIG_PATH.exists():
        try:
            existing = json.loads(CONFIG_PATH.read_text())
        except Exception:
            existing = {}
        merged = {**DEFAULT_CONFIG, **existing}
    else:
        merged = DEFAULT_CONFIG

    CONFIG_PATH.write_text(json.dumps(merged, indent=2))
    console.print(f"\n[green]Config written to {CONFIG_PATH}[/green]")


@app.command()
def start(
    chat: bool = typer.Option(True, "--chat/--no-chat", help="Enter interactive chat mode after starting the session (default: True)"),
):
    """Start the oa tmux session with a dashboard window."""
    if not _run_preflight_gate():
        raise typer.Exit(1)

    created = start_session()
    if created:
        console.print("[green]Session 'oa' created with dashboard window.[/green]")
    else:
        console.print("[yellow]Session 'oa' already exists.[/yellow]")

    if chat:
        from .chat import ChatSession
        ChatSession().start()


@app.command()
def run(
    task: str = typer.Argument(None, help="The task description for the agent"),
    name: str = typer.Option("", "--name", "-n", help="Agent name (auto-generated if empty)"),
    model: str = typer.Option("claude", "--model", "-m", help="Model: 'claude' or 'ollama/<model>' (e.g. ollama/qwen3:8b)"),
    parent: str = typer.Option("", "--parent", "-p", help="Parent/orchestrator agent name (for hierarchy)"),
    workspace: str = typer.Option("", "--workspace", "-w", help="Use existing workspace directory (skips workspace creation)"),
    direct: bool = typer.Option(False, "--direct", "-d", help="Direct write mode: agent writes to project instead of proposals"),
    template: str = typer.Option("", "--template", "-t", help="Agent template ID from agents/library/"),
    guardians: bool = typer.Option(False, "--guardians/--no-guardians", help="Trigger batch_complete guardians after spawning"),
):
    """Spawn an agent with a task in a new tmux window."""
    if not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
        raise typer.Exit(1)

    if template:
        tmpl = _load_template(template)
        system_prompt = tmpl.get("systemPrompt", "")
        task = (system_prompt + "\n\n" + task).strip() if task else system_prompt
        if model == "claude" and tmpl.get("modelHint"):
            model = tmpl["modelHint"]

    if not task:
        console.print("[red]No task provided. Pass a task argument or use --template.[/red]")
        raise typer.Exit(1)

    if not name:
        name = generate_agent_name(task)

    ws = Path(workspace) if workspace else None
    proj_root = str(Path.cwd()) if direct else None

    try:
        rec = spawn_agent(name, task, model=model, workspace=ws, parent=parent or None, project_root=proj_root)
    except RuntimeError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    model_label = format_model_rich(rec.model)
    parent_label = f"  (child of [bold]{rec.parent}[/bold])" if rec.parent else ""
    console.print(f"[green]Agent '{rec.name}' spawned[/green]  ({model_label}){parent_label}")
    console.print(f"  Task: {rec.task}")
    console.print(f"  Workspace: {rec.workspace}")
    console.print(f"  Window: {rec.tmux_window}")

    log_event("agent_spawned", {"agent": rec.name, "model": rec.model, "task": rec.task[:120]})

    if guardians:
        triggered = trigger_guardian("batch_complete")
        if triggered:
            console.print(f"[dim]Guardians triggered: {', '.join(triggered)}[/dim]")


@app.command(name="templates")
def templates_cmd(
    category: str = typer.Option("", "--category", "-c", help="Filter by category"),
):
    """List all available agent templates from agents/library/."""
    from rich.table import Table

    if not AGENTS_LIBRARY_DIR.exists():
        console.print(f"[red]Agents library not found at {AGENTS_LIBRARY_DIR}[/red]")
        raise typer.Exit(1)

    rows = []
    for json_file in sorted(AGENTS_LIBRARY_DIR.rglob("*.json")):
        try:
            data = json.loads(json_file.read_text())
        except Exception:
            continue
        if not data.get("name"):
            continue
        tmpl_id = json_file.stem
        tmpl_category = data.get("category") or json_file.parent.name
        if category and tmpl_category != category:
            continue
        model = data.get("modelHint") or data.get("model", "")
        desc = data.get("description", "")
        if len(desc) > 60:
            desc = desc[:57] + "..."
        rows.append((tmpl_id, data["name"], tmpl_category, model, desc))

    if not rows:
        console.print("[dim]No templates found.[/dim]")
        return

    table = Table(title=f"Agent Templates ({len(rows)} total)")
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="bold")
    table.add_column("Category", style="yellow")
    table.add_column("Model", style="green")
    table.add_column("Description", max_width=60)

    for row in rows:
        table.add_row(*row)

    console.print(table)


@app.command()
def status():
    """Show status of all agents in a rich table."""
    print_status()


@app.command()
def dashboard():
    """Interactive TUI dashboard for monitoring agents."""
    from .dashboard import run_dashboard

    run_dashboard()


@app.command()
def attach(name: str = typer.Argument(..., help="Agent name to attach to")):
    """Attach to a running agent's tmux window to watch live output."""
    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    if rec.status != "running":
        console.print(f"[yellow]Agent '{name}' is not running (status: {rec.status}).[/yellow]")
        console.print("[dim]Use 'oa collect' to see its output.[/dim]")
        raise typer.Exit(1)

    success = attach_agent(name)
    if success:
        console.print(f"[green]Switched to window '{rec.tmux_window}'[/green]")
        console.print("[dim]Use Ctrl-b n/p to navigate tmux windows, or 'oa status' to check all agents.[/dim]")
    else:
        console.print(f"[red]Could not attach to agent '{name}'. Is the tmux session running?[/red]")
        raise typer.Exit(1)


@app.command()
def watch(name: str = typer.Argument(..., help="Agent name to watch")):
    """Watch a running agent's output in real-time (streams tmux pane content)."""
    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    if rec.status != "running":
        console.print(f"[yellow]Agent '{name}' is not running (status: {rec.status}).[/yellow]")
        raise typer.Exit(1)

    from .lifecycle import capture_agent_output

    console.print(f"[bold]Watching agent '{name}'[/bold] (Ctrl-C to stop)\n")
    try:
        while True:
            # Refresh status
            current = check_agent(name)
            output = capture_agent_output(rec.tmux_window, lines=40)
            # Clear screen and redraw
            console.clear()
            console.print(f"[bold]Agent: {name}[/bold]  |  Status: {current}  |  Model: {rec.model}")
            console.print("\u2500" * 60)
            if output:
                console.print(output)
            else:
                console.print("[dim]No output yet...[/dim]")
            console.print("\n[dim]Ctrl-C to stop watching[/dim]")

            if current != "running":
                console.print(f"\n[green]Agent finished with status: {current}[/green]")
                break

            time.sleep(1)
    except KeyboardInterrupt:
        console.print("\n[dim]Stopped watching.[/dim]")


@app.command()
def kill(name: str = typer.Argument(..., help="Agent name to kill")):
    """Stop a running agent and close its tmux window."""
    success = kill_agent(name)
    if success:
        console.print(f"[yellow]Agent '{name}' killed.[/yellow]")
    else:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)


@app.command()
def collect(name: str = typer.Argument(..., help="Agent name to collect output from")):
    """Show the output of a completed agent."""
    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    # Refresh status
    current_status = check_agent(name)
    if current_status == "running":
        console.print(f"[yellow]Agent '{name}' is still running. Wait for completion.[/yellow]")
        raise typer.Exit(1)

    output = read_output(rec.workspace)
    if output:
        console.print(f"\n[bold]Output from agent '{name}':[/bold]\n")
        console.print(output)
    else:
        console.print(f"[yellow]No output.md found in workspace: {rec.workspace}[/yellow]")


@app.command()
def clean():
    """Clean up workspaces of all finished agents."""
    cleaned = clean_finished()
    if cleaned:
        console.print(f"[green]Cleaned {len(cleaned)} agent(s): {', '.join(cleaned)}[/green]")
    else:
        console.print("[dim]Nothing to clean.[/dim]")


@app.command()
def pipeline(
    task: str = typer.Argument(..., help="The high-level task to decompose and execute"),
):
    """Run a multi-agent pipeline: planner -> subtasks -> combiner."""
    from .pipeline import run_pipeline

    run_pipeline(task)


@app.command()
def web(
    port: int = typer.Option(5174, "--port", "-p", help="Bridge server port"),
):
    """Start the web UI (React SPA + local bridge server)."""
    from .bridge import run_bridge

    console.print(f"[bold cyan]Starting Open Agents web UI...[/bold cyan]")
    console.print(f"  Bridge: http://localhost:{port}")
    console.print(f"  Web UI: http://localhost:{port}")
    console.print("[dim]Press Ctrl-C to stop[/dim]\n")
    run_bridge(port=port)


@app.command()
def delegate(
    task: str = typer.Argument(..., help="The high-level task to delegate"),
    model: str = typer.Option("claude/sonnet", "--model", "-m", help="Worker model"),
    orchestrator_model: str = typer.Option("claude/opus", "--orchestrator-model", help="Orchestrator model"),
    name: str = typer.Option("", "--name", "-n", help="Base name for the orchestrator"),
    max_workers: int = typer.Option(5, "--max-workers", help="Max concurrent workers per batch"),
):
    """Delegate a task: spawns orchestrator + workers automatically (D-051).

    The orchestrator analyzes, decomposes, and delegates. Workers execute.
    """
    if not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
        raise typer.Exit(1)

    if not name:
        name = generate_agent_name(task)

    try:
        rec = spawn_with_orchestrator(
            name=name,
            task=task,
            worker_model=model,
            orchestrator_model=orchestrator_model,
            max_workers=max_workers,
        )
    except RuntimeError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    console.print(f"[bold green]Orchestrator '{rec.name}' spawned[/bold green]  ({orchestrator_model})")
    console.print(f"  Task: {task}")
    console.print(f"  Workers: {model} (max {max_workers})")
    console.print(f"  Workspace: {rec.workspace}")


@app.command()
def send(
    to: str = typer.Argument(..., help="Recipient agent name"),
    message: str = typer.Argument(..., help="Message content"),
    sender: str = typer.Option("user", "--from", "-f", help="Sender name (default: 'user')"),
):
    """Send a message to an agent."""
    path = send_message(sender, to, message)
    console.print(f"[green]Message sent[/green] {sender} -> {to}")


@app.command()
def inbox(
    name: str = typer.Argument(..., help="Agent name to check inbox for"),
    unread: bool = typer.Option(False, "--unread", "-u", help="Show only unread messages"),
    mark: bool = typer.Option(False, "--mark-read", help="Mark all messages as read after showing"),
):
    """Check an agent's message inbox."""
    from rich.table import Table
    from datetime import datetime

    messages = read_inbox(name, unread_only=unread)

    if not messages:
        console.print(f"[dim]No {'unread ' if unread else ''}messages for '{name}'.[/dim]")
        return

    table = Table(title=f"Inbox: {name} ({len(messages)} messages)")
    table.add_column("From", style="cyan")
    table.add_column("Time", style="dim")
    table.add_column("Message", max_width=60)
    table.add_column("Read", style="dim")

    for msg in messages:
        ts = datetime.fromtimestamp(msg.get("timestamp", 0)).strftime("%H:%M:%S")
        is_broadcast = msg.get("_broadcast") or msg.get("metadata", {}).get("broadcast")
        sender = msg.get("from", "?")
        if is_broadcast:
            sender = f"{sender} [broadcast]"
        read_mark = "yes" if msg.get("read") else "[bold yellow]NEW[/bold yellow]"
        content = msg.get("content", "")
        if len(content) > 60:
            content = content[:57] + "..."
        table.add_row(sender, ts, content, read_mark)

    console.print(table)

    if mark:
        count = mark_read(name)
        if count:
            console.print(f"[green]Marked {count} messages as read.[/green]")


@app.command()
def broadcast(
    message: str = typer.Argument(..., help="Message to broadcast to all running agents"),
    sender: str = typer.Option("user", "--from", "-f", help="Sender name (default: 'user')"),
):
    """Broadcast a message to all running agents."""
    paths = broadcast_message(sender, message)
    console.print(f"[green]Broadcast sent to {len(paths) - 1} agent(s)[/green]")


@app.command()
def stop(
    no_guardians: bool = typer.Option(False, "--no-guardians", help="Skip session_end guardian triggers"),
):
    """Stop the oa tmux session and trigger session_end guardians."""
    from .tmux import SESSION_NAME, _tmux, session_exists

    log_event("session_end", {"session": SESSION_NAME})

    if not no_guardians:
        triggered = trigger_guardian("session_end")
        if triggered:
            console.print(f"[dim]Guardians triggered: {', '.join(triggered)}[/dim]")
            console.print("[dim]Guardians are running in background — session will close now.[/dim]")

    if session_exists():
        _tmux(f"kill-session -t {SESSION_NAME}", check=False)
        console.print("[yellow]Session 'oa' stopped.[/yellow]")
    else:
        console.print("[dim]No active oa session.[/dim]")


@app.command(name="guardians")
def guardians_cmd(
    register: bool = typer.Option(False, "--register", help="Register a new guardian (interactive)"),
    trigger: str = typer.Option("", "--trigger", help="Manually trigger guardians for an event type"),
):
    """List, trigger, or register guardian agents."""
    from rich.table import Table

    if trigger:
        triggered = trigger_guardian(trigger)
        if triggered:
            console.print(f"[green]Triggered {len(triggered)} guardian(s): {', '.join(triggered)}[/green]")
        else:
            console.print(f"[yellow]No guardians registered for event '{trigger}'.[/yellow]")
        return

    items = list_guardians()
    if not items:
        console.print("[dim]No guardians registered.[/dim]")
        return

    table = Table(title="Registered Guardians")
    table.add_column("Name", style="cyan")
    table.add_column("Trigger", style="yellow")
    table.add_column("Model", style="green")
    table.add_column("Task (preview)", max_width=50)

    for g in items:
        table.add_row(g["name"], g["trigger"], g["model"], g["task_preview"])

    console.print(table)


@app.command()
def version():
    """Show the CLI version."""
    console.print(f"open-agents-cli v{__version__}")


# --- Team commands ---

team_app = typer.Typer(name="team", help="Manage agent teams.", no_args_is_help=True)
app.add_typer(team_app)


@team_app.command("create")
def team_create(
    name: str = typer.Argument(..., help="Team name"),
    members: list[str] = typer.Option([], "--member", "-m", help="Initial member agent names"),
):
    """Create a new agent team."""
    from .teams import create_team

    config = create_team(name, members=list(members))
    console.print(f"[green]Team '{name}' created.[/green]")
    if config["members"]:
        console.print(f"  Members: {', '.join(config['members'])}")


@team_app.command("list")
def team_list():
    """List all teams."""
    from .teams import list_teams
    from rich.table import Table

    teams = list_teams()
    if not teams:
        console.print("[dim]No teams found.[/dim]")
        return

    table = Table(title="Agent Teams")
    table.add_column("Name", style="cyan")
    table.add_column("Members", style="green")
    for t in teams:
        members = ", ".join(t.get("members", [])) or "[dim]none[/dim]"
        table.add_row(t["name"], members)
    console.print(table)


@team_app.command("add-member")
def team_add_member(
    team: str = typer.Argument(..., help="Team name"),
    agent: str = typer.Argument(..., help="Agent name to add"),
):
    """Add an agent to a team."""
    from .teams import add_member

    try:
        config = add_member(team, agent)
        console.print(f"[green]Added '{agent}' to team '{team}'.[/green]")
        console.print(f"  Members: {', '.join(config['members'])}")
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


@team_app.command("delete")
def team_delete(
    name: str = typer.Argument(..., help="Team name to delete"),
):
    """Delete a team."""
    from .teams import delete_team

    if delete_team(name):
        console.print(f"[yellow]Team '{name}' deleted.[/yellow]")
    else:
        console.print(f"[red]Team '{name}' not found.[/red]")
        raise typer.Exit(1)


# --- Task commands ---

task_app = typer.Typer(name="task", help="Manage shared team tasks.", no_args_is_help=True)
app.add_typer(task_app)


@task_app.command("create")
def task_create(
    team: str = typer.Argument(..., help="Team name"),
    title: str = typer.Argument(..., help="Task title"),
    description: str = typer.Option("", "--desc", "-d", help="Task description"),
    assigned_to: str = typer.Option("", "--assign", "-a", help="Assign to agent name"),
    blocked_by: list[str] = typer.Option([], "--blocked-by", "-b", help="Task IDs this is blocked by"),
):
    """Create a new task for a team."""
    from .task_list import create_task

    task = create_task(
        team=team,
        title=title,
        description=description,
        assigned_to=assigned_to or None,
        blocked_by=list(blocked_by),
    )
    console.print(f"[green]Task created[/green]  id={task['id']}")
    console.print(f"  Title: {task['title']}")
    console.print(f"  Team: {team}  |  Status: {task['status']}")


@task_app.command("list")
def task_list_cmd(
    team: str = typer.Argument(..., help="Team name"),
):
    """List all tasks for a team."""
    from .task_list import list_tasks
    from rich.table import Table

    STATUS_COLOR = {
        "pending": "yellow",
        "in_progress": "cyan",
        "completed": "green",
        "blocked": "red",
    }

    tasks = list_tasks(team)
    if not tasks:
        console.print(f"[dim]No tasks found for team '{team}'.[/dim]")
        return

    table = Table(title=f"Tasks: {team}")
    table.add_column("ID", style="dim")
    table.add_column("Title")
    table.add_column("Status")
    table.add_column("Assigned", style="dim")
    for t in tasks:
        status = t.get("status", "pending")
        color = STATUS_COLOR.get(status, "white")
        table.add_row(
            t["id"],
            t["title"],
            f"[{color}]{status}[/{color}]",
            t.get("assigned_to") or "-",
        )
    console.print(table)


@task_app.command("done")
def task_done(
    team: str = typer.Argument(..., help="Team name"),
    task_id: str = typer.Argument(..., help="Task ID to mark as completed"),
):
    """Mark a task as completed."""
    from .task_list import update_task

    try:
        task = update_task(team, task_id, "completed")
        console.print(f"[green]Task '{task_id}' marked as completed.[/green]")
        console.print(f"  Title: {task['title']}")
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


@task_app.command("update")
def task_update(
    team: str = typer.Argument(..., help="Team name"),
    task_id: str = typer.Argument(..., help="Task ID"),
    status: str = typer.Argument(..., help="New status: pending|in_progress|completed|blocked"),
):
    """Update a task's status."""
    from .task_list import update_task

    try:
        task = update_task(team, task_id, status)
        console.print(f"[green]Task '{task_id}' status set to '{status}'.[/green]")
        console.print(f"  Title: {task['title']}")
    except (FileNotFoundError, ValueError) as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


# --- Checkpoint commands ---

checkpoint_app = typer.Typer(name="checkpoint", help="Manage agent checkpoints for crash-recovery.", no_args_is_help=True)
app.add_typer(checkpoint_app)


@checkpoint_app.command("list")
def checkpoint_list():
    """List all incomplete (non-completed) checkpoints."""
    from .checkpoint import list_incomplete
    from rich.table import Table

    items = list_incomplete()
    if not items:
        console.print("[dim]No incomplete checkpoints.[/dim]")
        return

    table = Table(title="Incomplete Checkpoints")
    table.add_column("Agent", style="cyan")
    table.add_column("Status", style="yellow")
    table.add_column("Updated", style="dim")
    table.add_column("Task", max_width=50)

    for cp in items:
        table.add_row(
            cp.get("agent_name", "?"),
            cp.get("status", "?"),
            cp.get("updated_at", "?")[:19],
            cp.get("task", "")[:50],
        )
    console.print(table)


@checkpoint_app.command("show")
def checkpoint_show(name: str = typer.Argument(..., help="Agent name")):
    """Show details of a checkpoint."""
    from .checkpoint import load_checkpoint

    cp = load_checkpoint(name)
    if cp is None:
        console.print(f"[red]No checkpoint found for '{name}'.[/red]")
        raise typer.Exit(1)

    console.print(f"[bold]Checkpoint: {cp['agent_name']}[/bold]")
    console.print(f"  Status:  {cp['status']}")
    console.print(f"  Model:   {cp['model']}")
    console.print(f"  Created: {cp['created_at'][:19]}")
    console.print(f"  Updated: {cp['updated_at'][:19]}")
    console.print(f"  Task:    {cp['task']}")
    notes = cp.get("progress_notes", [])
    if notes:
        console.print("  Progress notes:")
        for n in notes:
            console.print(f"    - {n}")
    snapshot = cp.get("output_snapshot", "")
    if snapshot:
        console.print(f"  Output snapshot (last 200 chars):\n    {snapshot[-200:]}")


@app.command()
def resume(name: str = typer.Argument(..., help="Agent name to resume from checkpoint")):
    """Resume an agent from its last checkpoint."""
    from .checkpoint import load_checkpoint, resume_from_checkpoint

    if not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
        raise typer.Exit(1)

    cp = load_checkpoint(name)
    if cp is None:
        console.print(f"[red]No checkpoint found for '{name}'.[/red]")
        raise typer.Exit(1)

    if cp.get("status") == "completed":
        console.print(f"[yellow]Checkpoint for '{name}' is already completed.[/yellow]")
        raise typer.Exit(1)

    resume_task = resume_from_checkpoint(name)
    resume_name = f"{name}-resume"
    model = cp.get("model", "claude/sonnet")

    try:
        rec = spawn_agent(resume_name, resume_task, model=model)
    except RuntimeError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    console.print(f"[green]Resume agent '{rec.name}' spawned[/green]  (model: {model})")
    console.print(f"  Original agent: {name}")
    console.print(f"  Workspace: {rec.workspace}")


if __name__ == "__main__":
    app()
