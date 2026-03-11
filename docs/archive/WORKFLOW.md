# oa-cli Workflow Guide

> Praktische gids voor het effectief gebruiken van oa-cli voor multi-agent orchestratie.
> **Versie**: 1.0 — 2026-03-07

---

## Snel Overzicht

```
oa start                              # tmux sessie starten
oa run "taak" --name worker --direct  # agent spawnen
oa status                             # agents overzicht
oa attach worker                      # live meekijken
oa collect worker                     # output ophalen
```

**3 REGELS** die je altijd moet volgen:
1. **ALTIJD `--direct`** — voorkomt dat output verloren gaat in `/tmp`
2. **ALTIJD flat spawning** — spawn alle agents vanuit top-level sessie, nooit nested
3. **ALTIJD 5-element prompts** — absolute paden, scope, reference, regels, bronnen

---

## Stap-voor-stap: Een Multi-Agent Sessie

### 1. Sessie opstarten

```bash
oa start          # start tmux sessie
oa status         # controleer of er al agents draaien
```

### 2. Agents spawnen (flat, met --direct)

Spawn ALLE agents direct vanuit je Claude Code sessie. Laat agents NIET zelf sub-agents spawnen.

```bash
# ✅ CORRECT: flat spawning vanuit top-level
oa run 'Taakbeschrijving met 5 elementen' --name researcher-1 --direct
oa run 'Taakbeschrijving met 5 elementen' --name researcher-2 --direct
oa run 'Taakbeschrijving met 5 elementen' --name writer-1 --direct

# ❌ FOUT: nested spawning (werkt niet, zie issue #9/#11)
# Een oa-agent die via oa run weer andere oa-agents spawnt
```

### 3. Monitoren

```bash
oa status              # overzicht alle agents
oa attach researcher-1 # live meekijken bij agent
oa watch researcher-1  # output streamen
oa logs researcher-1   # logs bekijken
```

### 4. Communiceren

```bash
oa send researcher-1 "Voeg ook versie-info toe" --from orchestrator
oa inbox orchestrator   # berichten lezen
oa broadcast "Stop met werken, we gaan reviewen" --from orchestrator
```

### 5. Resultaten ophalen

```bash
oa collect researcher-1  # output tonen
oa review researcher-1   # proposals reviewen (als proposal mode)
oa apply researcher-1    # proposals toepassen
```

### 6. Opruimen

```bash
oa kill researcher-1   # agent stoppen
oa clean               # alle completed workspaces opruimen
oa stop                # tmux sessie stoppen
```

---

## De 5-Element Prompt Template

Elke `oa run` prompt MOET deze 5 elementen bevatten. Zonder deze elementen is agent output onvoorspelbaar.

### Template

```bash
oa run 'Je bent een [ROL].

## Input
Lees: [ABSOLUUT PAD naar input bestanden]

## Output
Schrijf naar: [ABSOLUUT PAD naar output bestand]

## Scope
- [Specifiek punt 1]
- [Specifiek punt 2]
- [Specifiek punt 3]

## Format
Volg de structuur van: [ABSOLUUT PAD naar voorbeeld bestand]

## Regels
- [Taal: Engels/Nederlands]
- [Lengte: min/max regels]
- [Stijl: deterministic, geen vage taal]
- [Versie-eisen]

## Bronnen
- [URL 1 — officiële documentatie]
- [URL 2 — officiële repo]' --name [agent-naam] --direct
```

### Waarom elk element essentieel is

| Element | Zonder dit... | Met dit... |
|---------|--------------|-----------|
| **Absolute paden** | Agent schrijft naar verkeerde locatie of kan input niet vinden | Agent leest juiste bronnen, schrijft naar juiste plek |
| **Explicit scope** | Output is ongestructureerd en onvolledig | Output dekt precies wat nodig is |
| **Reference file** | Elke agent verzint eigen structuur | Consistente output over alle agents |
| **Quality rules** | Agent erft GEEN project CLAUDE.md in /tmp workspace | Kwaliteit is ingebouwd in de prompt |
| **Source URLs** | Agent kan halluceren of onbetrouwbare bronnen gebruiken | Uitsluitend officiële documentatie |

---

## Patronen voor Multi-Agent Werk

### Patroon 1: Research Pipeline

```
Fase 1: Research (3-5 agents parallel)
├── researcher-blender  → docs/research/blender.md
├── researcher-ifcos    → docs/research/ifcos.md
└── researcher-bonsai   → docs/research/bonsai.md

Fase 2: Merge (1 agent)
└── merger              → docs/research/combined.md

Fase 3: Review + Create (2-4 agents parallel)
├── creator-skill-1     → skills/topic-1/SKILL.md
└── creator-skill-2     → skills/topic-2/SKILL.md
```

### Patroon 2: Stage → Merge → Verify → Cleanup (L-005)

Workers schrijven naar staging, orchestrator merged:

```bash
# Workers schrijven naar worker-output/
oa run 'Schrijf naar: /project/worker-output/topic-1.md ...' --name w1 --direct
oa run 'Schrijf naar: /project/worker-output/topic-2.md ...' --name w2 --direct

# Na completion: orchestrator merged
oa run 'Merge alle bestanden in /project/worker-output/ naar /project/docs/final.md' --name merger --direct

# Verify en cleanup
# Controleer completeness, verwijder worker-output/
```

### Patroon 3: Batch Processing (3-5 per batch)

```bash
# Batch 1 (max 5 agents)
oa run '...' --name batch1-worker1 --direct
oa run '...' --name batch1-worker2 --direct
oa run '...' --name batch1-worker3 --direct

# Wacht tot batch 1 klaar is
oa status  # controleer of alle agents "done" zijn

# Quality gate: review batch 1 output
# Fix issues indien nodig

# Batch 2 (volgende set agents)
oa run '...' --name batch2-worker1 --direct
# ...
```

---

## Bekende Beperkingen (Issues)

| Issue | Probleem | Workaround |
|-------|----------|------------|
| [#9](https://github.com/OpenAEC-Foundation/Open-Agents/issues/9) | Agents gebruiken Claude Code Agent tool i.p.v. `oa run` | Flat spawning — alle agents vanuit top-level |
| [#10](https://github.com/OpenAEC-Foundation/Open-Agents/issues/10) | Output verdwijnt in `/tmp` zonder `--direct` | ALTIJD `--direct` flag gebruiken |
| [#11](https://github.com/OpenAEC-Foundation/Open-Agents/issues/11) | Nested agent spawning werkt niet | Flat spawning — geen nested delegatie |
| [#12](https://github.com/OpenAEC-Foundation/Open-Agents/issues/12) | Ongestructureerde prompts → slechte output | 5-element prompt template gebruiken |

---

## Commando Referentie

### Sessie

| Commando | Beschrijving |
|----------|-------------|
| `oa start` | Start tmux sessie met dashboard |
| `oa stop` | Stop tmux sessie |
| `oa status` | Toon alle agents (naam, status, taak, duur) |
| `oa dashboard` | Open Textual TUI dashboard |
| `oa web` | Start web UI op localhost:5174 |

### Agents

| Commando | Beschrijving |
|----------|-------------|
| `oa run "taak" --name naam --direct` | Spawn agent (ALTIJD --direct!) |
| `oa run "taak" --model claude/opus --direct` | Spawn met specifiek model |
| `oa attach naam` | Live meekijken bij agent |
| `oa watch naam` | Output streamen |
| `oa logs naam` | Logs bekijken |
| `oa kill naam` | Agent stoppen |
| `oa collect naam` | Output ophalen |
| `oa clean` | Completed workspaces opruimen |

### Communicatie

| Commando | Beschrijving |
|----------|-------------|
| `oa send agent "bericht" --from naam` | Bericht naar specifieke agent |
| `oa inbox naam` | Berichten lezen |
| `oa broadcast "bericht" --from naam` | Bericht naar alle agents |

### Proposals (review workflow)

| Commando | Beschrijving |
|----------|-------------|
| `oa review naam` | Proposals bekijken |
| `oa apply naam` | Proposals toepassen |
| `oa apply naam --dry-run` | Preview zonder toepassen |

### Orchestratie

| Commando | Beschrijving |
|----------|-------------|
| `oa pipeline "taak"` | Planner → Workers → Combiner |
| `oa delegate "taak"` | Orchestrator spawnt workers automatisch |

### Modellen

| Model string | Beschrijving |
|-------------|-------------|
| `claude` | Default (Claude Code subscription) |
| `claude/opus` | Opus 4.6 — maximale reasoning |
| `claude/sonnet` | Sonnet 4.6 — gebalanceerd |
| `ollama/<model>` | Lokaal model via Ollama |

---

## Geleerde Lessen (Samenvatting)

| Lesson | Kern |
|--------|------|
| L-004 | Agents kunnen NIET zelf oa agents spawnen → flat spawning |
| L-005 | Stage → Merge → Verify → Cleanup patroon werkt betrouwbaar |
| L-010 | 5-element prompt template is essentieel voor consistentie |
| L-011 | Fasen kunnen overlappen als dependency graph het toelaat |

Volledige lessen: zie `LESSONS.md` in de repo root.

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
