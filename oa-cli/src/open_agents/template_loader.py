"""Template loader — reads agent JSON templates from agents/library/."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# REPO_ROOT: oa-cli/src/open_agents/ → oa-cli/src/ → oa-cli/ → repo root
REPO_ROOT = Path(__file__).parents[3]
LIBRARY_DIR = REPO_ROOT / "agents" / "library"
PRESETS_DIR = REPO_ROOT / "agents" / "presets"

SCAN_DIRS = [d for d in [LIBRARY_DIR, PRESETS_DIR] if d.is_dir()]


def _template_id(path: Path) -> str:
    """Derive a stable id from the file path relative to LIBRARY_DIR."""
    return path.with_suffix("").relative_to(LIBRARY_DIR).as_posix()


def _load_json(path: Path) -> dict[str, Any] | list[dict[str, Any]] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, (dict, list)):
            return data
    except (json.JSONDecodeError, OSError):
        pass
    return None


def list_templates() -> list[dict[str, Any]]:
    """Return all templates from agents/library/ and agents/presets/."""
    results: list[dict[str, Any]] = []
    for scan_dir in SCAN_DIRS:
        for path in sorted(scan_dir.rglob("*.json")):
            data = _load_json(path)
            if data is None:
                continue
            computed_id = _template_id(path) if scan_dir == LIBRARY_DIR else f"presets/{path.stem}"
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        item.setdefault("id", item.get("name", computed_id))
                        results.append(item)
            else:
                data.setdefault("id", computed_id)
                results.append(data)
    return results


def load_template(template_id: str) -> dict[str, Any] | None:
    """Load a single template by id (path slug) or by name field."""
    for scan_dir in SCAN_DIRS:
        for path in scan_dir.rglob("*.json"):
            data = _load_json(path)
            if data is None:
                continue
            computed_id = _template_id(path) if scan_dir == LIBRARY_DIR else f"presets/{path.stem}"
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        item.setdefault("id", item.get("name", computed_id))
                        if item.get("id") == template_id or item.get("name") == template_id:
                            return item
            else:
                if computed_id == template_id or data.get("name") == template_id:
                    data.setdefault("id", computed_id)
                    return data
    return None
