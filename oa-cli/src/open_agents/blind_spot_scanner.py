"""Blind Spot Scanner (#39) — cluster failed runs by common features."""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"

_KEYWORDS = [
    "timeout", "permission", "not found", "import", "syntax",
    "memory", "connection", "auth", "rate limit", "cancelled",
]


def _load_index() -> list[dict]:
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def _classify(run: dict) -> list[str]:
    """Return matched keyword labels for a run based on task + exit_status."""
    text = " ".join([
        run.get("task", ""),
        run.get("exit_status", ""),
    ]).lower()
    return [kw for kw in _KEYWORDS if kw in text]


def scan_failures(min_runs: int = 20) -> dict[str, list[dict]]:
    """Cluster failed runs by keyword. Only when total runs >= min_runs.

    Returns {keyword: [run, ...]} for each keyword that appears in failures.
    """
    runs = _load_index()
    if len(runs) < min_runs:
        return {}

    failures = [r for r in runs if r.get("exit_status") not in ("success", None)]
    clusters: dict[str, list[dict]] = defaultdict(list)

    for run in failures:
        labels = _classify(run)
        if labels:
            for label in labels:
                clusters[label].append(run)
        else:
            clusters["_other"].append(run)

    return dict(clusters)


def generate_blind_spot_report(output_path: str) -> str:
    """Write markdown report with failure clusters."""
    clusters = scan_failures()
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    lines = ["# Blind Spot Scanner Report", ""]

    if not clusters:
        lines.append("_Not enough data (< 20 runs) or no failures detected._")
        dest.write_text("\n".join(lines) + "\n")
        return str(dest)

    lines += [
        "| Pattern | Failure Count |",
        "|---------|--------------|",
    ]
    for keyword, runs in sorted(clusters.items(), key=lambda x: -len(x[1])):
        lines.append(f"| {keyword} | {len(runs)} |")

    lines.append("")
    for keyword, runs in sorted(clusters.items(), key=lambda x: -len(x[1])):
        lines.append(f"## Pattern: `{keyword}`")
        for r in runs[:3]:
            lines.append(f"- `{r.get('agent_name', '?')}` — {r.get('task', '')[:80]}")
        lines.append("")

    dest.write_text("\n".join(lines) + "\n")
    return str(dest)
