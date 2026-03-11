"""Monitor — rich status display for agent overview."""

from __future__ import annotations

from rich.console import Console
from rich.table import Table

from .messaging import unread_count
from .state import AgentRecord, list_agents
from .utils import format_duration, format_model_label, format_model_rich, model_rich_color

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
    table.add_column("Msgs", justify="center")
    table.add_column("Task", max_width=50)
    table.add_column("Duration", justify="right")

    hierarchy = _build_hierarchy(agents)

    for rec, depth in hierarchy:
        style = STATUS_COLORS.get(rec.status, "white")
        duration = format_duration(rec.created_at, rec.finished_at)
        # Truncate workspace path for readability
        ws_short = rec.workspace
        if len(ws_short) > 40:
            ws_short = "..." + ws_short[-37:]

        model_str = getattr(rec, "model", "claude")
        model_label = format_model_label(model_str)
        model_style = model_rich_color(model_str)

        # Indent children with tree characters (multi-level)
        if depth == 0:
            prefix = ""
        else:
            prefix = "  " * (depth - 1) + "└─ "
        name_display = f"{prefix}{rec.name}"

        # Unread message count
        unreads = unread_count(rec.name)
        msg_display = f"[bold yellow]{unreads}[/bold yellow]" if unreads > 0 else "[dim]0[/dim]"

        table.add_row(
            name_display,
            f"[{model_style}]{model_label}[/{model_style}]",
            f"[{style}]{rec.status}[/{style}]",
            msg_display,
            rec.task[:50] + ("..." if len(rec.task) > 50 else ""),
            duration,
        )

    return table


def render_status_table_verbose(agents: list[AgentRecord] | None = None) -> Table:
    """Build a rich Table with current agent statuses plus CPU/memory columns."""
    from .diagnostics import get_agent_resource_usage

    if agents is None:
        agents = list_agents()

    table = Table(title="Open Agents (verbose)", show_lines=True)
    table.add_column("Name", style="bold")
    table.add_column("Model")
    table.add_column("Status")
    table.add_column("Msgs", justify="center")
    table.add_column("Task", max_width=50)
    table.add_column("Duration", justify="right")
    table.add_column("CPU%", justify="right")
    table.add_column("Mem MB", justify="right")
    table.add_column("Threads", justify="right")

    hierarchy = _build_hierarchy(agents)

    for rec, depth in hierarchy:
        style = STATUS_COLORS.get(rec.status, "white")
        duration = format_duration(rec.created_at, rec.finished_at)

        model_str = getattr(rec, "model", "claude")
        model_label = format_model_label(model_str)
        model_style = model_rich_color(model_str)

        if depth == 0:
            prefix = ""
        else:
            prefix = "  " * (depth - 1) + "└─ "
        name_display = f"{prefix}{rec.name}"

        unreads = unread_count(rec.name)
        msg_display = f"[bold yellow]{unreads}[/bold yellow]" if unreads > 0 else "[dim]0[/dim]"

        # Resource usage via psutil (only for running agents with a known PID)
        pid = getattr(rec, "pid", None)
        if rec.status == "running" and pid is not None:
            usage = get_agent_resource_usage(pid)
            cpu_str = f"{usage['cpu_percent']}%" if usage else "[dim]—[/dim]"
            mem_str = f"{usage['memory_mb']}" if usage else "[dim]—[/dim]"
            thr_str = str(usage["num_threads"]) if usage else "[dim]—[/dim]"
        else:
            cpu_str = "[dim]—[/dim]"
            mem_str = "[dim]—[/dim]"
            thr_str = "[dim]—[/dim]"

        table.add_row(
            name_display,
            f"[{model_style}]{model_label}[/{model_style}]",
            f"[{style}]{rec.status}[/{style}]",
            msg_display,
            rec.task[:50] + ("..." if len(rec.task) > 50 else ""),
            duration,
            cpu_str,
            mem_str,
            thr_str,
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


def print_status_verbose() -> None:
    """Print the agent status table with CPU/memory columns to console."""
    from .lifecycle import check_agent

    agents = list_agents()

    for rec in agents:
        if rec.status == "running":
            check_agent(rec.name)

    agents = list_agents()

    if not agents:
        console.print("[bright_black]No agents registered. Use 'oa run' to start one.[/bright_black]")
        return

    table = render_status_table_verbose(agents)
    console.print(table)


def render_status_table_with_context(agents: list[AgentRecord] | None = None) -> Table:
    """Build a rich Table with current agent statuses plus context window columns."""
    from .context_tracker import get_context_status, HEALTH_ICONS

    if agents is None:
        agents = list_agents()

    table = Table(title="Open Agents", show_lines=True)
    table.add_column("Name", style="bold")
    table.add_column("Model")
    table.add_column("Status")
    table.add_column("Msgs", justify="center")
    table.add_column("Task", max_width=50)
    table.add_column("Duration", justify="right")
    table.add_column("Tokens", justify="right")
    table.add_column("Window%", justify="right")
    table.add_column("Health", justify="center")

    hierarchy = _build_hierarchy(agents)

    for rec, depth in hierarchy:
        style = STATUS_COLORS.get(rec.status, "white")
        duration = format_duration(rec.created_at, rec.finished_at)

        model_str = getattr(rec, "model", "claude")
        model_label = format_model_label(model_str)
        model_style = model_rich_color(model_str)

        if depth == 0:
            prefix = ""
        else:
            prefix = "  " * (depth - 1) + "└─ "
        name_display = f"{prefix}{rec.name}"

        unreads = unread_count(rec.name)
        msg_display = f"[bold yellow]{unreads}[/bold yellow]" if unreads > 0 else "[dim]0[/dim]"

        # Context window data (only meaningful for running agents)
        if rec.status == "running":
            ctx = get_context_status(rec.name, rec.tmux_window)
            tokens_str = f"{ctx['tokens']:,}"
            pct_str = f"{ctx['pct']}%"
            health_icon = HEALTH_ICONS.get(ctx["health"], "?")
            trend = ctx["trend"]
            health_display = f"{health_icon} {trend}"
        else:
            tokens_str = "[dim]—[/dim]"
            pct_str = "[dim]—[/dim]"
            health_display = "[dim]—[/dim]"

        table.add_row(
            name_display,
            f"[{model_style}]{model_label}[/{model_style}]",
            f"[{style}]{rec.status}[/{style}]",
            msg_display,
            rec.task[:50] + ("..." if len(rec.task) > 50 else ""),
            duration,
            tokens_str,
            pct_str,
            health_display,
        )

    return table


def check_and_compact(agent_name: str) -> bool:
    """Check context usage for agent and trigger /compact if threshold exceeded.

    Returns True if compaction was triggered, False otherwise.
    Respects per-agent no_autocompact flag and OA_COMPACT_THRESHOLD env var (default 75).
    """
    from .context_tracker import get_context_status, should_compact, trigger_compaction
    from .state import get_agent

    rec = get_agent(agent_name)
    if rec is None or rec.status != "running":
        return False

    if getattr(rec, "no_autocompact", False):
        return False

    ctx = get_context_status(agent_name, rec.tmux_window)
    if should_compact(agent_name, ctx["pct"]):
        trigger_compaction(agent_name, rec.tmux_window)
        return True
    return False


def print_status_with_context() -> None:
    """Print the agent status table with context window usage columns."""
    from .lifecycle import check_agent

    agents = list_agents()

    for rec in agents:
        if rec.status == "running":
            check_agent(rec.name)

    agents = list_agents()

    if not agents:
        console.print("[bright_black]No agents registered. Use 'oa run' to start one.[/bright_black]")
        return

    table = render_status_table_with_context(agents)
    console.print(table)
