"""Messaging commands: send, inbox, broadcast, watch-inbox, shutdown-request, shutdown."""

from __future__ import annotations

import time

import typer
from rich.console import Console

from ..lifecycle import kill_agent
from ..messaging import broadcast_message, mark_read, poll_shutdown_response, read_inbox, send_message, shutdown_request
from ..state import get_agent

console = Console()


def register_commands(app: typer.Typer) -> None:
    """Register all messaging-related commands on the app."""

    @app.command()
    def send(
        to: str = typer.Argument(..., help="Recipient agent name"),
        message: str = typer.Argument(..., help="Message content"),
        sender: str = typer.Option("user", "--from", "-f", help="Sender name (default: 'user')"),
    ):
        """Send a message to an agent."""
        path = send_message(sender, to, message)
        console.print(f"[green]Message sent[/green] {sender} -> {to}")

    @app.command()
    def inbox(
        name: str = typer.Argument(..., help="Agent name to check inbox for"),
        unread: bool = typer.Option(False, "--unread", "-u", help="Show only unread messages"),
        mark: bool = typer.Option(False, "--mark-read", help="Mark all messages as read after showing"),
    ):
        """Check an agent's message inbox."""
        from rich.table import Table
        from datetime import datetime

        messages = read_inbox(name, unread_only=unread)

        if not messages:
            console.print(f"[dim]No {'unread ' if unread else ''}messages for '{name}'.[/dim]")
            return

        table = Table(title=f"Inbox: {name} ({len(messages)} messages)")
        table.add_column("From", style="cyan")
        table.add_column("Time", style="dim")
        table.add_column("Message", max_width=60)
        table.add_column("Read", style="dim")

        for msg in messages:
            ts = datetime.fromtimestamp(msg.get("timestamp", 0)).strftime("%H:%M:%S")
            is_broadcast = msg.get("_broadcast") or msg.get("metadata", {}).get("broadcast")
            sender = msg.get("from", "?")
            if is_broadcast:
                sender = f"{sender} [broadcast]"
            read_mark = "yes" if msg.get("read") else "[bold yellow]NEW[/bold yellow]"
            content = msg.get("content", "")
            if len(content) > 60:
                content = content[:57] + "..."
            table.add_row(sender, ts, content, read_mark)

        console.print(table)

        if mark:
            count = mark_read(name)
            if count:
                console.print(f"[green]Marked {count} messages as read.[/green]")

    @app.command()
    def broadcast(
        message: str = typer.Argument(..., help="Message to broadcast to all running agents"),
        sender: str = typer.Option("user", "--from", "-f", help="Sender name (default: 'user')"),
    ):
        """Broadcast a message to all running agents."""
        paths = broadcast_message(sender, message)
        console.print(f"[green]Broadcast sent to {len(paths) - 1} agent(s)[/green]")

    @app.command(name="watch-inbox")
    def watch_inbox(
        name: str = typer.Argument("meta", help="Inbox naam om te monitoren"),
        follow: bool = typer.Option(True, "--follow/--no-follow", "-f/-F", help="Blijf pollen voor nieuwe berichten"),
    ):
        """Watch inbox real-time voor binnenkomende berichten."""
        from datetime import datetime
        from ..notification import notify_tmux

        seen_timestamps: set[float] = set()

        console.print(f"[bold]Watching inbox: {name}[/bold] (Ctrl+C to stop)\n")

        try:
            while True:
                messages = read_inbox(name, unread_only=True)
                for msg in reversed(messages):
                    ts = msg.get("timestamp", 0)
                    if ts in seen_timestamps:
                        continue
                    seen_timestamps.add(ts)

                    sender = msg.get("from", "unknown")
                    content = msg.get("content", "")
                    time_str = datetime.fromtimestamp(ts).strftime("%H:%M:%S")

                    if content.startswith("\u274c") or content.startswith("\U0001f534"):
                        style = "red"
                    elif content.startswith("\u2705") or content.startswith("\U0001f680"):
                        style = "green"
                    else:
                        style = "white"

                    console.print(f"[dim]{time_str}[/dim] [cyan]{sender}[/cyan] [{style}]{content}[/{style}]")
                    notify_tmux(content, sender)

                if not follow:
                    break
                time.sleep(2)
        except KeyboardInterrupt:
            console.print("\n[dim]Stopped watching.[/dim]")

    @app.command(name="shutdown-request")
    def shutdown_request_cmd(
        name: str = typer.Argument(..., help="Agent name to send shutdown request to"),
        sender: str = typer.Option("user", "--from", "-f", help="Sender name"),
    ):
        """Send a graceful shutdown request to an agent."""
        path = shutdown_request(name, sender=sender)
        console.print(f"[yellow]Shutdown request sent to '{name}'.[/yellow]")

    @app.command()
    def shutdown(
        name: str = typer.Argument(..., help="Agent name to shut down"),
        force: bool = typer.Option(False, "--force", help="Skip graceful protocol; kill immediately"),
        timeout: int = typer.Option(30, "--timeout", "-t", help="Seconds to wait for agent response (default: 30)"),
        sender: str = typer.Option("user", "--from", "-f", help="Sender name"),
    ):
        """Gracefully shut down an agent with approve/reject and timeout."""
        rec = get_agent(name)
        if rec is None:
            console.print(f"[red]Agent '{name}' not found.[/red]")
            raise typer.Exit(1)

        if force:
            console.print(f"[yellow]--force: killing '{name}' immediately.[/yellow]")
            kill_agent(name)
            console.print(f"[red]Agent '{name}' killed.[/red]")
            return

        console.print(f"[yellow]Sending shutdown request to '{name}'...[/yellow]")
        shutdown_request(name, sender=sender)
        console.print(f"[dim]Waiting up to {timeout}s for response...[/dim]")

        response = poll_shutdown_response(name, timeout=float(timeout))

        if response == "approve":
            console.print(f"[green]Agent '{name}' approved shutdown. Waiting for it to exit...[/green]")
            deadline = time.time() + 10
            while time.time() < deadline:
                current = get_agent(name)
                if current is None or current.status in ("done", "error"):
                    break
                time.sleep(1)
            kill_agent(name)
            console.print(f"[green]Agent '{name}' shut down gracefully.[/green]")
        elif response == "reject":
            console.print(f"[red]Agent '{name}' rejected shutdown. Use --force to override.[/red]")
            raise typer.Exit(1)
        else:
            console.print(f"[yellow]No response from '{name}' after {timeout}s. Force-killing.[/yellow]")
            kill_agent(name)
            console.print(f"[red]Agent '{name}' force-killed after timeout.[/red]")
