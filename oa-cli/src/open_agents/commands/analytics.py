"""Analytics commands: analytics, benchmark, gpu, meta, test."""

from __future__ import annotations

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

from ..spawner import spawn_agent

console = Console()


def register_commands(app: typer.Typer) -> None:
    """Register all analytics-related commands on the app."""

    @app.command(name="test")
    def test_cmd(
        agent: str = typer.Argument(..., help="Agent name to test or save reference for"),
        save_reference: bool = typer.Option(False, "--save-reference", help="Save current metrics as reference baseline"),
        check: bool = typer.Option(False, "--check", help="Check current metrics against saved reference"),
    ):
        """Test agent performance against a saved reference baseline (#44)."""
        from rich.table import Table
        from ..regression_guard import check_regression, get_agent_metrics_from_telemetry, save_reference_run

        metrics = get_agent_metrics_from_telemetry(agent)

        if save_reference:
            path = save_reference_run(agent, metrics)
            console.print(f"[green]Reference saved for '{agent}' → {path}[/green]")
            table = Table(title=f"Reference Metrics: {agent}")
            table.add_column("Metric", style="cyan")
            table.add_column("Value", justify="right")
            for k, v in metrics.items():
                table.add_row(k, f"{v:.4f}" if isinstance(v, float) else str(v))
            console.print(table)
            return

        if check:
            result = check_regression(agent, metrics)
            if not result.regressed:
                console.print(f"[green]No regression detected for '{agent}'.[/green]")
            else:
                console.print(f"[red]Regression detected for '{agent}' — severity: {result.severity}[/red]")
            if result.delta:
                table = Table(title=f"Regression Check: {agent}")
                table.add_column("Metric", style="cyan")
                table.add_column("Delta %", justify="right")
                for k, v in result.delta.items():
                    color = "red" if v < 0 else "green"
                    table.add_row(k, f"[{color}]{v:+.2f}%[/{color}]")
                console.print(table)
            return

        console.print("[yellow]Use --save-reference or --check. See 'oa test --help'.[/yellow]")

    @app.command(name="meta")
    def meta_cmd(
        action: str = typer.Argument("analyze", help="Action: 'analyze' or 'run'"),
    ):
        """Meta-agent: analyze telemetry or run recommended actions (#25)."""
        from rich.table import Table
        from ..meta_agent import analyze, run_top_actions, save_actions

        if action == "analyze":
            result = analyze()
            console.print(Panel(
                f"Total runs: {result.total_runs}  |  "
                f"Success rate: {result.success_rate:.0%}  |  "
                f"Fail patterns: {len(result.fail_patterns)}  |  "
                f"Duration anomalies: {len(result.duration_anomalies)}",
                title="Meta-Agent Analysis",
            ))

            if result.fail_patterns:
                console.print("\n[bold]Fail Patterns:[/bold]")
                for p in result.fail_patterns:
                    console.print(f"  [red]• {p}[/red]")

            if result.duration_anomalies:
                console.print("\n[bold]Duration Anomalies:[/bold]")
                for a in result.duration_anomalies:
                    console.print(f"  [yellow]• {a}[/yellow]")

            if result.actions:
                save_actions(result.actions)
                table = Table(title="Recommended Actions")
                table.add_column("#", justify="right", style="dim")
                table.add_column("Type", style="cyan")
                table.add_column("Target", style="bold")
                table.add_column("Reason")
                for a in result.actions:
                    table.add_row(str(a.priority), a.action_type, a.target, a.reason)
                console.print(table)
                console.print(f"\n[dim]Actions saved to ~/.oa/meta-actions.yaml. Run 'oa meta run' to execute top 3.[/dim]")
            else:
                console.print("[green]No issues found. System looks healthy.[/green]")

        elif action == "run":
            results = run_top_actions(limit=3)
            console.print(Panel("Executing Top Actions", title="Meta-Agent"))
            for msg in results:
                console.print(f"  • {msg}")

        else:
            console.print(f"[red]Unknown action '{action}'. Use 'analyze' or 'run'.[/red]")

    @app.command(name="analytics")
    def analytics_cmd(
        subcommand: str = typer.Argument(
            ..., help="Subcommand: 'health', 'domains', or 'blind-spots'"
        ),
        open_report: bool = typer.Option(False, "--open", help="Open report in $PAGER or less"),
    ):
        """Periodic Analytics & Observability — health, domains, blind-spots (#37/#38/#39)."""
        import os
        import subprocess
        from rich.table import Table

        if subcommand == "health":
            from ..analytics import health_report

            path = health_report()
            console.print(f"[green]Health report generated:[/green] {path}")
            if open_report:
                pager = os.environ.get("PAGER", "less")
                subprocess.run([pager, path])
            else:
                console.print(Path(path).read_text())

        elif subcommand == "domains":
            from ..knowledge_map import success_by_domain

            domains = success_by_domain()
            if not domains:
                console.print("[yellow]No run data available.[/yellow]")
                return

            table = Table(title="Success Rate by Domain")
            table.add_column("Domain", style="bold")
            table.add_column("Total", justify="right")
            table.add_column("Success", justify="right", style="green")
            table.add_column("Failed", justify="right", style="red")
            table.add_column("Rate", justify="right")

            for domain, s in sorted(domains.items(), key=lambda x: x[1]["rate"]):
                rate_style = "green" if s["rate"] >= 80 else "yellow" if s["rate"] >= 50 else "red"
                table.add_row(
                    domain, str(s["total"]), str(s["success"]),
                    str(s["failed"]), f"[{rate_style}]{s['rate']}%[/{rate_style}]",
                )
            console.print(table)

        elif subcommand in ("blind-spots", "blindspots"):
            from ..blind_spot import categorize_blind_spots, generate_blind_spot_report

            runs_count = len(json.loads(
                (Path.home() / ".oa" / "runs-index.json").read_text()
            )) if (Path.home() / ".oa" / "runs-index.json").exists() else 0

            if runs_count < 5:
                console.print(f"[yellow]Insufficient data (need 5+ runs, have {runs_count}).[/yellow]")
                return

            categories = categorize_blind_spots()
            if not categories:
                console.print("[green]No failure patterns detected.[/green]")
                return

            table = Table(title="Blind Spot Analysis — Failure Patterns")
            table.add_column("Category", style="bold")
            table.add_column("Count", justify="right", style="red")
            table.add_column("Example Agents")

            for cat, runs in sorted(categories.items(), key=lambda x: -len(x[1])):
                examples = ", ".join(r.get("agent_name", "?") for r in runs[:3])
                table.add_row(cat, str(len(runs)), examples)
            console.print(table)

            path = generate_blind_spot_report()
            console.print(f"\n[dim]Full report: {path}[/dim]")

        else:
            console.print(
                "[red]Unknown subcommand. Use 'health', 'domains', or 'blind-spots'.[/red]"
            )

    @app.command()
    def guardian(
        trigger: str = typer.Argument("manual", help="Trigger type: release|feature|manual"),
        tag: str = typer.Option(None, "--tag", help="Release tag (bijv. v0.3.1)"),
    ) -> None:
        """Spawn de Doc Guardian agent om docs en release notes te updaten."""
        tag_info = f" Tag: {tag}." if tag else ""
        task = (
            f"Doc Guardian trigger: {trigger}.{tag_info} "
            "Update README, docs, CHANGELOG en maak release notes. "
            "Schrijf ./output/result.md met samenvatting en maak .done aan."
        )

        record = spawn_agent(
            name="doc-guardian",
            task=task,
            model="claude/sonnet",
        )

        if record:
            console.print(f"[green]Doc Guardian spawned: {record.get('name', 'doc-guardian')}[/green]")
            console.print(f"[dim]Trigger: {trigger}{tag_info}[/dim]")
            console.print("[dim]Monitor with: oa status[/dim]")
        else:
            console.print("[red]Failed to spawn Doc Guardian.[/red]")

    @app.command(name="benchmark")
    def benchmark(
        subcommand: str = typer.Argument("run", help="run | all | leaderboard | rescore | embed"),
        model: str = typer.Option(None, "--model", "-m", help="Model naam (bijv. qwen2.5:14b)"),
        host: str = typer.Option("hetzner-agent", "--host", help="SSH host"),
        timeout: int = typer.Option(300, "--timeout", help="Max seconden per test"),
        auto_score: bool = typer.Option(True, "--auto-score/--no-auto-score", help="Auto-score met Claude haiku"),
    ) -> None:
        """GPU model benchmark tool. Subcommands: run, all, leaderboard, rescore, embed."""
        import os
        import subprocess

        repo_root = Path(__file__).parent.parent.parent.parent.parent
        tools_dir = repo_root / "tools"

        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

        if subcommand == "run":
            if not model:
                console.print("[red]Geef een model op: oa benchmark run --model qwen2.5:14b[/red]")
                console.print("[dim]Tip: gebruik 'oa benchmark all' om alle GPU modellen te benchmarken[/dim]")
                raise typer.Exit(1)
            console.print(f"[cyan]Benchmark: {model} @ {host}[/cyan]")
            score_flag = ["--auto-score"] if auto_score else []
            result = subprocess.run(
                ["python3", str(tools_dir / "benchmark_runner.py"),
                 "--model", model, "--host", host, "--timeout", str(timeout)] + score_flag,
                env=env,
            )
            if result.returncode == 0:
                console.print("[dim]Update leaderboard: oa benchmark leaderboard[/dim]")
            raise typer.Exit(result.returncode)

        elif subcommand == "all":
            console.print(f"[cyan]Ontdek modellen op {host}...[/cyan]")
            try:
                result = subprocess.run(
                    ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8",
                     host, "ollama list 2>/dev/null"],
                    capture_output=True, text=True, timeout=10, env=env,
                )
                lines = result.stdout.strip().splitlines()[1:]
                models_found = [
                    line.split()[0] for line in lines
                    if line.strip() and not any(e in line for e in ("embed", "bge", "nomic"))
                ]
            except Exception as exc:
                console.print(f"[red]SSH mislukt: {exc}[/red]")
                raise typer.Exit(1)

            if not models_found:
                console.print("[red]Geen modellen gevonden op server.[/red]")
                raise typer.Exit(1)

            console.print(f"[green]{len(models_found)} modellen gevonden:[/green]")
            for m in models_found:
                console.print(f"  • {m}")
            console.print()

            score_flag = ["--auto-score"] if auto_score else []
            failed = []
            for i, m in enumerate(models_found, 1):
                console.print(f"[cyan][{i}/{len(models_found)}] {m}[/cyan]")
                r = subprocess.run(
                    ["python3", str(tools_dir / "benchmark_runner.py"),
                     "--model", m, "--host", host, "--timeout", str(timeout)] + score_flag,
                    env=env,
                )
                if r.returncode != 0:
                    failed.append(m)

            subprocess.run(["python3", str(tools_dir / "benchmark_aggregate.py")], env=env)

            console.print()
            console.print(f"[green]{len(models_found) - len(failed)}/{len(models_found)} modellen gebenchmarkt[/green]")
            if failed:
                console.print(f"[yellow]Mislukt: {', '.join(failed)}[/yellow]")
            console.print("[dim]Bekijk resultaten: oa benchmark leaderboard[/dim]")
            raise typer.Exit(0 if not failed else 1)

        elif subcommand == "embed":
            if not model:
                model = "bge-m3:latest"
            console.print(f"[cyan]Embedding benchmark: {model} @ {host}[/cyan]")
            result = subprocess.run(
                ["python3", str(tools_dir / "benchmark_embedding.py"), "--model", model, "--host", host],
                env=env,
            )
            raise typer.Exit(result.returncode)

        elif subcommand == "leaderboard":
            result = subprocess.run(
                ["python3", str(tools_dir / "benchmark_aggregate.py")],
                env=env,
            )
            if result.returncode == 0:
                leaderboard = repo_root / "docs/benchmarks/LEADERBOARD.md"
                if leaderboard.exists():
                    console.print(leaderboard.read_text())
            raise typer.Exit(result.returncode)

        elif subcommand == "rescore":
            console.print("[cyan]Rescoring benchmark runs met Claude haiku...[/cyan]")
            result = subprocess.run(
                ["python3", str(tools_dir / "benchmark_rescore.py")],
                env=env,
            )
            raise typer.Exit(result.returncode)

        else:
            console.print(f"[red]Onbekend subcommand: {subcommand}[/red]")
            console.print("[dim]Gebruik: oa benchmark run|all|leaderboard|rescore|embed[/dim]")
            raise typer.Exit(1)

    @app.command(name="gpu")
    def gpu_cmd(
        host: str = typer.Option("hetzner-agent", "--host", help="SSH host van de GPU server"),
        probe: bool = typer.Option(False, "--probe", help="Spawn een proef-agent per model"),
        task: str = typer.Option("Geef je naam en één zin wat je kunt. Schrijf naar ./output/result.md", "--task", help="Proef-taak voor alle agents"),
    ) -> None:
        """Toon GPU server status en geïnstalleerde modellen. Optioneel: spawn proef-agents."""
        import subprocess

        console.print(f"[cyan]GPU server: {host}[/cyan]")

        try:
            result = subprocess.run(
                ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8",
                 host, "ollama list 2>/dev/null"],
                capture_output=True, text=True, timeout=10,
            )
            lines = result.stdout.strip().splitlines()
            if len(lines) < 2:
                console.print("[red]Geen modellen gevonden of SSH mislukt.[/red]")
                raise typer.Exit(1)

            chat_models = []
            embed_models = []
            for line in lines[1:]:
                parts = line.split()
                if not parts:
                    continue
                name = parts[0]
                size = parts[2] if len(parts) > 2 else "?"
                unit = parts[3] if len(parts) > 3 else ""
                if any(e in name for e in ("embed", "bge", "nomic")):
                    embed_models.append((name, size, unit))
                else:
                    chat_models.append((name, size, unit))

        except Exception as exc:
            console.print(f"[red]SSH fout: {exc}[/red]")
            raise typer.Exit(1)

        console.print()
        console.print(f"[bold]Chat modellen ({len(chat_models)}):[/bold]")
        for name, size, unit in chat_models:
            import json as _json
            runs_dir = Path(__file__).parent.parent.parent.parent.parent / "docs/benchmarks/runs"
            best_score = None
            if runs_dir.exists():
                model_slug = name.replace(":", "-").replace("/", "-")
                for f in sorted(runs_dir.glob(f"*{model_slug}*.json")):
                    try:
                        d = _json.loads(f.read_text())
                        s = d["summary"]["pct_score"]
                        if best_score is None or s > best_score:
                            best_score = s
                    except Exception:
                        pass
            score_str = f"  [green]{best_score}%[/green]" if best_score else ""
            console.print(f"  [white]{name}[/white]  [dim]{size} {unit}[/dim]{score_str}")

        if embed_models:
            console.print()
            console.print(f"[bold]Embedding modellen ({len(embed_models)}):[/bold]")
            for name, size, unit in embed_models:
                console.print(f"  [white]{name}[/white]  [dim]{size} {unit}[/dim]")

        console.print()
        console.print("[dim]Spawn agent:   oa run \"taak\" --model hetzner/<model> --direct[/dim]")
        console.print("[dim]Benchmark:     oa benchmark run --model <model>[/dim]")
        console.print("[dim]Alles testen:  oa benchmark all[/dim]")
        console.print("[dim]Chat UI:       oa web  →  Chat tab  →  GPU Server[/dim]")

        if not probe:
            return

        console.print()
        console.print(f"[yellow]Probe mode: {len(chat_models)} agents spawnen...[/yellow]")
        spawned = []
        for name, _, _ in chat_models:
            agent_name = f"probe-{name.replace(':', '-').replace('.', '')}"
            record = spawn_agent(
                name=agent_name,
                task=task,
                model=f"hetzner/{name}",
                direct=True,
            )
            if record:
                console.print(f"  [green]✓[/green] {agent_name}  ({name})")
                spawned.append(agent_name)
            else:
                console.print(f"  [red]✗[/red] {name}")

        console.print()
        console.print(f"[green]{len(spawned)} probe-agents actief.[/green]")
        console.print("[dim]Status: oa status[/dim]")
        console.print("[dim]Output: oa collect probe-<model>[/dim]")
