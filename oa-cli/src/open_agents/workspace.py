"""Workspace builder — temp directory + CLAUDE.md generator for each agent."""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

WORKSPACE_PREFIX = "oa-agent-"


def create_workspace(agent_name: str, task: str, project_root: str | Path | None = None) -> Path:
    """Create a temporary workspace directory with a CLAUDE.md file.

    If project_root is provided, agents are instructed to write directly
    to the project instead of using proposals.

    Returns the workspace path.
    """
    workspace = Path(tempfile.mkdtemp(prefix=WORKSPACE_PREFIX))

    # Create output directory
    (workspace / "output").mkdir()

    claude_md = workspace / "CLAUDE.md"

    if project_root:
        # Direct write mode — agents write to the real project
        claude_md.write_text(
            f"# Taak: {task}\n"
            f"\n"
            f"## Instructies\n"
            f"{task}\n"
            f"\n"
            f"## Output\n"
            f"- Schrijf een ./output/result.md met een samenvatting van wat je hebt gedaan\n"
            f"- Maak een .done file in de root als je helemaal klaar bent\n"
            f"\n"
            f"## DIRECT WRITE MODE\n"
            f"- Je MOET wijzigingen DIRECT schrijven naar het project in: {project_root}\n"
            f"- Lees eerst het bestaande bestand, dan Edit of Write naar het doelbestand\n"
            f"- Schrijf GEEN proposals — schrijf direct naar de echte bestanden\n"
            f"- Maak GEEN proposals/ directory aan\n"
            f"\n"
            f"## Constraints\n"
            f"- Vraag niet om bevestiging, werk zelfstandig\n"
            f"- Als je vastloopt, schrijf het probleem naar ./output/error.md en maak alsnog .done aan\n"
        )
    else:
        # Default mode — agents work within their workspace
        claude_md.write_text(
            f"# Taak: {task}\n"
            f"\n"
            f"## Instructies\n"
            f"{task}\n"
            f"\n"
            f"## Output\n"
            f"- Schrijf alle resultaten naar ./output/\n"
            f"- Maak een ./output/result.md met een samenvatting van wat je hebt gedaan\n"
            f"- Maak een .done file in de root als je helemaal klaar bent\n"
            f"\n"
            f"## Constraints\n"
            f"- Werk alleen binnen deze directory\n"
            f"- Vraag niet om bevestiging, werk zelfstandig\n"
            f"- Als je vastloopt, schrijf het probleem naar ./output/error.md en maak alsnog .done aan\n"
        )

    return workspace


def cleanup_workspace(workspace: str | Path) -> bool:
    """Remove a workspace directory. Returns True if it existed."""
    path = Path(workspace)
    if path.exists():
        shutil.rmtree(path)
        return True
    return False


def workspace_is_done(workspace: str | Path) -> bool:
    """Check if the agent has signaled completion via .done file."""
    return (Path(workspace) / ".done").exists()


def read_output(workspace: str | Path) -> str | None:
    """Read the output/result.md from a workspace, if it exists."""
    result_file = Path(workspace) / "output" / "result.md"
    if result_file.exists():
        return result_file.read_text()
    # Fallback: check for any .md files in output/
    output_dir = Path(workspace) / "output"
    if output_dir.exists():
        md_files = sorted(output_dir.glob("*.md"))
        if md_files:
            return md_files[0].read_text()
    return None


