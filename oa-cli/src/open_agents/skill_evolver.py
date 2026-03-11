"""Skill Evolver — track skill usage metrics and suggest improvements (Issue #32)."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import yaml

SKILL_METRICS_FILE = Path.home() / ".oa" / "skill-metrics.yaml"


def _load_metrics() -> dict[str, Any]:
    if SKILL_METRICS_FILE.exists():
        try:
            return yaml.safe_load(SKILL_METRICS_FILE.read_text()) or {}
        except (yaml.YAMLError, OSError):
            return {}
    return {}


def _save_metrics(data: dict[str, Any]) -> None:
    SKILL_METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SKILL_METRICS_FILE.write_text(yaml.dump(data, default_flow_style=False))


def track_skill_usage(skill_name: str, run_id: str, score: float) -> None:
    """Record a skill usage event with its quality score (0.0–1.0).

    Appends to ~/.oa/skill-metrics.yaml under skill_name.runs[].
    """
    data = _load_metrics()
    skill = data.setdefault(skill_name, {"runs": []})
    skill["runs"].append({
        "run_id": run_id,
        "score": round(float(score), 3),
        "timestamp": time.time(),
    })
    _save_metrics(data)


def get_skill_stats(skill_name: str) -> dict:
    """Return avg score, usage count, and trend for a skill.

    trend: 'improving', 'declining', or 'stable'
    """
    data = _load_metrics()
    runs = data.get(skill_name, {}).get("runs", [])
    if not runs:
        return {"skill": skill_name, "avg_score": None, "usage_count": 0, "trend": "stable"}

    scores = [r["score"] for r in runs]
    avg = sum(scores) / len(scores)

    trend = "stable"
    if len(scores) >= 4:
        first_half = sum(scores[: len(scores) // 2]) / (len(scores) // 2)
        second_half = sum(scores[len(scores) // 2 :]) / (len(scores) - len(scores) // 2)
        if second_half - first_half > 0.05:
            trend = "improving"
        elif first_half - second_half > 0.05:
            trend = "declining"

    return {
        "skill": skill_name,
        "avg_score": round(avg, 3),
        "usage_count": len(scores),
        "trend": trend,
    }


def suggest_improvements(skill_name: str) -> list[str]:
    """Return actionable improvement suggestions based on low-scoring runs."""
    data = _load_metrics()
    runs = data.get(skill_name, {}).get("runs", [])
    if not runs:
        return ["No usage data available — run the skill at least once to get suggestions."]

    scores = [r["score"] for r in runs]
    avg = sum(scores) / len(scores)
    bad_runs = [r for r in runs if r["score"] < 0.5]
    suggestions: list[str] = []

    if avg < 0.5:
        suggestions.append(
            f"Overall avg score {avg:.2f} is low — consider rewriting the skill prompt entirely."
        )
    if len(bad_runs) / len(runs) > 0.3:
        suggestions.append(
            f"{len(bad_runs)}/{len(runs)} runs scored < 0.5 — add more examples or constraints."
        )
    if len(runs) >= 4:
        recent = scores[-4:]
        if all(s < 0.6 for s in recent):
            suggestions.append("Last 4 runs all scored < 0.6 — skill may need a trigger rework.")
    if not suggestions:
        suggestions.append(f"Skill looks healthy (avg {avg:.2f}). Keep monitoring for drift.")

    return suggestions
