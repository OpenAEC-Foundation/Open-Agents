#!/usr/bin/env python3
"""
benchmark_aggregate.py — Aggregeer alle benchmark runs tot een leaderboard.

Gebruik:
  python3 benchmark_aggregate.py                         # Update LEADERBOARD.md
  python3 benchmark_aggregate.py --format json           # Print JSON naar stdout
  python3 benchmark_aggregate.py --model qwen2.5:14b     # Model geschiedenis
  python3 benchmark_aggregate.py --since 2026-03-01      # Filter op datum
  python3 benchmark_aggregate.py --category reasoning    # Filter op categorie

Output:
  - docs/benchmarks/LEADERBOARD.md (bij default aanroep)
  - JSON naar stdout (bij --format json)
  - Trendanalyse per model
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


# Bepaal de repo root relatief aan dit script
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
RUNS_DIR = REPO_ROOT / "docs" / "benchmarks" / "runs"
LEADERBOARD_FILE = REPO_ROOT / "docs" / "benchmarks" / "LEADERBOARD.md"


def load_all_runs(since: Optional[str] = None) -> list[dict]:
    """Laad alle run JSON bestanden uit de runs directory."""
    if not RUNS_DIR.exists():
        return []

    runs = []
    for run_file in sorted(RUNS_DIR.glob("*.json")):
        try:
            with open(run_file, "r", encoding="utf-8") as f:
                run = json.load(f)
                # Filter op datum indien opgegeven
                if since:
                    run_ts = run.get("timestamp", "")[:10]
                    if run_ts < since:
                        continue
                runs.append(run)
        except (json.JSONDecodeError, KeyError) as e:
            print(f"WAARSCHUWING: Kan {run_file.name} niet laden: {e}", file=sys.stderr)

    return runs


def aggregate_by_model(runs: list[dict]) -> dict:
    """
    Aggregeer runs per model.
    Berekent gemiddelde scores, beste run, trend.
    """
    by_model = defaultdict(list)
    for run in runs:
        model_short = run.get("model_short", run.get("model", "unknown"))
        by_model[model_short].append(run)

    aggregated = {}
    for model, model_runs in by_model.items():
        # Sorteer op timestamp
        model_runs.sort(key=lambda r: r.get("timestamp", ""))

        scores = [r["summary"]["pct_score"] for r in model_runs]
        latest = model_runs[-1]

        # Trend: vergelijk laatste run met eerste run
        trend = "—"
        if len(scores) > 1:
            diff = scores[-1] - scores[0]
            if diff > 2:
                trend = f"↑ +{diff:.1f}%"
            elif diff < -2:
                trend = f"↓ {diff:.1f}%"
            else:
                trend = "→ stabiel"

        # Per categorie gemiddelde
        cat_totals = defaultdict(list)
        for run in model_runs:
            for cat, score in run["summary"].get("by_category", {}).items():
                cat_totals[cat].append(score)
        cat_avgs = {cat: round(sum(v) / len(v), 1) for cat, v in cat_totals.items()}

        # Gemiddelde latency
        avg_latency = int(sum(r["summary"]["total_latency_ms"] for r in model_runs) / len(model_runs))

        aggregated[model] = {
            "model": model,
            "provider": latest.get("provider", "unknown"),
            "hardware": latest.get("hardware", {}),
            "run_count": len(model_runs),
            "latest_run": latest.get("timestamp", "")[:10],
            "latest_score_pct": scores[-1],
            "best_score_pct": max(scores),
            "avg_score_pct": round(sum(scores) / len(scores), 1),
            "trend": trend,
            "by_category": cat_avgs,
            "avg_latency_ms": avg_latency,
            "runs": model_runs,
        }

    return aggregated


def build_leaderboard_md(aggregated: dict, since: Optional[str] = None) -> str:
    """Genereer de LEADERBOARD.md inhoud."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    since_note = f" (vanaf {since})" if since else ""

    lines = [
        "# Open-Agents GPU Model Leaderboard",
        "",
        f"> Automatisch gegenereerd op {now}{since_note}",
        f"> Bijgewerkt met: `python3 tools/benchmark_aggregate.py`",
        "",
        "## Overzicht",
        "",
        "Dit leaderboard toont de prestaties van GPU-modellen op de Hetzner server (RTX 4000 Ada).",
        "Scores zijn gebaseerd op de [Standard Benchmark Suite v1](suites/standard-v1.json).",
        "",
    ]

    if not aggregated:
        lines += [
            "**Nog geen benchmark runs beschikbaar.**",
            "",
            "Voer je eerste benchmark uit met:",
            "```bash",
            "python3 tools/benchmark_runner.py --model <model> --host hetzner-agent",
            "```",
            "",
        ]
        lines.append(f"*Gegenereerd op {now}*")
        return "\n".join(lines)

    # Sorteer op beste score
    sorted_models = sorted(aggregated.values(), key=lambda m: m["best_score_pct"], reverse=True)

    lines += [
        "## Ranglijst",
        "",
        "| Rang | Model | Beste Score | Gem. Score | Laatste Score | Trend | Runs | Laatste Run |",
        "|------|-------|------------|-----------|--------------|-------|------|------------|",
    ]

    for i, model_data in enumerate(sorted_models, 1):
        rank = f"#{i}"
        model = model_data["model"]
        best = f"{model_data['best_score_pct']}%"
        avg = f"{model_data['avg_score_pct']}%"
        latest = f"{model_data['latest_score_pct']}%"
        trend = model_data["trend"]
        runs = model_data["run_count"]
        last_run = model_data["latest_run"]

        lines.append(f"| {rank} | `{model}` | **{best}** | {avg} | {latest} | {trend} | {runs} | {last_run} |")

    lines += [
        "",
        "## Per Categorie",
        "",
        "| Model | Reasoning | Code | Taal | Instructie | Gem. Latency |",
        "|-------|-----------|------|------|-----------|-------------|",
    ]

    for model_data in sorted_models:
        model = model_data["model"]
        cats = model_data["by_category"]
        r = cats.get("reasoning", "-")
        c = cats.get("code", "-")
        l = cats.get("language", "-")
        i = cats.get("instruction", "-")
        lat = f"{model_data['avg_latency_ms']}ms"
        lines.append(f"| `{model}` | {r} | {c} | {l} | {i} | {lat} |")

    lines += ["", "## Trendanalyse", ""]

    for model_data in sorted_models:
        if model_data["run_count"] > 1:
            model = model_data["model"]
            runs = model_data["runs"]
            lines.append(f"### {model}")
            lines.append("")
            lines.append("| Datum | Score | Latency |")
            lines.append("|-------|-------|---------|")
            for run in runs:
                date = run["timestamp"][:10]
                score = f"{run['summary']['pct_score']}%"
                latency = f"{run['summary']['total_latency_ms']}ms"
                lines.append(f"| {date} | {score} | {latency} |")
            lines.append("")

    lines += [
        "## Hardware",
        "",
        "| Spec | Waarde |",
        "|------|--------|",
        "| GPU | RTX 4000 Ada |",
        "| VRAM | 20 GB |",
        "| Host | hetzner-agent |",
        "| Backend | Ollama |",
        "",
        "## Benchmark Suite",
        "",
        "| Test ID | Categorie | Beschrijving |",
        "|---------|-----------|-------------|",
        "| reasoning-001 | Reasoning | nohup/SSH process kennis |",
        "| code-001 | Code | Python deduplicatie functie |",
        "| language-001 | Taal | NL uitleg agent vs workflow |",
        "| instruction-001 | Instructie | Fibonacci reeks t/m 100 |",
        "",
        "Zie [suites/standard-v1.json](suites/standard-v1.json) voor volledige details.",
        "",
        "---",
        f"*Gegenereerd op {now}*",
    ]

    return "\n".join(lines)


def print_model_history(model_name: str, runs: list[dict]) -> None:
    """Print de run geschiedenis van een specifiek model."""
    model_runs = [r for r in runs if model_name in r.get("model_short", "") or model_name in r.get("model", "")]

    if not model_runs:
        print(f"Geen runs gevonden voor model: {model_name}")
        return

    model_runs.sort(key=lambda r: r.get("timestamp", ""))

    print(f"\nGeschiedenis voor: {model_name}")
    print(f"{'='*60}")
    print(f"{'Datum':<12} {'Score':<10} {'Pct':<8} {'Latency':<12}")
    print(f"{'-'*12} {'-'*10} {'-'*8} {'-'*12}")

    for run in model_runs:
        date = run["timestamp"][:10]
        score = f"{run['summary']['total_score']}/{run['summary']['max_score']}"
        pct = f"{run['summary']['pct_score']}%"
        latency = f"{run['summary']['total_latency_ms']}ms"
        print(f"{date:<12} {score:<10} {pct:<8} {latency:<12}")

    print(f"{'='*60}")
    print(f"Totaal runs: {len(model_runs)}")
    if len(model_runs) > 1:
        scores = [r["summary"]["pct_score"] for r in model_runs]
        print(f"Beste: {max(scores)}% | Slechtste: {min(scores)}% | Gemiddeld: {sum(scores)/len(scores):.1f}%")


def main():
    parser = argparse.ArgumentParser(
        description="Aggregeer Open-Agents benchmark runs naar leaderboard",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown",
                        help="Output formaat (default: markdown)")
    parser.add_argument("--model", help="Filter op model naam")
    parser.add_argument("--since", help="Filter op datum (YYYY-MM-DD)")
    parser.add_argument("--category", help="Filter op categorie")
    parser.add_argument("--output", help="Output bestand (default: docs/benchmarks/LEADERBOARD.md)")
    parser.add_argument("--dry-run", action="store_true", help="Toon output zonder te schrijven")

    args = parser.parse_args()

    # Laad alle runs
    runs = load_all_runs(since=args.since)
    print(f"Geladen: {len(runs)} run(s)", file=sys.stderr)

    if args.model:
        # Model geschiedenis modus
        print_model_history(args.model, runs)
        return

    # Aggregeer
    aggregated = aggregate_by_model(runs)

    if args.format == "json":
        # Verwijder de volledige run data voor JSON export (te groot)
        clean = {k: {kk: vv for kk, vv in v.items() if kk != "runs"}
                 for k, v in aggregated.items()}
        print(json.dumps(clean, indent=2, ensure_ascii=False))
        return

    # Genereer markdown leaderboard
    md = build_leaderboard_md(aggregated, since=args.since)

    output_path = Path(args.output) if args.output else LEADERBOARD_FILE

    if args.dry_run:
        print(md)
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"Leaderboard geschreven naar: {output_path}")
    print(f"Modellen verwerkt: {len(aggregated)}")
    if aggregated:
        top = max(aggregated.values(), key=lambda m: m["best_score_pct"])
        print(f"Huidige #1: {top['model']} ({top['best_score_pct']}%)")


if __name__ == "__main__":
    main()
