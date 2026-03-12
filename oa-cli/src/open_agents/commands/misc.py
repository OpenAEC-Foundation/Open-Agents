"""Misc commands: setup, doctor, version, init, web, vscode-bridge, hooks, guardians, graveyard, docs, backlog, review, canvas import, core."""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

from ..config import OA_DIR, CONFIG_PATH, DEFAULT_CONFIG, load_config
from ..guardians import list_guardians, log_event, trigger_guardian
from ..hooks import HOOK_DIRS, ensure_hook_dirs, install_default_hooks, run_hooks
from ..spawner import spawn_agent
from ..state import get_agent
from ..tmux import session_exists
from ._helpers import _run_preflight_gate, _setup_anthropic_skills, console

import json

graveyard_app = typer.Typer(name="graveyard", help="Agent Graveyard: archive and resurrect finished agents.")
docs_app = typer.Typer(name="docs", help="Documentation generator for agent templates.")
backlog_app = typer.Typer(name="backlog", help="Manage persistent work backlog.", no_args_is_help=True)
core_app = typer.Typer(name="core", help="Core file awareness and health.")

_REVIEWER_PROMPT_TEMPLATE = """You are an adversarial reviewer for Open Agents output.

Read the agent output file at: {result_path}

Write a structured review to: {review_path}

Your review MUST include these sections:
## What Works
- List what is correct, complete, and well-done.

## What's Missing
- List gaps, missing requirements, or incomplete parts.

## Quality Score
Score: X/10 -- one-line justification.

## Recommendations
- Concrete, actionable improvements (max 5 bullet points).

Be direct and critical. Do not praise for its own sake.
Write the review to {review_path} and make a .done file when finished.
"""


def register_commands(app: typer.Typer) -> None:
    """Register all miscellaneous commands on the app."""

    @app.command()
    def setup():
        """Run preflight checks and initialise the ~/.oa/ directory."""
        from .. import preflight

        results = preflight.check_all()
        preflight.print_report(results, console=console)

        OA_DIR.mkdir(parents=True, exist_ok=True)

        if CONFIG_PATH.exists():
            try:
                existing = json.loads(CONFIG_PATH.read_text())
            except Exception:
                existing = {}
            merged = {**DEFAULT_CONFIG, **existing}
        else:
            merged = DEFAULT_CONFIG

        CONFIG_PATH.write_text(json.dumps(merged, indent=2))
        console.print(f"\n[green]Config written to {CONFIG_PATH}[/green]")

        ensure_hook_dirs()
        install_default_hooks()
        console.print(f"[green]Hook directories created in ~/.oa/hooks/[/green]")

        _setup_anthropic_skills()

        failed = [r for r in results if not r.ok]
        if failed:
            console.print("\n[yellow]Setup complete with warnings. Fix the issues above before running 'oa start'.[/yellow]")
        else:
            console.print(Panel(
                "Setup complete!\n\nNext steps:\n  1. Run [bold]oa start[/bold] to launch the tmux session\n  2. Run [bold]oa run \"<task>\"[/bold] to spawn your first agent\n  3. Run [bold]oa doctor[/bold] anytime to verify your environment\n  4. Run [bold]oa skill update[/bold] to keep skills current",
                title="[green bold]Open Agents Ready[/green bold]",
                border_style="green",
            ))

    @app.command()
    def doctor():
        """Check environment health: tmux, claude CLI, Python version, ~/.oa/ dir, and active session."""
        import shutil
        import sys

        checks = []

        tmux_path = shutil.which("tmux")
        checks.append(("tmux", bool(tmux_path), tmux_path or "not found in PATH"))

        claude_path = shutil.which("claude")
        checks.append(("claude CLI", bool(claude_path), claude_path or "not found — install: npm install -g @anthropic-ai/claude-code"))

        info = sys.version_info
        py_ok = (info.major, info.minor) >= (3, 10)
        checks.append(("Python >= 3.10", py_ok, f"{info.major}.{info.minor}.{info.micro}"))

        oa_ok = OA_DIR.exists()
        checks.append(("~/.oa/ directory", oa_ok, str(OA_DIR) if oa_ok else f"missing — run 'oa setup'"))

        session_ok = session_exists()
        checks.append(("oa session active", session_ok, "running" if session_ok else "not running — run 'oa start'"))

        all_ok = all(ok for _, ok, _ in checks)
        for name, ok, detail in checks:
            icon = "[green]✓[/green]" if ok else "[red]✗[/red]"
            console.print(f"  {icon}  {name:<22} {detail}")

        if all_ok:
            console.print("\n[green bold]All checks passed.[/green bold]")
        else:
            failed_count = sum(1 for _, ok, _ in checks if not ok)
            console.print(f"\n[red bold]{failed_count} check(s) failed.[/red bold] Run 'oa setup' to fix.")

    @app.command()
    def version():
        """Show the CLI version."""
        from .. import __version__
        console.print(f"open-agents-cli v{__version__}")

    @app.command(name="init")
    def init_cmd(
        project_type: str = typer.Option(
            "minimal", "--type", "-t",
            help="Template type: platform|skill-package|deployment|minimal",
        ),
        name: str = typer.Option("", "--name", "-n", help="Project naam"),
        project_root: str = typer.Option(
            ".", "--project-root", "-r", help="Directory voor core bestanden"
        ),
        force: bool = typer.Option(False, "--force", "-f", help="Overschrijf bestaande bestanden"),
    ) -> None:
        """Initialiseer core bestanden voor een nieuw project."""
        from datetime import date

        root = Path(project_root).resolve()
        root.mkdir(parents=True, exist_ok=True)

        project_name = name.strip() if name.strip() else root.name

        valid_types = ("platform", "skill-package", "deployment", "minimal")
        if project_type not in valid_types:
            console.print(f"[red]Onbekend type '{project_type}'. Kies uit: {', '.join(valid_types)}[/red]")
            raise typer.Exit(1)

        templates_dir = Path(__file__).parent.parent / "templates" / "init"
        template_file = templates_dir / f"{project_type}.md"
        claude_md_content = template_file.read_text(encoding="utf-8").replace("{project_name}", project_name)

        today = date.today().isoformat()

        created: list[str] = []
        skipped: list[str] = []

        def _write(path: Path, content: str) -> None:
            if path.exists() and not force:
                skipped.append(str(path.relative_to(root)))
                return
            path.write_text(content, encoding="utf-8")
            created.append(str(path.relative_to(root)))

        _write(root / "CLAUDE.md", claude_md_content)
        _write(root / "ROADMAP.md", f"# ROADMAP — {project_name}\n\n> **Status**: 0% — Initieel\n> **Laatste update**: {today}\n\n## Fase 1 — Setup\n- [ ] Project initialisatie\n")
        _write(root / "LESSONS.md", f"# LESSONS — {project_name}\n\nGeleerde lessen. Genummerd L-001+. Nooit bewerken, alleen toevoegen.\n\n<!-- L-001 — Eerste les hier -->\n")
        _write(root / "DECISIONS.md", f"# DECISIONS — {project_name}\n\nArchitectuurbeslissingen. Genummerd D-001+.\n\n<!-- D-001 — Eerste beslissing hier -->\n")
        _write(root / "INDEX.md", f"# INDEX — {project_name}\n\n| Bestand | Doel | Type |\n|---------|------|------|\n| CLAUDE.md | Werkwijze en conventies | Instructies |\n| ROADMAP.md | Status en voortgang | Staat |\n| LESSONS.md | Geleerde lessen | Kennis |\n| DECISIONS.md | Architectuurbeslissingen | Kennis |\n")

        skills_dir = root / ".claude" / "skills"
        skills_dir.mkdir(parents=True, exist_ok=True)
        created.append(".claude/skills/")

        console.print(Panel(f"[bold green]oa init — {project_name}[/bold green]", subtitle=f"type: {project_type}"))
        if created:
            console.print("[green]Aangemaakt:[/green]")
            for f in created:
                console.print(f"  [green]✓[/green] {f}")
        if skipped:
            console.print("[yellow]Overgeslagen (gebruik --force om te overschrijven):[/yellow]")
            for f in skipped:
                console.print(f"  [yellow]–[/yellow] {f}")

    @app.command()
    def web(
        port: int = typer.Option(5174, "--port", "-p", help="Bridge server port"),
    ):
        """Start the web UI (React SPA + local bridge server)."""
        from ..bridge import run_bridge

        console.print(f"[bold cyan]Starting Open Agents web UI...[/bold cyan]")
        console.print(f"  Bridge: http://localhost:{port}")
        console.print(f"  Web UI: http://localhost:{port}")
        console.print("[dim]Press Ctrl-C to stop[/dim]\n")
        run_bridge(port=port)

    @app.command(name="vscode-bridge")
    def vscode_bridge(
        port: int = typer.Option(5175, "--port", "-p", help="VS Code bridge server port"),
    ):
        """Start the VS Code bridge server (lightweight REST/SSE API on port 5175)."""
        from ..bridge import start_vscode_bridge

        console.print(f"[bold cyan]Starting VS Code bridge...[/bold cyan]")
        console.print(f"  Bridge: http://localhost:{port}")
        console.print(f"  Health: http://localhost:{port}/health")
        console.print("[dim]Press Ctrl-C to stop[/dim]\n")
        start_vscode_bridge(port=port)

    @app.command()
    def hooks(
        action: str = typer.Argument("list", help="Action: list | run <event> | install"),
        event: str = typer.Argument(None, help="Event name for 'run' action"),
    ):
        """Manage post-run hooks. Actions: list, run <event>, install."""
        if action == "list":
            console.print("[bold]Hook directories:[/bold]")
            for ev, path in HOOK_DIRS.items():
                scripts = []
                if path.exists():
                    scripts = sorted(p.name for p in path.iterdir() if p.is_file())
                status = f"[green]{len(scripts)} script(s)[/green]" if scripts else "[dim]empty[/dim]"
                console.print(f"  [cyan]{ev}[/cyan]  {path}  {status}")
                for s in scripts:
                    console.print(f"    • {s}")

        elif action == "run":
            if not event:
                console.print("[red]Specify an event name: oa hooks run <event>[/red]")
                raise typer.Exit(1)
            if event not in HOOK_DIRS:
                console.print(f"[red]Unknown event '{event}'. Valid: {list(HOOK_DIRS.keys())}[/red]")
                raise typer.Exit(1)
            env = {
                "OA_AGENT_NAME": "manual",
                "OA_RUN_ID": "manual",
                "OA_RUN_LOG_PATH": "",
                "OA_EXIT_STATUS": "manual",
            }
            outputs = run_hooks(event, env)
            console.print(f"[green]Ran {len(outputs)} hook(s) for event '{event}'.[/green]")
            for i, out in enumerate(outputs, 1):
                if out:
                    console.print(f"  [{i}] {out}")

        elif action == "install":
            install_default_hooks()
            console.print("[green]Default hooks installed in ~/.oa/hooks/post-run/[/green]")

        else:
            console.print(f"[red]Unknown action '{action}'. Use: list | run <event> | install[/red]")
            raise typer.Exit(1)

    @app.command(name="guardians")
    def guardians_cmd(
        register: bool = typer.Option(False, "--register", help="Register a new guardian (interactive)"),
        trigger: str = typer.Option("", "--trigger", help="Manually trigger guardians for an event type"),
        context: str = typer.Option("", "--context", help="Batch context description; spawns all three guardian agents (lessons, roadmap, decisions)"),
        install_hook: bool = typer.Option(False, "--install-hook", help="Install the post-run 03-auto-lessons.sh hook"),
    ):
        """List, trigger, or register guardian agents."""
        from rich.table import Table

        if install_hook:
            from ..hooks import install_guardian_hook
            hook_path = install_guardian_hook()
            console.print(f"[green]Guardian hook installed at {hook_path}[/green]")
            console.print("[dim]Set OA_AUTO_GUARDIANS=1 in your environment to enable it.[/dim]")
            return

        if context:
            from ..guardian import GuardianAgent
            ga = GuardianAgent(batch_context=context)
            records = ga.spawn_all_guardians()
            if records:
                names = ", ".join(r.name for r in records)
                console.print(f"[green]Spawned {len(records)} guardian(s): {names}[/green]")
            else:
                console.print("[yellow]No guardians could be spawned (session running?).[/yellow]")
            return

        if trigger:
            triggered = trigger_guardian(trigger)
            if triggered:
                console.print(f"[green]Triggered {len(triggered)} guardian(s): {', '.join(triggered)}[/green]")
            else:
                console.print(f"[yellow]No guardians registered for event '{trigger}'.[/yellow]")
            return

        items = list_guardians()
        if not items:
            console.print("[dim]No guardians registered.[/dim]")
            return

        table = Table(title="Registered Guardians")
        table.add_column("Name", style="cyan")
        table.add_column("Trigger", style="yellow")
        table.add_column("Model", style="green")
        table.add_column("Task (preview)", max_width=50)

        for g in items:
            table.add_row(g["name"], g["trigger"], g["model"], g["task_preview"])

        console.print(table)

    @app.command()
    def review(
        agent_name: str = typer.Argument(..., help="Agent name whose output to review"),
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Reviewer model"),
    ):
        """Spawn an adversarial reviewer agent on the output of another agent."""
        if not session_exists():
            console.print("[red]No oa session. Run 'oa start' first.[/red]")
            raise typer.Exit(1)

        rec = get_agent(agent_name)
        if rec is None:
            console.print(f"[red]Agent '{agent_name}' not found.[/red]")
            raise typer.Exit(1)

        workspace = Path(rec.workspace)
        result_path = workspace / "output" / "result.md"
        review_path = workspace / "output" / "review.md"

        if not result_path.exists():
            console.print(f"[red]No result.md found at {result_path}[/red]")
            raise typer.Exit(1)

        reviewer_name = f"reviewer-{agent_name}"
        task = _REVIEWER_PROMPT_TEMPLATE.format(
            result_path=str(result_path),
            review_path=str(review_path),
        )

        try:
            reviewer_rec = spawn_agent(reviewer_name, task, model=model)
        except RuntimeError as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

        console.print(f"[green]Reviewer agent '{reviewer_rec.name}' spawned[/green]  (model: {model})")
        console.print(f"  Reviewing: {result_path}")
        console.print(f"  Output:    {review_path}")

    @app.command(name="import")
    def canvas_import(
        file: str = typer.Argument(..., help="Pad naar het canvas export JSON-bestand"),
        dry_run: bool = typer.Option(False, "--dry-run", help="Toon pipeline stappen zonder agents te spawnen"),
        model: str = typer.Option("", "--model", "-m", help="Overschrijf model voor alle agents (bijv. claude/opus)"),
    ):
        """Importeer een Canvas export en spawn de pipeline als oa agents."""
        from ..canvas_import import parse_canvas_export, convert_to_pipeline

        if not session_exists() and not dry_run:
            console.print("[red]No oa session. Run 'oa start' first.[/red]")
            raise typer.Exit(1)

        try:
            canvas_data = parse_canvas_export(file)
        except (FileNotFoundError, ValueError) as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

        steps = convert_to_pipeline(canvas_data)
        if not steps:
            console.print("[yellow]Geen agent-nodes gevonden in canvas export.[/yellow]")
            raise typer.Exit(0)

        pipeline_name = canvas_data.get("name", "canvas-pipeline")
        console.print(f"[bold cyan]Canvas import:[/bold cyan] '{pipeline_name}' — {len(steps)} stap(pen)")

        for step in steps:
            effective_model = model or step["model"]
            deps_str = f"  \u2190 {', '.join(step['depends_on'])}" if step["depends_on"] else ""
            console.print(f"  [cyan]{step['name']}[/cyan]  model={effective_model}{deps_str}")

        if dry_run:
            console.print("[dim]--dry-run: geen agents gespawnt.[/dim]")
            return

        for step in steps:
            effective_model = model or step["model"]
            try:
                rec = spawn_agent(name=step["name"], task=step["task"], model=effective_model)
                console.print(f"  [green]✓[/green] {rec.name}  (workspace: {rec.workspace})")
            except RuntimeError as e:
                console.print(f"  [red]✗[/red] {step['name']}: {e}")

    # --- Graveyard sub-app ---

    @graveyard_app.command(name="list")
    def graveyard_list(
        status: str = typer.Option(None, "--status", "-s", help="Filter by exit status (done/error/killed/failed/timeout)"),
    ):
        """List all archived agents in the graveyard."""
        from ..graveyard import AgentGraveyard

        g = AgentGraveyard()
        entries = g.list_archived(status_filter=status)
        if not entries:
            console.print("[yellow]Graveyard is empty.[/yellow]")
            raise typer.Exit(0)

        console.print(f"[bold]Graveyard[/bold] — {len(entries)} entr{'y' if len(entries) == 1 else 'ies'}\n")
        for e in entries:
            run_id = e.get("run_id", "?")
            name = e.get("agent_name", "?")
            exit_status = e.get("exit_status", "?")
            archived_at = e.get("archived_at", "")[:10]
            duration = e.get("duration_seconds")
            dur_str = f"  {duration:.1f}s" if duration is not None else ""
            color = "green" if exit_status == "done" else "red"
            console.print(f"  [{color}]{exit_status:8}[/{color}]  [cyan]{run_id}[/cyan]  ({name})  {archived_at}{dur_str}")

    @graveyard_app.command(name="resurrect")
    def graveyard_resurrect(
        run_id: str = typer.Argument(..., help="run_id of the archived agent to resurrect"),
        task: str = typer.Option(None, "--task", "-t", help="Override the original task"),
        model: str = typer.Option(None, "--model", "-m", help="Override the model (e.g. claude/sonnet)"),
        dry_run: bool = typer.Option(False, "--dry-run", help="Show spawn parameters without spawning"),
    ):
        """Resurrect an archived agent by spawning it again with its original task."""
        from ..graveyard import AgentGraveyard

        g = AgentGraveyard()
        params = g.resurrect(run_id, new_task=task)
        if not params:
            console.print(f"[red]No graveyard entry found for run_id: {run_id}[/red]")
            raise typer.Exit(1)

        effective_model = model or params["model"]
        spawn_name = params["name"]
        spawn_task = params["task"]

        console.print(f"[bold cyan]Resurrect:[/bold cyan] {run_id} \u2192 [cyan]{spawn_name}[/cyan]")
        ellipsis = "\u2026" if len(spawn_task) > 80 else ""
        console.print(f"  Task:  {spawn_task[:80]}{ellipsis}")
        console.print(f"  Model: {effective_model}")

        if dry_run:
            console.print("[dim]--dry-run: agent not spawned.[/dim]")
            return

        if not session_exists():
            console.print("[red]No oa session running. Run 'oa start' first.[/red]")
            raise typer.Exit(1)

        try:
            rec = spawn_agent(name=spawn_name, task=spawn_task, model=effective_model)
            console.print(f"[green]✓ Resurrected as '{rec.name}'[/green]  (workspace: {rec.workspace})")
        except RuntimeError as e:
            console.print(f"[red]Spawn failed: {e}[/red]")
            raise typer.Exit(1)

    app.add_typer(graveyard_app)

    # --- Docs sub-app ---

    @docs_app.command(name="generate")
    def docs_generate(
        library_dir: str = typer.Option(None, "--library", "-l", help="Path to agents/library dir (overrides default)"),
        output: str = typer.Option(None, "--output", "-o", help="Write report to this path instead of ~/.oa/doc-report.md"),
        no_changelog: bool = typer.Option(False, "--no-changelog", help="Skip CHANGELOG.md update"),
    ):
        """Generate documentation from agent library templates and update CHANGELOG."""
        from ..doc_generator import DocGenerator

        gen = DocGenerator(library_dir=library_dir)
        report = gen.generate_template_docs()

        if output:
            try:
                Path(output).write_text(report, encoding="utf-8")
                console.print(f"[green]Report written to:[/green] {output}")
            except OSError as exc:
                console.print(f"[red]Could not write to {output}: {exc}[/red]")
                raise typer.Exit(1)
        else:
            from ..doc_generator import REPORT_PATH
            console.print(f"[green]Report written to:[/green] {REPORT_PATH}")

        score = gen.get_quality_score()
        console.print(f"[bold]Quality score:[/bold] {score:.1%}  ({len(gen._load_templates())} templates)")

        if not no_changelog:
            ok = gen.update_changelog("docs regenerated")
            if ok:
                console.print("[green]CHANGELOG.md updated.[/green]")
            else:
                console.print("[yellow]Could not update CHANGELOG.md (file may not exist).[/yellow]")

    app.add_typer(docs_app)

    # --- Backlog sub-app ---

    @backlog_app.command("list")
    def backlog_list(
        priority: str = typer.Option(None, "--priority", "-p", help="Filter by priority: high|medium|low"),
    ):
        """List all open backlog items, sorted by priority."""
        from ..backlog import BacklogStore
        from rich.table import Table

        store = BacklogStore()
        items = store.list(priority=priority)
        if not items:
            console.print("[dim]No open backlog items.[/dim]")
            return

        table = Table(title="Backlog")
        table.add_column("ID", style="dim")
        table.add_column("Priority", style="bold")
        table.add_column("Title")
        table.add_column("Description", max_width=50)

        priority_colors = {"high": "red", "medium": "yellow", "low": "green"}
        for item in items:
            prio = item.get("priority", "medium")
            color = priority_colors.get(prio, "white")
            table.add_row(
                item["id"],
                f"[{color}]{prio}[/{color}]",
                item["title"],
                item.get("description", "") or "[dim]-[/dim]",
            )
        console.print(table)

    @backlog_app.command("add")
    def backlog_add(
        title: str = typer.Argument(..., help="Backlog item title"),
        priority: str = typer.Option("medium", "--priority", "-p", help="Priority: high|medium|low"),
        description: str = typer.Option("", "--desc", "-d", help="Optional description"),
    ):
        """Add a new item to the backlog."""
        from ..backlog import BacklogStore

        store = BacklogStore()
        item_id = store.add(title, description=description, priority=priority)
        console.print(f"[green]Added backlog item[/green]  id={item_id}  priority={priority}")
        console.print(f"  Title: {title}")

    @backlog_app.command("done")
    def backlog_done(
        item_id: str = typer.Argument(..., help="Backlog item ID to mark as done"),
    ):
        """Mark a backlog item as done."""
        from ..backlog import BacklogStore

        store = BacklogStore()
        try:
            store.done(item_id)
            console.print(f"[green]Backlog item '{item_id}' marked as done.[/green]")
        except KeyError as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

    app.add_typer(backlog_app)

    # --- Core sub-app ---

    @core_app.command("status")
    def core_status():
        """Show status of all core files — staleness, last updated."""
        from ..core_files import get_status
        from rich.table import Table

        statuses = get_status()
        table = Table(title="Core Files Status", show_lines=False)
        table.add_column("Name", style="bold")
        table.add_column("Role", style="dim")
        table.add_column("Exists", justify="center")
        table.add_column("Last Updated", justify="right")
        table.add_column("Status", justify="center")

        for s in statuses:
            exists_icon = "[green]✓[/green]" if s["exists"] else "[red]✗[/red]"
            if not s["exists"]:
                last_updated = "[dim]—[/dim]"
                status_icon = "[red]❌ missing[/red]"
            elif s["is_stale"]:
                days = s["days_since_update"]
                last_updated = f"{days}d ago"
                status_icon = "[yellow]⚠ stale[/yellow]"
            else:
                days = s["days_since_update"]
                last_updated = f"{days}d ago" if days is not None else "—"
                status_icon = "[green]✅ fresh[/green]"

            table.add_row(s["name"], s["role"], exists_icon, last_updated, status_icon)

        console.print(table)

    @core_app.command("handoff")
    def core_handoff():
        """Show summary of the most recent HANDOFF document."""
        from ..core_files import read_handoff_summary, get_latest_handoff

        path = get_latest_handoff()
        title = f"[bold]Laatste HANDOFF[/bold]" + (f" — [dim]{path.name}[/dim]" if path else "")
        summary = read_handoff_summary()
        console.print(Panel(summary, title=title, border_style="cyan", padding=(0, 1)))

    app.add_typer(core_app)
