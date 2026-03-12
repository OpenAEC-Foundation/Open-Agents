"""Task commands: task create/list/done/claim/complete/update."""

from __future__ import annotations

import typer
from rich.console import Console

console = Console()

task_app = typer.Typer(name="task", help="Manage shared team tasks.", no_args_is_help=True)


def register_commands(app: typer.Typer) -> None:
    """Register task sub-app on the main app."""

    @task_app.command("create")
    def task_create(
        team: str = typer.Argument(..., help="Team name"),
        title: str = typer.Argument(..., help="Task title"),
        description: str = typer.Option("", "--desc", "-d", help="Task description"),
        assigned_to: str = typer.Option("", "--assign", "-a", help="Assign to agent name"),
        blocked_by: list[str] = typer.Option([], "--blocked-by", "-b", help="Task IDs this is blocked by"),
    ):
        """Create a new task for a team."""
        from ..task_list import create_task

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
        from ..task_list import list_tasks
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
        from ..task_list import update_task

        try:
            task = update_task(team, task_id, "completed")
            console.print(f"[green]Task '{task_id}' marked as completed.[/green]")
            console.print(f"  Title: {task['title']}")
        except FileNotFoundError as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

    @task_app.command("claim")
    def task_claim_cmd(
        team: str = typer.Argument(..., help="Team name"),
        task_id: str = typer.Argument(..., help="Task ID to claim"),
        agent: str = typer.Option(..., "--agent", "-a", help="Agent name claiming the task"),
    ):
        """Claim a pending task for an agent (with file locking)."""
        from ..task_list import claim_task

        try:
            task = claim_task(team, task_id, agent)
            console.print(f"[green]Task '{task_id}' claimed by '{agent}'.[/green]")
            console.print(f"  Title: {task['title']}")
        except (FileNotFoundError, ValueError) as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

    @task_app.command("complete")
    def task_complete_cmd(
        team: str = typer.Argument(..., help="Team name"),
        task_id: str = typer.Argument(..., help="Task ID to complete"),
    ):
        """Mark a task as completed and auto-unblock dependent tasks."""
        from ..task_list import complete_task

        try:
            task = complete_task(team, task_id)
            console.print(f"[green]Task '{task_id}' completed.[/green]")
            console.print(f"  Title: {task['title']}")
        except (FileNotFoundError, ValueError) as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

    @task_app.command("update")
    def task_update(
        team: str = typer.Argument(..., help="Team name"),
        task_id: str = typer.Argument(..., help="Task ID"),
        status: str = typer.Argument(..., help="New status: pending|in_progress|completed|blocked"),
    ):
        """Update a task's status."""
        from ..task_list import update_task

        try:
            task = update_task(team, task_id, status)
            console.print(f"[green]Task '{task_id}' status set to '{status}'.[/green]")
            console.print(f"  Title: {task['title']}")
        except (FileNotFoundError, ValueError) as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

    app.add_typer(task_app)
