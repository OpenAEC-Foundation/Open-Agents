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

CONTEXT_PROFILES: dict[str, dict] = {
    "researcher":   {"skills": ["oa-prompting-5element", "oa-prompting-scope"], "extra_sections": ["## Sources\n- Use only verified sources\n- Cite every claim\n"]},
    "builder":      {"skills": ["oa-quality-gates"], "extra_sections": ["## Direct Write\n- Write to real files immediately\n- No drafts or proposals\n"]},
    "orchestrator": {"skills": ["oa-orchestration-patterns", "oa-orchestration-communication"], "extra_sections": ["## Orchestration\n- Decompose task into subtasks\n- Spawn workers via oa run --parent\n"]},
    "reviewer":     {"skills": ["oa-quality-gates", "oa-prompting-scope"], "extra_sections": ["## Review\n- Check correctness, completeness, format\n- Write verdict to output/review.md\n"]},
    "guardian":     {"skills": ["oa-quality-guardians"], "extra_sections": ["## Guardian\n- Update LESSONS.md, ROADMAP.md, DECISIONS.md\n- Be conservative — only add facts you are certain of\n"]},
}

TASK_TYPES: dict[str, dict] = {
    "researcher": {
        "role": "Je bent een RESEARCHER. Je verzamelt, verifieert en structureert informatie.",
        "input_contract": "- `input_path`: pad naar bronbestanden of URL-lijst\n- `scope`: wat moet onderzocht worden",
        "output_schema": {
            "required_sections": ["## Samenvatting", "## Bevindingen", "## Bronnen"],
            "output_file": "result.md",
        },
        "rules": [
            "Citeer ELKE claim met bron (URL, bestandspad, of regelnummer)",
            "Schrijf GEEN productiecode — alleen research output",
            "Bij onzekerheid: markeer met [ONZEKER] tag",
        ],
        "skills": ["oa-prompting-5element", "oa-prompting-scope"],
    },
    "builder": {
        "role": "Je bent een BUILDER. Je implementeert code, configuratie of documentatie.",
        "input_contract": "- `input_path`: pad naar te wijzigen bestanden\n- `spec`: wat moet gebouwd worden",
        "output_schema": {
            "required_sections": ["## Wijzigingen", "## Bestanden"],
            "output_file": "result.md",
        },
        "rules": [
            "Lees ALTIJD bestaande code vóór je schrijft",
            "Schrijf direct naar productie-bestanden (geen proposals/)",
            "Geen backwards-compatibility hacks of ongebruikte code",
            "Elke wijziging moet in ## Bestanden staan met absoluut pad",
        ],
        "skills": ["oa-quality-gates"],
    },
    "reviewer": {
        "role": "Je bent een REVIEWER. Je beoordeelt code/output op correctheid en kwaliteit. NOOIT schrijven naar productie-bestanden.",
        "input_contract": "- `input_path`: pad naar te reviewen bestanden of output\n- `criteria`: waar moet op gelet worden",
        "output_schema": {
            "required_sections": ["## Verdict", "## Issues", "## Suggesties"],
            "output_file": "result.md",
        },
        "rules": [
            "NOOIT schrijven naar bronbestanden — alleen naar ./output/",
            "Elk issue: bestandsnaam + regelnummer + ernst (CRITICAL/WARNING/INFO)",
            "Verdict is APPROVE, REJECT, of WARN — altijd op eerste regel van ## Verdict",
        ],
        "skills": ["oa-quality-gates", "oa-prompting-scope"],
    },
    "transformer": {
        "role": "Je bent een TRANSFORMER. Je converteert input van formaat A naar formaat B.",
        "input_contract": "- `input_path`: pad naar bronbestand(en)\n- `target_format`: gewenst outputformaat",
        "output_schema": {
            "required_sections": ["## Conversie", "## Resultaat"],
            "output_file": "result.md",
        },
        "rules": [
            "Input NOOIT wijzigen — alleen lezen",
            "Output schrijven naar ./output/ (geconverteerde bestanden + result.md)",
            "Bij data-verlies: documenteer wat verloren gaat in ## Conversie",
        ],
        "skills": [],
    },
    "orchestrator": {
        "role": "Je bent een ORCHESTRATOR. Je decomposeert taken en coördineert sub-agents via oa run.",
        "input_contract": "- `task`: hoofd-opdracht om te decomposeren\n- `constraints`: tijds-/kwaliteitseisen",
        "output_schema": {
            "required_sections": ["## Plan", "## Agents", "## Resultaat"],
            "output_file": "result.md",
        },
        "rules": [
            "Spawn sub-agents via `oa run` — NOOIT zelf multi-file werk doen",
            "Elke sub-agent krijgt --parent en --model",
            "Wacht op alle agents en valideer hun output vóór je result.md schrijft",
            "Documenteer elke gespawnde agent in ## Agents (naam, taak, status)",
        ],
        "skills": ["oa-orchestration-patterns", "oa-orchestration-communication"],
    },
    "validator": {
        "role": "Je bent een VALIDATOR. Je controleert of output voldoet aan een contract/schema.",
        "input_contract": "- `input_path`: pad naar te valideren output\n- `contract`: verwacht schema of regels",
        "output_schema": {
            "required_sections": ["## Checks", "## Verdict"],
            "output_file": "result.md",
        },
        "rules": [
            "NOOIT de input wijzigen",
            "Elke check: naam, verwacht, gevonden, PASS/FAIL",
            "Verdict: PASS (alle checks OK) of FAIL (minstens 1 FAIL) — op eerste regel van ## Verdict",
        ],
        "skills": [],
    },
}

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


def _feedback_improvement_instructions(agent_name: str, parent_name: str, max_iterations: int = 3) -> str:
    """Generate inbox polling instructions so agents stay alive for quality improvement.

    After completing their primary task, agents poll their inbox for feedback
    from the orchestrator and update their output accordingly. This enables
    multi-turn quality improvement loops (L-025).
    """
    return (
        f"\n"
        f"## Kwaliteitsverbetering Loop (na taakvoltooiing)\n"
        f"Na het schrijven van je `output/result.md`, doe NIET direct `.done` aanmaken.\n"
        f"Poll eerst je inbox op verbeterfeedback van je spawner, max {max_iterations} rondes:\n"
        f"\n"
        f"```bash\n"
        f"export PATH=\"{_AGENT_PATH}:$PATH\"\n"
        f"for i in $(seq 1 {max_iterations}); do\n"
        f"    sleep 8\n"
        f"    MSGS=$(oa inbox {agent_name} --unread --mark-read 2>/dev/null)\n"
        f"    if [ -z \"$MSGS\" ]; then\n"
        f"        break  # Geen feedback — klaar\n"
        f"    fi\n"
        f"    # Verwerk feedback: update output/result.md op basis van MSGS\n"
        f"    # Rapporteer terug zodra update klaar is:\n"
        f"    oa send {parent_name} \"\\u2705 Verbeterd (ronde $i): <samenvatting wijzigingen>\" --from {agent_name}\n"
        f"done\n"
        f"```\n"
        f"\n"
        f"**Regels:**\n"
        f"- Verwerk ALLE feedback punten — sla niets over\n"
        f"- Update `output/result.md` in-place met de verbeteringen\n"
        f"- Rapporteer altijd terug met wat je verbeterd hebt\n"
        f"- Na max {max_iterations} rondes of geen berichten meer: maak `.done` aan\n"
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


def _task_type_section(task_type: str) -> str:
    """Generate the task-type-specific CLAUDE.md section."""
    tt = TASK_TYPES.get(task_type)
    if not tt:
        return ""

    rules_list = "\n".join(f"- {r}" for r in tt["rules"])
    required = ", ".join(f"`{s}`" for s in tt["output_schema"]["required_sections"])

    return (
        f"\n## Role\n{tt['role']}\n"
        f"\n## Input Contract\n{tt['input_contract']}\n"
        f"\n## Output Contract\n"
        f"- Output file: `./output/{tt['output_schema']['output_file']}`\n"
        f"- Required sections: {required}\n"
        f"- Missing sections = contract violation (will be flagged)\n"
        f"\n## Rules\n{rules_list}\n"
    )


def create_workspace(agent_name: str, task: str, project_root: str | Path | None = None, agent_type: str = "", can_spawn: bool = False, honesty: bool = False, team: str = "", model: str = "", parent_name: str = "meta", skills: list[str] | None = None, skill_refs: list[str] | None = None, profile: str = "", task_type: str = "", max_iterations: int = 3) -> Path:
    """Create a temporary workspace directory with a CLAUDE.md file.

    If project_root is provided, agents are instructed to write directly
    to the project instead of using proposals.

    Returns the workspace path.
    """
    workspace = Path(tempfile.mkdtemp(prefix=WORKSPACE_PREFIX))

    # Apply task_type: merge task-type skills (task_type wins over profile for skills)
    if task_type and task_type in TASK_TYPES:
        tt_skills = TASK_TYPES[task_type].get("skills", [])
        existing_skills = list(skills) if skills else []
        for s in tt_skills:
            if s not in existing_skills:
                existing_skills.append(s)
        skills = existing_skills

    # Apply context profile: merge profile skills and collect extra sections
    profile_extra_sections: list[str] = []
    if profile and profile in CONTEXT_PROFILES:
        prof = CONTEXT_PROFILES[profile]
        prof_skills: list[str] = prof.get("skills", [])
        if prof_skills:
            existing_skills = list(skills) if skills else []
            for s in prof_skills:
                if s not in existing_skills:
                    existing_skills.append(s)
            skills = existing_skills
        profile_extra_sections = prof.get("extra_sections", [])

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
    task_type_section = _task_type_section(task_type) if task_type else ""
    quality_rules = _quality_rules_section()
    anti_patterns = _anti_patterns_section()
    team_context = _team_context_section(agent_name, team)
    feedback_loop = _feedback_loop_instructions(agent_name, parent_name)
    feedback_improvement = _feedback_improvement_instructions(agent_name, parent_name, max_iterations)
    messaging = _messaging_instructions(agent_name)
    spawning = _spawning_instructions(agent_name, str(project_root) if project_root else None)

    # Write task.txt — clean task-only prompt for Ollama agents (L-089)
    # Ollama models receive this instead of the full CLAUDE.md to avoid context confusion.
    task_txt = workspace / "task.txt"
    task_txt.write_text(task + "\n")

    if project_root:
        # Direct write mode — agents write to the real project
        claude_md.write_text(
            f"# Agent: {agent_name}\n"
            f"\n"
            f"{identity}"
            f"{task_type_section}"
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
            f"{feedback_improvement}"
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
            f"{task_type_section}"
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
            f"{feedback_improvement}"
            f"{messaging}"
            f"{spawning}"
            f"\n## Constraints\n"
            f"- Work only within this directory\n"
            f"- Work autonomously — no confirmation needed\n"
            f"- On failure: write to ./output/error.md and create .done anyway\n"
        )

    # Append profile extra sections to CLAUDE.md
    if profile_extra_sections:
        existing = claude_md.read_text()
        claude_md.write_text(existing + "\n" + "\n".join(profile_extra_sections))

    # Resolve skills: agent_type skills + expliciete skills + skill_refs
    combined_skill_names: list[str] = []
    if skills:
        combined_skill_names.extend(skills)
    if skill_refs:
        combined_skill_names.extend(skill_refs)

    if agent_type or combined_skill_names:
        from .skill_loader import load_skills_for_type
        skill_sections: list[str] = []

        # Agent-type skills: inline injection (no folder copy, backward-compat)
        if agent_type:
            type_content = load_skills_for_type(agent_type)
            if type_content:
                skill_sections.append(type_content)

        # Explicit skills: copy full folder to workspace, then reference or inline
        if combined_skill_names:
            from .skill_registry import resolve_skills, load_skill_content
            skills_dest_base = workspace / ".claude" / "skills"
            skills_dest_base.mkdir(parents=True, exist_ok=True)
            matches = resolve_skills(
                combined_skill_names,
                project_root=Path(project_root) if project_root else None,
            )
            seen: set[str] = set()
            for match in matches:
                if match.name in seen:
                    continue
                seen.add(match.name)
                skill_dest = skills_dest_base / match.name
                if hasattr(match, "folder") and match.folder != Path() and match.folder.exists():
                    shutil.copytree(match.folder, skill_dest, dirs_exist_ok=True)
                    skill_md_content = (skill_dest / "SKILL.md").read_text()
                    body_lines = [l for l in skill_md_content.split("\n") if not l.startswith("---")]
                    if len(body_lines) > 100:
                        skill_section = f"## Skill: {match.name}\nSee .claude/skills/{match.name}/SKILL.md\n"
                    else:
                        body_content = load_skill_content(match)
                        skill_section = f"## Skill: {match.name}\n{body_content}\n"
                else:
                    # Fallback: inline content (old SkillMatch without folder)
                    content = load_skill_content(match)
                    skill_section = f"## Skill: {match.name}\n{content}\n"
                if skill_section.strip():
                    skill_sections.append(skill_section)

        if skill_sections:
            existing = claude_md.read_text()
            claude_md.write_text(existing + "\n\n---\n\n# Skills\n\n" + "\n\n---\n\n".join(skill_sections))

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
    # Also sync task.txt — clean task-only prompt used by Ollama agents (L-089)
    task_txt = local_ws / "task.txt"
    if task_txt.exists():
        subprocess.run(["scp", "-o", "BatchMode=yes", str(task_txt), f"{host}:{remote_ws}/task.txt"], check=True)
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




def list_proposals(workspace: Path) -> list[Path]:
    """List all .proposal.md files in workspace/output/proposals/, sorted."""
    proposals_dir = Path(workspace) / "output" / "proposals"
    if not proposals_dir.exists():
        return []
    return sorted(proposals_dir.glob("*.proposal.md"))
