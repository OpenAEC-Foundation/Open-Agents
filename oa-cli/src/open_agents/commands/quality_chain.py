"""quality-chain command — writer → tester → fixer kwaliteitsloop (A2 pattern)."""

from __future__ import annotations

import shutil
import time
from pathlib import Path

import typer

from ..lifecycle import check_agent, kill_agent
from ..spawner import spawn_agent
from ..state import get_agent
from ..tmux import session_exists
from ..utils import generate_agent_name
from ..workspace import cleanup_workspace, read_output
from ._helpers import console


def register_commands(app: typer.Typer) -> None:
    """Register the quality-chain command."""

    @app.command(name="quality-chain")
    def quality_chain(
        task: str = typer.Argument(..., help="De taak die door de writer agent uitgevoerd wordt"),
        name: str = typer.Option("", "--name", "-n", help="Basisnaam voor de agent-keten (auto-generated als leeg)"),
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Model voor writer en fixer agents"),
        direct: bool = typer.Option(True, "--direct", "-d", help="Direct write mode (default: True)"),
        skip_fix: bool = typer.Option(False, "--skip-fix", help="Alleen writer + tester, geen fixer stap"),
        poll_interval: int = typer.Option(5, "--poll-interval", help="Polling interval in seconden (default: 5)"),
        timeout: int = typer.Option(600, "--timeout", help="Max wachttijd per agent in seconden (default: 600)"),
    ):
        """Spawn een writer → tester → fixer kwaliteitsloop (A2 pattern).

        Werking:
        1. Writer agent voert de taak uit
        2. Tester agent reviewt de writer output op correctheid, volledigheid en kwaliteit
        3. Als de tester bevindingen rapporteert: fixer agent past de output aan
        4. Final output = fixer output (of writer output als geen issues)

        Gebruik --skip-fix om alleen writer + tester te draaien.
        """
        if not session_exists():
            console.print("[red]No oa session. Run 'oa start' first.[/red]")
            raise typer.Exit(1)

        if not name:
            name = generate_agent_name(task)

        proj_root = str(Path.cwd()) if direct else None

        writer_name = f"{name}-writer"
        tester_name = f"{name}-tester"
        fixer_name = f"{name}-fixer"

        # --- Stap 1: Writer ---
        console.print(f"\n[bold cyan]Schrijver bezig...[/bold cyan]  ([dim]{writer_name}[/dim])")
        try:
            writer_rec = spawn_agent(
                writer_name,
                task,
                model=model,
                project_root=proj_root,
            )
        except RuntimeError as e:
            console.print(f"[red]Writer kon niet gespawnd worden: {e}[/red]")
            raise typer.Exit(1)

        console.print(f"  [dim]Writer workspace: {writer_rec.workspace}[/dim]")

        # Wacht op writer completion
        writer_status = _wait_for_agent(writer_name, timeout=timeout, poll_interval=poll_interval)
        if writer_status != "done":
            console.print(f"[red]Writer agent '{writer_name}' eindigde met status: {writer_status}.[/red]")
            console.print("[dim]Controleer de writer workspace voor details.[/dim]")
            raise typer.Exit(1)

        writer_output = read_output(writer_rec.workspace)
        if not writer_output:
            console.print(f"[red]Writer '{writer_name}' produceerde geen output (output/result.md niet gevonden).[/red]")
            raise typer.Exit(1)

        console.print(f"[green]Schrijver klaar[/green] — {len(writer_output)} tekens output")

        # --- Stap 2: Tester ---
        console.print(f"\n[bold yellow]Tester bezig...[/bold yellow]  ([dim]{tester_name}[/dim])")

        tester_task = (
            f"Review en test de volgende output op correctheid, volledigheid en kwaliteit.\n"
            f"Geef een lijst van bevindingen.\n\n"
            f"Originele taak:\n{task}\n\n"
            f"Output om te reviewen:\n{writer_output}\n\n"
            f"Schrijf je bevindingen naar output/result.md.\n"
            f"Begin met 'GEEN ISSUES' als de output correct en volledig is.\n"
            f"Begin met 'BEVINDINGEN:' gevolgd door een genummerde lijst als er verbeterpunten zijn."
        )

        try:
            tester_rec = spawn_agent(
                tester_name,
                tester_task,
                model=model,
                project_root=proj_root,
            )
        except RuntimeError as e:
            console.print(f"[red]Tester kon niet gespawnd worden: {e}[/red]")
            raise typer.Exit(1)

        tester_status = _wait_for_agent(tester_name, timeout=timeout, poll_interval=poll_interval)
        if tester_status != "done":
            console.print(f"[red]Tester agent '{tester_name}' eindigde met status: {tester_status}.[/red]")
            raise typer.Exit(1)

        tester_output = read_output(tester_rec.workspace)
        if not tester_output:
            console.print(f"[yellow]Tester '{tester_name}' produceerde geen output — writer output wordt gebruikt.[/yellow]")
            tester_output = "GEEN ISSUES"

        console.print(f"[green]Tester klaar[/green] — {len(tester_output)} tekens bevindingen")

        # Bepaal of er issues zijn
        has_issues = not tester_output.strip().upper().startswith("GEEN ISSUES")

        if not has_issues or skip_fix:
            if skip_fix and has_issues:
                console.print("\n[yellow]--skip-fix: fixer stap overgeslagen ondanks bevindingen.[/yellow]")
                console.print(f"[dim]Bevindingen:\n{tester_output[:500]}[/dim]")
            else:
                console.print("\n[green]Geen issues gevonden — writer output is de finale output.[/green]")

            # Cleanup tester workspace als geen fixer nodig
            _cleanup_agent_workspace(tester_name)

            console.print(f"\n[bold]Finale output ({len(writer_output)} tekens):[/bold]\n")
            _print_truncated(writer_output)
            console.print(f"\n[dim]Writer workspace: {writer_rec.workspace}[/dim]")
            return

        # --- Stap 3: Fixer ---
        console.print(f"\n[bold magenta]Fixer bezig...[/bold magenta]  ([dim]{fixer_name}[/dim])")
        console.print(f"[dim]Bevindingen:\n{tester_output[:300]}{'...' if len(tester_output) > 300 else ''}[/dim]")

        fixer_task = (
            f"Pas de onderstaande output aan op basis van de bevindingen van de reviewer.\n\n"
            f"Originele taak:\n{task}\n\n"
            f"Huidige output:\n{writer_output}\n\n"
            f"Bevindingen van de reviewer:\n{tester_output}\n\n"
            f"Verwerk ALLE bevindingen. Schrijf de verbeterde versie naar output/result.md."
        )

        try:
            fixer_rec = spawn_agent(
                fixer_name,
                fixer_task,
                model=model,
                project_root=proj_root,
            )
        except RuntimeError as e:
            console.print(f"[red]Fixer kon niet gespawnd worden: {e}[/red]")
            console.print(f"[yellow]Fallback: writer output wordt gebruikt.[/yellow]")
            console.print(f"\n[bold]Finale output (writer, {len(writer_output)} tekens):[/bold]\n")
            _print_truncated(writer_output)
            raise typer.Exit(1)

        fixer_status = _wait_for_agent(fixer_name, timeout=timeout, poll_interval=poll_interval)
        if fixer_status != "done":
            console.print(f"[red]Fixer agent '{fixer_name}' eindigde met status: {fixer_status}.[/red]")
            console.print(f"[yellow]Fallback: writer output wordt gebruikt.[/yellow]")
            console.print(f"\n[bold]Finale output (writer, {len(writer_output)} tekens):[/bold]\n")
            _print_truncated(writer_output)
            raise typer.Exit(1)

        fixer_output = read_output(fixer_rec.workspace)
        if not fixer_output:
            console.print(f"[yellow]Fixer produceerde geen output — writer output wordt gebruikt.[/yellow]")
            fixer_output = writer_output

        console.print(f"[green]Fixer klaar[/green] — {len(fixer_output)} tekens verbeterde output")

        console.print(f"\n[bold]Finale output ({len(fixer_output)} tekens):[/bold]\n")
        _print_truncated(fixer_output)
        console.print(f"\n[dim]Fixer workspace: {fixer_rec.workspace}[/dim]")


def _wait_for_agent(name: str, timeout: int = 600, poll_interval: int = 5) -> str:
    """Poll check_agent tot de agent klaar is of timeout bereikt is.

    Returns de finale status: 'done', 'error', 'killed', 'timeout', of 'unknown'.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = check_agent(name)
        if status is None:
            return "unknown"
        if status != "running":
            return status
        time.sleep(poll_interval)
    return "timeout"


def _cleanup_agent_workspace(name: str) -> None:
    """Cleanup de workspace van een agent na afloop."""
    rec = get_agent(name)
    if rec and rec.workspace:
        cleanup_workspace(rec.workspace)
        console.print(f"[dim]Workspace van '{name}' opgeruimd.[/dim]")


def _print_truncated(text: str, max_chars: int = 1000) -> None:
    """Print text, afgekapt als te lang."""
    if len(text) > max_chars:
        try:
            console.print(text[:max_chars] + f"\n[dim]... ({len(text) - max_chars} tekens meer)[/dim]")
        except Exception:
            print(text[:max_chars])
    else:
        try:
            console.print(text)
        except Exception:
            print(text)
