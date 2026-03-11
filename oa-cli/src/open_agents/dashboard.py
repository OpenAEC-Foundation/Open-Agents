"""Textual TUI dashboard for Open Agents — real-time agent tree with live output."""

from __future__ import annotations

import datetime
import subprocess
import time
from pathlib import Path

from rich.text import Text
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical, Center
from textual.widgets import Footer, Header, Input, RichLog, Static, TabbedContent, TabPane, DataTable
from textual.screen import ModalScreen

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

_SESSION_START = time.time()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _status_icon(status: str) -> str:
    """Return colored status icon markup."""
    if status == "running":
        return "[bold yellow]●[/bold yellow]"
    if status == "done":
        return "[bold green]✔[/bold green]"
    if status in ("error", "timeout", "killed"):
        return "[bold red]✘[/bold red]"
    return "[#888888]○[/#888888]"


def _tree_name(rec: AgentRecord, depth: int) -> str:
    """Build tree-indented name with status icon and color."""
    icon = _status_icon(rec.status)
    if depth == 0:
        return f"{icon} [bold cyan]{rec.name}[/bold cyan]"
    elif depth == 1:
        prefix = "  " * (depth - 1) + "└─"
        return f"[#555555]{prefix}[/#555555]{icon} [green]{rec.name}[/green]"
    else:
        prefix = "  " * (depth - 1) + "└─"
        return f"[#555555]{prefix}[/#555555]{icon} [#88bbff]{rec.name}[/#88bbff]"


def _counts(agents: list[AgentRecord]) -> tuple[int, int, int]:
    """Return (running, done, error) counts."""
    running = sum(1 for a in agents if a.status == "running")
    done = sum(1 for a in agents if a.status == "done")
    error = sum(1 for a in agents if a.status in ("error", "timeout", "killed"))
    return running, done, error


def _task_status_badge(status: str) -> str:
    if status == "pending":
        return "[#8888aa]○ pending[/#8888aa]"
    if status == "in_progress":
        return "[bold yellow]● in_progress[/bold yellow]"
    if status == "completed":
        return "[bold green]✔ completed[/bold green]"
    if status == "blocked":
        return "[bold red]✘ blocked[/bold red]"
    return "[#8888aa]" + status + "[/#8888aa]"


# ---------------------------------------------------------------------------
# Help overlay
# ---------------------------------------------------------------------------

class HelpScreen(ModalScreen):
    """Keybinding help overlay."""

    BINDINGS = [Binding("escape", "dismiss", "Close")]

    DEFAULT_CSS = """
    HelpScreen { align: center middle; }
    #help-box {
        width: 60; height: auto; max-height: 80%;
        background: #111133; border: solid #4444aa;
        padding: 1 2;
    }
    """

    def compose(self) -> ComposeResult:
        yield Static(
            "[bold cyan]Open Agents — Keybindings[/bold cyan]\n\n"
            "  [bold yellow]↑ ↓[/bold yellow]   Navigate agents (pins selection)\n"
            "  [bold yellow]f[/bold yellow]     Toggle auto-follow / unpin\n"
            "  [bold yellow]r[/bold yellow]     Refresh now\n"
            "  [bold yellow]k[/bold yellow]     Kill selected agent\n"
            "  [bold yellow]c[/bold yellow]     Collect output (completed agents)\n"
            "  [bold yellow]s[/bold yellow]     Spawn new agent\n"
            "  [bold yellow]a[/bold yellow]     Attach to tmux window\n"
            "  [bold yellow]1[/bold yellow]     Agents tab\n"
            "  [bold yellow]2 / t[/bold yellow]  Teams tab\n"
            "  [bold yellow]?[/bold yellow]     This help\n"
            "  [bold yellow]q[/bold yellow]     Quit\n\n"
            "  [#888888]Press Escape to close[/#888888]",
            id="help-box",
        )


# ---------------------------------------------------------------------------
# Spawn overlay
# ---------------------------------------------------------------------------

class SpawnScreen(ModalScreen):
    """Spawn a new agent."""

    BINDINGS = [Binding("escape", "dismiss", "Cancel")]

    DEFAULT_CSS = """
    SpawnScreen { align: center middle; }
    #spawn-box {
        width: 70; height: auto;
        background: #111133; border: solid #4444aa;
        padding: 1 2;
    }
    #spawn-box Input { margin: 0 0 1 0; }
    """

    def compose(self) -> ComposeResult:
        with Vertical(id="spawn-box"):
            yield Static("[bold cyan]Spawn Agent[/bold cyan]\n")
            yield Static("[#88aadd]Task[/#88aadd] (required):")
            yield Input(placeholder="Describe the task...", id="spawn-task")
            yield Static("[#88aadd]Model[/#88aadd] (default: claude/sonnet):")
            yield Input(placeholder="claude/sonnet", id="spawn-model", value="claude/sonnet")
            yield Static("[#88aadd]Name[/#88aadd] (optional):")
            yield Input(placeholder="auto-generated if empty", id="spawn-name")
            yield Static("\n[#888888]Enter = spawn · Escape = cancel[/#888888]")

    def on_input_submitted(self, event: Input.Submitted) -> None:
        task = self.query_one("#spawn-task", Input).value.strip()
        if not task:
            return
        model = self.query_one("#spawn-model", Input).value.strip() or "claude/sonnet"
        name = self.query_one("#spawn-name", Input).value.strip()
        cmd = ["oa", "run", task, "--model", model, "--direct"]
        if name:
            cmd.extend(["--name", name])
        try:
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
        self.dismiss()


# ---------------------------------------------------------------------------
# Teams Panel (preserved from original)
# ---------------------------------------------------------------------------

class TeamsPanel(Horizontal):
    """Teams tab: left pane = team list, right pane = tasks for selected team."""

    DEFAULT_CSS = """
    TeamsPanel { background: #0a0a15; }
    #teams-left { width: 40%; border-right: solid #333355; background: #0a0a15; }
    #teams-section-header { height: 1; padding: 0 2; background: #1a1a44; color: #ccccff; text-style: bold; }
    #teams-table { height: 1fr; background: #0a0a15; }
    #teams-footer { height: 1; padding: 0 2; background: #111133; color: #aaaacc; }
    #tasks-right { width: 60%; background: #0a0a15; }
    #tasks-section-header { height: 1; padding: 0 2; background: #1a1a44; color: #ccccff; text-style: bold; }
    #tasks-table { height: 1fr; background: #0a0a15; }
    #tasks-footer { height: 1; padding: 0 2; background: #111133; color: #aaaacc; }
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
        teams_table.add_columns("Team", "Members", "todo/done", "Status")
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
                    todo_count = sum(1 for t in tasks if t.get("status") in ("todo", "claimed", "blocked"))
                    done_count = sum(1 for t in tasks if t.get("status") == "done")
                except Exception:
                    todo_count, done_count = 0, 0
            else:
                todo_count, done_count = 0, 0
            member_preview = ", ".join(members[:3])
            if member_count > 3:
                member_preview += f" +{member_count - 3}"
            if not member_preview:
                member_preview = "[#556677]none[/#556677]"
            todo_done_str = f"{todo_count} todo / {done_count} done"
            if todo_count > 0:
                team_status = "[bold yellow]active[/bold yellow]"
            elif done_count > 0:
                team_status = "[bold green]done[/bold green]"
            else:
                team_status = "[#556677]empty[/#556677]"
            teams_table.add_row(
                "[bold cyan]" + name + "[/bold cyan]",
                "[#88aadd]" + member_preview + "[/#88aadd]",
                "[yellow]" + todo_done_str + "[/yellow]",
                team_status,
                key=name,
            )
        if teams and cursor_row >= 0:
            teams_table.move_cursor(row=min(cursor_row, teams_table.row_count - 1))
        self.query_one("#teams-footer", Static).update(f"[#8888aa]{len(teams)} team(s)[/#8888aa]")
        self._update_tasks()

    def _update_tasks(self) -> None:
        tasks_table = self.query_one("#tasks-table", DataTable)
        tasks_table.clear()
        teams_table = self.query_one("#teams-table", DataTable)
        if teams_table.row_count == 0:
            self.query_one("#tasks-section-header", Static).update(" TASKS  [#556677](no teams)[/#556677]")
            return
        try:
            row_key, _ = teams_table.coordinate_to_cell_key(teams_table.cursor_coordinate)
            team_name = str(row_key)
        except Exception:
            return
        self.query_one("#tasks-section-header", Static).update(" TASKS  [#88aadd]" + team_name + "[/#88aadd]")
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
            created_str = datetime.datetime.fromtimestamp(created_at).strftime("%m-%d %H:%M") if created_at else ""
            tasks_table.add_row(
                "[white]" + title + "[/white]",
                _task_status_badge(status),
                "[#88aadd]" + assigned + "[/#88aadd]",
                "[#667788]" + created_str + "[/#667788]",
            )
        self.query_one("#tasks-footer", Static).update(f"[#8888aa]{len(tasks)} task(s)[/#8888aa]")

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        if event.data_table.id == "teams-table":
            self._update_tasks()


# ---------------------------------------------------------------------------
# Main App
# ---------------------------------------------------------------------------

class OADashboard(App):
    """Open Agents — real-time agent tree dashboard."""

    TITLE = "Open Agents"

    CSS = """
    Screen { background: #0d0d1a; }
    Header { background: #1a1a44; color: #ddddff; text-style: bold; }
    Footer { background: #111133; color: #aaaacc; }

    #main-tabs { height: 1fr; }
    #main-tabs > TabPane { padding: 0; }

    #agents-pane { height: 1fr; }

    #left-panel {
        width: 35%;
        border-right: solid #333355;
        background: #0a0a15;
    }
    #tree-header {
        height: 1; padding: 0 2;
        background: #1a1a44; color: #ccccff; text-style: bold;
    }
    #agent-tree {
        height: 1fr; padding: 0 1;
        background: #0a0a15;
        overflow-y: auto;
    }
    #stats-separator {
        height: 1; padding: 0 1;
        background: #0a0a15; color: #333355;
    }
    #stats-panel {
        height: auto; min-height: 7; padding: 0 2;
        background: #0d0d1a;
        border-top: solid #333355;
    }

    #right-panel {
        width: 65%;
        background: #080810;
    }
    #output-header {
        height: 1; padding: 0 2;
        background: #1a1a44; color: #ccccff; text-style: bold;
    }
    #live-log {
        height: 1fr; padding: 0 1;
        background: #080810;
    }

    DataTable > .datatable--header { background: #1a1a44; color: #ccccff; text-style: bold; }
    DataTable > .datatable--cursor { background: #2244aa; color: #ffffff; text-style: bold; }
    """

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh"),
        Binding("k", "kill_agent", "Kill"),
        Binding("f", "toggle_follow", "Auto-follow"),
        Binding("s", "spawn", "Spawn"),
        Binding("c", "collect", "Collect"),
        Binding("a", "attach", "Attach"),
        Binding("question_mark", "help", "Help"),
        Binding("up", "cursor_up", "Up", show=False, priority=True),
        Binding("down", "cursor_down", "Down", show=False, priority=True),
        Binding("1", "tab_agents", "", show=False),
        Binding("2", "tab_teams", "", show=False),
        Binding("t", "tab_teams", "Teams", show=False),
    ]

    def __init__(self) -> None:
        super().__init__()
        self._agents: dict[str, AgentRecord] = {}
        self._hierarchy: list[tuple[AgentRecord, int]] = []
        self._cursor_idx: int = 0
        self._auto_follow: bool = True
        self._last_output: str = ""
        self._updating_tree: bool = False  # guard: suppress RowHighlighted during render

    def compose(self) -> ComposeResult:
        yield Header()
        with TabbedContent(id="main-tabs"):
            with TabPane("Agents [1]", id="tab-agents"):
                with Horizontal(id="agents-pane"):
                    with Vertical(id="left-panel"):
                        yield Static(" AGENT TREE", id="tree-header")
                        yield DataTable(id="agent-tree", cursor_type="row", show_cursor=True, show_header=False)
                        yield Static("[#333355]─" * 30 + "[/#333355]", id="stats-separator")
                        yield Static("", id="stats-panel")
                    with Vertical(id="right-panel"):
                        yield Static(" LIVE OUTPUT", id="output-header")
                        yield RichLog(id="live-log", highlight=False, markup=False, wrap=True)
            with TabPane("Teams [2]", id="tab-teams"):
                yield TeamsPanel(id="teams-panel")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#agent-tree", DataTable)
        table.add_columns("agent", "info")
        self._refresh_all()
        self.set_interval(2.0, self._refresh_all)
        self.set_interval(1.0, self._refresh_clock)

    # ------------------------------------------------------------------
    # Refresh cycles
    # ------------------------------------------------------------------

    def _refresh_clock(self) -> None:
        """Update header subtitle with clock and counts."""
        now = datetime.datetime.now().strftime("%H:%M:%S")
        agents = list(self._agents.values())
        r, d, e = _counts(agents)
        self.sub_title = f"{now}   {r} running · {d} done · {e} error"

    def _refresh_all(self) -> None:
        """Refresh agent data, tree, stats, and output."""
        agents = list_agents()
        for rec in agents:
            if rec.status == "running":
                check_agent(rec.name)
        agents = list_agents()
        self._agents = {rec.name: rec for rec in agents}
        self._hierarchy = _build_hierarchy(agents)

        self._render_tree()
        self._render_stats()
        self._render_output()
        self._refresh_clock()

    def _render_tree(self) -> None:
        """Render the agent tree using DataTable (supports mouse + keyboard selection)."""
        table = self.query_one("#agent-tree", DataTable)
        self._updating_tree = True
        try:
            table.clear()

            if not self._hierarchy:
                table.add_row("[#888888]No agents — press s to spawn[/#888888]", "", key="__empty__")
                return

            for rec, depth in self._hierarchy:
                name_cell = _tree_name(rec, depth)
                dur = format_duration(rec.created_at, rec.finished_at)
                model = format_model_label(getattr(rec, "model", "claude"))
                info_cell = f"[#666688]{model} · {dur}[/#666688]"
                table.add_row(name_cell, info_cell, key=rec.name)

            # Restore cursor — follow active agent visually when auto-follow is on
            if table.row_count > 0:
                if self._auto_follow:
                    active = self._get_active_agent()
                    if active:
                        try:
                            row = next(
                                i for i, (r, _) in enumerate(self._hierarchy) if r.name == active.name
                            )
                            table.move_cursor(row=row)
                        except StopIteration:
                            table.move_cursor(row=0)
                    else:
                        table.move_cursor(row=0)
                else:
                    self._cursor_idx = min(self._cursor_idx, table.row_count - 1)
                    table.move_cursor(row=self._cursor_idx)
        finally:
            self._updating_tree = False

    def _render_stats(self) -> None:
        """Render stats panel below the tree."""
        stats_widget = self.query_one("#stats-panel", Static)
        agents = list(self._agents.values())
        r, d, e = _counts(agents)
        total = len(agents)
        uptime = format_duration(_SESSION_START)

        # Find longest running agent
        running_agents = [a for a in agents if a.status == "running"]
        longest = ""
        if running_agents:
            most_active = max(running_agents, key=lambda a: time.time() - a.created_at)
            longest = f"\n  [#88aadd]Most active[/#88aadd]  [white]{most_active.name}[/white]"

        stats_widget.update(
            f"  [bold #ccccff]STATS[/bold #ccccff]\n"
            f"  [#88aadd]Session[/#88aadd]    [yellow]{uptime}[/yellow]\n"
            f"  [#88aadd]Running[/#88aadd]    [bold yellow]{r}[/bold yellow]\n"
            f"  [#88aadd]Done[/#88aadd]       [bold green]{d}[/bold green]\n"
            f"  [#88aadd]Failed[/#88aadd]     [bold red]{e}[/bold red]\n"
            f"  [#88aadd]Total[/#88aadd]      [white]{total}[/white]"
            f"{longest}"
        )

    def _render_output(self) -> None:
        """Render live output for the selected/auto-followed agent."""
        log = self.query_one("#live-log", RichLog)
        header = self.query_one("#output-header", Static)

        rec = self._get_active_agent()
        if rec is None:
            header.update(" LIVE OUTPUT")
            if not self._last_output:
                log.clear()
                log.write("[#888888]No agents running. Press [bold]s[/bold] to spawn one.[/#888888]")
                self._last_output = "__empty__"
            return

        mode = "[#88ff88](auto)[/#88ff88]" if self._auto_follow else "[#ffaa44](pinned)[/#ffaa44]"
        header.update(f" LIVE OUTPUT — [bold white]{rec.name}[/bold white]  {mode}")

        # Get output text
        output_text: str | None = None
        if rec.status == "running":
            output_text = capture_agent_output(rec.tmux_window, lines=100)
        elif rec.status in ("done", "error", "timeout", "killed"):
            output_text = read_output(rec.workspace)

        if not output_text:
            output_text = "(no output yet)"

        # Only re-render if output changed (avoid flicker)
        sig = f"{rec.name}:{hash(output_text)}"
        if sig == self._last_output:
            return
        self._last_output = sig

        log.clear()
        for line in output_text.splitlines()[-100:]:
            log.write(Text.from_ansi(line))
        log.scroll_end(animate=False)

    # ------------------------------------------------------------------
    # Selection
    # ------------------------------------------------------------------

    def _get_active_agent(self) -> AgentRecord | None:
        """Return the agent whose output should be shown."""
        if not self._hierarchy:
            return None

        if self._auto_follow:
            # Show most recent running agent
            running = [a for a in self._agents.values() if a.status == "running"]
            if running:
                return max(running, key=lambda a: a.created_at)
            # Fallback to most recent
            return max(self._agents.values(), key=lambda a: a.created_at)

        # Pinned: show cursor selection
        if 0 <= self._cursor_idx < len(self._hierarchy):
            return self._hierarchy[self._cursor_idx][0]
        return None

    def _selected_agent(self) -> AgentRecord | None:
        """Return agent at cursor position."""
        if 0 <= self._cursor_idx < len(self._hierarchy):
            return self._hierarchy[self._cursor_idx][0]
        return None

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        """Sync _cursor_idx when user navigates the agent tree (mouse or keyboard)."""
        if event.data_table.id != "agent-tree":
            return
        if self._updating_tree:
            return  # programmatic update — ignore
        if event.cursor_row is None:
            return
        self._cursor_idx = event.cursor_row
        self._auto_follow = False
        self._last_output = ""
        self._render_output()

    def action_cursor_up(self) -> None:
        if self._hierarchy and self._cursor_idx > 0:
            self._cursor_idx -= 1
            self._auto_follow = False
            self._last_output = ""
            self._updating_tree = True
            try:
                self.query_one("#agent-tree", DataTable).move_cursor(row=self._cursor_idx)
            finally:
                self._updating_tree = False
            self._render_output()

    def action_cursor_down(self) -> None:
        if self._hierarchy and self._cursor_idx < len(self._hierarchy) - 1:
            self._cursor_idx += 1
            self._auto_follow = False
            self._last_output = ""
            self._updating_tree = True
            try:
                self.query_one("#agent-tree", DataTable).move_cursor(row=self._cursor_idx)
            finally:
                self._updating_tree = False
            self._render_output()

    def action_toggle_follow(self) -> None:
        self._auto_follow = not self._auto_follow
        if self._auto_follow:
            self.notify("Auto-follow ON", timeout=2)
        else:
            rec = self._selected_agent()
            self.notify(f"Pinned: {rec.name}" if rec else "Pinned", timeout=2)
        self._last_output = ""
        self._render_output()

    def action_refresh(self) -> None:
        self._last_output = ""
        self._refresh_all()
        self.notify("Refreshed", timeout=1)

    def action_kill_agent(self) -> None:
        rec = self._selected_agent()
        if rec and rec.status == "running":
            kill_agent(rec.name)
            self.notify(f"Killed '{rec.name}'", severity="warning")
            self._refresh_all()
        elif rec:
            self.notify(f"'{rec.name}' is not running", severity="warning")
        else:
            self.notify("No agent selected", severity="warning")

    def action_collect(self) -> None:
        rec = self._selected_agent()
        if rec is None:
            self.notify("No agent selected", severity="warning")
            return
        if rec.status == "running":
            self.notify("Agent still running", severity="warning")
            return
        output = read_output(rec.workspace)
        if output:
            preview = output[:300] + ("..." if len(output) > 300 else "")
            self.notify(f"Output from '{rec.name}':\n{preview}")
        else:
            self.notify(f"No output from '{rec.name}'", severity="warning")

    def action_spawn(self) -> None:
        self.push_screen(SpawnScreen())

    def action_attach(self) -> None:
        rec = self._selected_agent()
        if rec and rec.status == "running":
            self.exit()
            subprocess.run(["tmux", "select-window", "-t", f"oa:{rec.tmux_window}"])
        elif rec:
            self.notify(f"'{rec.name}' is not running", severity="warning")
        else:
            self.notify("No agent selected", severity="warning")

    def action_help(self) -> None:
        self.push_screen(HelpScreen())

    def action_tab_agents(self) -> None:
        self.query_one("#main-tabs", TabbedContent).active = "tab-agents"

    def action_tab_teams(self) -> None:
        self.query_one("#main-tabs", TabbedContent).active = "tab-teams"


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run_dashboard() -> None:
    """Entry point for the dashboard."""
    app = OADashboard()
    app.run()
