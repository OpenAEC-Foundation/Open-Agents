# Orchestrator Update Report
Date: 2026-03-12

## Updated Templates (6)

| File | Change |
|------|--------|
| `core/session-start-orchestrator.json` | Added Validation Loop + Quality Checks section |
| `core/oa-orchestration-patterns.json` | Added Validation Loop + Quality Checks section (extends existing brief QUALITY GATE) |
| `core/oa-orchestration-pipeline.json` | Added Validation Loop + Quality Checks section |
| `core/oa-orchestration-delegate.json` | Added Validation Loop + Quality Checks section |
| `core/oa-orchestration-spawn.json` | Added Validation Loop + Quality Checks section (found via scan) |
| `open-agents-meta/agent-composer.json` | Added Validation Loop + Quality Checks section (found via scan) |

## Skipped Templates (explained)

| File | Reason |
|------|--------|
| `core/iterative-planner.json` | **Explicitly excluded** — already has a feedback loop |
| `core/oa-orchestration-communication.json` | Handles messaging/collection only, does not spawn or coordinate worker batches |
| `aec-cross/aec-agents-workflow-orchestrator.json` | AEC-specific technology routing (blender-mcp context, `atomic: true`); not an oa-agent orchestrator |
| `open-agents-meta/orchestration-pattern-documenter.json` | Documents patterns; does not orchestrate agents |
| `database/database-data-pipeline-workflow-orchestrator.json` | Domain-specific workflow; not an oa-agent orchestrator |
| `iot-embedded/ota-deployment-orchestrator.json` | Domain-specific workflow; not an oa-agent orchestrator |
| All other files mentioning "orchestrat" | Mention the word in passing (cloud-native configs, etc.); not orchestrators |

## Validation Loop Added (identical across all updated templates)

```
---

## Validation Loop (REQUIRED)
After every agent batch:
1. Collect output from all workers (`oa collect <name>`)
2. Validate for completeness, format, and quality
3. If output is insufficient:
   - Identify exactly what is missing or wrong
   - Spawn a fix-agent: `oa run "Fix: [specific problem]. Output: [path]. Original attempt: [summary]" --name fix-[name] --model claude/sonnet --direct`
   - Repeat validation after fix
4. Only proceed to the next phase when ALL checks are green
5. Document what you validated in your output

## Quality Checks (standard)
- [ ] All requested files created/modified?
- [ ] No empty or truncated output?
- [ ] Format matches the instruction?
- [ ] Content is consistent (no contradictions)?
- [ ] Absolute paths used where applicable?
```

## JSON Validity
All 6 updated files pass `python3 -c "import json; json.load(open(...))"` validation.
