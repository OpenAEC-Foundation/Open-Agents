# Analyse: REF_anthropic-context-engineering.md

**Datum analyse:** 2026-03-09
**Analist:** ref-anthropic (oa-agent)
**Bron:** Anthropic Engineering, 29 september 2025

---

## Samenvatting (max 5 regels)

Context engineering is de opvolger van prompt engineering: de discipline die alle tokens in het contextvenster beheert tijdens LLM-inferentie. Anthropic beschrijft hoe context rot optreedt naarmate het venster groeit, en geeft concrete patronen voor system prompts, tools, few-shot voorbeelden, just-in-time retrieval, compaction, en multi-agent architecturen. De kern: de kleinst mogelijke set high-signal tokens vinden die de kans op het gewenste resultaat maximaliseren.

---

## Kern Boodschap

**Context is een eindige bron met afnemende meeropbrengsten.** Optimaliseer wat erin zit, niet hoeveel. Drie praktische principes:

1. **Juiste altitude** — System prompts specifiek genoeg om te sturen, flexibel genoeg voor heuristieken
2. **Just-in-time retrieval** — Laad data dynamisch in context via tools, bewaar alleen lichtgewicht identifiers
3. **Multi-agent scheiding** — Verdeel taken over agents met gefocuste contextvensters; ontwerp overdrachtsprotocollen

---

## Relevantie voor Open-Agents

**Hoog** — Dit document raakt de architecturele kern van het platform.

Concrete raakvlakken:

- **Workspace builder & CLAUDE.md generatie**: De "right altitude" richtlijn valideert de aanpak van taak-specifieke CLAUDE.md bestanden per agent. Te vaag = slechte output, te specifiek = breekbaar. Dit is een directe kwaliteitsrichtlijn voor de workspace builder.
- **Context rot in lange agent-runs**: Bij `oa pipeline` en meerdere sequentiële agents neemt context rot toe. Compaction-strategie is niet geïmplementeerd — dit is een architectureel gat.
- **Multi-agent contextvensters**: De Open-Agents architectuur (meta-orchestrator + workers) matcht Anthropic's aanbeveling: elke agent een gefocust domein-specifiek venster. De flat spawning workaround (L-004) is correct vanuit context-engineering perspectief.
- **Just-in-time retrieval vs. naïef laden**: CLAUDE.md bestanden worden nu naïef in context geladen (zoals Anthropic beschrijft voor Claude Code). Dit is een bewuste keuze die de aanbeveling volgt.
- **Progressive disclosure in skills**: Skill packages met SKILL.md bestanden die incrementeel geladen worden, matcht de progressive disclosure aanpak.

---

## Relevante Issues / Features

| Issue | Verband |
|-------|---------|
| **#10** (output verdwijnt in /tmp) | Compaction/context-scheiding — agents moeten output extern opslaan, niet in context |
| **#12** (ongestructureerde prompts) | Valideert 5-element template (L-010): structuur = betere context |
| **#14–#25** | Nader onderzoek nodig; compaction en context budget zijn kandidaten voor nieuwe issues |

**Aanbevolen nieuw issue**: "Compaction strategie voor lange pipeline-runs" — Anthropic beschrijft dit als kritieke architectuuruitdaging voor agentic systemen.

---

## Aanbevolen Actie

**Verwerken in bestaand doc** — Specifiek in `docs/PRINCIPLES.md` en `docs/SOURCES.md`:

1. **`docs/SOURCES.md`** — Voeg toe als kernreferentie met samenvatting van patronen
2. **`docs/PRINCIPLES.md`** — Principe toevoegen: "Context als eindige bron — minimale high-signal tokens"
3. **`LESSONS.md`** — Voeg les toe: compaction is een open architectuurvraag voor lange pipelines
4. **`docs/OPEN-QUESTIONS.md`** — Voeg toe: "Wat is de optimale compaction-strategie voor oa pipeline-runs?"

Het document is te waardevol voor archief — het bevat directe validatie van en aanvulling op de huidige architectuurkeuzes.
