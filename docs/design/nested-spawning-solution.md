# Nested Agent Spawning — Design Document

## Issue #9/#11: Sub-agents onzichtbaar in `oa status`

---

## Diagnose

### Hoe agents nu worden gespawnd

1. `cli.py:run()` roept `spawner.py:spawn_agent()` aan
2. `spawn_agent()` maakt een workspace via `workspace.py:create_workspace()` met een `CLAUDE.md`
3. Er wordt een tmux window aangemaakt in de `oa` session
4. Een shell-script `.oa-run.sh` wordt geschreven met het commando:
   ```bash
   cd <workspace> && unset CLAUDECODE && claude [--model X] --dangerously-skip-permissions -p "Lees CLAUDE.md..."
   ```
5. Het script wordt via `tmux send-keys` uitgevoerd
6. De agent wordt geregistreerd in `~/.oa/agents.json`

### Waarom het kapot is

Er zijn **drie oorzaken** waarom een oa-agent die `oa run` probeert te gebruiken, faalt:

**Oorzaak 1: PATH ontbreekt**
De `.oa-run.sh` script draait in een kale bash-shell binnen tmux. `~/.local/bin` (waar `oa` geïnstalleerd is) zit mogelijk niet in de PATH van die shell, omdat tmux niet altijd een login-shell start die `~/.profile` of `~/.bashrc` sourced.

**Oorzaak 2: Geen instructie in CLAUDE.md**
De gegenereerde `CLAUDE.md` (in `workspace.py`) bevat **geen enkele vermelding** van `oa run`, `oa status`, of sub-agent spawning. Claude Code's systeem-prompt moedigt het gebruik van de ingebouwde `Agent` tool aan voor complexe taken. Zonder expliciete instructie kiest Claude Code altijd voor zijn eigen Agent tool — die spawnt een in-process subagent die **niet** geregistreerd wordt in `~/.oa/agents.json`.

**Oorzaak 3: Geen `--parent` propagatie**
Zelfs als een agent `oa run` succesvol zou uitvoeren, weet hij niet zijn eigen naam om als `--parent` mee te geven. De CLAUDE.md bevat wel de agent-naam (voor messaging), maar er is geen expliciete instructie om die als `--parent` door te geven bij spawning.

---

## Oplossing

### Niveau 1: PATH fix (makkelijkst, ~5 minuten)

**Probleem**: `oa` binary in `~/.local/bin` niet in PATH binnen tmux window.

**Oplossing**: Voeg PATH-export toe aan het gegenereerde `.oa-run.sh` script.

**Bestand**: `oa-cli/src/open_agents/spawner.py`

```python
# In _build_claude_command(), wijzig:
def _build_claude_command(workspace: Path, name: str, claude_model: str | None = None) -> str:
    claude_prompt = "Lees CLAUDE.md en voer de taak uit. Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."
    model_flag = f" --model {claude_model}" if claude_model else ""
    return (
        f"export PATH=\"$HOME/.local/bin:$PATH\" && "  # <-- NIEUW
        f"cd {workspace} && "
        f"unset CLAUDECODE && "
        f"{CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {shlex.quote(claude_prompt)}; "
        f"touch .done; "
        f"echo '--- Agent {shlex.quote(name)} finished ---'"
    )
```

Doe hetzelfde voor `_build_ollama_command()`.

**Impact**: Minimaal. Geen breaking changes.

---

### Niveau 2: CLAUDE.md instructie (kritisch, ~15 minuten)

**Probleem**: Claude Code kiest de ingebouwde Agent tool omdat CLAUDE.md er niets over zegt.

**Oplossing**: Voeg een `## Sub-Agent Spawning` sectie toe aan de gegenereerde CLAUDE.md die:
1. Expliciet instrueert om `oa run` via de Bash tool te gebruiken
2. Expliciet verbiedt om de ingebouwde Agent tool te gebruiken voor sub-agents
3. De agent-naam als `--parent` meegeeft
4. Het `--direct` flag propageert als van toepassing

**Bestand**: `oa-cli/src/open_agents/workspace.py`

```python
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
```

Dan in `create_workspace()`, voeg `_spawning_instructions()` toe aan de CLAUDE.md:

```python
def create_workspace(agent_name: str, task: str, project_root: str | Path | None = None) -> Path:
    workspace = Path(tempfile.mkdtemp(prefix=WORKSPACE_PREFIX))
    (workspace / "output").mkdir()

    claude_md = workspace / "CLAUDE.md"
    messaging = _messaging_instructions(agent_name)
    spawning = _spawning_instructions(agent_name, str(project_root) if project_root else None)

    if project_root:
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
```

**Impact**: Matig. Alle nieuwe agents krijgen automatisch de juiste instructies.

---

### Niveau 3: Spawn-via-bridge HTTP API (robuust, ~1 uur)

**Probleem**: Shell-commando's kunnen nog steeds falen door environment-issues. Een HTTP API is betrouwbaarder.

**Oplossing**: Voeg een `/api/spawn` endpoint toe aan de bestaande bridge server (`bridge.py`).

**Bestand**: `oa-cli/src/open_agents/bridge.py`

Voeg toe aan de bestaande Flask/FastAPI routes:

```python
@app.post("/api/spawn")
async def api_spawn(request: SpawnRequest):
    """Spawn a sub-agent via HTTP API.

    Body:
    {
        "task": "...",
        "name": "optional-name",
        "model": "claude/sonnet",
        "parent": "parent-agent-name",
        "direct": true
    }
    """
    from .spawner import spawn_agent
    from .utils import generate_agent_name

    name = request.name or generate_agent_name(request.task)
    project_root = None
    if request.direct and request.parent:
        parent_rec = get_agent(request.parent)
        if parent_rec:
            project_root = parent_rec.project_root

    rec = spawn_agent(
        name=name,
        task=request.task,
        model=request.model,
        parent=request.parent,
        project_root=project_root,
    )

    return {"name": rec.name, "status": "running", "workspace": rec.workspace}
```

Dan in de CLAUDE.md spawning-instructie, voeg een alternatief toe:

```markdown
**Alternatief (als oa niet in PATH staat):**
```bash
curl -s -X POST http://localhost:5174/api/spawn \
  -H "Content-Type: application/json" \
  -d '{"task": "...", "name": "sub-1", "model": "claude/sonnet", "parent": "AGENT_NAME"}'
```

**Impact**: Groot. Vereist dat de bridge server draait (`oa web`). Meest robuust maar ook meest complex.

---

## Aanbeveling

**Implementeer Niveau 1 + Niveau 2 samen.** Dit lost 99% van de gevallen op:

| Niveau | Nodig? | Reden |
|--------|--------|-------|
| 1 (PATH fix) | **JA** | Voorkomt "command not found" — 2 regels code |
| 2 (CLAUDE.md) | **JA** | Kernoplossing — zonder dit kiest Claude Code altijd Agent tool |
| 3 (HTTP bridge) | Later | Pas relevant als shell-based spawning onbetrouwbaar blijkt |

### Implementatievolgorde

1. **`spawner.py`** — voeg `export PATH="$HOME/.local/bin:$PATH"` toe aan beide `_build_*_command()` functies
2. **`workspace.py`** — voeg `_spawning_instructions()` functie toe en integreer in `create_workspace()`
3. **Test** — spawn een agent met een taak die sub-agents vereist, verifieer met `oa status`

---

## Bestanden die aangepast moeten worden

| Bestand | Wijziging |
|---------|-----------|
| `oa-cli/src/open_agents/spawner.py` | PATH export in `_build_claude_command()` en `_build_ollama_command()` |
| `oa-cli/src/open_agents/workspace.py` | Nieuwe `_spawning_instructions()` functie + integratie in `create_workspace()` |
| *(optioneel)* `oa-cli/src/open_agents/bridge.py` | `/api/spawn` endpoint voor Niveau 3 |

---

## Risico's en mitigatie

| Risico | Mitigatie |
|--------|-----------|
| Claude Code negeert CLAUDE.md instructie | Gebruik STERKE bewoording ("GEBRUIK NOOIT") + herhaal in Constraints sectie |
| Infinite spawning loops | Al afgedekt door `validate_spawn()` in state.py (depth check, task-hash dedup, max_children) |
| PATH fix werkt niet op alle systemen | Gebruik absoluut pad als fallback: `/home/$USER/.local/bin/oa` |
| Agent vergeet `--parent` flag | Hardcode in CLAUDE.md met de concrete agent-naam |
