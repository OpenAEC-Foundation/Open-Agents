"""Monitor — rich status display for agent overview."""

from __future__ import annotations

import time

from rich.console import Console
from rich.table import Table

from .state import AgentRecord, list_agents

console = Console()

STATUS_COLORS = {
    "running": "bold cyan",
    "done": "bold green",
    "error": "bold red",
    "timeout": "bold yellow",
    "killed": "dim",
}


def _format_duration(start: float, end: float | None = None) -> str:
    """Format elapsed time as human-readable string."""
    elapsed = (end or time.time()) - start
    if elapsed < 60:
        return f"{elapsed:.0f}s"
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)
    if minutes < 60:
        return f"{minutes}m {seconds}s"
    hours = int(minutes // 60)
    minutes = minutes % 60
    return f"{hours}h {minutes}m"


def render_status_table(agents: list[AgentRecord] | None = None) -> Table:
    """Build a rich Table with current agent statuses."""
    if agents is None:
        agents = list_agents()

    table = Table(title="Open Agents", show_lines=True)
    table.add_column("Name", style="bold")
    table.add_column("Model")
    table.add_column("Status")
    table.add_column("Task", max_width=50)
    table.add_column("Duration", justify="right")
    table.add_column("Workspace", style="dim")

    for rec in sorted(agents, key=lambda r: r.created_at):
        style = STATUS_COLORS.get(rec.status, "")
        duration = _format_duration(rec.created_at, rec.finished_at)
        # Truncate workspace path for readability
        ws_short = rec.workspace
        if len(ws_short) > 40:
            ws_short = "..." + ws_short[-37:]

        model_str = getattr(rec, "model", "claude")
        model_style = "cyan" if model_str == "claude" else "magenta"

        table.add_row(
            rec.name,
            f"[{model_style}]{model_str}[/{model_style}]",
            f"[{style}]{rec.status}[/{style}]",
            rec.task[:50] + ("..." if len(rec.task) > 50 else ""),
            duration,
            ws_short,
        )

    return table


def print_status() -> None:
    """Print the agent status table to console."""
    from .orchestrator import check_agent

    agents = list_agents()

    # Refresh status for running agents
    for rec in agents:
        if rec.status == "running":
            check_agent(rec.name)

    # Reload after potential updates
    agents = list_agents()

    if not agents:
        console.print("[dim]No agents registered. Use 'oa run' to start one.[/dim]")
        return

    table = render_status_table(agents)
    console.print(table)
