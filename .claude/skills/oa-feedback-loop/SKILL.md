---
name: oa-feedback-loop
description: Bidirectioneel communicatiesysteem tussen meta-orchestrator en agents. Auto-loads bij agent spawning, inbox monitoring, statusupdates ontvangen, of feedback van agents. Triggert op: oa send, oa inbox, oa watch-inbox, agent done, blocked agent, feedback loop, terugkoppeling.
user-invocable: false
---

# Open-Agents Feedback Loop

## De meta-orchestrator heet "meta"

Deze Claude Code sessie is de meta-orchestrator. In het oa-systeem heet zij **"meta"**.

- Inbox: `oa inbox meta --unread`
- Watch live: `oa watch-inbox meta`
- Agents sturen statusupdates naar "meta" via `oa send meta "<bericht>" --from <agent-naam>`

## Wanneer de inbox checken

Check `oa inbox meta --unread` **altijd** na:
1. Een agent batch is klaar (poller meldt het)
2. Een agent langer dan verwacht bezig is
3. Je een statusupdate verwacht

```bash
oa inbox meta --unread
```

## Hoe agents rapporteren (automatisch via CLAUDE.md)

Elke gespawende agent krijgt in zijn CLAUDE.md:

| Moment | Commando |
|--------|----------|
| Start | `oa send meta "🚀 Gestart: <taak>" --from <naam>` |
| Milestone | `oa send meta "✅ Milestone: <beschrijving>" --from <naam>` |
| Geblokkeerd | `oa send meta "🔴 Geblokkeerd: <reden>" --from <naam>` |
| Klaar | `oa send meta "✅ KLAAR: <samenvatting>" --from <naam>` |
| Fout | `oa send meta "❌ FOUT: <beschrijving>" --from <naam>` |

Sub-agents (depth 2+) sturen naar hun directe parent, niet naar meta.
De parent relay't omhoog naar meta.

## Down-the-chain hiërarchie

```
meta (deze sessie)
  └── orchestrator-a (stuurt naar meta)
        └── worker-1 (stuurt naar orchestrator-a)
        └── worker-2 (stuurt naar orchestrator-a)
  └── orchestrator-b (stuurt naar meta)
        └── researcher-1 (stuurt naar orchestrator-b)
```

Elke laag stuurt naar zijn directe parent. Meta ontvangt alleen berichten van depth-1 agents.

## Tmux notificaties

Het systeem stuurt automatisch tmux popups bij binnenkomende berichten:
```bash
# Handmatig starten als de watcher niet actief is:
oa watch-inbox meta &
```

## Reageren op berichten

Na `oa inbox meta --unread`:

- **🚀 Gestart** → geen actie nodig
- **✅ Milestone** → noteer voortgang, eventueel volgende instructie sturen
- **🔴 Geblokkeerd** → geef input via `oa send <agent> "<antwoord>" --from meta`
- **✅ KLAAR** → `oa collect <agent>`, verwerk output, spawn volgende agent
- **❌ FOUT** → spawn fix-agent of stuur instructie

## Antwoorden aan agents

```bash
oa send <agent-naam> "<instructie>" --from meta
```

De agent checkt zijn inbox via `oa inbox <naam> --unread` en reageert.

## Spawn altijd met parent-awareness

```bash
# Depth-1 agent (parent = meta, automatisch)
oa run "<taak>" --name worker-1 --model claude/sonnet --direct

# Depth-2 agent (parent moet expliciet)
oa run "<taak>" --name worker-1-sub --model claude/haiku --direct --parent worker-1
```

## Snelle workflow

```bash
# 1. Spawn agents
oa run "..." --name agent-a --model claude/sonnet --direct

# 2. Poll (background)
while true; do running=$(oa status 2>/dev/null | grep -c " running " || true); [ "$running" -eq 0 ] && break; sleep 10; done &

# 3. Check inbox terwijl je wacht
oa inbox meta --unread

# 4. Zodra klaar
oa collect agent-a
```
