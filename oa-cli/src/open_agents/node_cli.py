"""Node CLI — Click-based command group for managing persistent node agents.

Each node runs node_daemon.py in a dedicated tmux window and communicates via
JSON protocol messages written to ~/.oa/nodes/<name>/inbox/<uuid>.msg.

Board questions are written to ~/.oa/board/<category>/<uuid>.question.

Usage (standalone):
    python -m open_agents.node_cli [COMMAND]

Or registered as a Click group on an existing CLI:
    from open_agents.node_cli import node
    cli.add_command(node)
"""

from __future__ import annotations

import json
import subprocess
import time
import uuid
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

console = Console()

NODES_DIR = Path.home() / ".oa" / "nodes"
BOARD_DIR = Path.home() / ".oa" / "board"


def _node_dir(name: str) -> Path:
    return NODES_DIR / name


def _inbox_dir(name: str) -> Path:
    return _node_dir(name) / "inbox"


def _tmux_window_name(name: str) -> str:
    return f"node-{name}"


def _is_running(name: str) -> bool:
    """Check if a tmux window for this node exists."""
    result = subprocess.run(
        ["tmux", "list-windows", "-a", "-F", "#{window_name}"],
        capture_output=True,
        text=True,
    )
    window = _tmux_window_name(name)
    return window in result.stdout.splitlines()


def _find_daemon() -> str:
    """Locate node_daemon.py — checks alongside this file first."""
    here = Path(__file__).parent
    candidate = here / "node_daemon.py"
    if candidate.exists():
        return str(candidate)
    return "node_daemon.py"


@click.group(name="node", help="Manage persistent node agents.")
def node() -> None:
    """Node command group — start, stop, send, connect, and manage board."""


@node.command("start")
@click.argument("name")
@click.option("--system", default="", help="System prompt for the node")
@click.option("--category", default="", help="Board category this node subscribes to")
@click.option("--remote", default="", help="Remote SSH host to run the node on")
def start(name: str, system: str, category: str, remote: str) -> None:
    """Start a node in a new tmux window."""
    if _is_running(name):
        console.print(f"[yellow]Node '{name}' is already running.[/yellow]")
        raise SystemExit(1)

    node_dir = _node_dir(name)
    node_dir.mkdir(parents=True, exist_ok=True)
    _inbox_dir(name).mkdir(parents=True, exist_ok=True)

    daemon = _find_daemon()
    cmd_parts = ["python3", daemon, "--name", name]
    if system:
        cmd_parts += ["--system", system]
    if category:
        cmd_parts += ["--category", category]

    window = _tmux_window_name(name)

    if remote:
        remote_cmd = " ".join(cmd_parts)
        tmux_cmd = [
            "tmux", "new-window", "-t", "oa:", "-n", window,
            "--", "ssh", remote, remote_cmd,
        ]
    else:
        tmux_cmd = ["tmux", "new-window", "-t", "oa:", "-n", window, "--"] + cmd_parts

    result = subprocess.run(tmux_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        console.print(f"[red]Failed to start node '{name}':[/red] {result.stderr.strip()}")
        raise SystemExit(1)

    console.print(f"[green]Node '{name}' started[/green] in tmux window '{window}'.")
    if category:
        console.print(f"  Subscribed to board category: [cyan]{category}[/cyan]")


@node.command("stop")
@click.argument("name")
def stop(name: str) -> None:
    """Stop a running node by killing its tmux window."""
    if not _is_running(name):
        console.print(f"[yellow]Node '{name}' is not running.[/yellow]")
        raise SystemExit(1)

    window = _tmux_window_name(name)
    result = subprocess.run(
        ["tmux", "kill-window", "-t", window],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        console.print(f"[red]Failed to stop node '{name}':[/red] {result.stderr.strip()}")
        raise SystemExit(1)

    console.print(f"[green]Node '{name}' stopped.[/green]")


@node.command("send")
@click.argument("name")
@click.argument("message")
@click.option("--from", "sender", default="user", help="Sender name")
def send_msg(name: str, message: str, sender: str) -> None:
    """Send a JSON protocol message to a node's inbox."""
    inbox = _inbox_dir(name)
    inbox.mkdir(parents=True, exist_ok=True)

    msg_id = str(uuid.uuid4())
    msg = {
        "id": msg_id,
        "from": sender,
        "to": name,
        "content": message,
        "timestamp": int(time.time() * 1000),
    }
    msg_file = inbox / f"{msg_id}.msg"
    msg_file.write_text(json.dumps(msg, indent=2))

    console.print(f"[green]Message sent[/green] {sender} -> {name} (id: {msg_id[:8]}...)")


@node.command("connect")
@click.argument("node_a")
@click.argument("node_b")
def connect(node_a: str, node_b: str) -> None:
    """Connect two nodes bidirectionally."""

    def _add_connection(src: str, dst: str) -> None:
        src_dir = _node_dir(src)
        src_dir.mkdir(parents=True, exist_ok=True)
        conn_file = src_dir / "connections.json"

        connections: list[str] = json.loads(conn_file.read_text()) if conn_file.exists() else []
        if dst not in connections:
            connections.append(dst)
            conn_file.write_text(json.dumps(connections, indent=2))

    _add_connection(node_a, node_b)
    _add_connection(node_b, node_a)

    console.print(f"[green]Connected[/green] '{node_a}' <-> '{node_b}'.")


@node.group("board", help="Manage the shared question board.")
def board() -> None:
    """Board subgroup — post questions and list open questions."""


@board.command("post")
@click.argument("category")
@click.argument("question")
@click.option("--from", "sender", default="user", help="Sender name")
def board_post(category: str, question: str, sender: str) -> None:
    """Post a question to the board in the given category.

    Writes JSON to ~/.oa/board/<category>/<uuid>.question
    """
    category_dir = BOARD_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)

    question_id = str(uuid.uuid4())
    entry = {
        "id": question_id,
        "from": sender,
        "category": category,
        "question": question,
        "timestamp": int(time.time() * 1000),
        "answered": False,
    }
    question_file = category_dir / f"{question_id}.question"
    question_file.write_text(json.dumps(entry, indent=2))

    console.print(
        f"[green]Question posted[/green] to board/{category} (id: {question_id[:8]}...)"
    )
    console.print(f"  From: [cyan]{sender}[/cyan]")
    console.print(f"  Q: {question}")


@board.command("list")
@click.option("--category", default="", help="Filter by category (default: all)")
def board_list(category: str) -> None:
    """List open questions on the board."""
    if not BOARD_DIR.exists():
        console.print("[dim]Board is empty.[/dim]")
        return

    categories = (
        [BOARD_DIR / category]
        if category
        else [d for d in sorted(BOARD_DIR.iterdir()) if d.is_dir()]
    )

    table = Table(title="Board Questions")
    table.add_column("Category", style="cyan")
    table.add_column("ID", style="dim")
    table.add_column("From")
    table.add_column("Question")
    table.add_column("Answered")

    found = 0
    for cat_dir in categories:
        if not cat_dir.is_dir():
            continue
        for qfile in sorted(cat_dir.glob("*.question")):
            try:
                entry = json.loads(qfile.read_text())
            except json.JSONDecodeError:
                continue
            answered = "[green]yes[/green]" if entry.get("answered") else "[red]no[/red]"
            table.add_row(
                entry.get("category", cat_dir.name),
                entry.get("id", "?")[:8],
                entry.get("from", "?"),
                entry.get("question", "")[:60],
                answered,
            )
            found += 1

    if found == 0:
        console.print("[dim]No questions found.[/dim]")
        return

    console.print(table)


@node.command("status")
def status() -> None:
    """Show status of all nodes."""
    if not NODES_DIR.exists():
        console.print("[dim]No nodes found.[/dim]")
        return

    node_dirs = [d for d in NODES_DIR.iterdir() if d.is_dir()]
    if not node_dirs:
        console.print("[dim]No nodes found.[/dim]")
        return

    table = Table(title="Node Status")
    table.add_column("Name", style="cyan")
    table.add_column("Status")
    table.add_column("Connections", style="dim")
    table.add_column("Inbox")

    for d in sorted(node_dirs):
        name = d.name
        running = _is_running(name)
        state = "[green]running[/green]" if running else "[red]stopped[/red]"

        conn_file = d / "connections.json"
        if conn_file.exists():
            try:
                conns = json.loads(conn_file.read_text())
                conn_str = ", ".join(conns) if conns else "none"
            except json.JSONDecodeError:
                conn_str = "?"
        else:
            conn_str = "none"

        inbox = d / "inbox"
        inbox_count = len(list(inbox.glob("*.msg"))) if inbox.exists() else 0
        inbox_str = str(inbox_count)

        table.add_row(name, state, conn_str, inbox_str)

    console.print(table)


@node.command("history")
@click.argument("name")
def history(name: str) -> None:
    """Print conversation history of a node."""
    from datetime import datetime

    history_file = _node_dir(name) / "history.json"

    if not history_file.exists():
        console.print(f"[dim]No history found for node '{name}'.[/dim]")
        return

    try:
        entries: list[dict] = json.loads(history_file.read_text())
    except json.JSONDecodeError:
        console.print(f"[red]History file for '{name}' is corrupted.[/red]")
        return

    if not entries:
        console.print(f"[dim]History for '{name}' is empty.[/dim]")
        return

    console.print(f"\n[bold]Conversation history: {name}[/bold]\n")
    for entry in entries:
        ts = entry.get("timestamp", 0)
        role = entry.get("role", entry.get("from", "?"))
        content = entry.get("content", "")
        time_str = (
            datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M:%S")
            if ts
            else "?"
        )

        style = "cyan" if role in ("user", "human") else "green" if role == "assistant" else "dim"
        console.print(f"[dim]{time_str}[/dim] [{style}]{role}[/{style}]")
        console.print(f"  {content}\n")


if __name__ == "__main__":
    node()
