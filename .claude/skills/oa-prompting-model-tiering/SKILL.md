---
name: oa-prompting-model-tiering
description: "Model selection guide for oa agents: haiku/sonnet/opus by task type. Use when choosing --model for oa run or oa pipeline. Activates for: which model, claude/haiku, claude/sonnet, claude/opus, model selection, --model."
user-invocable: false
---

## Critical Rules

- ALWAYS use the `claude/sonnet` ID format for `--model`, never `claude-sonnet-4-6` — because oa run uses short model aliases, not Anthropic API IDs.
- ALWAYS specify `--model` explicitly — because the default may change across oa-cli versions, producing unpredictable behavior.

## Model Tiering Table

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Scanning, listing, parsing, formatting | `claude/haiku` | Fast, cheap; structured output only |
| Writing, coding, implementation | `claude/sonnet` | **DEFAULT** — balanced quality/speed |
| Architecture, deep reasoning, complex orchestration | `claude/opus` | Maximum depth; use sparingly |
| QA, validation, review | `claude/sonnet` | Needs judgment, not just speed |
| Research (broad) | `claude/sonnet` | Good breadth coverage |
| Research (deep analysis) | `claude/opus` | When depth > speed |
| Batch processing (repetitive) | `claude/haiku` | Cost efficiency at scale |

## Decision Tree

```
Task type?
├── Scanning / listing / formatting / parsing → claude/haiku
├── Writing / coding / implementation / review → claude/sonnet (DEFAULT)
└── Architecture / deep reasoning / orchestration planning → claude/opus
```

## Patterns

### Pattern 1: Correct model flag format
```bash
oa run "Implement the auth module" --name builder --model claude/sonnet --direct
oa run "Plan the architecture" --name planner --model claude/opus --direct
oa run "Convert CSV to JSON" --name converter --model claude/haiku --direct
```

### Pattern 2: Model by role in a pipeline
```bash
oa run "Plan all implementation steps" --name planner --model claude/opus --direct
oa run "Implement step 1" --name builder-a --model claude/sonnet --direct
oa run "Convert file to JSON" --name converter --model claude/haiku --direct
```

## Anti-Patterns

- Bad: `--model claude` — bare alias, version-unstable
- Good: `--model claude/sonnet` — explicit tier
- Bad: `--model anthropic/claude-sonnet-4-6` — Anthropic API ID, not oa-cli alias
- Good: `--model claude/sonnet`
- Bad: Using `claude/opus` for all tasks — expensive and slow for simple work
- Good: Reserve opus for architecture and deep reasoning only

## References

- Related: oa-orchestration-spawn, oa-prompting-5element, oa-orchestration-patterns
