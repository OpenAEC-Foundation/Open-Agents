# Open-Agents Skill Package — TRACKER

> **Levend document** — Na elke fase bijgewerkt door een guardian agent.
> **Laatste update**: 2026-03-08
> **Bijgewerkt door**: skill-coordinator

---

## 1. Status Overzicht

| Fase | Status | Agents | Output | Geblokkeerd door |
|------|--------|--------|--------|-----------------|
| 0: Fundament | ✅ done | skill-research-guidelines, skill-masterplan, skill-orchestration, skill-prompting, skill-state, skill-quality | docs/research/anthropic-skills-guidelines.md, docs/skills/SKILL-PROTOCOL.md, 14 skills in .claude/skills/ | — |
| 1: Masterplan verfijnen | ⬜ todo | — | — | ~~Fase 0~~ Gereed |
| 2: Deep research | ⬜ todo | — | docs/research/oa-*/ | Fase 1 |
| 3: Skill creation | ⬜ todo | — | .claude/skills/ | Fase 2 |
| 4: Agent koppeling | ⬜ todo | — | agents/library/core/ | Fase 3 |
| 5: Validatie | ⬜ todo | — | docs/skills/validatie-rapport.md | Fase 4 |
| 6: Integratie & publicatie | ⬜ todo | — | INDEX.md, commit, push | Fase 5 |

---

## 2. Fases met Subfases

### Fase 0: Fundament ✅ DONE (2026-03-08)

**Doel**: Research, masterplan, en pilot skills bouwen.

- 0.1 Anthropic guidelines research — agent: **skill-research-guidelines** → `docs/research/anthropic-skills-guidelines.md`
- 0.2 Raw masterplan schrijven — agent: **skill-masterplan** → `docs/skills/raw-masterplan.md`
- 0.3 Pilot skills bouwen — 4 categorieën:
  - agent: **skill-orchestration** → `.claude/skills/oa-orchestration-*/SKILL.md`
  - agent: **skill-prompting** → `.claude/skills/oa-prompting-*/SKILL.md`
  - agent: **skill-state** → `.claude/skills/oa-state-*/SKILL.md`
  - agent: **skill-quality** → `.claude/skills/oa-quality-*/SKILL.md`
- 0.4 Pilot valideren tegen guidelines
- 0.5 Competitor analysis (Cursor, Copilot, Windsurf) — SKILL-PROTOCOL.md
- 0.6 SKILL-PROTOCOL.md synthesized door opus agent → `docs/skills/SKILL-PROTOCOL.md`
- 0.7 14 skills gemigreerd naar officiële directory-structuur

**Done criteria**:
- [x] `docs/research/anthropic-skills-guidelines.md` bestaat
- [x] `docs/skills/SKILL-PROTOCOL.md` bestaat
- [x] 14 skills bestaan in `.claude/skills/` als directory-structuur

---

### Fase 1: Masterplan verfijnen ⬜

**Doel**: Pilot output reviewen, skill inventory finaliseren.

- 1.1 Guidelines reviewen → format aanpassen
- 1.2 Pilot skills reviewen → format bijstellen
- 1.3 Skill inventory finaliseren (exact 20-25 skills met namen)
- 1.4 Agent-koppeling ontwerpen (welke agent per skill?)

**Done criteria**:
- [ ] Verfijnd masterplan bestaat
- [ ] Definitieve skill-lijst (20-25 skills) gedocumenteerd
- [ ] Agent-koppeling schema gedocumenteerd

---

### Fase 2: Deep research per categorie ⬜

**Doel**: Code diep inlezen per domein, research docs schrijven.

- 2.1 Code scan oa-orchestration → lees `oa-cli/src/open_agents/cli.py`, `tmux.py` diep
- 2.2 Code scan oa-state → lees `state.py` diep
- 2.3 Code scan oa-quality → lees `guardians.py` diep
- 2.4 Code scan oa-library → scan `agents/library/` structuur
- 2.5 Code scan oa-web → lees `bridge.py`, `web/src/` diep

**Done criteria**:
- [ ] `docs/research/oa-orchestration.md` bestaat (min 200 regels)
- [ ] `docs/research/oa-state.md` bestaat (min 200 regels)
- [ ] `docs/research/oa-quality.md` bestaat (min 200 regels)
- [ ] `docs/research/oa-library.md` bestaat (min 200 regels)
- [ ] `docs/research/oa-web.md` bestaat (min 200 regels)

---

### Fase 3: Skill creation ⬜

**Doel**: 20+ skills schrijven op basis van deep research.

- 3.1 Batch 1: oa-orchestration skills — 4 skills, 2 agents → `.claude/skills/oa-orchestration-*.md`
- 3.2 Batch 2: oa-prompting skills — 4 skills, 2 agents → `.claude/skills/oa-prompting-*.md`
- 3.3 Batch 3: oa-state skills — 4 skills, 2 agents → `.claude/skills/oa-state-*.md`
- 3.4 Batch 4: oa-quality skills — 3 skills, 2 agents → `.claude/skills/oa-quality-*.md`
- 3.5 Batch 5: oa-library skills — 3 skills, 1 agent → `.claude/skills/oa-library-*.md`
- 3.6 Batch 6: oa-web skills — 2 skills, 1 agent → `.claude/skills/oa-web-*.md`

**Done criteria**:
- [ ] 20+ skills bestaan in `.claude/skills/`
- [ ] Elk bestand > 50 regels
- [ ] Elk bestand heeft geldige frontmatter

---

### Fase 4: Agent koppeling ⬜

**Doel**: Per skill een atomaire agent template schrijven.

- 4.1 Per skill: agent template JSON schrijven
- 4.2 Templates opslaan in `agents/library/core/`
- 4.3 systemPrompt per agent = skill content samengevat
- 4.4 Maturity level en tools per agent bepalen

**Done criteria**:
- [ ] 1 agent template JSON per skill in `agents/library/core/`
- [ ] Elk template heeft: id, name, atomic, skillRef, systemPrompt, tools, modelHint
- [ ] modelHint volgt tiering uit CLAUDE.md

---

### Fase 5: Validatie ⬜

**Doel**: Skills en agents structureel en functioneel valideren.

- 5.1 Structurele validatie: frontmatter, line count, format
- 5.2 Content validatie: deterministic taal, geen aannames
- 5.3 Functionele test: skill triggert correct in echte sessie
- 5.4 Agent test: elke template draait succesvol

**Done criteria**:
- [ ] Validatierapport bestaat: `docs/skills/validatie-rapport.md`
- [ ] Alle structurele issues gefixed
- [ ] Alle content issues gefixed

---

### Fase 6: Integratie & publicatie ⬜

**Doel**: Alles samenvoegen, documenteren en pushen.

- 6.1 INDEX.md schrijven (complete skill catalog)
- 6.2 CLAUDE.md bijwerken (skills sectie)
- 6.3 ROADMAP.md bijwerken
- 6.4 Commit en push naar GitHub

**Done criteria**:
- [ ] `docs/skills/INDEX.md` bestaat
- [ ] CLAUDE.md bevat bijgewerkte skills sectie
- [ ] ROADMAP.md op 100% voor skill package
- [ ] Alles gecommit en gepusht

---

## 3. Actieve Agents (nu running)

| Agent | Output locatie | Status |
|-------|----------------|--------|
| skill-research-guidelines | `docs/research/anthropic-skills-guidelines.md` | ✅ done |
| skill-masterplan | `docs/skills/raw-masterplan.md` | ✅ done |
| skill-orchestration | `.claude/skills/oa-orchestration-*/SKILL.md` | ✅ done |
| skill-prompting | `.claude/skills/oa-prompting-*/SKILL.md` | ✅ done |
| skill-state | `.claude/skills/oa-state-*/SKILL.md` | ✅ done |
| skill-quality | `.claude/skills/oa-quality-*/SKILL.md` | ✅ done |
| skill-coordinator | `docs/skills/SKILL-PROTOCOL.md` | ✅ done |
| guardian-skills-fase0 | `docs/LESSONS.md`, `TRACKER.md`, `ROADMAP.md` | ✅ done |

---

## 4. Quality Gate Checklist (na elke batch)

Na elke skill batch doorloopt de meta-orchestrator deze checklist:

- [ ] Verwacht N skills → gekregen N? (count check)
- [ ] Elk bestand > 50 regels (niet afgekapt)?
- [ ] Frontmatter aanwezig (`name` + `description` velden)?
- [ ] ALWAYS/NEVER taal (geen "you might" of "consider")?
- [ ] Code voorbeelden zijn correcte oa-cli syntax?
- [ ] Geen duplicate content tussen skills?

**Als een check faalt**: spawn fix-agent met specifiek probleem + originele output. NOOIT zelf fixen.

---

## 5. Next Steps

**Fase 0 is afgerond (2026-03-08)**. Wat de meta-orchestrator **als volgende** moet doen:

1. **Fase 1: Masterplan verfijnen** — spawn `skill-reviewer` agent:
   - Input: `docs/skills/SKILL-PROTOCOL.md` + 14 skills in `.claude/skills/`
   - Output: verfijnd masterplan + definitieve skill-lijst (20-25 skills met namen)
   - Model: `claude/opus` (architectuur-niveau redenering)
2. **Agent-koppeling ontwerpen** — welke agent template per skill?
   - Output: schema in `docs/skills/agent-koppeling.md`
   - Model: `claude/sonnet`
3. **Fase 2 starten** — deep research per categorie (orchestratie, state, quality, library, web)

---

## Kwaliteitsregels voor Skills

Elke skill (`SKILL.md` of `.claude/skills/*.md`) MOET voldoen aan:

| Regel | Waarde |
|-------|--------|
| Frontmatter | `name:` en `description:` aanwezig |
| Minimale lengte | > 50 regels |
| Taal | Deterministic: ALWAYS / NEVER / MUST / DO NOT |
| Trigger | Duidelijk TRIGGER WHEN / DO NOT TRIGGER WHEN |
| Codevoorbeelden | Correcte oa-cli syntax (`oa run`, `--direct`, `--name`) |
| Duplicaten | Geen overlappende content met andere skills |

---

*Gegenereerd door: skill-coordinator | 2026-03-08*
