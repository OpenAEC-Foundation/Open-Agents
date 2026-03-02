# Claude Code Agentic Layer — Architectuur & Todo

> **Tmux + Temp Folders + Claude Code Subscription: een zelfsturend multi-agent systeem zonder API-kosten**

| Meta | |
|---|---|
| Eigenaar | Freek (freek@impertio.nl) |
| Aangemaakt | 2 maart 2026 |
| Status | Conceptfase / Brainstorm |
| Prioriteit | Hoog |

---

## Inhoud

1. [Kernidee & Motivatie](#1-kernidee--motivatie)
2. [Architectuur](#2-architectuur)
3. [De Orchestrator](#3-de-orchestrator)
4. [Workspace Assembly](#4-workspace-assembly)
5. [CLAUDE.md als Context](#5-claudemd-als-context-mechanisme)
6. [Isolatie: Docker vs Temp Folders](#6-isolatie-docker-vs-temp-folders)
7. [Tmux UI — Sessions, Windows & Panes](#7-tmux-architectuur--sessions-windows--panes)
8. [Data Flow & Output](#8-data-flow--output)
9. [Security & Auth](#9-security--auth)
10. [Beperkingen & Risico's](#10-beperkingen--risicos)
11. [Vergelijking Alternatieven](#11-vergelijking-alternatieven)
12. [Use Cases voor Impertio](#12-use-cases-voor-impertio)
13. [Proof of Concept Plan](#13-proof-of-concept-plan)
14. [Alle Todo's](#14-alle-todos)
15. [Open Vragen](#15-open-vragen)
16. [Bronnen & Referenties](#16-bronnen--referenties)

---

## 1. Kernidee & Motivatie

> **In één zin:** Gebruik je betaalde Claude subscription (Max plan) om via Claude Code CLI + tmux een volledig multi-agent systeem te draaien, zonder API-kosten.

### Het probleem

De Anthropic API is krachtig maar duur bij intensief agentic gebruik — al snel tientallen euro's per dag. Claude Code CLI draait echter op je Max subscription tegen een vast maandelijks bedrag. Hoe meer je het gebruikt, hoe meer waarde je eruit haalt.

### Het inzicht

Claude Code is al een volledige "agent runtime": het heeft file I/O, bash access, git integratie, en tool use ingebouwd. Als je daar een orchestratielaag bovenop bouwt die meerdere Claude Code sessies kan aansturen, heb je een multi-agent systeem op je subscription.

### De drie pijlers

- **Tmux** — Programmatische controle over terminalsessies. Kan sessies aanmaken, commando's sturen, output uitlezen — de "glue" laag.
- **Temp Folders** — Isolatie per agent. Elke taak draait in een schone temp directory met een op maat gemaakte workspace. Geen context-vervuiling. (Docker als opt-in voor later.)
- **Claude Code CLI** — De agent runtime. Draait op subscription, heeft bash/file/git tools ingebouwd, leest automatisch CLAUDE.md als systeeminstructies.
- **CLAUDE.md** — Het context-mechanisme. De orchestrator bouwt per taak een CLAUDE.md die precies beschrijft wat de agent moet doen, weten en opleveren.

> ✅ **Kernvoordeel:** Je krijgt Claude Code's volledige toolkit gratis mee als runtime, en je betaalt niks extra per token. De temp folders zijn je "specialized agents", de workspace is je "smart context assembly", en tmux is je interface om erin te kijken en te monitoren.

---

## 2. Architectuur

### Visueel overzicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOST MACHINE (Linux)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ORCHESTRATOR (Claude Code sessie in tmux)              │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  Taken ontvangen → Context bouwen → Agents      │     │   │
│  │  │  spawnen → Output verzamelen → Rapporteren       │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  └──────────────┬───────────────────────┬──────────────────┘   │
│                  │                       │                      │
│          ┌───────▼──────┐        ┌───────▼──────┐               │
│          │  Temp Dir 1  │        │  Temp Dir 2  │    ...        │
│          │  ┌─────────┐ │        │  ┌─────────┐ │               │
│          │  │CLAUDE.md│ │        │  │CLAUDE.md│ │               │
│          │  │workspace│ │        │  │workspace│ │               │
│          │  │  files   │ │        │  │  files   │ │               │
│          │  └─────────┘ │        │  └─────────┘ │               │
│          │              │        │              │               │
│          │ Claude Code  │        │ Claude Code  │               │
│          │  in tmux     │        │  in tmux     │               │
│          └──────┬───────┘        └──────┬───────┘               │
│                 │                        │                      │
│          ┌──────▼────────────────────────▼──────┐               │
│          │         Shared Output Volume          │               │
│          │  /shared/output/ (resultaten)          │               │
│          └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Lagenmodel

| Laag | Technologie | Verantwoordelijkheid |
|---|---|---|
| **Presentatie** | Tmux panes / dashboard | Live monitoring, debugging, handmatige interventie |
| **Orchestratie** | Claude Code sessie + bash scripts | Taakanalyse, workspace-bouw, agent-spawning, output-routing |
| **Isolatie** | Temp folders (Docker opt-in) | Schone omgeving per agent |
| **Runtime** | Claude Code CLI | AI-executie, file editing, bash commands, git operations |
| **Context** | CLAUDE.md + bestanden | Taakinstructies, domeinkennis, constraints |
| **Persistentie** | Shared volumes + state files | Output, inter-agent communicatie, logging |

---

## 3. De Orchestrator

> **Cruciaal inzicht:** De orchestrator is zelf ook een Claude Code sessie. Het is een "meta-agent" die via tmux de andere agents aanstuurt. Dit maakt het systeem self-orchestrating op je vaste subscription.

### Verantwoordelijkheden

- **Taakdecompositie** — Breekt een complexe opdracht op in subtaken die parallel of sequentieel kunnen draaien
- **Context assembly** — Bepaalt per subtaak welke bestanden, documentatie en instructies de agent nodig heeft
- **Workspace building** — Maakt per agent een directory aan met CLAUDE.md + relevante bestanden
- **Agent spawning** — Start tmux windows/panes waarin Claude Code draait
- **Output monitoring** — Leest via `tmux capture-pane` de voortgang en detecteert fouten
- **Output routing** — Verzamelt resultaten en stuurt die naar de volgende agent of terug naar de gebruiker
- **Error recovery** — Herstart agents die vastlopen, past context aan bij fouten

### Voorbeeld orchestrator CLAUDE.md

```markdown
# Orchestrator

Je bent de orchestrator van een multi-agent systeem.

## Beschikbare tools
- `spawn_agent.sh <naam> <workspace-dir>` → Start een agent in tmux
- `check_agent.sh <naam>` → Lees agent output
- `kill_agent.sh <naam>` → Stop een agent
- `build_workspace.sh <taak-json>` → Bouw workspace directory

## Workflow
1. Lees de taak uit /tasks/incoming/
2. Analyseer welke subtaken nodig zijn
3. Bouw per subtaak een workspace met relevante bestanden
4. Spawn agents en monitor hun voortgang
5. Verzamel output in /output/final/
6. Schrijf samenvatting naar /output/report.md

## Constraints
- Maximaal 3 gelijktijdige agents (subscription limit)
- Wacht op agent-completion voordat je output verwerkt
- Log alle acties naar /logs/orchestrator.log
```

> 💡 **Idee — Cascading orchestration:** De orchestrator kan ook een "sub-orchestrator" spawnen voor complexe domeintaken. Bijvoorbeeld: een ERPNext-orchestrator die zelf weer fiscale-module-agents, API-agents en test-agents aanstuurt.

---

## 4. Workspace Assembly

Dit is het hart van het systeem. De kwaliteit van de output hangt direct af van hoe goed de workspace is samengesteld. De orchestrator moet slim genoeg zijn om per taak precies de juiste context mee te geven — niet te veel (ruis), niet te weinig (gemiste info).

### Workspace structuur per agent

```
/tmp/oa-agent-XXXXX/
├── CLAUDE.md              # Taakinstructies + constraints
├── context/               # Relevante documentatie
│   ├── domain-info.md         # Domeinkennis (bv. ERPNext docs)
│   ├── existing-code/         # Relevante bestaande code
│   └── examples/              # Voorbeelden van gewenste output
├── input/                 # Input data voor de taak
│   └── task-spec.json         # Gestructureerde taakomschrijving
├── src/                   # Werkdirectory voor code
└── output/                # Hier schrijft de agent resultaten
    └── .done                  # Sentinel file: agent is klaar
```

### Context assembly strategieën

- **Statisch** — Vaste sets bestanden per taaktype. Bv. voor "ERPNext module" altijd de Frappe docs, coding standards, en app-structuur includeren.
- **Dynamisch** — De orchestrator analyseert de taak en selecteert relevante bestanden uit een kennisbank. Kan met embeddings of keyword matching.
- **Template-based** — Voorgedefinieerde workspace-templates per taaktype die de orchestrator parameteriseert. Snel en voorspelbaar.
- **Hybrid** — Templates als basis + dynamische toevoegingen op basis van taakanalyse. Beste balans tussen snelheid en relevantie.

> ⚠️ **Let op:** Context window limits van Claude Code gelden nog steeds. Een workspace vol met 500 bestanden helpt niet — de agent kan het niet allemaal verwerken. Selectiviteit is key.

---

## 5. CLAUDE.md als Context-mechanisme

Claude Code leest automatisch de `CLAUDE.md` in de working directory. Dit is het primaire mechanisme om een agent te "programmeren" — geen ingewikkelde prompt injection via `tmux send-keys` nodig.

### Anatomie van een goede CLAUDE.md

```markdown
# Agent: Fiscale Module Builder

## Jouw rol
Je bent een ERPNext developer die de Nederlandse fiscale compliance module bouwt.

## Taak
Bouw het RGS-compliant Chart of Accounts (rekeningschema) als ERPNext fixture.

## Context
- Je werkt in het Frappe framework (Python + JS)
- Bestaande app structuur staat in /workspace/context/app-structure.md
- RGS specificatie staat in /workspace/context/rgs-spec.csv
- Voorbeeld fixtures staan in /workspace/context/examples/

## Constraints
- Volg de Frappe coding conventions (zie context/coding-standards.md)
- Gebruik ALLEEN de standaard Frappe API — geen raw SQL
- Output naar /workspace/output/
- Maak een .done file aan als je klaar bent

## Verwachte output
1. `chart_of_accounts_nl.json` — Het rekeningschema als fixture
2. `CHANGELOG.md` — Wat je hebt gedaan en waarom
3. `.done` — Sentinel file
```

### Best practices

- **Wees specifiek over output** — Claude Code werkt beter als het exact weet wat het moet opleveren
- **Verwijs naar context bestanden** — Noem expliciet welke bestanden in de workspace relevant zijn
- **Definieer constraints** — Voorkom dat de agent afdwaalt met heldere grenzen
- **Sentinel files** — Gebruik een `.done` file zodat de orchestrator kan detecteren wanneer een agent klaar is
- **Geen secrets** — CLAUDE.md is plaintext, zet er geen tokens of wachtwoorden in

---

## 6. Isolatie: Docker vs Temp Folders

> ⚠️ **Open vraag (2 maart 2026):** Het is nog niet duidelijk of Docker containers nodig zijn. Claude Code draait prima in een gewone directory — een tijdelijke folder met een CLAUDE.md is misschien alles wat je nodig hebt. Docker voegt complexiteit toe die mogelijk niet gerechtvaardigd is.

### Twee aanpakken vergeleken

| Aspect | Temp Folder (simpel) | Docker Container (zwaar) |
|---|---|---|
| **Hoe het werkt** | `mktemp -d` → CLAUDE.md erin → `cd` ernaar → `claude` starten in tmux | Docker image met Claude Code → mount workspace → start container |
| **Startup tijd** | Instant (< 1 sec) | Seconden tot tientallen seconden |
| **Isolatie** | Beperkt — agents delen host filesystem, PATH, env vars | Volledig — eigen filesystem, netwerk, processen |
| **Auth** | Automatisch — erft host Claude login | Moet geconfigureerd worden per container |
| **Complexiteit** | Minimaal — bash scripts zijn genoeg | Hoog — Dockerfile, volumes, networking, secrets |
| **Cleanup** | `rm -rf /tmp/agent-xyz` | `docker rm -f agent-xyz` + image management |
| **Veiligheid** | Agent kan theoretisch buiten z'n folder komen | Agent is opgesloten in container |
| **Dependencies** | Alleen tmux + claude CLI | Docker daemon + images + orchestratie |

> ✅ **Aanbeveling voor v1:** Begin met temp folders. De CLAUDE.md + gerichte bestanden in een temp directory geven voldoende "isolatie" van context. Docker is een optimalisatie voor later, als je merkt dat agents elkaar in de weg zitten of als je harde resource-isolatie nodig hebt. "Robuust zonder overkill."

### Temp folder aanpak

```bash
#!/bin/bash
# spawn-agent.sh — Simpelste versie: temp folder + tmux

AGENT_NAME=$1
TASK_PROMPT=$2

# Maak een temp workspace
WORKSPACE=$(mktemp -d /tmp/oa-agent-${AGENT_NAME}-XXXXX)

# Bouw de context: CLAUDE.md + eventuele bestanden
/scripts/build-workspace.sh "$WORKSPACE" "$TASK_PROMPT"

# Start Claude Code in een tmux window
tmux new-window -t agents -n "$AGENT_NAME"
tmux send-keys -t "agents:$AGENT_NAME" "cd $WORKSPACE && claude" Enter

# Log
echo "$(date +%H:%M:%S) ● $AGENT_NAME spawned in $WORKSPACE" >> /logs/events.log
```

### Wanneer wél Docker overwegen

- **Productie** — Als agents draaien op een shared server waar meerdere mensen bij kunnen
- **Onbetrouwbare agents** — Als agents bash commando's uitvoeren die de host kunnen beschadigen
- **Reproduceerbare omgevingen** — Als agents specifieke tool-versies nodig hebben
- **Resource limiting** — Als je harde CPU/memory caps nodig hebt per agent

> 💡 **Hybride pad:** Begin met temp folders voor snelle iteratie. Als het systeem matuur wordt, kun je Docker als opt-in toevoegen voor specifieke agent-types die zwaardere isolatie nodig hebben. De orchestrator-logica blijft identiek — alleen de "start agent" stap verandert.

---

## 7. Tmux Architectuur — Sessions, Windows & Panes

> **Kernprincipe:** Tmux heeft drie hiërarchische lagen — *sessions*, *windows*, en *panes* — die elk een andere rol vervullen in het agentic systeem. We gebruiken alle drie de lagen voor zowel executie als monitoring.

### Hiërarchie & Mapping

```
SESSION = Project / Taakgroep context
│
├── WINDOW = View / Functie (tab-achtig, je switcht ertussen)
│   │
│   ├── PANE = Individueel zichtbaar paneel (simultaan naast elkaar)
│   ├── PANE
│   └── PANE
│
├── WINDOW
│   ├── PANE
│   └── PANE
│
└── WINDOW
    └── PANE
```

| Tmux laag | Mapping in ons systeem | Voorbeeld | Switch methode |
|---|---|---|---|
| **Session** | Projectcontext of taakgroep | `erpnext-fiscaal`, `showroom-demo`, `code-review-pr42` | `Ctrl+B s` (session picker) |
| **Window** | Functionele view (tabs) | `dashboard`, `orchestrator`, `agent-detail`, `logs` | `Ctrl+B w` of `Ctrl+B 0-9` |
| **Pane** | Individuele feed / agent / metric | Agent output, CPU graph, task queue, live log | `Ctrl+B pijltjes` |

### Session Architectuur

Elke taakgroep of project krijgt een eigen tmux session. Dit geeft volledige isolatie — je kunt tussen projecten switchen zonder dat ze elkaars schermindeling verstoren.

**Permanente sessions:**
- `control` — Altijd actief. Bevat het hoofddashboard, systeemstatus, en queue overzicht. Dit is je "home base".
- `orchestrator` — De meta-agent sessie. Hier draait de Claude Code orchestrator die andere agents aanstuurt.

**Dynamische sessions:**
- Per taakgroep aangemaakt, bv. `fiscaal-module-20260302`. Bevat alle agents en monitoring voor die specifieke opdracht. Wordt opgeruimd na completion.

### Control Session — "Missiecontrole"

De control session is altijd actief en geeft je totaaloverzicht. Vier windows:

```
Session: control
│
├── Window 0: dashboard    ← Hoofdoverzicht (standaard zichtbaar)
├── Window 1: queue        ← Taakwachtrij & planning
├── Window 2: resources    ← Systeem resources & rate limits
└── Window 3: logs         ← Gefilterde log views
```

#### Window 0: Dashboard — Het zenuwcentrum

Het dashboard window geeft in één oogopslag alles wat je moet weten. Zes panes:

```
┌─────────────────────────────────┬──────────────────────────┐
│                                 │                          │
│   PANE 1: Agent Status Board    │  PANE 2: Orchestrator    │
│                                 │  Live Output             │
│   agent-fiscaal  ● RUNNING 3m   │                          │
│   agent-tests    ● RUNNING 1m   │  > Analyzing task...     │
│   agent-docs     ○ QUEUED       │  > Spawning agent-btw    │
│   agent-review   ✓ DONE 12m     │  > Waiting for output    │
│                                 │                          │
├─────────────────────────────────┼──────────────────────────┤
│                                 │                          │
│   PANE 3: Active Agent Preview  │  PANE 4: Task Pipeline   │
│                                 │                          │
│   [capture-pane van de agent    │  [1] fiscaal ━━━━━▶ [2]  │
│    waar je focus op hebt,       │  [2] btw     ━━▶ WAIT    │
│    laatste 15 regels output]    │  [3] tests   ━━━▶ [4]    │
│                                 │  [4] rapport ○ PENDING   │
│                                 │                          │
├─────────────────┬───────────────┴──────────────────────────┤
│                 │                                          │
│ PANE 5: Docker  │  PANE 6: Event Feed / Notificaties       │
│                 │                                          │
│ CPU: ▓▓▓░░ 34% │  14:32 ✓ agent-review completed (12m)     │
│ MEM: ▓▓░░░ 22% │  14:33 → agent-docs queued                │
│ Containers: 2/5│  14:35 ● agent-btw spawned                │
│                 │  14:36 ⚠ rate limit: 2/5 slots used      │
│                 │                                          │
└─────────────────┴──────────────────────────────────────────┘
```

#### Window 1: Queue — Taakplanning

```
┌──────────────────────────────────────────────────────────────┐
│   PANE 1: Wachtrij (tasks/incoming/)                        │
│                                                              │
│   Pending:  3 taken                                          │
│   #  │ Taak                     │ Priorit. │ Agents          │
│   7  │ SBR Export module        │ HIGH     │ 2 parallel      │
│   8  │ Readme update alle repos │ LOW      │ 4 parallel      │
│   9  │ API docs genereren       │ MEDIUM   │ 3 sequent.      │
├──────────────────────────────────────────────────────────────┤
│   PANE 2: Completion History                                 │
│                                                              │
│   Vandaag: 4 taken afgerond, 1 gefaald, 3 in queue          │
│   ✓ 14:12  PR #38 code review         8m   2 agents         │
│   ✓ 13:45  Fiscaal chart of accounts  22m  3 agents         │
│   ✗ 12:30  BIM export script          15m  1 agent (timeout)│
│   ✓ 11:15  Unit tests betaalmodule    11m  1 agent          │
└──────────────────────────────────────────────────────────────┘
```

#### Window 2: Resources — Capaciteitsbewaking

```
┌──────────────────────────────┬───────────────────────────────┐
│  PANE 1: Rate Limit Tracker  │  PANE 2: System Resources     │
│                              │                               │
│  Subscription: Max Plan      │  docker stats / htop          │
│  Sessies actief: 2/5         │                               │
│  Tokens vandaag: ~45k        │  NAME          CPU    MEM     │
│  Geschat resterend: ~155k    │  agent-fiscaal 23%   1.2GB    │
│                              │  agent-btw     12%   0.8GB    │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░░ 35%  │  orchestrator  3%    0.4GB    │
│  Cooldown: geen              │                               │
└──────────────────────────────┴───────────────────────────────┘
```

#### Window 3: Logs — Gefilterde views

```
┌──────────────────────────────────────────────────────────────┐
│  PANE 1: Orchestrator decisions log                          │
│  tail -f /logs/orchestrator.log | grep "DECISION|SPAWN"      │
├──────────────────────────────────────────────────────────────┤
│  PANE 2: Agent errors & warnings                             │
│  tail -f /logs/agents/*.log | grep "ERROR|WARN|TIMEOUT"      │
├──────────────────────────────────────────────────────────────┤
│  PANE 3: Full combined log                                   │
│  tail -f /logs/**/*.log                                      │
└──────────────────────────────────────────────────────────────┘
```

### Dynamische Project Sessions

```
Session: fiscaal-module-20260302
│
├── Window 0: overview       ← Alle agents naast elkaar (capture-pane previews)
│   ├── Pane: agent-rgs (live output)
│   ├── Pane: agent-btw (live output)
│   └── Pane: agent-tests (live output)
│
├── Window 1: agent-rgs      ← Fullscreen view, direct tmux attach
├── Window 2: agent-btw      ← Fullscreen view, direct tmux attach
├── Window 3: agent-tests    ← Fullscreen view, direct tmux attach
│
├── Window 4: files          ← Output bestanden monitoren
│   ├── Pane: watch tree /shared/output/fiscaal/
│   └── Pane: inotifywait op nieuwe files
│
└── Window 5: intervene      ← Vrije bash voor debugging/fixes
```

> 💡 **Drill-down navigatie:** Vanuit het control dashboard (Agent Status Board) kun je met een keybinding direct naar de project-session en het juiste agent-window springen. Terug naar dashboard met `Ctrl+B s` → control session.

### Pane Types — Bouwblokken

| Pane Type | Implementatie | Doel |
|---|---|---|
| **Agent Status Board** | Custom bash/python script met `watch` | Overzichtstabel: naam, status, runtime, health |
| **Agent Live Preview** | `tmux capture-pane -t <agent> -p \| tail -N` | Laatste N regels output van agent |
| **Agent Fullscreen** | `docker exec -it <container> tmux attach` | Direct meekijken/interacteren |
| **Pipeline Visualisatie** | Custom script met ASCII art | Dependency graph: wie wacht op wie |
| **Docker/System Stats** | `docker stats --format "table ..."` | CPU, memory per container |
| **Rate Limit Meter** | Custom script met progress bar | Subscription gebruik, slots beschikbaar |
| **Event Feed** | `tail -f /logs/events.log` met kleuren | Chronologisch: spawns, completions, errors |
| **File Watcher** | `inotifywait -mr /shared/output/` | Real-time output detectie |
| **Queue View** | Custom script leest `/tasks/incoming/` | Wachtende taken met prioriteit |
| **Filtered Log** | `tail -f ... \| grep "PATTERN"` | Specifieke logstream |
| **Free Terminal** | Gewone bash | Handmatig ingrijpen |

### Setup Script — Control Session

```bash
#!/bin/bash
# setup-control-session.sh

SESSION="control"
tmux kill-session -t $SESSION 2>/dev/null

# Window 0: Dashboard
tmux new-session -d -s $SESSION -n "dashboard" -x 200 -y 50
tmux send-keys -t $SESSION:0.0 "watch -t -n3 '/scripts/agent-status-board.sh'" Enter

tmux split-window -h -t $SESSION:0.0 -p 40
tmux send-keys -t $SESSION:0.1 "tail -f /logs/orchestrator.log" Enter

tmux split-window -v -t $SESSION:0.0 -p 40
tmux send-keys -t $SESSION:0.2 "/scripts/agent-preview.sh --follow-active" Enter

tmux split-window -v -t $SESSION:0.1 -p 50
tmux send-keys -t $SESSION:0.3 "watch -t -n5 '/scripts/pipeline-view.sh'" Enter

tmux split-window -v -t $SESSION:0.2 -p 30
tmux send-keys -t $SESSION:0.4 "docker stats --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'" Enter

tmux split-window -v -t $SESSION:0.3 -p 40
tmux send-keys -t $SESSION:0.5 "tail -f /logs/events.log | /scripts/colorize-events.sh" Enter

# Window 1: Queue
tmux new-window -t $SESSION -n "queue"
tmux send-keys -t $SESSION:1.0 "watch -t -n5 '/scripts/queue-view.sh'" Enter
tmux split-window -v -t $SESSION:1.0 -p 40
tmux send-keys -t $SESSION:1.1 "/scripts/completion-history.sh" Enter

# Window 2: Resources
tmux new-window -t $SESSION -n "resources"
tmux send-keys -t $SESSION:2.0 "watch -t -n10 '/scripts/rate-limit-meter.sh'" Enter
tmux split-window -h -t $SESSION:2.0 -p 50
tmux send-keys -t $SESSION:2.1 "docker stats" Enter

# Window 3: Logs
tmux new-window -t $SESSION -n "logs"
tmux send-keys -t $SESSION:3.0 "tail -f /logs/orchestrator.log | grep --color 'DECISION\|SPAWN\|ERROR'" Enter
tmux split-window -v -t $SESSION:3.0 -p 60
tmux send-keys -t $SESSION:3.1 "tail -f /logs/agents/*.log | grep --color 'ERROR\|WARN\|TIMEOUT'" Enter
tmux split-window -v -t $SESSION:3.1 -p 50
tmux send-keys -t $SESSION:3.2 "tail -f /logs/**/*.log" Enter

tmux select-window -t $SESSION:0
echo "✓ Control session ready — tmux attach -t control"
```

### Interactie Flows

**Flow 1: "Even checken hoe het gaat"**
`tmux attach -t control` → Dashboard → Agent Status Board → Event feed → Alles ok → `Ctrl+B d` (detach)

**Flow 2: "Agent zit vast, ik wil meekijken"**
Dashboard → agent draait al 20 min → `Ctrl+B s` → project session → `Ctrl+B 2` → fullscreen agent → diagnose → `Ctrl+B s` → terug naar control

**Flow 3: "Agent produceert slechte output, ingrijpen"**
Project session → Window "intervene" → check output → fix context → kill agent → orchestrator retry

**Flow 4: "Nieuwe taak injecteren"**
Control → Window "queue" → drop taak-JSON in `/tasks/incoming/` → queue view updated → orchestrator pakt op

### Custom Keybindings (.tmux.conf)

```bash
# Spring naar dashboard
bind D switch-client -t control \; select-window -t 0

# Spring naar queue
bind Q switch-client -t control \; select-window -t 1

# Spring naar logs
bind L switch-client -t control \; select-window -t 3

# Kill geselecteerde agent (met confirmatie)
bind K confirm-before -p "Kill agent? (y/n)" "run-shell '/scripts/kill-focused-agent.sh'"

# Spawn nieuwe ad-hoc agent
bind N command-prompt -p "Agent naam:","Workspace:" "run-shell '/scripts/spawn_agent.sh %1 %2'"

# Status bar met agent count
set -g status-right "#(docker ps -q | wc -l) agents | #(cat /tmp/rate-limit-status) | %H:%M"
set -g status-interval 5

# Kleuren
set -g status-bg "#161b22"
set -g status-fg "#8b949e"
set -g window-status-current-style "fg=#58a6ff,bold"
set -g pane-border-style "fg=#30363d"
set -g pane-active-border-style "fg=#58a6ff"
```

> ✅ **Workflow tip:** Gebruik `capture-pane` alleen voor preview panes. Laat agents hun echte output naar bestanden schrijven. De orchestrator pollt op bestands-niveau (`.done` file, `output/result.json`), wat veel betrouwbaarder is dan terminal-parsing.

> ⚠️ **Performance:** `watch` met `capture-pane` elke 3 sec op 5+ agents kan zwaar worden. Monitor host CPU en pas intervals aan.

> 💡 **Toekomstidee — Rich TUI:** Vervang bash watch-scripts door Python TUI met `textual` of `rich`. Echte widgets, kleuren, interactieve tabellen — nog steeds in terminal maar veel rijker. Fase 4+ verbetering.

---

## 8. Data Flow & Output

### Flow per taak

1. **Taak binnenkomst** — Via CLI, file drop in /tasks/incoming/, of API endpoint
2. **Orchestrator analyseert** — Bepaalt subtaken, volgorde, benodigde context per agent
3. **Workspace assembly** — Per subtaak: CLAUDE.md schrijven, relevante bestanden kopiëren
4. **Agent start** — Tmux window met Claude Code in temp workspace
5. **Agent executie** — Claude Code leest CLAUDE.md, werkt geïsoleerd, schrijft output
6. **Completion detectie** — Orchestrator detecteert `.done` sentinel file
7. **Output routing** — Naar volgende agent (pipeline) of verzamelen voor eindrapport
8. **Cleanup** — Tmux window sluiten, temp workspace kan bewaard worden voor audit

### Inter-agent communicatie

Agents communiceren niet direct. Alle communicatie loopt via shared output en de orchestrator:

- **Pipeline patroon** — Agent A output → orchestrator kopieert naar Agent B workspace als input → Agent B werkt ermee
- **Fan-out / Fan-in patroon** — 3 agents parallel met dezelfde taak maar verschillende context → wacht op alle 3 → vergelijk/combineer resultaten

---

## 9. Security & Auth

### Claude Code authenticatie

Elke tmux window erft automatisch de host authenticatie. Bij Docker containers moet dit expliciet geconfigureerd worden.

| Methode | Veiligheid | Complexiteit | Aanbevolen? |
|---|---|---|---|
| Environment variable in docker run | Basis | Laag | Voor development |
| Docker secrets | Goed | Midden | Voor productie |
| Volume mount van `~/.claude/` (read-only) | Goed | Midden | Eenvoudigst voor containers |
| Hashicorp Vault | Excellent | Hoog | Overkill voor nu |

> ✅ **Pragmatische aanpak (temp folders):** Agents erven automatisch de host auth. Geen extra configuratie nodig. Dit is een groot voordeel van de temp folder aanpak boven Docker.

### Isolatie maatregelen

- **Timeout** — Maximale runtime per agent (bv. 30 minuten), daarna auto-kill
- **Workspace scope** — CLAUDE.md instrueert agent om alleen binnen workspace te werken
- **Geen network access** — Agents hoeven meestal niet het internet op
- **Resource monitoring** — Track CPU/memory per agent via system tools

### Integratie met TOTP Proxy

Voor agents die externe services moeten aanspreken (GitHub, ERPNext API, Hetzner) kan het bestaande TOTP proxy systeem worden ingezet. De orchestrator kan TOTP codes genereren en aan agent-workspaces meegeven.

---

## 10. Beperkingen & Risico's

| Beperking | Impact | Mitigatie |
|---|---|---|
| **Subscription concurrency limits** | 🔴 Kritiek | Max 3-5 gelijktijdige sessies. Queue-systeem, prioritering |
| **Rate limits per account** | 🟠 Hoog | Backoff strategie, usage tracking |
| **Terminal output parsing fragiel** | 🟡 Midden | Output via bestanden i.p.v. stdout |
| **Claude Code kan vastlopen** | 🟠 Hoog | Timeouts, health checks, retry-logica |
| **Context window limits per agent** | 🟡 Midden | Workspace klein houden |
| **Auth propagatie bij Docker** | 🟡 Midden | Niet relevant bij temp folders |
| **Orchestrator complexiteit** | 🟠 Hoog | Begin simpel met templates |
| **Geen gestructureerde API responses** | 🟡 Midden | Agents schrijven JSON naar files |
| **Subscription ToS compliance** | 🔴 Kritiek | Verifiëren bij Anthropic |

> ⚠️ **Terms of Service risico:** Verifieer expliciet of multi-sessie automation op een consumer subscription is toegestaan. Controleer Anthropic ToS en overweeg contact op te nemen met support. Dit is een potentiële showstopper.

---

## 11. Vergelijking Alternatieven

| Aanpak | Kosten | Controle | Complexiteit | Geschikt voor |
|---|---|---|---|---|
| **Deze aanpak (tmux+folders+CC)** | Vast (subscription) | Midden | Laag-Midden | Dagelijks gebruik, development |
| Anthropic API direct | Per token (duur) | Hoog | Hoog | Productie, hoge throughput |
| Pi.dev terminal agent | Onbekend | Midden | Laag | Single-agent taken |
| LangGraph / CrewAI | API-kosten | Hoog | Hoog | Complexe multi-agent flows |
| OpenAgents (eigen platform) | Infra + API | Maximaal | Zeer hoog | Enterprise, volledige customization |

> **Positionering:** Dit is de "pragmatische middenweg" — meer controle dan single Claude Code, minder complex dan API-gebaseerd framework. Ideaal als prototyping-platform voor de OpenAgents visie en als dagelijks workhorse.

---

## 12. Use Cases voor Impertio

**ERPNext Module Development** (🟠 Hoge waarde)
Orchestrator ontvangt "bouw Nederlandse fiscale module" → Spawnt parallel: Agent A (Chart of Accounts), Agent B (BTW rapport), Agent C (Unit tests). Output van A en B gaat naar Agent D (integratietest).

**Code Review Pipeline** (🟠 Hoge waarde)
Git push triggert orchestrator → Agent 1 (security), Agent 2 (quality), Agent 3 (performance) → Combineert tot review rapport.

**Documentatie Generatie** (🟡 Midden waarde)
Orchestrator scant codebase → Per module een docs-agent → Combineert tot API documentatie in Impertio huisstijl.

**Multi-repo Refactoring** (🟠 Hoge waarde)
Één architectuurbeslissing per repository door een aparte agent, allemaal met dezelfde CLAUDE.md maar repo-specifieke context.

**Showroom Demo Builder** (🟡 Midden waarde)
Agent 1 (BIM data prep), Agent 2 (frontend), Agent 3 (ERPNext integratie) → Samenvoegen tot werkende demo.

**Nightly Build & Test** (🟣 Toekomst)
Cron job → test agents op alle modules → rapport verschijnt 's ochtends.

---

## 13. Proof of Concept Plan

### Fase 1 — Minimale werking (1-2 dagen)

Bewijs dat je een Claude Code sessie kunt starten in een temp folder via tmux, en output kunt ophalen.

- [ ] Handmatig CLAUDE.md schrijven met simpele taak
- [ ] Temp folder aanmaken, claude starten, verifiëren dat CLAUDE.md wordt opgepakt
- [ ] Output ophalen uit workspace
- [ ] `--dangerously-skip-permissions` flag testen

### Fase 2 — Orchestrator basics (2-3 dagen)

Bash-script dat meerdere agents kan spawnen en output verzamelen.

- [ ] `spawn_agent.sh`, `check_agent.sh`, `kill_agent.sh` scripts
- [ ] Workspace-builder die CLAUDE.md genereert
- [ ] Simpele orchestrator: 2 agents sequentieel
- [ ] Sentinel file detectie

### Fase 3 — Claude Code als orchestrator (3-5 dagen)

De orchestrator zelf is een Claude Code sessie.

- [ ] Orchestrator CLAUDE.md met beschikbare tools
- [ ] Zelf bepalen hoeveel agents nodig zijn
- [ ] Parallelle executie met wacht-logica
- [ ] Output combinatie en rapportage

### Fase 4 — Productie-hardening (ongoing)

- [ ] Error recovery en retry
- [ ] Rate limit awareness en queue
- [ ] Logging en auditability
- [ ] Workspace templates
- [ ] ERPNext integratie

---

## 14. Alle Todo's

### Research & Validatie

- [ ] 🔴 **Anthropic ToS verificatie** — Is multi-sessie automation op consumer/Max subscription toegestaan? Eventueel contact met support.
- [ ] 🔴 **Concurrency limits testen** — Hoeveel gelijktijdige Claude Code sessies? Test met 2, 3, 5, 10. Meet rate limiting.
- [ ] 🔴 **Claude Code auth in Docker testen** — Werkt `~/.claude/` mount? (Alleen relevant als we Docker gaan gebruiken.)
- [ ] 🟠 **CLAUDE.md autoload verifiëren** — Bevestig dat Claude Code automatisch CLAUDE.md oppakt bij start. Test met `--dangerously-skip-permissions`.
- [ ] 🟡 **Bestaande orchestrators onderzoeken** — GitHub/HN/Reddit: heeft iemand tmux+Claude Code orchestratie gebouwd?

### Proof of Concept

- [ ] 🟠 **Base temp folder + Claude Code test** — Simpelste mogelijke flow end-to-end
- [ ] 🟠 **spawn/check/kill agent scripts** — Basis lifecycle management
- [ ] 🟠 **Workspace builder script** — Gegeven taak-JSON → temp dir met CLAUDE.md
- [ ] 🟠 **Eerste end-to-end test** — "maak een hello world script" door hele systeem
- [ ] 🟡 **Multi-agent pipeline test** — Agent 1 schrijft code, Agent 2 tests ervoor

### Tmux UI & Monitoring

- [ ] 🟠 **setup-control-session.sh** — Permanente missiecontrole session met dashboard/queue/resources/logs windows
- [ ] 🟠 **create-project-session.sh** — Dynamisch per taakgroep: overview panes + fullscreen agent windows + file watcher + interventie terminal
- [ ] 🟠 **agent-status-board.sh** — Tabel van alle agents: status, runtime, health, taaknaam
- [ ] 🟡 **pipeline-view.sh** — ASCII dependency graph met kleuren
- [ ] 🟡 **rate-limit-meter.sh** — Progress bar subscription usage
- [ ] 🟢 **colorize-events.sh** — Event feed met kleurcodes (groen/blauw/rood/geel)
- [ ] 🟡 **Custom .tmux.conf** — Keybindings: Prefix+D (dashboard), Prefix+Q (queue), Prefix+L (logs), Prefix+K (kill), Prefix+N (spawn)
- [ ] 🟣 **Drill-down navigatie** — Dashboard → agent fullscreen doorlink
- [ ] 🟣 **Python TUI met textual/rich** — Fase 4+ upgrade van bash watch-scripts

### Orchestrator Development

- [ ] 🟠 **Orchestrator CLAUDE.md ontwerpen** — Meta-prompt met tools, workflow, constraints
- [ ] 🟡 **Taakdecompositie logica** — Template-based of AI-gestuurd?
- [ ] 🟡 **Queue systeem** — FIFO queue die agents spawnt bij vrije capacity
- [ ] 🟡 **Error recovery & retry** — Timeout, crash, onzin-output afhandeling

### Workspace Templates

- [ ] 🟠 **Template: ERPNext module development** — Frappe docs + coding standards + app structuur
- [ ] 🟡 **Template: Code review agent** — Security/performance/quality checklist + rapport-format
- [ ] 🟡 **Template: Documentatie generator** — Impertio stijlgids + output format
- [ ] 🟢 **Template: Test schrijver** — Code als input, tests als output

### Integratie & Productie

- [ ] 🟣 **ERPNext todo-systeem koppeling** — Taken triggeren vanuit ERPNext, resultaten terugschrijven
- [ ] 🟣 **GitHub Actions integratie** — PR → code review agents → PR comment
- [ ] 🟡 **Monitoring & logging framework** — Centraal logging, metrics, success/failure tracking
- [ ] 🟢 **Gespecialiseerde Docker images** — ERPNext/Frontend/Docs agents (alleen als Docker nodig blijkt)
- [ ] 🟣 **TOTP proxy integratie** — Agents aanspreken externe services via TOTP proxy

### Kennisopbouw

- [ ] 🟠 **Documenteer PoC learnings** — Wat werkt, wat niet, aannames die niet klopten
- [ ] 🟡 **CLAUDE.md best practices guide** — Format, lengte, specificiteit, do's en don'ts
- [ ] 🟠 **Presentatie voor Maarten** — Werkende demo + hoe het past in OpenAgents visie

---

## 15. Open Vragen

1. **Subscription compliance** — Is geautomatiseerd multi-instance gebruik op Max subscription toegestaan?
2. **Concurrency plafond** — Wat is het praktische maximum aan gelijktijdige Claude Code sessies?
3. **Claude Code headless mode** — Kan het volledig non-interactief draaien met CLAUDE.md + `-p` flag?
4. **Output kwaliteit** — Levert gefocuste CLAUDE.md + minimale workspace betere output dan één sessie met veel context? (Kernhypothese.)
5. **Transition path naar API** — Hoe makkelijk is het om CLI laag te vervangen door API calls als het systeem groeit?
6. **Combinatie met bestaande tools** — Hoe verhoudt dit zich tot de Pi.dev integratie? Naast elkaar of vervangend?
7. **Docker nodig?** — Is temp folder isolatie goed genoeg, of lopen agents toch in elkaars vaarwater?

---

## 16. Bronnen & Referenties

| Bron | Relevantie |
|---|---|
| [Claude Code Documentatie](https://docs.anthropic.com/en/docs/claude-code) | CLI flags, CLAUDE.md specificatie |
| [Tmux Wiki](https://github.com/tmux/tmux/wiki) | Programmatische operaties, scripting |
| [Docker Documentation](https://docs.docker.com/) | Containers, volumes, secrets (voor later) |
| Impertio TOTP Proxy Guide (project knowledge) | Bestaande auth-architectuur |
| OpenAgents concept notes (intern) | Oorspronkelijke multi-agent visie |
| [Anthropic Terms of Service](https://www.anthropic.com/terms) | Compliance check |

---

*Impertio Studio B.V. — Claude Code Agentic Layer Research*
*Eigenaar: freek@impertio.nl*
*Gegenereerd: 2 maart 2026 — Levend document*
