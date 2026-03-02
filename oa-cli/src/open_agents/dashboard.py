"""Textual TUI dashboard for Open Agents — improved readability & UX."""

from __future__ import annotations

import time

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import DataTable, Footer, Header, RichLog, Static

from .monitor import _build_hierarchy
from .orchestrator import capture_agent_output, check_agent, kill_agent
from .state import AgentRecord, list_agents
from .workspace import read_output

try:
    from importlib.metadata import version as _pkg_version
    _OA_VERSION = _pkg_version("open-agents")
except Exception:
    _OA_VERSION = "dev"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_duration(start: float, end: float | None = None) -> str:
    elapsed = (end or time.time()) - start
    if elapsed < 60:
        return str(int(elapsed)) + "s"
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)
    if minutes < 60:
        return str(minutes) + "m" + str(seconds).zfill(2) + "s"
    hours = int(minutes // 60)
    minutes = minutes % 60
    return str(hours) + "h" + str(minutes).zfill(2) + "m"


def _status_counts(agents: list[AgentRecord]) -> str:
    running = sum(1 for a in agents if a.status == "running")
    done = sum(1 for a in agents if a.status == "done")
    error = sum(1 for a in agents if a.status in ("error", "timeout", "killed"))
    parts: list[str] = []
    if running:
        parts.append("[bold yellow]" + str(running) + " running[/bold yellow]")
    if done:
        parts.append("[bold green]" + str(done) + " done[/bold green]")
    if error:
        parts.append("[bold red]" + str(error) + " error[/bold red]")
    if not parts:
        parts.append("[#8888aa]no agents[/#8888aa]")
    return "  |  ".join(parts)


def _status_markup(status: str) -> str:
    """Return Rich markup string for a given status."""
    if status == "running":
        return "[bold yellow on #1a1a00] ● RUNNING [/bold yellow on #1a1a00]"
    if status == "done":
        return "[bold green on #001a00] ✔ DONE    [/bold green on #001a00]"
    if status in ("error", "timeout", "killed"):
        label = status.upper()
        return "[bold red on #1a0000] ✘ " + label + "  [/bold red on #1a0000]"
    return "[#8888aa] " + status + " [/#8888aa]"


def _status_badge(status: str) -> str:
    """Compact status badge for table column."""
    if status == "running":
        return "[bold yellow]● running[/bold yellow]"
    if status == "done":
        return "[bold green]✔ done[/bold green]"
    if status in ("error", "timeout", "killed"):
        return "[bold red]✘ " + status + "[/bold red]"
    return "[#8888aa]" + status + "[/#8888aa]"


# ---------------------------------------------------------------------------
# Detail Panel
# ---------------------------------------------------------------------------

class AgentDetailPanel(Vertical):
    """Right panel: agent details + live output."""

    DEFAULT_CSS = """
    AgentDetailPanel {
        width: 50%;
        border-left: solid #444466;
        background: #0d0d1a;
        padding: 0;
    }

    #detail-header {
        height: auto;
        padding: 1 2 0 2;
        background: #0d0d1a;
    }

    #detail-status-row {
        height: auto;
        padding: 0 2 1 2;
        background: #0d0d1a;
    }

    #detail-meta {
        height: auto;
        padding: 1 2;
        background: #111122;
        border-top: solid #333355;
        border-bottom: solid #333355;
    }

    #detail-output-header {
        height: 1;
        padding: 0 2;
        background: #222244;
        color: #ccccee;
    }

    #detail-log {
        height: 1fr;
        padding: 0 1;
        background: #080810;
    }
    """

    def compose(self) -> ComposeResult:
        yield Static("[italic #9999bb]  No agent selected — use arrow keys to navigate[/italic #9999bb]", id="detail-header")
        yield Static("", id="detail-status-row")
        yield Static("", id="detail-meta")
        yield Static(" OUTPUT", id="detail-output-header")
        yield RichLog(id="detail-log", highlight=True, markup=True, wrap=True)

    def update_agent(self, rec: AgentRecord | None) -> None:
        header_widget = self.query_one("#detail-header", Static)
        status_widget = self.query_one("#detail-status-row", Static)
        meta_widget = self.query_one("#detail-meta", Static)
        log = self.query_one("#detail-log", RichLog)
        log.clear()

        if rec is None:
            header_widget.update("[italic #9999bb]  No agent selected — use arrow keys to navigate[/italic #9999bb]")
            status_widget.update("")
            meta_widget.update("")
            log.write("[#8888aa]  Waiting for selection...[/#8888aa]")
            return

        # Agent name as prominent header
        header_widget.update(
            "[bold white]  " + rec.name + "[/bold white]"
        )

        # Status — most important, shown prominently
        status_widget.update("  " + _status_markup(rec.status))

        # Metadata fields
        model_str = getattr(rec, "model", "claude")
        ws_display = rec.workspace
        if len(ws_display) > 55:
            ws_display = "..." + ws_display[-54:]
        task_display = rec.task
        if len(task_display) > 200:
            task_display = task_display[:197] + "..."

        duration = _format_duration(rec.created_at, rec.finished_at)

        meta_lines = [
            "  [#88aadd]Task[/#88aadd]",
            "  [white]" + task_display + "[/white]",
            "",
            "  [#88aadd]Model[/#88aadd]     [cyan]" + model_str + "[/cyan]"
            + "    [#88aadd]Duration[/#88aadd]  [yellow]" + duration + "[/yellow]",
            "  [#88aadd]Workspace[/#88aadd] [#7799bb]" + ws_display + "[/#7799bb]",
        ]
        meta_widget.update("\n".join(meta_lines))

        # Output log
        output_text: str | None = None
        if rec.status == "running":
            output_text = capture_agent_output(rec.tmux_window, lines=50)
        elif rec.status in ("done", "error", "timeout", "killed"):
            output_text = read_output(rec.workspace)

        if output_text:
            lines = output_text.splitlines()
            # Show last 50 lines
            for line in lines[-50:]:
                log.write(line)
        else:
            log.write("[#8888aa]  No output available yet.[/#8888aa]")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

class OADashboard(App):
    """Open Agents — Command Centre."""

    TITLE = "Open Agents  v" + _OA_VERSION
    SUB_TITLE = "loading..."

    CSS = """
    Screen {
        layout: vertical;
        background: #0d0d1a;
    }

    Header {
        background: #1a1a44;
        color: #ddddff;
        text-style: bold;
    }

    Footer {
        background: #111133;
        color: #aaaacc;
    }

    #main {
        height: 1fr;
    }

    #table-pane {
        width: 50%;
        background: #0a0a15;
    }

    #agent-table {
        height: 1fr;
        background: #0a0a15;
    }

    DataTable > .datatable--header {
        background: #1a1a44;
        color: #ccccff;
        text-style: bold;
    }

    DataTable > .datatable--cursor {
        background: #2244aa;
        color: #ffffff;
        text-style: bold;
    }

    DataTable > .datatable--hover {
        background: #1a2255;
    }

    #status-bar {
        height: 1;
        padding: 0 2;
        background: #111133;
        color: #aaaacc;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh"),
        Binding("k", "kill_agent", "Kill agent"),
        Binding("c", "collect", "Collect output"),
        Binding("enter", "select_agent", "View detail", show=False),
        Binding("up", "move_up", "Up", show=False),
        Binding("down", "move_down", "Down", show=False),
    ]

    def __init__(self) -> None:
        super().__init__()
        self._agents: dict[str, AgentRecord] = {}

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="main"):
            with Vertical(id="table-pane"):
                yield DataTable(id="agent-table", cursor_type="row", show_cursor=True)
            yield AgentDetailPanel(id="detail")
        yield Static("", id="status-bar")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#agent-table", DataTable)
        table.add_columns(
            "Agent",
            "Status",
            "Model",
            "Task",
            "Time",
        )
        self._refresh_agents()
        self.set_interval(2.0, self._refresh_agents)

    # ------------------------------------------------------------------
    # Data refresh
    # ------------------------------------------------------------------

    def _refresh_agents(self) -> None:
        agents = list_agents()
        for rec in agents:
            if rec.status == "running":
                check_agent(rec.name)
        agents = list_agents()
        self._agents = {rec.name: rec for rec in agents}

        table = self.query_one("#agent-table", DataTable)
        cursor_row = table.cursor_row

        table.clear()
        hierarchy = _build_hierarchy(agents)

        for rec, depth in hierarchy:
            model_str = getattr(rec, "model", "claude")

            if depth == 0:
                # Root agents: cyan name, no indent
                name_markup = "[bold cyan]" + rec.name + "[/bold cyan]"
            else:
                # Sub-agents: indented, green to distinguish from root
                indent = "  " * depth + "└ "
                name_markup = "[#7777aa]" + indent + "[/#7777aa][green]" + rec.name + "[/green]"

            # Task: more characters, clearly readable
            task_short = rec.task
            if len(task_short) > 45:
                task_short = task_short[:44] + "..."

            # Model: short label, legible
            model_short = model_str
            if len(model_short) > 16:
                model_short = model_short[:15] + "..."

            table.add_row(
                name_markup,
                _status_badge(rec.status),
                "[#88aacc]" + model_short + "[/#88aacc]",
                task_short,
                "[yellow]" + _format_duration(rec.created_at, rec.finished_at) + "[/yellow]",
                key=rec.name,
            )

        # Restore cursor position
        if agents and cursor_row >= 0:
            new_row = min(cursor_row, table.row_count - 1)
            table.move_cursor(row=new_row)

        # Status bar: agent counts
        counts = _status_counts(agents)
        total = len(agents)
        self.sub_title = str(total) + (" agent" if total == 1 else " agents")
        status_bar = self.query_one("#status-bar", Static)
        status_bar.update(counts)

        self._update_detail()

    # ------------------------------------------------------------------
    # Selection helpers
    # ------------------------------------------------------------------

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
        detail = self.query_one("#detail", AgentDetailPanel)
        detail.update_agent(self._get_selected_agent())

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        self._update_detail()

    def action_move_up(self) -> None:
        table = self.query_one("#agent-table", DataTable)
        table.action_scroll_up()
        self._update_detail()

    def action_move_down(self) -> None:
        table = self.query_one("#agent-table", DataTable)
        table.action_scroll_down()
        self._update_detail()

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    def action_select_agent(self) -> None:
        self._update_detail()

    def action_kill_agent(self) -> None:
        rec = self._get_selected_agent()
        if rec and rec.status == "running":
            kill_agent(rec.name)
            self.notify(
                "Killed agent '" + rec.name + "'",
                severity="warning",
            )
            self._refresh_agents()
        elif rec:
            self.notify(
                "Agent '" + rec.name + "' is not running",
                severity="warning",
            )
        else:
            self.notify("No agent selected", severity="warning")

    def action_collect(self) -> None:
        rec = self._get_selected_agent()
        if rec is None:
            self.notify("No agent selected", severity="warning")
            return
        if rec.status == "running":
            self.notify("Agent still running — wait for completion", severity="warning")
            return
        output = read_output(rec.workspace)
        if output:
            preview = output[:200] + ("..." if len(output) > 200 else "")
            self.notify("Output from '" + rec.name + "': " + preview)
        else:
            self.notify("No output from '" + rec.name + "'", severity="warning")

    def action_refresh(self) -> None:
        self._refresh_agents()
        self.notify("Refreshed", timeout=1.5)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_dashboard() -> None:
    """Entry point for the dashboard."""
    app = OADashboard()
    app.run()
