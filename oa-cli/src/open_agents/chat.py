"""Interactive chat mode for the Open Agents CLI."""

from __future__ import annotations

import hashlib
import subprocess
import time
from pathlib import Path

from prompt_toolkit import PromptSession
from prompt_toolkit.history import FileHistory
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.spinner import Spinner

from . import __version__
from .monitor import render_status_table
from .orchestrator import check_agent, kill_agent, session_exists, spawn_agent, start_session
from .state import get_agent, list_agents
from .workspace import read_output


def _generate_name(task: str) -> str:
    """Generate a short deterministic name from the task text."""
    h = hashlib.md5(f"{task}{time.time()}".encode()).hexdigest()[:6]
    word = "".join(c for c in task.split()[0] if c.isalnum()).lower()[:10] if task.strip() else "agent"
    return f"{word}-{h}"


class ChatSession:
    """Interactive REPL session for spawning and monitoring agents."""

    def __init__(self) -> None:
        self.console = Console()
        history_dir = Path.home() / ".oa"
        history_dir.mkdir(parents=True, exist_ok=True)
        self.prompt_session: PromptSession = PromptSession(
            history=FileHistory(str(history_dir / "chat_history"))
        )

    def start(self) -> None:
        """Show welcome and enter the prompt loop."""
        self._show_welcome()
        while True:
            try:
                text = self.prompt_session.prompt("oa> ").strip()
            except (EOFError, KeyboardInterrupt):
                self.console.print("\n[dim]Bye![/dim]")
                break

            if not text:
                continue

            if text.startswith("/"):
                should_quit = self._handle_slash(text)
                if should_quit:
                    break
            else:
                self._handle_task(text)

    def _show_welcome(self) -> None:
        """Print a Rich welcome panel with version, tips, and examples."""
        content = (
            f"[bold cyan]Open Agents v{__version__}[/bold cyan]\n\n"
            "[dim]Type a task to spawn an agent, or use a slash command:[/dim]\n\n"
            "  [green]/status[/green]            — show all agents in a table\n"
            "  [green]/agents[/green]            — list registered agent names\n"
            "  [green]/web[/green]               — start the web UI bridge\n"
            "  [green]/kill <name>[/green]       — kill a running agent\n"
            "  [green]/collect <name>[/green]    — show output of a finished agent\n"
            "  [green]/help[/green]              — show this help again\n"
            "  [green]/quit[/green]  [green]/exit[/green]       — leave chat mode\n\n"
            "[dim]Examples:[/dim]\n"
            "  [italic]Build a Python web scraper for Hacker News[/italic]\n"
            "  [italic]Write unit tests for src/utils.py[/italic]\n"
            "  [italic]Refactor the authentication module[/italic]"
        )
        self.console.print(
            Panel(content, title="[bold]Open Agents — Chat Mode[/bold]", border_style="cyan")
        )

    def _handle_task(self, text: str) -> None:
        """Spawn an agent for the given task and poll until done."""
        if not session_exists():
            self.console.print("[yellow]No oa session — starting one...[/yellow]")
            start_session()

        name = _generate_name(text)
        self.console.print(f"[dim]Spawning agent [bold]{name}[/bold]...[/dim]")

        try:
            rec = spawn_agent(name, text)
        except RuntimeError as e:
            self.console.print(f"[red]Error: {e}[/red]")
            return

        model_label = (
            f"[cyan]{rec.model}[/cyan]" if rec.model == "claude"
            else f"[magenta]{rec.model}[/magenta]"
        )
        self.console.print(f"[green]Agent '{name}' spawned[/green]  ({model_label})")
        self.console.print(f"  Task:      {rec.task}")
        self.console.print(f"  Workspace: {rec.workspace}")
        self.console.print(f"  [dim]Polling every 3s... (Ctrl-C to stop waiting and return to prompt)[/dim]")

        status = "running"
        try:
            with Live(
                Spinner("dots", text=f"Waiting for '{name}'..."),
                refresh_per_second=4,
                console=self.console,
            ) as live:
                while True:
                    time.sleep(3)
                    status = check_agent(name) or "unknown"
                    live.update(Spinner("dots", text=f"Agent '{name}' — {status}"))
                    if status not in ("running",):
                        break
        except KeyboardInterrupt:
            self.console.print(
                f"\n[yellow]Stopped waiting. Agent '{name}' continues in the background.[/yellow]"
            )
            self.console.print(f"  Use [bold]/collect {name}[/bold] to view results later.")
            return

        updated = get_agent(name)
        if status == "done":
            self._on_done(updated)
        else:
            self._on_error(updated, status)

    def _handle_slash(self, text: str) -> bool:
        """Dispatch a slash command. Returns True when the session should quit."""
        parts = text.split(maxsplit=1)
        cmd = parts[0].lower()
        arg = parts[1].strip() if len(parts) > 1 else ""

        if cmd in ("/quit", "/exit"):
            self.console.print("[dim]Bye![/dim]")
            return True

        elif cmd == "/status":
            table = render_status_table()
            if table.row_count == 0:
                self.console.print("[dim]No agents registered.[/dim]")
            else:
                self.console.print(table)

        elif cmd == "/agents":
            agents = list_agents()
            if not agents:
                self.console.print("[dim]No agents registered.[/dim]")
            else:
                for a in agents:
                    color = {
                        "running": "bright_cyan",
                        "done": "bright_green",
                        "error": "bright_red",
                        "killed": "bright_red",
                        "timeout": "bright_yellow",
                    }.get(a.status, "white")
                    task_preview = a.task[:60] + ("..." if len(a.task) > 60 else "")
                    self.console.print(
                        f"  [bold]{a.name}[/bold]  [{color}]{a.status}[/{color}]  {task_preview}"
                    )

        elif cmd == "/web":
            self.console.print("[cyan]Starting web bridge in background...[/cyan]")
            subprocess.Popen(
                ["oa", "web"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self.console.print("[green]Bridge started at http://localhost:5174[/green]")

        elif cmd == "/kill":
            if not arg:
                self.console.print("[red]Usage: /kill <name>[/red]")
            else:
                success = kill_agent(arg)
                if success:
                    self.console.print(f"[yellow]Agent '{arg}' killed.[/yellow]")
                else:
                    self.console.print(f"[red]Agent '{arg}' not found.[/red]")

        elif cmd == "/collect":
            if not arg:
                self.console.print("[red]Usage: /collect <name>[/red]")
            else:
                rec = get_agent(arg)
                if rec is None:
                    self.console.print(f"[red]Agent '{arg}' not found.[/red]")
                else:
                    output = read_output(rec.workspace)
                    if output:
                        lines = output.splitlines()
                        display = "\n".join(lines[:50])
                        self.console.print(f"\n[bold]Output from '{arg}':[/bold]\n")
                        self.console.print(display)
                        if len(lines) > 50:
                            self.console.print(
                                f"[dim]... ({len(lines) - 50} more lines)[/dim]"
                            )
                    else:
                        self.console.print(f"[yellow]No output found for '{arg}'.[/yellow]")

        elif cmd == "/help":
            self._show_welcome()

        else:
            self.console.print(f"[red]Unknown command: {cmd}[/red]  Try /help")

        return False

    def _on_done(self, rec) -> None:
        """Display result when an agent completes successfully."""
        if rec is None:
            return
        self.console.print(f"\n[bold green]Agent '{rec.name}' completed![/bold green]")
        output = read_output(rec.workspace)
        if output:
            lines = output.splitlines()
            display = "\n".join(lines[:50])
            self.console.print(
                f"\n[bold]Result (first {min(50, len(lines))} lines):[/bold]\n"
            )
            self.console.print(display)
            if len(lines) > 50:
                self.console.print(
                    f"\n[dim]... ({len(lines) - 50} more lines — use /collect {rec.name})[/dim]"
                )
        else:
            self.console.print(
                f"[yellow]No output.md found in workspace: {rec.workspace}[/yellow]"
            )
            self.console.print(
                f"[dim]Use 'oa review {rec.name}' to check proposals.[/dim]"
            )

    def _on_error(self, rec, status: str) -> None:
        """Display an error message when an agent ends abnormally."""
        if rec is None:
            return
        self.console.print(
            f"\n[bold red]Agent '{rec.name}' ended with status: {status}[/bold red]"
        )
        output = read_output(rec.workspace)
        if output:
            lines = output.splitlines()
            self.console.print("\n".join(lines[:20]))
            if len(lines) > 20:
                self.console.print(f"[dim]... ({len(lines) - 20} more lines)[/dim]")
        else:
            self.console.print(f"[dim]No output found in workspace: {rec.workspace}[/dim]")
