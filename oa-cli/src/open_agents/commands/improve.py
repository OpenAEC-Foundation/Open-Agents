"""Improve commands: improve analyze/list/run, suggest."""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

from ._helpers import AGENTS_LIBRARY_DIR

console = Console()

improve_app = typer.Typer(
    name="improve",
    help="Self-improvement engine — system analyzes itself and proposes what to build next.",
)


def register_commands(app: typer.Typer) -> None:
    """Register all improve-related commands on the app."""

    @improve_app.command("analyze")
    def improve_analyze(
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Claude model to use"),
        execute: bool = typer.Option(False, "--execute", help="Spawn agents for top N proposals immediately"),
        top: int = typer.Option(3, "--top", help="Number of proposals to show/execute"),
    ):
        """Analyze system signals and propose improvements. The system looks at itself."""
        from ..improvement_engine import collect_signals, analyze, save_proposals, run_proposal
        from rich.table import Table

        console.print("[bold cyan]Collecting system signals...[/bold cyan]")
        signals = collect_signals()

        summary = Table.grid(padding=(0, 2))
        summary.add_row("[dim]Agents[/dim]", f"{signals.get('agents_total', 0)} total, {signals.get('agents_fail_rate_pct', 0)}% fail rate")
        summary.add_row("[dim]PO decisions[/dim]", f"{signals.get('po_total', 0)} total, {signals.get('po_blocks', 0)} blocks")
        summary.add_row("[dim]Stale core files[/dim]", str(signals.get('stale_core_files_count', 0)))
        summary.add_row("[dim]Lessons[/dim]", f"{signals.get('lessons_count', 0)} entries, {signals.get('lessons_days_old', '?')}d old")
        summary.add_row("[dim]Agent templates[/dim]", str(signals.get('agent_templates_count', 0)))
        console.print(summary)
        console.print()

        console.print(f"[bold cyan]Analyzing with {model}...[/bold cyan]")
        proposals = analyze(signals, model=model)

        if not proposals:
            console.print("[red]No proposals generated. Check that the claude CLI is available.[/red]")
            raise typer.Exit(1)

        save_proposals(proposals)
        console.print(f"[green]Generated {len(proposals)} proposals. Showing top {min(top, len(proposals))}:[/green]\n")

        priority_colors = {1: "red", 2: "yellow", 3: "green"}
        priority_labels = {1: "HIGH", 2: "MEDIUM", 3: "LOW"}

        for i, p in enumerate(proposals[:top]):
            color = priority_colors.get(p.priority, "white")
            label = priority_labels.get(p.priority, "?")
            panel_title = f"[{color}]#{i} · P{p.priority} {label}[/{color}] · [bold]{p.category.upper()}[/bold]"
            body = (
                f"[dim]Observation:[/dim] {p.observation}\n\n"
                f"[bold]Proposal:[/bold] {p.proposal}\n\n"
                f"[dim]Rationale:[/dim] {p.rationale}\n\n"
                f"[cyan]$ {p.oa_run_cmd}[/cyan]"
            )
            console.print(Panel(body, title=panel_title, border_style=color, padding=(0, 1)))

        if execute:
            console.print(f"\n[bold yellow]Executing top {min(top, len(proposals))} proposals...[/bold yellow]")
            for i, p in enumerate(proposals[:top]):
                console.print(f"[dim]Spawning #{i}: {p.oa_run_cmd[:80]}...[/dim]")
                ok = run_proposal(p)
                status = "[green]✓ spawned[/green]" if ok else "[red]✗ failed[/red]"
                console.print(f"  {status}")

    @improve_app.command("list")
    def improve_list():
        """Show previously generated improvement proposals."""
        from ..improvement_engine import load_proposals
        from rich.table import Table

        proposals = load_proposals()
        if not proposals:
            console.print("[dim]No proposals found. Run 'oa improve analyze' first.[/dim]")
            raise typer.Exit(0)

        priority_colors = {1: "red", 2: "yellow", 3: "green"}
        priority_labels = {1: "HIGH", 2: "MED", 3: "LOW"}

        table = Table(title=f"Improvement Proposals ({len(proposals)} total)", show_lines=True)
        table.add_column("#", style="dim", width=3)
        table.add_column("P", width=5, justify="center")
        table.add_column("Category", width=14)
        table.add_column("Proposal", ratio=2)
        table.add_column("Command", ratio=3, style="cyan")

        for i, p in enumerate(proposals):
            color = priority_colors.get(p.priority, "white")
            label = priority_labels.get(p.priority, "?")
            table.add_row(
                str(i),
                f"[{color}]{label}[/{color}]",
                p.category,
                p.proposal[:120] + ("..." if len(p.proposal) > 120 else ""),
                p.oa_run_cmd[:100] + ("..." if len(p.oa_run_cmd) > 100 else ""),
            )

        console.print(table)

    @improve_app.command("run")
    def improve_run(
        index: int = typer.Argument(..., help="Proposal index to execute (from 'oa improve list')"),
    ):
        """Execute a specific improvement proposal by index."""
        from ..improvement_engine import load_proposals, run_proposal

        proposals = load_proposals()
        if not proposals:
            console.print("[red]No proposals found. Run 'oa improve analyze' first.[/red]")
            raise typer.Exit(1)

        if index < 0 or index >= len(proposals):
            console.print(f"[red]Index {index} out of range (0–{len(proposals) - 1}).[/red]")
            raise typer.Exit(1)

        p = proposals[index]
        console.print(f"[bold]Executing proposal #{index}:[/bold] {p.proposal}")
        console.print(f"[cyan]$ {p.oa_run_cmd}[/cyan]")

        ok = run_proposal(p)
        if ok:
            console.print("[green]✓ Agent spawned successfully.[/green]")
        else:
            console.print("[red]✗ Failed to spawn agent.[/red]")
            raise typer.Exit(1)

    app.add_typer(improve_app)

    # --- suggest command ---

    @app.command()
    def suggest(
        task: str = typer.Argument(..., help="Task description to find agents for"),
        top: int = typer.Option(5, "--top", "-n", help="Number of suggestions to show"),
        no_ai: bool = typer.Option(False, "--no-ai", help="Only keyword matching, no AI ranking"),
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Model for AI ranking"),
    ):
        """Suggest the best agents and skills for a task — before spawning."""
        from rich.table import Table
        from ..agent_selector import find_agents, find_skills

        console.print(f"\n[bold]Analysing task:[/bold] {task[:100]}{'...' if len(task) > 100 else ''}\n")

        with console.status("[dim]Searching agents...[/dim]"):
            agents = find_agents(task, library_dir=AGENTS_LIBRARY_DIR, top_n=top, use_ai=not no_ai, model=model)

        if agents:
            console.print("[bold]Agent Suggestions:[/bold]")
            for match in agents:
                from rich.markup import escape as _escape
                rank_label = f"[bold green]#{match.ai_rank}[/bold green] " if match.ai_rank else ""
                style = "green" if match.ai_rank == 1 else "dim" if match.ai_rank and match.ai_rank > 2 else "white"
                model_hint = f" [dim]({match.model_hint.split('/')[-1]})[/dim]" if match.model_hint else ""
                rationale = f"\n    [italic dim]{_escape(match.rationale)}[/italic dim]" if match.rationale else ""
                score_label = f" [dim]score={match.score:.2f}[/dim]" if not match.ai_rank else ""
                console.print(
                    f"  {rank_label}[{style}]{_escape(match.name)}[/{style}]  [cyan]{match.agent_id}[/cyan]"
                    f"{model_hint}{score_label}{rationale}"
                )
            console.print()
        else:
            console.print("[yellow]No matching agents found.[/yellow]\n")

        skills = find_skills(task, top_n=3)
        if skills:
            console.print("[bold]Skill Suggestions:[/bold]")
            for sk in skills:
                console.print(
                    f"  [magenta]{sk.name}[/magenta]  [dim]score={sk.score:.2f}[/dim]"
                    + (f"\n    [italic dim]{sk.description}[/italic dim]" if sk.description else "")
                )
            console.print()

        if len(agents) >= 2:
            stack_ids = ",".join(a.agent_id for a in agents[:min(3, len(agents))])
            stack_names = " + ".join(a.name for a in agents[:min(3, len(agents))])
            console.print("\n[bold]Aanbevolen stack:[/bold]")
            console.print(f"  [cyan]{stack_names}[/cyan]")
            console.print(f"  [dim]→ oa run \"<taak>\" --templates {stack_ids} --direct[/dim]")
            if skills:
                skill_ids = ",".join(s.skill_id for s in skills[:3])
                console.print(f"  [dim]   --skills {skill_ids}[/dim]")
            console.print()
            console.print(f"[dim]Sla op als profiel: oa profile create <id> --templates {stack_ids}[/dim]")

        if agents:
            best = agents[0]
            skills_flag = f" --skills {','.join(s.skill_id for s in skills)}" if skills else ""
            model_flag = f" --model {best.model_hint}" if best.model_hint else ""
            console.print("[bold]Ready-to-run command:[/bold]")
            console.print(
                f"  [cyan]oa run \"<task>\" --template {best.agent_id}{model_flag}{skills_flag} --direct[/cyan]"
            )
            console.print()
