"""Pipeline commands: pipeline, loop, handoff, compact."""

from __future__ import annotations

import time
from pathlib import Path

import typer
from rich.console import Console

from ..config import get_default_machine
from ..spawner import spawn_agent, spawn_remote_agent
from ..tmux import session_exists

console = Console()


def register_commands(app: typer.Typer) -> None:
    """Register all pipeline-related commands on the app."""

    @app.command()
    def pipeline(
        task: str = typer.Argument(..., help="The high-level task to decompose and execute"),
        auto_stop: bool = typer.Option(False, "--auto-stop", help="Stop pipeline when convergence is detected"),
    ):
        """Run a multi-agent pipeline: planner -> subtasks -> combiner."""
        from ..pipeline import run_pipeline

        if auto_stop:
            console.print("[cyan]Auto-stop enabled — pipeline will halt on convergence.[/cyan]")
        run_pipeline(task)

    @app.command()
    def loop(
        task: str = typer.Argument(..., help="Task description for each agent run"),
        interval: str = typer.Option("10m", "--interval", "-i", help="Interval between spawns: e.g. 30s, 5m, 2h"),
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Model for each agent"),
        name_prefix: str = typer.Option("loop", "--name", "-n", help="Prefix for agent names (loop-0, loop-1, ...)"),
        remote: str = typer.Option("", "--remote", "-r", help="Remote SSH host for remote execution"),
        local: bool = typer.Option(False, "--local", help="Force local execution (override remote default from machines.json)"),
        max_runs: int = typer.Option(0, "--max", help="Maximum number of runs (0 = infinite)"),
        wait: bool = typer.Option(False, "--wait", help="Wait for each agent to finish before spawning the next"),
    ) -> None:
        """Spawn an agent on a recurring interval. Ctrl-C to stop."""
        import re
        import signal

        def _parse_interval(s: str) -> int:
            s = s.strip().lower()
            m = re.fullmatch(r"(\d+)(s|m|h|d)", s)
            if not m:
                console.print(f"[red]Invalid interval '{s}'. Use format: 30s, 5m, 2h, 1d[/red]")
                raise typer.Exit(1)
            value, unit = int(m.group(1)), m.group(2)
            return value * {"s": 1, "m": 60, "h": 3600, "d": 86400}[unit]

        seconds = _parse_interval(interval)
        # Bepaal target machine: --local → lokaal; --remote <host> → expliciet remote;
        # anders → lees default machine uit machines.json (remote-first, D-061)
        if local:
            loop_target_host = None
        elif remote:
            loop_target_host = remote
        else:
            _default_machine = get_default_machine()
            _default_host = _default_machine.get("host", "") if _default_machine else ""
            loop_target_host = _default_host if _default_host else None

        console.print(f"[green]oa loop started[/green] — interval: [bold]{interval}[/bold] ({seconds}s), model: [bold]{model}[/bold]")
        if loop_target_host:
            console.print(f"  Remote: [bold]{loop_target_host}[/bold]")
        if max_runs:
            console.print(f"  Max runs: [bold]{max_runs}[/bold]")
        console.print("  Press [bold]Ctrl-C[/bold] to stop.\n")

        run_count = 0
        _stop = False

        def _handle_sigint(sig, frame):
            nonlocal _stop
            _stop = True
            console.print("\n[yellow]oa loop: stopping after current sleep...[/yellow]")

        signal.signal(signal.SIGINT, _handle_sigint)

        while not _stop:
            if max_runs and run_count >= max_runs:
                console.print(f"[green]oa loop: reached max runs ({max_runs}). Done.[/green]")
                break

            agent_name = f"{name_prefix}-{run_count}"
            console.print(f"[cyan]→ Spawning {agent_name}[/cyan] (run {run_count + 1}{f'/{max_runs}' if max_runs else ''})")

            try:
                if loop_target_host:
                    rec = spawn_remote_agent(agent_name, task, host=loop_target_host, model=model, direct=True)
                else:
                    rec = spawn_agent(agent_name, task, model=model)
                console.print(f"  [dim]spawned → status: {rec.status}[/dim]")
            except Exception as e:
                console.print(f"  [red]spawn failed: {e}[/red]")
                rec = None

            run_count += 1

            if wait and rec is not None and not loop_target_host:
                from ..lifecycle import check_agent
                console.print(f"  [dim]waiting for {agent_name} to finish...[/dim]")
                while not _stop:
                    status = check_agent(agent_name)
                    if status in ("done", "error", "timeout", "killed", None):
                        console.print(f"  [dim]{agent_name} → {status}[/dim]")
                        break
                    time.sleep(3)

            if _stop:
                break

            elapsed = 0
            while elapsed < seconds and not _stop:
                time.sleep(min(1, seconds - elapsed))
                elapsed += 1

        console.print(f"[green]oa loop done[/green] — {run_count} agent(s) spawned.")

    @app.command()
    def handoff(
        summary: str = typer.Option(None, "--summary", "-s", help="Session summary to include in the handoff document"),
    ):
        """Generate a handoff document (docs/HANDOFF-<date>.md) for the next session."""
        from ..handoff_generator import generate_handoff

        path = generate_handoff(session_summary=summary)
        console.print(f"[green]Handoff document geschreven naar:[/green] {path}")

    @app.command()
    def compact(
        name: str = typer.Argument(None, help="Agent name to compact (omit for all running agents)"),
        dry_run: bool = typer.Option(False, "--dry-run", help="Show what would be compacted without triggering"),
        all_agents: bool = typer.Option(False, "--all", help="Compact all running agents above threshold"),
        daemon: bool = typer.Option(False, "--daemon", help="Start background auto-compaction daemon"),
        interval: int = typer.Option(30, "--interval", help="Daemon polling interval in seconds"),
        history: bool = typer.Option(False, "--history", help="Show recent compaction events"),
    ):
        """Trigger context compaction for one or all running agents (Issue #20)."""
        if daemon:
            from ..compaction import start_daemon
            d = start_daemon(interval=interval)
            console.print(f"[green]Auto-compaction daemon started (interval={interval}s)[/green]")
            console.print("[dim]Daemon runs in background — monitoring all running agents.[/dim]")
            return

        if history:
            from ..compaction import get_compaction_history
            events = get_compaction_history(limit=30)
            if not events:
                console.print("[dim]No compaction events recorded yet.[/dim]")
                return
            for evt in events:
                ts = time.strftime("%H:%M:%S", time.localtime(evt["timestamp"]))
                console.print(f"  [{ts}] {evt.get('agent', '?')}  {evt.get('action', '?')}  {evt.get('pct', 0):.1f}%")
            return

        from ..context_tracker import get_context_status, should_compact, trigger_compaction, HEALTH_ICONS
        from ..state import list_agents, get_agent

        targets: list[str] = []
        if name:
            targets = [name]
        else:
            targets = [r.name for r in list_agents() if r.status == "running"]

        if not targets:
            console.print("[yellow]No running agents found.[/yellow]")
            raise typer.Exit(0)

        for agent_name in targets:
            rec = get_agent(agent_name)
            if rec is None:
                console.print(f"[red]Agent '{agent_name}' not found.[/red]")
                continue
            if rec.status != "running":
                console.print(f"[dim]{agent_name}: not running (status={rec.status})[/dim]")
                continue

            ctx = get_context_status(agent_name, rec.tmux_window)
            icon = HEALTH_ICONS.get(ctx["health"], "○")
            pct = ctx["pct"]
            tokens = ctx["tokens"]

            if dry_run:
                would = "WOULD compact" if should_compact(agent_name, pct) else "would NOT compact"
                console.print(f"  {icon} [cyan]{agent_name}[/cyan]  {pct:.1f}% ({tokens:,} tokens)  → {would}")
                continue

            if all_agents or name:
                if name:
                    trigger_compaction(agent_name, rec.tmux_window)
                    console.print(f"  {icon} [green]✓[/green] [cyan]{agent_name}[/cyan]  /compact sent ({pct:.1f}%)")
                elif should_compact(agent_name, pct):
                    trigger_compaction(agent_name, rec.tmux_window)
                    console.print(f"  {icon} [green]✓[/green] [cyan]{agent_name}[/cyan]  /compact sent ({pct:.1f}%)")
                else:
                    console.print(f"  {icon} [dim]{agent_name}[/dim]  {pct:.1f}% — below threshold, skipped")

    @app.command()
    def mcp(
        host: str = typer.Option("127.0.0.1", "--host", help="Host to bind the MCP server to"),
        port: int = typer.Option(0, "--port", help="Port (0 = stdio transport, default for MCP)"),
    ):
        """Start the Open Agents MCP server (stdio transport for Claude Code integration)."""
        try:
            from ..mcp_server import main as mcp_main
        except ImportError:
            console.print("[red]MCP package not installed. Run: pip install mcp>=1.0[/red]")
            raise typer.Exit(1)
        console.print("[green]Starting Open Agents MCP server...[/green]")
        mcp_main()
