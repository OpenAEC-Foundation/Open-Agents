"""Core files registry — oa-cli's awareness of workspace core documents.

Philosophy: code enforces the system (deterministic), AI fills it in (intelligent).
This module is the deterministic layer: it always knows which files exist,
how stale they are, and what needs updating.
"""

import glob as _glob
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

_REPO_ROOT = Path(os.environ.get("OA_REPO_ROOT", str(Path(__file__).parents[3])))

CORE_FILES = {
    "LESSONS":      {"path": "LESSONS.md",           "role": "Geleerde lessen",            "stale_days": 7,    "triggers": ["session_end", "batch_complete"], "is_glob": False},
    "ROADMAP":      {"path": "docs/ROADMAP.md",       "role": "Status en voortgang",         "stale_days": 3,    "triggers": ["task_complete"],                 "is_glob": False},
    "DECISIONS":    {"path": "DECISIONS.md",          "role": "Architectuurbeslissingen",    "stale_days": None, "triggers": ["architecture_change"],           "is_glob": False},
    "HANDOFF":      {"path": "docs/HANDOFF-*.md",     "role": "Sessie-overdracht",           "stale_days": 1,    "triggers": ["session_end"],                   "is_glob": True},
    "CHANGELOG":    {"path": "CHANGELOG.md",          "role": "Wijzigingslog",               "stale_days": None, "triggers": ["release"],                       "is_glob": False},
    "REQUIREMENTS": {"path": "REQUIREMENTS.md",       "role": "Functionele requirements",    "stale_days": None, "triggers": ["scope_change"],                  "is_glob": False},
    "PRINCIPLES":   {"path": "PRINCIPLES.md",         "role": "Design principles",           "stale_days": None, "triggers": ["architecture_change"],           "is_glob": False},
}


def _resolve_root(repo_root: Optional[Path]) -> Path:
    return repo_root if repo_root is not None else _REPO_ROOT


def _resolve_paths(name: str, meta: dict, repo_root: Path) -> list[Path]:
    """Resolve glob or direct path to a list of existing Path objects."""
    pattern = str(repo_root / meta["path"])
    if meta.get("is_glob"):
        matches = sorted(_glob.glob(pattern))
        return [Path(p) for p in matches]
    p = Path(pattern)
    return [p]


def get_status(repo_root: Path = None) -> list[dict]:
    """Return status dict per core file: exists, last_modified, days_since_update, is_stale."""
    root = _resolve_root(repo_root)
    now = datetime.now(tz=timezone.utc)
    results = []
    for name, meta in CORE_FILES.items():
        try:
            paths = _resolve_paths(name, meta, root)
            if meta.get("is_glob"):
                # Use most recent match
                existing = [p for p in paths if p.exists()]
                if existing:
                    best = max(existing, key=lambda p: p.stat().st_mtime)
                    mtime = datetime.fromtimestamp(best.stat().st_mtime, tz=timezone.utc)
                    days_since = (now - mtime).days
                    stale_days = meta["stale_days"]
                    is_stale = (stale_days is not None) and (days_since >= stale_days)
                    results.append({
                        "name": name,
                        "role": meta["role"],
                        "exists": True,
                        "path": best,
                        "last_modified": mtime,
                        "days_since_update": days_since,
                        "is_stale": is_stale,
                        "stale_days": stale_days,
                    })
                else:
                    results.append({
                        "name": name,
                        "role": meta["role"],
                        "exists": False,
                        "path": None,
                        "last_modified": None,
                        "days_since_update": None,
                        "is_stale": False,
                        "stale_days": meta["stale_days"],
                    })
            else:
                p = paths[0]
                if p.exists():
                    mtime = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)
                    days_since = (now - mtime).days
                    stale_days = meta["stale_days"]
                    is_stale = (stale_days is not None) and (days_since >= stale_days)
                    results.append({
                        "name": name,
                        "role": meta["role"],
                        "exists": True,
                        "path": p,
                        "last_modified": mtime,
                        "days_since_update": days_since,
                        "is_stale": is_stale,
                        "stale_days": stale_days,
                    })
                else:
                    results.append({
                        "name": name,
                        "role": meta["role"],
                        "exists": False,
                        "path": p,
                        "last_modified": None,
                        "days_since_update": None,
                        "is_stale": False,
                        "stale_days": meta["stale_days"],
                    })
        except Exception:
            results.append({
                "name": name,
                "role": meta["role"],
                "exists": False,
                "path": None,
                "last_modified": None,
                "days_since_update": None,
                "is_stale": False,
                "stale_days": meta.get("stale_days"),
            })
    return results


def get_latest_handoff(repo_root: Path = None) -> Optional[Path]:
    """Return path to most recent HANDOFF-*.md file, or None."""
    root = _resolve_root(repo_root)
    pattern = str(root / "docs" / "HANDOFF-*.md")
    try:
        matches = sorted(_glob.glob(pattern))
        if not matches:
            return None
        # Pick most recently modified
        return max((Path(p) for p in matches), key=lambda p: p.stat().st_mtime)
    except Exception:
        return None


def read_handoff_summary(repo_root: Path = None, max_lines: int = 15) -> str:
    """Return first N lines of most recent HANDOFF, or fallback message."""
    path = get_latest_handoff(repo_root)
    if path is None:
        return "Geen HANDOFF document gevonden."
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
        preview = "\n".join(lines[:max_lines])
        if len(lines) > max_lines:
            preview += f"\n[dim]... ({len(lines) - max_lines} more lines — {path.name})[/dim]"
        return preview
    except Exception:
        return f"Kon HANDOFF niet lezen: {path}"


def get_stale_files(repo_root: Path = None) -> list[dict]:
    """Return only files that are stale (exist but not updated recently enough)."""
    return [f for f in get_status(repo_root) if f["exists"] and f["is_stale"]]


def files_needing_update(trigger: str, repo_root: Path = None) -> list[dict]:
    """Return core files that should be updated for the given trigger event."""
    all_files = get_status(repo_root)
    result = []
    for f in all_files:
        meta = CORE_FILES.get(f["name"], {})
        if trigger in meta.get("triggers", []):
            result.append(f)
    return result
