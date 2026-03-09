# feat: Automated Lessons Extraction — elke run voedt de kennisbasis

**Labels:** `self-improvement` `priority-high` `meta-automation`  
**Depends on:** #1 (Run Telemetry), #2 (Post-Run Hooks)

## Probleem

LESSONS.md bestaat al in de repo maar wordt handmatig bijgehouden. Elke agent-run bevat potentieel waardevolle lessen die nu verloren gaan: wat werkte, wat faalde, welke patronen herhalen zich.

## Oplossing

Een post-run hook die na elke run een mini-analyse doet en bevindingen toevoegt aan een gestructureerde kennisbasis. Volgt het ACE-patroon: accumulatie boven vervanging, geen volledige herschrijvingen.

### Het Mechanisme

```
run-log.json + agent output
   │
   ▼
lessons-extractor hook
   │  Spawnt mini Claude-aanroep (~500 tokens)
   │  Prompt: "Gegeven deze run-log en output,
   │           extraheer 0-2 lessen. Formaat: YAML.
   │           Alleen lessen die NIEUW zijn t.o.v. bestaande."
   │
   ▼
~/.oa/knowledge/
├── lessons.yaml               ← Gestructureerde lessen (append-only)
├── failure-patterns.yaml      ← Herhaalde faalpatronen
├── success-patterns.yaml      ← Bewezen succespatronen  
└── stats.yaml                 ← Aggregate statistieken
```

### Lessons Structuur

```yaml
# ~/.oa/knowledge/lessons.yaml
lessons:
  - id: "L-2026-0308-001"
    extracted_from: "run-20260308-143025-worker-1"
    date: "2026-03-08"
    category: "agent-design"
    lesson: "Workers presteren beter wanneer de planner expliciete succescriteria meegeeft in de taakomschrijving"
    evidence: "3 van 4 workers zonder succescriteria leverden incomplete output"
    confidence: 0.8
    times_confirmed: 1         # Groeit wanneer patroon herhaald wordt
    applied_to: []              # Templates die deze les hebben overgenomen

  - id: "L-2026-0308-002"
    extracted_from: "run-20260308-143022-planner"
    date: "2026-03-08"
    category: "context-management"
    lesson: "Planners die eerst de bestandsstructuur scannen voordat ze decomposen produceren betere taakverdelingen"
    evidence: "Scan-first planner had 92% worker-success vs 67% zonder scan"
    confidence: 0.7
    times_confirmed: 1
    applied_to: []
```

### Deduplicatie

De extractor checkt bestaande lessen vóór toevoegen:
1. **Exact match** — Zelfde les, skip
2. **Semantisch vergelijkbaar** — Verhoog `times_confirmed` van bestaande les
3. **Nieuw** — Voeg toe met `confidence: 0.6` (groeit met bevestigingen)

### Auto-toepassing

Wanneer een les `times_confirmed ≥ 3` bereikt en `confidence ≥ 0.8`:
- Genereer een voorstel om de les toe te passen op relevante templates
- Voeg toe aan `oa templates review` queue (mens beslist)

### CLI

```bash
oa lessons                        # Toon recente lessen
oa lessons --category agent-design
oa lessons --confirmed            # Alleen hoog-confidence lessen
oa lessons apply <lesson-id>      # Pas les toe op templates (interactief)
oa lessons stats                  # Hoeveel lessen, categorieën, trends
```

## Acceptatiecriteria

- [ ] Lessons worden automatisch geëxtraheerd na elke run via post-run hook
- [ ] Deduplicatie voorkomt herhalingen
- [ ] `times_confirmed` groeit bij herhaalde patronen
- [ ] `oa lessons` toont gestructureerd overzicht
- [ ] Lessons zijn YAML en machine-readable
- [ ] Append-only: geen bestaande lessen worden overschreven
