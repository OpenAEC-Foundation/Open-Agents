# Session Persistence — Agent Orchestratie Plan

> **Status**: ONTWERP — alle agents, prompts en volgorde uitgedacht
> **Datum**: 2026-03-11
> **Doel**: Volledig delegatieplan zodat we agents kunnen spawnen die het werk doen
> **Referentie**: SESSION-PERSISTENCE-MASTERPLAN-RAW.md

---

## Overzicht: De Pipeline

```
FASE 1: RESEARCH (3 agents parallel)
   ├── researcher-platform     → Q1, Q4, Q6 (Windows/tmux/fcntl)
   ├── researcher-architecture  → Q2, Q3, Q7, Q8, Q9, Q10
   └── researcher-ux           → Q11, Q12 + competitive analysis
   │
   ▼ Quality gate: alle Q's beantwoord?

FASE 2: CORE DOCS VULLEN (2 agents parallel)
   ├── writer-decisions        → D-055 + D-056 in DECISIONS.md
   └── writer-roadmap          → Sprint 19 entry in ROADMAP.md + MASTERPLAN.md
   │
   ▼ Quality gate: docs consistent?

FASE 3: MASTERPLAN REFINED (1 agent)
   └── engineer-masterplan     → Masterplan verfijnen met research resultaten
   │
   ▼ Quality gate: masterplan review

FASE 4: ENGINEERING (2 agents parallel)
   ├── engineer-schema         → Session record schema + config schema
   └── engineer-architecture   → Module design, interfaces, flow diagrams
   │
   ▼ Quality gate: design review

FASE 5: IMPLEMENTATIE (3-4 agents per batch, meerdere batches)
   Batch 1:
   ├── impl-session-store      → ~/.oa/sessions/ CRUD
   ├── impl-snapshot           → State snapshot functie
   └── impl-periodic-checkpoint → Uitbreiding checkpoint.py

   Batch 2:
   ├── impl-tmux-hooks         → client-detached hook registratie
   ├── impl-shutdown-flow      → oa stop enhanced
   └── impl-resume-flow        → oa start enhanced

   Batch 3:
   ├── impl-notifications      → Desktop notificaties
   ├── impl-config             → Config uitbreiding
   └── impl-git-integration    → Git stash/status bij shutdown
   │
   ▼ Quality gate per batch

FASE 6: TESTING & REVIEW (2 agents)
   ├── tester-unit             → Unit tests voor alle nieuwe modules
   └── reviewer-integration    → Integratie review, edge cases
   │
   ▼ Quality gate: tests groen?

FASE 7: DOCUMENTATIE (1 agent)
   └── writer-docs             → README updates, CHANGELOG, HANDOFF
```

**Totaal: ~15-17 agents over 7 fases**

---

## FASE 1: RESEARCH

### Agent: researcher-platform

**Rol**: Platform-specifiek onderzoek — hoe werkt tmux op Windows, fcntl alternatieven, desktop notificaties.

```bash
oa run 'Je bent een PLATFORM RESEARCHER.

## Input
Lees het masterplan raw:
/mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN-RAW.md

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/platform-research.md

## Scope
Beantwoord deze drie vragen met concrete, geteste antwoorden:

### Q1: tmux client-detached hook op Windows
- Werkt `tmux set-hook client-detached` in WSL2?
- Werkt het in Git Bash (MSYS2)?
- Wat gebeurt er als de Windows Terminal app wordt gesloten?
- Wat is het verschil met ConPTY vs classic console?
- Geef concrete test-commando's om dit te verifiëren

### Q4: Desktop notificaties vanuit tmux/WSL op Windows
- Kan WSL2 Windows toast notifications triggeren?
- PowerShell `New-BurntToastNotification` vanuit WSL — werkt dat?
- `wsl-notify-send` of vergelijkbare tools?
- notify-send op native Linux
- Wat is de meest betrouwbare cross-platform aanpak?

### Q6: fcntl file locking op Windows
- fcntl werkt in WSL2 — maar wat bij native Windows Python?
- msvcrt.locking() als alternatief
- portalocker als cross-platform library
- Huidige state.py gebruikt fcntl — wat is de migratie-impact?
- Is dit een blocker of een nice-to-have fix?

## Format
Per vraag:
1. **Antwoord** (1-3 zinnen)
2. **Bewijs** (documentatie links, test output, of code snippets)
3. **Aanbeveling** (wat moeten we doen?)
4. **Risico** (wat kan misgaan?)

## Regels
- Engels
- Alleen officiële documentatie als bron, geen aannames
- Test-commando's moeten LETTERLIJK uitvoerbaar zijn
- Als iets niet te achterhalen is zonder daadwerkelijk te testen: zeg dat expliciet
- Minimaal 100 regels, maximaal 400 regels' --name researcher-platform --direct --model claude/sonnet
```

---

### Agent: researcher-architecture

**Rol**: Architectuur-onderzoek — hoe bouwen we dit technisch, wat hergebruiken we.

```bash
oa run 'Je bent een ARCHITECTURE RESEARCHER.

## Input
Lees deze bestanden:
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN-RAW.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/state.py
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/checkpoint.py
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/lifecycle.py
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/hooks.py
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/tmux.py
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/config.py

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/architecture-research.md

## Scope
Beantwoord deze vragen op basis van de bestaande code:

### Q2: Daemon binnen tmux sessie
- Kan een tmux window een Python script draaien als session guardian?
- Hoe start je dit automatisch bij `oa start`?
- Wat als het guardian script zelf crasht?
- Concrete implementatie: apart window "oa-guardian" in tmux sessie

### Q3: Harde crash vs clean detach detectie
- Hoe weet `oa start` of de vorige sessie clean was?
- Voorstel: lock file `~/.oa/session.lock` die bij clean shutdown verwijderd wordt
- Als lock file bestaat bij start → vorige sessie was crash
- Alternatief: PID file + process check

### Q7: Cleanup als apart script vs in CLI
- Optie A: `oa-cleanup` als apart entry point
- Optie B: `oa stop --cleanup` in bestaande CLI
- Optie C: cleanup als functie in lifecycle.py, aanroepbaar vanuit tmux hook
- Analyseer voor/nadelen van elke optie

### Q8: Concurrent writes voorkomen
- state.py heeft al fcntl locking — is dit voldoende?
- Scenario: cleanup schrijft session record TERWIJL agent update_agent() aanroept
- Is atomic write (tempfile + rename) in save_agents() voldoende?
- Moeten session records een APART bestand zijn (geen conflict met agents.json)?

### Q9: Session record opslag
- Optie A: in agents.json (bestaand)
- Optie B: apart `~/.oa/sessions/<ts>.json` (een bestand per sessie)
- Optie C: `~/.oa/sessions.json` (alle sessies in één file)
- Analyseer: groei, query-snelheid, concurrent access, cleanup

### Q10: Integratie met checkpoint.py
- checkpoint.py doet al per-agent checkpoints
- Sessie-level checkpoint = snapshot van ALLE agents + git state
- Hergebruik checkpoint opslag patroon of nieuw?
- Kan `save_checkpoint` uitgebreid worden met sessie-scope?

## Format
Per vraag:
1. **Analyse** (huidige code, wat is er al)
2. **Opties** (met voor/nadelen)
3. **Aanbeveling** (met rationale)
4. **Code sketch** (pseudocode of interface definitie)

## Regels
- Engels
- Gebaseerd op de DAADWERKELIJKE code die je leest, geen aannames
- Code sketches in Python
- Minimaal 200 regels, maximaal 600 regels' --name researcher-architecture --direct --model claude/opus
```

---

### Agent: researcher-ux

**Rol**: UX-onderzoek — hoe ervaren gebruikers dit, wat doen vergelijkbare tools.

```bash
oa run 'Je bent een UX RESEARCHER.

## Input
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN-RAW.md

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/ux-research.md

## Scope
Beantwoord deze vragen + doe competitive analysis:

### Q11: Interactieve vs automatische resume
- Optie A: Interactief menu bij `oa start` (keuze: resume/nieuw/toon)
- Optie B: Automatisch verdergaan, `oa start --fresh` voor schone start
- Optie C: Altijd tonen als banner, geen interactie vereist
- Welke past bij een CLI-first developer tool?
- Hoe doen vergelijkbare tools dit? (tmuxinator, screen, mosh, VS Code)

### Q12: Configuratie-oppervlak
- Hoeveel opties zijn er realistisch? (momenteel 7 voorgesteld)
- Moeten defaults "alles aan" of "minimaal" zijn?
- Config via `oa config` CLI of direct JSON editten?
- Moet er een `oa config --wizard` zijn?

### Competitive Analysis
Hoe gaan deze tools om met sessie-persistentie?
- **tmux-resurrect**: plugin voor tmux sessie opslaan/herstellen
- **tmux-continuum**: automatische opslag
- **VS Code**: workspace state, recent files
- **screen**: sessie logging
- **Zellij**: sessie management
- **Docker Desktop**: container state bij afsluiten
- Wat kunnen we leren? Welke patronen werken goed?

### Notificatie-UX
- Wanneer is een notificatie nuttig vs irritant?
- Hoe vaak mag je notificaties sturen?
- Stille modus / focus modus respecteren?

## Format
Per sectie: concrete aanbevelingen met rationale.
Sluit af met een "Recommended UX Flow" diagram.

## Regels
- Engels
- Praktisch en opinionated — niet "het hangt ervan af"
- Concrete mockups/wireframes als ASCII art waar nuttig
- Minimaal 150 regels, maximaal 400 regels' --name researcher-ux --direct --model claude/sonnet
```

---

## FASE 2: CORE DOCS VULLEN

### Agent: writer-decisions

**Rol**: Nieuwe beslissingen documenteren in DECISIONS.md.

```bash
oa run 'Je bent een DECISIONS WRITER.

## Input
Lees deze bestanden:
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN-RAW.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/platform-research.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/architecture-research.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/ux-research.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/DECISIONS.md

## Output
Schrijf PROPOSAL naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/decisions-update-proposal.md

## Taak
Formuleer twee nieuwe beslissingen op basis van de research:

### D-055: Session Persistence Architecture
- Keuze: hoe slaan we sessie-state op (apart bestand vs in agents.json)
- Keuze: drie shutdown-modes (stop/detach/crash)
- Keuze: cleanup als functie in lifecycle.py (niet apart script)
- Baseer op research-architecture antwoorden voor Q8 en Q9

### D-056: Session Resume UX
- Keuze: interactief vs automatisch bij `oa start`
- Keuze: configuratie-oppervlak (welke opties, welke defaults)
- Keuze: notificatie-strategie
- Baseer op research-ux antwoorden voor Q11 en Q12

## Format
Volg EXACT het format van bestaande beslissingen in DECISIONS.md:

```
| D-055 | Session Persistence Architecture | <gekozen optie> | <rationale> | 2026-03-11 |
```

Plus een "Details" sectie per beslissing met context, opties, en rationale.

## Regels
- Nederlands (consistent met bestaande DECISIONS.md)
- Proposal mode: schrijf naar proposals/, NIET direct naar DECISIONS.md
- Wees decisief — kies de beste optie, motiveer waarom
- Maximaal 150 regels' --name writer-decisions --direct --model claude/sonnet
```

---

### Agent: writer-roadmap

**Rol**: Sprint 19 entry toevoegen aan ROADMAP.md en MASTERPLAN.md.

```bash
oa run 'Je bent een ROADMAP WRITER.

## Input
Lees deze bestanden:
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN-RAW.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/ROADMAP.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/MASTERPLAN.md

## Output
Schrijf TWEE PROPOSALS:
1. /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/roadmap-update-proposal.md
2. /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/masterplan-update-proposal.md

## Taak

### Proposal 1: ROADMAP.md update
- Voeg "Sprint 19: Session Persistence & Recovery" toe
- Status: Planned
- Fase 13 of onderdeel van Fase 11
- Taken checklist (8-12 items gebaseerd op masterplan_raw Wave 1-2)
- Consistent met het bestaande format (checkboxes, progress bar)

### Proposal 2: MASTERPLAN.md update
- Voeg Sprint 19 toe aan de sprint tabel
- Afhankelijkheden: Sprint 12 (oa-cli)
- Beschrijving van de sprint met taken [SEQ] en [PAR] labels

## Regels
- Nederlands (consistent met bestaande docs)
- Proposal mode: schrijf naar proposals/
- Volg EXACT het format van bestaande sprints
- Maximaal 200 regels totaal over beide proposals' --name writer-roadmap --direct --model claude/sonnet
```

---

## FASE 3: MASTERPLAN REFINED

### Agent: engineer-masterplan

**Rol**: Verfijn de masterplan_raw tot een definitief masterplan op basis van alle research.

```bash
oa run 'Je bent een MASTERPLAN ENGINEER.

## Input
Lees ALLE research en proposals:
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN-RAW.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/platform-research.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/architecture-research.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/research/ux-research.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/decisions-update-proposal.md
- /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/roadmap-update-proposal.md

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN.md

## Taak
Schrijf het DEFINITIEVE masterplan. Dit is het bouwplan dat implementatie-agents volgen.

Het moet bevatten:
1. **Executive summary** — wat bouwen we, waarom, in hoeveel werk
2. **Architecture** — modules, interfaces, data flow (gebaseerd op research)
3. **Schema definities** — SessionRecord, config schema (exact, niet conceptueel)
4. **Implementatie taken** — genummerd, met [SEQ]/[PAR] labels, met geschatte complexiteit
5. **Per taak: een concrete implementatie-prompt** — die je letterlijk naar een oa agent kunt geven
6. **Test plan** — wat moet getest worden, hoe
7. **Risico's en mitigaties** — uit research, concreet
8. **Definition of Done** — wanneer is dit feature "klaar"

## Regels
- Engels
- Implementatie-prompts MOETEN het 5-element format volgen (absolute paden, scope, reference files, quality rules, bronnen)
- GEEN open vragen meer — alles is beantwoord door research, neem beslissingen
- Concrete code interfaces, niet abstracte beschrijvingen
- Minimaal 400 regels, maximaal 800 regels' --name engineer-masterplan --direct --model claude/opus
```

---

## FASE 4: ENGINEERING

### Agent: engineer-schema

**Rol**: Exacte datamodellen en type definities.

```bash
oa run 'Je bent een SCHEMA ENGINEER.

## Input
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN.md
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/state.py
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/config.py

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/engineering/schema-design.py

## Taak
Schrijf de EXACTE Python dataclasses en type definities:

1. **SessionRecord** dataclass — alle velden met types, defaults, docstrings
2. **SessionStore** — CRUD functies (save, load, list, cleanup)
3. **Config uitbreiding** — nieuwe velden in DEFAULT_CONFIG
4. **Hook events** — nieuwe event types voor hooks.py
5. **Guardian state** — wat de background monitor bijhoudt

## Regels
- Python 3.10+ syntax
- Consistent met bestaande state.py patronen (dataclass + JSON serialisatie)
- Importeerbaar als module — dit wordt de basis voor implementatie
- Type hints op alles
- Maximaal 300 regels' --name engineer-schema --direct --model claude/opus
```

---

### Agent: engineer-architecture

**Rol**: Module design en interfaces.

```bash
oa run 'Je bent een SOFTWARE ARCHITECT.

## Input
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN.md
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/engineering/schema-design.py
Lees alle bestanden in: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/engineering/architecture-design.md

## Taak
Ontwerp de module-structuur en interfaces:

1. **Nieuwe modules** — welke nieuwe .py bestanden, wat doen ze
2. **Bestaande modules** — welke wijzigingen aan tmux.py, lifecycle.py, hooks.py, config.py, cli.py
3. **Functie-interfaces** — elke publieke functie met signature en docstring
4. **Data flow diagram** — ASCII art van hoe data stroomt bij stop/detach/crash/resume
5. **Dependency graph** — welke module importeert wat
6. **CLI commando wijzigingen** — nieuwe flags/subcommands voor `oa stop` en `oa start`

## Regels
- Engels
- Concrete Python interfaces, niet abstracte beschrijvingen
- Minimale impact op bestaande code — extend, niet herschrijf
- Maximaal 400 regels' --name engineer-architecture --direct --model claude/sonnet
```

---

## FASE 5: IMPLEMENTATIE

> **Let op**: Implementatie-prompts worden gegenereerd door engineer-masterplan (Fase 3).
> Hieronder staan de TEMPLATES — de exacte prompts komen uit het definitieve masterplan.

### Batch 1: Core Storage

```bash
# Agent: impl-session-store
oa run 'Je bent een PYTHON DEVELOPER.
[...prompt uit masterplan, taak: session_store.py schrijven...]' --name impl-session-store --direct

# Agent: impl-snapshot
oa run 'Je bent een PYTHON DEVELOPER.
[...prompt uit masterplan, taak: snapshot functie in lifecycle.py...]' --name impl-snapshot --direct

# Agent: impl-periodic-checkpoint
oa run 'Je bent een PYTHON DEVELOPER.
[...prompt uit masterplan, taak: guardian.py uitbreiden...]' --name impl-periodic-checkpoint --direct
```

### Batch 2: Hooks & Flow

```bash
# Agent: impl-tmux-hooks
oa run '[...tmux hook registratie in tmux.py + cleanup script...]' --name impl-tmux-hooks --direct

# Agent: impl-shutdown-flow
oa run '[...oa stop enhanced in cli.py + lifecycle.py...]' --name impl-shutdown-flow --direct

# Agent: impl-resume-flow
oa run '[...oa start enhanced in cli.py...]' --name impl-resume-flow --direct
```

### Batch 3: Polish

```bash
# Agent: impl-notifications
oa run '[...desktop notificaties...]' --name impl-notifications --direct

# Agent: impl-config
oa run '[...config uitbreiding...]' --name impl-config --direct

# Agent: impl-git-integration
oa run '[...git stash/status...]' --name impl-git-integration --direct
```

---

## FASE 6: TESTING & REVIEW

### Agent: tester-unit

```bash
oa run 'Je bent een TEST ENGINEER.

## Input
Lees alle nieuwe/gewijzigde bestanden in:
/mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/

En het schema design:
/mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/engineering/schema-design.py

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/tests/test_session_persistence.py

## Taak
Schrijf unit tests voor ALLE nieuwe functionaliteit:
- SessionRecord create/serialize/deserialize
- SessionStore CRUD (save, load, list, cleanup retention)
- Snapshot functie (mock tmux + git)
- Resume detection (clean vs crash)
- Config defaults en overrides
- Hook event triggering (on_session_end, on_detach)
- Guardian periodic checkpoint

## Regels
- pytest
- Gebruik tmp_path fixture voor file I/O
- Mock tmux en git calls (geen echte subprocessen)
- Minimaal 30 tests
- Maximaal 500 regels' --name tester-unit --direct --model claude/sonnet
```

---

### Agent: reviewer-integration

```bash
oa run 'Je bent een CODE REVIEWER.

## Input
Lees ALLE bestanden in:
/mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/

En het masterplan:
/mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN.md

## Output
Schrijf naar: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/review/integration-review.md

## Taak
Review de implementatie op:
1. **Correctheid** — doet de code wat het masterplan beschrijft?
2. **Edge cases** — wat kan misgaan? Race conditions? Disk full? Permissions?
3. **Consistentie** — past de code bij bestaande patronen (state.py, lifecycle.py)?
4. **Security** — worden secrets gelekt in session records? Permissions op bestanden?
5. **Performance** — periodieke checkpoint elke 5 min: is dat te zwaar?
6. **Windows compatibiliteit** — werkt alles op WSL2?

## Format
Per issue:
- **Locatie**: bestand:regelnummer
- **Probleem**: wat is er mis
- **Fix**: concrete code fix
- **Prioriteit**: P1 (blocker) / P2 (should fix) / P3 (nice to have)

## Regels
- Engels
- Wees streng maar constructief
- Alleen echte issues, geen style nits
- Maximaal 300 regels' --name reviewer-integration --direct --model claude/opus
```

---

## FASE 7: DOCUMENTATIE

### Agent: writer-docs

```bash
oa run 'Je bent een DOCUMENTATION WRITER.

## Input
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/SESSION-PERSISTENCE-MASTERPLAN.md
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/CLAUDE.md
Lees: /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/CHANGELOG.md

## Output
Schrijf TWEE proposals:
1. /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/claude-md-update-proposal.md
2. /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/docs/proposals/changelog-update-proposal.md

## Taak

### Proposal 1: CLAUDE.md update
- Voeg sectie toe over Session Persistence in "Hoe de Orchestrator Werkt"
- Beschrijf de drie shutdown-modes
- Documenteer nieuwe config opties
- Update Quick Reference met nieuwe commando flags

### Proposal 2: CHANGELOG.md update
- Voeg entry toe voor de session persistence feature
- Volg Keep a Changelog format
- Categoriseer: Added, Changed

## Regels
- Nederlands (consistent met CLAUDE.md)
- Proposal mode
- Bondig — geen herhaling van het masterplan
- Maximaal 150 regels totaal' --name writer-docs --direct --model claude/sonnet
```

---

## Quality Gates

Na ELKE fase voert de meta-orchestrator (wij, in deze sessie) deze checks uit:

### Gate 1: Na Research (Fase 1)
```
□ Alle 12 vragen (Q1-Q12) beantwoord met concrete antwoorden?
□ Geen "het hangt ervan af" — alleen decisieve aanbevelingen?
□ Platform blockers geïdentificeerd? (Q1, Q6)
□ Competitive analysis levert bruikbare patronen op?
```

### Gate 2: Na Core Docs (Fase 2)
```
□ D-055 en D-056 zijn concreet en beslissend?
□ Sprint 19 past in bestaande roadmap structuur?
□ Geen conflicten met bestaande beslissingen?
```

### Gate 3: Na Masterplan (Fase 3)
```
□ Alle open vragen uit masterplan_raw zijn beantwoord?
□ Implementatie-prompts bevatten alle 5 elementen?
□ Schema definities zijn concreet (niet conceptueel)?
□ Definition of Done is meetbaar?
```

### Gate 4: Na Engineering (Fase 4)
```
□ Schema is importeerbaar Python code?
□ Interfaces zijn consistent met bestaande modules?
□ Geen circular dependencies?
□ Wijzigingen aan bestaande code zijn minimaal?
```

### Gate 5: Na elke Implementatie Batch (Fase 5)
```
□ Code draait zonder syntax errors?
□ Imports kloppen?
□ Geen conflicten met andere batch output?
□ Consistent met schema design?
```

### Gate 6: Na Testing (Fase 6)
```
□ Alle tests groen?
□ Edge cases gedekt?
□ Reviewer P1 issues opgelost?
```

---

## Meta-orchestratie regels

1. **Flat spawning** — alle agents vanuit DEZE sessie, nooit nested (L-004)
2. **--direct altijd** — output in project directory (L-010, #10)
3. **Max 3-4 agents per batch** — quality gate na elke batch (L-004)
4. **Proposal mode** — agents schrijven NOOIT direct naar core bestanden (L-005)
5. **Research voltooid voor engineering** — geen implementatie zonder antwoorden
6. **Opus voor complexe taken** — research-architecture, engineer-masterplan, reviewer
7. **Sonnet voor gestructureerde taken** — writers, researchers met duidelijke scope, implementatie
8. **Wacht op quality gate** — pas door naar volgende fase als gate passed
