"""Template loader — reads agent JSON templates from agents/library/."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# REPO_ROOT: oa-cli/src/open_agents/ → oa-cli/src/ → oa-cli/ → repo root
REPO_ROOT = Path(__file__).parents[3]
LIBRARY_DIR = REPO_ROOT / "agents" / "library"
PRESETS_DIR = REPO_ROOT / "agents" / "presets"

SCAN_DIRS = [d for d in [LIBRARY_DIR, PRESETS_DIR] if d.is_dir()]

# Directories inside LIBRARY_DIR that are excluded from active template scans.
# _archive/ contains historical templates that are not production-ready and
# should not appear in the UI or be invocable via `oa run --template`.
EXCLUDED_DIRS = {"_archive"}

# Required fields for a valid agent template.
REQUIRED_FIELDS = {"name", "systemPrompt"}


def _is_excluded(path: Path, scan_dir: Path) -> bool:
    """Return True if *path* lives inside an excluded subdirectory."""
    try:
        relative = path.relative_to(scan_dir)
    except ValueError:
        return False
    return relative.parts[0] in EXCLUDED_DIRS


def _validate_template(template: dict[str, Any], source: str) -> list[str]:
    """Return a list of validation errors for *template*.

    An empty list means the template is valid.
    """
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if field not in template:
            errors.append(f"missing required field '{field}'")
    # Detect legacy 'prompt' key that should be 'systemPrompt'
    if "prompt" in template and "systemPrompt" not in template:
        errors.append("field 'prompt' should be 'systemPrompt'")
    return errors


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
    """Return all active templates from agents/library/ and agents/presets/.

    Templates inside excluded directories (e.g. _archive/) are skipped.
    Templates that fail schema validation are logged and skipped.
    """
    results: list[dict[str, Any]] = []
    for scan_dir in SCAN_DIRS:
        for path in sorted(scan_dir.rglob("*.json")):
            if _is_excluded(path, scan_dir):
                continue
            data = _load_json(path)
            if data is None:
                continue
            computed_id = _template_id(path) if scan_dir == LIBRARY_DIR else f"presets/{path.stem}"
            if isinstance(data, list):
                for item in data:
                    if not isinstance(item, dict):
                        continue
                    item.setdefault("id", item.get("name", computed_id))
                    errors = _validate_template(item, str(path))
                    if errors:
                        logger.warning("Template schema error in %s (%s): %s", path, item.get("name", "?"), "; ".join(errors))
                        continue
                    results.append(item)
            else:
                data.setdefault("id", computed_id)
                errors = _validate_template(data, str(path))
                if errors:
                    logger.warning("Template schema error in %s: %s", path, "; ".join(errors))
                    continue
                results.append(data)
    return results


def load_template(template_id: str) -> dict[str, Any] | None:
    """Load a single template by id (path slug) or by name field.

    Excluded directories and schema-invalid templates are skipped.
    """
    for scan_dir in SCAN_DIRS:
        for path in scan_dir.rglob("*.json"):
            if _is_excluded(path, scan_dir):
                continue
            data = _load_json(path)
            if data is None:
                continue
            computed_id = _template_id(path) if scan_dir == LIBRARY_DIR else f"presets/{path.stem}"
            if isinstance(data, list):
                for item in data:
                    if not isinstance(item, dict):
                        continue
                    item.setdefault("id", item.get("name", computed_id))
                    if item.get("id") == template_id or item.get("name") == template_id:
                        errors = _validate_template(item, str(path))
                        if errors:
                            logger.warning("Template schema error in %s (%s): %s", path, item.get("name", "?"), "; ".join(errors))
                            return None
                        return item
            else:
                if computed_id == template_id or data.get("name") == template_id:
                    data.setdefault("id", computed_id)
                    errors = _validate_template(data, str(path))
                    if errors:
                        logger.warning("Template schema error in %s: %s", path, "; ".join(errors))
                        return None
                    return data
    return None


def validate_library() -> list[dict[str, Any]]:
    """Scan the entire library and return a list of validation reports.

    Each report has keys: path, name, errors (list of str).
    Only templates with at least one error are included.
    Useful for CI checks and the `oa templates --validate` command.
    """
    reports: list[dict[str, Any]] = []
    for scan_dir in SCAN_DIRS:
        for path in sorted(scan_dir.rglob("*.json")):
            data = _load_json(path)
            if data is None:
                continue
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                errors = _validate_template(item, str(path))
                if errors:
                    reports.append({
                        "path": str(path.relative_to(REPO_ROOT)),
                        "name": item.get("name", "<unnamed>"),
                        "archived": _is_excluded(path, scan_dir),
                        "errors": errors,
                    })
    return reports
