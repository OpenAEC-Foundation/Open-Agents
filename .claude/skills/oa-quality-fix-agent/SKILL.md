---
name: oa-quality-fix-agent
description: "Pattern for spawning a dedicated fix-agent when output quality checks fail. Use when an agent's output has errors, missing content, or format violations. Activates for: fix agent, quality failure, output error, spawn fixer, L-016, L-017."
user-invocable: false
disable-model-invocation: true
allowed-tools: Bash(oa *)
---

## Critical Rules

- NEVER fix agent output yourself — spawn a dedicated fix-agent with the original output + specific error, because inline fixes bypass the quality gate and hide systemic prompt problems (L-016).
- NEVER silently discard failed output — always log the failure to output/quality-failures.md before spawning a fix-agent so the failure is traceable (L-017).
- ALWAYS give the fix-agent the original output path AND the specific error — vague prompts produce vague fixes; name exactly what is wrong.

## Decision Tree

```
Quality check failed?
├── Wrong format / missing sections      → spawn fix-agent (format error)
├── Incomplete output / truncated        → spawn fix-agent (completeness error)
├── Content error (wrong facts, logic)   → spawn fix-agent (content error)
├── Skill itself is wrong               → update skill first, then re-run original
└── Pattern fails repeatedly (3+ times) → rewrite agent prompt template
```

## Fix-Agent Prompt Template

Every fix-agent prompt MUST include all 5 elements:

```
You are a FIX-AGENT for a failed quality check.

## Input
Original output: /absolute/path/to/output.md
Error description: {EXACT error — what is missing or wrong}

## Output
Write corrected output to: /absolute/path/to/output.md (overwrite)

## Scope
- Fix ONLY the identified error: {error}
- Preserve all content that passed quality checks
- Do not restructure or rewrite sections that are correct

## Format
Must match reference: /absolute/path/to/reference.md

## Rules
- English
- Fix the exact error, nothing more
- If the fix requires information not in the original output, state what is missing
```

## Patterns

### Pattern 1: Spawn a format fix-agent
```bash
oa run "You are a FIX-AGENT.

## Input
Original output: /project/output/researcher-a/result.md
Error: Missing ## Summary section at the top. All other sections present.

## Output
Write corrected output to: /project/output/researcher-a/result.md

## Scope
- Add a ## Summary section (3-5 bullet points) at the top of the file
- Preserve all existing sections exactly as written

## Format
Follow: /project/docs/reference-format.md

## Rules
- English, max 5 new lines" \
  --name fix-researcher-a \
  --model claude/sonnet \
  --direct
```

### Pattern 2: Log failure then spawn fixer
```bash
# 1. Log the failure
echo "researcher-a: Missing Summary section ($(date))" >> /project/output/quality-failures.md

# 2. Spawn fix-agent
oa run "Fix-agent for researcher-a: add missing ## Summary..." \
  --name fix-researcher-a \
  --model claude/sonnet \
  --direct

# 3. Collect and re-validate
oa collect fix-researcher-a
```

## When Fix-Agent vs Skill Update

| Situation | Action |
|-----------|--------|
| One-time output error | Spawn fix-agent |
| Same error appears in 3+ agent outputs | Update the agent prompt template / skill |
| Wrong instructions in skill | Fix skill first, then re-run agents |
| Systemic format mismatch | Update reference.md + rerun all agents |

## Anti-Patterns

- Bad: Editing the failed output file directly — bypasses quality tracking; use a fix-agent.
- Bad: Fix-agent prompt says "fix any issues" — too vague; specify exactly what is broken.
- Bad: Skipping failure logging before spawning fixer — makes systemic failures invisible.

## References

- Related: oa-orchestration-spawn, oa-quality-gates
- Lessons: L-016 (never fix inline), L-017 (always log failures)
