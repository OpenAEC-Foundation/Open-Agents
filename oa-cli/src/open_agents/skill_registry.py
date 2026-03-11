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
    path: Path          # path to SKILL.md
    level: str          # workspace | global | system | package
    source: str         # path of source dir / package root
    tags: list[str] = field(default_factory=list)
    description: str = ""  # from frontmatter
    folder: Path = field(default_factory=Path)        # parent dir of SKILL.md (skill folder)
    supporting_files: list[Path] = field(default_factory=list)  # files in skill folder besides SKILL.md


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


def _scan_recursive(root: Path, level: str) -> dict[str, SkillMatch]:
    """Recursively scan root for SKILL.md files at any depth.

    The skill folder is the parent directory of each SKILL.md.
    Supporting files are all files/dirs in the skill folder except SKILL.md itself.

    Returns {name: SkillMatch}.
    """
    result: dict[str, SkillMatch] = {}
    if not root.exists() or not root.is_dir():
        return result

    for skill_md in root.rglob("SKILL.md"):
        skill_folder = skill_md.parent

        fm = _parse_frontmatter(skill_md)
        name = fm.get("name", skill_folder.name)
        tags = fm.get("tags", [])
        description = fm.get("description", "")

        # Collect supporting files (everything in skill folder except SKILL.md)
        supporting: list[Path] = []
        try:
            for item in skill_folder.iterdir():
                if item.name != "SKILL.md":
                    supporting.append(item)
        except OSError:
            pass

        result[name] = SkillMatch(
            name=name,
            path=skill_md,
            level=level,
            source=str(root),
            tags=tags,
            description=description,
            folder=skill_folder,
            supporting_files=supporting,
        )

    return result


def _scan_skill_dir(skill_dir: Path, level: str) -> dict[str, SkillMatch]:
    """Scan a single skill directory and return {name: SkillMatch}.

    Deprecated: use _scan_recursive() instead. Kept for backward compatibility.
    """
    return _scan_recursive(skill_dir, level)


def scan_skills(project_root: Optional[Path] = None) -> dict[str, SkillMatch]:
    """Scan alle 4 niveaus en return dict[name -> SkillMatch].

    Prioriteit: workspace > global > system > package (eerste match wint).
    Scant van laag naar hoog prioriteit, hogere prio overschrijft lagere.
    """
    skills: dict[str, SkillMatch] = {}

    # 1. Package skills (laagste prioriteit — scan eerst)
    package_roots = _get_package_roots()
    for pkg_root in package_roots:
        pkg_skills = _scan_recursive(pkg_root, "package")
        skills.update(pkg_skills)

    # 2. System: ~/.oa/skills/
    system_dir = Path.home() / ".oa" / "skills"
    system_skills = _scan_recursive(system_dir, "system")
    skills.update(system_skills)

    # 3. Global: ~/.claude/skills/
    global_dir = Path.home() / ".claude" / "skills"
    global_skills = _scan_recursive(global_dir, "global")
    skills.update(global_skills)

    # 4. Workspace: {project_root}/.claude/skills/ (hoogste prioriteit)
    if project_root is not None:
        workspace_dir = Path(project_root) / ".claude" / "skills"
        workspace_skills = _scan_recursive(workspace_dir, "workspace")
        skills.update(workspace_skills)

    return skills


def _get_package_roots() -> list[Path]:
    """Return list of package root Paths from registered packages."""
    if not REGISTRY_PATH.exists():
        return []

    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    roots: list[Path] = []
    for pkg in registry.get("packages", []):
        pkg_path = Path(pkg.get("path", ""))
        if pkg_path.exists():
            roots.append(pkg_path)

    return roots


def _get_package_skill_dirs() -> list[Path]:
    """Return list of skill directories from registered packages.

    Deprecated: use _get_package_roots() instead. Kept for backward compatibility.
    Falls back to looking for skills/ or .claude/skills/ subdirs for old-style registries.
    """
    if not REGISTRY_PATH.exists():
        return []

    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    dirs: list[Path] = []
    for pkg in registry.get("packages", []):
        pkg_path = Path(pkg.get("path", ""))
        # Try skills/ or .claude/skills/ subdirectory (legacy behaviour)
        added = False
        for subdir in ["skills", ".claude/skills"]:
            candidate = pkg_path / subdir
            if candidate.exists():
                dirs.append(candidate)
                added = True
                break
        # If no subdir found but package root exists, include root for new-style packages
        if not added and pkg_path.exists():
            dirs.append(pkg_path)

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
    """Lees SKILL.md content (zonder frontmatter), plus references/ dir content."""
    try:
        content = match.path.read_text(encoding="utf-8")
    except OSError:
        return ""

    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        body = content.strip()
    else:
        # Skip frontmatter block
        end = None
        for i, line in enumerate(lines[1:], start=1):
            if line.strip() == "---":
                end = i
                break

        if end is None:
            body = content.strip()
        else:
            body = "\n".join(lines[end + 1:]).strip()

    # Append references/ dir content if it exists
    skill_folder = match.folder if match.folder != Path() else match.path.parent
    references_dir = skill_folder / "references"
    if references_dir.exists() and references_dir.is_dir():
        ref_parts: list[str] = []
        try:
            for ref_file in sorted(references_dir.iterdir()):
                if ref_file.is_file() and ref_file.suffix.lower() == ".md":
                    try:
                        ref_content = ref_file.read_text(encoding="utf-8")
                        ref_parts.append(f"\n\n## Reference: {ref_file.name}\n\n{ref_content.strip()}")
                    except OSError:
                        pass
        except OSError:
            pass

        if ref_parts:
            body = body + "".join(ref_parts)

    return body


def get_skill_context(match: SkillMatch) -> dict:
    """Return full skill context as a structured dict.

    Returns:
        {
            "content": str,               # SKILL.md body (no frontmatter)
            "scripts": [(name, content)], # files in scripts/
            "references": [(name, content)], # .md files in references/
            "assets": [path],             # paths of files in assets/
        }
    """
    skill_folder = match.folder if match.folder != Path() else match.path.parent

    # SKILL.md body
    content = load_skill_content(match)

    # scripts/
    scripts: list[tuple[str, str]] = []
    scripts_dir = skill_folder / "scripts"
    if scripts_dir.exists() and scripts_dir.is_dir():
        try:
            for script_file in sorted(scripts_dir.iterdir()):
                if script_file.is_file():
                    try:
                        scripts.append((script_file.name, script_file.read_text(encoding="utf-8")))
                    except OSError:
                        pass
        except OSError:
            pass

    # references/
    references: list[tuple[str, str]] = []
    references_dir = skill_folder / "references"
    if references_dir.exists() and references_dir.is_dir():
        try:
            for ref_file in sorted(references_dir.iterdir()):
                if ref_file.is_file() and ref_file.suffix.lower() == ".md":
                    try:
                        references.append((ref_file.name, ref_file.read_text(encoding="utf-8")))
                    except OSError:
                        pass
        except OSError:
            pass

    # assets/
    assets: list[Path] = []
    assets_dir = skill_folder / "assets"
    if assets_dir.exists() and assets_dir.is_dir():
        try:
            for asset_file in sorted(assets_dir.rglob("*")):
                if asset_file.is_file():
                    assets.append(asset_file)
        except OSError:
            pass

    return {
        "content": content,
        "scripts": scripts,
        "references": references,
        "assets": assets,
    }


def install_package(package_path: str | Path) -> dict:
    """Registreer skill package in ~/.oa/skill-registry.json.

    Scant package_path recursively voor SKILL.md bestanden.
    Return: {"installed": int, "skills": [names]}
    """
    pkg_root = Path(package_path).resolve()

    # Scan recursively from package root
    skills = _scan_recursive(pkg_root, "package")
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

    # Add package if not already registered (by path), store root + name
    pkg_str = str(pkg_root)
    existing_paths = {p.get("path") for p in registry.get("packages", [])}
    if pkg_str not in existing_paths:
        registry.setdefault("packages", []).append({
            "path": pkg_str,
            "name": pkg_root.name,
        })

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
