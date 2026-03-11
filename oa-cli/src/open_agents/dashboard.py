"""Textual TUI dashboard for Open Agents — improved readability & UX."""

from __future__ import annotations

import datetime
from pathlib import Path

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import DataTable, Footer, Header, RichLog, Static, TabbedContent, TabPane

from .monitor import _build_hierarchy
from .lifecycle import capture_agent_output, check_agent, kill_agent
from .state import AgentRecord, list_agents
from .utils import format_duration, format_model_label, format_model_rich
from .workspace import read_output

try:
    from .teams import list_teams as _list_teams
    _teams_ok = True
except ImportError:
    _teams_ok = False

try:
    from .task_list import list_tasks as _list_tasks
    _tasks_ok = True
except ImportError:
    _tasks_ok = False

try:
    from importlib.metadata import version as _pkg_version
    _OA_VERSION = _pkg_version("open-agents")
except Exception:
    _OA_VERSION = "dev"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _workspace_label(rec, agents: dict | None = None) -> str:
    """Return short workspace label: project folder name, inherited from lineage, or tmp."""
    project_root = getattr(rec, "project_root", None)
    if project_root:
        return Path(project_root).name[:20]
    # Traverse lineage to find root's project_root
    if agents:
        for ancestor_name in reversed(getattr(rec, "lineage", [])):
            ancestor = agents.get(ancestor_name)
            if ancestor and getattr(ancestor, "project_root", None):
                return "[#667788]" + Path(ancestor.project_root).name[:20] + "[/#667788]"
    return "[#666688]tmp[/#666688]"


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

    def update_agent(self, rec: AgentRecord | None, auto: bool = False) -> None:
        header_widget = self.query_one("#detail-header", Static)
        status_widget = self.query_one("#detail-status-row", Static)
        meta_widget = self.query_one("#detail-meta", Static)
        log = self.query_one("#detail-log", RichLog)
        log.clear()

        if rec is None:
            header_widget.update("[italic #9999bb]  No agent selected[/italic #9999bb]")
            status_widget.update("")
            meta_widget.update("")
            log.write("[#8888aa]  ↑↓ arrow keys to navigate agents[/#8888aa]")
            return

        # Agent name as prominent header
        auto_tag = "  [#667788](auto)[/#667788]" if auto else ""
        header_widget.update("[bold white]  " + rec.name + "[/bold white]" + auto_tag)

        # Status — most important, shown prominently
        status_widget.update("  " + _status_markup(rec.status))

        # Metadata fields
        model_markup = format_model_rich(getattr(rec, "model", "claude"))
        ws_display = rec.workspace
        if len(ws_display) > 55:
            ws_display = "..." + ws_display[-54:]
        task_display = rec.task
        if len(task_display) > 200:
            task_display = task_display[:197] + "..."

        duration = format_duration(rec.created_at, rec.finished_at)

        meta_lines = [
            "  [#88aadd]Task[/#88aadd]",
            "  [white]" + task_display + "[/white]",
            "",
            "  [#88aadd]Model[/#88aadd]     " + model_markup
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
# Teams Panel
# ---------------------------------------------------------------------------

def _task_status_badge(status: str) -> str:
    """Compact status badge for task status column."""
    if status == "pending":
        return "[#8888aa]○ pending[/#8888aa]"
    if status == "in_progress":
        return "[bold yellow]● in_progress[/bold yellow]"
    if status == "completed":
        return "[bold green]✔ completed[/bold green]"
    if status == "blocked":
        return "[bold red]✘ blocked[/bold red]"
    return "[#8888aa]" + status + "[/#8888aa]"


class TeamsPanel(Horizontal):
    """Teams tab: left pane = team list, right pane = tasks for selected team."""

    DEFAULT_CSS = """
    TeamsPanel {
        background: #0a0a15;
    }

    #teams-left {
        width: 40%;
        border-right: solid #333355;
        background: #0a0a15;
    }

    #teams-section-header {
        height: 1;
        padding: 0 2;
        background: #1a1a44;
        color: #ccccff;
        text-style: bold;
    }

    #teams-table {
        height: 1fr;
        background: #0a0a15;
    }

    #teams-footer {
        height: 1;
        padding: 0 2;
        background: #111133;
        color: #aaaacc;
    }

    #tasks-right {
        width: 60%;
        background: #0a0a15;
    }

    #tasks-section-header {
        height: 1;
        padding: 0 2;
        background: #1a1a44;
        color: #ccccff;
        text-style: bold;
    }

    #tasks-table {
        height: 1fr;
        background: #0a0a15;
    }

    #tasks-footer {
        height: 1;
        padding: 0 2;
        background: #111133;
        color: #aaaacc;
    }
    """

    def compose(self) -> ComposeResult:
        with Vertical(id="teams-left"):
            yield Static(" TEAMS", id="teams-section-header")
            yield DataTable(id="teams-table", cursor_type="row", show_cursor=True)
            yield Static("", id="teams-footer")
        with Vertical(id="tasks-right"):
            yield Static(" TASKS  [#556677](select a team)[/#556677]", id="tasks-section-header")
            yield DataTable(id="tasks-table", cursor_type="row", show_cursor=False)
            yield Static("", id="tasks-footer")

    def on_mount(self) -> None:
        teams_table = self.query_one("#teams-table", DataTable)
        teams_table.add_columns("Team", "Members", "Tasks")

        tasks_table = self.query_one("#tasks-table", DataTable)
        tasks_table.add_columns("Title", "Status", "Assigned To", "Created")

        self._refresh()
        self.set_interval(5.0, self._refresh)

    def _refresh(self) -> None:
        if not _teams_ok:
            self.query_one("#teams-footer", Static).update("[red]teams module unavailable[/red]")
            return

        teams = _list_teams()

        teams_table = self.query_one("#teams-table", DataTable)
        cursor_row = teams_table.cursor_row
        teams_table.clear()

        for team in teams:
            name = team.get("name", "")
            members = team.get("members", [])
            member_count = len(members)

            if _tasks_ok:
                try:
                    tasks = _list_tasks(name)
                    task_count = len(tasks)
                    active = sum(
                        1 for t in tasks if t.get("status") in ("in_progress", "pending")
                    )
                except Exception:
                    task_count = 0
                    active = 0
            else:
                task_count = 0
                active = 0

            member_preview = ", ".join(members[:3])
            if member_count > 3:
                member_preview += f" +{member_count - 3}"
            if not member_preview:
                member_preview = "[#556677]none[/#556677]"

            task_str = f"{active} active / {task_count} total"

            teams_table.add_row(
                "[bold cyan]" + name + "[/bold cyan]",
                "[#88aadd]" + member_preview + "[/#88aadd]",
                "[yellow]" + task_str + "[/yellow]",
                key=name,
            )

        if teams and cursor_row >= 0:
            teams_table.move_cursor(row=min(cursor_row, teams_table.row_count - 1))

        footer = self.query_one("#teams-footer", Static)
        footer.update("[#8888aa]" + str(len(teams)) + " team(s)[/#8888aa]")

        self._update_tasks()

    def _update_tasks(self) -> None:
        tasks_table = self.query_one("#tasks-table", DataTable)
        tasks_table.clear()

        teams_table = self.query_one("#teams-table", DataTable)
        if teams_table.row_count == 0:
            self.query_one("#tasks-section-header", Static).update(
                " TASKS  [#556677](no teams)[/#556677]"
            )
            return

        try:
            row_key, _ = teams_table.coordinate_to_cell_key(teams_table.cursor_coordinate)
            team_name = str(row_key)
        except Exception:
            return

        self.query_one("#tasks-section-header", Static).update(
            " TASKS  [#88aadd]" + team_name + "[/#88aadd]"
        )

        if not _tasks_ok:
            self.query_one("#tasks-footer", Static).update("[red]task_list module unavailable[/red]")
            return

        try:
            tasks = _list_tasks(team_name)
        except Exception:
            return

        for task in tasks:
            title = task.get("title", task.get("description", ""))[:45]
            status = task.get("status", "")
            assigned = task.get("assigned_to") or "[#556677]—[/#556677]"
            created_at = task.get("created_at", 0)
            created_str = ""
            if created_at:
                created_str = datetime.datetime.fromtimestamp(created_at).strftime("%m-%d %H:%M")

            tasks_table.add_row(
                "[white]" + title + "[/white]",
                _task_status_badge(status),
                "[#88aadd]" + assigned + "[/#88aadd]",
                "[#667788]" + created_str + "[/#667788]",
            )

        task_count = len(tasks)
        self.query_one("#tasks-footer", Static).update(
            "[#8888aa]" + str(task_count) + " task(s)[/#8888aa]"
        )

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        if event.data_table.id == "teams-table":
            self._update_tasks()


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

    #main-tabs {
        height: 1fr;
    }

    #main-tabs > TabPane {
        padding: 0;
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
        Binding("f", "toggle_follow", "Auto-follow"),
        Binding("enter", "select_agent", "View detail", show=False),
        Binding("up", "move_up", "Up", show=False),
        Binding("down", "move_down", "Down", show=False),
        Binding("1", "show_agents_tab", "Agents", show=False),
        Binding("2", "show_teams_tab", "Teams", show=False),
    ]

    def __init__(self) -> None:
        super().__init__()
        self._agents: dict[str, AgentRecord] = {}
        self._pinned_agent: str | None = None  # explicitly selected by user

    def compose(self) -> ComposeResult:
        yield Header()
        with TabbedContent(id="main-tabs"):
            with TabPane("Agents [1]", id="tab-agents"):
                with Horizontal(id="main"):
                    with Vertical(id="table-pane"):
                        yield DataTable(id="agent-table", cursor_type="row", show_cursor=True)
                    yield AgentDetailPanel(id="detail")
                yield Static("", id="status-bar")
            with TabPane("Teams [2]", id="tab-teams"):
                yield TeamsPanel(id="teams-panel")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#agent-table", DataTable)
        table.add_columns(
            "Agent",
            "Status",
            "Model",
            "Workspace",
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
            model_label = format_model_label(getattr(rec, "model", "claude"))
            model_markup = format_model_rich(getattr(rec, "model", "claude"))

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
            model_short = model_label
            if len(model_short) > 16:
                model_short = model_short[:15] + "..."

            ws_label = _workspace_label(rec, self._agents)
            table.add_row(
                name_markup,
                _status_badge(rec.status),
                model_markup,
                ws_label,
                task_short,
                "[yellow]" + format_duration(rec.created_at, rec.finished_at) + "[/yellow]",
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

    def _auto_agent(self) -> AgentRecord | None:
        """Return best agent to show when nothing is pinned: latest running, else latest."""
        agents = list(self._agents.values())
        if not agents:
            return None
        running = [a for a in agents if a.status == "running"]
        if running:
            return max(running, key=lambda a: a.created_at)
        return max(agents, key=lambda a: a.created_at)

    def _update_detail(self) -> None:
        detail = self.query_one("#detail", AgentDetailPanel)
        if self._pinned_agent and self._pinned_agent in self._agents:
            detail.update_agent(self._agents[self._pinned_agent], auto=False)
        else:
            explicit = self._get_selected_agent()
            auto = self._auto_agent()
            if explicit:
                detail.update_agent(explicit, auto=False)
            elif auto:
                detail.update_agent(auto, auto=True)
            else:
                detail.update_agent(None)

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        # User moved cursor — pin that agent
        rec = self._get_selected_agent()
        if rec:
            self._pinned_agent = rec.name
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
        rec = self._get_selected_agent()
        if rec:
            self._pinned_agent = rec.name
        self._update_detail()

    def action_toggle_follow(self) -> None:
        """Toggle auto-follow mode (unpin)."""
        if self._pinned_agent:
            self._pinned_agent = None
            self.notify("Auto-follow ON — tracking latest running agent", timeout=2)
        else:
            rec = self._get_selected_agent() or self._auto_agent()
            if rec:
                self._pinned_agent = rec.name
                self.notify("Pinned: " + rec.name, timeout=2)
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

    def action_show_agents_tab(self) -> None:
        self.query_one("#main-tabs", TabbedContent).active = "tab-agents"

    def action_show_teams_tab(self) -> None:
        self.query_one("#main-tabs", TabbedContent).active = "tab-teams"


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_dashboard() -> None:
    """Entry point for the dashboard."""
    app = OADashboard()
    app.run()
