"""Skill Registry — multi-level skill discovery en installatie."""

from __future__ import annotations

import json
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

REGISTRY_PATH = Path.home() / ".oa" / "skill-registry.json"

SKILL_LEVELS = ["workspace", "global", "system", "package"]


@dataclass
class SkillMatch:
    name: str
    path: Path
    level: str  # workspace | global | system | package
    source: str  # path of source dir
    tags: list[str] = field(default_factory=list)
    description: str = ""  # from frontmatter


def _parse_frontmatter(skill_path: Path) -> dict:
    """Parse YAML frontmatter from SKILL.md.

    Reads between --- delimiters and extracts name, description, tags.
    Returns empty dict if no valid frontmatter found.
    """
    try:
        content = skill_path.read_text(encoding="utf-8")
    except OSError:
        return {}

    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    # Find closing ---
    end = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = i
            break

    if end is None:
        return {}

    fm_lines = lines[1:end]
    result: dict = {}

    for line in fm_lines:
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip()
        if key == "tags":
            # Tags can be inline list: [tag1, tag2] or comma-separated
            val = val.strip("[]")
            result["tags"] = [t.strip() for t in val.split(",") if t.strip()]
        else:
            result[key] = val

    return result


def _scan_skill_dir(skill_dir: Path, level: str) -> dict[str, SkillMatch]:
    """Scan a single skill directory and return {name: SkillMatch}."""
    result: dict[str, SkillMatch] = {}
    if not skill_dir.exists() or not skill_dir.is_dir():
        return result

    for entry in skill_dir.iterdir():
        if not entry.is_dir():
            continue
        skill_md = entry / "SKILL.md"
        if not skill_md.exists():
            continue

        fm = _parse_frontmatter(skill_md)
        name = fm.get("name", entry.name)
        tags = fm.get("tags", [])
        description = fm.get("description", "")

        result[name] = SkillMatch(
            name=name,
            path=skill_md,
            level=level,
            source=str(skill_dir),
            tags=tags,
            description=description,
        )

    return result


def scan_skills(project_root: Optional[Path] = None) -> dict[str, SkillMatch]:
    """Scan alle 4 niveaus en return dict[name -> SkillMatch].

    Prioriteit: workspace > global > system > package (eerste match wint).
    Scant van laag naar hoog prioriteit, hogere prio overschrijft lagere.
    """
    skills: dict[str, SkillMatch] = {}

    # 1. Package skills (laagste prioriteit — scan eerst)
    package_dirs = _get_package_skill_dirs()
    for pkg_dir in package_dirs:
        pkg_skills = _scan_skill_dir(pkg_dir, "package")
        skills.update(pkg_skills)

    # 2. System: ~/.oa/skills/
    system_dir = Path.home() / ".oa" / "skills"
    system_skills = _scan_skill_dir(system_dir, "system")
    skills.update(system_skills)

    # 3. Global: ~/.claude/skills/
    global_dir = Path.home() / ".claude" / "skills"
    global_skills = _scan_skill_dir(global_dir, "global")
    skills.update(global_skills)

    # 4. Workspace: {project_root}/.claude/skills/ (hoogste prioriteit)
    if project_root is not None:
        workspace_dir = Path(project_root) / ".claude" / "skills"
        workspace_skills = _scan_skill_dir(workspace_dir, "workspace")
        skills.update(workspace_skills)

    return skills


def _get_package_skill_dirs() -> list[Path]:
    """Return list of skill directories from registered packages."""
    if not REGISTRY_PATH.exists():
        return []

    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    dirs: list[Path] = []
    for pkg in registry.get("packages", []):
        pkg_path = Path(pkg.get("path", ""))
        # Try skills/ or .claude/skills/ subdirectory
        for subdir in ["skills", ".claude/skills"]:
            candidate = pkg_path / subdir
            if candidate.exists():
                dirs.append(candidate)
                break

    return dirs


def find_skill(name: str, project_root: Optional[Path] = None) -> Optional[SkillMatch]:
    """Zoek skill op naam, return SkillMatch of None."""
    all_skills = scan_skills(project_root)
    return all_skills.get(name)


def resolve_skills(
    names: list[str], project_root: Optional[Path] = None
) -> list[SkillMatch]:
    """Resolve lijst van skill namen naar SkillMatch objecten.

    Gooit warning (niet error) voor niet-gevonden skills.
    """
    all_skills = scan_skills(project_root)
    result: list[SkillMatch] = []

    for name in names:
        match = all_skills.get(name)
        if match is None:
            warnings.warn(f"Skill '{name}' not found in any skill directory", stacklevel=2)
        else:
            result.append(match)

    return result


def load_skill_content(match: SkillMatch) -> str:
    """Lees SKILL.md content (zonder frontmatter)."""
    try:
        content = match.path.read_text(encoding="utf-8")
    except OSError:
        return ""

    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return content.strip()

    # Skip frontmatter block
    end = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = i
            break

    if end is None:
        return content.strip()

    body = "\n".join(lines[end + 1:]).strip()
    return body


def install_package(package_path: str | Path) -> dict:
    """Registreer skill package in ~/.oa/skill-registry.json.

    Scant package_path/skills/ of package_path/.claude/skills/ voor SKILL.md bestanden.
    Return: {"installed": int, "skills": [names]}
    """
    pkg_path = Path(package_path).resolve()

    # Find skill dir in package
    skill_dir: Path | None = None
    for subdir in ["skills", ".claude/skills"]:
        candidate = pkg_path / subdir
        if candidate.exists() and candidate.is_dir():
            skill_dir = candidate
            break

    installed_names: list[str] = []
    if skill_dir is not None:
        skills = _scan_skill_dir(skill_dir, "package")
        installed_names = list(skills.keys())

    # Load or init registry
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    if REGISTRY_PATH.exists():
        try:
            registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            registry = {"packages": []}
    else:
        registry = {"packages": []}

    # Add package if not already registered (by path)
    pkg_str = str(pkg_path)
    existing_paths = {p.get("path") for p in registry.get("packages", [])}
    if pkg_str not in existing_paths:
        registry.setdefault("packages", []).append({"path": pkg_str})

    REGISTRY_PATH.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")

    return {"installed": len(installed_names), "skills": installed_names}


def list_skills(
    level: Optional[str] = None,
    tag: Optional[str] = None,
    project_root: Optional[Path] = None,
) -> list[SkillMatch]:
    """List alle beschikbare skills, optioneel gefilterd op level of tag."""
    all_skills = scan_skills(project_root)
    result = list(all_skills.values())

    if level is not None:
        result = [s for s in result if s.level == level]

    if tag is not None:
        result = [s for s in result if tag in s.tags]

    return result
