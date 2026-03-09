# feat: Post-Run Hook System — de molen die na elke agent draait

**Labels:** `self-improvement` `priority-critical` `meta-automation`  
**Depends on:** #1 (Run Telemetry)  
**Blocks:** #4, #5, #6

## Probleem

Na elke agent-run gebeurt er... niets. De agent stopt, de output staat in een directory, en dat is het. Er is geen mechanisme om automatisch vervolgacties te triggeren op basis van het resultaat.

Dit is het kernprobleem. De "molen" die na elke run moet draaien bestaat nog niet.

## Oplossing

Een hook-systeem dat na elke agent-run configureerbare acties triggert. Hooks zijn simpele scripts of commando's die worden uitgevoerd met de `run-log.json` als input.

### Hook Architectuur

```
~/.oa/hooks/
├── post-run/                    ← Draait na ELKE agent-run
│   ├── 01-log-to-index.sh      ← Update runs-index.json
│   ├── 02-check-success.sh     ← Markeer success/failure
│   ├── 03-extract-lessons.sh   ← Trigger lessons extraction (zie #5)
│   ├── 04-evaluate-template.sh ← Template-kwaliteit beoordelen (zie #4)
│   └── 05-context-report.sh    ← Context-gebruik loggen (zie #3)
│
├── post-pipeline/               ← Draait na een complete pipeline
│   ├── 01-aggregate-stats.sh   ← Pipeline-brede statistieken
│   ├── 02-template-candidate.sh ← Succesvolle pipeline → template? (zie #4)
│   └── 03-benchmark-update.sh  ← Update benchmark-data (zie #6)
│
├── on-failure/                  ← Draait alleen bij gefaalde runs
│   ├── 01-log-failure.sh       ← Faalpatroon vastleggen
│   └── 02-suggest-fix.sh       ← Automatisch fix-suggestie genereren
│
└── on-success/                  ← Draait alleen bij succesvolle runs
    ├── 01-celebrate.sh          ← Korte bevestiging in TUI
    └── 02-template-score.sh    ← Template success-rate updaten
```

### Hook Executie Model

```python
# Pseudocode voor hook-runner
def run_post_hooks(run_log: dict, hook_dir: str):
    hooks = sorted(glob(f"{hook_dir}/*.sh"))
    for hook in hooks:
        env = {
            "OA_RUN_ID": run_log["run_id"],
            "OA_RUN_LOG": json.dumps(run_log),
            "OA_RUN_LOG_PATH": run_log_path,
            "OA_AGENT_NAME": run_log["agent_name"],
            "OA_AGENT_TEMPLATE": run_log["agent_template"],
            "OA_EXIT_STATUS": run_log["exit_status"],
            "OA_DURATION": str(run_log["duration_seconds"]),
            "OA_PIPELINE_ID": run_log.get("pipeline_id", ""),
        }
        subprocess.run(hook, env={**os.environ, **env}, timeout=30)
```

### Configuratie

```yaml
# ~/.oa/config.yaml
hooks:
  post_run:
    enabled: true
    timeout_seconds: 30
    parallel: false           # Sequentieel voor voorspelbaarheid
    skip_on_failure: false    # Hooks draaien ook als agent faalde
  
  post_pipeline:
    enabled: true
    timeout_seconds: 60
  
  on_failure:
    enabled: true
    auto_suggest_fix: true    # Spawn mini-agent voor fix-suggestie
  
  # Hooks kunnen ook per-project overschreven worden
  # in .claude/oa-hooks/ (lokaal) of project-level
```

### CLI

```bash
oa hooks list                 # Toon actieve hooks
oa hooks run post-run <id>    # Handmatig hooks triggeren voor een run
oa hooks disable 03-extract   # Tijdelijk een hook uitschakelen
oa hooks add post-run my-hook.sh  # Nieuwe hook toevoegen
```

## De Molen Gevisualiseerd

```
oa run "taak"
   │
   ▼
Agent voert uit
   │
   ▼
run-log.json gegenereerd (#1)
   │
   ▼
┌─────────── POST-RUN HOOKS ───────────┐
│                                       │
│  ① Index updaten                      │
│  ② Success/failure markeren           │
│  ③ Lessons extractie triggeren  ──────┼──→ LESSONS.md groeit
│  ④ Template evalueren           ──────┼──→ Template score updaten
│  ⑤ Context rapport genereren   ──────┼──→ Context health data
│                                       │
│  Als SUCCESS:                         │
│  ⑥ Template success-rate +1    ──────┼──→ Template ranking
│  ⑦ Pipeline template-kandidaat ──────┼──→ Nieuwe templates (#4)
│                                       │
│  Als FAILURE:                         │
│  ⑧ Faalpatroon loggen          ──────┼──→ Known issues DB
│  ⑨ Fix-suggestie genereren     ──────┼──→ Notification
│                                       │
└───────────────────────────────────────┘
   │
   ▼
Systeem is slimmer geworden
```

## Acceptatiecriteria

- [ ] Hooks worden automatisch uitgevoerd na elke `oa run`
- [ ] Hook-directory structuur is aangemaakt met minimaal 3 werkende hooks
- [ ] Hooks ontvangen run-log data via environment variables
- [ ] `oa hooks list` toont actieve hooks
- [ ] Hooks zijn per-project overschrijfbaar
- [ ] Timeout-mechanisme voorkomt hangende hooks
- [ ] Hook-fouten worden gelogd maar blokkeren de gebruiker niet

## Waarom dit tweede

Dit is het zenuwstelsel van het zelflerende systeem. Zonder hooks moet elke meta-actie handmatig getriggerd worden. Met hooks wordt elke agent-run automatisch een leermoment.
