# Raw Masterplan — Open-Agents Skill Package

> **Versie**: 0.1 (Raw)
> **Datum**: 2026-03-08
> **Status**: Fase 1 — Raw Masterplan
> **Auteur**: skill-masterplan agent (opus)
> **Volgende stap**: Fase 2 — Deep Research (6 parallelle agents)

---

## 1. Projectdoel

Het Open-Agents Skill Package is een verzameling `.claude/skills/` bestanden die Claude Code vertellen hoe het oa-cli platform werkt. Elke skill = één atomair concept. Skills worden automatisch geladen als context en geven Claude directe kennis over commando-syntax, patronen, anti-patronen, en best practices.

**Kernprincipe**: Skills zijn instructies VOOR Claude, niet voor eindgebruikers. Engels als taal. Deterministische formulering (ALWAYS/NEVER).

### Bestaande Skills (2 van ~20 nodig)

| Skill | Status | Regels |
|-------|--------|--------|
| `oa-agent-library-builder` | Bestaat (134 regels) | Automatisch agent templates groeien |
| `oa-orchestration-communication` | Bestaat (119 regels) | oa send/inbox/broadcast/collect |

### Relatie met Agent Library

```
┌─────────────────────────────────────────────────────┐
│  .claude/skills/oa-*.md                             │
│  Claude Code leest deze → weet HOE oa-cli werkt    │
├─────────────────────────────────────────────────────┤
│  agents/library/core/oa-*.json                      │
│  Agent templates die de skill als systemPrompt      │
│  gebruiken → agents WETEN hoe oa-cli werkt          │
├─────────────────────────────────────────────────────┤
│  oa run --template core/oa-orchestration-spawn      │
│  → Agent krijgt skill-context automatisch mee       │
└─────────────────────────────────────────────────────┘
```

---

## 2. Skill Inventory (~22 skills)

### 2.1 oa-orchestration/ (5 skills)

| # | Skill | Trigger | Scope | Deps | Prio |
|---|-------|---------|-------|------|------|
| 1 | `oa-orchestration-spawn` | User wil agent spawnen via `oa run` | `oa run` syntax, flags (--name, --model, --direct, --template, --parent, --context-skills), workspace creatie, model selectie | — | **Core** |
| 2 | `oa-orchestration-pipeline` | User wil pipeline uitvoeren | `oa pipeline` syntax, planner→workers→combiner flow, timeouts, plan.json format | spawn | **Core** |
| 3 | `oa-orchestration-delegate` | User wil taak delegeren met orchestrator | `oa delegate` syntax, orchestrator+workers pattern, --max-workers, --orchestrator-model | spawn | **Core** |
| 4 | `oa-orchestration-communication` | Agent messaging nodig | `oa send`, `oa inbox`, `oa broadcast`, `oa collect` syntax, mailbox mechanisme | spawn | **Core** |
| 5 | `oa-orchestration-patterns` | User kiest orchestratie-aanpak | Vier patronen (run/pipeline/delegate/iterative-planner), wanneer welk, L-041 | spawn, pipeline, delegate | **Core** |

### 2.2 oa-prompting/ (4 skills)

| # | Skill | Trigger | Scope | Deps | Prio |
|---|-------|---------|-------|------|------|
| 6 | `oa-prompting-5element` | User schrijft agent prompt | 5-element template (paden, scope, referentie, regels, bronnen), L-010, voorbeelden | — | **Core** |
| 7 | `oa-prompting-model-tiering` | User kiest model voor agent | Model selectie strategie, haiku/sonnet/opus toewijzing per taaktype, modelHint | — | **Core** |
| 8 | `oa-prompting-scope` | User definieert agent scope | Atomaire taken, te groot vs te klein, L-026, batch sizing (3-5 agents) | 5element | Nice |
| 9 | `oa-prompting-delegation` | User plant multi-agent werk | Auto-delegation triggers, wanneer delegeren, flat spawning vereiste, L-004 | patterns, model-tiering | Nice |

### 2.3 oa-state/ (4 skills)

| # | Skill | Trigger | Scope | Deps | Prio |
|---|-------|---------|-------|------|------|
| 10 | `oa-state-workspace` | User vraagt over agent workspace | Workspace builder, /tmp/oa-agent-<id>/, CLAUDE.md generatie, --direct mode, project_root | spawn | **Core** |
| 11 | `oa-state-agents-json` | User vraagt over agent state | ~/.oa/agents.json structuur, AgentRecord velden, status lifecycle (running→done→killed), file locking (fcntl) | — | **Core** |
| 12 | `oa-state-lifecycle` | User beheert agent lifecycle | `oa status`, `oa kill`, `oa clean`, `oa attach`, `oa watch`, timeout detectie, auto-cleanup | agents-json | Nice |
| 13 | `oa-state-checkpoint` | User wil agent herstarten | `oa checkpoint`, `oa resume`, crash-recovery, L-044 | agents-json, workspace | Nice |

### 2.4 oa-quality/ (3 skills)

| # | Skill | Trigger | Scope | Deps | Prio |
|---|-------|---------|-------|------|------|
| 14 | `oa-quality-gates` | User doet QA na agent batch | 5-stap quality gate (count, content, format, cross-ref, size), batch-then-verify pattern | — | **Core** |
| 15 | `oa-quality-guardians` | User configureert automatische reflexen | guardians.py, trigger_guardian(), session-log.json, lessons/roadmap/handoff guardians, event types | spawn | Nice |
| 16 | `oa-quality-fix-agent` | Agent output heeft fouten | Fix-agent pattern: spawn fixer met originele output + fout, L-016/L-017, nooit zelf fixen | spawn, gates | Nice |

### 2.5 oa-library/ (3 skills)

| # | Skill | Trigger | Scope | Deps | Prio |
|---|-------|---------|-------|------|------|
| 17 | `oa-library-templates` | User wil agent template gebruiken | `oa run --template`, `oa templates`, JSON template format, skillRef, modelHint, systemPrompt | spawn | **Core** |
| 18 | `oa-library-discovery` | User zoekt bestaande agents | agents/library/ structuur, categorieën, template zoeken, _load_template() | — | Nice |
| 19 | `oa-library-builder` | User wil template opslaan | Bestaat al. Template creatie uit succesvol oa run resultaat, JSON format, categorie toewijzing | templates | Nice |

### 2.6 oa-teams/ (2 skills)

| # | Skill | Trigger | Scope | Deps | Prio |
|---|-------|---------|-------|------|------|
| 20 | `oa-teams-management` | User werkt met agent teams | `oa team create/list/add-member/delete`, team config, members, L-022 t/m L-029 | communication | Nice |
| 21 | `oa-teams-tasks` | User beheert gedeelde taken | `oa task create/list/done/update`, task dependencies, blockedBy, auto-unblock | teams-management | Nice |

### 2.7 oa-web/ (1 skill)

| # | Skill | Trigger | Scope | Deps | Prio |
|---|-------|---------|-------|------|------|
| 22 | `oa-web-interfaces` | User start web/dashboard UI | `oa web`, `oa dashboard`, bridge.py API endpoints, React SPA, Textual TUI, port 5174 | — | Nice |

### Prioriteit Samenvatting

| Prioriteit | Skills | Nummers |
|-----------|--------|---------|
| **Core** (eerst bouwen) | 12 | 1-7, 10-11, 14, 17 + bestaande 4 (communicatie) |
| **Nice** (daarna) | 10 | 8-9, 12-13, 15-16, 18-22 |

---

## 3. Fases

### Fase 1: Raw Masterplan (dit document)

**Doel**: Overzicht en planning van alle skills
**Output**: `docs/skills/raw-masterplan.md`
**Status**: DONE na dit document

---

### Fase 2: Deep Research (6 agents parallel)

**Doel**: Per categorie diep onderzoek naar exacte CLI syntax, code flow, en edge cases.

| Agent | Categorie | Model | Input | Output |
|-------|-----------|-------|-------|--------|
| `research-orchestration` | oa-orchestration/ | claude/sonnet | cli.py, spawner.py, pipeline.py, orchestrator.py | `docs/skills/research/orchestration-research.md` |
| `research-prompting` | oa-prompting/ | claude/sonnet | CLAUDE.md, LESSONS.md, workspace.py | `docs/skills/research/prompting-research.md` |
| `research-state` | oa-state/ | claude/sonnet | state.py, workspace.py, checkpoint.py, lifecycle.py | `docs/skills/research/state-research.md` |
| `research-quality` | oa-quality/ | claude/sonnet | guardians.py, LESSONS.md, session-log format | `docs/skills/research/quality-research.md` |
| `research-library` | oa-library/ | claude/sonnet | cli.py (_load_template, _load_skills), agents/library/ | `docs/skills/research/library-research.md` |
| `research-teams` | oa-teams/ | claude/sonnet | teams.py, task_list.py, messaging.py | `docs/skills/research/teams-research.md` |

**Quality Gate**: Elk research document moet bevatten:
- [ ] Exacte commando-syntax met alle flags
- [ ] Code flow (welke functies worden aangeroepen)
- [ ] Edge cases en error handling
- [ ] Bestaande LESSONS.md referenties
- [ ] Minimaal 300 regels

**Voorbeeld Agent Prompt**:
```bash
oa run 'Je bent een RESEARCHER voor het Open-Agents Skill Package.

## Input
Lees deze bestanden:
- /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py
- /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/spawner.py
- /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/pipeline.py
- /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/orchestrator.py

## Output
Schrijf naar: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/skills/research/orchestration-research.md

## Scope
- Exacte syntax van oa run, oa pipeline, oa delegate (alle flags en defaults)
- Code flow: welke functies roepen ze aan, in welke volgorde
- Workspace creatie flow (wat gebeurt er stap voor stap)
- Error handling en edge cases
- Timeouts en defaults

## Regels
- Engels
- Minimaal 300 regels
- Deterministic taal (ALWAYS/NEVER)
- Inclusief code snippets uit de broncode
- Geen speculatie — alleen wat in de code staat' \
--name research-orchestration --model claude/sonnet --direct
```

---

### Fase 3: Masterplan Verfijning (1 architect agent)

**Doel**: Research reviewen, skills bijwerken, dependency graph finaliseren.

| Agent | Model | Input | Output |
|-------|-------|-------|--------|
| `architect-refine` | claude/opus | 6 research docs + dit masterplan | `docs/skills/masterplan.md` (final) |

**Subfases**:
1. Lees alle 6 research documenten
2. Vergelijk met skill inventory — skills toevoegen, mergen, of verwijderen
3. Exacte commando-syntax per skill overnemen uit research
4. Dependencies finaliseren
5. Ready-to-use prompts schrijven per skill (zodat Fase 4 agents direct kunnen starten)

**Quality Gate**:
- [ ] Elke skill heeft exacte CLI syntax
- [ ] Dependencies kloppen (geen circulaire deps)
- [ ] Prompts voor Fase 4 zijn compleet en volgen 5-element template
- [ ] Max 800 regels

---

### Fase 4: Skill Creation (3 batches × 3-5 agents)

**Doel**: Skills schrijven op basis van verfijnd masterplan + research.

**Batch 1 — Core Orchestration (4 agents)**:

| Agent | Skills | Model | Output |
|-------|--------|-------|--------|
| `skill-writer-1` | oa-orchestration-spawn, oa-orchestration-pipeline | claude/sonnet | `.claude/skills/oa-orchestration-spawn.md`, `oa-orchestration-pipeline.md` |
| `skill-writer-2` | oa-orchestration-delegate, oa-orchestration-patterns | claude/sonnet | `.claude/skills/oa-orchestration-delegate.md`, `oa-orchestration-patterns.md` |
| `skill-writer-3` | oa-prompting-5element, oa-prompting-model-tiering | claude/sonnet | `.claude/skills/oa-prompting-5element.md`, `oa-prompting-model-tiering.md` |
| `skill-writer-4` | oa-state-workspace, oa-state-agents-json | claude/sonnet | `.claude/skills/oa-state-workspace.md`, `oa-state-agents-json.md` |

**Quality Gate Batch 1**: Alle 8 skills structureel correct, < 500 regels, deterministic language.

**Batch 2 — Core Quality + Library (3 agents)**:

| Agent | Skills | Model | Output |
|-------|--------|-------|--------|
| `skill-writer-5` | oa-quality-gates, oa-library-templates | claude/sonnet | 2 skills |
| `skill-writer-6` | oa-prompting-scope, oa-prompting-delegation | claude/sonnet | 2 skills |
| `skill-writer-7` | oa-state-lifecycle, oa-state-checkpoint | claude/sonnet | 2 skills |

**Batch 3 — Nice-to-have (3 agents)**:

| Agent | Skills | Model | Output |
|-------|--------|-------|--------|
| `skill-writer-8` | oa-quality-guardians, oa-quality-fix-agent | claude/sonnet | 2 skills |
| `skill-writer-9` | oa-library-discovery, oa-web-interfaces | claude/sonnet | 2 skills |
| `skill-writer-10` | oa-teams-management, oa-teams-tasks | claude/sonnet | 2 skills |

**Skill Format** (volgt WAY_OF_WORK.md):
```yaml
---
name: oa-{category}-{topic}
description: "Use this skill when Claude needs to [trigger]. Activates for: [keywords]."
---
```

Secties:
1. Quick Reference (critical warnings, beslisboom)
2. Command Syntax (exacte flags en defaults)
3. Essential Patterns (code voorbeelden)
4. Anti-Patterns (wat NIET te doen, met LESSONS.md referenties)
5. Related Skills (cross-referenties)

---

### Fase 5: Agent Koppeling (2 batches × 3 agents)

**Doel**: Elke skill krijgt een bijbehorend agent template in `agents/library/core/`.

**Koppelingspatroon**:

```
Skill: .claude/skills/oa-orchestration-spawn.md
  ↓ wordt basis voor
Template: agents/library/core/oa-orchestration-spawn.json
  ↓ bevat
{
  "id": "oa-orchestration-spawn",
  "name": "Spawn Agent Helper",
  "atomic": true,
  "category": "core",
  "skillRef": ".claude/skills/oa-orchestration-spawn.md",
  "systemPrompt": "...(gecomprimeerde kern van skill)...",
  "modelHint": "anthropic/claude-sonnet-4-6",
  "tools": [],
  "executionContext": "oa-cli"
}
```

**Batch 1 — Core Templates (3 agents)**:

| Agent | Templates | Model |
|-------|-----------|-------|
| `template-writer-1` | spawn, pipeline, delegate, patterns | claude/sonnet |
| `template-writer-2` | 5element, model-tiering, scope, delegation | claude/sonnet |
| `template-writer-3` | workspace, agents-json, lifecycle, checkpoint | claude/sonnet |

**Batch 2 — Supporting Templates (3 agents)**:

| Agent | Templates | Model |
|-------|-----------|-------|
| `template-writer-4` | gates, guardians, fix-agent | claude/sonnet |
| `template-writer-5` | templates, discovery, builder | claude/sonnet |
| `template-writer-6` | teams-management, teams-tasks, web-interfaces | claude/sonnet |

**Quality Gate**: Elk template valideert als JSON, heeft skillRef, modelHint, en systemPrompt.

---

### Fase 6: Validatie (6 validator agents, 1 per categorie)

**Doel**: Alle skills en templates valideren op structuur, content, en cross-referenties.

| Agent | Categorie | Model | Checks |
|-------|-----------|-------|--------|
| `validator-orchestration` | oa-orchestration/ | claude/sonnet | 5 skills + 5 templates |
| `validator-prompting` | oa-prompting/ | claude/sonnet | 4 skills + 4 templates |
| `validator-state` | oa-state/ | claude/sonnet | 4 skills + 4 templates |
| `validator-quality` | oa-quality/ | claude/sonnet | 3 skills + 3 templates |
| `validator-library` | oa-library/ | claude/sonnet | 3 skills + 3 templates |
| `validator-teams-web` | oa-teams/ + oa-web/ | claude/sonnet | 3 skills + 3 templates |

**Validatie Checklist**:
- [ ] SKILL.md frontmatter correct (name, description)
- [ ] < 500 regels per skill
- [ ] Deterministic language (geen "might", "consider", "could")
- [ ] Commando-syntax klopt met cli.py broncode
- [ ] Cross-referenties naar andere skills bestaan
- [ ] Template JSON is valid
- [ ] Template skillRef wijst naar bestaand bestand
- [ ] Template systemPrompt is niet leeg
- [ ] Geen overlap met bestaande skills (oa-agent-library-builder, oa-orchestration-communication)

---

### Fase 7: Integratie (1 integrator agent)

**Doel**: Alles samenvoegen, docs updaten, INDEX maken.

| Agent | Model | Output |
|-------|-------|--------|
| `integrator` | claude/opus | CLAUDE.md update, ROADMAP.md update, INDEX.md |

**Taken**:
1. Maak `docs/skills/INDEX.md` met volledige skill catalog
2. Update `CLAUDE.md` — skill-backed agents sectie bijwerken met oa-skills referentie
3. Update `docs/ROADMAP.md` — skill package fase tracking toevoegen
4. Verifieer dat `oa run --context-skills` werkt met nieuwe skills
5. Commit en push

---

## 4. Skill → Agent Koppeling (Architectuur)

### Hoe het werkt

```
┌──────────────────────────────────────────────────────────┐
│ 1. SKILL CREATIE                                         │
│    .claude/skills/oa-orchestration-spawn.md               │
│    → Claude Code leest dit automatisch als context        │
│    → Geeft Claude kennis over oa run syntax en patronen   │
├──────────────────────────────────────────────────────────┤
│ 2. TEMPLATE CREATIE                                       │
│    agents/library/core/oa-orchestration-spawn.json        │
│    → JSON met skillRef naar de skill                      │
│    → systemPrompt = gecomprimeerde kern van de skill      │
│    → modelHint bepaalt welk model de agent gebruikt       │
├──────────────────────────────────────────────────────────┤
│ 3. RUNTIME                                                │
│    oa run --template core/oa-orchestration-spawn          │
│    → _load_template() leest JSON                          │
│    → systemPrompt wordt prepended aan de taak             │
│    → --context-skills injecteert skill content             │
│    → Agent start met skill als ingebouwde kennis          │
└──────────────────────────────────────────────────────────┘
```

### Waarom deze koppeling?

| Aspect | Skill (.claude/skills/) | Template (agents/library/) |
|--------|------------------------|---------------------------|
| Doel | Claude Code context | Agent spawning |
| Geladen door | Claude Code automatisch | `oa run --template` |
| Format | Markdown (SKILL.md) | JSON |
| Doelgroep | Meta-orchestrator sessie | Gespawnde agent |
| Scope | Breed (alle syntax) | Smal (1 taak) |

De skill geeft de **meta-orchestrator** kennis. Het template geeft **de agent zelf** kennis. Samen zorgen ze ervoor dat zowel de orchestrator als de worker weet hoe oa-cli werkt.

---

## 5. Risico's en Open Vragen

### 5.1 Hoge Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| **Sprint 17 nog in progress** — teams.py, task_list.py, messaging.py API kan nog veranderen | oa-teams/ skills worden snel verouderd | Bouw teams skills als LAATSTE (Batch 3). Markeer als "unstable API". |
| **oa delegate implementatie onduidelijk** — orchestrator.py niet volledig gelezen | Syntax in skill kan incorrect zijn | Research agent MOET orchestrator.py grondig lezen in Fase 2. |
| **Bestaande skills overlap** — 2 skills bestaan al, 6 meer waren ooit aangemaakt maar bestaan niet meer als files | Duplicatie of inconsistentie | Fase 6 validators checken expliciet op overlap. Bestaande skills worden ge-reviewed en geüpdatet, niet opnieuw geschreven. |

### 5.2 Medium Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| **oa config commando** — bestaat in CLI maar scope onduidelijk | Skill mist mogelijk config-gerelateerde content | Research moet config.py checken |
| **Workspace builder verschil --direct vs default** — complex | Skill kan verwarring veroorzaken | Duidelijke beslisboom in skill |
| **Pipeline plan.json format** — niet gedocumenteerd | Skill kan verkeerd format beschrijven | Research moet pipeline.py broncode checken |

### 5.3 Open Vragen

| # | Vraag | Blokkerend voor |
|---|-------|-----------------|
| OV-1 | Moet er een `oa-setup/` skill komen voor `oa setup` en preflight checks? | Skill inventory finalisatie |
| OV-2 | Moeten bestaande skills (library-builder, communication) ge-refactored worden naar het nieuwe format? | Fase 4 scope |
| OV-3 | Hoe omgaan met `oa-cli/web/` React SPA — apart skill of onderdeel van oa-web-interfaces? | Skill granulariteit |
| OV-4 | Zijn er skills nodig voor `oa config` commando? | Completeness |
| OV-5 | Moeten skills verwijzen naar LESSONS.md nummers of de inhoud inline opnemen? | Content strategie |

---

## 6. Totale Agent Budget

| Fase | Agents | Model | Geschatte duur |
|------|--------|-------|---------------|
| Fase 2: Deep Research | 6 | sonnet | ~15 min (parallel) |
| Fase 3: Refinement | 1 | opus | ~10 min |
| Fase 4: Skill Creation | 10 (3 batches) | sonnet | ~30 min (per batch ~10 min) |
| Fase 5: Agent Koppeling | 6 (2 batches) | sonnet | ~20 min (per batch ~10 min) |
| Fase 6: Validatie | 6 | sonnet | ~15 min (parallel) |
| Fase 7: Integratie | 1 | opus | ~10 min |
| **Totaal** | **30 agents** | | **~100 min** |

---

## 7. Wat Bouwen We EERST?

### Kritiek Pad (Core skills — zonder deze werkt niets goed)

```
Fase 2 Research (alle 6 parallel)
    ↓
Fase 3 Refinement (1 architect)
    ↓
Fase 4 Batch 1: oa-orchestration-spawn
                 oa-orchestration-pipeline
                 oa-orchestration-delegate
                 oa-orchestration-patterns
                 oa-prompting-5element
                 oa-prompting-model-tiering
                 oa-state-workspace
                 oa-state-agents-json
    ↓ (quality gate)
Fase 4 Batch 2: oa-quality-gates
                 oa-library-templates
                 oa-prompting-scope
                 oa-prompting-delegation
                 oa-state-lifecycle
                 oa-state-checkpoint
    ↓ (quality gate)
Fase 4 Batch 3: oa-quality-guardians
                 oa-quality-fix-agent
                 oa-library-discovery
                 oa-web-interfaces
                 oa-teams-management
                 oa-teams-tasks
    ↓ (quality gate)
Fase 5+6+7 (templates, validatie, integratie)
```

### Minimum Viable Skill Package (MVSP)

Als we maar 8 skills kunnen bouwen, zijn dit de essentiële:

1. `oa-orchestration-spawn` — zonder dit kan niemand agents spawnen
2. `oa-orchestration-patterns` — zonder dit kiest niemand het juiste patroon
3. `oa-prompting-5element` — zonder dit krijg je slechte prompts
4. `oa-prompting-model-tiering` — zonder dit verspil je tokens
5. `oa-state-workspace` — zonder dit snapt niemand --direct
6. `oa-state-agents-json` — zonder dit kan niemand state debuggen
7. `oa-quality-gates` — zonder dit is er geen QA
8. `oa-library-templates` — zonder dit worden templates niet gebruikt

---

*Open-Agents Skill Package — Raw Masterplan v0.1*
*Impertio Studio B.V. — AI ecosystems, deployed right.*
