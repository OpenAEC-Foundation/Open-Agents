# feat: Context Window Tracking — `oa status --context`

**Labels:** `self-improvement` `priority-critical` `context-engineering`  
**Depends on:** #1 (Run Telemetry)  
**Blocks:** #7 (Auto-Compaction)

## Probleem

Agents draaien in eigen contextvensters maar we hebben nul zicht op hoe vol die vensters raken. Context rot is het #1 performanceprobleem bij langlopende agents (bron: Anthropic), maar we meten het niet.

## Oplossing

Real-time context window monitoring per actieve agent.

### `oa status --context`

```
  Agent          Model          Tokens    Window%   Trend    Health
  ─────────────  ─────────────  ────────  ────────  ───────  ──────
  planner        claude/sonnet   12.4K     12%      →        ● Groen
  worker-auth    claude/sonnet   89.2K     71%      ↑↑       ● Rood
  worker-tests   claude/sonnet   34.1K     27%      ↑        ● Groen
  combiner       claude/sonnet   45.8K     37%      →        ● Geel

  ⚠ worker-auth: context boven 70% — compaction aanbevolen
```

### Hoe meten

Drie methoden (implementeer wat haalbaar is):

1. **Claude Code statusline API** — Als beschikbaar, lees de context window stats die Claude Code zelf bijhoudt (Freek Van der Herten's statusline-script doet dit al)
2. **Output-lengte heuristiek** — Schat tokens op basis van tmux scrollback buffer lengte × gemiddelde tokens/karakter ratio
3. **Periodic probe** — Stuur periodiek een minimale query ("context status?") en meet response-patronen

### Data opslag

```json
// ~/.oa/context-log/{agent-name}.jsonl  (append-only)
{"timestamp": "2026-03-08T14:30:22Z", "tokens_est": 12400, "window_pct": 12}
{"timestamp": "2026-03-08T14:31:45Z", "tokens_est": 23100, "window_pct": 18}
{"timestamp": "2026-03-08T14:33:02Z", "tokens_est": 45200, "window_pct": 36}
```

### Thresholds (configureerbaar)

```yaml
# ~/.oa/config.yaml
context:
  thresholds:
    green: 40       # < 40% = gezond
    yellow: 60      # 40-60% = let op
    red: 75         # > 75% = actie nodig
  auto_warn: true   # Toon waarschuwing in TUI bij geel/rood
  auto_compact: false  # Zie #7 voor auto-compaction
```

## Acceptatiecriteria

- [ ] `oa status --context` toont context-gebruik per actieve agent
- [ ] Kleurcodering (groen/geel/rood) op basis van configureerbare thresholds
- [ ] Context-data wordt gelogd naar append-only JSONL per agent
- [ ] Waarschuwing in TUI/dashboard wanneer agent boven threshold komt
- [ ] Historische context-groei inzichtelijk via `oa context-history <agent>`
