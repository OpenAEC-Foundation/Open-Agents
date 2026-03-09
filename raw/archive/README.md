# Open-Agents Issues — Self-Improvement System

**Datum:** 8 maart 2026  
**Totaal:** 12 issues, geordend op implementatievolgorde  
**Thema:** Elke agent-run triggert een molen aan meta-verbeteringen

## Push Instructies

```bash
cd ~/path/to/Open-Agents

# Per issue (voorbeeld voor issue 1):
gh issue create \
  --title "feat: Agent Run Telemetry — run-log.json per agent-run" \
  --body-file issues/ISSUE-01-run-telemetry.md \
  --label "enhancement,priority-critical,self-improvement"

# Of bulk via script:
for f in issues/ISSUE-*.md; do
  TITLE=$(head -1 "$f" | sed 's/^# //')
  gh issue create --title "$TITLE" --body-file "$f" --label "enhancement,self-improvement"
done
```

## Labels om eerst aan te maken

```bash
gh label create "self-improvement" --color "6f42c1" --description "Zelflerende systemen en meta-optimalisatie"
gh label create "priority-critical" --color "d73a4a" --description "Moet eerst — andere issues hangen hiervan af"
gh label create "priority-high" --color "e36209" --description "Hoge impact, bouw zodra dependencies er zijn"
gh label create "priority-medium" --color "fbca04" --description "Significante verbetering"
gh label create "context-engineering" --color "0075ca" --description "Token-management, context rot, compaction"
gh label create "agent-lifecycle" --color "0e8a16" --description "Spawn → execute → reflect → learn cyclus"
gh label create "meta-automation" --color "5319e7" --description "Automatische verbetering van OA zelf"
```

## Afhankelijkheidsgrafiek

```
ISSUE-01 (Run Telemetry)
   │
   ├──→ ISSUE-02 (Post-Run Hooks)
   │       │
   │       ├──→ ISSUE-04 (Auto Template Generation)
   │       ├──→ ISSUE-05 (Lessons Extraction)
   │       └──→ ISSUE-06 (Self-Benchmark Workflow)
   │
   ├──→ ISSUE-03 (Context Tracking)
   │       │
   │       └──→ ISSUE-07 (Auto-Compaction)
   │
   └──→ ISSUE-08 (Handoff Protocol)

ISSUE-09 (Skill-per-Agent) ← onafhankelijk
ISSUE-10 (Global/Local Settings Auto-Tuning) ← hangt af van 01, 05
ISSUE-11 (Agent Graveyard & Resurrection) ← hangt af van 01, 04
ISSUE-12 (Meta-Agent: OA Improver) ← hangt af van alles hierboven
```

## Bestanden

| Bestand | Issue Titel | Prioriteit |
|---|---|---|
| `ISSUE-01-run-telemetry.md` | Agent Run Telemetry | Critical |
| `ISSUE-02-post-run-hooks.md` | Post-Run Hook System | Critical |
| `ISSUE-03-context-tracking.md` | Context Window Tracking | Critical |
| `ISSUE-04-auto-template-generation.md` | Auto Template Generation | High |
| `ISSUE-05-lessons-extraction.md` | Automated Lessons Extraction | High |
| `ISSUE-06-self-benchmark.md` | Self-Benchmark Workflow | High |
| `ISSUE-07-auto-compaction.md` | Auto-Compaction Triggers | Medium |
| `ISSUE-08-handoff-protocol.md` | Structured Handoff Protocol | Medium |
| `ISSUE-09-skill-per-agent.md` | Skill System per Agent Type | Medium |
| `ISSUE-10-settings-auto-tuning.md` | Global/Local Settings Auto-Tuning | High |
| `ISSUE-11-agent-graveyard.md` | Agent Graveyard & Resurrection | Medium |
| `ISSUE-12-meta-agent.md` | Meta-Agent: OA Improver | High |
