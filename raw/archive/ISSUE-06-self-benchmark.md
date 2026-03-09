# feat: Self-Benchmark Workflow — OA meet zijn eigen verbetering

**Labels:** `self-improvement` `priority-high` `meta-automation`  
**Depends on:** #1 (Run Telemetry), #2 (Post-Run Hooks)

## Probleem

Zonder meting geen verbetering. We weten niet of OA over tijd beter of slechter presteert. Veranderingen aan templates, hooks of configuratie hebben onbekende impact.

## Oplossing

Een periodieke benchmark die OA gebruikt om zichzelf te evalueren — de ultieme zelfreferentie.

### Benchmark Suite

```yaml
# ~/.oa/benchmarks/suite.yaml
benchmarks:
  - id: "bench-simple-task"
    description: "Eenvoudige single-agent taak"
    command: "oa run 'Schrijf een Python functie die email adressen valideert met tests'"
    metrics: [duration, tokens, output_quality, test_pass_rate]
    
  - id: "bench-pipeline-3"
    description: "Pipeline met 3 workers"
    command: "oa pipeline 'Bouw een REST API met auth, tests en docs'"
    metrics: [duration, tokens, coordination_quality, output_completeness]
    
  - id: "bench-delegate"
    description: "Delegate mode autonomie"
    command: "oa delegate 'Refactor een module met 5 bestanden'"
    metrics: [duration, tokens, agents_spawned, success_rate]

  - id: "bench-context-stress"
    description: "Lange taak die context stress veroorzaakt"
    command: "oa run 'Analyseer en documenteer een 500-regel codebase'"
    metrics: [duration, tokens, context_peak_pct, compaction_events]
```

### Benchmark Uitvoering

```bash
oa benchmark run                  # Draai volledige suite
oa benchmark run bench-simple     # Draai specifieke benchmark
oa benchmark compare              # Vergelijk laatste 2 runs
oa benchmark history              # Toon trend over tijd
oa benchmark report               # Genereer rapport
```

### Resultaat Opslag

```json
// ~/.oa/benchmarks/results/2026-03-08.json
{
  "date": "2026-03-08",
  "oa_version": "0.4.2",
  "results": {
    "bench-simple-task": {
      "duration_seconds": 45,
      "tokens_total": 12400,
      "exit_status": "success",
      "metrics": {
        "output_quality": 0.88,
        "test_pass_rate": 1.0
      }
    }
  },
  "comparison_with_previous": {
    "duration_change": "-12%",
    "token_change": "-8%",
    "quality_change": "+3%"
  },
  "overall_score": 0.91
}
```

### Automatisch Draaien

Via post-pipeline hook of cron/scheduled task:
- Wekelijks: volledige suite
- Na elke template-wijziging: relevante benchmarks
- Na OA version update: volledige suite

## Acceptatiecriteria

- [ ] Benchmark suite definitie in YAML
- [ ] `oa benchmark run` voert benchmarks uit en slaat resultaten op
- [ ] `oa benchmark compare` toont delta met vorige run
- [ ] Resultaten zijn JSON en machine-readable
- [ ] Minimaal 3 benchmark-scenario's gedefinieerd
- [ ] Trend over tijd zichtbaar
