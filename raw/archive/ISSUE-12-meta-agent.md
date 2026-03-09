# feat: Meta-Agent "OA Improver" — het systeem dat zichzelf ontwikkelt

**Labels:** `self-improvement` `priority-high` `meta-automation`  
**Depends on:** #1, #2, #3, #4, #5, #6, #10 (dit is de kroon op het geheel)

## Probleem

Alle voorgaande issues bouwen individuele zelflerende componenten. Maar wie orkestreert het geheel? Wie besluit dat het tijd is voor een benchmark, dat templates moeten worden herzien, dat de settings getuned moeten worden? Dat is nu nog de mens. Dit issue maakt het systeem in staat om zichzelf proactief te verbeteren.

## Oplossing

Een speciale meta-agent die periodiek draait en het OA-systeem zelf analyseert en verbetert. Deze agent is zelf gebouwd met OA — de ultieme zelfreferentie.

### De OA Improver Pipeline

```bash
oa improve                        # Trigger de meta-verbetering cyclus
```

Dit spawnt een OA pipeline die zichzelf verbetert:

```
┌─────────────────────────────────────────────────────────┐
│  oa improve                                              │
│                                                          │
│  FASE 1: DIAGNOSE (planner-agent)                       │
│  ├─ Lees ~/.oa/runs/ telemetrie van afgelopen periode    │
│  ├─ Lees ~/.oa/knowledge/lessons.yaml                    │
│  ├─ Lees ~/.oa/benchmarks/results/                       │
│  ├─ Analyseer: wat gaat goed? wat gaat structureel mis?  │
│  └─ Produceer: diagnosis-report.md                       │
│                                                          │
│  FASE 2: PLAN (planner-agent)                           │
│  ├─ Op basis van diagnose: welke verbeteringen?          │
│  ├─ Prioriteer op impact × haalbaarheid                  │
│  ├─ Maximum 3 verbeteringen per cyclus                   │
│  └─ Produceer: improvement-plan.md                       │
│                                                          │
│  FASE 3: IMPLEMENTATIE (parallelle worker-agents)        │
│  ├─ Worker A: Template verbetering                       │
│  ├─ Worker B: Config/settings aanpassing                 │
│  └─ Worker C: Nieuwe skill of hook schrijven             │
│                                                          │
│  FASE 4: VALIDATIE (combiner-agent)                      │
│  ├─ Review alle voorgestelde wijzigingen                 │
│  ├─ Dry-run benchmark op wijzigingen                     │
│  └─ Produceer: improvement-proposal.md                   │
│                                                          │
│  FASE 5: MENSELIJKE REVIEW                              │
│  └─ `oa improve review` → mens keurt goed/wijst af      │
│                                                          │
│  FASE 6: TOEPASSING                                      │
│  └─ `oa improve apply` → pas goedgekeurde wijzigingen    │
│     toe op repo, templates, config                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Wat de OA Improver kan wijzigen

| Domein | Voorbeeld wijziging | Mens nodig? |
|---|---|---|
| Agent templates | CLAUDE.md verbeteringen op basis van lessons | Ja |
| Shared skills | Nieuwe skill op basis van herhaald patroon | Ja |
| OA config | Model-keuze per agent-type op basis van data | Ja |
| Hook scripts | Nieuwe post-run hook voor gedetecteerd patroon | Ja |
| Benchmark suite | Nieuwe benchmark voor ontdekte edge case | Ja |
| README/docs | Documentatie updaten op basis van nieuwe features | Ja |
| LESSONS.md | Consolidatie en opschoning van lessons | Nee (auto) |

**Regel: alles dat code of configuratie wijzigt vereist menselijke goedkeuring.**

### Voorbeeld Verbetering Cyclus

```markdown
# improvement-proposal.md — Gegenereerd door OA Improver

## Diagnose
Analyse van 47 runs in afgelopen 2 weken toont:
- Worker agents falen 34% van de tijd op testing-taken
- Gemiddelde faalreden: "tests geschreven maar niet uitgevoerd"
- 3 lessons bevestigen dit patroon (L-042, L-051, L-058)

## Voorgestelde Verbetering

### 1. Template wijziging: code-worker
**Toevoegen aan code-worker CLAUDE.md:**
"Na het schrijven van tests, voer ze altijd uit met het relevante 
test-framework. Rapporteer het resultaat. Als tests falen, fix ze 
voordat je je output markeert als compleet."

**Verwachte impact:** Worker test-success rate van 66% → ~85%
**Risico:** Laag — voegt een instructie toe, verwijdert niets

### 2. Nieuwe shared skill: test-execution
**Aanmaken:** agents/shared-skills/test-execution/SKILL.md
**Inhoud:** Best practices voor het uitvoeren en valideren van tests
**Trigger:** Elke agent die tests moet schrijven of uitvoeren

### 3. Config wijziging
**Verhoog worker timeout van 300s naar 420s**
**Reden:** Tests uitvoeren voegt ~90s toe aan gemiddelde duur
**Data:** 89% van test-inclusieve runs voltooit binnen 400s
```

### Scheduling

```yaml
# ~/.oa/config.yaml
improver:
  auto_schedule: "weekly"      # weekly, biweekly, manual
  max_changes_per_cycle: 3
  require_human_approval: true  # ALTIJD true — geen uitzondering
  min_runs_before_analysis: 20  # Minimaal 20 runs nodig voor data
```

### CLI

```bash
oa improve                       # Start verbetering cyclus
oa improve --diagnose-only       # Alleen analyse, geen voorstellen
oa improve review                # Bekijk openstaande voorstellen
oa improve apply                 # Pas goedgekeurde voorstellen toe
oa improve history               # Geschiedenis van verbeteringen
oa improve rollback <cycle-id>   # Draai een cyclus terug
```

### Veiligheidsmaatregelen

1. **Menselijke goedkeuring verplicht** voor elke code/config-wijziging
2. **Maximum 3 wijzigingen per cyclus** — voorkom grote verschuivingen
3. **Rollback altijd mogelijk** — elke cyclus is een versioned snapshot
4. **Minimum datadrempel** — geen suggesties zonder voldoende runs
5. **Dry-run benchmarks** — test wijzigingen voordat ze worden voorgesteld
6. **No recursion** — de improver mag zichzelf niet wijzigen (dat doe je handmatig)

## Het Vliegwiel Effect

```
Meer agent-runs
    → Meer telemetrie data
        → Betere diagnoses
            → Slimmere templates & skills
                → Hogere success-rates
                    → Meer vertrouwen in het systeem
                        → Meer agent-runs
                            → ...
```

Dit is het exponentiële effect waar je naar zoekt. Hoe meer je OA gebruikt, hoe beter het wordt. Elke run is een investering in het systeem.

## Acceptatiecriteria

- [ ] `oa improve` spawnt een complete analyse-en-verbeter pipeline
- [ ] Diagnose-fase leest telemetrie, lessons en benchmarks
- [ ] Maximaal 3 verbeteringen voorgesteld per cyclus
- [ ] Alle wijzigingen vereisen menselijke goedkeuring
- [ ] `oa improve review` toont voorstellen met data-onderbouwing
- [ ] `oa improve apply` past goedgekeurde wijzigingen toe
- [ ] `oa improve rollback` draait een cyclus terug
- [ ] Verbetering-geschiedenis wordt bewaard
- [ ] Werkt alleen wanneer minimaal 20 runs beschikbaar zijn
