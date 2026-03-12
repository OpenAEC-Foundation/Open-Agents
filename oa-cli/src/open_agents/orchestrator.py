"""Orchestrator — high-level orchestrator spawning (delegates to sub-modules).

This module re-exports symbols from tmux, spawner, and lifecycle so that
existing ``from .orchestrator import X`` imports keep working.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from .lifecycle import (  # noqa: F401  — re-exports
    attach_agent,
    capture_agent_output,
    check_agent,
    clean_finished,
    cleanup_idle_agents,
    kill_agent,
    touch_agent,
)
from .spawner import (  # noqa: F401  — re-exports
    MAX_DEPTH,
    CLAUDE_CMD,
    CLAUDE_MODEL_MAP,
    OLLAMA_CMD,
    spawn_agent,
    _build_claude_command,
    _build_ollama_command,
)
from .tmux import SESSION_NAME, session_exists, start_session  # noqa: F401  — re-exports
from .state import get_agent


def spawn_with_orchestrator(
    name: str,
    task: str,
    worker_model: str = "claude/sonnet",
    orchestrator_model: str = "claude/opus",
    max_workers: int = 5,
    max_depth: int = MAX_DEPTH,
    max_iterations: int = 3,
) -> "AgentRecord":  # noqa: F821 — forward ref
    """Spawn an orchestrator that delegates work to sub-agents (D-051).

    Creates an orchestrator agent with a specialized CLAUDE.md that instructs it
    to decompose the task, spawn workers, monitor them, and review their output.
    The orchestrator never does work itself.
    """
    if not session_exists():
        raise RuntimeError("No oa session. Run 'oa start' first.")

    orch_name = f"orch-{name}"
    existing = get_agent(orch_name)
    if existing and existing.status == "running":
        raise RuntimeError(f"Orchestrator '{orch_name}' is already running.")

    # Maak shared_results_dir aan voor de hele boom
    shared_results_dir = str(
        Path(tempfile.mkdtemp(prefix=f"oa-results-{orch_name}-")) / "results"
    )
    Path(shared_results_dir).mkdir(parents=True, exist_ok=True)

    # Build orchestrator workspace
    workspace = _create_orchestrator_workspace(
        orch_name, task, worker_model, max_workers,
        depth=0, max_depth=max_depth, shared_results_dir=shared_results_dir,
        max_iterations=max_iterations,
    )

    # Spawn the orchestrator agent
    return spawn_agent(
        name=orch_name,
        task=task,
        model=orchestrator_model,
        workspace=workspace,
        shared_results_dir=shared_results_dir,
    )


def _create_orchestrator_workspace(
    orch_name: str,
    task: str,
    worker_model: str,
    max_workers: int,
    depth: int = 0,
    max_depth: int = MAX_DEPTH,
    shared_results_dir: str | None = None,
    max_iterations: int = 3,
) -> Path:
    """Create a workspace with orchestrator-specific CLAUDE.md.

    Uitgebreid met:
    - Kennis van eigen diepte en maximale diepte
    - Instructies voor shared_results_dir rapportage
    - Instructies voor recursief spawnen van sub-orchestrators
    """
    workspace = Path(tempfile.mkdtemp(prefix=f"oa-orch-{orch_name}-"))
    (workspace / "output").mkdir()

    remaining_depth = max_depth - depth
    can_spawn_sub_orchs = remaining_depth > 1

    results_section = ""
    if shared_results_dir:
        results_section = (
            f"## RAPPORTAGE\n"
            f"Gedeelde resultatenmap: `{shared_results_dir}`\n"
            f"Na voltooiing: kopieer je `./output/result.md` naar "
            f"`{shared_results_dir}/{orch_name}.md`\n"
            f"Lees ook de resultaten van je workers via `{shared_results_dir}/<worker-naam>.md`\n\n"
        )

    sub_orch_section = ""
    if can_spawn_sub_orchs:
        sub_orch_section = (
            f"## RECURSIEF SPAWNEN (DIEPTE {depth}/{max_depth})\n"
            f"Je zit op diepte {depth}. Je mag nog {remaining_depth - 1} niveaus dieper gaan.\n"
            f"Als een subtaak te complex is voor een worker, spawn dan een sub-orchestrator:\n"
            f"```bash\n"
            f"oa orchestrate \"<complexe-subtaak>\" --name <subnaam> "
            f"--model {worker_model} --parent {orch_name} --max-depth {max_depth}\n"
            f"```\n"
            f"Sub-orchestrators krijgen automatisch `--parent {orch_name}` mee.\n\n"
        )
    else:
        sub_orch_section = (
            f"## DIEPTELIMIET BEREIKT (DIEPTE {depth}/{max_depth})\n"
            f"Je zit op maximale diepte. Je mag GEEN sub-orchestrators meer spawnen.\n"
            f"Gebruik alleen directe workers voor alle subtaken.\n\n"
        )

    quality_loop_section = (
        f"## KWALITEITSVERBETERING LOOP (max {max_iterations} rondes per worker)\n"
        f"Na het ophalen van worker output, evalueer de kwaliteit en stuur gerichte feedback.\n"
        f"Herhaal dit tot de kwaliteit voldoende is of het maximum bereikt is:\n"
        f"\n"
        f"```bash\n"
        f"export PATH=\"/home/freek/.local/bin:$PATH\"\n"
        f"for i in $(seq 1 {max_iterations}); do\n"
        f"    OUTPUT=$(oa collect <worker-naam> 2>/dev/null)\n"
        f"    # Beoordeel: is de output compleet? Zijn alle secties aanwezig?\n"
        f"    # Zijn de bevindingen diepgaand genoeg? Is de kwaliteit voldoende?\n"
        f"    # Als JA: break\n"
        f"    # Als NEE: stuur specifieke feedback\n"
        f"    oa send <worker-naam> \"Verbeter ronde $i: <specifiek verbeterpunt>\" --from {orch_name}\n"
        f"    # Wacht op bevestiging van de worker\n"
        f"    sleep 15\n"
        f"    REPLY=$(oa inbox {orch_name} --unread --mark-read 2>/dev/null)\n"
        f"    if echo \"$REPLY\" | grep -q 'Verbeterd'; then\n"
        f"        continue  # Worker heeft verbeterd, herhaal evaluatie\n"
        f"    fi\n"
        f"done\n"
        f"```\n"
        f"\n"
        f"**Evaluatiecriteria (pas aan op de taak):**\n"
        f"- Is de output compleet? Ontbreken er secties?\n"
        f"- Is de diepgang voldoende? Zijn claims onderbouwd?\n"
        f"- Is het formaat correct? Volgt het de verwachte structuur?\n"
        f"- Is de lengte adequaat? Niet te kort, niet te lang?\n"
        f"- Als iets ontbreekt: stuur SPECIFIEKE feedback, niet vaag\n\n"
    )

    claude_md = (
        f"# Orchestrator: {orch_name} (depth={depth})\n\n"
        f"## JE ROL\n"
        f"Je bent een ORCHESTRATOR op diepte {depth} van {max_depth}.\n"
        f"Je voert NOOIT zelf werk uit.\n"
        f"Je enige taken: analyseren, delegeren, monitoren, reviewen, en verbeteren.\n\n"
        f"## DE TAAK\n{task}\n\n"
        f"## REGELS (STRIKT)\n"
        f"1. Je SCHRIJFT GEEN CODE. Je WIJZIGT GEEN BESTANDEN buiten je workspace.\n"
        f"2. Je DELEGEERT alle werk naar workers via `oa run`.\n"
        f"3. Elke worker krijgt `--parent {orch_name}` zodat de hierarchie klopt.\n"
        f"4. Workers schrijven resultaat direct naar `./output/result.md` in hun workspace.\n"
        f"5. Je spawnt maximaal {max_workers} workers tegelijk per batch.\n"
        f"6. Na elke batch wacht je tot alle workers klaar zijn (`oa status`).\n"
        f"7. Je reviewt worker output via `oa collect <worker-naam>`.\n"
        f"8. Als output onvoldoende is: stuur feedback via `oa send` en herhaal (L-025).\n\n"
        f"{sub_orch_section}"
        f"{results_section}"
        f"{quality_loop_section}"
        f"## WORKER MODEL\n"
        f"Gebruik `--model {worker_model}` bij het spawnen van workers.\n\n"
        f"## STAPPEN\n"
        f"1. Analyseer de taak — lees relevante bronbestanden\n"
        f"2. Ontleed in subtaken — zorg dat geen twee workers hetzelfde bestand wijzigen\n"
        f"3. Spawn workers:\n"
        f'   ```bash\n'
        f'   export PATH="/home/freek/.local/bin:$PATH"\n'
        f'   oa run "<subtaak>" --name <naam> --model {worker_model} --parent {orch_name}\n'
        f'   ```\n'
        f"4. Monitor: `oa status`\n"
        f"5. Collect output: `oa collect <naam>`\n"
        f"6. **Kwaliteitscheck**: evalueer en stuur verbeterfeedback indien nodig (max {max_iterations}×)\n"
        f"7. Aggregeer definitieve resultaten van workers via shared results dir\n"
        f"8. Schrijf samenvatting naar ./output/result.md\n"
        f"9. Maak .done als je klaar bent\n\n"
        f"## GELEERDE LESSEN\n"
        f"- L-001: Blijf draaien tot alle workers klaar zijn\n"
        f"- L-002: ALLE workers krijgen --parent flag\n"
        f"- L-003: Twee workers mogen NOOIT hetzelfde bestand wijzigen\n"
        f"- L-004: Review output na elke batch\n"
        f"- L-010: Jij delegeert, jij doet zelf NIKS\n"
        f"- L-011: Controleer je diepte voordat je sub-orchestrators spawnt\n"
        f"- L-012: Schrijf altijd naar shared_results_dir na voltooiing\n"
        f"- L-025: Multi-turn kwaliteitsverbetering via oa send feedback — gebruik het!\n"
    )

    (workspace / "CLAUDE.md").write_text(claude_md)
    return workspace
