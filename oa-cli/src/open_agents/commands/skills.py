"""Skills commands: skill list/show/install/update/assign/benchmark, knowledge, templates-review/promote, lessons."""

from __future__ import annotations

import json
from pathlib import Path

import typer
from rich.console import Console

from ..messaging import send_message

console = Console()

skill_app = typer.Typer(name="skill", help="Skill usage metrics and benchmarks.")
knowledge_app = typer.Typer(name="knowledge", help="Automated knowledge base — lessons from agent runs.")
lessons_app = typer.Typer(name="lessons", help="Manage lessons learned in LESSONS.md.")


def register_commands(app: typer.Typer) -> None:
    """Register all skill-related commands on the app."""

    # --- skill sub-app ---

    @skill_app.command(name="benchmark")
    def skill_benchmark(
        name: str = typer.Argument(..., help="Skill name to show metrics for"),
    ):
        """Show usage metrics and improvement suggestions for a skill."""
        from ..skill_evolver import get_skill_stats, suggest_improvements

        stats = get_skill_stats(name)
        if stats["usage_count"] == 0:
            console.print(f"[dim]No usage data for skill '{name}'.[/dim]")
            return

        trend_icons = {"improving": "[green]↑ improving[/green]", "declining": "[red]↓ declining[/red]", "stable": "[yellow]→ stable[/yellow]"}
        avg = stats["avg_score"]
        avg_color = "green" if avg and avg >= 0.7 else "yellow" if avg and avg >= 0.4 else "red"

        console.print(f"\n[bold]Skill:[/bold] [cyan]{name}[/cyan]")
        console.print(f"  Uses:      {stats['usage_count']}")
        console.print(f"  Avg Score: [{avg_color}]{avg:.3f}[/{avg_color}]")
        console.print(f"  Trend:     {trend_icons.get(stats['trend'], stats['trend'])}")

        suggestions = suggest_improvements(name)
        console.print(f"\n[bold]Suggestions:[/bold]")
        for s in suggestions:
            console.print(f"  - {s}")

    @skill_app.command(name="list")
    def skill_list(
        metrics: bool = typer.Option(False, "--metrics", "-m", help="Show usage metrics alongside skill names"),
        level: str = typer.Option("", "--level", "-l", help="Filter op level: workspace|global|system|package"),
        tag: str = typer.Option("", "--tag", "-t", help="Filter op tag"),
        project_root: str = typer.Option("", "--project-root", help="Project root voor workspace skills"),
    ):
        """List all skills, optionally with usage metrics or filtered by level/tag."""
        from rich.table import Table

        if level or tag:
            from ..skill_registry import list_skills as _list_skills
            pr = Path(project_root) if project_root else Path.cwd()
            found = _list_skills(level=level or None, tag=tag or None, project_root=pr)
            if not found:
                console.print("[dim]Geen skills gevonden.[/dim]")
                return
            table = Table(title=f"Skills ({len(found)})")
            table.add_column("Name", style="cyan")
            table.add_column("Level", style="yellow")
            table.add_column("Tags")
            table.add_column("Description")
            for s in sorted(found, key=lambda x: (x.level, x.name)):
                table.add_row(s.name, s.level, ", ".join(s.tags[:3]), s.description[:60])
            console.print(table)
            return

        from ..skill_registry import list_skills as _list_skills
        pr = Path(project_root) if project_root else Path.cwd()
        found = _list_skills(project_root=pr)

        if not found:
            console.print("[dim]No skills found in any skill directory.[/dim]")
            return

        table = Table(title=f"Skills ({len(found)})")
        table.add_column("Name", style="cyan")
        table.add_column("Level", style="yellow", max_width=10)
        table.add_column("Path", style="dim", max_width=45)

        if metrics:
            from ..skill_evolver import get_skill_stats
            table.add_column("Uses", justify="right")
            table.add_column("Avg Score", justify="right")
            table.add_column("Trend", justify="right")

        for s in sorted(found, key=lambda x: (x.level, x.name)):
            d = s.path.parent
            name = s.name
            row = [name, s.level, str(d)]
            if metrics:
                stats = get_skill_stats(name)
                uses = str(stats["usage_count"])
                avg = f"{stats['avg_score']:.3f}" if stats["avg_score"] is not None else "—"
                trend_icons = {"improving": "↑", "declining": "↓", "stable": "→"}
                trend = trend_icons.get(stats["trend"], "→")
                row.extend([uses, avg, trend])
            table.add_row(*row)

        console.print(table)

    @skill_app.command(name="show")
    def skill_show(name: str = typer.Argument(..., help="Skill naam")):
        """Toon SKILL.md inhoud van een skill."""
        from ..skill_registry import find_skill, load_skill_content
        match = find_skill(name, project_root=Path.cwd())
        if not match:
            typer.echo(f"Skill '{name}' niet gevonden.", err=True)
            raise typer.Exit(1)
        typer.echo(f"# {match.name}  [{match.level}]\n{match.path}\n")
        typer.echo(load_skill_content(match))

    @skill_app.command(name="install")
    def skill_install(package_path: str = typer.Argument(..., help="Pad naar skill package")):
        """Registreer een skill package in de registry."""
        from ..skill_registry import install_package
        result = install_package(package_path)
        typer.echo(f"Geinstalleerd: {result['installed']} skills uit {package_path}")
        for s in result.get("skills", [])[:10]:
            typer.echo(f"  - {s}")

    @skill_app.command(name="update")
    def skill_update():
        """Update alle geregistreerde skill packages via git pull."""
        import subprocess
        from ..skill_registry import REGISTRY_PATH

        if not REGISTRY_PATH.exists():
            typer.echo("Geen skill registry gevonden. Gebruik 'oa skill install <pad>' eerst.")
            raise typer.Exit(1)

        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        packages = registry.get("packages", [])
        if not packages:
            typer.echo("Geen packages geregistreerd.")
            raise typer.Exit(0)

        updated = 0
        skipped = 0
        for pkg in packages:
            pkg_path = Path(pkg.get("path", ""))
            if not pkg_path.exists():
                console.print(f"[yellow]⚠ Pad niet gevonden: {pkg_path}[/yellow]")
                skipped += 1
                continue
            if not (pkg_path / ".git").exists():
                console.print(f"[dim]Geen git repo: {pkg_path.name} — overgeslagen[/dim]")
                skipped += 1
                continue
            result = subprocess.run(
                ["git", "pull", "--ff-only"],
                cwd=pkg_path,
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                msg = result.stdout.strip().split("\n")[0]
                console.print(f"[green]✓[/green] {pkg_path.name}: {msg}")
                updated += 1
            else:
                console.print(f"[red]✗[/red] {pkg_path.name}: {result.stderr.strip()[:80]}")
                skipped += 1

        console.print(f"\n{updated} packages bijgewerkt, {skipped} overgeslagen.")

    @skill_app.command(name="assign")
    def skill_assign(
        agent_name: str = typer.Argument(..., help="Agent naam"),
        skill_name: str = typer.Argument(..., help="Skill naam"),
    ):
        """Stuur skill inhoud naar lopende agent via inbox."""
        from ..skill_registry import find_skill, load_skill_content
        match = find_skill(skill_name, project_root=Path.cwd())
        if not match:
            typer.echo(f"Skill '{skill_name}' niet gevonden.", err=True)
            raise typer.Exit(1)
        content = load_skill_content(match)
        send_message(to=agent_name, message=f"Skill toegewezen: {skill_name}\n\n{content[:500]}...", from_agent="meta")
        typer.echo(f"Skill '{skill_name}' gestuurd naar agent '{agent_name}'")

    app.add_typer(skill_app)

    # --- knowledge sub-app ---

    @knowledge_app.command(name="show")
    def knowledge_show(
        category: str = typer.Option(None, "--category", "-c", help="Filter by category (failure/success/duration_anomaly/observation)"),
    ):
        """Show extracted lessons from the knowledge base."""
        from rich.table import Table
        from ..lessons import list_lessons

        lessons = list_lessons(category=category)
        if not lessons:
            console.print("[dim]No lessons found. Lessons are auto-extracted after agent runs.[/dim]")
            return

        table = Table(title=f"Knowledge Base — Lessons ({len(lessons)})")
        table.add_column("ID", style="dim", no_wrap=True)
        table.add_column("Date", style="dim")
        table.add_column("Category", style="yellow")
        table.add_column("Confidence", justify="right")
        table.add_column("Lesson", max_width=70)

        cat_colors = {"failure": "red", "success": "green", "duration_anomaly": "yellow", "observation": "blue"}

        for l in lessons:
            cat = l.get("category", "?")
            color = cat_colors.get(cat, "white")
            conf = l.get("confidence", 0)
            lesson_text = l.get("lesson", "")
            if len(lesson_text) > 68:
                lesson_text = lesson_text[:65] + "..."
            table.add_row(
                l.get("id", "?"),
                l.get("date", "?"),
                f"[{color}]{cat}[/{color}]",
                f"{conf:.0%}",
                lesson_text,
            )

        console.print(table)

    @knowledge_app.command(name="install-hook")
    def knowledge_install_hook():
        """Install the auto-lessons post-run hook."""
        from ..lessons import install_auto_lessons_hook

        path = install_auto_lessons_hook()
        console.print(f"[green]Auto-lessons hook installed at {path}[/green]")

    app.add_typer(knowledge_app)

    # --- lessons sub-app ---

    @lessons_app.command(name="add")
    def lessons_add(
        lesson: str = typer.Argument(..., help="Lesson text to record"),
        agent: str = typer.Option("manual", "--agent", "-a", help="Agent or context name"),
        outcome: str = typer.Option("observation", "--outcome", "-o", help="Outcome (success/error/observation)"),
    ):
        """Append a lesson to LESSONS.md with the next L-NNN identifier."""
        from ..lessons_extractor import extract_lesson

        lesson_id = extract_lesson(agent_name=agent, outcome=outcome, lesson=lesson)
        console.print(f"[green]Les opgeslagen als {lesson_id}[/green]")

    app.add_typer(lessons_app)

    # --- templates-review / templates-promote ---

    @app.command(name="templates-review")
    def templates_review():
        """Review auto-generated template candidates (from successful runs)."""
        from rich.table import Table
        from ..template_gen import list_candidates

        candidates = list_candidates()
        if not candidates:
            console.print("[dim]No template candidates found. Run agents to generate candidates.[/dim]")
            return

        table = Table(title=f"Template Candidates ({len(candidates)})")
        table.add_column("Name", style="cyan", no_wrap=True)
        table.add_column("Model", style="green")
        table.add_column("Success Rate", justify="right")
        table.add_column("Runs", justify="right")
        table.add_column("Avg Duration", justify="right")
        table.add_column("Last Updated", style="dim")

        for c in candidates:
            rate = c.get("success_rate", 0)
            rate_color = "green" if rate >= 0.8 else "yellow" if rate >= 0.5 else "red"
            table.add_row(
                c.get("name", "?"),
                c.get("model", "?"),
                f"[{rate_color}]{rate:.1%}[/{rate_color}]",
                str(c.get("run_count", 0)),
                f"{c.get('avg_duration', 0):.1f}s",
                (c.get("last_updated") or "")[:10],
            )

        console.print(table)
        console.print("\n[dim]Promote with: oa templates-promote <name>[/dim]")

    @app.command(name="templates-promote")
    def templates_promote(
        name: str = typer.Argument(..., help="Name of the template candidate to promote"),
    ):
        """Promote a template candidate to the active prompt-templates directory."""
        from ..template_gen import promote_candidate

        result = promote_candidate(name)
        if result:
            console.print(f"[green]Template '{name}' promoted to {result}[/green]")
        else:
            console.print(f"[red]Candidate '{name}' not found in ~/.oa/template-candidates/[/red]")
            raise typer.Exit(1)
