# Core Agents Architectuur — Design Proposal

> **Versie**: 1.0
> **Datum**: 2026-03-02
> **Status**: Proposal — ter review
> **Beslissing**: D-052 (voorgesteld)

---

## 1. Probleemstelling

### Huidige situatie
Het Open-Agents project heeft 9+ core documenten (ROADMAP, DECISIONS, LESSONS, REQUIREMENTS, README, PRINCIPLES, MASTERPLAN, HANDOFF, AGENTS) die handmatig bijgehouden moeten worden. Het "Document Update Protocol" in CLAUDE.md beschrijft wanneer welk document geüpdatet moet worden, maar dit wordt in de praktijk vergeten of inconsistent uitgevoerd.

### Bewezen problemen (uit LESSONS.md)
- **L-003**: Twee agents mogen NOOIT naar hetzelfde bestand schrijven — maar core documenten worden door meerdere taken beïnvloed
- **L-004**: Orchestrator doet QA na elke batch — maar core document updates worden niet meegenomen in QA
- **L-005**: Proposal mode als DEFAULT — maar er is geen mechanisme dat automatisch proposals genereert voor core document updates
- **L-010**: Claude Code = doorgeefluik — de orchestrator moet ook core document updates delegeren, niet zelf doen

### Kernprobleem
**Kennis verdampt.** Agents produceren waardevolle informatie (lessen, beslissingen, voortgang) die vastgelegd zou moeten worden in core documenten, maar er is geen systematisch mechanisme om dit te doen. Het Document Update Protocol is een handmatige checklist die afhankelijk is van menselijke discipline.

---

## 2. Oplossing: Core Agents (Guardian Agents)

### Concept
Elk core document krijgt een eigen **guardian agent** — een lichtgewicht agent die na elke agent-batch draait en checkt of er relevante informatie is geproduceerd die vastgelegd moet worden. Guardians schrijven **proposals** (nooit directe wijzigingen), die de eigenaar reviewt en goedkeurt.

### Kernprincipes
1. **Post-batch, niet always-on** — Guardians draaien na afloop van een batch, niet continu
2. **Read-only input** — Guardians lezen worker output, schrijven alleen proposals
3. **Proposal mode** — Guardians wijzigen NOOIT direct core documenten
4. **Selectief** — Guardians bepalen zelf of er iets relevants is; "geen update nodig" is een valide uitkomst
5. **Lichtgewicht** — Guardians gebruiken het snelste model (sonnet), tenzij complexe analyse nodig is
6. **Onafhankelijk** — Elke guardian werkt op precies één document, geen overlap

---

## 3. Welke Core Agents zijn er?

### 3.1 Guardian Agents (7 stuks)

| # | Guardian | Document | Trigger | Model | Prioriteit |
|---|---------|----------|---------|-------|-----------|
| G-1 | **LessonsGuardian** | `LESSONS.md` | Na elke batch | sonnet | P0 — Kritiek |
| G-2 | **RoadmapGuardian** | `ROADMAP.md` | Na elke batch | sonnet | P0 — Kritiek |
| G-3 | **DecisionsGuardian** | `DECISIONS.md` | Na elke batch | sonnet | P0 — Kritiek |
| G-4 | **RequirementsGuardian** | `REQUIREMENTS.md` | Na feature-batch | sonnet | P1 — Belangrijk |
| G-5 | **ReadmeGuardian** | `README.md` | Na feature-batch | sonnet | P2 — Nice-to-have |
| G-6 | **HandoffGuardian** | `docs/HANDOFF-*.md` | Bij sessie-einde | sonnet | P0 — Kritiek |
| G-7 | **AgentsGuardian** | `AGENTS.md` | Na agent-library wijzigingen | sonnet | P2 — Nice-to-have |

### 3.2 Waarom NIET voor PRINCIPLES.md en MASTERPLAN.md?

- **PRINCIPLES.md** — Verandert zelden en alleen na strategische beslissingen. Een guardian zou bijna altijd "geen update" concluderen. Beter: handmatig, met beslissingsreferentie in DECISIONS.md.
- **MASTERPLAN.md** — Te complex en te groot (80KB+) voor automatische updates. Sprintplanning is een creatief proces dat menselijke sturing vereist. De RoadmapGuardian vangt de statustracking op.

### 3.3 Per Guardian: Wat doet die?

#### G-1: LessonsGuardian
**Doel**: Nieuwe lessen extraheren uit agent output en voorstellen als toevoeging aan LESSONS.md.

**Input lezen**:
- Alle `output/result.md` bestanden van afgeronde workers
- Alle `output/error.md` bestanden (als die bestaan)
- Het huidige `LESSONS.md` (om duplicaten te voorkomen)

**Analyse**:
- Zijn er fouten opgetreden die we willen voorkomen?
- Zijn er workarounds gevonden die herbruikbaar zijn?
- Zijn er patronen ontdekt die documentatie verdienen?
- Is er CONFLICT met bestaande lessen?

**Output**: Proposal met nieuwe lessen in L-NNN formaat, gegroepeerd per categorie.

**Voorbeeld prompt-fragment**:
```
Analyseer de output van deze worker agents. Extraheer ALLEEN concrete,
herbruikbare lessen. Vergelijk met bestaande lessen om duplicaten te
voorkomen. Schrijf een proposal als er nieuwe lessen zijn.
Formaat: L-NNN | **Titel** | Context
```

#### G-2: RoadmapGuardian
**Doel**: Voortgang detecteren en voorstellen als status-updates in ROADMAP.md.

**Input lezen**:
- Alle `output/result.md` van afgeronde workers
- Proposals die geschreven zijn (welke bestanden worden gewijzigd?)
- Het huidige `ROADMAP.md`

**Analyse**:
- Welke taken/features zijn afgerond?
- Welke checkboxes moeten van `[ ]` naar `[x]`?
- Moeten percentages bijgesteld worden?
- Zijn er nieuwe items die op de roadmap moeten?

**Output**: Proposal met specifieke regels die gewijzigd moeten worden (oude regel → nieuwe regel).

#### G-3: DecisionsGuardian
**Doel**: Architectuurbeslissingen herkennen in agent output en documenteren.

**Input lezen**:
- Alle `output/result.md` en `output/proposals/*.proposal.md`
- Het huidige `DECISIONS.md`

**Analyse**:
- Zijn er impliciete of expliciete architectuurbeslissingen genomen?
- Is een technologie gekozen boven een alternatief?
- Is er een design pattern toegepast met rationale?
- Conflicteert dit met bestaande beslissingen?

**Output**: Proposal met nieuwe D-NNN entries in het juiste formaat.

#### G-4: RequirementsGuardian
**Doel**: Requirement-status synchroniseren met werkelijke implementatie.

**Input lezen**:
- Worker output (welke features zijn gebouwd/gewijzigd?)
- Het huidige `REQUIREMENTS.md`

**Analyse**:
- Zijn er FR-XX requirements (deels) gerealiseerd?
- Moeten percentages omhoog?
- Moeten implementatiedetails bijgewerkt worden?
- Zijn er nieuwe requirements ontdekt?

**Output**: Proposal met geüpdatete FR-XX entries.

#### G-5: ReadmeGuardian
**Doel**: README.md actueel houden met nieuwe features en commands.

**Input lezen**:
- Worker output (nieuwe CLI commands? Nieuwe features?)
- Het huidige `README.md`

**Analyse**:
- Zijn er nieuwe CLI commands toegevoegd?
- Is de installatie veranderd?
- Moet de architectuursectie bijgewerkt worden?
- Zijn er breaking changes die gedocumenteerd moeten worden?

**Output**: Proposal met bijgewerkte README secties.

#### G-6: HandoffGuardian
**Doel**: Automatisch een sessie-handoff document genereren.

**Trigger**: Wordt alleen aangeroepen bij sessie-einde (via `oa stop` of expliciet).

**Input lezen**:
- State van alle agents in deze sessie (`~/.oa/agents.json`)
- Alle `output/result.md` bestanden
- Alle proposals die geschreven zijn
- Git status (ongecommitte wijzigingen)
- Huidige `ROADMAP.md` status

**Output**: Nieuw `docs/HANDOFF-<datum>.md` document met:
- Wat er gedaan is
- Welke proposals pending zijn
- Lessen van deze sessie
- Prioriteiten voor volgende sessie

#### G-7: AgentsGuardian
**Doel**: Agent library (AGENTS.md) bijwerken als er nieuwe agents gedefinieerd zijn.

**Input lezen**:
- Worker output die agent-definities bevat
- `agents/presets/` directory voor nieuwe JSON configs
- Het huidige `AGENTS.md`

**Output**: Proposal met nieuwe of gewijzigde agent entries.

---

## 4. Hoe werken Core Agents?

### 4.1 Lifecycle Flow

```
┌─────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                       │
│                                                      │
│  1. Analyseer taak                                  │
│  2. Spawn worker batch                              │
│  3. Wacht tot batch klaar                           │
│  4. ─── TRIGGER: run_guardians() ───                │
│  │                                                   │
│  │  ┌──────────────────────────────────────┐        │
│  │  │         GUARDIAN PHASE                │        │
│  │  │                                       │        │
│  │  │  a. Collect worker outputs            │        │
│  │  │  b. Spawn guardian agents (parallel)  │        │
│  │  │  c. Wacht tot guardians klaar         │        │
│  │  │  d. Report guardian proposals         │        │
│  │  └──────────────────────────────────────┘        │
│  │                                                   │
│  5. Review guardian proposals                        │
│  6. Volgende batch OF klaar                         │
└─────────────────────────────────────────────────────┘
```

### 4.2 Guardian Workspace Structuur

Elke guardian krijgt een speciale workspace:

```
/tmp/oa-guardian-<document>-<batch-id>/
├── CLAUDE.md              # Guardian-specifieke instructies
├── context/
│   ├── current-document.md  # Huidige versie van het core document
│   └── worker-outputs/      # Verzamelde output van workers
│       ├── worker-1.md
│       ├── worker-2.md
│       └── worker-3.md
├── output/
│   ├── result.md            # Guardian conclusie (update nodig? ja/nee)
│   └── proposals/
│       └── <document>.proposal.md  # Voorgestelde wijzigingen
└── .done
```

### 4.3 Guardian CLAUDE.md Template

```markdown
# Guardian: {guardian_name}

## JE ROL
Je bent een GUARDIAN AGENT voor het document `{document_path}`.
Je taak: analyseer de output van worker agents en bepaal of
`{document_name}` bijgewerkt moet worden.

## HUIDIGE VERSIE
Het huidige document staat in `./context/current-document.md`.
Lees dit EERST zodat je weet wat er al staat.

## WORKER OUTPUT
De output van {n} workers staat in `./context/worker-outputs/`.
Lees ALLE bestanden.

## ANALYSE-CRITERIA
{guardian_specific_criteria}

## BESLISSING
- Als er GEEN relevante updates zijn: schrijf "Geen update nodig"
  in ./output/result.md en maak .done aan.
- Als er WEL updates zijn: schrijf een proposal naar
  ./output/proposals/{document_name}.proposal.md

## PROPOSAL FORMAT
```
Bestand: {absolute_path_to_document}
Waarom: {korte rationale}

```markdown
{volledige nieuwe inhoud van het document}
```
```

## CONSTRAINTS
- Wijzig NOOIT het originele document
- Wees CONSERVATIEF — alleen voorstellen als het echt waarde toevoegt
- Behoud het bestaande formaat en nummering
- Voeg toe, wijzig niet tenzij feitelijk onjuist
```

### 4.4 Selectieve Activering

Niet elke guardian hoeft na elke batch te draaien. De orchestrator bepaalt welke guardians relevant zijn:

```python
GUARDIAN_TRIGGERS = {
    "lessons":      lambda batch: True,  # Altijd — lessen uit elke batch
    "roadmap":      lambda batch: True,  # Altijd — voortgang bijhouden
    "decisions":    lambda batch: any(has_architecture_output(w) for w in batch),
    "requirements": lambda batch: any(has_feature_output(w) for w in batch),
    "readme":       lambda batch: any(has_feature_output(w) for w in batch),
    "handoff":      lambda batch: False,  # Alleen bij sessie-einde
    "agents":       lambda batch: any(has_agent_definition(w) for w in batch),
}
```

**Heuristieken voor selectieve activering** (simpele keyword-scan op worker output):
- `has_architecture_output`: zoekt naar "beslissing", "decision", "architectuur", "gekozen voor", "pattern"
- `has_feature_output`: zoekt naar "feature", "command", "endpoint", "component", "functionaliteit"
- `has_agent_definition`: zoekt naar "agent", "preset", "definitie", "categorie"

### 4.5 Kosten & Performance

| Aspect | Waarde | Toelichting |
|--------|--------|-------------|
| **Model** | claude/sonnet | Snel genoeg voor document-analyse |
| **Tokens per guardian** | ~2K input + ~1K output | Document + worker outputs + proposal |
| **Guardians per batch** | 2-3 (gemiddeld) | Selectieve activering filtert irrelevante guardians |
| **Tijd per guardian** | ~30-60 sec | Parallel, dus totale guardian-fase ~60 sec |
| **Kosten per batch** | ~$0.02-0.05 | Verwaarloosbaar t.o.v. worker-kosten |

---

## 5. Hoe past dit in oa-cli?

### 5.1 Nieuwe module: `core_agents.py`

```python
# oa-cli/src/open_agents/core_agents.py

"""
Core Agents (Guardian Agents) — Persistente agents die core documenten
actueel houden na elke agent-batch.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# Guardian definities
@dataclass
class GuardianConfig:
    name: str                    # "lessons", "roadmap", etc.
    document_path: str           # Absoluut pad naar het core document
    criteria: str                # Analyse-criteria voor de CLAUDE.md
    trigger_keywords: list[str]  # Keywords om te bepalen of guardian moet draaien
    always_run: bool = False     # True = draai altijd (lessons, roadmap)
    model: str = "claude/sonnet" # Model voor guardian

# Pre-defined guardian configs
GUARDIANS: dict[str, GuardianConfig] = {
    "lessons": GuardianConfig(
        name="lessons",
        document_path="LESSONS.md",
        criteria="""Zoek naar:
- Fouten die opgetreden zijn en hun oplossingen
- Workarounds die gevonden zijn
- Patronen die documentatie verdienen
- Conflicten met bestaande lessen
Formaat: L-NNN | **Titel** | Context""",
        trigger_keywords=[],
        always_run=True,
    ),
    "roadmap": GuardianConfig(
        name="roadmap",
        document_path="ROADMAP.md",
        criteria="""Zoek naar:
- Afgeronde taken/features → checkboxes [x]
- Voortgang die percentages beïnvloedt
- Nieuwe items voor de roadmap
Geef specifieke regelwijzigingen (oud → nieuw).""",
        trigger_keywords=[],
        always_run=True,
    ),
    "decisions": GuardianConfig(
        name="decisions",
        document_path="DECISIONS.md",
        criteria="""Zoek naar:
- Expliciete of impliciete architectuurbeslissingen
- Technologiekeuzes met rationale
- Design patterns die toegepast zijn
Formaat: D-NNN met context, opties, en rationale.""",
        trigger_keywords=["beslissing", "decision", "architectuur",
                         "gekozen", "pattern", "design"],
    ),
    "requirements": GuardianConfig(
        name="requirements",
        document_path="REQUIREMENTS.md",
        criteria="""Zoek naar:
- FR-XX requirements die (deels) gerealiseerd zijn
- Percentages die omhoog moeten
- Implementatiedetails die bijgewerkt moeten worden
- Nieuwe requirements""",
        trigger_keywords=["feature", "requirement", "functionaliteit",
                         "endpoint", "component"],
    ),
    "readme": GuardianConfig(
        name="readme",
        document_path="README.md",
        criteria="""Zoek naar:
- Nieuwe CLI commands
- Gewijzigde installatie-instructies
- Nieuwe features die gedocumenteerd moeten worden
- Breaking changes""",
        trigger_keywords=["command", "cli", "install", "feature",
                         "breaking", "api"],
    ),
    "handoff": GuardianConfig(
        name="handoff",
        document_path="docs/HANDOFF-{date}.md",
        criteria="""Genereer een compleet handoff document met:
- Samenvatting van gedaan werk
- Pending proposals
- Lessen van deze sessie
- Prioriteiten voor volgende sessie
- Git status""",
        trigger_keywords=[],
        always_run=False,  # Alleen bij sessie-einde
    ),
    "agents": GuardianConfig(
        name="agents",
        document_path="AGENTS.md",
        criteria="""Zoek naar:
- Nieuwe agent definities
- Gewijzigde agent configuraties
- Nieuwe categorieën of taxonomie-wijzigingen""",
        trigger_keywords=["agent", "preset", "definitie", "categorie",
                         "taxonomy"],
    ),
}


def should_run_guardian(guardian: GuardianConfig,
                       worker_outputs: list[str]) -> bool:
    """Bepaal of een guardian moet draaien op basis van worker output."""
    if guardian.always_run:
        return True
    combined = "\n".join(worker_outputs).lower()
    return any(kw in combined for kw in guardian.trigger_keywords)


def collect_worker_outputs(batch_agents: list) -> dict[str, str]:
    """Verzamel output/result.md van alle workers in een batch."""
    outputs = {}
    for agent in batch_agents:
        result_path = Path(agent.workspace) / "output" / "result.md"
        if result_path.exists():
            outputs[agent.name] = result_path.read_text()
        # Ook errors meenemen
        error_path = Path(agent.workspace) / "output" / "error.md"
        if error_path.exists():
            outputs[f"{agent.name}-error"] = error_path.read_text()
    return outputs


def create_guardian_workspace(guardian: GuardianConfig,
                              project_root: str,
                              worker_outputs: dict[str, str],
                              batch_id: str) -> Path:
    """Maak een workspace aan voor een guardian agent."""
    import tempfile
    ws = Path(tempfile.mkdtemp(prefix=f"oa-guardian-{guardian.name}-"))

    # Context directory
    ctx = ws / "context"
    ctx.mkdir()

    # Kopieer huidige versie van het document
    doc_path = Path(project_root) / guardian.document_path
    if doc_path.exists():
        (ctx / "current-document.md").write_text(doc_path.read_text())

    # Worker outputs
    wo_dir = ctx / "worker-outputs"
    wo_dir.mkdir()
    for name, content in worker_outputs.items():
        (wo_dir / f"{name}.md").write_text(content)

    # Output directory
    (ws / "output" / "proposals").mkdir(parents=True)

    # CLAUDE.md genereren
    claude_md = _generate_guardian_claude_md(guardian, project_root,
                                             len(worker_outputs))
    (ws / "CLAUDE.md").write_text(claude_md)

    return ws


def _generate_guardian_claude_md(guardian: GuardianConfig,
                                  project_root: str,
                                  n_workers: int) -> str:
    """Genereer CLAUDE.md voor een guardian agent."""
    abs_doc_path = str(Path(project_root) / guardian.document_path)
    doc_name = guardian.document_path.split("/")[-1]

    return f"""# Guardian: {guardian.name}

## JE ROL
Je bent een GUARDIAN AGENT voor het document `{guardian.document_path}`.
Je taak: analyseer de output van worker agents en bepaal of
`{doc_name}` bijgewerkt moet worden.

## HUIDIGE VERSIE
Het huidige document staat in `./context/current-document.md`.
Lees dit EERST zodat je weet wat er al staat.

## WORKER OUTPUT
De output van {n_workers} workers staat in `./context/worker-outputs/`.
Lees ALLE bestanden.

## ANALYSE-CRITERIA
{guardian.criteria}

## BESLISSING
- Als er GEEN relevante updates zijn: schrijf "Geen update nodig"
  in ./output/result.md en maak .done aan.
- Als er WEL updates zijn: schrijf een proposal naar
  ./output/proposals/{doc_name}.proposal.md

## PROPOSAL FORMAT
Bestand: {abs_doc_path}
Waarom: (korte rationale)

Gevolgd door een code block met de volledige nieuwe inhoud.

## CONSTRAINTS
- Wijzig NOOIT het originele document direct
- Wees CONSERVATIEF — alleen voorstellen als het echt waarde toevoegt
- Behoud het bestaande formaat en nummering
- Voeg toe, wijzig niet tenzij feitelijk onjuist
- Schrijf alle output naar ./output/
- Maak een .done file als je klaar bent
"""
```

### 5.2 Integratie in orchestrator.py

Nieuwe functie `run_guardians()` die na elke batch wordt aangeroepen:

```python
# Toevoeging aan orchestrator.py

from .core_agents import (
    GUARDIANS, should_run_guardian, collect_worker_outputs,
    create_guardian_workspace
)

def run_guardians(batch_agents: list[AgentRecord],
                  project_root: str,
                  batch_id: str,
                  guardians: list[str] | None = None) -> list[AgentRecord]:
    """
    Draai guardian agents na een afgeronde worker-batch.

    Args:
        batch_agents: Lijst van afgeronde worker AgentRecords
        project_root: Pad naar de project root (waar core docs staan)
        batch_id: Unieke identifier voor deze batch
        guardians: Optioneel: alleen deze guardians draaien (default: alle)

    Returns:
        Lijst van guardian AgentRecords
    """
    # 1. Verzamel worker outputs
    worker_outputs = collect_worker_outputs(batch_agents)
    if not worker_outputs:
        return []

    output_texts = list(worker_outputs.values())

    # 2. Bepaal welke guardians moeten draaien
    active_guardians = []
    for name, config in GUARDIANS.items():
        if guardians and name not in guardians:
            continue
        if name == "handoff":
            continue  # Handoff alleen bij sessie-einde
        if should_run_guardian(config, output_texts):
            active_guardians.append(config)

    if not active_guardians:
        return []

    # 3. Spawn guardian agents (parallel)
    guardian_records = []
    for g in active_guardians:
        ws = create_guardian_workspace(g, project_root,
                                       worker_outputs, batch_id)
        rec = spawn_agent(
            name=f"guardian-{g.name}-{batch_id}",
            task=f"Guardian check voor {g.document_path}",
            model=g.model,
            workspace=str(ws),
            parent=None,  # Guardians hebben geen parent
        )
        guardian_records.append(rec)

    # 4. Wacht tot alle guardians klaar zijn (timeout: 5 min)
    import time
    timeout = 300
    start = time.time()
    while time.time() - start < timeout:
        all_done = all(
            check_agent(r.name) in ("done", "error", "timeout")
            for r in guardian_records
        )
        if all_done:
            break
        time.sleep(5)

    return guardian_records


def run_handoff_guardian(project_root: str) -> AgentRecord | None:
    """Draai de handoff guardian bij sessie-einde."""
    from datetime import date
    config = GUARDIANS["handoff"]
    config.document_path = f"docs/HANDOFF-{date.today()}.md"

    all_agents = list_agents()
    worker_outputs = collect_worker_outputs(all_agents)

    ws = create_guardian_workspace(config, project_root,
                                   worker_outputs, "session-end")
    return spawn_agent(
        name=f"guardian-handoff-{date.today()}",
        task="Sessie handoff document genereren",
        model=config.model,
        workspace=str(ws),
    )
```

### 5.3 Integratie in het orchestrator CLAUDE.md template

Het orchestrator template (`spawn_with_orchestrator()`) krijgt een extra stap:

```markdown
## STAPPEN
1. Analyseer de taak
2. Ontleed in subtaken
3. Spawn workers
4. Monitor: `oa status`
5. **NIEUW: `oa guardians` — draai guardian agents op worker output**
6. Review: `oa review <naam>` (workers + guardians)
7. Schrijf samenvatting
8. Maak .done als klaar
```

### 5.4 Nieuwe CLI commands

```python
# Toevoegingen aan cli.py

@app.command()
def guardians(
    batch: str = typer.Argument(None, help="Batch ID of 'all' voor laatste batch"),
    project_root: str = typer.Option(".", help="Project root pad"),
    only: str = typer.Option(None, help="Komma-gescheiden lijst van guardians"),
):
    """Draai guardian agents op afgeronde worker output."""
    guardian_list = only.split(",") if only else None

    # Verzamel afgeronde agents
    agents = list_agents(status="done")
    if not agents:
        console.print("[yellow]Geen afgeronde agents gevonden.[/yellow]")
        return

    records = run_guardians(agents, project_root, batch or "manual",
                            guardians=guardian_list)
    console.print(f"[green]{len(records)} guardians gestart.[/green]")


@app.command()
def handoff(
    project_root: str = typer.Option(".", help="Project root pad"),
):
    """Genereer sessie-handoff document via guardian agent."""
    rec = run_handoff_guardian(project_root)
    if rec:
        console.print(f"[green]Handoff guardian gestart: {rec.name}[/green]")
```

### 5.5 Uitbreiding `oa stop`

```python
# In cli.py, stop_session() aanpassen:

@app.command()
def stop(
    project_root: str = typer.Option(".", help="Project root pad"),
    skip_handoff: bool = typer.Option(False, help="Sla handoff guardian over"),
):
    """Stop de oa-sessie. Draait automatisch de handoff guardian."""
    if not skip_handoff:
        console.print("[blue]Handoff guardian starten...[/blue]")
        rec = run_handoff_guardian(project_root)
        if rec:
            # Wacht max 5 min op handoff
            _wait_for_agent(rec.name, timeout=300)
            console.print(f"[green]Handoff geschreven.[/green]")

    # Bestaande stop-logica
    _tmux("kill-session -t oa")
    console.print("[green]Sessie gestopt.[/green]")
```

---

## 6. Wat moet er aan cli.py veranderen?

### 6.1 Nieuwe imports

```python
from .core_agents import (
    GUARDIANS, run_guardians, run_handoff_guardian,
    should_run_guardian, collect_worker_outputs,
)
```

### 6.2 Nieuwe commando's (2)

| Commando | Functie | Beschrijving |
|----------|---------|-------------|
| `oa guardians [--only lessons,roadmap] [--project-root .]` | `guardians()` | Draai guardian agents op afgeronde worker output |
| `oa handoff [--project-root .]` | `handoff()` | Genereer sessie-handoff document |

### 6.3 Gewijzigde commando's (2)

| Commando | Wijziging |
|----------|-----------|
| `oa stop` | Voeg `--skip-handoff` flag toe, draai automatisch handoff guardian |
| `oa delegate` | Voeg guardian-fase toe aan orchestrator CLAUDE.md template |

### 6.4 Gewijzigde modules

| Module | Wijziging |
|--------|-----------|
| `orchestrator.py` | Import core_agents, voeg `run_guardians()` en `run_handoff_guardian()` toe |
| `workspace.py` | Voeg `create_guardian_workspace()` helper toe (of in core_agents.py) |
| `cli.py` | 2 nieuwe commands + stop/delegate aanpassingen |
| `monitor.py` | Guardian agents herkennen en apart tonen in status output |
| `dashboard.py` | Guardian agents markeren in TUI (bijv. met icon of kleur) |
| `bridge.py` | `/api/guardians` endpoint voor web UI |

### 6.5 Nieuwe bestanden

| Bestand | Functie |
|---------|---------|
| `oa-cli/src/open_agents/core_agents.py` | Guardian configuratie, workspace builder, trigger logica |

---

## 7. Configuratie

### 7.1 `~/.oa/guardians.yaml` (optioneel)

```yaml
# Guardian configuratie — overschrijft defaults
project_root: /path/to/Open-Agents

guardians:
  lessons:
    enabled: true
    always_run: true
    model: claude/sonnet

  roadmap:
    enabled: true
    always_run: true

  decisions:
    enabled: true
    trigger_keywords:
      - beslissing
      - architectuur
      - pattern

  requirements:
    enabled: true

  readme:
    enabled: false  # Uitschakelen als niet gewenst

  handoff:
    enabled: true
    auto_on_stop: true  # Automatisch bij oa stop

  agents:
    enabled: false
```

### 7.2 `oa config` integratie

```bash
oa config guardians             # Toon guardian configuratie
oa config guardians.lessons     # Toon lessons guardian config
oa config guardians.readme.enabled false  # Schakel readme guardian uit
```

---

## 8. Implementatieplan

### Fase 1: Fundament (Sprint 13A — 1 sessie)
- [ ] `core_agents.py` schrijven met GuardianConfig dataclass
- [ ] `create_guardian_workspace()` implementeren
- [ ] `should_run_guardian()` implementeren
- [ ] Unit tests voor core_agents module

### Fase 2: Orchestrator Integratie (Sprint 13B — 1 sessie)
- [ ] `run_guardians()` in orchestrator.py
- [ ] `run_handoff_guardian()` in orchestrator.py
- [ ] `oa guardians` CLI command
- [ ] `oa handoff` CLI command
- [ ] `oa stop` aanpassen met handoff

### Fase 3: Guardian Templates (Sprint 13C — 1 sessie)
- [ ] LessonsGuardian CLAUDE.md template verfijnen
- [ ] RoadmapGuardian CLAUDE.md template verfijnen
- [ ] DecisionsGuardian CLAUDE.md template verfijnen
- [ ] Handoff guardian template verfijnen
- [ ] End-to-end test: batch → guardians → proposals

### Fase 4: Polish & Configuratie (Sprint 13D — 1 sessie)
- [ ] `guardians.yaml` config laden
- [ ] Monitor/dashboard guardian-weergave
- [ ] Bridge API endpoints
- [ ] Documentatie bijwerken (README, CLAUDE.md)

---

## 9. Risico's en Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Guardians produceren ruis (onnodige proposals) | Lage kwaliteit → review-moeheid | Conservatieve prompts + `--dry-run` modus |
| Guardian proposals conflicteren met worker proposals | Verwarring over wat toe te passen | Aparte `oa review --guardians` flow |
| Core documents zijn te groot voor context window | Guardian kan document niet volledig lezen | Sectie-gebaseerde guardians (alleen relevante secties meegeven) |
| Guardians vertragen de batch-cyclus | Langere doorlooptijd | Parallelle executie + timeout van 5 min |
| Keyword-triggers missen relevante output | Guardians draaien niet wanneer nodig | `always_run=True` voor kritieke guardians (lessons, roadmap) |

---

## 10. Toekomstige Uitbreidingen

### 10.1 Smart Triggers (v2)
In plaats van keyword-matching, gebruik een snelle LLM-call om te bepalen of een guardian moet draaien:
```python
def smart_should_run(guardian, outputs) -> bool:
    prompt = f"Is er relevante info voor {guardian.document_path}? Antwoord: ja/nee"
    return llm_call(prompt, model="haiku") == "ja"
```

### 10.2 Incremental Updates (v2)
In plaats van de volledige documentinhoud als proposal, genereer diff-based updates:
```
@@ LESSONS.md @@
+ L-015 | **Guardian agents runnen parallel** | ...
+ L-016 | **Keyword triggers zijn onvoldoende** | ...
```

### 10.3 Cross-Guardian Verificatie (v3)
Een meta-guardian die de proposals van andere guardians checkt op consistentie:
- Conflicteert een nieuwe beslissing met een bestaand principe?
- Past de roadmap-update bij de requirement-update?

### 10.4 Automatische Apply (v3)
Met voldoende vertrouwen, guardians direct laten schrijven (zonder proposal mode):
```bash
oa guardians --auto-apply  # Gevaarlijk, maar mogelijk voor vertrouwde guardians
```

---

## Appendix A: Voorbeeld Sessie met Core Agents

```bash
# Sessie start
$ oa start
$ oa delegate "Implementeer WebSocket support voor real-time agent monitoring" \
    --project-root /path/to/Open-Agents

# Orchestrator draait, spawnt 3 workers...
# Workers klaar na 15 minuten

# Orchestrator triggert guardians automatisch:
#   → guardian-lessons-batch1 (altijd)
#   → guardian-roadmap-batch1 (altijd)
#   → guardian-decisions-batch1 (keyword: "architectuur", "WebSocket")
#   → guardian-requirements-batch1 (keyword: "feature", "endpoint")

# Na 60 seconden zijn guardians klaar
$ oa status
NAME                           MODEL          STATUS    TASK
orchestrator-websocket         claude/opus    running   Implementeer WebSocket...
├── worker-backend             claude/sonnet  done      WebSocket server...
├── worker-frontend            claude/sonnet  done      WebSocket client...
├── worker-tests               claude/sonnet  done      WebSocket tests...
├── guardian-lessons-batch1    claude/sonnet  done      Guardian check LESSONS.md
├── guardian-roadmap-batch1    claude/sonnet  done      Guardian check ROADMAP.md
├── guardian-decisions-batch1  claude/sonnet  done      Guardian check DECISIONS.md
└── guardian-requirements-b1   claude/sonnet  done      Guardian check REQUIREMENTS.md

# Review guardian proposals
$ oa review guardian-lessons-batch1
  → Proposal: 2 nieuwe lessen (L-015, L-016) over WebSocket implementatie

$ oa review guardian-roadmap-batch1
  → Proposal: FR-08 van 60% → 80%, checkbox "WebSocket support" aangevinkt

$ oa review guardian-decisions-batch1
  → Proposal: D-052 "WebSocket gekozen boven SSE voor bidirectionele communicatie"

# Apply goedgekeurde proposals
$ oa apply guardian-lessons-batch1 --dry-run
$ oa apply guardian-lessons-batch1
$ oa apply guardian-roadmap-batch1

# Sessie-einde
$ oa stop
  → Handoff guardian genereert docs/HANDOFF-2026-03-02.md
  → Sessie gestopt
```

---

## Appendix B: Relatie tot Bestaande Patronen

| Bestaand Patroon | Core Agents Relatie |
|-----------------|---------------------|
| **Pipeline mode** (planner → workers → combiner) | Guardians zijn een *extra fase* na de combiner |
| **Orchestrator pattern** (D-051) | Orchestrator triggert guardians als onderdeel van batch-QA |
| **Proposal mode** (L-005) | Guardians volgen hetzelfde proposal-format |
| **Parent-child hiërarchie** | Guardian agents krijgen de orchestrator als parent |
| **Workspace isolatie** | Guardians krijgen eigen workspace met context/ directory |
| **`.done` signaling** | Guardians gebruiken hetzelfde .done patroon |
| **`oa review` / `oa apply`** | Guardian proposals zijn reviewbaar via bestaande commands |

De Core Agents architectuur bouwt voort op **alle bestaande patronen** en voegt alleen een nieuwe laag toe. Er zijn geen breaking changes nodig.
