# feat: Auto Template Generation — succesvolle agents worden herbruikbare templates

**Labels:** `self-improvement` `priority-high` `meta-automation` `agent-lifecycle`  
**Depends on:** #1 (Run Telemetry), #2 (Post-Run Hooks)

## Probleem

Wanneer een agent een taak uitstekend voltooit, gaat die kennis verloren. De CLAUDE.md, de taakdecompositie, de tool-keuzes — alles verdwijnt in een workspace die uiteindelijk wordt opgeruimd. Succesvolle patronen worden niet automatisch herbruikbaar.

## Oplossing

Een post-run hook die succesvolle agent-runs analyseert en automatisch template-kandidaten genereert.

### Het Proces

```
Agent voltooit taak succesvol
   │
   ▼
Post-run hook: template-candidate-evaluator
   │
   ├─ Score ≥ threshold?
   │   ├─ NEE → Log score, geen actie
   │   └─ JA → Genereer template-kandidaat
   │            │
   │            ▼
   │     ~/.oa/template-candidates/
   │     ├── candidate-20260308-worker-csv.yaml
   │     └── candidate-20260308-planner-api.yaml
   │
   ▼
oa templates review              ← Mens beoordeelt kandidaten
   │
   ├─ Goedgekeurd → Verplaats naar agents/templates/
   │                  Update template-registry
   └─ Afgewezen  → Log reden, train het beoordelingssysteem
```

### Template-Kandidaat Structuur

```yaml
# ~/.oa/template-candidates/candidate-20260308-worker-csv.yaml
metadata:
  generated_from: "run-20260308-143025-worker-1"
  task_category: "data-validation"
  success_score: 0.92
  generated_at: "2026-03-08T14:45:00Z"

template:
  name: "data-validator-worker"
  description: "Worker agent gespecialiseerd in data validatie taken"
  model: "claude/sonnet"
  
  claude_md: |
    # Data Validation Worker
    
    ## Rol
    Je valideert databestanden tegen een specificatie.
    
    ## Aanpak
    1. Lees eerst het volledige specificatie-document
    2. Scan het databestand op structurele problemen
    3. Valideer elke kolom/veld tegen de specificatie
    4. Produceer een validatierapport met specifieke foutlocaties
    
    ## Output
    - validation-report.md met bevindingen
    - fixed-data.csv als reparatie mogelijk is

  tags: ["data", "validation", "csv", "worker"]
  
  # Wat maakte deze run succesvol — de kern voor toekomstig hergebruik
  success_factors:
    - "Specificatie eerst lezen voordat data wordt geanalyseerd"
    - "Foutlocaties met rij/kolom nummers rapporteren"
    - "Automatische fix-suggesties per fout"
```

### Scoring Mechanisme

De template-kandidaat evaluator scoort op basis van:

| Factor | Gewicht | Hoe gemeten |
|---|---|---|
| Exit status success | 30% | run-log.json |
| Taak-compleetheid | 25% | Zijn alle verwachte outputs aanwezig? |
| Token-efficiency | 15% | Tokens/output-regel ratio |
| Tijd-efficiency | 10% | Sneller dan gemiddelde voor dit taaktype |
| Herbruikbaarheid | 20% | Is het taakpatroon generiek genoeg? |

Threshold voor kandidaat-generatie: **score ≥ 0.75**

### CLI

```bash
oa templates review               # Bekijk openstaande kandidaten
oa templates approve <candidate>   # Goedkeuren → wordt template
oa templates reject <candidate> --reason "te specifiek"
oa templates list                  # Alle beschikbare templates
oa templates stats                 # Success-rates per template
```

## Acceptatiecriteria

- [ ] Succesvolle runs worden automatisch geëvalueerd als template-kandidaat
- [ ] Kandidaten worden opgeslagen met metadata en scoring
- [ ] `oa templates review` toont kandidaten voor menselijke beoordeling
- [ ] Goedgekeurde templates zijn direct bruikbaar via `oa run --template <naam>`
- [ ] Template success-rates worden bijgehouden over tijd
- [ ] Minimaal de CLAUDE.md en taak-categorie worden geëxtraheerd
