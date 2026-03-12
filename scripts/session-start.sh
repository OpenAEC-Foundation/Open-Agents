#!/bin/bash
# session-start.sh — Open-Agents bootstrap protocol
# Gebruik: bash scripts/session-start.sh
# Doel: Claude zsm up to speed brengen + Hetzner updaten + session-meta spawnen

REPO="/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents"
cd "$REPO"

echo "╔══════════════════════════════════════════════════╗"
echo "║         Open-Agents Session Bootstrap            ║"
echo "╚══════════════════════════════════════════════════╝"

# ─── 1. Hetzner: repo updaten + oa-cli herladen ────────────────────────────────
echo ""
echo "▶ 1/6  Hetzner sync (repo pull + oa-cli reload)"
echo "────────────────────────────────────────"
if ssh -o ConnectTimeout=5 hetzner-agent "exit" 2>/dev/null; then
  ssh hetzner-agent "
    cd /home/oa-agent/Open-Agents &&
    git fetch origin --quiet &&
    git reset --hard origin/main --quiet &&
    echo '✅ Repo geüpdated naar:' \$(git log --oneline -1)
  " 2>&1
  # oa-cli is editable install (-e) → herstart daemon zodat nieuwe code actief is
  ssh hetzner-agent "
    pkill -f 'oa bridge' 2>/dev/null || true
    echo '✅ oa-cli actief (editable install pikt git pull automatisch op)'
  " 2>&1
else
  echo "⚠ Hetzner niet bereikbaar — lokale sessie"
fi

# ─── 2. Context laden ──────────────────────────────────────────────────────────
echo ""
echo "▶ 2/6  LESSONS.md (laatste 50 regels)"
echo "────────────────────────────────────────"
tail -50 LESSONS.md 2>/dev/null || echo "(geen LESSONS.md)"

echo ""
echo "▶ 3/6  Laatste HANDOFF"
echo "────────────────────────────────────────"
HANDOFF=$(ls docs/HANDOFF-*.md 2>/dev/null | sort | tail -1)
if [ -n "$HANDOFF" ]; then
  echo "→ $HANDOFF"
  cat "$HANDOFF"
else
  echo "(geen HANDOFF gevonden)"
fi

# ─── 3. Lokale sessie starten ──────────────────────────────────────────────────
echo ""
echo "▶ 4/6  Sessie starten"
echo "────────────────────────────────────────"
oa start 2>/dev/null || true
sleep 1
oa status 2>/dev/null || echo "(oa status niet beschikbaar)"

# ─── 4. Credentials sync ───────────────────────────────────────────────────────
echo ""
echo "▶ 5/6  Claude credentials sync naar Hetzner"
echo "────────────────────────────────────────"
bash scripts/sync-claude-credentials.sh hetzner-agent 2>/dev/null \
  && echo "✅ Credentials gesynchroniseerd" \
  || echo "⚠ Sync mislukt — agents kunnen auth errors krijgen"

# ─── 5. Session Meta-Orchestrator spawnen ──────────────────────────────────────
echo ""
echo "▶ 6/6  Session-Meta spawnen op Hetzner"
echo "────────────────────────────────────────"
oa run 'Je bent SESSION-META, de primaire meta-orchestrator voor deze sessie.

## Rol
Je ontvangt taken van Claude (de dispatcher) via je inbox en delegeert ALLES naar workers.
Je voert NOOIT zelf implementatie uit. Je coördineert, delegeert, valideert, itereert.

## Gedrag
1. Poll je inbox elke 30 seconden: `oa inbox session-meta --unread`
2. Bij nieuwe taak van Claude:
   a. Breek taak op in parallelle worker-taken
   b. Spawn workers: `oa run "..." --name worker-<naam> --model claude/sonnet --direct`
   c. Monitor: `oa inbox session-meta --unread` (workers sturen KLAAR/GEBLOKKEERD updates)
   d. Valideer worker output — stuur feedback als onvolledig: `oa send <worker> "feedback" --from session-meta`
   e. Itereer tot alle workers groen
   f. Rapporteer: `oa send meta "KLAAR: samenvatting" --from session-meta`
3. Workers die zelf kunnen orchestreren spawnen krijgen `--can-spawn`

## Worker template
```
oa run "Je bent een WORKER. Taak: <specifieke taak>

## Output
Schrijf naar: /home/oa-agent/Open-Agents/<pad>/result.md

## Scope
- <bullet 1>
- <bullet 2>

## Regels
- Direct schrijven, geen proposals
- Na voltooiing: oa send session-meta KLAAR --from <worker-naam>" \
  --name worker-<naam> --model claude/sonnet --direct
```

## NOOIT
- Zelf code schrijven of bestanden aanmaken
- Stoppen na één ronde — poll inbox en blijf actief
- Workers spawnen zonder output pad en scope' \
  --name session-meta \
  --model claude/sonnet \
  --can-spawn \
  --direct

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Sessie klaar — session-meta actief            ║"
echo "║                                                  ║"
echo "║  Stuur taken via:                                ║"
echo "║  oa send session-meta 'taak' --from meta         ║"
echo "╚══════════════════════════════════════════════════╝"
