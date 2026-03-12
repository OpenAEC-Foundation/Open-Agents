"""Agent commands: run, kill, clean, status, attach, watch, collect, delegate, resume, templates, dashboard."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import typer
from rich.console import Console

from ..budget_tracker import start_budget
from ..context_gap_detector import detect_gaps, write_audit
from ..guardians import log_event, trigger_guardian
from ..invocation_validator import InvocationValidator
from ..lifecycle import attach_agent, check_agent, clean_finished, kill_agent
from ..monitor import print_status, print_status_verbose, print_status_with_context
from ..orchestrator import spawn_with_orchestrator
from ..prompt_templates import L010_TEMPLATE_NAMES, apply_template, validate_prompt
from ..config import get_default_machine
from ..spawner import spawn_agent, spawn_remote_agent, is_oss_model
from ..state import get_agent, list_agents, update_agent
from ..tmux import session_exists
from ..utils import format_model_rich, generate_agent_name
from ..workspace import read_output, remote_is_done, sync_output_from_remote
from ._helpers import AGENTS_LIBRARY_DIR, _load_skills, _load_template, console


def register_commands(app: typer.Typer) -> None:
    """Register all agent-related commands on the app."""

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
        templates: str = typer.Option("", "--templates", help="Comma-separated template IDs to stack into one composite agent"),
        context_skills: str = typer.Option("", "--context-skills", "-cs", help="Comma-separated skill IDs to inject as context (e.g. 'sverchok-errors-common,sverchok-syntax-scripting')"),
        agent_type: str = typer.Option("", "--type", help="Agent type for skill loading. Use --profile for preset profiles (researcher|builder|orchestrator|reviewer|guardian)"),
        profile: str = typer.Option("", "--profile", help="Profile ID from agents/library/profiles/ or preset (researcher|builder|orchestrator|reviewer|guardian)"),
        guardians: bool = typer.Option(False, "--guardians/--no-guardians", help="Trigger batch_complete guardians after spawning"),
        remote: str = typer.Option("", "--remote", "-r", help="Remote SSH host voor remote execution (bijv. 'hetzner' of 'user@host')"),
        local: bool = typer.Option(False, "--local", help="Force local execution (override remote default from machines.json)"),
        strict: bool = typer.Option(False, "--strict", help="Fail if prompt is missing L-010 elements (absolute paths, scope, output)"),
        can_spawn: bool = typer.Option(False, "--can-spawn", help="Configure agent as orchestrator that can spawn child agents via oa run"),
        docker: bool = typer.Option(False, "--docker", help="Run agent in Docker container (requires Docker)"),
        skip_context_check: bool = typer.Option(False, "--skip-context-check", help="Skip context gap pre-flight check"),
        budget: int = typer.Option(None, "--budget", help="Token budget for this run (optional, no limit if omitted)"),
        no_autocompact: bool = typer.Option(False, "--no-autocompact", help="Disable auto-compaction for this agent (overrides OA_COMPACT_THRESHOLD)"),
        prompt_file: str = typer.Option("", "--prompt-file", "-pf", help="Read task prompt from a file (avoids shell escaping issues with special characters)"),
        skills: str = typer.Option("", "--skills", help="Komma-gescheiden skill namen om te laden via skill_registry (bijv. 'api-design,oa-quality-gates')"),
        no_context_inject: bool = typer.Option(False, "--no-context-inject", help="Skip automatic context injection"),
        max_iterations: int = typer.Option(3, "--max-iterations", "-mi", help="Max quality improvement rounds the orchestrator sends feedback to this agent (default: 3)"),
    ):
        """Spawn an agent with a task in a new tmux window."""
        if prompt_file:
            pf = Path(prompt_file)
            if not pf.exists():
                console.print(f"[red]--prompt-file: file not found: {pf}[/red]")
                raise typer.Exit(1)
            task = pf.read_text(encoding="utf-8")
            console.print(f"[dim]Prompt loaded from file: {pf} ({len(task)} chars)[/dim]")

        # Determine remote target early for the session check
        # (full resolution happens later, but we need to know if we'll go remote)
        _early_remote = remote or (
            not local and (get_default_machine() or {}).get("host", "") or ""
        )
        if not _early_remote and not session_exists():
            console.print("[red]No oa session. Run 'oa start' first.[/red]")
            raise typer.Exit(1)

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
            if not context_skills and tmpl.get("skillRef"):
                context_skills = Path(tmpl["skillRef"]).parent.name

        if profile and not profile in ("researcher", "builder", "orchestrator", "reviewer", "guardian"):
            try:
                from ..profile_composer import load_profile, merge_templates as _merge_templates
                _LIBRARY_DIR = Path(__file__).parent.parent.parent.parent.parent / "agents" / "library"
                prof = load_profile(profile)
                _tmpl_ids = prof.get("templates", [])
                if _tmpl_ids:
                    _merged = _merge_templates(_tmpl_ids, _LIBRARY_DIR)
                    _sys_prompt = _merged.get("systemPrompt", "")
                    if _sys_prompt:
                        task = (_sys_prompt + "\n\n" + task).strip() if task else _sys_prompt
                    if model == "claude" and _merged.get("modelHint"):
                        model = _merged["modelHint"]
                if not context_skills and prof.get("skills"):
                    context_skills = ",".join(prof["skills"])
                console.print(f"[dim]Profile loaded: {profile} ({len(_tmpl_ids)} templates)[/dim]")
            except FileNotFoundError:
                console.print(f"[yellow]Profile '{profile}' not found in registry, treating as preset.[/yellow]")

        elif templates:
            from ..profile_composer import merge_templates as _merge_templates
            _LIBRARY_DIR = Path(__file__).parent.parent.parent.parent.parent / "agents" / "library"
            _tmpl_list = [t.strip() for t in templates.split(",") if t.strip()]
            if len(_tmpl_list) > 1:
                _merged = _merge_templates(_tmpl_list, _LIBRARY_DIR)
                _sys_prompt = _merged.get("systemPrompt", "")
                if _sys_prompt:
                    task = (_sys_prompt + "\n\n" + task).strip() if task else _sys_prompt
                if model == "claude" and _merged.get("modelHint"):
                    model = _merged["modelHint"]
                console.print(f"[dim]Stacked {len(_tmpl_list)} templates → {_merged.get('modelHint', 'default')} model[/dim]")
            elif len(_tmpl_list) == 1 and not template:
                tmpl = _load_template(_tmpl_list[0])
                _sys_prompt = tmpl.get("systemPrompt", "")
                task = (_sys_prompt + "\n\n" + task).strip() if task else _sys_prompt
                if model == "claude" and tmpl.get("modelHint"):
                    model = tmpl["modelHint"]

        if context_skills:
            skill_block = _load_skills(context_skills)
            if skill_block:
                task = (task + "\n\n---\n\n" + skill_block).strip() if task else skill_block
                console.print(f"[dim]Skills injected: {context_skills}[/dim]")

        _is_oss = is_oss_model(model)
        if not no_context_inject and task and not _is_oss:
            try:
                from ..context_injector import inject as _inject_context
                enriched = _inject_context(task)
                if enriched != task:
                    task = enriched
                    console.print("[dim]Context auto-injected based on task keywords.[/dim]")
            except Exception:
                pass

        if not task:
            console.print("[red]No task provided. Pass a task argument or use --template.[/red]")
            raise typer.Exit(1)

        if not template and len(task.strip()) > 30:
            try:
                from ..agent_selector import find_agents as _find_agents
                _suggestions = _find_agents(task, library_dir=AGENTS_LIBRARY_DIR, top_n=1, use_ai=False)
                if _suggestions and _suggestions[0].score > 0.3:
                    _best = _suggestions[0]
                    console.print(f"[dim]💡 Suggestie: --template {_best.agent_id} ({_best.name})[/dim]")
            except Exception:
                pass

        if len(task.strip()) < 10 and not template:
            console.print(f"[yellow]⚠ Prompt is very short ({len(task.strip())} chars). If it was truncated by shell escaping, use --prompt-file instead.[/yellow]")
            console.print("[yellow]  Example: echo 'your prompt' > /tmp/task.txt && oa run --prompt-file /tmp/task.txt[/yellow]")

        if strict:
            warnings = validate_prompt(task)
            for w in warnings:
                console.print(f"[yellow]{w}[/yellow]")
            if warnings:
                console.print("[red]--strict: prompt faalt L-010 validatie. Voeg ontbrekende elementen toe of gebruik --template.[/red]")
                raise typer.Exit(1)

        _quality = InvocationValidator().score(task)
        _total = _quality["total_score"]
        _normalized = _total / 5.0
        if _normalized < 0.5:
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

        if budget is not None:
            start_budget(name, budget)
            console.print(f"[dim]Token budget set: {budget} tokens for '{name}'[/dim]")

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

        use_docker = False
        if docker:
            from ..docker_runtime import DockerAgentRuntime
            docker_rt = DockerAgentRuntime()
            if docker_rt.is_available() and docker_rt.image_exists():
                use_docker = True
            else:
                if not docker_rt.is_available():
                    console.print("[yellow]Docker not available, falling back to tmux.[/yellow]")
                elif not docker_rt.image_exists():
                    console.print("[yellow]Docker image 'oa-agent:latest' not found. Build with: docker build -f Dockerfile.agent -t oa-agent:latest .[/yellow]")
                    console.print("[yellow]Falling back to tmux.[/yellow]")

        # Bepaal target machine: --local → lokaal; --remote <host> → expliciet remote;
        # anders → lees default machine uit machines.json (remote-first, D-061)
        if local:
            target_host = None
        elif remote:
            target_host = remote
        else:
            _default_machine = get_default_machine()
            _default_host = _default_machine.get("host", "") if _default_machine else ""
            target_host = _default_host if _default_host else None

        try:
            if target_host:
                rec = spawn_remote_agent(name, task, host=target_host, model=model, direct=direct, max_iterations=max_iterations)
            elif use_docker:
                from ..workspace import create_workspace, _AGENT_PATH
                from ..spawner import CLAUDE_MODEL_MAP, _validate_claude_model, CLAUDE_CMD
                import shlex as _shlex
                import time as _time
                from ..state import AgentRecord, add_agent

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
                skills_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else []
                rec = spawn_agent(name, task, model=model, workspace=ws, parent=parent or None, project_root=proj_root, agent_type=agent_type, can_spawn=can_spawn, skills=skills_list, profile=profile, max_iterations=max_iterations, task_type=agent_type)
        except RuntimeError as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1)

        if no_autocompact:
            update_agent(rec.name, no_autocompact=True)

        model_label = format_model_rich(rec.model)
        parent_label = f"  (child of [bold]{rec.parent}[/bold])" if rec.parent else ""
        remote_label = f"  [dim](remote: {target_host})[/dim]" if target_host else ""
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
        verbose: bool = typer.Option(False, "--verbose", "-v", help="Show CPU/memory usage per agent (requires psutil)"),
    ):
        """Show status of all agents in a rich table."""
        if context:
            print_status_with_context()
        elif verbose:
            print_status_verbose()
        else:
            print_status()

    @app.command()
    def dashboard():
        """Interactive TUI dashboard for monitoring agents."""
        from ..dashboard import run_dashboard
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

        from ..lifecycle import capture_agent_output

        console.print(f"[bold]Watching agent '{name}'[/bold] (Ctrl-C to stop)\n")
        try:
            while True:
                current = check_agent(name)
                output = capture_agent_output(rec.tmux_window, lines=40)
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
            current_status = check_agent(name)
            if current_status == "running":
                console.print(f"[yellow]Agent '{name}' is still running. Wait for completion.[/yellow]")
                raise typer.Exit(1)

        output = read_output(rec.workspace)

        if rec.task_type and rec.workspace:
            try:
                from ..contract import verify_contract
                contract_result = verify_contract(_Path(rec.workspace), rec.task_type)
                color = "green" if contract_result.passed else "yellow"
                console.print(f"\n[{color}]Contract [{rec.task_type}]: {'PASS' if contract_result.passed else 'FAIL'}[/{color}]")
                if not contract_result.passed:
                    for check_name, ok, detail in contract_result.checks:
                        icon = "✓" if ok else "✗"
                        console.print(f"  [{('green' if ok else 'yellow')}]{icon} {check_name}: {detail}[/{'green' if ok else 'yellow'}]")
                update_agent(rec.name,
                    contract_status="PASS" if contract_result.passed else "FAIL",
                    contract_detail=contract_result.summary(),
                )
            except Exception:
                pass

        if output:
            console.print(f"\n[bold]Output from agent '{name}':[/bold]\n")
            try:
                console.print(output)
            except Exception:
                print(output)
        else:
            console.print(f"[yellow]No output.md found in workspace: {rec.workspace}[/yellow]")

        if os.environ.get("OA_PO_SAMPLE") == "1" and output:
            try:
                from ..po_agent import sample_agent_output
                result = sample_agent_output(name, output[:2000])
                verdict = result["verdict"]
                color = {"APPROVE": "green", "WARN": "yellow", "BLOCK": "red"}.get(verdict, "white")
                console.print(f"\n[{color}]PO sample: {verdict}[/{color}]")
            except Exception:
                pass

        # A1 leerloop — detecteer fouten in output en schrijf les naar LESSONS.md
        if output:
            try:
                from ..config import get as _cfg_get
                if _cfg_get("auto_lessons") is not False:
                    from ..lessons import detect_error_in_output, write_error_lesson_to_workspace
                    is_error, error_summary = detect_error_in_output(output)
                    if is_error:
                        lesson_path = write_error_lesson_to_workspace(
                            agent_name=name,
                            model=getattr(rec, "model", "unknown"),
                            task=getattr(rec, "task", ""),
                            error_summary=error_summary,
                            workspace_dir=os.getcwd(),
                        )
                        console.print(f"\n[yellow]⚠️  Fout gedetecteerd — les toegevoegd aan {lesson_path}[/yellow]")
            except Exception:
                pass

    @app.command()
    def clean():
        """Clean up workspaces of all finished agents."""
        cleaned = clean_finished()
        if cleaned:
            console.print(f"[green]Cleaned {len(cleaned)} agent(s): {', '.join(cleaned)}[/green]")
        else:
            console.print("[dim]Nothing to clean.[/dim]")

    @app.command()
    def delegate(
        task: str = typer.Argument(..., help="The high-level task to delegate"),
        model: str = typer.Option("claude/sonnet", "--model", "-m", help="Worker model"),
        orchestrator_model: str = typer.Option("claude/opus", "--orchestrator-model", help="Orchestrator model"),
        name: str = typer.Option("", "--name", "-n", help="Base name for the orchestrator"),
        max_workers: int = typer.Option(5, "--max-workers", help="Max concurrent workers per batch"),
    ):
        """Delegate a task: spawns orchestrator + workers automatically (D-051)."""
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
    def resume(name: str = typer.Argument(..., help="Agent name to resume from checkpoint")):
        """Resume an agent from its last checkpoint."""
        from ..checkpoint import load_checkpoint, resume_from_checkpoint

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

    @app.command(name="quality-loop")
    def quality_loop(
        name: str = typer.Argument(..., help="Agent name to run quality loop on"),
        task: str = typer.Option("", "--task", "-t", help="Original task description (for context, auto-detected if omitted)"),
        max_iterations: int = typer.Option(3, "--max-iterations", "-n", help="Max feedback rounds (default: 3)"),
        evaluator_model: str = typer.Option("claude/haiku", "--evaluator-model", "-e", help="Model for quality evaluation"),
        sender: str = typer.Option("quality-loop", "--from", "-f", help="Sender name for feedback messages"),
        wait_timeout: int = typer.Option(120, "--wait-timeout", help="Seconds to wait for each agent update (default: 120)"),
    ):
        """Run a quality improvement loop on an agent: evaluate → send feedback → repeat.

        Works for both local Claude agents and remote Ollama agents.
        Evaluates output/result.md, sends targeted feedback, waits for update.
        """
        import subprocess as _subprocess
        from ..messaging import send_message as _send_message
        from ..workspace import read_output, remote_is_done, sync_output_from_remote

        rec = get_agent(name)
        if rec is None:
            console.print(f"[red]Agent '{name}' not found.[/red]")
            raise typer.Exit(1)

        if not task:
            task = rec.task or ""

        is_remote = bool(getattr(rec, "remote_host", None) and getattr(rec, "remote_workspace", None))

        def _read_result() -> str:
            """Read current result.md content (local or remote)."""
            if is_remote:
                result = _subprocess.run(
                    ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5",
                     rec.remote_host, f"cat {rec.remote_workspace}/output/result.md 2>/dev/null"],
                    capture_output=True, text=True, timeout=15,
                )
                return result.stdout.strip()
            else:
                ws = rec.workspace or ""
                result_path = Path(ws) / "output" / "result.md"
                if result_path.exists():
                    return result_path.read_text().strip()
                return ""

        def _get_mtime() -> float:
            """Get result.md modification time."""
            if is_remote:
                result = _subprocess.run(
                    ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5",
                     rec.remote_host, f"stat -c %Y {rec.remote_workspace}/output/result.md 2>/dev/null || echo 0"],
                    capture_output=True, text=True, timeout=10,
                )
                try:
                    return float(result.stdout.strip())
                except (ValueError, AttributeError):
                    return 0.0
            else:
                ws = rec.workspace or ""
                result_path = Path(ws) / "output" / "result.md"
                if result_path.exists():
                    return result_path.stat().st_mtime
                return 0.0

        def _wait_for_update(baseline_mtime: float) -> bool:
            """Poll until result.md is newer than baseline_mtime."""
            deadline = time.time() + wait_timeout
            while time.time() < deadline:
                time.sleep(4)
                current = _get_mtime()
                if current > baseline_mtime:
                    return True
            return False

        def _evaluate(output: str, iteration: int) -> tuple[bool, str]:
            """Use LLM to evaluate output quality. Returns (passed, feedback)."""
            try:
                eval_prompt = (
                    f"Je bent een kwaliteitsevaluator. Beoordeel of deze output de taak volledig en goed uitvoert.\n\n"
                    f"TAAK:\n{task[:500]}\n\n"
                    f"OUTPUT (iteratie {iteration}):\n{output[:2000]}\n\n"
                    f"Geef EXACT één van de volgende antwoorden:\n"
                    f"1. Als de output goed en volledig is: schrijf exact 'PASS'\n"
                    f"2. Als verbetering nodig is: schrijf 'FEEDBACK: <concrete verbeterpunten in 1-3 zinnen>'\n\n"
                    f"Wees streng maar eerlijk. Focus op ontbrekende inhoud, onjuistheden of onvolledigheid."
                )

                # Use claude CLI for evaluation
                from ..spawner import CLAUDE_CMD, CLAUDE_MODEL_MAP, _validate_claude_model
                _eval_model = CLAUDE_MODEL_MAP.get(evaluator_model)
                if _eval_model is None and evaluator_model.startswith("claude/"):
                    _eval_model = evaluator_model.split("/", 1)[1]
                if _eval_model is None:
                    _eval_model = "claude-haiku-4-5-20251001"
                _eval_model = _validate_claude_model(_eval_model)

                import subprocess as sp
                result2 = sp.run(
                    [CLAUDE_CMD, "--model", _eval_model, "--dangerously-skip-permissions", "-p", eval_prompt],
                    capture_output=True, text=True, timeout=60,
                )
                verdict = result2.stdout.strip()

                if verdict.upper().startswith("PASS"):
                    return True, ""
                elif verdict.upper().startswith("FEEDBACK:"):
                    return False, verdict[len("FEEDBACK:"):].strip()
                else:
                    # Heuristic: if output is very short, request expansion
                    if len(output) < 100:
                        return False, "Output is te kort. Geef een uitgebreidere, meer gedetailleerde uitwerking van de taak."
                    return True, ""  # Default: accept if evaluator gave unclear response
            except Exception as e:
                console.print(f"[dim]Evaluator error: {e} — assuming PASS[/dim]")
                return True, ""

        console.print(f"[bold]Quality loop[/bold] voor agent '[cyan]{name}[/cyan]' (max {max_iterations} ronden)\n")

        for iteration in range(1, max_iterations + 1):
            output = _read_result()
            if not output:
                console.print(f"[yellow]Ronde {iteration}: geen output/result.md gevonden. Wacht op agent...[/yellow]")
                # Wait for initial result
                baseline = _get_mtime()
                if not _wait_for_update(-1):
                    console.print(f"[red]Timeout: agent '{name}' heeft geen output geproduceerd.[/red]")
                    raise typer.Exit(1)
                output = _read_result()

            console.print(f"[dim]Ronde {iteration}/{max_iterations}: evaluating {len(output)} chars...[/dim]")
            passed, feedback_msg = _evaluate(output, iteration)

            if passed:
                console.print(f"[green]✅ PASS na {iteration} ronde(n)![/green]")
                console.print(f"\n[bold]Finale output ({len(output)} chars):[/bold]")
                console.print(output[:1000] + ("..." if len(output) > 1000 else ""))
                return

            if iteration == max_iterations:
                console.print(f"[yellow]Max iteraties bereikt. Laatste feedback: {feedback_msg}[/yellow]")
                break

            console.print(f"[yellow]Ronde {iteration}: feedback → {feedback_msg[:120]}[/yellow]")

            # Send feedback to agent
            baseline_mtime = _get_mtime()
            _send_message(sender, name, feedback_msg, metadata={"type": "feedback", "iteration": iteration})
            console.print(f"[dim]Feedback verstuurd. Wachten op update (max {wait_timeout}s)...[/dim]")

            if not _wait_for_update(baseline_mtime):
                console.print(f"[yellow]Agent reageerde niet binnen {wait_timeout}s op feedback in ronde {iteration}.[/yellow]")
                break

            console.print(f"[green]Agent heeft output bijgewerkt (ronde {iteration}).[/green]")

        console.print(f"\n[dim]Quality loop klaar. Gebruik 'oa collect {name}' voor volledige output.[/dim]")
