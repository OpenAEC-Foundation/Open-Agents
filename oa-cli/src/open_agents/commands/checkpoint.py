"""Checkpoint commands: checkpoint list/show."""

from __future__ import annotations

import typer
from rich.console import Console

console = Console()

checkpoint_app = typer.Typer(name="checkpoint", help="Manage agent checkpoints for crash-recovery.", no_args_is_help=True)


def register_commands(app: typer.Typer) -> None:
    """Register checkpoint sub-app on the main app."""

    @checkpoint_app.command("list")
    def checkpoint_list():
        """List all incomplete (non-completed) checkpoints."""
        from ..checkpoint import list_incomplete
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
        from ..checkpoint import load_checkpoint

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

    app.add_typer(checkpoint_app)
