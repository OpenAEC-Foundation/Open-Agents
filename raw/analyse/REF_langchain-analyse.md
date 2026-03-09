# Analyse: REF_langchain-context-strategies.md

**Datum:** 2026-03-09
**Analist:** ref-langchain agent
**Bron:** LangChain Blog — Context Engineering for Agents (2 juli 2025)

---

## Samenvatting (max 5 regels)

LangChain beschrijft vier strategieën voor context engineering in agents: Write (vastleggen), Select (kiezen), Compress (indikken), en Isolate (scheiden). Het artikel gebruikt de analogie van Karpathy: LLM = CPU, contextvenster = RAM, context engineering = OS. Het kader is gebaseerd op analyse van populaire agents en onderzoekspapers. Kernrisico's zijn context poisoning, distraction en confusion bij groeiende context. Aanbeveling: observeerbaarheid eerst — meet tokenverdeling vóór je optimaliseert.

---

## Kernboodschap

**Context engineering is het vakgebied dat bepaalt welke informatie wanneer in het contextvenster van een agent terechtkomt.** Het gaat niet alleen om wat je toevoegt, maar ook om wat je weglaat. De vier strategieën (Write/Select/Compress/Isolate) vormen een compleet raamwerk voor het beheren van agent-geheugen en informatiestroom.

---

## Relevantie voor Open-Agents

**Relevantie: HOOG**

Het Write/Select/Compress/Isolate framework beschrijft exact wat Open-Agents al doet — maar nu hebben we de terminologie en theorie om het te benoemen, documenteren, en bewust te verbeteren:

| LangChain strategie | Open-Agents equivalent |
|---------------------|------------------------|
| **Write** | Auto-memory (`~/.claude/projects/*/memory/`), agent scratchpads, `output/result.md` |
| **Select** | Skills progressive disclosure, `just-in-time` skill loading in CLAUDE.md |
| **Compress** | Compaction bij sessie-overgang, HANDOFF documenten, samenvatting in LESSONS.md |
| **Isolate** | Geïsoleerde agent workspaces (`/tmp/oa-agent-<id>/`), één CLAUDE.md per agent |

**Context poisoning** is een concreet risico bij lange oa-agent runs: als een agent een hallucinatie produceert en die in de context belandt, vergiftigt dit vervolgstappen. Dit is nog niet gedocumenteerd als risico in het project.

---

## Issues en Features

- **#14–#25 (context-gerelateerd)**: Het Isolate-patroon is direct van toepassing op hoe agents contextvensters van elkaar scheiden. Dit ondersteunt de huidige flat-spawning architectuur (L-004).
- **Issue #9/#11** (agents gebruiken ingebouwde Agent tool i.p.v. `oa run`): Dit is een Isolate-probleem — sub-agents via de ingebouwde tool delen context met de parent, wat de isolatie doorbreekt.
- **Issue #10** (output verdwijnt in /tmp): Dit is een Write-strategie probleem — output wordt niet persistent vastgelegd zonder `--direct`.
- **Nieuw risico te documenteren**: Context poisoning monitoring bij lange agent-runs (toevoegen aan `OPEN-QUESTIONS.md` of `LESSONS.md`).

---

## Aanbevolen Actie

**Verwerken in bestaand doc** — specifiek:

1. **`docs/SOURCES.md`**: Voeg toe als kernreferentie met de vier strategieën als theoretisch kader voor de workspace-architectuur.
2. **`LESSONS.md`**: Voeg les toe over context poisoning als risico bij lange agent-runs.
3. **`docs/DECISIONS.md`**: Overweeg een beslissing te documenteren om observeerbaarheid (token tracking) toe te voegen aan de oa-cli roadmap.

Het document hoeft **niet** in `docs/research/` geplaatst te worden — het is al verwerkt als `raw/REF_langchain-context-strategies.md` en de kern is nu gedestilleerd in deze analyse.
