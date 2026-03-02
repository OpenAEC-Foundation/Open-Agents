# Product Design Sprint — Open Agents CLI als Installeerbare Applicatie

> **Versie**: 1.0
> **Datum**: 2026-03-02
> **Auteur**: Product Design Agent
> **Scope**: Van developer tool naar installeerbaar product
> **Tijdlijn**: 1-2 weken, 1 persoon

---

## Inhoudsopgave

1. [Executive Summary](#1-executive-summary)
2. [Huidige Staat Analyse](#2-huidige-staat-analyse)
3. [Gap Analyse](#3-gap-analyse)
4. [Architectuur: Nieuwe UX](#4-architectuur-nieuwe-ux)
5. [Migratie Pad](#5-migratie-pad)
6. [Sprint Plan](#6-sprint-plan)
7. [Risico's en Beperkingen](#7-risicos-en-beperkingen)
8. [Bijlage: Technische Details](#8-bijlage-technische-details)

---

## 1. Executive Summary

**oa-cli** is een krachtige multi-agent orchestrator die via tmux meerdere Claude Code sessies beheert. Het werkt goed als developer tool, maar is **niet installeerbaar als product** voor eindgebruikers. De kern van het probleem:

| Aspect | Nu | Gewenst |
|--------|-----|---------|
| Installatie | `git clone` + `pip install -e .` + tmux + claude CLI | `pipx install open-agents-cli` |
| Eerste gebruik | `oa start` → handmatig tmux → `oa run "taak"` | `oa start` → praat direct met Claude |
| Agent management | Handmatig: run, status, collect, kill | Automatisch: agents spawnen op de achtergrond |
| Monitoring | `oa status` of `oa dashboard` (tmux vereist) | Web dashboard dat altijd beschikbaar is |
| Kennis vereist | tmux, CLI, agent concepten | Geen — gewoon praten |

**Kernvraag**: Kunnen we de tmux-dependency elimineren?

**Eerlijk antwoord**: **Nee, niet volledig.** tmux is de runtime die Claude Code sessies isoleert en parallel draait. Maar we kunnen tmux **onzichtbaar** maken — de gebruiker hoeft er niets van te weten.

---

## 2. Huidige Staat Analyse

### 2.1 Codebase Overzicht

| Module | LOC | Functie | Behouden? |
|--------|-----|---------|-----------|
| `cli.py` | 369 | 14 typer commands | Uitbreiden |
| `orchestrator.py` | 498 | tmux agent lifecycle (spawn, check, kill) | Behouden (core) |
| `state.py` | 206 | JSON CRUD in `~/.oa/agents.json` | Behouden |
| `workspace.py` | 99 | Temp dir + CLAUDE.md generator | Behouden |
| `pipeline.py` | 260 | Planner → subtasks → combiner | Behouden |
| `bridge.py` | 230 | Flask REST API voor web UI | Behouden + uitbreiden |
| `monitor.py` | 137 | Rich status table | Behouden |
| `dashboard.py` | 440 | Textual TUI | Behouden (optioneel) |
| `__init__.py` | 3 | Versie | Behouden |
| **Web UI** | 1611 | React SPA (monoliet App.tsx) | Behouden |
| **Tests** | 798 | pytest (3 modules) | Behouden + uitbreiden |
| **Totaal** | ~4650 | | |

### 2.2 Dependencies

```
typer>=0.12      — CLI framework
rich>=13.0       — Terminal formatting
textual>=0.80    — TUI dashboard
flask>=3.0       — Web bridge
flask-cors>=5.0  — CORS voor React dev
```

### 2.3 Externe Vereisten (niet in Python)

| Vereiste | Status | Platform |
|----------|--------|----------|
| **tmux** | Hard dependency | Linux/macOS (niet Windows native) |
| **claude** CLI | Hard dependency | Vereist Claude Code subscription |
| **Python 3.10+** | Hard dependency | Breed beschikbaar |
| **ollama.exe** | Optioneel (WSL-specifiek) | Windows/WSL |

### 2.4 Wat Werkt Goed

- **Proposal mode**: Veilige sandbox — agents wijzigen nooit bestanden buiten workspace
- **Hiërarchische spawning**: Parent/child relaties met diepte- en taak-duplicatie checks
- **Pipeline**: Automatische planner → workers → combiner flow
- **Delegate mode**: Orchestrator agent die zelf workers spawnt
- **Web UI**: Real-time agent monitoring met tree view
- **State management**: Simpel maar effectief JSON-based

### 2.5 Wat Ontbreekt

- Geen interactief gesprek — je kunt niet "praten" met het systeem
- Geen `oa start` → direct bruikbaar ervaring
- Geen automatische tmux installatie/detectie
- Geen first-run setup wizard
- Geen error recovery (agent crasht → handmatig opruimen)
- Geen notifications (agent klaar → geen signaal)
- Monolithische React SPA (1611 LOC in één bestand)

---

## 3. Gap Analyse

### 3.1 Van Dev-Tool naar Product: De 7 Gaps

#### GAP 1: Installatie — "Het werkt niet op mijn machine"
**Nu**: Gebruiker moet tmux, claude CLI, Python 3.10+ handmatig installeren.
**Nodig**: `pipx install open-agents-cli` → automatische dependency check + instructies.
**Moeite**: **S** — Pre-flight check toevoegen, geen tmux bundelen.

#### GAP 2: First-Run Experience — "Wat moet ik nu doen?"
**Nu**: Geen onboarding. Gebruiker moet `oa start`, dan `oa run "taak"`.
**Nodig**: `oa start` opent interactieve sessie, detecteert setup-issues, begeleidt.
**Moeite**: **M** — Setup wizard + interactive chat loop toevoegen.

#### GAP 3: Interactive Chat — "Ik wil gewoon praten"
**Nu**: Elke taak = apart commando (`oa run "doe X"`). Geen conversatie.
**Nodig**: `oa start` opent een chat-achtige interface waar je vrij typt.
**Moeite**: **L** — Nieuw interactie-paradigma, maar kan simpel beginnen.

#### GAP 4: Automatisch Agent Management — "Ik wil niet handmatig monitoren"
**Nu**: Gebruiker moet `oa status` pollen, `oa collect` uitvoeren.
**Nodig**: Agents starten, monitoren, en resultaten tonen automatisch.
**Moeite**: **M** — Background poller + notification system.

#### GAP 5: Error Handling & Recovery — "Het crashte en nu?"
**Nu**: Crashed agent = `error` status, handmatig `oa clean`.
**Nodig**: Auto-retry, graceful degradation, duidelijke error messages.
**Moeite**: **M** — Retry logic + cleanup daemon.

#### GAP 6: Cross-Platform — "Ik gebruik Windows"
**Nu**: tmux = Linux/macOS only. WSL workaround met `ollama.exe`.
**Nodig**: Minimaal: duidelijk communiceren dat tmux vereist is. Ideaal: alternatieve runtime.
**Moeite**: **XL** (alternatieve runtime) of **S** (documentatie + checks)

#### GAP 7: Web Dashboard als Standalone — "Ik wil het in mijn browser"
**Nu**: `oa web` start Flask + serveert pre-built React SPA.
**Nodig**: Dashboard dat ook zonder CLI commando's bruikbaar is (spawnen, monitoren, collecten).
**Moeite**: **S** — Web UI kan al het meeste, needs polish.

### 3.2 Prioritering

```
                    Impact
                    High ┃ GAP 3    GAP 2
                         ┃ (chat)   (first-run)
                         ┃
                         ┃ GAP 4    GAP 1
                    Med  ┃ (auto)   (install)
                         ┃
                         ┃ GAP 5    GAP 7
                    Low  ┃ (errors) (web)
                         ┃
                         ┗━━━━━━━━━━━━━━━━━━
                           Hard     Easy
                                Effort
```

**MVP volgorde**: GAP 1 → GAP 2 → GAP 3 → GAP 4 → GAP 7 → GAP 5

GAP 6 (cross-platform) is een **bewuste keuze om uit te stellen** — tmux is de kern.

---

## 4. Architectuur: Nieuwe UX

### 4.1 User Journey: Install → Setup → Use

```
┌─────────────────────────────────────────────────────┐
│  STAP 1: INSTALLATIE                                 │
│                                                      │
│  $ pipx install open-agents-cli                      │
│  ✓ open-agents-cli geïnstalleerd                     │
│                                                      │
│  $ oa start                                          │
│                                                      │
├─────────────────────────────────────────────────────┤
│  STAP 2: SETUP (automatisch, eenmalig)               │
│                                                      │
│  ✓ Python 3.10+ gevonden                             │
│  ✓ tmux gevonden (v3.4)                              │
│  ✓ claude CLI gevonden                               │
│  ✓ Claude abonnement actief                          │
│  ✗ Geen tmux? → "brew install tmux" / "apt install"  │
│  ✗ Geen claude? → "npm install -g @anthropic/cli"    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Open Agents v0.2.0                          │    │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │    │
│  │                                              │    │
│  │  Welkom! Ik ben je agent orchestrator.       │    │
│  │  Vertel me wat je wilt doen, en ik verdeel   │    │
│  │  het werk over meerdere agents.              │    │
│  │                                              │    │
│  │  Tips:                                       │    │
│  │  • "Refactor de auth module" → spawn agents  │    │
│  │  • "oa web" → open dashboard in browser      │    │
│  │  • Ctrl-C → terug naar terminal              │    │
│  │                                              │    │
│  │  > _                                         │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
├─────────────────────────────────────────────────────┤
│  STAP 3: GEBRUIK                                     │
│                                                      │
│  > Refactor de authentication module naar JWT         │
│                                                      │
│  ⟳ Planning... (1 agent)                             │
│  ✓ Plan klaar: 3 subtaken                            │
│    1. auth-models → Schema's updaten                 │
│    2. auth-routes → JWT endpoints                    │
│    3. auth-tests → Test suite                        │
│                                                      │
│  ⟳ 3 agents gestart...                              │
│  ✓ auth-models klaar (2m34s)                         │
│  ✓ auth-routes klaar (4m12s)                         │
│  ⟳ auth-tests bezig... (3m)                          │
│                                                      │
│  ✓ Alle agents klaar!                                │
│                                                      │
│  Resultaat:                                          │
│  3 proposals geschreven. Review met 'oa review'      │
│  of bekijk in de web UI: http://localhost:5174        │
│                                                      │
│  > _                                                 │
└─────────────────────────────────────────────────────┘
```

### 4.2 Architectuur Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     GEBRUIKER                                 │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ oa start    │  │ oa run "..."  │  │ oa web           │    │
│  │ (chat mode) │  │ (direct mode) │  │ (browser mode)   │    │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘    │
│         │                │                    │               │
├─────────┴────────────────┴────────────────────┴──────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                ORCHESTRATOR LAYER (nieuw)                │ │
│  │                                                         │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │ Preflight│  │ Chat Loop    │  │ Auto-Manager     │  │ │
│  │  │ Checks   │  │ (REPL)       │  │ (background)     │  │ │
│  │  └──────────┘  └──────────────┘  └──────────────────┘  │ │
│  │                                                         │ │
│  │  Nieuw: setup wizard, interactive chat, auto-monitoring │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                 │
├─────────────────────────────┴────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              BESTAANDE CORE (behouden)                   │ │
│  │                                                         │ │
│  │  orchestrator.py  state.py  workspace.py  pipeline.py   │ │
│  │  bridge.py  monitor.py  dashboard.py                    │ │
│  │                                                         │ │
│  │  Bewezen: tmux lifecycle, state, workspace, pipeline    │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                 │
├─────────────────────────────┴────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              RUNTIME LAAG (onveranderd)                  │ │
│  │                                                         │ │
│  │    tmux session "oa"                                    │ │
│  │    ├── window: dashboard                                │ │
│  │    ├── window: agent-planner                            │ │
│  │    ├── window: agent-worker-1                           │ │
│  │    └── window: agent-worker-2                           │ │
│  │                                                         │ │
│  │    Elke window: claude CLI met --dangerously-skip-perms │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Nieuwe Modules

| Module | Doel | LOC (geschat) |
|--------|------|---------------|
| `preflight.py` | Dependency checks (tmux, claude, python) | ~80 |
| `chat.py` | Interactive REPL met Rich formatting | ~200 |
| `auto_manager.py` | Background agent monitoring + notifications | ~150 |
| `setup.py` (uitbreiding cli.py) | First-run wizard + config | ~60 |

**Totaal nieuw**: ~490 LOC
**Totaal bestaand**: ~4650 LOC
**Resultaat**: ~5140 LOC — beheersbaar voor 1 persoon.

---

## 5. Migratie Pad

### 5.1 Wat Behouden

| Component | Waarom |
|-----------|--------|
| `orchestrator.py` | Kern van het systeem. tmux lifecycle werkt. |
| `state.py` | Simpel, betrouwbaar. JSON is goed genoeg. |
| `workspace.py` | CLAUDE.md generator + proposal mode is uniek. |
| `pipeline.py` | Planner → workers → combiner is bewezen. |
| `bridge.py` | REST API voor web UI werkt. |
| `monitor.py` | Rich table formatting is handig. |
| `dashboard.py` | Textual TUI voor power users. |
| `web/` | React SPA werkt, hoeft niet herschreven. |
| `tests/` | 3 test modules met goede dekking. |

### 5.2 Wat Moet Veranderen

| Component | Verandering | Waarom |
|-----------|-------------|--------|
| `cli.py` | `oa start` → interactieve chat i.p.v. alleen tmux session | Kern UX verandering |
| `cli.py` | `oa setup` → dependency check commando | Eerste gebruik |
| `orchestrator.py` | `start_session()` → inclusief preflight checks | Robuustheid |
| `pyproject.toml` | Extra dependency: `prompt_toolkit` of `questionary` | Chat input |

### 5.3 Wat Is Nieuw

| Component | Beschrijving |
|-----------|-------------|
| `preflight.py` | Check tmux, claude, python versies. Geef installatie-instructies. |
| `chat.py` | Interactive REPL: gebruiker typt → systeem plant → agents spawnen → resultaat tonen |
| `auto_manager.py` | Background thread die agents monitort, status updates geeft, opruimt |

### 5.4 Wat Kan Weg

| Component | Waarom |
|-----------|--------|
| `OLLAMA_CMD = "ollama.exe"` | WSL-specifiek, niet relevant voor product. Maak configureerbaar. |
| Hardcoded `unset CLAUDECODE` | Opruimen — in config of auto-detectie |

---

## 6. Sprint Plan

### Sprint 0: Preflight & Setup (Dag 1-2) — **Size S**

**Doel**: `pipx install open-agents-cli` werkt, `oa setup` checkt dependencies.

**Taken**:

1. **pyproject.toml updaten**
   - Voeg `classifiers`, `readme`, `license`, `urls` toe
   - Voeg `prompt_toolkit` dependency toe
   - Voeg `questionary` dependency toe (optioneel, voor setup wizard)
   - Versie → `0.2.0`

2. **`preflight.py` schrijven** (~80 LOC)
   ```python
   def check_tmux() -> tuple[bool, str]:
       """Check of tmux beschikbaar is. Geeft (ok, message)."""

   def check_claude_cli() -> tuple[bool, str]:
       """Check of claude CLI beschikbaar is."""

   def check_all() -> list[tuple[str, bool, str]]:
       """Run alle checks. Geeft [(name, ok, message), ...]."""

   def print_setup_report():
       """Print mooie Rich tabel met check resultaten."""
   ```

3. **`oa setup` commando toevoegen** aan cli.py
   - Runt `check_all()`
   - Print instructies voor ontbrekende dependencies
   - Slaat configuratie op in `~/.oa/config.json`

4. **`oa start` updaten**
   - Bij eerste keer: automatisch `check_all()` uitvoeren
   - Bij ontbrekende deps: duidelijke foutmelding i.p.v. cryptische tmux errors

**Definition of Done**: `pipx install .` werkt, `oa setup` toont groene checks.

---

### Sprint 1: Interactive Chat Mode (Dag 3-5) — **Size M**

**Doel**: `oa start` opent een interactieve chat waar je taken kunt invoeren.

**Taken**:

1. **`chat.py` schrijven** (~200 LOC)
   ```python
   class ChatSession:
       """Interactive REPL voor agent orchestratie."""

       def start(self):
           """Start de chat loop."""
           self.show_welcome()
           while True:
               user_input = self.prompt()
               if user_input in ("/quit", "/exit"):
                   break
               self.handle_input(user_input)

       def handle_input(self, text: str):
           """Verwerk user input: direct run of pipeline."""
           if self.is_complex_task(text):
               self.run_as_pipeline(text)
           else:
               self.run_single_agent(text)

       def run_single_agent(self, task: str):
           """Spawn een agent en wacht op resultaat."""
           name = generate_name(task)
           rec = spawn_agent(name, task)
           self.show_progress(rec)
           self.show_result(rec)

       def run_as_pipeline(self, task: str):
           """Run via pipeline met live voortgang."""
           # Hergebruik bestaande pipeline.py

       def show_progress(self, rec):
           """Toon live progress met Rich spinners."""
   ```

2. **`oa start` herschrijven** in cli.py
   ```python
   @app.command()
   def start(
       chat: bool = typer.Option(True, "--chat/--no-chat", help="Start in interactive mode"),
   ):
       """Start Open Agents. Default: interactive chat mode."""
       from .preflight import check_all
       from .chat import ChatSession

       # Preflight
       issues = [(n, ok, m) for n, ok, m in check_all() if not ok]
       if issues:
           # Toon problemen en exit
           ...
           raise typer.Exit(1)

       # Ensure tmux session
       start_session()

       if chat:
           ChatSession().start()
       else:
           console.print("[green]Session 'oa' started.[/green]")
   ```

3. **Chat commando's** (slash commands in de chat)
   - `/status` — toon agent status tabel
   - `/web` — open web dashboard
   - `/agents` — lijst agents
   - `/kill <name>` — kill agent
   - `/collect <name>` — toon output
   - `/review <name>` — toon proposals
   - `/quit` — exit

4. **Live progress** in de chat
   - Rich `Spinner` tijdens agent uitvoering
   - Status updates wanneer agents klaar zijn
   - Resultaat samenvatting na completion

**Definition of Done**: `oa start` → welkomsbericht → taak intikken → agent spawnt → resultaat verschijnt.

---

### Sprint 2: Auto-Manager (Dag 6-7) — **Size M**

**Doel**: Background monitoring zodat de chat weet wanneer agents klaar zijn.

**Taken**:

1. **`auto_manager.py` schrijven** (~150 LOC)
   ```python
   class AgentManager:
       """Background thread die agents monitort."""

       def __init__(self, on_agent_done: Callable, on_agent_error: Callable):
           self._running = True
           self._thread = Thread(target=self._poll_loop, daemon=True)

       def start(self):
           self._thread.start()

       def stop(self):
           self._running = False

       def _poll_loop(self):
           while self._running:
               for rec in list_agents(status="running"):
                   new_status = check_agent(rec.name)
                   if new_status != "running":
                       if new_status == "done":
                           self.on_agent_done(rec)
                       else:
                           self.on_agent_error(rec, new_status)
               time.sleep(3)
   ```

2. **Integratie met ChatSession**
   - AgentManager draait als daemon thread
   - Callbacks printen status updates in de chat
   - Automatische cleanup van crashed agents

3. **Notificatie systeem**
   - Terminal bell (`\a`) bij agent completion
   - Rich formatted status update in chat output

**Definition of Done**: Agent klaar → melding verschijnt automatisch in chat.

---

### Sprint 3: Polish & Web Dashboard (Dag 8-10) — **Size M**

**Doel**: Afwerking, web dashboard verbetering, docs.

**Taken**:

1. **Web Dashboard verbetering**
   - "Spawn Agent" form beter zichtbaar maken
   - Auto-refresh interval verlagen (2s → 1s)
   - Notification dot bij nieuwe completed agents

2. **Error handling**
   - Graceful shutdown bij Ctrl-C (cleanup tmux sessions optioneel)
   - Auto-retry bij tmux session loss
   - Duidelijke foutmeldingen bij common issues

3. **Documentatie**
   - README.md voor PyPI
   - `oa --help` verbeteren met voorbeelden
   - `oa start` welkomstekst met tips

4. **Packaging**
   - Testen op schone omgeving
   - `pipx install .` → alles werkt
   - Web assets bundelen in package (dist/ in sdist)

5. **Config file**
   - `~/.oa/config.json` voor:
     - Default model (claude/sonnet, claude/opus)
     - Web UI poort
     - Auto-cleanup toggle
     - Ollama binary path (voor WSL of native)

**Definition of Done**: Clean install op nieuwe machine, `oa start` → chat → pipeline → resultaat.

---

### Sprint 4: Testing & Release (Dag 11-12) — **Size S**

**Taken**:

1. **Tests uitbreiden**
   - `test_preflight.py` — dependency check tests
   - `test_chat.py` — chat input parsing, slash commands
   - `test_auto_manager.py` — callback tests met mocks

2. **Integration test**
   - Handmatige test op:
     - Ubuntu 22.04 (native)
     - macOS (met Homebrew tmux)
     - WSL2 (bestaande setup)

3. **Release**
   - Version bump naar 0.2.0
   - PyPI upload via `python -m build && twine upload`
   - GitHub release notes

---

### Sprint Overzicht

| Sprint | Naam | Doel | Size | Dagen |
|--------|------|------|------|-------|
| 0 | Preflight & Setup | Installatie + dependency checks | S | 1-2 |
| 1 | Interactive Chat | `oa start` → praat met systeem | M | 3-5 |
| 2 | Auto-Manager | Background monitoring | M | 6-7 |
| 3 | Polish & Web | UX afwerking, docs, packaging | M | 8-10 |
| 4 | Testing & Release | Tests + release naar PyPI | S | 11-12 |

**Totaal**: ~12 werkdagen, 1 persoon.

---

## 7. Risico's en Beperkingen

### 7.1 Harde Beperkingen

| Beperking | Impact | Mitigatie |
|-----------|--------|-----------|
| **tmux is vereist** | Geen native Windows support. Mac/Linux only. | Duidelijk communiceren in README en `oa setup`. WSL2 als Windows workaround documenteren. |
| **claude CLI is vereist** | Zonder Claude Code subscription geen agents. | `oa setup` checkt beschikbaarheid. Foutmelding wijst naar installatie-instructies. |
| **`--dangerously-skip-permissions`** | Security concern — agents hebben volledige file access. | Proposal mode compenseert: agents schrijven proposals, niet direct. Documenteer risico. |
| **Temp directories als workspaces** | Workspaces verdwijnen bij reboot. | `oa clean` en auto-cleanup. Overweeg persistente workspace optie voor v0.3. |

### 7.2 Technische Risico's

| Risico | Kans | Impact | Mitigatie |
|--------|------|--------|-----------|
| **tmux versie-incompatibiliteit** | Laag | Hoog | `oa setup` checkt minimum versie. Tests op tmux 3.2+. |
| **Claude CLI API changes** | Medium | Hoog | Abstractie laag in orchestrator.py. Prompt format is stabiel. |
| **Race conditions in state.json** | Medium | Medium | Bestaand probleem. File locking toevoegen in v0.3. |
| **Grote taken → te veel agents** | Medium | Medium | MAX_SUBTASKS=10 limiet. Orchestrator depth limit=5. |
| **Chat mode blokkeert terminal** | Laag | Laag | Background thread voor monitoring. Ctrl-C exit werkt. |

### 7.3 Product Risico's

| Risico | Kans | Impact | Mitigatie |
|--------|------|--------|-----------|
| **Gebruiker snapt concept niet** | Medium | Hoog | Goede onboarding tekst. Voorbeelden in welkomstscherm. |
| **Agents produceren slechte output** | Medium | Medium | Proposal mode als safety net. Review flow is ingebouwd. |
| **Performance bij veel agents** | Laag | Medium | tmux schaalt goed. JSON state kan bottleneck worden bij 50+ agents — SQLite overwegen voor v0.3. |

### 7.4 Wat We Bewust NIET Doen

1. **Geen tmux vervangen** — Het is de enige manier om parallel Claude CLI sessies te draaien zonder de process model te herschrijven. Alternatief (subprocess.Popen) verliest terminal capabilities die Claude CLI nodig heeft.

2. **Geen GUI installer** — We richten ons op `pipx install`. GUI installers zijn overengineering voor deze doelgroep (developers met CLI ervaring).

3. **Geen multi-user** — Eén gebruiker, één machine. Multi-tenant is Sprint 15+ scope.

4. **Geen cloud deployment** — Lokaal draaien is de kern. Cloud kan later via Docker (Sprint 13).

5. **Geen Windows native** — WSL2 is de Windows strategie. Native Windows tmux bestaat niet.

---

## 8. Bijlage: Technische Details

### 8.1 Preflight Check Implementatie

```python
# preflight.py — geschatte implementatie

import shutil
import subprocess
from dataclasses import dataclass

@dataclass
class CheckResult:
    name: str
    ok: bool
    message: str
    fix_hint: str = ""

def check_tmux() -> CheckResult:
    path = shutil.which("tmux")
    if not path:
        return CheckResult(
            "tmux", False, "tmux not found",
            fix_hint="Install: brew install tmux (macOS) or apt install tmux (Ubuntu)"
        )
    # Check version
    result = subprocess.run(["tmux", "-V"], capture_output=True, text=True)
    version = result.stdout.strip()
    return CheckResult("tmux", True, f"tmux found: {version}")

def check_claude() -> CheckResult:
    path = shutil.which("claude")
    if not path:
        return CheckResult(
            "claude", False, "claude CLI not found",
            fix_hint="Install: npm install -g @anthropic-ai/claude-code"
        )
    return CheckResult("claude", True, f"claude CLI found at {path}")

def check_python() -> CheckResult:
    import sys
    v = sys.version_info
    ok = v >= (3, 10)
    return CheckResult(
        "python", ok,
        f"Python {v.major}.{v.minor}.{v.micro}",
        fix_hint="Python 3.10+ required" if not ok else ""
    )
```

### 8.2 Chat REPL Concept

```python
# chat.py — geschatte implementatie (kern)

from prompt_toolkit import PromptSession
from prompt_toolkit.history import FileHistory
from rich.console import Console
from rich.spinner import Spinner
from rich.live import Live

class ChatSession:
    def __init__(self):
        self.console = Console()
        self.prompt_session = PromptSession(
            history=FileHistory(str(Path.home() / ".oa" / "chat_history"))
        )
        self.manager = AgentManager(
            on_agent_done=self._on_done,
            on_agent_error=self._on_error,
        )

    def start(self):
        self._show_welcome()
        self.manager.start()

        try:
            while True:
                try:
                    text = self.prompt_session.prompt("oa> ")
                except EOFError:
                    break

                text = text.strip()
                if not text:
                    continue
                if text.startswith("/"):
                    self._handle_slash(text)
                else:
                    self._handle_task(text)
        finally:
            self.manager.stop()

    def _handle_task(self, task: str):
        name = generate_name(task)
        with Live(Spinner("dots", text=f"Starting agent '{name}'..."),
                  console=self.console):
            rec = spawn_agent(name, task)

        self.console.print(f"[green]Agent '{name}' started[/green]")
        self.console.print(f"[dim]Working on: {task}[/dim]")
        self.console.print(f"[dim]Use /status to check progress[/dim]")
```

### 8.3 Backwards Compatibility

Alle bestaande commando's blijven werken:

| Commando | Nu | Na migratie |
|----------|-----|-------------|
| `oa start` | Start tmux session | Start chat mode (--no-chat voor alleen tmux) |
| `oa run "taak"` | Spawn agent | Onveranderd |
| `oa status` | Show status table | Onveranderd |
| `oa dashboard` | Open TUI | Onveranderd |
| `oa web` | Start web UI | Onveranderd |
| `oa pipeline "taak"` | Run pipeline | Onveranderd |
| `oa delegate "taak"` | Spawn orchestrator | Onveranderd |
| `oa collect <name>` | Show output | Onveranderd |
| `oa review <name>` | Show proposals | Onveranderd |
| `oa apply <name>` | Apply proposals | Onveranderd |
| `oa kill <name>` | Kill agent | Onveranderd |
| `oa clean` | Cleanup | Onveranderd |
| `oa version` | Show version | Onveranderd |
| **`oa setup`** | *nieuw* | Dependency checks |

---

## Conclusie

Dit plan transformeert oa-cli van een power-user developer tool naar een installeerbaar product, in 4 sprints over ~12 dagen. De kern aanpak:

1. **Behoud wat werkt** — De bestaande 4650 LOC is solide en bewezen.
2. **Voeg een laag toe** — ~490 LOC nieuwe code voor UX (preflight, chat, auto-manager).
3. **Verberg complexiteit** — tmux draait op de achtergrond, gebruiker ziet alleen de chat.
4. **Wees eerlijk** — tmux en claude CLI blijven harde dependencies.

Het resultaat: `pipx install open-agents-cli && oa start` → direct aan de slag.
