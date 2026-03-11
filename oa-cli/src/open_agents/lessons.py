"""Automated Lessons Extraction — YAML-based lesson storage with deduplication (Issue #18).

Lessons are stored in ~/.oa/knowledge/lessons.yaml as a list of structured entries.
A post-run hook can be installed to auto-extract lessons after every agent run.
"""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Optional

import yaml

KNOWLEDGE_DIR = Path.home() / ".oa" / "knowledge"
LESSONS_FILE = KNOWLEDGE_DIR / "lessons.yaml"
SIMILARITY_THRESHOLD = 0.75  # Deduplicate if similarity > this


def _ensure_dirs() -> None:
    KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)


def _load_lessons() -> list[dict[str, Any]]:
    if LESSONS_FILE.exists():
        try:
            data = yaml.safe_load(LESSONS_FILE.read_text()) or []
            return data if isinstance(data, list) else []
        except (yaml.YAMLError, OSError):
            return []
    return []


def _save_lessons(lessons: list[dict[str, Any]]) -> None:
    _ensure_dirs()
    LESSONS_FILE.write_text(yaml.dump(lessons, default_flow_style=False, allow_unicode=True))


def _is_duplicate(new_lesson: str, existing_lessons: list[dict[str, Any]]) -> bool:
    """Check if new_lesson is too similar to any existing lesson text."""
    for entry in existing_lessons:
        existing_text = entry.get("lesson", "")
        ratio = SequenceMatcher(None, new_lesson.lower(), existing_text.lower()).ratio()
        if ratio >= SIMILARITY_THRESHOLD:
            return True
    return False


def _make_id() -> str:
    """Generate a short unique lesson ID."""
    return f"lesson-{uuid.uuid4().hex[:8]}"


def lessons_extractor(run_log: dict) -> Optional[dict[str, Any]]:
    """Analyse a run log and extract a lesson if patterns are detected.

    Detects: failures, duration anomalies (>5min), success patterns.

    Args:
        run_log: Full run-log dict from telemetry.

    Returns:
        The lesson dict if one was created, or None.
    """
    exit_status = run_log.get("exit_status", "unknown")
    agent_name = run_log.get("agent_name", "unknown")
    task_preview = (run_log.get("task") or "")[:120]
    duration = run_log.get("duration_seconds")

    lesson_text: Optional[str] = None
    category = "observation"
    confidence = 0.5

    if exit_status == "error":
        category = "failure"
        confidence = 0.8
        dur_str = f"{duration:.0f}s" if duration else "unknown"
        lesson_text = (
            f"Agent '{agent_name}' failed (status: {exit_status}) after {dur_str}. "
            f"Task: {task_preview}"
        )
    elif exit_status == "success" and duration and duration > 300:
        category = "duration_anomaly"
        confidence = 0.6
        lesson_text = (
            f"Agent '{agent_name}' succeeded but took {duration:.0f}s (>5min). "
            f"Consider splitting the task or using a faster model. Task: {task_preview}"
        )
    elif exit_status == "success":
        category = "success"
        confidence = 0.7
        model = run_log.get("model", "unknown")
        dur_str = f"{duration:.0f}s" if duration else "unknown"
        lesson_text = (
            f"Agent '{agent_name}' succeeded in {dur_str} with model {model}. "
            f"Task pattern: {task_preview}"
        )

    if lesson_text is None:
        return None

    return add_lesson(
        lesson=lesson_text,
        category=category,
        confidence=confidence,
        evidence=f"run_id={run_log.get('run_id', 'unknown')}, agent={agent_name}",
    )


def add_lesson(
    lesson: str,
    category: str = "observation",
    confidence: float = 0.5,
    evidence: str = "",
) -> Optional[dict[str, Any]]:
    """Add a lesson to the YAML knowledge base with deduplication.

    Returns the lesson dict if added, None if duplicate detected.
    """
    lessons = _load_lessons()

    if _is_duplicate(lesson, lessons):
        return None

    entry: dict[str, Any] = {
        "id": _make_id(),
        "date": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d"),
        "category": category,
        "lesson": lesson,
        "evidence": evidence,
        "confidence": round(float(confidence), 2),
    }
    lessons.append(entry)
    _save_lessons(lessons)
    return entry


def list_lessons(category: Optional[str] = None) -> list[dict[str, Any]]:
    """List all lessons, optionally filtered by category."""
    lessons = _load_lessons()
    if category:
        lessons = [l for l in lessons if l.get("category") == category]
    return lessons


def install_auto_lessons_hook() -> Path:
    """Install a post-run hook that triggers automated lesson extraction.

    Creates ~/.oa/hooks/post-run/04-auto-lessons.sh which calls
    ``python -m open_agents.lessons --run-id $OA_RUN_ID``.

    Returns the path to the created hook script.
    """
    import stat

    hook_dir = Path.home() / ".oa" / "hooks" / "post-run"
    hook_dir.mkdir(parents=True, exist_ok=True)
    hook_path = hook_dir / "04-auto-lessons.sh"

    hook_path.write_text(
        '#!/bin/bash\n'
        '# Auto-lessons hook — extract lessons from completed runs.\n'
        '[ -z "$OA_RUN_ID" ] && exit 0\n'
        'python -m open_agents.lessons --run-id "$OA_RUN_ID" 2>/dev/null &\n'
        'exit 0\n'
    )
    hook_path.chmod(hook_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return hook_path


if __name__ == "__main__":
    """CLI entry point for hook invocation: python -m open_agents.lessons --run-id <id>"""
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True, help="Run ID to extract lessons from")
    args = parser.parse_args()

    from .telemetry import get_run

    run_log = get_run(args.run_id)
    if run_log:
        result = lessons_extractor(run_log)
        if result:
            print(f"Lesson extracted: {result['id']}")
