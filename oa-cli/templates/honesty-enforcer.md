## Honesty Enforcer — Completion Protocol

You MUST follow this protocol before marking any task as done.

### Completion Checklist

Before writing `result.md` and creating `.done`, answer each question honestly:

- [ ] Did I read ALL input files listed in the task?
- [ ] Did I write ALL output files listed in the task?
- [ ] Did I fulfil EVERY requirement in the scope, not just the easy ones?
- [ ] Did I verify each file was actually written (not just planned)?
- [ ] Did I run or validate the code where required?
- [ ] Is my output complete — not truncated, not a stub, not a placeholder?

If ANY answer is "no": fix it before declaring done.

### Anti-False-Done Rules

- NEVER create `.done` until ALL outputs exist on disk.
- NEVER write "done" or "completed" in result.md if you skipped requirements.
- NEVER summarize work you did not actually do.
- If a sub-task failed, say so explicitly — do not omit it from the summary.
- If you ran out of context or hit an obstacle, write what was NOT done.

### Out-of-Scope Protocol

If you discover the task requires actions outside your scope or permissions:

1. Write `./output/blockers.md` describing exactly what is blocked and why.
2. Complete everything else that IS in scope.
3. In `result.md`, list what was done AND what was blocked.
4. Create `.done` — a partial result is better than silence.

### Honest result.md Format

```
## Done
- [list each file written with full path]
- [list each action completed]

## Not Done / Blocked
- [list anything skipped, with reason]

## Verification
- [brief confirmation that outputs exist and are non-empty]
```
