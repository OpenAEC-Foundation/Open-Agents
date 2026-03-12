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

CANDIDATES_PATH = Path.home() / ".oa" / "lesson-candidates.md"

LESSON_PATTERNS = [
    r"(?i)(error|fout|bug|probleem|issue).*?:\s*(.{20,200})",
    r"(?i)(oplossing|workaround|fix|opgelost).*?:\s*(.{20,200})",
    r"(?i)(let op|belangrijk|waarschuwing|note).*?:\s*(.{20,200})",
    r"(?i)(lesson learned|les|lering).*?:\s*(.{20,200})",
]


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


def extract_lessons_from_run(workspace: "str | Path", task: str, run_id: "str | None" = None) -> int:
    """Scan output/result.md van agent op les-kandidaten.

    Schrijft naar ~/.oa/lesson-candidates.md (NOOIT naar LESSONS.md).
    Stuurt oa send meta notificatie als kandidaten gevonden.
    Return: aantal gevonden kandidaten.
    """
    import re as _re

    workspace = Path(workspace)
    result_file = workspace / "output" / "result.md"
    if not result_file.exists():
        return 0

    content = result_file.read_text(encoding="utf-8", errors="ignore")

    candidates = []
    seen: set[str] = set()
    for pattern in LESSON_PATTERNS:
        for match in _re.finditer(pattern, content):
            text = match.group(0).strip()
            key = text[:80].lower()
            if key not in seen:
                seen.add(key)
                candidates.append(text[:200])

    if not candidates:
        return 0

    CANDIDATES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CANDIDATES_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n## Kandidaten uit run: {run_id or 'unknown'} ({task[:60]})\n")
        for c in candidates:
            f.write(f"- {c}\n")

    try:
        from .messaging import send_message
        send_message(
            to="meta",
            message=f"\U0001f4a1 {len(candidates)} les-kandidaat(en) gevonden. Check ~/.oa/lesson-candidates.md",
            from_agent="lessons-extractor",
        )
    except Exception:
        pass

    return len(candidates)


ERROR_INDICATORS = [
    "Error",
    "FAILED",
    "Exception",
    "Traceback",
    "❌",
    "error:",
    "ERROR",
    "fatal:",
    "FATAL",
]


def detect_error_in_output(output: str) -> tuple[bool, str]:
    """Scan agent output for error indicators.

    Returns (is_error, extracted_summary) where extracted_summary is the
    first 3-5 lines surrounding the first error hit (max 300 chars).
    """
    lines = output.splitlines()
    for i, line in enumerate(lines):
        for indicator in ERROR_INDICATORS:
            if indicator in line:
                # Collect up to 5 lines starting from the matching line
                snippet_lines = lines[i : i + 5]
                snippet = "\n".join(snippet_lines).strip()[:300]
                return True, snippet
    return False, ""


def write_error_lesson_to_workspace(
    agent_name: str,
    model: str,
    task: str,
    error_summary: str,
    workspace_dir: "str | Path | None" = None,
) -> Path:
    """Write a formatted error lesson to LESSONS.md in *workspace_dir*.

    Falls back to /tmp/LESSONS.md if workspace_dir is None or unwritable.
    Returns the path where the lesson was written.
    """
    from datetime import datetime as _dt

    timestamp = _dt.now().strftime("%Y%m%d%H%M%S")
    date_str = _dt.now().strftime("%Y-%m-%d")
    first_error_line = error_summary.splitlines()[0][:100] if error_summary else "unknown"
    task_preview = (task or "")[:100]

    lesson_block = (
        f"\n## L-AUTO-{timestamp} — Agent fout: {agent_name}\n"
        f"**Datum**: {date_str}\n"
        f"**Agent**: {agent_name}\n"
        f"**Model**: {model}\n"
        f"**Fout**: {first_error_line}\n"
        f"**Taak**: {task_preview}\n"
        f"**Les**: Controleer agent output na collect — automatisch gelogd door A1 leerloop.\n"
    )

    target: Path | None = None
    if workspace_dir:
        candidate = Path(workspace_dir) / "LESSONS.md"
        try:
            candidate.parent.mkdir(parents=True, exist_ok=True)
            # Touch / create if it doesn't exist yet
            if not candidate.exists():
                candidate.write_text(
                    "# Lessons Learned\n\n"
                    "> Automatisch aangemaakt door A1 leerloop.\n\n---\n"
                )
            target = candidate
        except OSError:
            target = None

    if target is None:
        target = Path("/tmp/LESSONS.md")
        if not target.exists():
            target.write_text(
                "# Lessons Learned (fallback — workspace onbereikbaar)\n\n---\n"
            )

    with open(target, "a", encoding="utf-8") as f:
        f.write(lesson_block)

    return target


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
