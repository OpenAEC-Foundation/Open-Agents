"""Blind Spot Scanner (Issue #39) — cluster failed runs and categorize failure patterns.

Requires minimum 5 runs to produce meaningful output.
Categories: timeout, context-overflow, tool-failure, unclear-task, model-mismatch, other.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"
REPORTS_DIR = Path.home() / ".oa" / "reports"
MIN_RUNS = 5

CATEGORY_PATTERNS: dict[str, list[str]] = {
    "timeout": ["timeout", "timed out", "exceeded", "deadline"],
    "context-overflow": ["context", "token limit", "too long", "truncat", "compaction"],
    "tool-failure": ["tool", "permission", "denied", "not found", "command failed"],
    "unclear-task": ["unclear", "ambiguous", "missing", "incomplete", "vague"],
    "model-mismatch": ["wrong model", "haiku", "capability", "too complex"],
}


def _load_index() -> list[dict]:
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def cluster_failures() -> dict[str, list[dict]]:
    """Group failed runs by model, task-type pattern, and duration bucket.

    Returns {cluster_key: [run, ...]}.
    """
    runs = _load_index()
    failures = [r for r in runs if r.get("exit_status") not in ("success", "unknown", None)]

    clusters: dict[str, list[dict]] = defaultdict(list)

    for run in failures:
        model = run.get("model", "unknown")
        clusters[f"model:{model}"].append(run)

        dur = run.get("duration_seconds")
        if dur is not None:
            if dur < 30:
                clusters["duration:<30s"].append(run)
            elif dur < 120:
                clusters["duration:30s-2m"].append(run)
            elif dur < 300:
                clusters["duration:2m-5m"].append(run)
            else:
                clusters["duration:>5m"].append(run)

    return dict(clusters)


def categorize_blind_spots() -> dict[str, list[dict]]:
    """Label failure clusters into categories based on task text patterns.

    Categories: timeout, context-overflow, tool-failure, unclear-task, model-mismatch, other.
    """
    runs = _load_index()
    failures = [r for r in runs if r.get("exit_status") not in ("success", "unknown", None)]

    categories: dict[str, list[dict]] = defaultdict(list)

    for run in failures:
        task = (run.get("task", "") + " " + run.get("exit_status", "")).lower()
        matched = False
        for category, patterns in CATEGORY_PATTERNS.items():
            if any(p in task for p in patterns):
                categories[category].append(run)
                matched = True
                break
        if not matched:
            categories["other"].append(run)

    return dict(categories)


def generate_blind_spot_report(output_path: Optional[str] = None) -> str:
    """Write blind-spots.md to ~/.oa/reports/.

    Returns path to the generated file. Requires MIN_RUNS runs minimum.
    """
    dest = Path(output_path) if output_path else REPORTS_DIR / "blind-spots.md"
    dest.parent.mkdir(parents=True, exist_ok=True)

    runs = _load_index()
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    if len(runs) < MIN_RUNS:
        dest.write_text(
            "# Blind Spot Scanner Report\n\n"
            f"_Generated: {now}_\n\n"
            f"Insufficient data (need {MIN_RUNS}+ runs, have {len(runs)}).\n"
        )
        return str(dest)

    clusters = cluster_failures()
    categories = categorize_blind_spots()

    lines = [
        "# Blind Spot Scanner Report",
        f"\n_Generated: {now}_\n",
    ]

    failures_total = sum(
        1 for r in runs if r.get("exit_status") not in ("success", "unknown", None)
    )

    if failures_total == 0:
        lines.append("No failures detected. All runs succeeded.")
        dest.write_text("\n".join(lines) + "\n")
        return str(dest)

    lines += [
        f"**Total failures: {failures_total} / {len(runs)} runs**\n",
        "## Failure Categories",
        "| Category | Count | Examples |",
        "|----------|-------|----------|",
    ]
    for cat, cat_runs in sorted(categories.items(), key=lambda x: -len(x[1])):
        examples = ", ".join(r.get("agent_name", "?") for r in cat_runs[:3])
        lines.append(f"| {cat} | {len(cat_runs)} | {examples} |")

    lines += [
        "",
        "## Failure Clusters",
        "| Cluster | Count |",
        "|---------|-------|",
    ]
    for cluster, c_runs in sorted(clusters.items(), key=lambda x: -len(x[1])):
        lines.append(f"| {cluster} | {len(c_runs)} |")

    lines += ["", "## Detailed Failures (last 10)", ""]
    recent_failures = [
        r for r in runs if r.get("exit_status") not in ("success", "unknown", None)
    ][:10]
    for r in recent_failures:
        dur = r.get("duration_seconds")
        dur_str = f"{dur:.0f}s" if dur else "?"
        lines.append(
            f"- **{r.get('agent_name', '?')}** ({r.get('model', '?')}, {dur_str}) — "
            f"{r.get('task', '')[:80]}"
        )

    dest.write_text("\n".join(lines) + "\n")
    return str(dest)
