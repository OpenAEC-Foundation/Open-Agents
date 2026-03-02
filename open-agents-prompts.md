# Open-Agents Beta — Claude Code Prompts

> **Doel:** Met 1-3 prompts in Claude Code een werkende beta bouwen die je direct kunt uitproberen.
> **Workspace:** `~/open-agents/` (of waar je de repo ook neerzet)
> **Belangrijk:** Elke prompt is zelfstandig. Copy-paste in een verse Claude Code sessie in je terminal.

---

## Context voor jou (niet voor Claude Code)

**Wat we bouwen:** Een terminal applicatie die:
- Taken aanneemt via CLI
- Per taak een temp workspace bouwt met een CLAUDE.md
- Claude Code start in een nieuw tmux window voor elke agent
- Een monitoring dashboard toont in tmux met live status
- Alles op je subscription — geen API calls, geen VS Code

**Wat we NIET doen:**
- Geen Docker (temp folders zijn genoeg voor v1)
- Geen API integration
- Geen VS Code dependency
- Geen overengineering — werkende beta eerst

**Hoe je het runt:**
1. Open een terminal
2. `cd ~/open-agents`
3. `claude` (start Claude Code)
4. Plak prompt 1
5. Test het resultaat
6. Nieuwe sessie of vervolgprompt

---

## Prompt 1 — De kern: orchestrator + agent spawning

Dit is de belangrijkste prompt. Hiermee bouw je het hele fundament.

```
Bouw een terminal-applicatie genaamd "open-agents" — een orchestrator die Claude Code CLI sessies aanstuurt via tmux. Alles draait op mijn Claude subscription, geen API.

## Wat het moet doen

Het is een Python CLI tool (click of typer) met deze commando's:

1. `oa start` — Start het systeem: maakt een tmux session "oa" aan met een dashboard window
2. `oa run "<taakomschrijving>"` — Geeft een taak aan de orchestrator:
   - Maakt een temp workspace in /tmp/oa-agent-XXXXX/
   - Genereert een CLAUDE.md in die workspace met de taakinstructies
   - Opent een nieuw tmux window in de "oa" session
   - Start `claude --dangerously-skip-permissions -p "Lees CLAUDE.md en voer de taak uit. Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."` in dat window
   - Registreert de agent in een state file (~/.oa/agents.json)
3. `oa status` — Toont een tabel van alle actieve agents: naam, status (running/done/error), runtime, workspace pad
4. `oa dashboard` — Attacht aan de tmux session zodat je alles live ziet
5. `oa kill <agent-naam>` — Stopt een agent en ruimt de tmux window op
6. `oa collect <agent-naam>` — Toont de output van een voltooide agent
7. `oa clean` — Ruimt alle voltooide agent workspaces op

## CLAUDE.md generatie

De gegenereerde CLAUDE.md per agent moet dit format volgen:

```markdown
# Taak: {taakomschrijving}

## Instructies
{de taak, helder geformuleerd}

## Output
- Schrijf alle resultaten naar ./output/
- Maak een ./output/result.md met een samenvatting van wat je hebt gedaan
- Maak een .done file in de root als je helemaal klaar bent

## Constraints
- Werk alleen binnen deze directory
- Vraag niet om bevestiging, werk zelfstandig
- Als je vastloopt, schrijf het probleem naar ./output/error.md en maak alsnog .done aan
```

## Tmux layout

De "oa" tmux session heeft:
- Window 0: "dashboard" — draait een watch commando dat elke 3 seconden `oa status` uitvoert (via het geïnstalleerde CLI commando)
- Window 1+: per agent een window met de claude code sessie erin

## State management

Gebruik een simpele JSON file in ~/.oa/agents.json:
```json
{
  "agents": [
    {
      "name": "agent-abc123",
      "task": "Schrijf unit tests voor...",
      "workspace": "/tmp/oa-agent-abc123",
      "tmux_window": "oa:1",
      "started_at": "2026-03-02T14:30:00",
      "status": "running"
    }
  ]
}
```

De status wordt bepaald door:
- "running" = tmux window bestaat + geen .done file
- "done" = .done file aanwezig
- "error" = tmux window weg maar geen .done file
- "timeout" = langer dan 30 minuten draaiend (configureerbaar)

## Technische eisen

- Python 3.10+ met click of typer voor CLI
- libtmux (Python tmux library) voor tmux operaties — als die te complex is, gebruik gewoon subprocess met tmux commando's
- rich library voor mooie terminal output (tabellen, kleuren)
- Geen externe services, geen API calls, geen database
- Installeerbaar via pip install -e . (maak een pyproject.toml)
- Alle scripts in src/open_agents/

## Projectstructuur

```
open-agents/
├── pyproject.toml
├── README.md
├── CLAUDE.md              ← voor als IK claude code gebruik in dit project
├── src/
│   └── open_agents/
│       ├── __init__.py
│       ├── cli.py          ← click/typer CLI commands
│       ├── orchestrator.py ← agent lifecycle management
│       ├── workspace.py    ← temp folder + CLAUDE.md builder
│       ├── state.py        ← agents.json management
│       └── monitor.py      ← status display met rich
└── scripts/
    └── oa-status.sh        ← simpele wrapper voor watch
```

Bouw dit volledig werkend. Ik wil het na `pip install -e .` direct kunnen gebruiken. Begin met de kern (run, status, kill) en bouw daaromheen.
```

---

## Prompt 2 — Monitoring dashboard upgrade + multi-agent test

Pas prompt 2 aan als je prompt 1 hebt getest. Run dit in dezelfde workspace.

```
We hebben een werkende open-agents CLI. Nu twee dingen:

## 1. Upgrade het dashboard

Vervang de simpele `watch oa status` door een echte terminal UI met de `textual` Python library (pip install textual). Maak src/open_agents/dashboard.py:

- Bovenaan: header met "Open Agents — {aantal} active | {aantal} done | {aantal} queued"
- Hoofdpaneel links (60%): Agent tabel met live updates elke 2 seconden
  - Kolommen: naam, status (met kleur), taak (truncated), runtime, workspace
  - Klikbaar: selecteer een agent om details te zien
- Rechterpaneel (40%): Detail view van geselecteerde agent
  - Laatste 20 regels output van de agent (via tmux capture-pane of door output/result.md te lezen)
  - Workspace pad
  - Volledige taakomschrijving
- Onderbalk: sneltoetsen — K=kill, C=collect, R=refresh, Q=quit

Het `oa dashboard` commando start nu deze textual app in plaats van tmux attach.

## 2. Multi-agent orchestratie commando

Voeg `oa pipeline "<complexe taak>"` toe aan de CLI:
- Neemt een complexe taak
- Start een eerste "planner" agent die de taak opsplitst in subtaken
- De planner schrijft een plan.json naar output met subtaken
- De orchestrator leest plan.json en spawnt per subtaak een agent
- Na alle agents done: spawnt een "combiner" agent die alle outputs samenvoegt

Dit is de simpelste versie van orchestratie — de planner is zelf ook gewoon een Claude Code sessie met een specifieke CLAUDE.md.

Test het met: `oa pipeline "Bouw een Python library die CSV bestanden kan valideren tegen een JSON schema. Inclusief unit tests en README."`
```

---

## Prompt 3 (optioneel) — Polish + tmux integration verbeteren

Alleen als prompt 1 en 2 werken en je wilt fine-tunen.

```
We hebben open-agents werkend met CLI, textual dashboard, en basic pipeline support. Nu quality of life verbeteringen:

## 1. Betere tmux integratie

- `oa attach <agent-naam>` — spring direct naar het tmux window van die agent, zodat je live meekijkt
- `oa detach` — terug naar het dashboard
- De tmux session moet custom keybindings hebben:
  - Prefix+D = terug naar dashboard window
  - Prefix+S = oa status in een popup pane
  - Status bar toont: aantal agents | subscription slot usage schatting | tijd

## 2. Workspace templates

Voeg `oa run --template erpnext "<taak>"` toe. Templates zijn YAML files in ~/.oa/templates/:

```yaml
# ~/.oa/templates/erpnext.yaml
name: ERPNext Development
claude_md_extra: |
  ## Context
  Je werkt in het Frappe/ERPNext framework (Python + JS).
  Volg Frappe coding conventions.
  Gebruik de Frappe API, geen raw SQL.
files_to_include:
  - ~/docs/frappe-coding-standards.md
  - ~/docs/erpnext-app-structure.md
timeout_minutes: 45
```

## 3. History & replay

- `oa history` — toont laatste 20 voltooide taken met resultaat
- `oa replay <agent-naam>` — herstart een voltooide taak met dezelfde CLAUDE.md (nieuw temp workspace)
- Sla voltooide taken op in ~/.oa/history.json met de CLAUDE.md, output summary, en runtime

Bouw dit als uitbreidingen op de bestaande code. Niet herschrijven, alleen toevoegen.
```

---

## Gebruiksscenario na installatie

```bash
# Terminal 1: Start het systeem
cd ~/open-agents
oa start

# Geef taken
oa run "Schrijf een bash script dat alle .log bestanden ouder dan 7 dagen opruimt"
oa run "Maak een Python functie die Nederlandse IBAN nummers valideert"

# Bekijk wat er gebeurt
oa dashboard    # textual UI met live status
# of
oa status       # snelle CLI output

# Kijk mee met een specifieke agent
oa attach agent-abc123

# Resultaten ophalen
oa collect agent-abc123

# Pipeline voor complexere taken
oa pipeline "Bouw een REST API voor het beheren van ERPNext todo items"

# Opruimen
oa clean
```

---

## Notities

- **Geen Docker in v1** — temp folders zijn snel en goed genoeg. Docker komt later als opt-in.
- **Geen VS Code** — alles is terminal-native. Je kunt VS Code gebruiken als editor maar het systeem is er niet van afhankelijk.
- **Geen API** — Claude Code CLI op je subscription is de runtime. Punt.
- **Start simpel** — prompt 1 geeft je 80% van de waarde. Prompt 2 en 3 zijn verfijning.
- **Test na elke prompt** — bouw niet blind door. Run het, gebruik het, voel waar het schuurt.
- **De vorige codebase** — na de beta werkend is, gaan we analyseren wat er in het vorige weekend is gebouwd en cherry-picken wat bruikbaar is. Niet andersom.
