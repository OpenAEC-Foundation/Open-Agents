# feat: Auto-Compaction Triggers — voorkom context rot automatisch

**Labels:** `self-improvement` `priority-medium` `context-engineering`  
**Depends on:** #3 (Context Tracking)

## Probleem

Langlopende agents raken hun contextvenster vol. Zonder interventie leidt dit tot context rot: degraderende performance, hallucinaties, vergeten instructies. Anthropic beschrijft compaction als "de eerste hefboom in context engineering."

## Oplossing

Automatische compaction-trigger wanneer context threshold wordt bereikt.

### Mechanisme

```
Context monitoring loop (vanuit #3)
   │
   ├─ window_pct < 60% → niets doen
   ├─ window_pct 60-75% → waarschuwing in TUI
   └─ window_pct > 75% → auto-compaction trigger
         │
         ▼
   Compaction agent (mini-spawn):
   "Vat de huidige sessie samen. Bewaar:
    - Architectuurbeslissingen
    - Onopgeloste issues
    - Kritieke implementatiedetails
    Verwijder:
    - Redundante tool-outputs
    - Afgeronde deeltaken
    - Herhaalde instructies"
         │
         ▼
   Nieuw contextvenster met samenvatting
   + laatste 5 bestanden waar aan gewerkt
```

### Configuratie

```yaml
# ~/.oa/config.yaml
compaction:
  auto_trigger_pct: 75
  strategy: "summarize"          # of "trim" voor simpele truncatie
  preserve_recent_files: 5
  preserve_sections:
    - "architecture decisions"
    - "unresolved bugs"
    - "active task"
  log_compaction_events: true    # Voor analyse
```

### CLI

```bash
oa compact <agent>               # Handmatige compaction
oa compact --all                 # Alle agents boven threshold
oa compact --dry-run <agent>     # Toon wat gecompact zou worden
```

## Acceptatiecriteria

- [ ] Automatische waarschuwing bij 60% context-gebruik
- [ ] Automatische compaction bij 75% (configureerbaar)
- [ ] Compaction bewaart kritieke context (architectuurbeslissingen, actieve taak)
- [ ] Compaction-events worden gelogd in run-telemetrie
- [ ] `oa compact --dry-run` toont preview
- [ ] Handmatige compaction via `oa compact <agent>`
