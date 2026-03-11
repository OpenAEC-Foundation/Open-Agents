"""CLI — typer commands for the Open Agents orchestrator."""

from __future__ import annotations

import json
import time
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

from . import __version__
from .config import OA_DIR, CONFIG_PATH, DEFAULT_CONFIG, load_config
from .monitor import print_status, print_status_with_context
from .utils import format_model_rich, generate_agent_name
from .lifecycle import attach_agent, check_agent, clean_finished, kill_agent
from .orchestrator import spawn_with_orchestrator
from .spawner import spawn_agent, spawn_remote_agent
from .tmux import session_exists, start_session
from .state import get_agent, list_agents, update_agent
from .messaging import broadcast_message, mark_read, poll_shutdown_response, read_inbox, send_message, shutdown_request, unread_count
from .workspace import read_output, remote_is_done, sync_output_from_remote
from .prompt_templates import L010_TEMPLATE_NAMES, apply_template, validate_prompt
from .context_gap_detector import detect_gaps, write_audit
from .invocation_validator import InvocationValidator
from .budget_tracker import start_budget
from .guardians import list_guardians, log_event, register_guardian, trigger_guardian
from .hooks import HOOK_DIRS, ensure_hook_dirs, install_default_hooks, run_hooks
from .session import detect_previous_shutdown, ShutdownMode
from .session_store import get_latest_session, list_sessions, cleanup_sessions
from .session_cleanup import session_cleanup
from .config import get_disconnect_config

app = typer.Typer(
    name="oa",
    help="Open Agents — tmux-based multi-agent orchestrator for Claude Code.",
    no_args_is_help=True,
)
console = Console()

def _resolve_library_dir() -> Path:
    """Resolve agents/library path: config > env > repo root (3 levels up from package)."""
    import os
    cfg = load_config()
    if "agents_library" in cfg:
        return Path(cfg["agents_library"])
    if "OA_AGENTS_LIBRARY" in os.environ:
        return Path(os.environ["OA_AGENTS_LIBRARY"])
    # Installed in editable mode: cli.py → open_agents/ → src/ → oa-cli/ → repo root
    return Path(__file__).parents[3] / "agents" / "library"


AGENTS_LIBRARY_DIR = _resolve_library_dir()


def _load_template(template_id: str) -> dict:
    """Search all JSON files in agents/library/ for a template with the given id (filename stem)."""
    if not AGENTS_LIBRARY_DIR.exists():
        console.print(f"[red]Agents library not found at {AGENTS_LIBRARY_DIR}[/red]")
        raise typer.Exit(1)

    for json_file in AGENTS_LIBRARY_DIR.rglob("*.json"):
        if json_file.stem == template_id:
            try:
                return json.loads(json_file.read_text())
            except Exception:
                console.print(f"[red]Failed to parse template file: {json_file}[/red]")
                raise typer.Exit(1)

    console.print(f"[red]Template '{template_id}' not found in agents/library/[/red]")
    raise typer.Exit(1)


def _load_skills(skill_ids: str) -> str:
    """Load one or more skill SKILL.md files by id (comma-separated).

    Resolution order per skill id:
    1. agents/library/**/<id>.json  → reads 'skillRef' field → resolves relative to skill package
    2. .claude/skills/**/<id>/SKILL.md  in current working dir (project skill package)
    3. ~/.claude/skills/**/<id>/SKILL.md  (global fallback)

    Returns a formatted context block ready to prepend to any agent prompt.
    """
    import os
    ids = [s.strip() for s in skill_ids.split(",") if s.strip()]
    blocks: list[str] = []

    cfg = load_config()
    # Search roots: skill_packages from config + .claude/skills in cwd + global ~/.claude/skills
    skill_search_roots = [
        *(Path(p) / ".claude" / "skills" for p in cfg.get("skill_packages", [])),
        Path.cwd() / ".claude" / "skills",
        Path.home() / ".claude" / "skills",
    ]

    for skill_id in ids:
        content: str | None = None

        # Strategy 1: find via template JSON skillRef → search in all skill_packages
        lib_dir = _resolve_library_dir()
        if lib_dir.exists():
            for jf in lib_dir.rglob("*.json"):
                if jf.stem == skill_id:
                    try:
                        tmpl = json.loads(jf.read_text())
                        skill_ref = tmpl.get("skillRef", "")
                        if skill_ref:
                            # Try each skill package root for this skillRef
                            search_bases = [
                                lib_dir.parents[1],  # Open-Agents repo root
                                *(Path(p) for p in cfg.get("skill_packages", [])),
                            ]
                            for base in search_bases:
                                skill_path = base / skill_ref
                                if skill_path.exists():
                                    content = skill_path.read_text()
                                    break
                        if content:
                            break
                    except Exception:
                        pass

        # Strategy 2+: search .claude/skills/ directories
        if content is None:
            for root in skill_search_roots:
                if not root.exists():
                    continue
                for skill_dir in root.rglob(skill_id):
                    if skill_dir.is_dir():
                        candidate = skill_dir / "SKILL.md"
                        if candidate.exists():
                            content = candidate.read_text()
                            break
                if content:
                    break

        if content:
            blocks.append(f"## SKILL CONTEXT: {skill_id}\n\n{content.strip()}")
        else:
            blocks.append(f"## SKILL CONTEXT: {skill_id}\n\n[Skill not found — id: {skill_id}]")

    if not blocks:
        return ""
    return "\n\n---\n\n".join(blocks)


def _run_preflight_gate() -> bool:
    """Run preflight checks and return True if all pass, False otherwise.

    On failure, prints a Rich error panel with fix hints per failing check.
    """
    from . import preflight

    results = preflight.check_all()
    failed = [r for r in results if not r.ok]
    if not failed:
        return True

    lines = []
    for r in failed:
        lines.append(f"[bold red]{r.name}[/bold red]: {r.message}")
        if r.fix_hint:
            lines.append(f"  [dim]Fix:[/dim] {r.fix_hint}")

    console.print(
        Panel(
            "\n".join(lines),
            title="[red bold]Preflight checks failed[/red bold]",
            border_style="red",
        )
    )
    console.print("[dim]Run 'oa setup' to see the full report.[/dim]")
    return False


@app.command()
def setup():
    """Run preflight checks and initialise the ~/.oa/ directory."""
    from . import preflight

    results = preflight.check_all()
    preflight.print_report(results, console=console)

    # Create ~/.oa/ directory if it doesn't exist
    OA_DIR.mkdir(parents=True, exist_ok=True)

    # Write config.json with defaults (don't overwrite existing keys)
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

    # Create hook directories and install default hooks
    ensure_hook_dirs()
    install_default_hooks()
    console.print(f"[green]Hook directories created in ~/.oa/hooks/[/green]")

    failed = [r for r in results if not r.ok]
    if failed:
        console.print("\n[yellow]Setup complete with warnings. Fix the issues above before running 'oa start'.[/yellow]")
    else:
        console.print(Panel(
            "Setup complete!\n\nNext steps:\n  1. Run [bold]oa start[/bold] to launch the tmux session\n  2. Run [bold]oa run \"<task>\"[/bold] to spawn your first agent\n  3. Run [bold]oa doctor[/bold] anytime to verify your environment",
            title="[green bold]Open Agents Ready[/green bold]",
            border_style="green",
        ))


@app.command()
def doctor():
    """Check environment health: tmux, claude CLI, Python version, ~/.oa/ dir, and active session."""
    import shutil
    import sys

    checks = []

    # tmux
    tmux_path = shutil.which("tmux")
    checks.append(("tmux", bool(tmux_path), tmux_path or "not found in PATH"))

    # claude CLI
    claude_path = shutil.which("claude")
    checks.append(("claude CLI", bool(claude_path), claude_path or "not found — install: npm install -g @anthropic-ai/claude-code"))

    # Python >= 3.10
    info = sys.version_info
    py_ok = (info.major, info.minor) >= (3, 10)
    checks.append(("Python >= 3.10", py_ok, f"{info.major}.{info.minor}.{info.micro}"))

    # ~/.oa/ directory
    oa_ok = OA_DIR.exists()
    checks.append(("~/.oa/ directory", oa_ok, str(OA_DIR) if oa_ok else f"missing — run 'oa setup'"))

    # Active oa session
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
def start(
    chat: bool = typer.Option(True, "--chat/--no-chat", help="Enter interactive chat mode after starting the session (default: True)"),
    fresh: bool = typer.Option(False, "--fresh", help="Discard previous session state and start clean"),
):
    """Start the oa tmux session with a dashboard window."""
    if not _run_preflight_gate():
        raise typer.Exit(1)

    from .tmux import SESSION_NAME, _tmux
    from datetime import datetime

    if not fresh:
        mode, info = detect_previous_shutdown()

        if mode == ShutdownMode.DETACH:
            # tmux session is still alive — resume by reattaching
            latest = get_latest_session()
            console.print(Panel(
                _format_resume_banner(latest, info),
                title="[bold cyan]Session Resumed[/bold cyan]",
                border_style="cyan",
            ))
            _tmux(f"attach-session -t {SESSION_NAME}", check=False)
            if chat:
                from .chat import ChatSession
                ChatSession().start()
            return

        if mode == ShutdownMode.CRASH:
            # tmux is dead but lock file exists — crash recovery
            latest = get_latest_session()
            console.print(Panel(
                _format_crash_banner(latest, info),
                title="[bold red]Crash Recovery[/bold red]",
                border_style="red",
            ))
            # Release stale lock, then start fresh
            from .session import release_session_lock
            release_session_lock()

        if mode == ShutdownMode.CLEAN:
            # Show one-liner about last session if available
            latest = get_latest_session()
            if latest:
                summary = latest.agent_summary
                total = summary.get("total", 0)
                done = summary.get("done", 0)
                ts = latest.session_id
                console.print(f"[dim]Last session: {ts} — {done}/{total} agents completed  ·  `oa session` for details[/dim]")

    created = start_session()
    if created:
        console.print("[green]Session 'oa' created with dashboard window.[/green]")
    else:
        console.print("[yellow]Session 'oa' already exists.[/yellow]")

    if chat:
        from .chat import ChatSession
        ChatSession().start()


def _format_resume_banner(latest, info: dict) -> str:
    """Format the resume banner for DETACH mode."""
    lines = []
    if latest:
        summary = latest.agent_summary
        done = summary.get("done", 0)
        running = summary.get("running", 0)
        failed = summary.get("failed", 0)
        parts = []
        if done:
            parts.append(f"{done} done")
        if running:
            parts.append(f"{running} still running")
        if failed:
            parts.append(f"{failed} failed")
        lines.append(f"Agents: {' · '.join(parts)}" if parts else "Agents: none tracked")
        git = latest.git_state
        uncommitted = git.get("uncommitted_files", [])
        if uncommitted:
            lines.append(f"Git:    {len(uncommitted)} uncommitted file(s)")
        branch = git.get("branch", "")
        if branch:
            lines.append(f"Branch: {branch}")
    else:
        lines.append("Previous session detected (tmux alive)")
    lines.append("")
    lines.append("[dim]Run `oa session` for details  ·  `oa start --fresh` to discard[/dim]")
    return "\n".join(lines)


def _format_crash_banner(latest, info: dict) -> str:
    """Format the crash recovery banner."""
    lines = ["Previous session did not shut down cleanly."]
    heartbeat_age = info.get("heartbeat_age_seconds")
    if heartbeat_age is not None:
        minutes = int(heartbeat_age // 60)
        lines.append(f"Last heartbeat: {minutes} min ago")
    if latest:
        summary = latest.agent_summary
        done = summary.get("done", 0)
        running = summary.get("running", 0)
        failed = summary.get("failed", 0)
        total = summary.get("total", 0)
        lines.append(f"Last snapshot: {latest.session_id}  ({total} agents: {done} done, {running} running, {failed} failed)")
        git = latest.git_state
        uncommitted = git.get("uncommitted_files", [])
        if uncommitted:
            lines.append(f"Uncommitted files: {len(uncommitted)}")
    lines.append("")
    lines.append("Starting fresh session after cleanup...")
    return "\n".join(lines)


@app.command()
def run(
    task: str = typer.Argument(None, help="The task description for the agent"),
    name: str = typer.Option("", "--name", "-n", help="Agent name (auto-generated if empty)"),
    model: str = typer.Option("claude", "--model", "-m", help="Model: 'claude' or 'ollama/<model>' (e.g. ollama/qwen3:8b)"),
    parent: str = typer.Option("", "--parent", "-p", help="Parent/orchestrator agent name (for hierarchy)"),
    workspace: str = typer.Option("", "--workspace", "-w", help="Use existing workspace directory (skips workspace creation)"),
    direct: bool = typer.Option(True, "--direct", "-d", help="Direct write mode (default: True). Use --tmp for temporary workspace."),
    tmp: bool = typer.Option(False, "--tmp", help="Write output to /tmp instead of project dir (old default)"),
    template: str = typer.Option("", "--template", "-t", help="Agent template ID from agents/library/"),
    context_skills: str = typer.Option("", "--context-skills", "-cs", help="Comma-separated skill IDs to inject as context (e.g. 'sverchok-errors-common,sverchok-syntax-scripting')"),
    agent_type: str = typer.Option("", "--type", help="Agent type for skill loading (researcher/code-worker/planner/reviewer/orchestrator)"),
    guardians: bool = typer.Option(False, "--guardians/--no-guardians", help="Trigger batch_complete guardians after spawning"),
    remote: str = typer.Option("", "--remote", "-r", help="Remote SSH host voor remote execution (bijv. 'hetzner' of 'user@host')"),
    strict: bool = typer.Option(False, "--strict", help="Fail if prompt is missing L-010 elements (absolute paths, scope, output)"),
    can_spawn: bool = typer.Option(False, "--can-spawn", help="Configure agent as orchestrator that can spawn child agents via oa run"),
    docker: bool = typer.Option(False, "--docker", help="Run agent in Docker container (requires Docker)"),
    skip_context_check: bool = typer.Option(False, "--skip-context-check", help="Skip context gap pre-flight check"),
    budget: int = typer.Option(None, "--budget", help="Token budget for this run (optional, no limit if omitted)"),
    no_autocompact: bool = typer.Option(False, "--no-autocompact", help="Disable auto-compaction for this agent (overrides OA_COMPACT_THRESHOLD)"),
):
    """Spawn an agent with a task in a new tmux window."""
    if not remote and not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
        raise typer.Exit(1)

    # Apply L-010 prompt template if name matches a built-in template
    if template and template in L010_TEMPLATE_NAMES:
        if not task:
            console.print(f"[red]No task provided. Required when using L-010 template '{template}'.[/red]")
            raise typer.Exit(1)
        task = apply_template(task, template)
        console.print(f"[dim]L-010 template applied: {template}[/dim]")
    elif template:
        tmpl = _load_template(template)
        system_prompt = tmpl.get("systemPrompt", "")
        task = (system_prompt + "\n\n" + task).strip() if task else system_prompt
        if model == "claude" and tmpl.get("modelHint"):
            model = tmpl["modelHint"]
        # Auto-inject skillRef from template if no explicit --context-skills given
        if not context_skills and tmpl.get("skillRef"):
            context_skills = Path(tmpl["skillRef"]).parent.name  # use skill dir name as id

    if context_skills:
        skill_block = _load_skills(context_skills)
        if skill_block:
            task = (task + "\n\n---\n\n" + skill_block).strip() if task else skill_block
            console.print(f"[dim]Skills injected: {context_skills}[/dim]")

    if not task:
        console.print("[red]No task provided. Pass a task argument or use --template.[/red]")
        raise typer.Exit(1)

    if strict:
        warnings = validate_prompt(task)
        for w in warnings:
            console.print(f"[yellow]{w}[/yellow]")
        if warnings:
            console.print("[red]--strict: prompt faalt L-010 validatie. Voeg ontbrekende elementen toe of gebruik --template.[/red]")
            raise typer.Exit(1)

    # Invocation Quality Gate (#33): score prompt on 5 dimensions
    _quality = InvocationValidator().score(task)
    _total = _quality["total_score"]
    _normalized = _total / 5.0
    if _normalized < 0.5:  # threshold: < 0.5 normalized (< 2.5/5)
        console.print(f"[yellow]⚠ Lage prompt kwaliteit (score: {_normalized:.1f}). Tip: voeg absolute paden + expliciete scope toe.[/yellow]")
        for w in _quality["warnings"]:
            console.print(f"[yellow]  • {w}[/yellow]")
        if strict:
            console.print("[red]--strict: invocation quality score too low (< 0.5). Improve your prompt.[/red]")
            raise typer.Exit(1)
    else:
        console.print(f"[dim]Invocation quality: {_normalized:.1f}/1.0 ({_total}/5)[/dim]")

    if not name:
        name = generate_agent_name(task)

    # Token Budget Allocator (#45): persist budget if provided
    if budget is not None:
        start_budget(name, budget)
        console.print(f"[dim]Token budget set: {budget} tokens for '{name}'[/dim]")

    # Context gap pre-flight check
    _context_gaps: list[str] = []
    if not skip_context_check:
        _context_gaps = detect_gaps(task)
        if _context_gaps:
            gaps_summary = ", ".join(_context_gaps)
            console.print(f"[yellow]⚠ Context gaps gedetecteerd: {gaps_summary}[/yellow]")

    ws = Path(workspace) if workspace else None
    if tmp:
        proj_root = None
    else:
        proj_root = str(Path.cwd()) if direct else None

    # Docker runtime: opt-in via --docker flag with graceful fallback
    use_docker = False
    if docker:
        from .docker_runtime import DockerAgentRuntime
        docker_rt = DockerAgentRuntime()
        if docker_rt.is_available() and docker_rt.image_exists():
            use_docker = True
        else:
            if not docker_rt.is_available():
                console.print("[yellow]Docker not available, falling back to tmux.[/yellow]")
            elif not docker_rt.image_exists():
                console.print("[yellow]Docker image 'oa-agent:latest' not found. Build with: docker build -f Dockerfile.agent -t oa-agent:latest .[/yellow]")
                console.print("[yellow]Falling back to tmux.[/yellow]")

    try:
        if remote:
            rec = spawn_remote_agent(name, task, host=remote, model=model, direct=direct)
        elif use_docker:
            from .workspace import create_workspace, _AGENT_PATH
            from .spawner import CLAUDE_MODEL_MAP, _validate_claude_model, CLAUDE_CMD
            import shlex as _shlex
            import time as _time
            from .state import AgentRecord, add_agent

            agent_ws = ws if ws else create_workspace(name, task, project_root=proj_root)
            agent_ws = Path(agent_ws)

            if model.startswith("claude/"):
                claude_model = CLAUDE_MODEL_MAP.get(model)
                if claude_model is None:
                    claude_model = model.split("/", 1)[1]
                claude_model = _validate_claude_model(claude_model)
            else:
                claude_model = None

            model_flag = f" --model {_shlex.quote(claude_model)}" if claude_model else ""
            claude_prompt = "Lees CLAUDE.md en voer de taak uit. Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."
            docker_cmd = (
                f"export PATH=\"{_AGENT_PATH}:$PATH\" && "
                f"cd /workspace && "
                f"unset CLAUDECODE && "
                f"{CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {_shlex.quote(claude_prompt)}; "
                f"touch .done; "
                f"echo '--- Agent {_shlex.quote(name)} finished ---'"
            )

            container_id = docker_rt.spawn_agent(
                workspace=agent_ws,
                project_root=Path(proj_root) if proj_root else None,
                command=docker_cmd,
                name=name,
            )

            rec = AgentRecord(
                name=name,
                task=task,
                workspace=str(agent_ws),
                tmux_window=f"docker:{container_id[:12]}",
                model=model,
                status="running",
                created_at=_time.time(),
                parent=parent or None,
                project_root=proj_root,
            )
            add_agent(rec)
        else:
            rec = spawn_agent(name, task, model=model, workspace=ws, parent=parent or None, project_root=proj_root, agent_type=agent_type, can_spawn=can_spawn)
    except RuntimeError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    # Persist no_autocompact flag on the agent record if set
    if no_autocompact:
        update_agent(rec.name, no_autocompact=True)

    model_label = format_model_rich(rec.model)
    parent_label = f"  (child of [bold]{rec.parent}[/bold])" if rec.parent else ""
    remote_label = f"  [dim](remote: {remote})[/dim]" if remote else ""
    docker_label = "  [dim](docker)[/dim]" if use_docker else ""
    console.print(f"[green]Agent '{rec.name}' spawned[/green]  ({model_label}){parent_label}{remote_label}{docker_label}")
    console.print(f"  Task: {rec.task}")
    console.print(f"  Workspace: {rec.workspace}")
    console.print(f"  Window: {rec.tmux_window}")

    if _context_gaps and rec.workspace:
        write_audit(Path(rec.workspace), _context_gaps)

    log_event("agent_spawned", {"agent": rec.name, "model": rec.model, "task": rec.task[:120]})

    if guardians:
        triggered = trigger_guardian("batch_complete")
        if triggered:
            console.print(f"[dim]Guardians triggered: {', '.join(triggered)}[/dim]")


@app.command(name="templates")
def templates_cmd(
    category: str = typer.Option("", "--category", "-c", help="Filter by category"),
):
    """List all available agent templates from agents/library/."""
    from rich.table import Table

    if not AGENTS_LIBRARY_DIR.exists():
        console.print(f"[red]Agents library not found at {AGENTS_LIBRARY_DIR}[/red]")
        raise typer.Exit(1)

    rows = []
    for json_file in sorted(AGENTS_LIBRARY_DIR.rglob("*.json")):
        try:
            data = json.loads(json_file.read_text())
        except Exception:
            continue
        if not data.get("name"):
            continue
        tmpl_id = json_file.stem
        tmpl_category = data.get("category") or json_file.parent.name
        if category and tmpl_category != category:
            continue
        model = data.get("modelHint") or data.get("model", "")
        desc = data.get("description", "")
        if len(desc) > 60:
            desc = desc[:57] + "..."
        rows.append((tmpl_id, data["name"], tmpl_category, model, desc))

    if not rows:
        console.print("[dim]No templates found.[/dim]")
        return

    table = Table(title=f"Agent Templates ({len(rows)} total)")
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name", style="bold")
    table.add_column("Category", style="yellow")
    table.add_column("Model", style="green")
    table.add_column("Description", max_width=60)

    for row in rows:
        table.add_row(*row)

    console.print(table)


@app.command()
def status(
    context: bool = typer.Option(False, "--context", "-c", help="Show context window usage per agent"),
):
    """Show status of all agents in a rich table."""
    if context:
        print_status_with_context()
    else:
        print_status()


@app.command()
def dashboard():
    """Interactive TUI dashboard for monitoring agents."""
    from .dashboard import run_dashboard

    run_dashboard()


@app.command()
def attach(name: str = typer.Argument(..., help="Agent name to attach to")):
    """Attach to a running agent's tmux window to watch live output."""
    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    if rec.status != "running":
        console.print(f"[yellow]Agent '{name}' is not running (status: {rec.status}).[/yellow]")
        console.print("[dim]Use 'oa collect' to see its output.[/dim]")
        raise typer.Exit(1)

    success = attach_agent(name)
    if success:
        console.print(f"[green]Switched to window '{rec.tmux_window}'[/green]")
        console.print("[dim]Use Ctrl-b n/p to navigate tmux windows, or 'oa status' to check all agents.[/dim]")
    else:
        console.print(f"[red]Could not attach to agent '{name}'. Is the tmux session running?[/red]")
        raise typer.Exit(1)


@app.command()
def watch(name: str = typer.Argument(..., help="Agent name to watch")):
    """Watch a running agent's output in real-time (streams tmux pane content)."""
    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    if rec.status != "running":
        console.print(f"[yellow]Agent '{name}' is not running (status: {rec.status}).[/yellow]")
        raise typer.Exit(1)

    from .lifecycle import capture_agent_output

    console.print(f"[bold]Watching agent '{name}'[/bold] (Ctrl-C to stop)\n")
    try:
        while True:
            # Refresh status
            current = check_agent(name)
            output = capture_agent_output(rec.tmux_window, lines=40)
            # Clear screen and redraw
            console.clear()
            console.print(f"[bold]Agent: {name}[/bold]  |  Status: {current}  |  Model: {rec.model}")
            console.print("\u2500" * 60)
            if output:
                console.print(output)
            else:
                console.print("[dim]No output yet...[/dim]")
            console.print("\n[dim]Ctrl-C to stop watching[/dim]")

            if current != "running":
                console.print(f"\n[green]Agent finished with status: {current}[/green]")
                break

            time.sleep(1)
    except KeyboardInterrupt:
        console.print("\n[dim]Stopped watching.[/dim]")


@app.command()
def kill(name: str = typer.Argument(..., help="Agent name to kill")):
    """Stop a running agent and close its tmux window."""
    success = kill_agent(name)
    if success:
        console.print(f"[yellow]Agent '{name}' killed.[/yellow]")
    else:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)


@app.command()
def collect(name: str = typer.Argument(..., help="Agent name to collect output from")):
    """Show the output of a completed agent."""
    from pathlib import Path as _Path

    rec = get_agent(name)
    if rec is None:
        console.print(f"[red]Agent '{name}' not found.[/red]")
        raise typer.Exit(1)

    # Remote agent: check completion via SSH, then sync output
    if getattr(rec, "remote_host", None) and getattr(rec, "remote_workspace", None):
        if not remote_is_done(rec.remote_host, rec.remote_workspace):
            console.print(f"[yellow]Remote agent '{name}' is still running. Wait for completion.[/yellow]")
            raise typer.Exit(1)
        try:
            sync_output_from_remote(rec.remote_host, rec.remote_workspace, _Path(rec.workspace))
        except Exception as e:
            console.print(f"[red]Failed to sync output from remote: {e}[/red]")
            raise typer.Exit(1)
    else:
        # Local agent: refresh status via check_agent
        current_status = check_agent(name)
        if current_status == "running":
            console.print(f"[yellow]Agent '{name}' is still running. Wait for completion.[/yellow]")
            raise typer.Exit(1)

    output = read_output(rec.workspace)
    if output:
        console.print(f"\n[bold]Output from agent '{name}':[/bold]\n")
        console.print(output)
    else:
        console.print(f"[yellow]No output.md found in workspace: {rec.workspace}[/yellow]")


@app.command()
def clean():
    """Clean up workspaces of all finished agents."""
    cleaned = clean_finished()
    if cleaned:
        console.print(f"[green]Cleaned {len(cleaned)} agent(s): {', '.join(cleaned)}[/green]")
    else:
        console.print("[dim]Nothing to clean.[/dim]")


@app.command()
def pipeline(
    task: str = typer.Argument(..., help="The high-level task to decompose and execute"),
):
    """Run a multi-agent pipeline: planner -> subtasks -> combiner."""
    from .pipeline import run_pipeline

    run_pipeline(task)


@app.command()
def web(
    port: int = typer.Option(5174, "--port", "-p", help="Bridge server port"),
):
    """Start the web UI (React SPA + local bridge server)."""
    from .bridge import run_bridge

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
    from .bridge import start_vscode_bridge

    console.print(f"[bold cyan]Starting VS Code bridge...[/bold cyan]")
    console.print(f"  Bridge: http://localhost:{port}")
    console.print(f"  Health: http://localhost:{port}/health")
    console.print("[dim]Press Ctrl-C to stop[/dim]\n")
    start_vscode_bridge(port=port)


@app.command()
def delegate(
    task: str = typer.Argument(..., help="The high-level task to delegate"),
    model: str = typer.Option("claude/sonnet", "--model", "-m", help="Worker model"),
    orchestrator_model: str = typer.Option("claude/opus", "--orchestrator-model", help="Orchestrator model"),
    name: str = typer.Option("", "--name", "-n", help="Base name for the orchestrator"),
    max_workers: int = typer.Option(5, "--max-workers", help="Max concurrent workers per batch"),
):
    """Delegate a task: spawns orchestrator + workers automatically (D-051).

    The orchestrator analyzes, decomposes, and delegates. Workers execute.
    """
    if not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
        raise typer.Exit(1)

    if not name:
        name = generate_agent_name(task)

    try:
        rec = spawn_with_orchestrator(
            name=name,
            task=task,
            worker_model=model,
            orchestrator_model=orchestrator_model,
            max_workers=max_workers,
        )
    except RuntimeError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    console.print(f"[bold green]Orchestrator '{rec.name}' spawned[/bold green]  ({orchestrator_model})")
    console.print(f"  Task: {task}")
    console.print(f"  Workers: {model} (max {max_workers})")
    console.print(f"  Workspace: {rec.workspace}")


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
    """Gracefully shut down an agent with approve/reject and timeout.

    Sends a shutdown request and waits up to --timeout seconds for the agent
    to approve or reject. On timeout (or --force), the agent is killed immediately.
    """
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
        # Give the agent a few seconds to wrap up after approving
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


@app.command()
def stop(
    no_guardians: bool = typer.Option(False, "--no-guardians", help="Skip session_end guardian triggers"),
    force: bool = typer.Option(False, "--force", help="Kill all agents immediately without waiting"),
):
    """Stop the oa tmux session with session persistence.

    5-phase shutdown: snapshot → wait for agents → release lock → notify → kill tmux.
    """
    from .tmux import SESSION_NAME, _tmux, session_exists as _session_exists
    from .session import release_session_lock

    log_event("session_end", {"session": SESSION_NAME})

    if not _session_exists():
        console.print("[dim]No active oa session.[/dim]")
        return

    disconnect_cfg = get_disconnect_config()
    timeout = disconnect_cfg.get("cleanup_timeout_seconds", 300)

    # Phase 1: SNAPSHOT (instant)
    console.print("[bold]Phase 1:[/bold] Saving session snapshot...")
    cleanup_result = session_cleanup(mode="stop")
    console.print(f"  [green]Snapshot saved[/green]: {cleanup_result.get('snapshot_path', 'unknown')}")

    # Phase 2: FINISH — wait for running agents (unless --force)
    if not force:
        agents = list_agents()
        running = [name for name, rec in agents.items() if rec.status == "running"]
        if running:
            console.print(f"[bold]Phase 2:[/bold] Waiting for {len(running)} running agent(s) (max {timeout}s)...")
            console.print(f"  [dim]Running: {', '.join(running)}[/dim]")
            deadline = time.time() + timeout
            while time.time() < deadline:
                agents = list_agents()
                still_running = [n for n, r in agents.items() if r.status == "running"]
                if not still_running:
                    console.print("  [green]All agents finished.[/green]")
                    break
                remaining = int(deadline - time.time())
                console.print(f"  [dim]{len(still_running)} agent(s) still running... ({remaining}s remaining)[/dim]")
                time.sleep(min(5, remaining))
            else:
                still_running = [n for n, r in list_agents().items() if r.status == "running"]
                if still_running:
                    console.print(f"  [yellow]Timeout reached. {len(still_running)} agent(s) still running.[/yellow]")
                    # Save updated snapshot after waiting
                    session_cleanup(mode="stop")
    else:
        console.print("[bold]Phase 2:[/bold] [yellow]--force: skipping agent wait[/yellow]")

    # Phase 3: RELEASE session lock
    console.print("[bold]Phase 3:[/bold] Releasing session lock...")
    release_session_lock()
    console.print("  [green]Lock released.[/green]")

    # Phase 4: NOTIFY (if enabled)
    if disconnect_cfg.get("notify_desktop", True):
        try:
            from .notify import send_notification
            agents = list_agents()
            summary = f"{len(agents)} agents tracked"
            done = sum(1 for a in agents.values() if a.status == "done")
            if done:
                summary = f"{done} done"
            send_notification("oa-cli", f"Session ended — {summary}")
            console.print("[bold]Phase 4:[/bold] Desktop notification sent.")
        except Exception:
            console.print("[bold]Phase 4:[/bold] [dim]Notification skipped (not available).[/dim]")
    else:
        console.print("[bold]Phase 4:[/bold] [dim]Notifications disabled.[/dim]")

    # Trigger guardians (existing behavior)
    if not no_guardians:
        triggered = trigger_guardian("session_end")
        if triggered:
            console.print(f"[dim]Guardians triggered: {', '.join(triggered)}[/dim]")

    # Phase 5: CLOSE tmux session
    console.print("[bold]Phase 5:[/bold] Closing tmux session...")
    _tmux(f"kill-session -t {SESSION_NAME}", check=False)
    console.print("[yellow]Session 'oa' stopped.[/yellow]")


@app.command(name="guardians")
def guardians_cmd(
    register: bool = typer.Option(False, "--register", help="Register a new guardian (interactive)"),
    trigger: str = typer.Option("", "--trigger", help="Manually trigger guardians for an event type"),
    context: str = typer.Option("", "--context", help="Batch context description; spawns all three guardian agents (lessons, roadmap, decisions)"),
    install_hook: bool = typer.Option(False, "--install-hook", help="Install the post-run 03-auto-lessons.sh hook"),
):
    """List, trigger, or register guardian agents."""
    from rich.table import Table

    # --install-hook: write the guardian post-run hook file
    if install_hook:
        from .hooks import install_guardian_hook
        hook_path = install_guardian_hook()
        console.print(f"[green]Guardian hook installed at {hook_path}[/green]")
        console.print("[dim]Set OA_AUTO_GUARDIANS=1 in your environment to enable it.[/dim]")
        return

    # --context: spawn all three guardian agents with the given context
    if context:
        from .guardian import GuardianAgent
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
def version():
    """Show the CLI version."""
    console.print(f"open-agents-cli v{__version__}")


# --- Team commands ---

team_app = typer.Typer(name="team", help="Manage agent teams.", no_args_is_help=True)
app.add_typer(team_app)


@team_app.command("create")
def team_create(
    name: str = typer.Argument(..., help="Team name"),
    members: list[str] = typer.Option([], "--member", "-m", help="Initial member agent names"),
):
    """Create a new agent team."""
    from .teams import create_team

    config = create_team(name, members=list(members))
    console.print(f"[green]Team '{name}' created.[/green]")
    if config["members"]:
        console.print(f"  Members: {', '.join(config['members'])}")


@team_app.command("list")
def team_list():
    """List all teams."""
    from .teams import list_teams
    from rich.table import Table

    teams = list_teams()
    if not teams:
        console.print("[dim]No teams found.[/dim]")
        return

    table = Table(title="Agent Teams")
    table.add_column("Name", style="cyan")
    table.add_column("Members", style="green")
    for t in teams:
        members = ", ".join(t.get("members", [])) or "[dim]none[/dim]"
        table.add_row(t["name"], members)
    console.print(table)


@team_app.command("add-member")
def team_add_member(
    team: str = typer.Argument(..., help="Team name"),
    agent: str = typer.Argument(..., help="Agent name to add"),
):
    """Add an agent to a team."""
    from .teams import add_member

    try:
        config = add_member(team, agent)
        console.print(f"[green]Added '{agent}' to team '{team}'.[/green]")
        console.print(f"  Members: {', '.join(config['members'])}")
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


@team_app.command("delete")
def team_delete(
    name: str = typer.Argument(..., help="Team name to delete"),
):
    """Delete a team."""
    from .teams import delete_team

    if delete_team(name):
        console.print(f"[yellow]Team '{name}' deleted.[/yellow]")
    else:
        console.print(f"[red]Team '{name}' not found.[/red]")
        raise typer.Exit(1)


# --- Task commands ---

task_app = typer.Typer(name="task", help="Manage shared team tasks.", no_args_is_help=True)
app.add_typer(task_app)


@task_app.command("create")
def task_create(
    team: str = typer.Argument(..., help="Team name"),
    title: str = typer.Argument(..., help="Task title"),
    description: str = typer.Option("", "--desc", "-d", help="Task description"),
    assigned_to: str = typer.Option("", "--assign", "-a", help="Assign to agent name"),
    blocked_by: list[str] = typer.Option([], "--blocked-by", "-b", help="Task IDs this is blocked by"),
):
    """Create a new task for a team."""
    from .task_list import create_task

    task = create_task(
        team=team,
        title=title,
        description=description,
        assigned_to=assigned_to or None,
        blocked_by=list(blocked_by),
    )
    console.print(f"[green]Task created[/green]  id={task['id']}")
    console.print(f"  Title: {task['title']}")
    console.print(f"  Team: {team}  |  Status: {task['status']}")


@task_app.command("list")
def task_list_cmd(
    team: str = typer.Argument(..., help="Team name"),
):
    """List all tasks for a team."""
    from .task_list import list_tasks
    from rich.table import Table

    STATUS_COLOR = {
        "pending": "yellow",
        "in_progress": "cyan",
        "completed": "green",
        "blocked": "red",
    }

    tasks = list_tasks(team)
    if not tasks:
        console.print(f"[dim]No tasks found for team '{team}'.[/dim]")
        return

    table = Table(title=f"Tasks: {team}")
    table.add_column("ID", style="dim")
    table.add_column("Title")
    table.add_column("Status")
    table.add_column("Assigned", style="dim")
    for t in tasks:
        status = t.get("status", "pending")
        color = STATUS_COLOR.get(status, "white")
        table.add_row(
            t["id"],
            t["title"],
            f"[{color}]{status}[/{color}]",
            t.get("assigned_to") or "-",
        )
    console.print(table)


@task_app.command("done")
def task_done(
    team: str = typer.Argument(..., help="Team name"),
    task_id: str = typer.Argument(..., help="Task ID to mark as completed"),
):
    """Mark a task as completed."""
    from .task_list import update_task

    try:
        task = update_task(team, task_id, "completed")
        console.print(f"[green]Task '{task_id}' marked as completed.[/green]")
        console.print(f"  Title: {task['title']}")
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


@task_app.command("claim")
def task_claim_cmd(
    team: str = typer.Argument(..., help="Team name"),
    task_id: str = typer.Argument(..., help="Task ID to claim"),
    agent: str = typer.Option(..., "--agent", "-a", help="Agent name claiming the task"),
):
    """Claim a pending task for an agent (with file locking)."""
    from .task_list import claim_task

    try:
        task = claim_task(team, task_id, agent)
        console.print(f"[green]Task '{task_id}' claimed by '{agent}'.[/green]")
        console.print(f"  Title: {task['title']}")
    except (FileNotFoundError, ValueError) as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


@task_app.command("complete")
def task_complete_cmd(
    team: str = typer.Argument(..., help="Team name"),
    task_id: str = typer.Argument(..., help="Task ID to complete"),
):
    """Mark a task as completed and auto-unblock dependent tasks."""
    from .task_list import complete_task

    try:
        task = complete_task(team, task_id)
        console.print(f"[green]Task '{task_id}' completed.[/green]")
        console.print(f"  Title: {task['title']}")
    except (FileNotFoundError, ValueError) as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


@task_app.command("update")
def task_update(
    team: str = typer.Argument(..., help="Team name"),
    task_id: str = typer.Argument(..., help="Task ID"),
    status: str = typer.Argument(..., help="New status: pending|in_progress|completed|blocked"),
):
    """Update a task's status."""
    from .task_list import update_task

    try:
        task = update_task(team, task_id, status)
        console.print(f"[green]Task '{task_id}' status set to '{status}'.[/green]")
        console.print(f"  Title: {task['title']}")
    except (FileNotFoundError, ValueError) as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


# --- Checkpoint commands ---

checkpoint_app = typer.Typer(name="checkpoint", help="Manage agent checkpoints for crash-recovery.", no_args_is_help=True)
app.add_typer(checkpoint_app)


@checkpoint_app.command("list")
def checkpoint_list():
    """List all incomplete (non-completed) checkpoints."""
    from .checkpoint import list_incomplete
    from rich.table import Table

    items = list_incomplete()
    if not items:
        console.print("[dim]No incomplete checkpoints.[/dim]")
        return

    table = Table(title="Incomplete Checkpoints")
    table.add_column("Agent", style="cyan")
    table.add_column("Status", style="yellow")
    table.add_column("Updated", style="dim")
    table.add_column("Task", max_width=50)

    for cp in items:
        table.add_row(
            cp.get("agent_name", "?"),
            cp.get("status", "?"),
            cp.get("updated_at", "?")[:19],
            cp.get("task", "")[:50],
        )
    console.print(table)


@checkpoint_app.command("show")
def checkpoint_show(name: str = typer.Argument(..., help="Agent name")):
    """Show details of a checkpoint."""
    from .checkpoint import load_checkpoint

    cp = load_checkpoint(name)
    if cp is None:
        console.print(f"[red]No checkpoint found for '{name}'.[/red]")
        raise typer.Exit(1)

    console.print(f"[bold]Checkpoint: {cp['agent_name']}[/bold]")
    console.print(f"  Status:  {cp['status']}")
    console.print(f"  Model:   {cp['model']}")
    console.print(f"  Created: {cp['created_at'][:19]}")
    console.print(f"  Updated: {cp['updated_at'][:19]}")
    console.print(f"  Task:    {cp['task']}")
    notes = cp.get("progress_notes", [])
    if notes:
        console.print("  Progress notes:")
        for n in notes:
            console.print(f"    - {n}")
    snapshot = cp.get("output_snapshot", "")
    if snapshot:
        console.print(f"  Output snapshot (last 200 chars):\n    {snapshot[-200:]}")


@app.command()
def resume(name: str = typer.Argument(..., help="Agent name to resume from checkpoint")):
    """Resume an agent from its last checkpoint."""
    from .checkpoint import load_checkpoint, resume_from_checkpoint

    if not session_exists():
        console.print("[red]No oa session. Run 'oa start' first.[/red]")
        raise typer.Exit(1)

    cp = load_checkpoint(name)
    if cp is None:
        console.print(f"[red]No checkpoint found for '{name}'.[/red]")
        raise typer.Exit(1)

    if cp.get("status") == "completed":
        console.print(f"[yellow]Checkpoint for '{name}' is already completed.[/yellow]")
        raise typer.Exit(1)

    resume_task = resume_from_checkpoint(name)
    resume_name = f"{name}-resume"
    model = cp.get("model", "claude/sonnet")

    try:
        rec = spawn_agent(resume_name, resume_task, model=model)
    except RuntimeError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    console.print(f"[green]Resume agent '{rec.name}' spawned[/green]  (model: {model})")
    console.print(f"  Original agent: {name}")
    console.print(f"  Workspace: {rec.workspace}")


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


# --- Session commands ---

session_app = typer.Typer(name="session", help="View and manage session records.", invoke_without_command=True)
app.add_typer(session_app)


@session_app.callback(invoke_without_command=True)
def session_default(ctx: typer.Context):
    """Show current or latest session info."""
    if ctx.invoked_subcommand is not None:
        return

    from rich.table import Table
    from datetime import datetime, timezone

    latest = get_latest_session()
    if latest is None:
        console.print("[dim]No session records found.[/dim]")
        return

    console.print(Panel(
        _format_session_detail(latest),
        title=f"[bold]Session: {latest.session_id}[/bold]",
        border_style="blue",
    ))


def _format_session_detail(rec) -> str:
    """Format a SessionRecord for display."""
    lines = []
    lines.append(f"Session ID:    {rec.session_id}")
    lines.append(f"Shutdown mode: {rec.shutdown_mode}")
    lines.append(f"Started at:    {datetime.fromtimestamp(rec.started_at, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    if rec.ended_at:
        lines.append(f"Ended at:      {datetime.fromtimestamp(rec.ended_at, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    if rec.duration_seconds:
        mins = int(rec.duration_seconds // 60)
        lines.append(f"Duration:      {mins} min")

    summary = rec.agent_summary
    if summary:
        total = summary.get("total", 0)
        done = summary.get("done", 0)
        running = summary.get("running", 0)
        failed = summary.get("failed", 0)
        lines.append(f"Agents:        {total} total · {done} done · {running} running · {failed} failed")

    git = rec.git_state
    if git:
        branch = git.get("branch", "")
        if branch:
            lines.append(f"Branch:        {branch}")
        uncommitted = git.get("uncommitted_files", [])
        if uncommitted:
            lines.append(f"Uncommitted:   {len(uncommitted)} file(s)")
        last_commit = git.get("last_commit", "")
        if last_commit:
            lines.append(f"Last commit:   {last_commit[:80]}")

    if rec.agents_snapshot:
        lines.append("")
        lines.append("[bold]Agents:[/bold]")
        for name, info in rec.agents_snapshot.items():
            status = info.get("status", "?")
            task = info.get("task", "")
            if len(task) > 60:
                task = task[:57] + "..."
            lines.append(f"  {name}: [{_status_color(status)}]{status}[/{_status_color(status)}]  {task}")

    return "\n".join(lines)


def _status_color(status: str) -> str:
    return {"done": "green", "running": "cyan", "failed": "red", "error": "red"}.get(status, "yellow")


from datetime import datetime, timezone


@session_app.command("list")
def session_list_cmd(
    limit: int = typer.Option(10, "--limit", "-n", help="Number of sessions to show"),
):
    """List recent session records."""
    from rich.table import Table

    sessions = list_sessions(limit=limit)
    if not sessions:
        console.print("[dim]No session records found.[/dim]")
        return

    table = Table(title=f"Recent Sessions ({len(sessions)})")
    table.add_column("Session ID", style="cyan")
    table.add_column("Mode", style="yellow")
    table.add_column("Agents", style="green")
    table.add_column("Started", style="dim")

    for rec in sessions:
        summary = rec.agent_summary
        total = summary.get("total", 0)
        done = summary.get("done", 0)
        running = summary.get("running", 0)
        failed = summary.get("failed", 0)
        agent_str = f"{total} total"
        if done:
            agent_str += f", {done} done"
        if running:
            agent_str += f", {running} running"
        if failed:
            agent_str += f", {failed} failed"
        started = datetime.fromtimestamp(rec.started_at, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        table.add_row(rec.session_id, rec.shutdown_mode, agent_str, started)

    console.print(table)


@session_app.command("clean")
def session_clean_cmd(
    days: int = typer.Option(30, "--days", "-d", help="Delete sessions older than this many days"),
):
    """Delete old session records."""
    deleted = cleanup_sessions(retention_days=days)
    if deleted:
        console.print(f"[green]Deleted {deleted} session record(s) older than {days} days.[/green]")
    else:
        console.print("[dim]No old session records to clean up.[/dim]")


@app.command()
def logs(
    name: str = typer.Argument(None, help="Agent name to filter logs for"),
    limit: int = typer.Option(10, "--limit", "-n", help="Number of runs to show"),
):
    """Show run logs. If name given: logs for that agent. Else: recent runs."""
    from rich.table import Table
    from . import telemetry

    runs = telemetry.list_runs(limit=limit, agent_name=name or None)
    if not runs:
        if name:
            console.print(f"[dim]No run logs found for agent '{name}'.[/dim]")
        else:
            console.print("[dim]No run logs found.[/dim]")
        return

    title = f"Run logs for '{name}'" if name else f"Recent runs ({len(runs)})"
    table = Table(title=title)
    table.add_column("Run ID", style="dim", max_width=12)
    table.add_column("Agent", style="cyan")
    table.add_column("Model", style="yellow")
    table.add_column("Status", style="bold")
    table.add_column("Duration", style="green", justify="right")
    table.add_column("Started", style="dim")
    table.add_column("Task", max_width=50)

    status_colors = {"success": "green", "error": "red", "unknown": "yellow"}

    for run in runs:
        run_id = run.get("run_id", "")
        agent = run.get("agent_name", "")
        model = run.get("model", "")
        status = run.get("exit_status", "unknown")
        color = status_colors.get(status, "yellow")
        duration = run.get("duration_seconds")
        duration_str = f"{duration:.1f}s" if duration is not None else "—"
        started_at = run.get("started_at", "")
        if started_at:
            try:
                dt = datetime.fromisoformat(started_at)
                started_at = dt.strftime("%Y-%m-%d %H:%M")
            except (ValueError, TypeError):
                pass
        task = run.get("task", "")
        if len(task) > 48:
            task = task[:45] + "..."
        table.add_row(
            run_id[:8],
            agent,
            model,
            f"[{color}]{status}[/{color}]",
            duration_str,
            started_at,
            task,
        )

    console.print(table)


# --- Backlog commands (#30) ---

backlog_app = typer.Typer(name="backlog", help="Manage persistent work backlog.", no_args_is_help=True)
app.add_typer(backlog_app)


@backlog_app.command("list")
def backlog_list(
    priority: str = typer.Option(None, "--priority", "-p", help="Filter by priority: high|medium|low"),
):
    """List all open backlog items, sorted by priority."""
    from .backlog import BacklogStore
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
    from .backlog import BacklogStore

    store = BacklogStore()
    item_id = store.add(title, description=description, priority=priority)
    console.print(f"[green]Added backlog item[/green]  id={item_id}  priority={priority}")
    console.print(f"  Title: {title}")


@backlog_app.command("done")
def backlog_done(
    item_id: str = typer.Argument(..., help="Backlog item ID to mark as done"),
):
    """Mark a backlog item as done."""
    from .backlog import BacklogStore

    store = BacklogStore()
    try:
        store.done(item_id)
        console.print(f"[green]Backlog item '{item_id}' marked as done.[/green]")
    except KeyError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)


# --- Review command (#28) ---

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


lessons_app = typer.Typer(name="lessons", help="Manage lessons learned in LESSONS.md.")
app.add_typer(lessons_app)


@lessons_app.command(name="add")
def lessons_add(
    lesson: str = typer.Argument(..., help="Lesson text to record"),
    agent: str = typer.Option("manual", "--agent", "-a", help="Agent or context name"),
    outcome: str = typer.Option("observation", "--outcome", "-o", help="Outcome (success/error/observation)"),
):
    """Append a lesson to LESSONS.md with the next L-NNN identifier."""
    from .lessons_extractor import extract_lesson

    lesson_id = extract_lesson(agent_name=agent, outcome=outcome, lesson=lesson)
    console.print(f"[green]Les opgeslagen als {lesson_id}[/green]")


@app.command()
def handoff(
    summary: str = typer.Option(None, "--summary", "-s", help="Session summary to include in the handoff document"),
):
    """Generate a handoff document (docs/HANDOFF-<date>.md) for the next session."""
    from .handoff_generator import generate_handoff

    path = generate_handoff(session_summary=summary)
    console.print(f"[green]Handoff document geschreven naar:[/green] {path}")


@app.command()
def mcp(
    host: str = typer.Option("127.0.0.1", "--host", help="Host to bind the MCP server to"),
    port: int = typer.Option(0, "--port", help="Port (0 = stdio transport, default for MCP)"),
):
    """Start the Open Agents MCP server (stdio transport for Claude Code integration)."""
    try:
        from .mcp_server import main as mcp_main
    except ImportError:
        console.print("[red]MCP package not installed. Run: pip install mcp>=1.0[/red]")
        raise typer.Exit(1)
    console.print("[green]Starting Open Agents MCP server...[/green]")
    mcp_main()


@app.command()
def compact(
    name: str = typer.Argument(None, help="Agent name to compact (omit for all running agents)"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would be compacted without triggering"),
    all_agents: bool = typer.Option(False, "--all", help="Compact all running agents above threshold"),
):
    """Trigger context compaction for one or all running agents (Issue #20).

    Sends /compact to the agent's tmux pane when context usage exceeds threshold.
    Default threshold: 75% (override with OA_COMPACT_THRESHOLD env var).
    """
    from .context_tracker import get_context_status, should_compact, trigger_compaction, HEALTH_ICONS
    from .state import list_agents, get_agent

    targets: list[str] = []
    if name:
        targets = [name]
    else:
        targets = [r.name for r in list_agents() if r.status == "running"]

    if not targets:
        console.print("[yellow]No running agents found.[/yellow]")
        raise typer.Exit(0)

    for agent_name in targets:
        rec = get_agent(agent_name)
        if rec is None:
            console.print(f"[red]Agent '{agent_name}' not found.[/red]")
            continue
        if rec.status != "running":
            console.print(f"[dim]{agent_name}: not running (status={rec.status})[/dim]")
            continue

        ctx = get_context_status(agent_name, rec.tmux_window)
        icon = HEALTH_ICONS.get(ctx["health"], "○")
        pct = ctx["pct"]
        tokens = ctx["tokens"]

        if dry_run:
            would = "WOULD compact" if should_compact(agent_name, pct) else "would NOT compact"
            console.print(f"  {icon} [cyan]{agent_name}[/cyan]  {pct:.1f}% ({tokens:,} tokens)  → {would}")
            continue

        if all_agents or name:
            # Force compact regardless of threshold when explicitly requested
            if name:
                trigger_compaction(agent_name, rec.tmux_window)
                console.print(f"  {icon} [green]✓[/green] [cyan]{agent_name}[/cyan]  /compact sent ({pct:.1f}%)")
            elif should_compact(agent_name, pct):
                trigger_compaction(agent_name, rec.tmux_window)
                console.print(f"  {icon} [green]✓[/green] [cyan]{agent_name}[/cyan]  /compact sent ({pct:.1f}%)")
            else:
                console.print(f"  {icon} [dim]{agent_name}[/dim]  {pct:.1f}% — below threshold, skipped")


@app.command(name="import")
def canvas_import(
    file: str = typer.Argument(..., help="Pad naar het canvas export JSON-bestand"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Toon pipeline stappen zonder agents te spawnen"),
    model: str = typer.Option("", "--model", "-m", help="Overschrijf model voor alle agents (bijv. claude/opus)"),
):
    """Importeer een Canvas export en spawn de pipeline als oa agents.

    Leest een canvas-export.json (zie docs/schemas/canvas-export.json),
    sorteert nodes topologisch op basis van edges, en spawnt elke agent-node.
    """
    from .canvas_import import parse_canvas_export, convert_to_pipeline

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
        deps_str = f"  ← {', '.join(step['depends_on'])}" if step["depends_on"] else ""
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


# --- Graveyard sub-commands (#24) ---

graveyard_app = typer.Typer(name="graveyard", help="Agent Graveyard: archive and resurrect finished agents.")
app.add_typer(graveyard_app)


@graveyard_app.command(name="list")
def graveyard_list(
    status: str = typer.Option(None, "--status", "-s", help="Filter by exit status (done/error/killed/failed/timeout)"),
):
    """List all archived agents in the graveyard."""
    from .graveyard import AgentGraveyard

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
    from .graveyard import AgentGraveyard

    g = AgentGraveyard()
    params = g.resurrect(run_id, new_task=task)
    if not params:
        console.print(f"[red]No graveyard entry found for run_id: {run_id}[/red]")
        raise typer.Exit(1)

    effective_model = model or params["model"]
    spawn_name = params["name"]
    spawn_task = params["task"]

    console.print(f"[bold cyan]Resurrect:[/bold cyan] {run_id} → [cyan]{spawn_name}[/cyan]")
    console.print(f"  Task:  {spawn_task[:80]}{'…' if len(spawn_task) > 80 else ''}")
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


# --- Docs sub-commands (#46) ---

docs_app = typer.Typer(name="docs", help="Documentation generator for agent templates.")
app.add_typer(docs_app)


@docs_app.command(name="generate")
def docs_generate(
    library_dir: str = typer.Option(None, "--library", "-l", help="Path to agents/library dir (overrides default)"),
    output: str = typer.Option(None, "--output", "-o", help="Write report to this path instead of ~/.oa/doc-report.md"),
    no_changelog: bool = typer.Option(False, "--no-changelog", help="Skip CHANGELOG.md update"),
):
    """Generate documentation from agent library templates and update CHANGELOG."""
    from .doc_generator import DocGenerator

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
        from .doc_generator import REPORT_PATH
        console.print(f"[green]Report written to:[/green] {REPORT_PATH}")

    score = gen.get_quality_score()
    console.print(f"[bold]Quality score:[/bold] {score:.1%}  ({len(gen._load_templates())} templates)")

    if not no_changelog:
        ok = gen.update_changelog("docs regenerated")
        if ok:
            console.print("[green]CHANGELOG.md updated.[/green]")
        else:
            console.print("[yellow]Could not update CHANGELOG.md (file may not exist).[/yellow]")


if __name__ == "__main__":
    app()
