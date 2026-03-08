---
name: oa-prompting-5element
description: "5-element prompt structure for oa agent tasks (L-010). Use when writing or reviewing an oa run prompt. Activates for: agent prompt, prompt template, 5-element, oa run prompt, prompt structure."
user-invocable: false
---

## Critical Rules

- ALWAYS include all 5 elements in every agent prompt — because agents have no CLAUDE.md, no project context, and no other source of constraints (L-010).
- NEVER use relative file paths in agent prompts — because agents run from a different working directory, causing file-not-found errors.

## Instructions

1. Start with a role statement: "You are a [ROLE] that [PRIMARY TASK]."
2. Add absolute input paths under ## Input.
3. Add absolute output paths under ## Output.
4. List explicit scope bullets under ## Scope.
5. Reference a format example file under ## Format.
6. Add inline quality rules under ## Rules.

## Patterns

### Complete 5-element prompt example

```
You are a DOCUMENTATION WRITER that writes API reference docs.

## Input
Read: /mnt/c/project/src/api/routes.py

## Output
Write to: /mnt/c/project/docs/api-reference.md

## Scope
- Document every public route function
- Include: endpoint, method, params, response format, one example
- Exclude: internal helper functions (prefixed with _)

## Format
Follow structure of: /mnt/c/project/docs/api-reference-example.md

## Rules
- English only
- Max 400 lines
- Use markdown tables for parameter lists
- Every route must have a curl example
- NEVER invent behavior not in the source code
```

## What Breaks Without Each Element

| Missing element | Failure mode |
|----------------|-------------|
| Role | Agent produces generic output with no domain focus |
| Absolute input paths | FileNotFoundError or agent invents content |
| Absolute output paths | Output written to random location or lost |
| Scope bullets | Agent over-delivers or misses key requirements |
| Format reference | Output structure inconsistent with project standards |
| Inline rules | Agent ignores project conventions (no CLAUDE.md inheritance) |

## Anti-Patterns

- Bad: "Write docs for the API" — no paths, no scope, no rules
- Good: Full 5-element prompt as shown above
- Bad: `./src/api.py` — relative path breaks in agent workspace
- Good: `/mnt/c/project/src/api.py` — absolute path always works

## References

- Related: oa-orchestration-spawn, oa-prompting-scope, oa-prompting-model-tiering
