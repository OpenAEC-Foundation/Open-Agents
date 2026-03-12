#!/bin/bash
# session-start.sh — Open-Agents bootstrap protocol
# Gebruik: bash scripts/session-start.sh
# Doel: Claude zsm up to speed brengen + session-meta spawnen op Hetzner

set -e
REPO="/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents"
cd "$REPO"

echo "╔══════════════════════════════════════════════════╗"
echo "║         Open-Agents Session Bootstrap            ║"
echo "╚══════════════════════════════════════════════════╝"

# ─── 1. Context laden ──────────────────────────────────────────────────────────
echo ""
echo "▶ 1/5  LESSONS.md (laatste 50 regels)"
echo "────────────────────────────────────────"
tail -50 LESSONS.md 2>/dev/null || echo "(geen LESSONS.md)"

echo ""
echo "▶ 2/5  Laatste HANDOFF"
echo "────────────────────────────────────────"
HANDOFF=$(ls docs/HANDOFF-*.md 2>/dev/null | sort | tail -1)
if [ -n "$HANDOFF" ]; then
  echo "→ $HANDOFF"
  cat "$HANDOFF"
else
  echo "(geen HANDOFF gevonden)"
fi

# ─── 2. Sessie starten ─────────────────────────────────────────────────────────
echo ""
echo "▶ 3/5  Sessie starten"
echo "────────────────────────────────────────"
oa start 2>/dev/null || true
sleep 1
oa status 2>/dev/null || echo "(oa status niet beschikbaar)"

# ─── 3. Credentials sync ───────────────────────────────────────────────────────
echo ""
echo "▶ 4/5  Claude credentials sync naar Hetzner"
echo "────────────────────────────────────────"
bash scripts/sync-claude-credentials.sh hetzner-agent 2>/dev/null && echo "✅ Credentials gesynchroniseerd" || echo "⚠ Sync mislukt — agents kunnen auth errors krijgen"

# ─── 4. Session Meta-Orchestrator spawnen ──────────────────────────────────────
echo ""
echo "▶ 5/5  Session-Meta spawnen op Hetzner"
echo "────────────────────────────────────────"
oa run 'Je bent SESSION-META, de primaire meta-orchestrator voor deze sessie.

## Rol
Je ontvangt taken van Claude (de dispatcher) via je inbox en delegeert ALLES naar workers.
Je voert NOOIT zelf implementatie uit — je coördineert, delegeert, valideert en itereert.

## Gedrag
1. Poll je inbox elke 30 seconden: `oa inbox session-meta --unread`
2. Bij nieuwe taak van Claude:
   a. Breek taak op in parallelle worker-taken
   b. Spawn workers via: `oa run "..." --name worker-<naam> --model claude/sonnet --remote hetzner-agent --direct`
   c. Monitor workers: `oa inbox session-meta --unread` (workers sturen updates)
   d. Valideer output — stuur feedback bij onvolledigheid: `oa send <worker> "feedback..." --from session-meta`
   e. Itereer tot alle workers groen zijn
   f. Rapporteer eindresultaat: `oa send meta "KLAAR: ..." --from session-meta`
3. Workers spawnen die zelf ook kunnen orchestreren krijgen `--can-spawn`

## Worker spawnen (template)
```bash
oa run "Je bent een WORKER. Taak: ...
## Output
Schrijf naar: /home/oa-agent/Open-Agents/...
## Scope
- ...
## Regels
- Direct schrijven, geen proposals
- Rapporteer KLAAR via: oa send session-meta KLAAR --from worker-naam" \
  --name worker-naam --model claude/sonnet --remote hetzner-agent --direct
```

## NOOIT
- Zelf code schrijven of bestanden aanmaken
- Stoppen na één ronde — blijf actief en poll inbox
- Workers spawnen zonder expliciete scope en output pad' \
  --name session-meta \
  --model claude/sonnet \
  --remote hetzner-agent \
  --can-spawn \
  --direct

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Sessie klaar — session-meta actief op Hetzner ║"
echo "║                                                  ║"
echo "║  Stuur taken:                                    ║"
echo "║  oa send session-meta 'taak' --from meta         ║"
echo "╚══════════════════════════════════════════════════╝"
