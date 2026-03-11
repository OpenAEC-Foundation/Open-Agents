"""Cross-Agent Pattern Miner (#40) — extract common elements from successful runs."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

RUNS_INDEX = Path.home() / ".oa" / "runs-index.json"

_STOP_WORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for",
    "with", "is", "it", "this", "that", "from", "at", "by", "as",
}


def _load_index() -> list[dict]:
    if not RUNS_INDEX.exists():
        return []
    try:
        return json.loads(RUNS_INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def _tokenize(text: str) -> list[str]:
    words = text.lower().replace("-", " ").split()
    return [w.strip(".,;:()[]") for w in words if w not in _STOP_WORDS and len(w) > 2]


def mine_success_patterns(min_runs: int = 5) -> list[dict]:
    """Extract common task keywords from successful runs.

    Returns list of {keyword, count, models, agents} sorted by frequency.
    """
    runs = _load_index()
    successes = [r for r in runs if r.get("exit_status") == "success"]
    if len(successes) < min_runs:
        return []

    keyword_meta: dict[str, dict] = {}
    for run in successes:
        tokens = _tokenize(run.get("task", ""))
        for token in set(tokens):
            if token not in keyword_meta:
                keyword_meta[token] = {"count": 0, "models": Counter(), "agents": Counter()}
            keyword_meta[token]["count"] += 1
            keyword_meta[token]["models"][run.get("model", "unknown")] += 1
            keyword_meta[token]["agents"][run.get("agent_name", "unknown")] += 1

    patterns = [
        {
            "keyword": kw,
            "count": meta["count"],
            "top_model": meta["models"].most_common(1)[0][0] if meta["models"] else "?",
            "top_agent": meta["agents"].most_common(1)[0][0] if meta["agents"] else "?",
        }
        for kw, meta in keyword_meta.items()
        if meta["count"] >= min_runs
    ]
    return sorted(patterns, key=lambda x: -x["count"])


def generate_template_suggestions(output_path: str) -> str:
    """Write markdown with template candidates based on success patterns."""
    patterns = mine_success_patterns()
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    lines = ["# Cross-Agent Pattern Miner — Template Suggestions", ""]

    if not patterns:
        lines.append("_Not enough successful runs (< 5) to mine patterns._")
        dest.write_text("\n".join(lines) + "\n")
        return str(dest)

    lines += [
        "| Keyword | Occurrences | Top Model | Top Agent |",
        "|---------|------------|-----------|-----------|",
    ]
    for p in patterns[:20]:
        lines.append(
            f"| {p['keyword']} | {p['count']} | {p['top_model']} | {p['top_agent']} |"
        )

    lines += [
        "",
        "## Template Candidates",
        "",
        "The following recurring keywords suggest high-value agent templates:",
        "",
    ]
    for p in patterns[:5]:
        lines.append(
            f"- **`{p['keyword']}`** — seen in {p['count']} successful runs "
            f"(model: `{p['top_model']}`, agent: `{p['top_agent']}`)"
        )

    dest.write_text("\n".join(lines) + "\n")
    return str(dest)
