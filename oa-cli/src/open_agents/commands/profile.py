"""Profile commands: profile list/show/create."""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console

console = Console()

profile_app = typer.Typer(help="Manage agent profiles (stacked templates + skills)", no_args_is_help=True)

_PROFILES_LIBRARY_DIR = Path(__file__).parent.parent.parent.parent.parent / "agents" / "library"


def register_commands(app: typer.Typer) -> None:
    """Register profile sub-app on the main app."""

    @profile_app.command("list")
    def profile_list():
        """List all available agent profiles."""
        from ..profile_composer import list_profiles
        from rich.table import Table
        profiles = list_profiles()
        if not profiles:
            console.print("[yellow]No profiles found.[/yellow]")
            console.print("[dim]Create one: oa profile create <id> --templates a,b --description '...'[/dim]")
            return
        table = Table(title="Agent Profiles")
        table.add_column("ID", style="cyan")
        table.add_column("Name")
        table.add_column("Templates", style="dim", justify="right")
        table.add_column("Model", style="green")
        table.add_column("Description", style="dim")
        for p in profiles:
            desc = p.get("description", "")
            table.add_row(
                p.get("id", ""),
                p.get("name", ""),
                str(len(p.get("templates", []))),
                p.get("modelHint", "default"),
                (desc[:50] + "\u2026") if len(desc) > 50 else desc,
            )
        console.print(table)

    @profile_app.command("show")
    def profile_show(profile_id: str = typer.Argument(..., help="Profile ID")):
        """Show details of an agent profile."""
        from ..profile_composer import load_profile
        try:
            prof = load_profile(profile_id)
        except FileNotFoundError:
            console.print(f"[red]Profile '{profile_id}' not found.[/red]")
            raise typer.Exit(1)
        console.print(f"\n[bold cyan]{prof.get('id', profile_id)}[/bold cyan] \u2014 {prof.get('name', '')}")
        console.print(f"  [dim]{prof.get('description', '')}[/dim]")
        console.print(f"\n  Model:     [green]{prof.get('modelHint', 'default')}[/green]")
        console.print(f"  Templates: {', '.join(prof.get('templates', []))}")
        console.print(f"  Skills:    {', '.join(prof.get('skills', []))}")
        console.print(f"  Tags:      {', '.join(prof.get('tags', []))}")
        console.print(f"\n[dim]Run: oa run \"<task>\" --profile {profile_id} --direct[/dim]\n")

    @profile_app.command("create")
    def profile_create(
        profile_id: str = typer.Argument(..., help="Profile ID (e.g. ifc-full-pipeline)"),
        templates: str = typer.Option(..., "--templates", help="Comma-separated template IDs"),
        skills: str = typer.Option("", "--skills", help="Comma-separated skill IDs"),
        description: str = typer.Option("", "--description", help="Profile description"),
        profile_name: str = typer.Option("", "--name", help="Display name"),
        model: str = typer.Option("", "--model", help="Model override (claude/sonnet, claude/opus, ...)"),
    ):
        """Create a new agent profile from stacked templates."""
        from ..profile_composer import save_profile, merge_templates as _merge_templates
        tmpl_list = [t.strip() for t in templates.split(",") if t.strip()]
        skill_list = [s.strip() for s in skills.split(",") if s.strip()]

        if not model:
            merged = _merge_templates(tmpl_list, _PROFILES_LIBRARY_DIR)
            model = merged.get("modelHint", "claude/sonnet")

        path = save_profile(
            profile_id=profile_id,
            templates=tmpl_list,
            skills=skill_list,
            description=description,
            name=profile_name or profile_id,
            model_hint=model,
        )
        console.print(f"[green]\u2713[/green] Profile saved: [cyan]{path}[/cyan]")
        console.print(f"[dim]Use: oa run \"<task>\" --profile {profile_id} --direct[/dim]")

    app.add_typer(profile_app, name="profile")
