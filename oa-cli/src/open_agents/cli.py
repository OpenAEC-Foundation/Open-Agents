"""CLI — typer commands for the Open Agents orchestrator."""

from __future__ import annotations

import hashlib
import time

import typer
from rich.console import Console

from . import __version__
from .monitor import print_status
from .orchestrator import (
    attach_agent,
    check_agent,
    clean_finished,
    kill_agent,
    session_exists,
    spawn_agent,
    spawn_with_orchestrator,
    start_session,
)
from .state import get_agent, list_agents
from .workspace import list_proposals, read_output, read_proposal, read_proposals_summary

app = typer.Typer(
    name="oa",
    help="Open Agents — tmux-based multi-agent orchestrator for Claude Code.",
    no_args_is_help=True,
)
console = Console()


def _generate_name(task: str) -> str:
    """Generate a short deterministic name from the task text."""
    h = hashlib.md5(f"{task}{time.time()}".encode()).hexdigest()[:6]
    # Take first word of the task, sanitized
    word = "".join(c for c in task.split()[0] if c.isalnum()).lower()[:10] if task.strip() else "agent"
    return f"{word}-{h}"


@app.command()
def start():
    """Start the oa tmux session with a dashboard window."""
    created = start_session()
    if created:
        console.print("[green]Session 'oa' created with dashboard window.[/green]")
    else:
        console.print("[yellow]Session 'oa' already exists.[/yellow]")


@app.command()
def run(
    task: str = typer.Argument(..., help="The task description for the agent"),
    name: str = typer.Option("", "--name", "-n", help="Agent name (auto-generated if empty)"),
    model: str = typer.Option("claude", "--model", "-m", help="Model: 'claude' or 'ollama/<model>' (e.g. ollama/qwen3:8b)"),
    parent: str = typer.Option("", "--parent", "-p", help="Parent/orchestrator agent name (for hierarchy)"),
    workspace: str = typer.Option("", "--workspace", "-w", help="Use existing workspace directory (skips workspace creation)"),
):
    """Spawn an agent with a task in a new tmux window."""
    if not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
        raise typer.Exit(1)

    if not name:
        name = _generate_name(task)

    from pathlib import Path

    ws = Path(workspace) if workspace else None

    try:
        rec = spawn_agent(name, task, model=model, workspace=ws, parent=parent or None)
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
    import sys

    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    if rec.status != "running":
        console.print(f"[yellow]Agent '{name}' is not running (status: {rec.status}).[/yellow]")
        raise typer.Exit(1)

    from .orchestrator import capture_agent_output

    console.print(f"[bold]Watching agent '{name}'[/bold] (Ctrl-C to stop)\n")
    try:
        while True:
            # Refresh status
            current = check_agent(name)
            output = capture_agent_output(rec.tmux_window, lines=40)
            # Clear screen and redraw
            console.clear()
            console.print(f"[bold]Agent: {name}[/bold]  |  Status: {current}  |  Model: {rec.model}")
            console.print("─" * 60)
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
def review(name: str = typer.Argument(..., help="Agent name to review proposals from")):
    """Review proposals from a completed agent. Agents write proposals instead of modifying files directly."""
    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    # Check for proposals summary first
    summary = read_proposals_summary(rec.workspace)
    if summary:
        console.print(f"\n[bold cyan]Proposals Summary from '{name}':[/bold cyan]\n")
        console.print(summary)
        console.print()

    proposals = list_proposals(rec.workspace)
    if not proposals:
        console.print(f"[yellow]No proposals found for agent '{name}'.[/yellow]")
        # Fall back to showing regular output
        output = read_output(rec.workspace)
        if output:
            console.print(f"\n[bold]Output from '{name}':[/bold]\n")
            console.print(output)
        raise typer.Exit(0)

    console.print(f"[bold]Found {len(proposals)} proposal(s):[/bold]")
    for i, p in enumerate(proposals, 1):
        console.print(f"  {i}. {p.name}")

    console.print(f"\n[dim]Use 'oa apply {name}' to apply all proposals, or 'oa apply {name} --file <name>' for a specific one.[/dim]")


@app.command()
def apply(
    name: str = typer.Argument(..., help="Agent name to apply proposals from"),
    file: str = typer.Option("", "--file", "-f", help="Apply only a specific proposal file"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would be applied without applying"),
):
    """Apply approved proposals from an agent to the actual files."""
    import re

    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    proposals = list_proposals(rec.workspace)
    if not proposals:
        console.print(f"[yellow]No proposals found for agent '{name}'.[/yellow]")
        raise typer.Exit(0)

    if file:
        proposals = [p for p in proposals if file in p.name]
        if not proposals:
            console.print(f"[red]No proposal matching '{file}' found.[/red]")
            raise typer.Exit(1)

    applied = 0
    for proposal_path in proposals:
        content = read_proposal(proposal_path)

        # Extract target file path from proposal content
        # Look for patterns like "Bestand: /path/to/file", "**Bestand**: /path", "## Doelbestand\n`/path`"
        target_match = re.search(r'(?:\*{0,2})(?:Bestand|File|Target|Path|Doelbestand)(?:\*{0,2})(?::|\n)\s*[`"*]?(/[^\s`"*]+)', content)
        if not target_match:
            # Try to find a code block with a file path comment
            target_match = re.search(r'(?:schrijf naar|write to|target:)\s*[`"]?(/[^\s`"]+)', content, re.IGNORECASE)

        if not target_match:
            console.print(f"[yellow]  Skip: {proposal_path.name} — no target file path found in proposal[/yellow]")
            continue

        target_file = target_match.group(1)

        if dry_run:
            console.print(f"[cyan]  Would apply: {proposal_path.name} → {target_file}[/cyan]")
        else:
            # Extract the content between the last code block (``` markers)
            code_blocks = re.findall(r'```(?:\w*)\n(.*?)```', content, re.DOTALL)
            if code_blocks:
                new_content = code_blocks[-1]  # Use the last/largest code block
                from pathlib import Path as P
                P(target_file).parent.mkdir(parents=True, exist_ok=True)
                P(target_file).write_text(new_content)
                console.print(f"[green]  Applied: {proposal_path.name} → {target_file}[/green]")
                applied += 1
            else:
                console.print(f"[yellow]  Skip: {proposal_path.name} — no code block found to extract content[/yellow]")

    if dry_run:
        console.print(f"\n[dim]Dry run complete. Use without --dry-run to apply.[/dim]")
    else:
        console.print(f"\n[green]Applied {applied}/{len(proposals)} proposal(s).[/green]")


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
        name = _generate_name(task)

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
def version():
    """Show the CLI version."""
    console.print(f"open-agents-cli v{__version__}")


if __name__ == "__main__":
    app()
