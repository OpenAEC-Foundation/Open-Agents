"""Workspace builder — temp directory + CLAUDE.md generator for each agent."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

# Path to the honesty-enforcer template (relative to this file's package root)
_HONESTY_ENFORCER_TEMPLATE = Path(__file__).parent.parent.parent / "templates" / "honesty-enforcer.md"

WORKSPACE_PREFIX = "oa-agent-"

# Full PATH so agents (and their sub-agents) can find oa-cli (Issue #9/#11)
# Uses $HOME so it works for any user (expanded at shell runtime)
_AGENT_PATH = (
    "$HOME/.local/bin:"
    "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:"
    "/usr/games:/usr/local/games:/usr/lib/wsl/lib"
)

# Hook script content that blocks the Agent tool with a redirect message
_BLOCK_AGENT_HOOK = """\
#!/bin/bash
# Block Claude Code's built-in Agent tool — forces oa run for sub-agent spawning.
# Exit code 2 = block the tool call and show the message to the model.
echo "GEBLOKKEERD: Gebruik 'oa run' via de Bash tool in plaats van de Agent tool." >&2
echo "Voorbeeld: oa run \\"<taak>\\" --name <naam> --model claude/sonnet --direct" >&2
echo "De Agent tool maakt onzichtbare sub-agents. Alleen oa run registreert agents correct." >&2
exit 2
"""

# Settings.json template — hook path is filled in by create_workspace()
def _agent_settings(workspace: Path, can_spawn: bool = False) -> dict:
    """Build settings.json with absolute hook path for the given workspace.

    When can_spawn=False (default), the Agent tool is blocked via both a
    PreToolUse hook and a permissions deny entry (Issue #9/#11).
    When can_spawn=True, the deny entry is omitted so orchestrator agents
    can use the Agent tool to spawn child agents.
    """
    hook_path = workspace / ".claude" / "hooks" / "block-agent-tool.sh"
    settings: dict = {
        "permissions": {
            "defaultMode": "bypassPermissions",
        },
        "hooks": {
            "PreToolUse": [
                {
                    "matcher": "Agent",
                    "hooks": [f"bash {hook_path}"],
                }
            ],
        },
    }
    if not can_spawn:
        settings["permissions"]["deny"] = ["Agent"]
    return settings


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
        f"## PATH Setup (vereist voor oa-cli)\n"
        f"Voer dit uit VOORDAT je oa commando's gebruikt:\n"
        f"```bash\n"
        f"export PATH=\"{_AGENT_PATH}:$PATH\"\n"
        f"```\n"
        f"\n"
        f"## Sub-Agent Delegatie — KRITIEKE INSTRUCTIE\n"
        f"\n"
        f"### VERBODEN: Agent tool\n"
        f"De ingebouwde Agent tool is GEBLOKKEERD via een hook.\n"
        f"Gebruik de Agent tool NIET — deze maakt sub-agents die onzichtbaar zijn\n"
        f"voor `oa status` en niet kunnen communiceren via `oa send`/`oa inbox`.\n"
        f"\n"
        f"### VERPLICHT: oa run via Bash tool\n"
        f"Voor ELKE sub-taak die je wilt delegeren, gebruik de **Bash tool** met `oa run`:\n"
        f"```bash\n"
        f"export PATH=\"{_AGENT_PATH}:$PATH\"\n"
        f"oa run \"<taakomschrijving>\" --name <agent-naam> --model claude/sonnet "
        f"--parent {agent_name}{direct_flag}\n"
        f"```\n"
        f"\n"
        f"### Monitoring\n"
        f"- `oa status` — bekijk alle lopende agents\n"
        f"- `oa collect <naam>` — haal output op van een voltooide agent\n"
        f"- `oa watch <naam>` — volg een agent live\n"
        f"\n"
        f"### Regels\n"
        f"- Geef altijd `--parent {agent_name}` mee\n"
        f"- Gebruik `--model claude/sonnet` (of haiku/opus) — nooit bare `claude`\n"
        f"- Gebruik `--direct` als de sub-agent naar het project moet schrijven\n"
        f"- Wacht op sub-agents met polling: `oa status` of `oa collect <naam>`\n"
        f"- Als `oa` niet gevonden wordt: schrijf fout naar ./output/error.md en maak .done aan\n"
    )


def create_workspace(agent_name: str, task: str, project_root: str | Path | None = None, agent_type: str = "", can_spawn: bool = False, honesty: bool = False) -> Path:
    """Create a temporary workspace directory with a CLAUDE.md file.

    If project_root is provided, agents are instructed to write directly
    to the project instead of using proposals.

    Returns the workspace path.
    """
    workspace = Path(tempfile.mkdtemp(prefix=WORKSPACE_PREFIX))

    # Create output directory
    (workspace / "output").mkdir()

    # Create .claude/hooks/ and install Agent tool blocker (Issue #9/#11)
    hooks_dir = workspace / ".claude" / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    hook_script = hooks_dir / "block-agent-tool.sh"
    hook_script.write_text(_BLOCK_AGENT_HOOK)
    hook_script.chmod(0o755)

    # Write .claude/settings.json with hook config + bypass permissions
    settings_file = workspace / ".claude" / "settings.json"
    settings_file.write_text(json.dumps(_agent_settings(workspace, can_spawn=can_spawn), indent=2) + "\n")

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

    if agent_type:
        from .skill_loader import load_skills_for_type
        skill_content = load_skills_for_type(agent_type)
        if skill_content:
            existing = claude_md.read_text()
            claude_md.write_text(existing + "\n\n---\n\n# Skills\n\n" + skill_content)

    if honesty:
        inject_honesty_enforcer(workspace)

    return workspace


def inject_honesty_enforcer(workspace_path: str | Path) -> None:
    """Append the honesty-enforcer template to the workspace's CLAUDE.md.

    Reads the template from templates/honesty-enforcer.md and appends it
    to the CLAUDE.md in the given workspace directory.
    Silently skips if the template file does not exist.
    """
    claude_md = Path(workspace_path) / "CLAUDE.md"
    if not claude_md.exists():
        return
    if not _HONESTY_ENFORCER_TEMPLATE.exists():
        return
    enforcer_content = _HONESTY_ENFORCER_TEMPLATE.read_text()
    existing = claude_md.read_text()
    if "Honesty Enforcer" not in existing:
        claude_md.write_text(existing + "\n\n---\n\n" + enforcer_content)


def sync_workspace_to_remote(host: str, local_ws: Path, remote_ws: str) -> None:
    """Upload workspace (CLAUDE.md + .claude/) naar remote via SSH/SCP."""
    subprocess.run(["ssh", "-o", "BatchMode=yes", host, f"mkdir -p {remote_ws}/output {remote_ws}/.claude/hooks"], check=True)
    subprocess.run(["scp", "-o", "BatchMode=yes", str(local_ws / "CLAUDE.md"), f"{host}:{remote_ws}/CLAUDE.md"], check=True)
    # Sync delegation hooks and settings so remote agents also block the Agent tool
    claude_dir = local_ws / ".claude"
    if claude_dir.exists():
        subprocess.run(["scp", "-r", "-o", "BatchMode=yes", str(claude_dir), f"{host}:{remote_ws}/"], check=True)


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


