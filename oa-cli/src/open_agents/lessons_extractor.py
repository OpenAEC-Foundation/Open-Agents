"""Lessons extractor — read/write LESSONS.md and auto-extract from run logs.

L-NNN format, sequential numbering after existing lessons.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

LESSONS_PATH = Path("/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md")
RUNS_DIR = Path.home() / ".oa" / "runs"


def _next_lesson_number() -> int:
    """Return the next L-NNN number by scanning LESSONS.md."""
    if not LESSONS_PATH.exists():
        return 1
    text = LESSONS_PATH.read_text(encoding="utf-8")
    numbers = [int(m.group(1)) for m in re.finditer(r"L-(\d{3})", text)]
    return (max(numbers) + 1) if numbers else 1


def extract_lesson(agent_name: str, outcome: str, lesson: str) -> str:
    """Append a lesson to LESSONS.md and return its L-NNN identifier.

    Args:
        agent_name: Name of the agent or context that generated the lesson.
        outcome: Brief outcome description (success/error/observation).
        lesson: The lesson text to record.

    Returns:
        The assigned lesson identifier, e.g. 'L-064'.
    """
    num = _next_lesson_number()
    lesson_id = f"L-{num:03d}"
    date_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    section = (
        f"\n## Sessie {date_str} — Automatisch gegenereerde les\n\n"
        f"| # | Les | Context |\n"
        f"|---|-----|----------|\n"
        f"| {lesson_id} | **{lesson}** | Agent: `{agent_name}`, Uitkomst: {outcome} |\n"
    )

    if not LESSONS_PATH.exists():
        LESSONS_PATH.write_text(f"# Lessons Learned — Open-Agents\n{section}", encoding="utf-8")
    else:
        existing = LESSONS_PATH.read_text(encoding="utf-8")
        # Avoid duplicate section headers for the same date
        if f"Sessie {date_str}" not in existing:
            LESSONS_PATH.write_text(existing + section, encoding="utf-8")
        else:
            # Append row to existing date section
            row = f"| {lesson_id} | **{lesson}** | Agent: `{agent_name}`, Uitkomst: {outcome} |\n"
            # Insert before first line that starts a new section after the date header
            pattern = rf"(## Sessie {date_str}[^\n]*\n\n\|[^\n]*\n\|[^\n]*\n)((?:\|[^\n]*\n)*)"
            replacement = rf"\g<1>\g<2>{row}"
            updated = re.sub(pattern, replacement, existing)
            if updated == existing:
                updated = existing + f"\n{row}"
            LESSONS_PATH.write_text(updated, encoding="utf-8")

    return lesson_id


def auto_extract_from_run(run_id: str) -> Optional[str]:
    """Read a run log, detect error runs, and write an auto-lesson.

    Args:
        run_id: UUID of the run (matches directory name under ~/.oa/runs/).

    Returns:
        The assigned L-NNN id if a lesson was written, else None.
    """
    import json

    run_log_path = RUNS_DIR / run_id / "run-log.json"
    if not run_log_path.exists():
        return None

    run_log = json.loads(run_log_path.read_text())
    exit_status = run_log.get("exit_status", "unknown")

    if exit_status not in ("error", "unknown"):
        return None  # Only auto-extract lessons from failed runs

    agent_name = run_log.get("agent_name", run_id)
    task_preview = (run_log.get("task") or "")[:80]
    duration = run_log.get("duration_seconds")
    duration_str = f"{duration:.0f}s" if duration else "onbekend"

    lesson_text = (
        f"Agent `{agent_name}` faalde met status '{exit_status}' "
        f"na {duration_str} — taak: {task_preview!r}"
    )
    outcome = f"exit_status={exit_status}"
    return extract_lesson(agent_name, outcome, lesson_text)
