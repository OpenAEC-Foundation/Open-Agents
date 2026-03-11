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


def _feedback_loop_instructions(agent_name: str, parent_name: str) -> str:
    """Generate mandatory feedback loop instructions for an agent's CLAUDE.md.

    These instructions ensure agents automatically report status back to their
    spawner (parent) via oa send messages at key lifecycle moments.
    """
    return (
        f"\n"
        f"## Communicatie met je spawner\n"
        f"Je spawner heet: **{parent_name}**\n"
        f"\n"
        f"Verplichte statusupdates via oa CLI:\n"
        f"1. Bij START: `oa send {parent_name} \"\U0001f680 Gestart: <korte taakbeschrijving>\" --from {agent_name}`\n"
        f"2. Bij MILESTONE (elke grote stap klaar): `oa send {parent_name} \"\u2705 Milestone: <beschrijving>\" --from {agent_name}`\n"
        f"3. Bij BLOKKADE: `oa send {parent_name} \"\U0001f534 Geblokkeerd: <reden> — wacht op input\" --from {agent_name}`\n"
        f"4. Bij DONE: `oa send {parent_name} \"\u2705 KLAAR: <samenvatting van output>\" --from {agent_name}`\n"
        f"5. Bij FOUT: `oa send {parent_name} \"\u274c FOUT: <beschrijving>\" --from {agent_name}`\n"
        f"\n"
        f"Als je sub-agents spawnt: geef hen `--name {agent_name}-<subtaak>` zodat de hiërarchie zichtbaar is.\n"
    )


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


def _identity_section(agent_name: str, task: str, model: str = "", team: str = "") -> str:
    """Generate the Identity section for the CLAUDE.md."""
    task_summary = task[:120].replace("\n", " ") + ("..." if len(task) > 120 else "")
    model_label = model if model else "default"
    team_label = team if team else "—"
    return (
        f"## Identity\n"
        f"- **Name:** {agent_name}\n"
        f"- **Model:** {model_label}\n"
        f"- **Team:** {team_label}\n"
        f"- **Task:** {task_summary}\n"
    )


def _quality_rules_section() -> str:
    """Generate the Quality Rules section for the CLAUDE.md."""
    return (
        f"\n## Quality Rules\n"
        f"1. No hallucinations — only state what you know to be true\n"
        f"2. Write directly — no proposals, no drafts, no intermediary files\n"
        f"3. Use absolute paths for all file references\n"
        f"4. Confirm each step by writing progress notes to ./output/\n"
        f"5. Write result.md and create .done when fully done\n"
    )


def _anti_patterns_section() -> str:
    """Generate the Anti-patterns section for the CLAUDE.md."""
    return (
        f"\n## Anti-patterns\n"
        f"- Do NOT ask for confirmation — work autonomously\n"
        f"- Do NOT use relative paths for project file references\n"
        f"- Do NOT create a proposals/ directory\n"
        f"- Do NOT use the built-in Agent tool (blocked) — use `oa run` via Bash\n"
        f"- Do NOT leave .done unset if you finish or encounter an error\n"
    )


def _team_context_section(agent_name: str, team: str) -> str:
    """Generate the Team Context section when agent belongs to a team."""
    if not team:
        return ""
    return (
        f"\n## Team Context\n"
        f"You are part of team: **{team}**\n"
        f"Coordinate with teammates via messaging:\n"
        f"- `oa inbox {agent_name}` — check incoming messages\n"
        f"- `oa send <agent> \"msg\" --from {agent_name}` — send to a teammate\n"
        f"- Share results and avoid file conflicts with teammates\n"
    )


def create_workspace(agent_name: str, task: str, project_root: str | Path | None = None, agent_type: str = "", can_spawn: bool = False, honesty: bool = False, team: str = "", model: str = "", parent_name: str = "meta") -> Path:
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
    identity = _identity_section(agent_name, task, model=model, team=team)
    quality_rules = _quality_rules_section()
    anti_patterns = _anti_patterns_section()
    team_context = _team_context_section(agent_name, team)
    feedback_loop = _feedback_loop_instructions(agent_name, parent_name)
    messaging = _messaging_instructions(agent_name)
    spawning = _spawning_instructions(agent_name, str(project_root) if project_root else None)

    if project_root:
        # Direct write mode — agents write to the real project
        claude_md.write_text(
            f"# Agent: {agent_name}\n"
            f"\n"
            f"{identity}"
            f"\n## Task\n"
            f"{task}\n"
            f"\n## Output Location\n"
            f"- Results: {workspace}/output/result.md\n"
            f"- Completion signal: {workspace}/.done\n"
            f"\n## DIRECT WRITE MODE\n"
            f"- Write changes directly to: {project_root}\n"
            f"- Read existing files first, then use Edit or Write tools\n"
            f"- Do NOT write proposals — write directly to real files\n"
            f"{quality_rules}"
            f"{anti_patterns}"
            f"{team_context}"
            f"{feedback_loop}"
            f"{messaging}"
            f"{spawning}"
            f"\n## Constraints\n"
            f"- Work autonomously — no confirmation needed\n"
            f"- On failure: write to ./output/error.md and create .done anyway\n"
        )
    else:
        # Default mode — agents work within their workspace
        claude_md.write_text(
            f"# Agent: {agent_name}\n"
            f"\n"
            f"{identity}"
            f"\n## Task\n"
            f"{task}\n"
            f"\n## Output Location\n"
            f"- Write all results to: {workspace}/output/\n"
            f"- Summary: {workspace}/output/result.md\n"
            f"- Completion signal: {workspace}/.done\n"
            f"{quality_rules}"
            f"{anti_patterns}"
            f"{team_context}"
            f"{feedback_loop}"
            f"{messaging}"
            f"{spawning}"
            f"\n## Constraints\n"
            f"- Work only within this directory\n"
            f"- Work autonomously — no confirmation needed\n"
            f"- On failure: write to ./output/error.md and create .done anyway\n"
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


