# feat: Agent Graveyard & Resurrection — niets gaat verloren

**Labels:** `self-improvement` `priority-medium` `agent-lifecycle`  
**Depends on:** #1 (Run Telemetry), #4 (Auto Template Generation)

## Probleem

Voltooide agents worden opgeruimd of vergeten. Maar soms wil je:
- Een succesvolle agent exact reproduceren met een nieuwe taak
- Een gefaalde agent opnieuw proberen met aangepaste instructies
- De configuratie van een oude agent inspecteren
- Een agent-"lijn" bijhouden: versie 1 faalde, versie 2 slaagde — wat veranderde?

## Oplossing

Een graveyard-systeem dat voltooide agents bewaart als lichtgewicht snapshots, met de mogelijkheid om ze te "resurrect"-en.

### Agent Snapshot

```json
// ~/.oa/graveyard/{run-id}/snapshot.json
{
  "run_id": "run-20260308-143025-worker-1",
  "agent_name": "worker-1",
  "template_used": "code-worker",
  "task": "Implementeer email validatie",
  "claude_md_content": "...(volledige CLAUDE.md)...",
  "skills_loaded": ["testing", "error-handling"],
  "model": "claude/sonnet",
  "exit_status": "success",
  "duration_seconds": 89,
  "output_summary": "Email validator module + 12 tests, 100% pass",
  "lineage": {
    "parent": "run-20260308-143022-planner",
    "children": [],
    "pipeline": "pipe-20260308-143020",
    "generation": 2
  },
  "archived_at": "2026-03-08T14:45:00Z"
}
```

### CLI

```bash
oa graveyard                     # Lijst gearchiveerde agents
oa graveyard --successful        # Alleen succesvolle
oa graveyard --failed            # Alleen gefaalde
oa graveyard inspect <run-id>    # Bekijk snapshot details

oa resurrect <run-id>            # Herstart agent met zelfde config
oa resurrect <run-id> --task "nieuwe taak"  # Zelfde config, andere taak
oa resurrect <run-id> --improve  # Start met verbeterde CLAUDE.md
                                 # (op basis van lessons uit #5)
```

### Resurrection met Verbetering

Het krachtigste feature: `oa resurrect --improve` spawnt de agent opnieuw maar met automatisch verbeterde instructies:

```
oa resurrect run-20260308-worker-fail --improve
   │
   ▼
Lees snapshot + faalreden uit run-log
   │
   ▼
Zoek relevante lessons uit kennisbasis (#5)
   │
   ▼
Genereer verbeterde CLAUDE.md:
   "Originele instructies + les: 'Voeg expliciete
    error handling toe voor edge cases' + les: 'Valideer
    input voordat processing begint'"
   │
   ▼
Spawn agent met verbeterde config
   │
   ▼
Log als "generation 2" van originele agent
```

### Lineage Tracking

Agents vormen families:
```
run-001-worker-auth (gen 1) ← FAILED
   └─→ run-005-worker-auth-v2 (gen 2) ← FAILED  
        └─→ run-009-worker-auth-v3 (gen 3) ← SUCCESS
             └─→ Auto template candidate (#4)
```

`oa lineage <run-id>` toont de volledige afstammingslijn.

## Acceptatiecriteria

- [ ] Voltooide agents worden automatisch gesnapshot naar graveyard
- [ ] Snapshots bevatten volledige CLAUDE.md, skills, model, taak
- [ ] `oa resurrect <id>` reproduceert een agent met zelfde configuratie
- [ ] `oa resurrect --improve` past lessons toe op nieuwe instantie
- [ ] Lineage tracking: parent/child relaties over generaties
- [ ] Snapshots zijn lichtgewicht (geen volledige workspace, alleen config + metadata)
