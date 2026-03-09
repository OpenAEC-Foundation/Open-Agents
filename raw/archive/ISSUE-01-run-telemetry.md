# feat: Agent Run Telemetry — run-log.json per agent-run

**Labels:** `self-improvement` `priority-critical` `agent-lifecycle`  
**Depends on:** niets — dit is het fundament  
**Blocks:** #2, #3, #4, #5, #6, #10, #11, #12

## Probleem

Elke agent-run is een black box. Na voltooiing weten we niet:
- Hoeveel tokens verbruikt
- Hoe lang de run duurde
- Welke tools gebruikt
- Hoeveel bestanden aangemaakt/gewijzigd
- Of de taak succesvol was
- Wat de kwaliteit van de output was

Zonder deze data is zelflering onmogelijk. Dit is het equivalent van een bedrijf runnen zonder boekhouding.

## Oplossing

Elke `oa run` produceert automatisch een `run-log.json` in de agent-workspace:

```json
{
  "run_id": "run-20260308-143022-planner",
  "agent_name": "planner",
  "agent_template": "agents/planner/default",
  "task": "Decompose CSV validator library into subtasks",
  "model": "claude/sonnet",
  "started_at": "2026-03-08T14:30:22Z",
  "completed_at": "2026-03-08T14:32:45Z",
  "duration_seconds": 143,
  "exit_status": "success",
  "context": {
    "tokens_estimated": 45200,
    "window_percentage": 36,
    "compaction_triggered": false
  },
  "outputs": {
    "files_created": ["plan.md", "tasks.json"],
    "files_modified": [],
    "total_output_lines": 287
  },
  "spawned_children": ["worker-1", "worker-2"],
  "parent_agent": null,
  "pipeline_id": "pipe-20260308-143020",
  "tags": ["planning", "decomposition"],
  "claude_md_used": "/path/to/CLAUDE.md",
  "summary": "Auto-generated: Decomposed task into 4 parallel subtasks..."
}
```

## Implementatie

### Stap 1: Hook in `oa run`
Na elke `claude` CLI-aanroep in een tmux window:
- Vang exit-code op
- Lees tmux scrollback buffer voor output-analyse
- Genereer timestamp-gebaseerd `run_id`
- Schrijf `run-log.json` naar `~/.oa/runs/{run_id}/`

### Stap 2: Centraal run-register
```
~/.oa/
├── runs/
│   ├── run-20260308-143022-planner/
│   │   ├── run-log.json
│   │   └── workspace/  → symlink naar agent workspace
│   ├── run-20260308-143025-worker-1/
│   └── ...
├── runs-index.json          ← overzicht voor snelle queries
└── runs-archive/            ← oude runs na cleanup
```

### Stap 3: CLI-integratie
```bash
oa runs                      # Lijst recente runs
oa runs --failed             # Alleen gefaalde runs
oa runs --agent planner      # Runs van specifiek agent-type
oa runs --pipeline pipe-xxx  # Alle runs in een pipeline
oa run-log <run-id>          # Detail van specifieke run
```

### Stap 4: Samenvatting auto-generatie
Na elke run: spawn een minimale Claude-aanroep die een 1-2 zin samenvatting genereert op basis van de task + output. Dit kost ~500 tokens maar levert enorme waarde voor latere analyse.

## Acceptatiecriteria

- [ ] Elke `oa run` produceert een `run-log.json`
- [ ] `oa runs` toont overzicht van recente runs
- [ ] Run-logs bevatten minimaal: run_id, agent_name, task, duration, exit_status
- [ ] Token-schatting is opgenomen (mag initieel geschat zijn op basis van output-lengte)
- [ ] Pipeline-runs zijn gelinkt (parent/child relaties traceerbaar)
- [ ] Run-logs zijn machine-readable (valide JSON)

## Waarom dit eerst

Zonder telemetrie is elke volgende verbetering blind. Run-logs zijn de grondstof voor:
- Post-run hooks (#2)
- Context tracking (#3)
- Auto template generation (#4)
- Lessons extraction (#5)
- Self-benchmarking (#6)
- Settings auto-tuning (#10)
