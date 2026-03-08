---
name: oa-prompting-scope
description: "How to write explicit scope and quality rules for oa agent prompts. Use when formulating scope bullets, role statements, or inline rules for an agent. Activates for: agent scope, quality rules, role statement, explicit scope, bullet points."
user-invocable: false
---

## Critical Rules

- ALWAYS write quality rules inline in every agent prompt — because agents do NOT inherit project CLAUDE.md, so any convention not stated is unknown to them (L-010).
- NEVER use vague scope language like "handle X" or "deal with Y" — because agents interpret ambiguity as permission to over-deliver or under-deliver.

## Instructions

1. Open with a deterministic role statement: "You are a [ROLE] that [PRIMARY TASK]."
2. Write scope as bullet points with explicit boundaries (what IS in scope, what is NOT).
3. Add quality rules as a numbered or bulleted list — state every convention the agent must follow.
4. Use deterministic language throughout (see examples below).

## Patterns

### Pattern 1: Role statement
```
You are a CODE REVIEWER that checks Python files for security issues.
```

### Pattern 2: Scope bullets
```
## Scope
- Check all files in /mnt/c/project/src/auth/
- Flag: SQL injection, XSS, hardcoded credentials, insecure deserialization
- Exclude: performance issues, style violations, test files
- Output one finding per line in the format: FILE:LINE — ISSUE — SEVERITY
```

### Pattern 3: Inline quality rules
```
## Rules
- English only
- Max 200 lines output
- NEVER suggest code rewrites — only flag issues
- Rate severity as: LOW / MEDIUM / HIGH / CRITICAL
- If no issues found, write "No issues found" — do not leave output empty
```

## Deterministic vs Vague Language

| Vague | Deterministic |
|-------|--------------|
| "Handle authentication" | "Check all routes with @login_required decorator" |
| "Write good docs" | "Document every public function with: description, params, returns, one example" |
| "Be thorough" | "Check all 3 files: auth.py, models.py, views.py" |
| "You might consider" | "Include" / "Exclude" / "Always" |
| "Clean up the code" | "Remove unused imports and trailing whitespace only — do not refactor logic" |

## Anti-Patterns

- Bad: "Research the topic and write something useful" — no scope, no output spec
- Good: Explicit input path, output path, scope bullets, quality rules
- Bad: Assuming agents know project conventions (indentation, language, style)
- Good: State every convention inline, even if obvious to a human
- Bad: "Be comprehensive" — agents may write 2000 lines if unconstrained
- Good: "Max 400 lines" — explicit length constraint

## References

- Related: oa-prompting-5element, oa-orchestration-spawn, oa-prompting-model-tiering
