"""Session commands: start, stop, session-start, session list/clean, logs."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

from ..config import get_disconnect_config
from ..guardians import log_event, trigger_guardian
from ..hooks import apply_hooks_config
from ..session import detect_previous_shutdown, ShutdownMode
from ..session_store import get_latest_session, list_sessions, cleanup_sessions
from ..session_cleanup import session_cleanup
from ..state import list_agents
from ..tmux import session_exists
from ._helpers import _run_preflight_gate

console = Console()

session_app = typer.Typer(name="session", help="View and manage session records.", invoke_without_command=True)


def _skill_update_background() -> None:
    """Run oa skill update in background at session start.

    Uses threading so it never blocks the session start flow.
    Only runs if ~/.oa/skill-registry.json has git-backed packages.
    Respects a cooldown: skips if last update was <6 hours ago.
    """
    import threading
    import time
    import json as _json
    from ..skill_registry import REGISTRY_PATH

    if not REGISTRY_PATH.exists():
        return

    cooldown_file = Path.home() / ".oa" / ".skill-update-ts"
    now = time.time()
    if cooldown_file.exists():
        try:
            last = float(cooldown_file.read_text().strip())
            if now - last < 6 * 3600:  # 6 hour cooldown
                return
        except Exception:
            pass

    def _run():
        import subprocess
        import shutil
        try:
            registry = _json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
            packages = registry.get("packages", [])
            updated = 0
            for pkg in packages:
                pkg_path = Path(pkg.get("path", ""))
                if pkg_path.exists() and (pkg_path / ".git").exists() and shutil.which("git"):
                    result = subprocess.run(
                        ["git", "pull", "--ff-only", "-q"],
                        cwd=pkg_path, capture_output=True, text=True,
                    )
                    if result.returncode == 0:
                        updated += 1
            cooldown_file.write_text(str(now))
        except Exception:
            pass

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    thread.join(timeout=0.1)  # Don't block — fire and forget


def _format_resume_banner(latest, info: dict) -> str:
    """Format the resume banner for DETACH mode."""
    lines = []
    if latest:
        summary = latest.agent_summary
        done = summary.get("done", 0)
        running = summary.get("running", 0)
        failed = summary.get("failed", 0)
        parts = []
        if done:
            parts.append(f"{done} done")
        if running:
            parts.append(f"{running} still running")
        if failed:
            parts.append(f"{failed} failed")
        lines.append(f"Agents: {' · '.join(parts)}" if parts else "Agents: none tracked")
        git = latest.git_state
        uncommitted = git.get("uncommitted_files", [])
        if uncommitted:
            lines.append(f"Git:    {len(uncommitted)} uncommitted file(s)")
        branch = git.get("branch", "")
        if branch:
            lines.append(f"Branch: {branch}")
    else:
        lines.append("Previous session detected (tmux alive)")
    lines.append("")
    lines.append("[dim]Run `oa session` for details  ·  `oa start --fresh` to discard[/dim]")
    return "\n".join(lines)


def _format_crash_banner(latest, info: dict) -> str:
    """Format the crash recovery banner."""
    lines = ["Previous session did not shut down cleanly."]
    heartbeat_age = info.get("heartbeat_age_seconds")
    if heartbeat_age is not None:
        minutes = int(heartbeat_age // 60)
        lines.append(f"Last heartbeat: {minutes} min ago")
    if latest:
        summary = latest.agent_summary
        done = summary.get("done", 0)
        running = summary.get("running", 0)
        failed = summary.get("failed", 0)
        total = summary.get("total", 0)
        lines.append(f"Last snapshot: {latest.session_id}  ({total} agents: {done} done, {running} running, {failed} failed)")
        git = latest.git_state
        uncommitted = git.get("uncommitted_files", [])
        if uncommitted:
            lines.append(f"Uncommitted files: {len(uncommitted)}")
    lines.append("")
    lines.append("Starting fresh session after cleanup...")
    return "\n".join(lines)


def register_commands(app: typer.Typer) -> None:
    """Register all session-related commands on the app."""

    @app.command()
    def start(
        chat: bool = typer.Option(True, "--chat/--no-chat", help="Enter interactive chat mode after starting the session (default: True)"),
        fresh: bool = typer.Option(False, "--fresh", help="Discard previous session state and start clean"),
    ):
        """Start the oa tmux session with a dashboard window."""
        if not _run_preflight_gate():
            raise typer.Exit(1)

        from ..tmux import SESSION_NAME, _tmux

        if not fresh:
            mode, info = detect_previous_shutdown()

            if mode == ShutdownMode.DETACH:
                latest = get_latest_session()
                console.print(Panel(
                    _format_resume_banner(latest, info),
                    title="[bold cyan]Session Resumed[/bold cyan]",
                    border_style="cyan",
                ))
                _tmux(f"attach-session -t {SESSION_NAME}", check=False)
                if chat:
                    from ..chat import ChatSession
                    ChatSession().start()
                return

            if mode == ShutdownMode.CRASH:
                latest = get_latest_session()
                console.print(Panel(
                    _format_crash_banner(latest, info),
                    title="[bold red]Crash Recovery[/bold red]",
                    border_style="red",
                ))
                from ..session import release_session_lock
                release_session_lock()

            if mode == ShutdownMode.CLEAN:
                latest = get_latest_session()
                if latest:
                    summary = latest.agent_summary
                    total = summary.get("total", 0)
                    done = summary.get("done", 0)
                    ts = latest.session_id
                    console.print(f"[dim]Last session: {ts} — {done}/{total} agents completed  ·  `oa session` for details[/dim]")

        from ..tmux import start_session as _start_session
        created = _start_session()
        if created:
            console.print("[green]Session 'oa' created with dashboard window.[/green]")
        else:
            console.print("[yellow]Session 'oa' already exists.[/yellow]")

        try:
            apply_hooks_config()
        except Exception:
            pass

        try:
            from ..compaction import start_daemon
            start_daemon()
            console.print("[dim]Auto-compaction daemon started (30s interval)[/dim]")
        except Exception:
            pass

        try:
            from ..po_agent import install_git_hook
            repo_root = Path(__file__).parents[4]
            hook_path = repo_root / ".git" / "hooks" / "pre-commit"
            if not hook_path.exists() or "Open-Agents Product Owner" not in hook_path.read_text():
                install_git_hook(repo_root)
                console.print("[dim]PO pre-commit hook auto-installed.[/dim]")
        except Exception:
            pass

        try:
            from ..core_files import read_handoff_summary, get_stale_files
            summary = read_handoff_summary()
            if summary and "niet gevonden" not in summary:
                console.print(Panel(summary, title="[bold]Laatste HANDOFF[/bold]", border_style="dim", padding=(0, 1)))
            stale = get_stale_files()
            if stale:
                names = ", ".join(s["name"] for s in stale)
                console.print(f"[yellow]⚠ Stale core files: {names}[/yellow]")
        except Exception:
            pass

        try:
            _skill_update_background()
        except Exception:
            pass

        if chat:
            from ..chat import ChatSession
            ChatSession().start()

    @app.command()
    def stop(
        no_guardians: bool = typer.Option(False, "--no-guardians", help="Skip session_end guardian triggers"),
        force: bool = typer.Option(False, "--force", help="Kill all agents immediately without waiting"),
    ):
        """Stop the oa tmux session with session persistence.

        5-phase shutdown: snapshot → wait for agents → release lock → notify → kill tmux.
        """
        from ..tmux import SESSION_NAME, _tmux, session_exists as _session_exists
        from ..session import release_session_lock

        log_event("session_end", {"session": SESSION_NAME})

        if not _session_exists():
            console.print("[dim]No active oa session.[/dim]")
            return

        disconnect_cfg = get_disconnect_config()
        timeout = disconnect_cfg.get("cleanup_timeout_seconds", 300)

        console.print("[bold]Phase 1:[/bold] Saving session snapshot...")
        cleanup_result = session_cleanup(mode="stop")
        console.print(f"  [green]Snapshot saved[/green]: {cleanup_result.get('snapshot_path', 'unknown')}")

        if not force:
            agents = list_agents()
            running = [name for name, rec in agents.items() if rec.status == "running"]
            if running:
                console.print(f"[bold]Phase 2:[/bold] Waiting for {len(running)} running agent(s) (max {timeout}s)...")
                console.print(f"  [dim]Running: {', '.join(running)}[/dim]")
                deadline = time.time() + timeout
                while time.time() < deadline:
                    agents = list_agents()
                    still_running = [n for n, r in agents.items() if r.status == "running"]
                    if not still_running:
                        console.print("  [green]All agents finished.[/green]")
                        break
                    remaining = int(deadline - time.time())
                    console.print(f"  [dim]{len(still_running)} agent(s) still running... ({remaining}s remaining)[/dim]")
                    time.sleep(min(5, remaining))
                else:
                    still_running = [n for n, r in list_agents().items() if r.status == "running"]
                    if still_running:
                        console.print(f"  [yellow]Timeout reached. {len(still_running)} agent(s) still running.[/yellow]")
                        session_cleanup(mode="stop")
        else:
            console.print("[bold]Phase 2:[/bold] [yellow]--force: skipping agent wait[/yellow]")

        console.print("[bold]Phase 3:[/bold] Releasing session lock...")
        release_session_lock()
        console.print("  [green]Lock released.[/green]")

        if disconnect_cfg.get("notify_desktop", True):
            try:
                from ..notify import send_notification
                agents = list_agents()
                summary = f"{len(agents)} agents tracked"
                done = sum(1 for a in agents.values() if a.status == "done")
                if done:
                    summary = f"{done} done"
                send_notification("oa-cli", f"Session ended — {summary}")
                console.print("[bold]Phase 4:[/bold] Desktop notification sent.")
            except Exception:
                console.print("[bold]Phase 4:[/bold] [dim]Notification skipped (not available).[/dim]")
        else:
            console.print("[bold]Phase 4:[/bold] [dim]Notifications disabled.[/dim]")

        if not no_guardians:
            triggered = trigger_guardian("session_end")
            if triggered:
                console.print(f"[dim]Guardians triggered: {', '.join(triggered)}[/dim]")

        try:
            from ..core_files import files_needing_update, get_stale_files
            needs_update = files_needing_update("session_end")
            stale = get_stale_files()
            all_attention = {f["name"]: f for f in needs_update + stale}
            if all_attention:
                names = ", ".join(all_attention.keys())
                console.print(Panel(
                    f"[yellow]Update deze core bestanden voor de volgende sessie:[/yellow]\n{names}\n\n"
                    "[dim]Guardians zijn al getriggerd. Handmatig: oa guardians --context 'session end'[/dim]",
                    title="[bold]Core Files[/bold]",
                    border_style="yellow",
                ))
        except Exception:
            pass

        console.print("[bold]Phase 5:[/bold] Closing tmux session...")
        _tmux(f"kill-session -t {SESSION_NAME}", check=False)
        console.print("[yellow]Session 'oa' stopped.[/yellow]")

    @app.command(name="session-start")
    def session_start():
        """Spawn een persistent session-orchestrator die taken aanneemt via oa inbox."""
        task = """Je bent de SESSION-ORCHESTRATOR voor deze werk-sessie.

## Je rol
Je bent een persistent agent. Je taak eindigt NIET — je blijft actief.

## Loop (herhaal elke 30 seconden)
1. Check inbox: lees ~/.oa/messages/session-orch/ op nieuwe berichten
2. Voor elk nieuw bericht: spawn een worker via bash:
   oa run "<taak uit bericht>" --name worker-$(date +%s) --model claude/sonnet --direct
3. Stuur bevestiging terug: oa send meta "Worker gespawnd voor: <taak>" --from session-orch
4. Sleep 30 seconden
5. Herhaal

## Hoe inbox te lezen
Lees bestanden in ~/.oa/messages/session-orch/ — elk bestand is een bericht.
Markeer gelezen door het bestand te hernoemen naar <naam>.read

## Stop criteria
Stop alleen als je een bericht ontvangt met inhoud "STOP" of "SHUTDOWN".

Start nu met de loop."""

        from ..spawner import spawn_agent
        rec = spawn_agent("session-orch", task, model="claude/sonnet")
        console.print(f"[green]Session orchestrator gestart: {rec.name}[/green]")
        console.print("[dim]Stuur taken via: oa send session-orch \"<taak>\" --from meta[/dim]")

    @app.command()
    def logs(
        name: str = typer.Argument(None, help="Agent name to filter logs for"),
        limit: int = typer.Option(10, "--limit", "-n", help="Number of runs to show"),
    ):
        """Show run logs. If name given: logs for that agent. Else: recent runs."""
        from rich.table import Table
        from .. import telemetry

        runs = telemetry.list_runs(limit=limit, agent_name=name or None)
        if not runs:
            if name:
                console.print(f"[dim]No run logs found for agent '{name}'.[/dim]")
            else:
                console.print("[dim]No run logs found.[/dim]")
            return

        title = f"Run logs for '{name}'" if name else f"Recent runs ({len(runs)})"
        table = Table(title=title)
        table.add_column("Run ID", style="dim", max_width=12)
        table.add_column("Agent", style="cyan")
        table.add_column("Model", style="yellow")
        table.add_column("Status", style="bold")
        table.add_column("Duration", style="green", justify="right")
        table.add_column("Started", style="dim")
        table.add_column("Task", max_width=50)

        status_colors = {"success": "green", "error": "red", "unknown": "yellow"}

        for run in runs:
            run_id = run.get("run_id", "")
            agent = run.get("agent_name", "")
            model = run.get("model", "")
            status = run.get("exit_status", "unknown")
            color = status_colors.get(status, "yellow")
            duration = run.get("duration_seconds")
            duration_str = f"{duration:.1f}s" if duration is not None else "—"
            started_at = run.get("started_at", "")
            if started_at:
                try:
                    dt = datetime.fromisoformat(started_at)
                    started_at = dt.strftime("%Y-%m-%d %H:%M")
                except (ValueError, TypeError):
                    pass
            task = run.get("task", "")
            if len(task) > 48:
                task = task[:45] + "..."
            table.add_row(
                run_id[:8],
                agent,
                model,
                f"[{color}]{status}[/{color}]",
                duration_str,
                started_at,
                task,
            )

        console.print(table)

    # Session sub-app commands
    @session_app.callback(invoke_without_command=True)
    def session_default(ctx: typer.Context):
        """Show current or latest session info."""
        if ctx.invoked_subcommand is not None:
            return

        latest = get_latest_session()
        if latest is None:
            console.print("[dim]No session records found.[/dim]")
            return

        console.print(Panel(
            _format_session_detail(latest),
            title=f"[bold]Session: {latest.session_id}[/bold]",
            border_style="blue",
        ))

    @session_app.command("list")
    def session_list_cmd(
        limit: int = typer.Option(10, "--limit", "-n", help="Number of sessions to show"),
    ):
        """List recent session records."""
        from rich.table import Table

        sessions = list_sessions(limit=limit)
        if not sessions:
            console.print("[dim]No session records found.[/dim]")
            return

        table = Table(title=f"Recent Sessions ({len(sessions)})")
        table.add_column("Session ID", style="cyan")
        table.add_column("Mode", style="yellow")
        table.add_column("Agents", style="green")
        table.add_column("Started", style="dim")

        for rec in sessions:
            summary = rec.agent_summary
            total = summary.get("total", 0)
            done = summary.get("done", 0)
            running = summary.get("running", 0)
            failed = summary.get("failed", 0)
            agent_str = f"{total} total"
            if done:
                agent_str += f", {done} done"
            if running:
                agent_str += f", {running} running"
            if failed:
                agent_str += f", {failed} failed"
            started = datetime.fromtimestamp(rec.started_at, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
            table.add_row(rec.session_id, rec.shutdown_mode, agent_str, started)

        console.print(table)

    @session_app.command("clean")
    def session_clean_cmd(
        days: int = typer.Option(30, "--days", "-d", help="Delete sessions older than this many days"),
    ):
        """Delete old session records."""
        deleted = cleanup_sessions(retention_days=days)
        if deleted:
            console.print(f"[green]Deleted {deleted} session record(s) older than {days} days.[/green]")
        else:
            console.print("[dim]No old session records to clean up.[/dim]")

    # Register session sub-app
    app.add_typer(session_app)


def _format_session_detail(rec) -> str:
    """Format a SessionRecord for display."""
    lines = []
    lines.append(f"Session ID:    {rec.session_id}")
    lines.append(f"Shutdown mode: {rec.shutdown_mode}")
    lines.append(f"Started at:    {datetime.fromtimestamp(rec.started_at, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    if rec.ended_at:
        lines.append(f"Ended at:      {datetime.fromtimestamp(rec.ended_at, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    if rec.duration_seconds:
        mins = int(rec.duration_seconds // 60)
        lines.append(f"Duration:      {mins} min")

    summary = rec.agent_summary
    if summary:
        total = summary.get("total", 0)
        done = summary.get("done", 0)
        running = summary.get("running", 0)
        failed = summary.get("failed", 0)
        lines.append(f"Agents:        {total} total · {done} done · {running} running · {failed} failed")

    git = rec.git_state
    if git:
        branch = git.get("branch", "")
        if branch:
            lines.append(f"Branch:        {branch}")
        uncommitted = git.get("uncommitted_files", [])
        if uncommitted:
            lines.append(f"Uncommitted:   {len(uncommitted)} file(s)")
        last_commit = git.get("last_commit", "")
        if last_commit:
            lines.append(f"Last commit:   {last_commit[:80]}")

    if rec.agents_snapshot:
        lines.append("")
        lines.append("[bold]Agents:[/bold]")
        for name, info in rec.agents_snapshot.items():
            status = info.get("status", "?")
            task = info.get("task", "")
            if len(task) > 60:
                task = task[:57] + "..."
            lines.append(f"  {name}: [{_status_color(status)}]{status}[/{_status_color(status)}]  {task}")

    return "\n".join(lines)


def _status_color(status: str) -> str:
    return {"done": "green", "running": "cyan", "failed": "red", "error": "red"}.get(status, "yellow")
