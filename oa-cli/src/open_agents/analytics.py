"""Ecosystem Health Dashboard (Issue #37) — aggregate run-logs into health reports.

Generates ~/.oa/reports/health-<date>.md with 5+ metrics:
success_rate, avg_duration_s, model_distribution, error_rate, top_tasks.
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"
REPORTS_DIR = Path.home() / ".oa" / "reports"


def _load_index() -> list[dict]:
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def health_report(output_path: Optional[str] = None) -> str:
    """Aggregate run-logs into a health report markdown file.

    Returns the path to the generated report.
    """
    runs = _load_index()
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    dest = Path(output_path) if output_path else REPORTS_DIR / f"health-{today}.md"
    dest.parent.mkdir(parents=True, exist_ok=True)

    if not runs:
        dest.write_text("# Ecosystem Health Report\n\nNo data yet.\n")
        return str(dest)

    total = len(runs)
    finished = [r for r in runs if r.get("exit_status") not in ("unknown", None)]
    successes = [r for r in finished if r.get("exit_status") == "success"]
    success_rate = (len(successes) / len(finished) * 100) if finished else 0.0
    error_rate = 100.0 - success_rate if finished else 0.0

    durations = [r["duration_seconds"] for r in runs if r.get("duration_seconds")]
    avg_duration = sum(durations) / len(durations) if durations else 0.0
    max_duration = max(durations) if durations else 0.0
    min_duration = min(durations) if durations else 0.0

    model_counts: Counter[str] = Counter(r.get("model", "unknown") for r in runs)
    top_models = model_counts.most_common(10)

    failures = [r for r in finished if r.get("exit_status") != "success"]
    error_status_counts: Counter[str] = Counter(
        r.get("exit_status", "unknown") for r in failures
    )

    task_words: Counter[str] = Counter()
    for r in runs:
        task = r.get("task", "")
        for word in task.lower().split()[:5]:
            if len(word) > 3:
                task_words[word] += 1
    top_tasks = task_words.most_common(10)

    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Ecosystem Health Report",
        f"\n_Generated: {now}_\n",
        "## Key Metrics",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Total runs | {total} |",
        f"| Success rate | {success_rate:.1f}% |",
        f"| Error rate | {error_rate:.1f}% |",
        f"| Avg duration | {avg_duration:.1f}s |",
        f"| Min duration | {min_duration:.1f}s |",
        f"| Max duration | {max_duration:.1f}s |",
        "",
        "## Model Distribution",
        "| Model | Runs | Share |",
        "|-------|------|-------|",
    ]
    for model, count in top_models:
        share = count / total * 100
        lines.append(f"| {model} | {count} | {share:.1f}% |")

    if error_status_counts:
        lines += [
            "",
            "## Error Breakdown",
            "| Status | Count |",
            "|--------|-------|",
        ]
        for status, count in error_status_counts.most_common(10):
            lines.append(f"| {status} | {count} |")

    lines += [
        "",
        "## Top Task Keywords",
        "| Keyword | Occurrences |",
        "|---------|-------------|",
    ]
    for word, count in top_tasks:
        lines.append(f"| {word} | {count} |")

    dest.write_text("\n".join(lines) + "\n")
    return str(dest)
