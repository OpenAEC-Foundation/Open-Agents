"""Knowledge Boundary Mapper (Issue #38) — tag runs by domain, report success rates.

Maps task text to domains via keyword matching, calculates per-domain success rates,
and suggests skill improvements for weak domains.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"
REPORTS_DIR = Path.home() / ".oa" / "reports"

DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "code": ["python", "javascript", "typescript", "rust", "golang", "coding", "refactor", "debug", "compile"],
    "devops": ["docker", "kubernetes", "k8s", "deploy", "ci/cd", "pipeline", "terraform", "ansible", "nginx"],
    "data": ["database", "sql", "postgres", "mysql", "mongo", "redis", "migration", "schema", "query"],
    "frontend": ["react", "vue", "html", "css", "tailwind", "component", "ui", "ux", "browser"],
    "backend": ["api", "rest", "graphql", "server", "endpoint", "middleware", "auth", "jwt"],
    "testing": ["test", "pytest", "jest", "unittest", "coverage", "e2e", "integration", "assertion"],
    "docs": ["documentation", "readme", "markdown", "docstring", "changelog", "manual"],
    "research": ["research", "analyze", "investigate", "compare", "evaluate", "review"],
    "infra": ["ssh", "server", "linux", "ubuntu", "wsl", "network", "dns", "ssl", "cert"],
    "ai": ["model", "prompt", "llm", "claude", "openai", "embedding", "fine-tune", "training"],
}


def _load_index() -> list[dict]:
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def domain_tagger(run: dict) -> list[str]:
    """Tag a single run with domains based on task text keyword matching.

    Returns list of matched domain names.
    """
    task = (run.get("task", "") + " " + run.get("agent_name", "")).lower()
    matched: list[str] = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(kw in task for kw in keywords):
            matched.append(domain)
    return matched if matched else ["uncategorized"]


def success_by_domain() -> dict[str, dict]:
    """Calculate success rate per domain across all runs.

    Returns {domain: {total, success, failed, rate}}.
    """
    runs = _load_index()
    stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "success": 0, "failed": 0})

    for run in runs:
        domains = domain_tagger(run)
        status = run.get("exit_status", "unknown")
        for domain in domains:
            stats[domain]["total"] += 1
            if status == "success":
                stats[domain]["success"] += 1
            elif status not in ("unknown", None):
                stats[domain]["failed"] += 1

    result: dict[str, dict] = {}
    for domain, s in stats.items():
        rate = (s["success"] / s["total"] * 100) if s["total"] else 0.0
        result[domain] = {**s, "rate": round(rate, 1)}
    return result


def generate_knowledge_map(output_path: Optional[str] = None) -> str:
    """Write knowledge-boundary-map.md to ~/.oa/reports/.

    Returns path to the generated file.
    """
    dest = Path(output_path) if output_path else REPORTS_DIR / "knowledge-boundary-map.md"
    dest.parent.mkdir(parents=True, exist_ok=True)

    domains = success_by_domain()
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        "# Knowledge Boundary Map",
        f"\n_Generated: {now}_\n",
        "## Success Rate by Domain",
        "| Domain | Total | Success | Failed | Rate |",
        "|--------|-------|---------|--------|------|",
    ]

    if not domains:
        lines.append("| _(no runs yet)_ | — | — | — | — |")
    else:
        for domain, s in sorted(domains.items(), key=lambda x: x[1]["rate"]):
            emoji = "🟢" if s["rate"] >= 80 else "🟡" if s["rate"] >= 50 else "🔴"
            lines.append(
                f"| {emoji} {domain} | {s['total']} | {s['success']} | {s['failed']} | {s['rate']}% |"
            )

    weak = {d: s for d, s in domains.items() if s["rate"] < 60 and s["total"] >= 3}
    if weak:
        lines += ["", "## Suggested Skill Improvements", ""]
        for domain, s in sorted(weak.items(), key=lambda x: x[1]["rate"]):
            lines.append(
                f"- **{domain}** ({s['rate']}% success) — "
                f"consider creating or improving skills for this domain"
            )

    dest.write_text("\n".join(lines) + "\n")
    return str(dest)
