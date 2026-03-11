"""Ecosystem Health Dashboard (#37) — aggregate run stats into a markdown report."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"
DASHBOARD_PATH = Path.home() / ".oa" / "health-dashboard.md"
_STAMP_PATH = Path.home() / ".oa" / ".dashboard-generated-at"


def _load_index() -> list[dict]:
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def should_regenerate(interval_hours: float = 24) -> bool:
    """Return True if dashboard is older than interval_hours or missing."""
    if not _STAMP_PATH.exists():
        return True
    try:
        ts = datetime.fromisoformat(_STAMP_PATH.read_text().strip())
        age = (datetime.now(tz=timezone.utc) - ts).total_seconds() / 3600
        return age >= interval_hours
    except (ValueError, OSError):
        return True


def generate_dashboard(output_path: Optional[str] = None) -> str:
    """Read runs-index, aggregate stats, write markdown. Returns output path."""
    dest = Path(output_path) if output_path else DASHBOARD_PATH
    dest.parent.mkdir(parents=True, exist_ok=True)

    runs = _load_index()
    total = len(runs)
    finished = [r for r in runs if r.get("exit_status") not in ("unknown", None)]
    successes = [r for r in finished if r.get("exit_status") == "success"]
    success_rate = (len(successes) / len(finished) * 100) if finished else 0.0

    durations = [r["duration_seconds"] for r in runs if r.get("duration_seconds")]
    avg_duration = sum(durations) / len(durations) if durations else 0.0

    model_counts = Counter(r.get("model", "unknown") for r in runs)
    top_models = model_counts.most_common(5)

    failures = [r for r in finished if r.get("exit_status") != "success"]
    error_counts = Counter(r.get("exit_status", "unknown") for r in failures)
    top_errors = error_counts.most_common(5)

    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Ecosystem Health Dashboard",
        f"\n_Generated: {now}_\n",
        "## Summary",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total runs | {total} |",
        f"| Success rate | {success_rate:.1f}% |",
        f"| Avg duration | {avg_duration:.1f}s |",
        "",
        "## Top Models",
        "| Model | Runs |",
        "|-------|------|",
    ]
    for model, count in top_models:
        lines.append(f"| {model} | {count} |")

    lines += ["", "## Top Error Types", "| Status | Count |", "|--------|-------|"]
    for status, count in top_errors:
        lines.append(f"| {status} | {count} |")

    dest.write_text("\n".join(lines) + "\n")
    _STAMP_PATH.write_text(datetime.now(tz=timezone.utc).isoformat())
    return str(dest)
