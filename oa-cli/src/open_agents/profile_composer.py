"""Profile Composer — compose multi-template agent profiles for oa-cli.

A profile bundles multiple agent templates (and optional skills) into a single
merged configuration ready for spawn_agent. Profiles are stored as JSON files
in agents/library/profiles/.

Functions
---------
merge_templates  — merge N templates into one spawn-ready dict
load_profile     — load a profile from disk
save_profile     — persist a profile to disk
list_profiles    — scan all profiles
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_PROFILES_DIR = Path(
    "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/profiles"
)

_AGENTS_LIBRARY_DIR = Path(
    "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library"
)

_MODEL_PRIORITY: dict[str, int] = {
    "opus": 3,
    "sonnet": 2,
    "haiku": 1,
    "default": 0,
    "": 0,
}


def _model_weight(model_hint: str) -> int:
    """Return numeric priority for a modelHint string."""
    if not model_hint:
        return 0
    hint = model_hint.lower()
    for key, weight in _MODEL_PRIORITY.items():
        if key and key in hint:
            return weight
    return 0


# ---------------------------------------------------------------------------
# Template loading (mirrors cli.py _load_template, no typer dependency)
# ---------------------------------------------------------------------------

def _load_template_from_library(template_id: str, library_dir: Path) -> Optional[dict]:
    """Find and load a template JSON by stem, relative path, or id field.

    Returns None (with a stderr warning) if the template cannot be found.
    """
    if not library_dir.exists():
        print(f"[profile_composer] WARNING: library dir not found: {library_dir}", file=sys.stderr)
        return None

    lookup = template_id.lstrip("/")
    if lookup.endswith(".json"):
        lookup = lookup[:-5]

    # Pass 1: match by file stem or relative path (no .json)
    for json_file in library_dir.rglob("*.json"):
        if "_archive" in json_file.parts:
            continue
        rel_no_ext = (
            str(json_file.relative_to(library_dir))
            .replace("\\", "/")
            .removesuffix(".json")
        )
        stem = json_file.stem
        if stem == lookup or rel_no_ext == lookup:
            try:
                return json.loads(json_file.read_text(encoding="utf-8"))
            except Exception as exc:
                print(
                    f"[profile_composer] WARNING: failed to parse {json_file}: {exc}",
                    file=sys.stderr,
                )
                return None

    # Pass 2: match by 'id' field
    for json_file in library_dir.rglob("*.json"):
        if "_archive" in json_file.parts:
            continue
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(data, dict) and data.get("id") == lookup:
            return data

    print(
        f"[profile_composer] WARNING: template '{template_id}' not found — skipping.",
        file=sys.stderr,
    )
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def merge_templates(template_ids: list[str], library_dir: Optional[Path] = None) -> dict:
    """Merge multiple templates into a single spawn-ready configuration dict.

    Merging rules
    -------------
    - systemPrompt: concatenated with ``## Role: <name>\\n<prompt>\\n---\\n`` separator
    - tools:        union of all tools lists (deduplicated, order preserved)
    - modelHint:    heaviest model wins (opus > sonnet > haiku > default)
    - All other fields from the first successfully loaded template carry over
      as base values; subsequent templates do NOT override scalar fields.

    Templates that cannot be loaded are skipped with a stderr warning.

    Parameters
    ----------
    template_ids:
        List of template identifiers (stem, relative path, or id field).
    library_dir:
        Path to the agents/library directory. Defaults to the repo standard.

    Returns
    -------
    dict ready to pass to spawn_agent.
    """
    if library_dir is None:
        library_dir = _AGENTS_LIBRARY_DIR

    loaded: list[dict] = []
    for tid in template_ids:
        tpl = _load_template_from_library(tid, library_dir)
        if tpl is not None:
            loaded.append(tpl)

    if not loaded:
        return {}

    # Base dict from first template (scalar fields)
    merged = dict(loaded[0])

    # Collect system prompts with role headers
    prompt_parts: list[str] = []
    for tpl in loaded:
        name = tpl.get("name", tpl.get("id", "Unknown"))
        prompt = tpl.get("systemPrompt", "")
        if prompt:
            prompt_parts.append(f"## Role: {name}\n{prompt}\n---")

    merged["systemPrompt"] = "\n\n".join(prompt_parts)

    # Union of tools (preserve insertion order, deduplicate)
    seen_tools: set[str] = set()
    merged_tools: list[str] = []
    for tpl in loaded:
        for tool in tpl.get("tools", []):
            if tool not in seen_tools:
                seen_tools.add(tool)
                merged_tools.append(tool)
    merged["tools"] = merged_tools

    # Heaviest modelHint wins
    best_weight = 0
    best_hint = loaded[0].get("modelHint", "")
    for tpl in loaded:
        hint = tpl.get("modelHint", "")
        w = _model_weight(hint)
        if w > best_weight:
            best_weight = w
            best_hint = hint
    merged["modelHint"] = best_hint

    # Tag the merged result
    merged["_merged_from"] = template_ids

    return merged


def load_profile(profile_id: str, profiles_dir: Optional[Path] = None) -> dict:
    """Load a profile from agents/library/profiles/<profile_id>.json.

    Parameters
    ----------
    profile_id:
        Profile identifier (filename stem, e.g. ``"fullstack-researcher"``).
    profiles_dir:
        Override the default profiles directory.

    Returns
    -------
    Profile dict with at least ``templates``, ``skills``, ``modelHint``,
    and ``description`` keys.

    Raises
    ------
    FileNotFoundError if the profile does not exist.
    """
    if profiles_dir is None:
        profiles_dir = _DEFAULT_PROFILES_DIR

    profile_path = profiles_dir / f"{profile_id}.json"
    if not profile_path.exists():
        raise FileNotFoundError(
            f"Profile '{profile_id}' not found at {profile_path}"
        )

    data = json.loads(profile_path.read_text(encoding="utf-8"))
    return data


def save_profile(
    profile_id: str,
    templates: list[str],
    skills: list[str],
    description: str,
    profiles_dir: Optional[Path] = None,
    name: str = "",
    model_hint: str = "",
) -> Path:
    """Save a profile to agents/library/profiles/<profile_id>.json.

    Auto-generates tags from template names: each ``-``-separated word in
    a template id becomes a candidate tag (deduplicated).

    Parameters
    ----------
    profile_id:
        Identifier / filename stem for the profile.
    templates:
        List of template IDs to include.
    skills:
        List of skill IDs to attach.
    description:
        Human-readable description of the profile's purpose.
    profiles_dir:
        Override the default profiles directory.

    Returns
    -------
    Path to the written JSON file.
    """
    if profiles_dir is None:
        profiles_dir = _DEFAULT_PROFILES_DIR

    profiles_dir.mkdir(parents=True, exist_ok=True)

    # Derive tags from template category words (split on "-")
    tag_set: set[str] = set()
    for tid in templates:
        stem = tid.split("/")[-1]  # take last segment if path-like
        parts = stem.replace("_", "-").split("-")
        for part in parts:
            if len(part) >= 3:
                tag_set.add(part.lower())

    profile_data = {
        "id": profile_id,
        "name": name or profile_id,
        "description": description,
        "templates": templates,
        "skills": skills,
        "tags": sorted(tag_set),
        "modelHint": model_hint,
    }

    out_path = profiles_dir / f"{profile_id}.json"
    out_path.write_text(json.dumps(profile_data, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_path


def list_profiles(profiles_dir: Optional[Path] = None) -> list[dict]:
    """List all profiles in the profiles directory.

    Parameters
    ----------
    profiles_dir:
        Override the default profiles directory.

    Returns
    -------
    List of profile dicts sorted by profile id (alphabetically).
    """
    if profiles_dir is None:
        profiles_dir = _DEFAULT_PROFILES_DIR

    if not profiles_dir.exists():
        return []

    profiles: list[dict] = []
    for json_file in sorted(profiles_dir.glob("*.json")):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                profiles.append(data)
        except Exception as exc:
            print(
                f"[profile_composer] WARNING: failed to parse {json_file}: {exc}",
                file=sys.stderr,
            )

    return profiles
