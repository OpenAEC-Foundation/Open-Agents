---
name: oa-quality-guardians
user-invocable: false
description: "Automatically update core documentation after agent work completes. Use when Claude needs to spawn guardian agents to update LESSONS.md, ROADMAP.md, or DECISIONS.md after a batch or session. Activates for: batch done, session end, guardian, update docs, lessons learned."
---

# oa-quality-guardians

## Quick Reference

### Critical Rules

Spawn guardians after a successful batch or session — never before output is validated — because guardians read agent outputs and premature spawning captures incomplete state.

Use APPEND semantics when guardians update docs because guardians add to existing docs and overwriting them would destroy accumulated knowledge from previous sessions.

Delegate LESSONS.md, ROADMAP.md, and DECISIONS.md updates to guardian agents rather than editing them directly because consistency in format and numbering requires reading the full existing file before appending.

Spawn a guardian when any significant task completes because knowledge accumulation is mandatory — skipping the guardian step means lessons are lost when the session ends.

### When to Spawn Which Guardian

| Event | Guardian | Target Doc | Model |
|-------|----------|------------|-------|
| Session ends | `lessons-guardian` | `LESSONS.md` | claude/sonnet |
| Batch completes with new items | `roadmap-guardian` | `docs/ROADMAP.md` | claude/haiku |
| Session ends | `handoff-guardian` | `docs/HANDOFF-<date>.md` | claude/sonnet |
| Architecture decision made | Manual update | `docs/DECISIONS.md` | — |

## Guardian Agents

### lessons-guardian
**Trigger**: `session_end`
**Target**: `LESSONS.md`
**Model**: `claude/sonnet`

Reads `~/.oa/session-log.json` and adds new numbered lessons (L-NNN format). Never duplicates existing lessons.

### roadmap-guardian
**Trigger**: `batch_complete`
**Target**: `docs/ROADMAP.md`
**Model**: `claude/haiku`

Scans recent agent outputs and marks completed ROADMAP checkboxes as `[x]`.

### handoff-guardian
**Trigger**: `session_end`
**Target**: `docs/HANDOFF-<YYYY-MM-DD>.md`
**Model**: `claude/sonnet`

Writes a handoff document for the next session: what was done, current status, next steps.

## Essential Patterns

### Pattern 1: Spawn All Guardians at Session End

```bash
# Spawn lessons guardian
oa run "Je bent een lessen-schrijver.
Lees ~/.oa/session-log.json en voeg nieuwe inzichten toe aan /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md.
Schrijf alleen lessen die nog NIET bestaan. Geen duplicaten.
Format: | L-NNN | **Kernles** — uitleg. | Context. |
Schrijf ./output/result.md met samenvatting en maak .done aan." \
  --name lessons-guardian --model claude/sonnet --direct

# Spawn roadmap guardian
oa run "Je bent een roadmap-updater.
Scan recente agent outputs in ~/.oa/ en update checkboxes in /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/ROADMAP.md.
Markeer ALLEEN voltooide items als [x]. Geen andere wijzigingen.
Schrijf ./output/result.md met samenvatting en maak .done aan." \
  --name roadmap-guardian --model claude/haiku --direct

# Spawn handoff guardian
oa run "Je bent een handoff-schrijver.
Schrijf een handoff document naar /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/HANDOFF-$(date +%Y-%m-%d).md
op basis van ~/.oa/session-log.json.
Beschrijf: wat is gedaan, huidige status, volgende stappen.
Schrijf ./output/result.md met samenvatting en maak .done aan." \
  --name handoff-guardian --model claude/sonnet --direct
```

### Pattern 2: Spawn Single Guardian After Batch

Use this after any significant successful batch:

```bash
oa run "Je bent een lessen-schrijver.
## Context
Batch zojuist voltooid: <beschrijf wat er gedaan is>
Output locaties: <lijst van output bestanden>

## Taak
Lees de output bestanden en destilleer nieuwe lessen.
Voeg toe aan: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md
Format: | L-NNN | **Kernles** — uitleg. | Context. |
Controleer bestaande nummering — begin bij het hoogste bestaande L-nummer + 1.

## Regels
- Alleen daadwerkelijk nieuwe inzichten toevoegen
- Nooit bestaande lessen verwijderen of wijzigen
- Geen duplicaten van bestaande lessen
Schrijf ./output/result.md met samenvatting en maak .done aan." \
  --name lessons-guardian --model claude/sonnet --direct
```

### Pattern 3: Register Custom Guardian (Python API)

```python
from open_agents.guardians import register_guardian

register_guardian("decisions-guardian", {
    "trigger": "session_end",
    "task": (
        "Je bent een beslissingen-schrijver. "
        "Lees ~/.oa/session-log.json en voeg nieuwe beslissingen toe aan "
        "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/DECISIONS.md. "
        "Format: D-NNN | Datum | Beslissing | Rationale. "
        "Schrijf ./output/result.md met samenvatting en maak .done aan."
    ),
    "output": "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/DECISIONS.md",
    "model": "claude/sonnet",
})
```

### Pattern 4: Verify Guardian Completion

```bash
oa status | grep guardian
oa collect lessons-guardian
oa collect roadmap-guardian
```

## Guardian Rules (from guardians.py)

Guardians are spawned via `trigger_guardian(event_type)` which calls `oa run` with `--direct`.

| Field | Required | Values |
|-------|----------|--------|
| `trigger` | Yes | `session_end`, `batch_complete` |
| `task` | Yes | Full prompt string |
| `model` | Yes | `claude/haiku`, `claude/sonnet`, `claude/opus` |
| `output` | No | Target file path for reference |

## Reference

- Source: `Open-Agents/oa-cli/src/open_agents/guardians.py` — guardian registry and trigger logic
- Source: `Open-Agents/CLAUDE.md` Kerngedrag #8 "Guardian agents"
- Related: `oa-quality-gates` — run quality gates BEFORE spawning guardians
- Related: `oa-agent-library-builder` — save successful patterns as templates
