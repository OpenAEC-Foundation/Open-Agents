"""Shared helpers used across command modules."""

from __future__ import annotations

import json
from pathlib import Path

import typer
from rich.console import Console

from ..config import load_config

console = Console()


def _resolve_library_dir() -> Path:
    """Resolve agents/library path: config > env > repo root (3 levels up from package)."""
    import os
    cfg = load_config()
    if "agents_library" in cfg:
        return Path(cfg["agents_library"])
    if "OA_AGENTS_LIBRARY" in os.environ:
        return Path(os.environ["OA_AGENTS_LIBRARY"])
    # Installed in editable mode: cli.py → open_agents/ → src/ → oa-cli/ → repo root
    return Path(__file__).parents[4] / "agents" / "library"


AGENTS_LIBRARY_DIR = _resolve_library_dir()


def _load_template(template_id: str) -> dict:
    """Search all JSON files in agents/library/ for a template by:
    1. Exact file stem match (e.g. 'api-contract-validator')
    2. Relative path without extension (e.g. 'code-dev/api-contract-validator')
    3. JSON 'id' field match (e.g. 'code-dev-api-contract-validator')
    """
    if not AGENTS_LIBRARY_DIR.exists():
        console.print(f"[red]Agents library not found at {AGENTS_LIBRARY_DIR}[/red]")
        raise typer.Exit(1)

    # Normalize: strip leading slash and .json suffix if present
    lookup = template_id.lstrip("/")
    if lookup.endswith(".json"):
        lookup = lookup[:-5]

    for json_file in AGENTS_LIBRARY_DIR.rglob("*.json"):
        rel_no_ext = str(json_file.relative_to(AGENTS_LIBRARY_DIR)).replace("\\", "/").removesuffix(".json")
        stem = json_file.stem
        if stem == lookup or rel_no_ext == lookup:
            try:
                return json.loads(json_file.read_text())
            except Exception:
                console.print(f"[red]Failed to parse template file: {json_file}[/red]")
                raise typer.Exit(1)

    # Second pass: match by 'id' field
    for json_file in AGENTS_LIBRARY_DIR.rglob("*.json"):
        try:
            data = json.loads(json_file.read_text())
        except Exception:
            continue
        if data.get("id") == lookup:
            return data

    console.print(f"[red]Template '{template_id}' not found in agents/library/[/red]")
    console.print("[dim]Run 'oa templates' to see all available templates.[/dim]")
    raise typer.Exit(1)


def _load_skills(skill_ids: str) -> str:
    """Load one or more skill SKILL.md files by id (comma-separated).

    Resolution order per skill id:
    1. agents/library/**/<id>.json  → reads 'skillRef' field → resolves relative to skill package
    2. .claude/skills/**/<id>/SKILL.md  in current working dir (project skill package)
    3. ~/.claude/skills/**/<id>/SKILL.md  (global fallback)

    Returns a formatted context block ready to prepend to any agent prompt.
    """
    import os
    ids = [s.strip() for s in skill_ids.split(",") if s.strip()]
    blocks: list[str] = []

    cfg = load_config()
    # Search roots: skill_packages from config + .claude/skills in cwd + global ~/.claude/skills
    skill_search_roots = [
        *(Path(p) / ".claude" / "skills" for p in cfg.get("skill_packages", [])),
        Path.cwd() / ".claude" / "skills",
        Path.home() / ".claude" / "skills",
    ]

    for skill_id in ids:
        content: str | None = None

        # Strategy 1: find via template JSON skillRef → search in all skill_packages
        lib_dir = _resolve_library_dir()
        if lib_dir.exists():
            for jf in lib_dir.rglob("*.json"):
                if jf.stem == skill_id:
                    try:
                        tmpl = json.loads(jf.read_text())
                        skill_ref = tmpl.get("skillRef", "")
                        if skill_ref:
                            # Try each skill package root for this skillRef
                            search_bases = [
                                lib_dir.parents[1],  # Open-Agents repo root
                                *(Path(p) for p in cfg.get("skill_packages", [])),
                            ]
                            for base in search_bases:
                                skill_path = base / skill_ref
                                if skill_path.exists():
                                    content = skill_path.read_text()
                                    break
                        if content:
                            break
                    except Exception:
                        pass

        # Strategy 2+: search .claude/skills/ directories
        if content is None:
            for root in skill_search_roots:
                if not root.exists():
                    continue
                for skill_dir in root.rglob(skill_id):
                    if skill_dir.is_dir():
                        candidate = skill_dir / "SKILL.md"
                        if candidate.exists():
                            content = candidate.read_text()
                            break
                if content:
                    break

        if content:
            blocks.append(f"## SKILL CONTEXT: {skill_id}\n\n{content.strip()}")
        else:
            blocks.append(f"## SKILL CONTEXT: {skill_id}\n\n[Skill not found — id: {skill_id}]")

    if not blocks:
        return ""
    return "\n\n---\n\n".join(blocks)


def _run_preflight_gate() -> bool:
    """Run preflight checks and return True if all pass, False otherwise.

    On failure, prints a Rich error panel with fix hints per failing check.
    """
    from .. import preflight
    from rich.panel import Panel

    results = preflight.check_all()
    failed = [r for r in results if not r.ok]
    if not failed:
        return True

    lines = []
    for r in failed:
        lines.append(f"[bold red]{r.name}[/bold red]: {r.message}")
        if r.fix_hint:
            lines.append(f"  [dim]Fix:[/dim] {r.fix_hint}")

    console.print(
        Panel(
            "\n".join(lines),
            title="[red bold]Preflight checks failed[/red bold]",
            border_style="red",
        )
    )
    console.print("[dim]Run 'oa setup' to see the full report.[/dim]")
    return False


def _which(cmd: str) -> bool:
    import shutil
    return shutil.which(cmd) is not None


def _setup_anthropic_skills() -> None:
    """Clone and register the official Anthropic skills repo during oa setup.

    Idempotent — skips if already registered or if git is unavailable.
    """
    import subprocess
    import json as _json
    from ..skill_registry import REGISTRY_PATH, install_package

    ANTHROPIC_SKILLS_URL = "https://github.com/anthropics/skills.git"
    skills_dir = Path.home() / ".oa" / "anthropics-skills"

    # Check if already registered
    if REGISTRY_PATH.exists():
        try:
            registry = _json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
            registered_paths = {p.get("path", "") for p in registry.get("packages", [])}
            if str(skills_dir) in registered_paths:
                console.print("[dim]Anthropic official skills: already registered[/dim]")
                return
        except Exception:
            pass

    # Clone if not on disk
    if not skills_dir.exists():
        if not _which("git"):
            console.print("[yellow]git not found — skipping Anthropic skills auto-install[/yellow]")
            return
        console.print("[cyan]Downloading Anthropic official skills...[/cyan]")
        result = subprocess.run(
            ["git", "clone", "--depth=1", ANTHROPIC_SKILLS_URL, str(skills_dir)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            console.print(f"[yellow]Could not clone Anthropic skills: {result.stderr.strip()[:80]}[/yellow]")
            return

    # Register
    result = install_package(skills_dir)
    console.print(f"[green]✓ Anthropic official skills: {result['installed']} skills registered[/green]")
