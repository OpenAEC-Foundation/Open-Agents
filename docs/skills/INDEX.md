# Open-Agents Skill Package — INDEX

> **Package**: Open-Agents Skill Package
> **Versie**: 1.0
> **Datum**: 2026-03-08
> **Skills**: 22 · **Agent templates**: 22
> **Doelgroep**: Claude Code (meta-orchestrator sessie)

Skills worden automatisch geladen vanuit `.claude/skills/` — geen installatie nodig.
Open Claude Code in dit project en alle skills zijn direct beschikbaar.

---

## Snelle installatie

```
Skills worden automatisch geladen vanuit .claude/skills/
Geen installatie nodig — open Claude Code in dit project.
```

Elke skill = één atomair concept. Claude laadt ze als context en weet direct hoe oa-cli werkt.

---

## Skill Catalog

### oa-orchestration (5 skills)

| Skill | Triggert op | Beschrijving |
|-------|-------------|--------------|
| `oa-orchestration-spawn` | oa run, spawn agent, start agent, --direct, --model | Exacte CLI syntax voor `oa run` met alle flags (--name, --model, --direct, --template, --parent) |
| `oa-orchestration-pipeline` | oa pipeline, pipeline, planner, combiner, multi-step task | Geautomatiseerde planner→workers→combiner pipeline voor complexe taken |
| `oa-orchestration-delegate` | oa delegate, delegate task, orchestrator, max-workers, --orchestrator-model | CLI referentie voor `oa delegate` — hiërarchische decomposities met orchestrator+workers |
| `oa-orchestration-communication` | oa send, oa inbox, oa broadcast, oa collect, agent messaging | Inter-agent messaging via `oa send/inbox/broadcast/collect` |
| `oa-orchestration-patterns` | orchestration pattern, research swarm, build pipeline, review chain, batch processor | 4 herbruikbare patronen: Research Swarm, Build Pipeline, Review Chain, Batch Processor |

---

### oa-prompting (4 skills)

| Skill | Triggert op | Beschrijving |
|-------|-------------|--------------|
| `oa-prompting-5element` | agent prompt, prompt template, 5-element, oa run prompt | 5-element prompt structuur voor oa agents: paden, scope, referentie, regels, bronnen (L-010) |
| `oa-prompting-model-tiering` | which model, claude/haiku, claude/sonnet, claude/opus, model selection, --model | Model selectie gids: haiku voor parsing, sonnet voor implementatie, opus voor architectuur |
| `oa-prompting-scope` | agent scope, quality rules, role statement, explicit scope, bullet points | Schrijf expliciete scope en kwaliteitsregels inline in agent prompts |
| `oa-prompting-delegation` | delegate, spawn, auto-delegate, parallel agents, delegation plan | Beslis wanneer en hoe je taken delegeert — triggers, flat spawning, L-004 |

---

### oa-state (5 skills)

| Skill | Triggert op | Beschrijving |
|-------|-------------|--------------|
| `oa-state-workspace` | workspace, agent output, --direct, /tmp/oa-agent, result.md, project_root | Workspace layout en --direct flag — waar agents hun output schrijven |
| `oa-state-agents-json` | agents.json, agent state, status running/done/failed, AgentRecord, ~/.oa/ | State file structuur, AgentRecord velden, status lifecycle (running→done→killed) |
| `oa-state-lifecycle` | oa kill, oa clean, oa attach, oa watch, oa status, agent lifecycle | Beheer lopende agents: stoppen, opschonen, volgen, timeout detectie |
| `oa-state-checkpoint` | oa checkpoint, oa resume, crash recovery, checkpoint agent | Checkpoint en resume voor crash recovery van long-running agents (L-044) |
| `oa-state-collect` | oa collect, output/result.md, agent output, oa watch, oa attach | Output ophalen van voltooide agents — collect vs watch vs attach |

---

### oa-quality (3 skills)

| Skill | Triggert op | Beschrijving |
|-------|-------------|--------------|
| `oa-quality-gates` | batch complete, agent done, oa collect, validate output, quality check, all agents finished | Verplichte 5-stap quality gate na elke batch: count, content, format, cross-ref, size |
| `oa-quality-guardians` | batch done, session end, guardian, update docs, lessons learned | Automatisch LESSONS.md, ROADMAP.md, DECISIONS.md updaten na agent werk |
| `oa-quality-fix-agent` | fix agent, quality failure, output error, spawn fixer, L-016, L-017 | Fix-agent pattern: spawn een fixer met originele output + fout, nooit zelf fixen |

---

### oa-library (3 skills)

| Skill | Triggert op | Beschrijving |
|-------|-------------|--------------|
| `oa-library-templates` | save template, add to library, new agent template, agents/library, template format | Referentie voor het maken en opslaan van agent JSON templates |
| `oa-library-discovery` | agents/library, --template, template id, reuse template, find template | Templates vinden en hergebruiken uit `agents/library/` — scan voor spawnen |
| `oa-agent-library-builder` | oa collect shows success, save as template, make reusable, add to library | Groeit de agent library vanuit succesvolle oa runs — template extractie workflow |

---

### oa-web (1 skill)

| Skill | Triggert op | Beschrijving |
|-------|-------------|--------------|
| `oa-web-dashboard` | oa dashboard, oa web, web UI, localhost:5174, bridge API | Web UI en Textual TUI voor agent monitoring, logs en status |

---

### oa-teams (1 skill)

| Skill | Triggert op | Beschrijving |
|-------|-------------|--------------|
| `oa-teams-coordination` | oa team, staging area, shared results, phase coordination, L-005 | Multi-agent teams coördineren met staging patronen en gedeelde resultaatdirectories |

---

## Agent Templates

22 agent templates zijn beschikbaar in `agents/library/core/oa-*.json`.
Elke skill heeft een bijbehorend template dat de skill als systemPrompt gebruikt.

### Gebruik

```bash
# Spawn een agent met een bestaand template
oa run "taakomschrijving" --name worker-1 --template core/oa-orchestration-spawn --model claude/sonnet --direct

# Bekijk beschikbare templates
ls agents/library/core/oa-*.json
```

### Beschikbare core templates

| Template ID | Categorie |
|-------------|-----------|
| `core/oa-orchestration-spawn` | Orchestration |
| `core/oa-orchestration-pipeline` | Orchestration |
| `core/oa-orchestration-delegate` | Orchestration |
| `core/oa-orchestration-communication` | Orchestration |
| `core/oa-orchestration-patterns` | Orchestration |
| `core/oa-prompting-5element` | Prompting |
| `core/oa-prompting-model-tiering` | Prompting |
| `core/oa-prompting-scope` | Prompting |
| `core/oa-prompting-delegation` | Prompting |
| `core/oa-state-workspace` | State |
| `core/oa-state-agents-json` | State |
| `core/oa-state-lifecycle` | State |
| `core/oa-state-checkpoint` | State |
| `core/oa-state-collect` | State |
| `core/oa-quality-gates` | Quality |
| `core/oa-quality-guardians` | Quality |
| `core/oa-quality-fix-agent` | Quality |
| `core/oa-library-templates` | Library |
| `core/oa-library-discovery` | Library |
| `core/oa-agent-library-builder` | Library |
| `core/oa-web-dashboard` | Web |
| `core/oa-teams-coordination` | Teams |

---

## Nieuwe skill toevoegen

Volg het schrijfprotocol in [`docs/skills/SKILL-PROTOCOL.md`](SKILL-PROTOCOL.md).

Samenvatting:
1. Maak directory: `.claude/skills/oa-{categorie}-{topic}/`
2. Schrijf `SKILL.md` met frontmatter (name, description, triggers)
3. Voeg optioneel `reference.md` en `examples/` toe
4. Schrijf bijbehorend template naar `agents/library/core/oa-{naam}.json`
5. Voeg skill toe aan deze INDEX

---

*Open-Agents Skill Package v1.0 — Impertio Studio B.V.*
