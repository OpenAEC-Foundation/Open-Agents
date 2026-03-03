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
from .utils import generate_agent_name
from .lifecycle import attach_agent, check_agent, clean_finished, kill_agent
from .orchestrator import spawn_with_orchestrator
from .spawner import spawn_agent
from .tmux import session_exists, start_session
from .state import get_agent, list_agents
from .messaging import broadcast_message, mark_read, read_inbox, send_message, unread_count
from .workspace import read_output

app = typer.Typer(
    name="oa",
    help="Open Agents — tmux-based multi-agent orchestrator for Claude Code.",
    no_args_is_help=True,
)
console = Console()


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
    task: str = typer.Argument(..., help="The task description for the agent"),
    name: str = typer.Option("", "--name", "-n", help="Agent name (auto-generated if empty)"),
    model: str = typer.Option("claude", "--model", "-m", help="Model: 'claude' or 'ollama/<model>' (e.g. ollama/qwen3:8b)"),
    parent: str = typer.Option("", "--parent", "-p", help="Parent/orchestrator agent name (for hierarchy)"),
    workspace: str = typer.Option("", "--workspace", "-w", help="Use existing workspace directory (skips workspace creation)"),
    direct: bool = typer.Option(False, "--direct", "-d", help="Direct write mode: agent writes to project instead of proposals"),
):
    """Spawn an agent with a task in a new tmux window."""
    if not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
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

    model_label = f"[cyan]{rec.model}[/cyan]" if rec.model == "claude" else f"[magenta]{rec.model}[/magenta]"
    parent_label = f"  (child of [bold]{rec.parent}[/bold])" if rec.parent else ""
    console.print(f"[green]Agent '{rec.name}' spawned[/green]  ({model_label}){parent_label}")
    console.print(f"  Task: {rec.task}")
    console.print(f"  Workspace: {rec.workspace}")
    console.print(f"  Window: {rec.tmux_window}")


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
def version():
    """Show the CLI version."""
    console.print(f"open-agents-cli v{__version__}")


if __name__ == "__main__":
    app()
