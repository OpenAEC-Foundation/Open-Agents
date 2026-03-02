"""Textual TUI dashboard for Open Agents."""

from __future__ import annotations

import time

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import DataTable, Footer, Header, Static

from .orchestrator import capture_agent_output, check_agent, kill_agent
from .state import AgentRecord, list_agents
from .workspace import read_output


def _format_duration(start: float, end: float | None = None) -> str:
    elapsed = (end or time.time()) - start
    if elapsed < 60:
        return f"{elapsed:.0f}s"
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)
    if minutes < 60:
        return f"{minutes}m{seconds:02d}s"
    hours = int(minutes // 60)
    minutes = minutes % 60
    return f"{hours}h{minutes:02d}m"


def _status_counts(agents: list[AgentRecord]) -> str:
    running = sum(1 for a in agents if a.status == "running")
    done = sum(1 for a in agents if a.status == "done")
    other = len(agents) - running - done
    parts = []
    if running:
        parts.append(f"{running} active")
    if done:
        parts.append(f"{done} done")
    if other:
        parts.append(f"{other} other")
    return " | ".join(parts) if parts else "no agents"


class DetailPanel(Static):
    """Right panel showing details of the selected agent."""

    DEFAULT_CSS = """
    DetailPanel {
        width: 40%;
        padding: 1 2;
        border-left: solid $primary;
    }
    """

    def update_agent(self, rec: AgentRecord | None) -> None:
        if rec is None:
            self.update("[dim]Select an agent to view details[/dim]")
            return

        lines = [
            f"[bold]{rec.name}[/bold]",
            "",
            f"  Status:    {rec.status}",
            f"  Task:      {rec.task}",
            f"  Workspace: {rec.workspace}",
            f"  Duration:  {_format_duration(rec.created_at, rec.finished_at)}",
            "",
        ]

        # Try to get output
        output_text: str | None = None
        if rec.status == "running":
            output_text = capture_agent_output(rec.tmux_window, lines=20)
        elif rec.status in ("done", "error", "timeout", "killed"):
            output_text = read_output(rec.workspace)

        if output_text:
            lines.append("--- Output (last 20 lines) ---")
            for line in output_text.splitlines()[-20:]:
                lines.append(f"  {line}")
        else:
            lines.append("[dim]No output available[/dim]")

        self.update("\n".join(lines))


class OADashboard(App):
    """Open Agents TUI dashboard."""

    TITLE = "Open Agents"
    CSS = """
    Screen {
        layout: vertical;
    }
    #main {
        height: 1fr;
    }
    #table-pane {
        width: 60%;
    }
    #agent-table {
        height: 1fr;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("k", "kill_agent", "Kill"),
        Binding("c", "collect", "Collect"),
        Binding("r", "refresh", "Refresh"),
    ]

    def __init__(self) -> None:
        super().__init__()
        self._agents: dict[str, AgentRecord] = {}

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main"):
            with Vertical(id="table-pane"):
                yield DataTable(id="agent-table", cursor_type="row")
            yield DetailPanel(id="detail")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#agent-table", DataTable)
        table.add_columns("Name", "Model", "Status", "Task", "Duration", "Workspace")
        self._refresh_agents()
        self.set_interval(2.0, self._refresh_agents)

    def _refresh_agents(self) -> None:
        agents = list_agents()
        # Refresh running agents
        for rec in agents:
            if rec.status == "running":
                check_agent(rec.name)
        # Reload after status updates
        agents = list_agents()
        self._agents = {rec.name: rec for rec in agents}

        table = self.query_one("#agent-table", DataTable)
        cursor_row = table.cursor_row

        table.clear()
        for rec in sorted(agents, key=lambda r: r.created_at):
            ws_short = rec.workspace
            if len(ws_short) > 30:
                ws_short = "..." + ws_short[-27:]
            model_str = getattr(rec, "model", "claude")
            table.add_row(
                rec.name,
                model_str,
                rec.status,
                rec.task[:40] + ("..." if len(rec.task) > 40 else ""),
                _format_duration(rec.created_at, rec.finished_at),
                ws_short,
                key=rec.name,
            )

        # Restore cursor position
        if agents and cursor_row >= 0:
            table.move_cursor(row=min(cursor_row, len(agents) - 1))

        # Update subtitle with counts
        self.sub_title = _status_counts(agents)

        # Update detail panel for current selection
        self._update_detail()

    def _get_selected_agent(self) -> AgentRecord | None:
        table = self.query_one("#agent-table", DataTable)
        if table.row_count == 0:
            return None
        try:
            row_key, _ = table.coordinate_to_cell_key(table.cursor_coordinate)
            return self._agents.get(str(row_key))
        except Exception:
            return None

    def _update_detail(self) -> None:
        detail = self.query_one("#detail", DetailPanel)
        detail.update_agent(self._get_selected_agent())

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        self._update_detail()

    def action_kill_agent(self) -> None:
        rec = self._get_selected_agent()
        if rec and rec.status == "running":
            kill_agent(rec.name)
            self.notify(f"Killed agent '{rec.name}'", severity="warning")
            self._refresh_agents()
        elif rec:
            self.notify(f"Agent '{rec.name}' is not running", severity="warning")

    def action_collect(self) -> None:
        rec = self._get_selected_agent()
        if rec is None:
            return
        if rec.status == "running":
            self.notify("Agent still running", severity="warning")
            return
        output = read_output(rec.workspace)
        if output:
            self.notify(f"Output from '{rec.name}': {output[:200]}")
        else:
            self.notify(f"No output from '{rec.name}'", severity="warning")

    def action_refresh(self) -> None:
        self._refresh_agents()
        self.notify("Refreshed")


def run_dashboard() -> None:
    """Entry point for the dashboard."""
    app = OADashboard()
    app.run()
