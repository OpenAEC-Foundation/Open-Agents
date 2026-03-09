# Analyse: 20 Meta-Systemen voor Open-Agents

**Datum analyse:** 2026-03-09
**Analist:** design-meta agent
**Bron:** `/raw/20-META-SYSTEMEN.md`

---

## Samenvatting (max 5 regels)

Het document beschrijft 20 meta-systemen die samen een zelflerend kwaliteitslaag vormen bovenop het Open-Agents platform. Ze dekken detectie, verificatie, geheugen, coördinatie, leren en infrastructuur. De systemen zijn gegroepeerd in 6 clusters (A-F) en bedoeld als skills die op globaal niveau triggeren. Het document erkent eerlijk wat we nog niet weten en meten. De implementatiestrategie is gefaseerd: telemetrie + hooks als fundament, dan quick wins, dan observeerbaarheid.

---

## Kernboodschap

**Het probleem:** Agents melden "klaar" terwijl het werk incompleet is — en niemand merkt het. De oorzaken zijn: aannames, context rot, sycofantische completie, vage instructies, en informatieverlies bij handoffs.

**De oplossing:** 20 meta-systemen als "kwaliteitslaag" die automatisch triggeren voor, tijdens en na uitvoering. Niet handmatig toepassen, maar architectureel inbakken via skills + hooks + pipelines.

---

## Relevantie voor Open-Agents: **HOOG**

De 20 systemen zijn direct gebouwd op de architectuur van Open-Agents (oa-cli, pipelines, skills, templates). Ze adresseren de exact gedocumenteerde faalpatronen uit issues #9-#12 en gaan daarna verder. Ze vereisen run-telemetrie (#14) en post-run hooks (#15) als fundament — die issues staan al open. Dit is geen theorie: het document verwijst naar concrete community-data, Anthropic engineering blog en eigen sessie-ervaring.

---

## Mapping: Welke meta-systemen overlappen met issues #14–#25?

| Meta-systeem | Overlap met issue(s) | Toelichting |
|---|---|---|
| #1 `context-gap-detector` | — | Nieuw |
| #2 `assumption-tracker` | #15, #18 | Post-run hook + lessons extraction |
| #3 `honesty-enforcer` | #15 | Post-run hook triggert completion check |
| #4 `knowledge-boundary-mapper` | #19, #25 | Benchmark + meta-improver |
| #5 `blind-spot-scanner` | #18, #19, #25 | Lessons + benchmark + meta-improver |
| #6 `adversarial-reviewer` | — | Nieuw |
| #7 `end-to-end-verifier` | #15 | Post-run hook kan dit triggeren |
| #8 `instruction-compliance-checker` | #21 | Handoff protocol bevat originele instructie |
| #9 `context-decay-monitor` | #16, #20 | Context tracking + auto-compaction |
| #10 `session-state-preserver` | #24 | Graveyard & resurrection |
| #11 `persistent-backlog` | — | Nieuw |
| #12 `invocation-quality-gate` | #12 | Structured prompt template |
| #13 `file-conflict-preventer` | — | Nieuw |
| #14 `information-loss-detector` | #21 | Handoff protocol audit |
| #15 `anti-regression-guard` | #15, #19 | Post-run hook + benchmark |
| #16 `cross-agent-pattern-miner` | #18, #25 | Lessons + meta-improver |
| #17 `diminishing-returns-detector` | #25 | Meta-improver stuurt verbetering |
| #18 `token-budget-allocator` | #16 | Context window tracking |
| #19 `ecosystem-health-dashboard` | #19, #23 | Benchmark + settings auto-tuning |
| #20 `documentation-generator` | #17 | Auto template generation |

---

## Nieuwe meta-systemen (nog geen issue)

Deze 8 systemen hebben geen bestaand GitHub issue:

| # | Meta-systeem | Prioriteit | Waarom urgent |
|---|---|---|---|
| 1 | `context-gap-detector` | **Hoog** | Voorkomt blinde start — direct waarde |
| 3 | `honesty-enforcer` | **Hoog** | #1 faalpatroon in productie |
| 6 | `adversarial-reviewer` | **Hoog** | Self-review werkt architectureel niet |
| 7 | `end-to-end-verifier` | **Hoog** | Features "klaar" zonder te werken |
| 11 | `persistent-backlog` | Medium | TodoWrite is sessie-gebonden |
| 13 | `file-conflict-preventer` | Medium | Parallelle agents overschrijven elkaar |
| 18 | `token-budget-allocator` | Laag | Verbetering, geen blocker |
| 2 | `assumption-tracker` | Laag | Waarde pas na telemetrie beschikbaar |

---

## Aanbevolen actie per onderdeel

### Direct aanmaken als GitHub issues

| Issue titel | Meta-systeem | Fase |
|---|---|---|
| `feat: context-gap-detector skill — pre-execution context audit` | #1 | 2 (quick win) |
| `feat: honesty-enforcer skill — completion self-check` | #3 | 2 (quick win) |
| `feat: adversarial-reviewer — read-only post-run review agent` | #6 | 2 (quick win) |
| `feat: end-to-end-verifier — run tests, don't just write them` | #7 | 3 (observeerbaarheid) |
| `feat: persistent-backlog — cross-session ~/.oa/backlog.yaml` | #11 | 5 (infrastructuur) |
| `feat: file-conflict-preventer — file-ownership-map per pipeline` | #13 | 5 (infrastructuur) |

### Bestaande issues uitbreiden

- **#14 (telemetry)** → Explicieter maken dat dit prerequisite is voor META-SYSTEMEN 1-20. Label toevoegen: `prerequisite`.
- **#15 (post-run hooks)** → Scope uitbreiden met: honesty-check, adversarial review, compliance-check als standaard hook-stappen.
- **#21 (handoff protocol)** → Scope uitbreiden met `information-loss-detector` (#14) als verplicht audit-onderdeel.
- **#25 (meta-improver)** → Koppelen aan #4, #5, #16, #17 als input-feeds voor de improver.

### Implementatievolgorde (conform document)

1. **Nu:** Issues aanmaken voor de 6 nieuwe systemen hierboven
2. **Fase 1:** #14 (telemetry) + #15 (hooks) — fundament voor alles
3. **Fase 2:** #1, #3, #6, #12 — quick wins, direct waarde
4. **Fase 3:** #9/#16, #14/#21, #19 — observeerbaarheid
5. **Fase 4–5:** Rest per prioriteitstabel in origineel document

---

*Analyse gegenereerd door design-meta agent | Open-Agents project*
