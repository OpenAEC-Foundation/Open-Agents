"""Skill loader — loads skill content for agent types from ~/.claude/skills/ and ~/.oa/skills/."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

SKILL_DIRS = [
    Path.home() / ".claude" / "skills",  # global skills
    Path.home() / ".oa" / "skills",      # oa-specific skills
]

AGENT_TYPE_SKILLS: dict[str, list[str]] = {
    "researcher":   ["oa-prompting-5element", "oa-prompting-scope"],
    "code-worker":  ["oa-quality-gates"],
    "planner":      ["oa-orchestration-patterns"],
    "reviewer":     ["oa-quality-guardians"],
    "orchestrator": ["oa-orchestration-patterns", "oa-orchestration-communication"],
}


def _find_skill(skill_name: str) -> Path | None:
    """Return path to SKILL.md for a named skill, or None if not found."""
    for skill_dir in SKILL_DIRS:
        candidate = skill_dir / skill_name / "SKILL.md"
        if candidate.exists():
            return candidate
    return None


def load_skills_for_type(agent_type: str) -> str:
    """Return combined skill content for agent type, or empty string."""
    skill_names = AGENT_TYPE_SKILLS.get(agent_type, [])
    if not skill_names:
        return ""

    parts: list[str] = []
    for skill_name in skill_names:
        skill_path = _find_skill(skill_name)
        if skill_path:
            content = skill_path.read_text().strip()
            if content:
                parts.append(f"## Skill: {skill_name}\n\n{content}")

    return "\n\n---\n\n".join(parts)


def list_available_skills() -> list[str]:
    """Return names of all available skills."""
    names: list[str] = []
    seen: set[str] = set()
    for skill_dir in SKILL_DIRS:
        if not skill_dir.exists():
            continue
        for entry in sorted(skill_dir.iterdir()):
            if entry.is_dir() and (entry / "SKILL.md").exists():
                if entry.name not in seen:
                    names.append(entry.name)
                    seen.add(entry.name)
    return names


def resolve_skills_for_agent(
    skills: list[str],
    agent_type: str = "",
    project_root: Optional[Path] = None,
) -> str:
    """Combineer agent_type skills + expliciete skills lijst → markdown string.

    Volgorde:
    1. Skills van agent_type (via AGENT_TYPE_SKILLS dict — bestaand)
    2. Expliciete skills (via skill_registry.resolve_skills)
    Duplicaten worden verwijderd (eerste wint).
    Return: gecombineerde markdown string voor in CLAUDE.md
    """
    from .skill_registry import resolve_skills, load_skill_content

    parts: list[str] = []
    seen_names: set[str] = set()

    # 1. Agent type skills (bestaand mechanisme)
    type_skill_names = AGENT_TYPE_SKILLS.get(agent_type, [])
    for skill_name in type_skill_names:
        if skill_name in seen_names:
            continue
        skill_path = _find_skill(skill_name)
        if skill_path:
            content = skill_path.read_text().strip()
            if content:
                parts.append(f"## Skill: {skill_name}\n\n{content}")
                seen_names.add(skill_name)

    # 2. Expliciete skills via registry
    matches = resolve_skills(skills, project_root=project_root)
    for match in matches:
        if match.name in seen_names:
            continue
        content = load_skill_content(match)
        if content:
            parts.append(f"## Skill: {match.name}\n\n{content}")
            seen_names.add(match.name)

    return "\n\n---\n\n".join(parts)
