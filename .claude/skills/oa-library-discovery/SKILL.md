---
name: oa-library-discovery
description: "Find and reuse agent templates from agents/library/. Use when selecting an existing template before spawning, checking available templates by category or tag, or using --template flag. Activates for: agents/library, --template, template id, reuse template, find template."
user-invocable: false
allowed-tools: Bash, Glob, Grep, Read
---

## Critical Rules

- ALWAYS scan agents/library/ before writing a new template — duplicating an existing template wastes time and fragments the library (L-010).
- NEVER hardcode a template list — because the library grows dynamically; always scan the directory at runtime.

## Decision Tree

```
Need to run a task?
├── Task matches a known domain (aec, code-dev, research, etc.)
│   ├── Scan library for matching template → oa run --template <id>
│   └── No match → write new template → propose saving to library
└── Task is one-off or highly specific → oa run with inline prompt
```

## Instructions

1. Scan the library directory to discover available categories:
   ```bash
   ls <project-root>/agents/library/
   ```

2. Search for templates by category or keyword:
   ```bash
   grep -rl "research" <project-root>/agents/library/ --include="*.json"
   ```

3. Read a template to check its fields before using it:
   ```bash
   cat <project-root>/agents/library/research/researcher.json
   ```

4. Spawn using a template (oa-cli resolves `modelHint` automatically):
   ```bash
   oa run "task description" --name worker-1 --template researcher --model claude/sonnet --direct
   ```

5. When no suitable template exists, write the task inline and propose a new template afterward.

## Template JSON Fields

| Field | Purpose | Required |
|-------|---------|----------|
| `name` | Human-readable name | Yes |
| `description` | One-sentence summary | Yes |
| `model` | Full model ID (e.g. `anthropic/claude-sonnet-4-6`) | Yes |
| `modelHint` | Short model alias: `claude/haiku`, `claude/sonnet`, `claude/opus` | No |
| `systemPrompt` | Agent instructions injected before task | Yes |
| `tools` | Minimal tool set (`Read`, `Write`, `Bash`, etc.) | Yes |
| `maturity` | `tool-capable` or `prompt-only` | Recommended |
| `category` | Directory grouping (e.g. `research`, `core`) | Recommended |
| `tags` | Searchable keywords | Recommended |

## Patterns

### Pattern 1: Find all research templates
```bash
ls <project-root>/agents/library/research/
```

### Pattern 2: Grep templates by tag
```bash
grep -rl '"review"' <project-root>/agents/library/ --include="*.json"
```

### Pattern 3: Spawn with template
```bash
oa run "Analyze the API surface for breaking changes" \
  --name api-reviewer \
  --template check-security \
  --model claude/sonnet \
  --direct
```

## Anti-Patterns

- Bad: Writing a new researcher agent from scratch without checking the library — duplicates existing work.
- Good: `grep -rl "research" agents/library/` → reuse `research/researcher.json`.
- Bad: `oa run --template researcher` without reading the template first — systemPrompt may not match your task.
- Good: Read the template, verify systemPrompt scope, then spawn.

## References

- Related: oa-orchestration-spawn, oa-prompting-delegation, oa-teams-coordination
