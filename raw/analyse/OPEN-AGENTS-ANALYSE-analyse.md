# Analyse: OPEN-AGENTS-ANALYSE.md

**Datum:** 2026-03-09
**Analist:** analyse-oa agent

---

## Samenvatting (max 5 regels)

Het document is een diepgaande status- en verbeteranalyse van het Open-Agents project. Het identificeert 7 kritieke verbeterpunten rondom zelflerende agentcycli, context engineering, handoff-protocollen, skill-integratie en workspace-hygiëne. De analyse vergelijkt OA met bestaande tooling en adviseert strategische positionering (intern vs. open-source). Prioriteiten zijn gerankt op impact/effort. De analyse is actueel, concreet en actionable.

---

## Relevantie voor Open-Agents

**Hoog**

Het document analyseert Open-Agents direct en volledig. Alle verbeterpunten zijn rechtstreeks van toepassing op de roadmap. Het bevat geen abstracte theorie — elk punt is koppelbaar aan concrete implementatiestappen of bestaande issues.

---

## Gaps/problemen zonder GitHub issue

De volgende knelpunten uit de analyse hebben GEEN bestaand GitHub issue (#9–#25):

1. **Architectuurdocumentatie ontbreekt** — README beschrijft commando's, niet het conceptuele model (twee lagen, isolatie-strategie, wanneer welk patroon). Geen issue aanwezig. → MAAK nieuw issue aan.

2. **Visual Canvas is losstaand van oa CLI** — De twee lagen voelen als aparte projecten; onduidelijk hoe ze samenwerken in een workflow. Geen integratie-issue. → MAAK nieuw issue aan.

3. **Strategische positionering (A vs B) is ongedocumenteerd** — De keuze intern productiviteitstool vs. open-source product is niet vastgelegd als beslissing. → Schrijf naar `docs/DECISIONS.md`.

---

## Overlaps met bestaande issues #9–#25

| Analyse-punt | Issue | Match |
|---|---|---|
| Run-logging (run-log.json) | #14 Agent Run Telemetry | Volledig |
| Context tracking (oa status --context) | #16 Context Window Tracking | Volledig |
| Auto-compaction triggers | #20 Auto-Compaction Triggers | Volledig |
| Zelflerende cyclus (oa reflect) | #18 Automated Lessons Extraction | Gedeeltelijk |
| Zelflerende cyclus (oa learn) | #25 Meta-Agent OA Improver | Gedeeltelijk |
| Handoff-protocol (handoff.yaml) | #21 Structured Handoff Protocol | Volledig |
| Skill-integratie per agent-type | #22 Skill System per Agent Type | Volledig |
| Workspace lifecycle (cleanup/archive/gc) | #24 Agent Graveyard & Resurrection | Volledig |
| Self-benchmark workflow | #19 Self-Benchmark Workflow | Volledig |
| Post-run hook systeem | #15 Post-Run Hook System | Volledig |
| Auto template generatie | #17 Auto Template Generation | Volledig |
| Settings auto-tuning | #23 Global/Local Settings Auto-Tuning | Volledig |

**Conclusie:** 12 van de 14 verbeterpunten zijn al gedekt door issues #14–#25. Twee nieuwe issues + één DECISIONS.md entry zijn nodig.

---

## Aanbevolen actie

| Onderdeel | Actie |
|---|---|
| Architectuurdocumentatie | Nieuw GitHub issue aanmaken + schrijf naar `docs/architecture.md` |
| Visual Canvas integratie | Nieuw GitHub issue aanmaken |
| Strategische positionering | Schrijf naar `docs/DECISIONS.md` |
| Prioriteitsranking analyse | Gebruik als input voor milestone-planning in GitHub Projects |
| Vergelijking met landschap | Verplaats naar `docs/research/positioning.md` |

**NIET archiveren.** Dit document bevat actieve roadmap-input.

---

## Concrete actiepunten

1. MAAK GitHub issue aan: "docs: Architectuurdocumentatie — conceptueel model en twee-lagen-structuur"
2. MAAK GitHub issue aan: "feat: Visual Canvas ↔ oa CLI integratie — unified workflow"
3. SCHRIJF `docs/DECISIONS.md` entry: Keuze Optie A (intern) met pad naar Optie B
4. GEBRUIK prioriteitsranking (§6) als input voor GitHub Projects milestone volgorde
5. VERPLAATS competitieve analyse (§5 tabel) naar `docs/research/positioning.md`
