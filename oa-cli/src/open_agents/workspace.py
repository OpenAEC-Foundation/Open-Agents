"""Workspace builder — temp directory + CLAUDE.md generator for each agent."""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

WORKSPACE_PREFIX = "oa-agent-"


def create_workspace(agent_name: str, task: str) -> Path:
    """Create a temporary workspace directory with a CLAUDE.md file.

    Returns the workspace path.
    """
    workspace = Path(tempfile.mkdtemp(prefix=WORKSPACE_PREFIX))

    # Create output directory
    (workspace / "output").mkdir()

    claude_md = workspace / "CLAUDE.md"
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
        f"## PROPOSAL MODE (BELANGRIJK)\n"
        f"- Wijzig NOOIT bestanden buiten je eigen workspace directory\n"
        f"- Als je wijzigingen wilt voorstellen aan externe bestanden, schrijf dan een PROPOSAL:\n"
        f"  - Maak ./output/proposals/ directory aan\n"
        f"  - Schrijf per bestand een proposal: ./output/proposals/<bestandsnaam>.proposal.md\n"
        f"  - Elk proposal bevat: (1) welk bestand, (2) waarom wijzigen, (3) de volledige nieuwe inhoud\n"
        f"  - Schrijf een ./output/proposals/SUMMARY.md met overzicht van alle voorgestelde wijzigingen\n"
        f"- De eigenaar reviewt en keurt proposals goed voordat ze worden toegepast\n"
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


def list_proposals(workspace: str | Path) -> list[Path]:
    """List all proposal files in a workspace."""
    proposals_dir = Path(workspace) / "output" / "proposals"
    if not proposals_dir.exists():
        return []
    return sorted(proposals_dir.glob("*.proposal.md"))


def read_proposal(proposal_path: Path) -> str:
    """Read a single proposal file."""
    return proposal_path.read_text()


def read_proposals_summary(workspace: str | Path) -> str | None:
    """Read the proposals summary, if it exists."""
    summary = Path(workspace) / "output" / "proposals" / "SUMMARY.md"
    if summary.exists():
        return summary.read_text()
    return None
