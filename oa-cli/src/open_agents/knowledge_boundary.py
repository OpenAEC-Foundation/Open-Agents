"""Knowledge Boundary Mapper (#38) — tag runs by domain, report success rates."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Optional

RUNS_DIR = Path.home() / ".oa" / "runs"
RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"
TAGS_FILE = Path.home() / ".oa" / "domain-tags.json"


def _load_tags() -> dict[str, str]:
    if not TAGS_FILE.exists():
        return {}
    try:
        return json.loads(TAGS_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save_tags(tags: dict[str, str]) -> None:
    TAGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TAGS_FILE.write_text(json.dumps(tags, indent=2))


def _load_index() -> list[dict]:
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def tag_run(run_id: str, domain: str) -> None:
    """Attach a domain tag to a run. Also updates the run-log if present."""
    tags = _load_tags()
    tags[run_id] = domain
    _save_tags(tags)

    run_log_path = RUNS_DIR / run_id / "run-log.json"
    if run_log_path.exists():
        try:
            log = json.loads(run_log_path.read_text())
            existing = log.get("tags", [])
            if domain not in existing:
                existing.append(domain)
            log["tags"] = existing
            run_log_path.write_text(json.dumps(log, indent=2))
        except (json.JSONDecodeError, OSError):
            pass


def get_boundary_map() -> dict[str, dict]:
    """Return success rate per domain: {domain: {total, success, rate}}."""
    tags = _load_tags()
    runs = {r["run_id"]: r for r in _load_index()}

    stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "success": 0})
    for run_id, domain in tags.items():
        run = runs.get(run_id)
        if not run:
            continue
        stats[domain]["total"] += 1
        if run.get("exit_status") == "success":
            stats[domain]["success"] += 1

    result = {}
    for domain, s in stats.items():
        rate = (s["success"] / s["total"] * 100) if s["total"] else 0.0
        result[domain] = {**s, "rate": round(rate, 1)}
    return result


def generate_boundary_report(output_path: str) -> str:
    """Write markdown knowledge boundary report."""
    boundary = get_boundary_map()
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "# Knowledge Boundary Map",
        "",
        "| Domain | Total Runs | Successes | Success Rate |",
        "|--------|-----------|-----------|-------------|",
    ]
    for domain, s in sorted(boundary.items(), key=lambda x: -x[1]["rate"]):
        lines.append(
            f"| {domain} | {s['total']} | {s['success']} | {s['rate']}% |"
        )

    if not boundary:
        lines.append("| _(no tagged runs)_ | — | — | — |")

    dest.write_text("\n".join(lines) + "\n")
    return str(dest)
