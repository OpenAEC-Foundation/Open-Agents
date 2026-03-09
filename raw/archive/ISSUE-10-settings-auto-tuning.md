# feat: Global/Local Settings Auto-Tuning — configuratie die zichzelf optimaliseert

**Labels:** `self-improvement` `priority-high` `meta-automation` `context-engineering`  
**Depends on:** #1 (Run Telemetry), #5 (Lessons Extraction)

## Probleem

OA settings worden handmatig ingesteld en nooit herzien. Welk model werkt het best voor planners vs. workers? Welke timeout is optimaal? Hoeveel parallelle workers zijn effectief? Dit zijn empirische vragen die beantwoord kunnen worden met data die we al (na #1) verzamelen.

## Oplossing

Een analyse-systeem dat run-telemetrie aggregeert en configuratiesuggesties genereert.

### Wat Auto-Tuning Kan Optimaliseren

**Global level (~/.oa/config.yaml):**
```yaml
# Huidige settings met auto-tune annotaties
defaults:
  model: "claude/sonnet"
  # ↑ AUTO-TUNE: sonnet had 23% hogere success-rate dan haiku voor planners
  #   maar haiku was 40% sneller voor simpele worker-taken
  
  max_parallel_agents: 4
  # ↑ AUTO-TUNE: bij >5 agents daalt success-rate van 89% naar 71%
  #   vermoedelijk door filesystem contention
  
  pipeline_timeout_seconds: 600
  # ↑ AUTO-TUNE: 94% van succesvolle pipelines voltooit binnen 480s
  #   suggestie: verlaag naar 500s
```

**Per-agent-type level:**
```yaml
agent_types:
  planner:
    model: "claude/sonnet"     # Planners profiteren van sterkere modellen
    context_budget: 50000      # Planners gebruiken minder context
    
  code-worker:
    model: "claude/sonnet"     
    context_budget: 100000     # Workers hebben meer ruimte nodig
    auto_compact_at: 75        # Workers raken vaker vol
    
  combiner:
    model: "claude/sonnet"
    context_budget: 80000
```

### Het Analyse Proces

```
Wekelijkse auto-tune cycle (of handmatig via `oa tune`)
   │
   ▼
Aggregeer run-telemetrie van afgelopen periode
   │
   ├─ Per model: success-rate, gemiddelde duration, token-efficiency
   ├─ Per agent-type: context-gebruik, faalpatronen, optimale parallelisme
   ├─ Per pipeline-structuur: welke decomposities werken het best
   │
   ▼
Genereer tune-report.md
   │
   ├─ "Model X heeft 23% hogere success-rate voor planners"
   ├─ "Max 4 parallelle agents is optimaal voor jouw systeem"
   ├─ "Workers hebben gemiddeld 30% meer context nodig dan planners"
   │
   ▼
Voorstel configuratie-wijzigingen (YAML diff)
   │
   ▼
`oa tune review` → Mens keurt goed of wijst af
```

### CLI

```bash
oa tune                          # Draai analyse en toon suggesties
oa tune --apply                  # Pas goedgekeurde suggesties toe
oa tune report                   # Volledig rapport
oa tune history                  # Geschiedenis van tuning-beslissingen
```

### Veiligheid

- Tune-suggesties worden NOOIT automatisch toegepast
- Elke suggestie bevat de data-onderbouwing
- Rollback altijd mogelijk: vorige config wordt bewaard
- Maximum 3 wijzigingen per tune-cyclus (voorkom grote verschuivingen)

## Acceptatiecriteria

- [ ] `oa tune` analyseert run-telemetrie en genereert suggesties
- [ ] Suggesties bevatten data-onderbouwing (niet "ik denk" maar "data toont")
- [ ] Suggesties worden pas toegepast na menselijke goedkeuring
- [ ] Tune-geschiedenis wordt bewaard
- [ ] Suggesties dekken minimaal: model-keuze, parallelisme, timeouts
- [ ] Per-agent-type optimalisatie mogelijk
