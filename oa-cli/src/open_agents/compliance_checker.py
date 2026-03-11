"""Compliance Checker — verify agent output against prompt requirements (Issue #42)."""

from __future__ import annotations

import re
from pathlib import Path


_BULLET_RE = re.compile(r"^\s*[-*•]\s+(.+)", re.MULTILINE)
_NUMBERED_RE = re.compile(r"^\s*\d+[.)]\s+(.+)", re.MULTILINE)


def _extract_requirements(prompt: str) -> list[str]:
    """Parse bullet points and numbered lists from a prompt string."""
    bullets = _BULLET_RE.findall(prompt)
    numbered = _NUMBERED_RE.findall(prompt)
    reqs = bullets + numbered
    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for r in reqs:
        key = r.strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(r.strip())
    return unique


def _requirement_covered(req: str, output: str) -> bool:
    """Heuristic: check if key words from requirement appear in output."""
    # Strip leading verbs and articles for a more lenient keyword match
    words = re.findall(r"\b\w{4,}\b", req.lower())
    if not words:
        return True
    output_lower = output.lower()
    matches = sum(1 for w in words if w in output_lower)
    return matches / len(words) >= 0.5


def check_compliance(workspace_path: str, original_prompt: str) -> dict:
    """Check whether output/result.md covers all requirements in original_prompt.

    Returns:
        {
            compliant: bool,
            score: float (0.0 – 1.0),
            missing: list[str],   # requirements not addressed
            checked: int,         # total requirements found
        }
    """
    result_path = Path(workspace_path) / "output" / "result.md"
    if not result_path.exists():
        # Also try result.md directly in workspace
        result_path = Path(workspace_path) / "result.md"

    output_text = ""
    if result_path.exists():
        output_text = result_path.read_text(encoding="utf-8", errors="replace")

    requirements = _extract_requirements(original_prompt)
    if not requirements:
        return {
            "compliant": True,
            "score": 1.0,
            "missing": [],
            "checked": 0,
        }

    missing: list[str] = []
    for req in requirements:
        if not _requirement_covered(req, output_text):
            missing.append(req)

    covered = len(requirements) - len(missing)
    score = covered / len(requirements)

    return {
        "compliant": len(missing) == 0,
        "score": round(score, 3),
        "missing": missing,
        "checked": len(requirements),
    }
