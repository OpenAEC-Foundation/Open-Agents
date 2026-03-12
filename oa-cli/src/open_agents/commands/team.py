"""Team commands: team create/list/add-member/delete/workspace-template."""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console

console = Console()

team_app = typer.Typer(name="team", help="Manage agent teams.", no_args_is_help=True)


def register_commands(app: typer.Typer) -> None:
    """Register team sub-app on the main app."""

    @team_app.command("create")
    def team_create(
        name: str = typer.Argument(..., help="Team name"),
        members: list[str] = typer.Option([], "--member", "-m", help="Initial member agent names"),
    ):
        """Create a new agent team."""
        from ..teams import create_team

        config = create_team(name, members=list(members))
        console.print(f"[green]Team '{name}' created.[/green]")
        if config["members"]:
            console.print(f"  Members: {', '.join(config['members'])}")

    @team_app.command("list")
    def team_list():
        """List all teams."""
        from ..teams import list_teams
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
        from ..teams import add_member

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
        from ..teams import delete_team

        if delete_team(name):
            console.print(f"[yellow]Team '{name}' deleted.[/yellow]")
        else:
            console.print(f"[red]Team '{name}' not found.[/red]")
            raise typer.Exit(1)

    @team_app.command("workspace-template")
    def team_workspace_template(
        name: str = typer.Argument(..., help="Team name"),
        output: str = typer.Option("", "--output", "-o", help="Output path (default: ./<team>/CLAUDE.md)"),
    ):
        """Generate a CLAUDE.md workspace template for a team."""
        from ..teams import get_team
        from ..task_list import list_tasks as list_team_tasks

        team = get_team(name)
        if not team:
            console.print(f"[red]Team '{name}' not found.[/red]")
            raise typer.Exit(1)

        members = team.get("members", [])
        tasks = list_team_tasks(name)
        pending = [t for t in tasks if t.get("status") in ("pending", "todo")]

        lines = [
            f"# Team: {name}",
            "",
            "## Members",
        ]
        if members:
            for m in members:
                lines.append(f"- {m}")
        else:
            lines.append("- _(no members yet)_")

        lines += [
            "",
            "## Pending Tasks",
        ]
        if pending:
            for t in pending:
                title = t.get("title") or t.get("description", "untitled")
                lines.append(f"- [ ] {title}")
        else:
            lines.append("- _(no pending tasks)_")

        lines += [
            "",
            "## Inter-Agent Messaging",
            "",
            "All team members can communicate via:",
            "- `oa send <agent> \"message\" --from <your-name>` — send a message",
            "- `oa inbox <your-name>` — check your messages",
            "- `oa broadcast \"message\" --from <your-name>` — message all agents",
            "",
            "## Quality Hooks",
            "",
            "Hooks fire automatically on lifecycle events:",
            "- `on_task_complete` — triggered when any task is marked done",
            "- `on_idle` — triggered when all team tasks are completed",
            "",
            "Configure hooks in `~/.oa/hooks-config.yaml` or register them programmatically.",
            "",
            "## Rules",
            "",
            "- Use absolute file paths for all references",
            "- English in code, max 300 lines per file",
            "- Commit with: `git add <files> && git commit -m \"feat(<scope>): ...\"`",
            "",
        ]

        content = "\n".join(lines)

        if output:
            out_path = Path(output)
        else:
            out_path = Path.cwd() / name / "CLAUDE.md"

        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content)
        console.print(f"[green]Workspace template written to {out_path}[/green]")
        console.print(f"  Members: {len(members)}  |  Pending tasks: {len(pending)}")

    app.add_typer(team_app)
