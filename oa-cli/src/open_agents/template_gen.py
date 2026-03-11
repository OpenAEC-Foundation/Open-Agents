"""Auto Template Generation — evaluate successful runs and generate YAML template candidates (Issue #17).

When a run achieves success_score >= threshold, a YAML template candidate is written
to ~/.oa/template-candidates/<name>.yaml.  The user can review and promote candidates
via ``oa templates review`` and ``oa templates promote <name>``.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml

CANDIDATES_DIR = Path.home() / ".oa" / "template-candidates"
PROMOTED_DIR = Path.home() / ".oa" / "prompt-templates"
SUCCESS_THRESHOLD = 0.8


def _ensure_dirs() -> None:
    CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)
    PROMOTED_DIR.mkdir(parents=True, exist_ok=True)


def _slugify(name: str) -> str:
    """Turn an agent name into a filesystem-safe slug."""
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in name.lower()).strip("-")


def template_evaluator(run_log: dict, success_score: float = 1.0) -> Optional[Path]:
    """Evaluate a run and generate a YAML template candidate if score >= threshold.

    Args:
        run_log: Full run-log dict (from telemetry).
        success_score: Quality score for this run (0.0–1.0).  Defaults to 1.0
            for runs with exit_status == 'success'.

    Returns:
        Path to the generated YAML candidate, or None if score too low.
    """
    if success_score < SUCCESS_THRESHOLD:
        return None

    _ensure_dirs()

    agent_name = run_log.get("agent_name", "unknown")
    slug = _slugify(agent_name)
    candidate_path = CANDIDATES_DIR / f"{slug}.yaml"

    # If a candidate already exists for this pattern, update stats
    existing: dict[str, Any] = {}
    if candidate_path.exists():
        try:
            existing = yaml.safe_load(candidate_path.read_text()) or {}
        except (yaml.YAMLError, OSError):
            existing = {}

    sample_tasks: list[str] = existing.get("sample_tasks", [])
    task_preview = (run_log.get("task") or "")[:200]
    if task_preview and task_preview not in sample_tasks:
        sample_tasks.append(task_preview)
    sample_tasks = sample_tasks[-5:]  # Keep last 5 samples

    prev_count = existing.get("run_count", 0)
    prev_rate = existing.get("success_rate", 0.0)
    new_count = prev_count + 1
    new_rate = ((prev_rate * prev_count) + success_score) / new_count

    prev_dur = existing.get("avg_duration", 0.0)
    run_dur = run_log.get("duration_seconds") or 0.0
    new_dur = ((prev_dur * prev_count) + run_dur) / new_count

    candidate: dict[str, Any] = {
        "name": slug,
        "task_pattern": existing.get("task_pattern") or task_preview[:100],
        "model": run_log.get("model", "claude/sonnet"),
        "success_rate": round(new_rate, 3),
        "avg_duration": round(new_dur, 1),
        "run_count": new_count,
        "sample_tasks": sample_tasks,
        "last_updated": datetime.now(tz=timezone.utc).isoformat(),
        "status": "candidate",
    }

    candidate_path.write_text(yaml.dump(candidate, default_flow_style=False, allow_unicode=True))
    return candidate_path


def list_candidates() -> list[dict[str, Any]]:
    """Return all template candidates as dicts, sorted by success_rate desc."""
    _ensure_dirs()
    candidates: list[dict[str, Any]] = []
    for path in sorted(CANDIDATES_DIR.glob("*.yaml")):
        try:
            data = yaml.safe_load(path.read_text()) or {}
            data["_path"] = str(path)
            candidates.append(data)
        except (yaml.YAMLError, OSError):
            continue
    candidates.sort(key=lambda c: c.get("success_rate", 0), reverse=True)
    return candidates


def promote_candidate(name: str) -> Optional[Path]:
    """Move a candidate from template-candidates/ to prompt-templates/.

    Args:
        name: Slug name of the candidate (without .yaml extension).

    Returns:
        Path to the promoted template, or None if candidate not found.
    """
    _ensure_dirs()
    slug = _slugify(name)
    candidate_path = CANDIDATES_DIR / f"{slug}.yaml"
    if not candidate_path.exists():
        return None

    try:
        data = yaml.safe_load(candidate_path.read_text()) or {}
    except (yaml.YAMLError, OSError):
        return None

    data["status"] = "promoted"
    data["promoted_at"] = datetime.now(tz=timezone.utc).isoformat()

    promoted_path = PROMOTED_DIR / f"{slug}.yaml"
    promoted_path.write_text(yaml.dump(data, default_flow_style=False, allow_unicode=True))
    candidate_path.unlink()
    return promoted_path


def list_promoted() -> list[dict[str, Any]]:
    """Return all promoted templates as dicts."""
    _ensure_dirs()
    promoted: list[dict[str, Any]] = []
    for path in sorted(PROMOTED_DIR.glob("*.yaml")):
        try:
            data = yaml.safe_load(path.read_text()) or {}
            data["_path"] = str(path)
            promoted.append(data)
        except (yaml.YAMLError, OSError):
            continue
    return promoted
