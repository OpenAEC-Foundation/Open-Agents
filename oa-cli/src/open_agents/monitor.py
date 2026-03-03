"""Monitor — rich status display for agent overview."""

from __future__ import annotations

from rich.console import Console
from rich.table import Table

from .state import AgentRecord, list_agents
from .utils import format_duration

console = Console()

STATUS_COLORS = {
    "running": "bold bright_cyan",
    "done": "bold bright_green",
    "error": "bold bright_red",
    "timeout": "bold bright_yellow",
    "killed": "bold bright_red",
}


def _build_hierarchy(agents: list[AgentRecord]) -> list[tuple[AgentRecord, int]]:
    """Build a flat list with indentation levels for parent/child display.

    Returns [(record, depth), ...] sorted: parents first, then children underneath.
    Supports unlimited depth via recursive traversal.
    """
    children_of: dict[str, list[AgentRecord]] = {}
    roots: list[AgentRecord] = []
    agent_names = {r.name for r in agents}

    for r in agents:
        p = getattr(r, "parent", None)
        if p and p in agent_names:
            children_of.setdefault(p, []).append(r)
        else:
            roots.append(r)

    result: list[tuple[AgentRecord, int]] = []

    def _walk(node: AgentRecord, depth: int) -> None:
        result.append((node, depth))
        for child in sorted(children_of.get(node.name, []), key=lambda r: r.created_at):
            _walk(child, depth + 1)

    for root in sorted(roots, key=lambda r: r.created_at):
        _walk(root, 0)

    return result


def render_status_table(agents: list[AgentRecord] | None = None) -> Table:
    """Build a rich Table with current agent statuses, showing hierarchy."""
    if agents is None:
        agents = list_agents()

    table = Table(title="Open Agents", show_lines=True)
    table.add_column("Name", style="bold")
    table.add_column("Model")
    table.add_column("Status")
    table.add_column("Task", max_width=50)
    table.add_column("Duration", justify="right")
    table.add_column("Workspace", style="bright_black")

    hierarchy = _build_hierarchy(agents)

    for rec, depth in hierarchy:
        style = STATUS_COLORS.get(rec.status, "white")
        duration = format_duration(rec.created_at, rec.finished_at)
        # Truncate workspace path for readability
        ws_short = rec.workspace
        if len(ws_short) > 40:
            ws_short = "..." + ws_short[-37:]

        model_str = getattr(rec, "model", "claude")
        if "opus" in model_str:
            model_style = "bold bright_cyan"
        elif "sonnet" in model_str:
            model_style = "bright_cyan"
        elif "haiku" in model_str:
            model_style = "bright_green"
        elif model_str == "claude":
            model_style = "bold bright_cyan"
        else:
            model_style = "bright_magenta"

        # Indent children with tree characters (multi-level)
        if depth == 0:
            prefix = ""
        else:
            prefix = "  " * (depth - 1) + "└─ "
        name_display = f"{prefix}{rec.name}"

        table.add_row(
            name_display,
            f"[{model_style}]{model_str}[/{model_style}]",
            f"[{style}]{rec.status}[/{style}]",
            rec.task[:50] + ("..." if len(rec.task) > 50 else ""),
            duration,
            ws_short,
        )

    return table


def print_status() -> None:
    """Print the agent status table to console."""
    from .lifecycle import check_agent

    agents = list_agents()

    # Refresh status for running agents
    for rec in agents:
        if rec.status == "running":
            check_agent(rec.name)

    # Reload after potential updates
    agents = list_agents()

    if not agents:
        console.print("[bright_black]No agents registered. Use 'oa run' to start one.[/bright_black]")
        return

    table = render_status_table(agents)
    console.print(table)
