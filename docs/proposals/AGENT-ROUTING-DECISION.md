# Agent Routing Decision: Claude Code Agent vs oa Agent

> **Datum**: 2026-03-11
> **Context**: We hebben twee manieren om agents te spawnen. Wanneer welke?

---

## Twee systemen

| | Claude Code Agent tool | oa run (via WSL) |
|---|---|---|
| **Zichtbaar in dashboard** | Nee | Ja |
| **Messaging (send/inbox)** | Nee | Ja |
| **Session persistence** | Nee (verdwijnt met sessie) | Ja (agents.json + tmux) |
| **Windows native** | Ja | Nee (vereist WSL) |
| **Snelheid spawnen** | Instant | ~3-5 sec (tmux overhead) |
| **Context isolatie** | Worktree (optioneel) | Workspace (altijd) |
| **Kosten** | Subscription (same pool) | Subscription (same pool) |
| **Model keuze** | sonnet/opus/haiku | --model flag |
| **Delegatie** | Kan NIET sub-agents spawnen via oa | Kan NIET sub-agents spawnen (#9/#11) |
| **Output locatie** | Temp dir of worktree | --direct → project dir |

## Routing Regels

### Gebruik OA AGENTS (oa run) wanneer:
- Agent moet **zichtbaar** zijn in dashboard
- Agent moet **berichten** kunnen ontvangen/sturen
- Agent doet **langlopend werk** (>5 min)
- Agent output moet **bewaard** blijven na sessie
- Je wilt **status monitoring** via oa status/dashboard
- Agent is onderdeel van een **team** (Sprint 17)
- **Implementatie werk** — code schrijven, bestanden wijzigen
- **Engineering werk** — architectuur, schema design

### Gebruik CLAUDE AGENTS (Agent tool) wanneer:
- **Quick research** — korte vragen, web search, file lookup
- **Throwaway analysis** — eenmalige berekening, geen output bewaren
- Agent heeft **geen interactie** nodig met andere agents
- oa-cli is **niet beschikbaar** (native Windows zonder WSL)
- **Pre-flight checks** — snelle validatie voordat oa agents starten
- **Quality gates** — review van oa agent output (meta-niveau)

### Default: OA AGENT
Bij twijfel: gebruik oa agent. Zichtbaarheid en persistence zijn belangrijker dan spawning speed.

---

## Implementatie in deze sessie

De 3 research agents (Fase 1) draaien nu als Claude agents — dat is OK voor research.
Vanaf Fase 2 (core docs) gaan we over op oa agents via WSL.

### Template voor oa run via WSL vanuit Windows bash:

```bash
wsl bash -c 'export PATH="$HOME/.local/bin:$PATH" && oa run "PROMPT_HIER" --name AGENT_NAAM --direct --model claude/sonnet'
```

### Multi-agent batch spawn:

```bash
# Spawn 3 agents parallel
wsl bash -c 'export PATH="$HOME/.local/bin:$PATH" && \
  oa run "prompt1" --name agent1 --direct & \
  oa run "prompt2" --name agent2 --direct & \
  oa run "prompt3" --name agent3 --direct & \
  wait'
```
