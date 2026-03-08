---
name: oa-quality-gates
user-invocable: false
description: "Mandatory 5-check quality gate after every agent batch. Use when Claude needs to validate batch output before proceeding to the next phase. Activates for: batch complete, agent done, oa collect, validate output, quality check, all agents finished."
---

# oa-quality-gates

## Quick Reference

### Critical Rules

Run all 5 checks after every agent batch because skipping even one check risks propagating corrupt output to subsequent phases where it compounds and is harder to fix.

Spawn a fix-agent when any check fails because fixing output manually in Claude Code session introduces inconsistencies and bypasses the audit trail.

Stop and fix before proceeding to the next batch when any check fails because proceeding with corrupt output means all downstream agents inherit the error.

Complete all 5 checks before marking a batch done because partial verification has caused missed format errors in production workflows.

### Decision Tree

```
Batch complete?
  Checks run in order:
  1. Count   → FAIL: spawn missing-output fix-agent
  2. Content → FAIL: spawn truncation fix-agent
  3. Format  → FAIL: spawn format fix-agent
  4. Cross-reference → FAIL: spawn consistency fix-agent
  5. Size    → FAIL: spawn resize fix-agent
  ALL PASS → proceed to next batch
```

## The 5 Mandatory Checks

### Check 1: Count
**Question**: Expected N outputs — got exactly N?

- PASS: outputs_received == agents_spawned
- FAIL: outputs_received < agents_spawned (missing) or > (unexpected extra)

Action on FAIL: Identify missing agents via `oa status`. Spawn re-run agents for missing outputs only.

### Check 2: Content
**Question**: Is each output complete, untruncated, and in the correct language?

Signs of truncation to detect:
- Abrupt endings mid-sentence or mid-code-block
- Triple-backtick fences opened but not closed
- Output suspiciously short (< 10 lines when 200+ expected)
- Wrong language (Dutch output when English required)

Action on FAIL: Spawn fix-agent with original task + "complete the truncated output" instruction.

### Check 3: Format
**Question**: Does the structure match the reference format?

For JSON templates, verify ALL required fields:
- `name`, `description`, `model`, `systemPrompt`, `tools`, `maturity`, `category`, `tags`

For Markdown, verify:
- Required section headers present
- No hallucinated sections beyond the spec

Action on FAIL: Spawn format-fix agent with reference file path and failing output path.

### Check 4: Cross-reference
**Question**: Are all outputs mutually consistent?

Check for:
- Conflicting facts between agents researching the same topic
- Duplicate entries between agents that should produce unique items
- Model IDs that differ from the agreed standard across templates
- Category names mismatching actual `agents/library/` directories

Action on FAIL: Spawn consistency-fix agent that reads all outputs and resolves conflicts.

### Check 5: Size
**Question**: Does each output respect the line count constraints?

- PASS: min_lines <= actual_lines <= max_lines
- FAIL: actual_lines < min_lines OR actual_lines > max_lines

Action on FAIL: Spawn resize-fix agent with explicit min/max constraints from original prompt.

## Essential Patterns

### Pattern 1: Spawn Fix-Agent on Failure

When any check fails, spawn a targeted fix-agent. Never fix manually in Claude Code session because it bypasses the audit trail and is hard to replicate.

```bash
oa run 'Je bent een FIX-AGENT voor output van <agent-naam>.

## Probleem
Check <N> gefaald: <exacte beschrijving van het probleem>

## Originele taak
<kopieer de originele taak prompt hier>

## Falende output
Lees: <absoluut pad naar falende output>

## Verwacht resultaat
<beschrijf exact wat gecorrigeerd moet worden>

## Referentie
Volg format van: <absoluut pad naar referentiebestand>

## Output
Schrijf gecorrigeerde versie naar: <origineel pad>
Schrijf ./output/result.md met samenvatting en maak .done aan.' \
  --name fix-<agent-naam> --model claude/sonnet --direct
```

### Pattern 2: Batch Verification Table

Fill in before proceeding to next batch:

| Agent    | Count | Content | Format | Cross-ref | Size | Status |
|----------|-------|---------|--------|-----------|------|--------|
| agent-1  |  v   |   v     |   v    |    v      |  v   |  PASS  |
| agent-2  |  v   |   x     |   v    |    v      |  v   |  FAIL  |

PASS all rows → proceed. Any FAIL → spawn fix-agents first, then re-verify.

### Pattern 3: Content Truncation Detection

Signs of truncation:
- File ends with dash, ellipsis, or open parenthesis
- Unclosed code fence (triple-backtick without matching closing)
- Mid-sentence ending without period or other terminal punctuation
- File smaller than expected based on line count requirements

## Reference

- Related: `oa-quality-guardians` — run guardians after a fully passing batch
- Related: `oa-agent-library-builder` — save successful output as reusable template
- Source: `Open-Agents/CLAUDE.md` Kerngedrag #8 and #9
- Source: `Open-Agents/LESSONS.md` L-004, L-015, L-017, L-021, L-025
