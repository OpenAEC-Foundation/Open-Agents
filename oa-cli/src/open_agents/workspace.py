"""Workspace builder — temp directory + CLAUDE.md generator for each agent."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

WORKSPACE_PREFIX = "oa-agent-"


def _messaging_instructions(agent_name: str) -> str:
    """Generate messaging instructions for an agent's CLAUDE.md."""
    return (
        f"\n"
        f"## Inter-Agent Messaging\n"
        f"Je naam is: **{agent_name}**\n"
        f"\n"
        f"Je kunt communiceren met andere agents:\n"
        f"- `oa inbox {agent_name}` — check je berichten\n"
        f"- `oa send <agent-naam> \"bericht\"` --from {agent_name} — stuur een bericht naar een andere agent\n"
        f"- `oa broadcast \"bericht\" --from {agent_name}` — stuur naar alle agents\n"
        f"- `oa status` — zie welke agents er draaien\n"
        f"\n"
        f"**Gebruik messaging voor:**\n"
        f"- Resultaten delen met andere agents\n"
        f"- Vragen stellen aan specialisten\n"
        f"- Conflicten voorkomen (check wie aan welk bestand werkt)\n"
        f"- Status updates aan je parent/orchestrator\n"
    )


def _spawning_instructions(agent_name: str, project_root: str | None = None) -> str:
    """Generate sub-agent spawning instructions for CLAUDE.md."""
    direct_flag = " --direct" if project_root else ""
    return (
        f"\n"
        f"## Sub-Agent Spawning\n"
        f"Als je een sub-taak wilt delegeren aan een andere agent:\n"
        f"\n"
        f"**GEBRUIK ALTIJD de Bash tool met `oa run`:**\n"
        f"```bash\n"
        f"oa run \"<taakomschrijving>\" --name <agent-naam> --model claude/sonnet "
        f"--parent {agent_name}{direct_flag} --direct\n"
        f"```\n"
        f"\n"
        f"**GEBRUIK NOOIT de ingebouwde Agent tool voor het spawnen van sub-agents.**\n"
        f"De Agent tool maakt in-process subagents die onzichtbaar zijn voor `oa status`.\n"
        f"Alleen `oa run` via Bash registreert agents correct in het oa-systeem.\n"
        f"\n"
        f"**Monitoring:**\n"
        f"- `oa status` — bekijk alle lopende agents\n"
        f"- `oa collect <naam>` — haal output op van een voltooide agent\n"
        f"- `oa watch <naam>` — volg een agent live\n"
        f"\n"
        f"**Regels:**\n"
        f"- Geef altijd `--parent {agent_name}` mee\n"
        f"- Gebruik `--model claude/sonnet` (of haiku/opus) — nooit bare `claude`\n"
        f"- Gebruik `--direct` als de sub-agent naar het project moet schrijven\n"
        f"- Wacht op sub-agents met polling: `oa status` of `oa collect <naam>`\n"
    )


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
    messaging = _messaging_instructions(agent_name)
    spawning = _spawning_instructions(agent_name, str(project_root) if project_root else None)

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
            f"{messaging}"
            f"{spawning}"
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
            f"{messaging}"
            f"{spawning}"
            f"\n"
            f"## Constraints\n"
            f"- Werk alleen binnen deze directory\n"
            f"- Vraag niet om bevestiging, werk zelfstandig\n"
            f"- Als je vastloopt, schrijf het probleem naar ./output/error.md en maak alsnog .done aan\n"
        )

    return workspace


def sync_workspace_to_remote(host: str, local_ws: Path, remote_ws: str) -> None:
    """Upload CLAUDE.md naar remote workspace via SSH/SCP."""
    subprocess.run(["ssh", "-o", "BatchMode=yes", host, f"mkdir -p {remote_ws}/output"], check=True)
    subprocess.run(["scp", "-o", "BatchMode=yes", str(local_ws / "CLAUDE.md"), f"{host}:{remote_ws}/CLAUDE.md"], check=True)


def sync_output_from_remote(host: str, remote_ws: str, local_ws: Path) -> None:
    """Haal output/result.md op van remote en zet .done lokaal."""
    result_path = local_ws / "output" / "result.md"
    result_path.parent.mkdir(exist_ok=True)
    subprocess.run(["scp", "-o", "BatchMode=yes", f"{host}:{remote_ws}/output/result.md", str(result_path)], check=True)
    (local_ws / ".done").touch()


def remote_is_done(host: str, remote_ws: str) -> bool:
    """Check of remote agent klaar is."""
    r = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", host, f"test -f {remote_ws}/.done && echo yes"],
        capture_output=True,
        text=True,
    )
    return r.stdout.strip() == "yes"


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


