"""PO commands: po review/check/install/uninstall/log."""

from __future__ import annotations

import typer
from rich.console import Console
from rich.panel import Panel

console = Console()

po_app = typer.Typer(
    name="po",
    help="Product Owner gate — evaluate changes against project vision and requirements.",
    no_args_is_help=True,
)


def register_commands(app: typer.Typer) -> None:
    """Register PO sub-app on the main app."""

    @po_app.command(name="review")
    def po_review(
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Model: claude/haiku|sonnet|opus"),
        diff: str = typer.Option("", "--diff", help="Provide diff text directly (skips git)"),
        description: str = typer.Option("", "--description", "-d", help="Plain-text description of the change"),
    ):
        """Evaluate the current git diff (or provided text) and show the PO verdict."""
        from ..po_agent import evaluate
        import datetime

        console.print("[bold cyan]Product Owner evaluatie...[/bold cyan]")

        result = evaluate(
            diff=diff or None,
            description=description or None,
            model=model,
        )

        verdict = result["verdict"]
        explanation = result["explanation"]
        ts = datetime.datetime.fromtimestamp(result["timestamp"]).strftime("%H:%M:%S")

        color_map = {"APPROVE": "green", "WARN": "yellow", "BLOCK": "red"}
        icon_map  = {"APPROVE": "\u2705", "WARN": "\u26a0\ufe0f ", "BLOCK": "\U0001f6ab"}
        color = color_map.get(verdict, "white")
        icon  = icon_map.get(verdict, "\u2753")

        console.print(Panel(
            f"[{color}][bold]{icon}  {verdict}[/bold][/{color}]\n\n{explanation}",
            title=f"[bold]Product Owner[/bold]  [{color}]{verdict}[/{color}]",
            subtitle=f"model: {model}  |  {ts}",
            border_style=color,
        ))

    @po_app.command(name="check")
    def po_check(
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Model to use"),
        exit_code: bool = typer.Option(False, "--exit-code", help="Exit 1 on BLOCK (for git hooks)"),
        diff: str = typer.Option("", "--diff", help="Provide diff text directly (skips git)"),
    ):
        """Run PO check silently. Exit 1 on BLOCK when --exit-code is set (used by git hook)."""
        from ..po_agent import evaluate

        result = evaluate(diff=diff or None, model=model)
        verdict = result["verdict"]
        explanation = result["explanation"]

        color_map = {"APPROVE": "green", "WARN": "yellow", "BLOCK": "red"}
        icon_map  = {"APPROVE": "\u2705", "WARN": "\u26a0\ufe0f ", "BLOCK": "\U0001f6ab"}

        color = color_map.get(verdict, "white")
        icon  = icon_map.get(verdict, "\u2753")
        console.print(f"[{color}]{icon}  PO: {verdict}[/{color}]")

        if verdict != "APPROVE":
            lines = [l for l in explanation.splitlines() if l.strip()]
            for line in lines[1:4]:
                console.print(f"[{color}]   {line}[/{color}]")

        if exit_code and verdict == "BLOCK":
            console.print(
                "\n[red bold]Commit geblokkeerd door Product Owner.[/red bold] "
                "Gebruik [dim]OA_PO_SKIP=1 git commit[/dim] om te bypassen."
            )
            raise typer.Exit(1)

    @po_app.command(name="install")
    def po_install():
        """Install the PO pre-commit git hook in the current repo."""
        from ..po_agent import install_git_hook
        hook_path = install_git_hook()
        console.print(f"[green]\u2705 PO pre-commit hook geinstalleerd: {hook_path}[/green]")
        console.print("[dim]Elke commit wordt nu beoordeeld door de Product Owner.[/dim]")
        console.print("[dim]Bypass (noodgeval): OA_PO_SKIP=1 git commit[/dim]")

    @po_app.command(name="uninstall")
    def po_uninstall():
        """Remove the PO pre-commit git hook."""
        from ..po_agent import uninstall_git_hook
        removed = uninstall_git_hook()
        if removed:
            console.print("[yellow]PO pre-commit hook verwijderd.[/yellow]")
        else:
            console.print("[dim]Geen PO hook gevonden om te verwijderen.[/dim]")

    @po_app.command(name="log")
    def po_log(
        n: int = typer.Option(10, "--n", "-n", help="Number of recent decisions to show"),
    ):
        """Show recent Product Owner decisions."""
        from ..po_agent import recent_decisions
        from rich.table import Table
        import datetime

        decisions = recent_decisions(n)
        if not decisions:
            console.print("[dim]Geen PO beslissingen gevonden (~/.oa/po-decisions.json).[/dim]")
            return

        table = Table(title=f"Product Owner — laatste {len(decisions)} beslissingen")
        table.add_column("Tijd", style="dim", no_wrap=True)
        table.add_column("Verdict", justify="center")
        table.add_column("Uitleg (fragment)")
        table.add_column("Model", style="dim")

        color_map = {"APPROVE": "green", "WARN": "yellow", "BLOCK": "red"}

        for d in reversed(decisions):
            ts = datetime.datetime.fromtimestamp(d.get("timestamp", 0)).strftime("%m-%d %H:%M")
            verdict = d.get("verdict", "?")
            color = color_map.get(verdict, "white")
            lines = [l for l in d.get("explanation", "").splitlines() if l.strip()]
            snippet = lines[1] if len(lines) > 1 else (lines[0] if lines else "\u2014")
            table.add_row(
                ts,
                f"[{color}]{verdict}[/{color}]",
                snippet[:80],
                d.get("model", "\u2014"),
            )

        console.print(table)

    app.add_typer(po_app)
