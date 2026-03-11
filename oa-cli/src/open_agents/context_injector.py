"""Context injector — automatically enriches agent prompts with relevant project context.

Philosophy: agents run in isolation. This module bridges the gap deterministically
by injecting the right context fragments based on task keywords.
"""

import json
import os
from pathlib import Path
from typing import Optional

# Default repo root: same logic as core_files.py
_REPO_ROOT = Path(os.environ.get("OA_REPO_ROOT", str(Path(__file__).parents[3])))

# KEYWORD MAPPING: taak-keywords → welke context te injecteren
CONTEXT_RULES = [
    {
        "keywords": ["commit", "git", "push", "branch", "merge"],
        "inject": ["po_summary", "decisions_fragment"],
        "label": "Git/versioning context",
    },
    {
        "keywords": ["agent", "spawn", "oa run", "orchestrat"],
        "inject": ["claude_md_orchestration", "lessons_fragment"],
        "label": "Orchestration context",
    },
    {
        "keywords": ["skill", "SKILL.md", "skill package"],
        "inject": ["claude_md_skills", "principles_fragment"],
        "label": "Skills context",
    },
    {
        "keywords": ["roadmap", "sprint", "requirement", "feature"],
        "inject": ["roadmap_fragment", "requirements_fragment"],
        "label": "Planning context",
    },
    {
        "keywords": ["lesson", "LESSONS", "besliss", "decision", "DECISION"],
        "inject": ["lessons_fragment", "decisions_fragment"],
        "label": "Knowledge context",
    },
    {
        "keywords": ["core file", "handoff", "HANDOFF", "sessie"],
        "inject": ["core_files_summary", "handoff_fragment"],
        "label": "Session context",
    },
]

MAX_FRAGMENT_LINES = 60


def match_rules(task: str) -> list[str]:
    """Return list of context keys to inject based on task keywords (case-insensitive)."""
    task_lower = task.lower()
    keys: list[str] = []
    seen: set[str] = set()
    for rule in CONTEXT_RULES:
        if any(kw.lower() in task_lower for kw in rule["keywords"]):
            for key in rule["inject"]:
                if key not in seen:
                    keys.append(key)
                    seen.add(key)
    return keys


# --- Context source implementations ---

def _read_head(path: Path, n: int) -> Optional[str]:
    """Read first n lines of a file. Returns None if file doesn't exist."""
    try:
        if not path.exists():
            return None
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        return "\n".join(lines[:n])
    except Exception:
        return None


def _read_tail(path: Path, n: int) -> Optional[str]:
    """Read last n lines of a file. Returns None if file doesn't exist."""
    try:
        if not path.exists():
            return None
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        return "\n".join(lines[-n:])
    except Exception:
        return None


def _read_section(path: Path, section_marker: str, max_lines: int = MAX_FRAGMENT_LINES) -> Optional[str]:
    """Extract a section from a markdown file starting at a heading containing section_marker."""
    try:
        if not path.exists():
            return None
        text = path.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        start = None
        for i, line in enumerate(lines):
            if section_marker.lower() in line.lower() and line.startswith("#"):
                start = i
                break
        if start is None:
            return None
        # Find next same-or-higher-level heading
        level = len(lines[start]) - len(lines[start].lstrip("#"))
        end = len(lines)
        for i in range(start + 1, len(lines)):
            if lines[i].startswith("#"):
                cur_level = len(lines[i]) - len(lines[i].lstrip("#"))
                if cur_level <= level:
                    end = i
                    break
        fragment = lines[start:end]
        return "\n".join(fragment[:max_lines])
    except Exception:
        return None


def _po_summary(repo_root: Path) -> Optional[str]:
    """Last 3 PO decisions from ~/.oa/po-decisions.json."""
    try:
        po_file = Path.home() / ".oa" / "po-decisions.json"
        if not po_file.exists():
            return None
        data = json.loads(po_file.read_text(encoding="utf-8"))
        decisions = data if isinstance(data, list) else data.get("decisions", [])
        recent = decisions[-3:]
        if not recent:
            return None
        lines = ["PO Decisions (laatste 3):"]
        for d in recent:
            if isinstance(d, dict):
                lines.append(f"- {d.get('date', '')} {d.get('title', d.get('decision', str(d)))}")
            else:
                lines.append(f"- {d}")
        return "\n".join(lines)
    except Exception:
        return None


def _decisions_fragment(repo_root: Path) -> Optional[str]:
    return _read_head(repo_root / "DECISIONS.md", 30)


def _claude_md_orchestration(repo_root: Path) -> Optional[str]:
    claude_md = repo_root / "CLAUDE.md"
    result = _read_section(claude_md, "Kerngedrag", MAX_FRAGMENT_LINES)
    if result is None:
        result = _read_section(claude_md, "Agent Routing", MAX_FRAGMENT_LINES)
    if result is None:
        result = _read_section(claude_md, "Identity: Meta-Orchestrator", MAX_FRAGMENT_LINES)
    return result


def _claude_md_skills(repo_root: Path) -> Optional[str]:
    claude_md = repo_root / "CLAUDE.md"
    result = _read_section(claude_md, "Skill-Backed Agent", MAX_FRAGMENT_LINES)
    if result is None:
        result = _read_section(claude_md, "Skill Design Protocol", MAX_FRAGMENT_LINES)
    return result


def _lessons_fragment(repo_root: Path) -> Optional[str]:
    return _read_tail(repo_root / "LESSONS.md", 20)


def _principles_fragment(repo_root: Path) -> Optional[str]:
    return _read_head(repo_root / "PRINCIPLES.md", 30)


def _roadmap_fragment(repo_root: Path) -> Optional[str]:
    return _read_head(repo_root / "ROADMAP.md", 30)


def _requirements_fragment(repo_root: Path) -> Optional[str]:
    return _read_head(repo_root / "REQUIREMENTS.md", 20)


def _core_files_summary(repo_root: Path) -> Optional[str]:
    try:
        from .core_files import get_status
        statuses = get_status(repo_root)
        lines = ["Core files status:"]
        for s in statuses:
            exists = "✓" if s.get("exists") else "✗"
            stale = " [STALE]" if s.get("is_stale") else ""
            days = f" ({s['days_since_update']}d)" if s.get("days_since_update") is not None else ""
            lines.append(f"  {exists} {s['name']}: {s['role']}{days}{stale}")
        return "\n".join(lines)
    except Exception:
        return None


def _handoff_fragment(repo_root: Path) -> Optional[str]:
    try:
        from .core_files import read_handoff_summary
        return read_handoff_summary(repo_root)
    except Exception:
        return None


_CONTEXT_BUILDERS = {
    "po_summary": _po_summary,
    "decisions_fragment": _decisions_fragment,
    "claude_md_orchestration": _claude_md_orchestration,
    "claude_md_skills": _claude_md_skills,
    "lessons_fragment": _lessons_fragment,
    "principles_fragment": _principles_fragment,
    "roadmap_fragment": _roadmap_fragment,
    "requirements_fragment": _requirements_fragment,
    "core_files_summary": _core_files_summary,
    "handoff_fragment": _handoff_fragment,
}


def build_context_block(keys: list[str], repo_root: Path = None) -> str:
    """Build a formatted context block from the given context keys.

    Returns empty string if no relevant context found.
    Format:
    ---
    ## AUTO-INJECTED CONTEXT
    [label]
    [content fragment]
    ---
    """
    root = repo_root if repo_root is not None else _REPO_ROOT
    fragments: list[str] = []

    for key in keys:
        builder = _CONTEXT_BUILDERS.get(key)
        if builder is None:
            continue
        try:
            content = builder(root)
        except Exception:
            content = None
        if content:
            fragments.append(content.strip())

    if not fragments:
        return ""

    body = "\n\n".join(fragments)
    return f"---\n## AUTO-INJECTED CONTEXT\n\n{body}\n---"


def inject(task: str, repo_root: Path = None) -> str:
    """Main entry point: given a task string, return enriched task with context prepended.

    If no rules match → return task unchanged (no noise).
    """
    keys = match_rules(task)
    if not keys:
        return task
    block = build_context_block(keys, repo_root)
    if not block:
        return task
    return f"{block}\n\n{task}"
