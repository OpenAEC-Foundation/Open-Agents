---
name: oa-skill-watcher
description: "Detects newly created or recently modified skills in ~/.claude/skills/ and auto-generates matching agent templates in the Open-Agents library. Use when a new skill has been created, when skills have been updated, or when the user says 'generate template for this skill', 'scan new skills', 'update agent library from skills', or 'watch skill changes'."
disable-model-invocation: true
user-invocable: true
allowed-tools: Glob, Read, Write, Grep, Bash
argument-hint: "[skill-name or 'all' for full scan]"
---

## Purpose

Bridges the gap between skill creation and agent library population. When a new Claude Code skill is added to `~/.claude/skills/`, this skill detects it and generates a corresponding `oa run`-compatible agent template in `agents/library/open-agents-meta/`.

## Critical Rules

ALWAYS read the full SKILL.md before generating a template — the skill content determines the systemPrompt.

NEVER generate a template if a functionally identical one already exists in `agents/library/`. Check first.

NEVER modify the original SKILL.md — this skill is read-only with respect to skill files.

## Step 1: Identify Target Skills

If `$ARGUMENTS` is provided and not `all`, focus on that specific skill:
```bash
ls ~/.claude/skills/$ARGUMENTS/SKILL.md
```

If `$ARGUMENTS` is `all` or empty, scan all skills and detect recent changes:
```bash
find ~/.claude/skills/ -name "SKILL.md" -newer ~/.claude/skills/.last-watcher-run 2>/dev/null || \
find ~/.claude/skills/ -name "SKILL.md" -mtime -7
```

Also scan project-level skills if in an Open-Agents workspace:
```bash
find .claude/skills/ -name "SKILL.md" -mtime -7 2>/dev/null
```

## Step 2: Read and Parse Each Skill

For each identified SKILL.md:

1. Read the frontmatter to extract: `name`, `description`, `allowed-tools`, `disable-model-invocation`, `user-invocable`
2. Read the markdown body to understand: task type, steps, inputs/outputs, domain
3. Classify the skill:
   - **Meta/orchestration**: manages agents, spawning, pipelines → `open-agents-meta`
   - **Code/dev**: software development, refactoring, testing → `code-dev`
   - **Research**: web search, analysis, knowledge gathering → `research`
   - **Review/quality**: validation, QA, auditing → `review-quality`
   - **Data**: transforms, conversions, parsing → `data-transform`
   - **Communication**: messages, reports, docs → `communication`
   - **File system**: file management, directory ops → `file-system`

## Step 3: Check for Existing Templates

Before generating, search the agent library for duplicates:

```bash
grep -rl "<skill-name>" /path/to/Open-Agents/agents/library/
grep -r "\"<keyword>\"" /path/to/Open-Agents/agents/library/ --include="*.json" -l
```

Skip generation if a template with >70% conceptual overlap already exists.

## Step 4: Determine Model Hint

Select the minimal capable model:

| Skill Complexity | Model |
|-----------------|-------|
| Scanning, listing, parsing, formatting | `anthropic/claude-haiku-4-5-20251001` |
| Standard implementation, code generation, writing | `anthropic/claude-sonnet-4-6` |
| Complex reasoning, orchestration, architecture | `anthropic/claude-opus-4-6` |

Default to Haiku unless the skill clearly requires reasoning or multi-step judgment.

## Step 5: Generate the Agent Template

Create a JSON file following this exact structure:

```json
{
  "id": "<category>-<kebab-case-name>",
  "name": "<Title Case Name>",
  "description": "<One sentence: what it does and when to use it.>",
  "atomic": true,
  "category": "<category-slug>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "maturity": "tool-capable",
  "modelHint": "<full-model-id>",
  "tools": ["<Tool1>", "<Tool2>"],
  "systemPrompt": "<Self-contained prompt derived from the skill's purpose and steps. Include: role, task, output format, numbered rules. Max 400 words.>"
}
```

**systemPrompt construction rules:**
1. Start with: `"You are a <role derived from skill name>."`
2. Add: `"Task: <one sentence from skill description>"`
3. Add: `"Input: <what the agent receives>"` (derive from skill's `$ARGUMENTS` or context)
4. Add: `"Output: <what the agent produces>"` (derive from skill's output sections)
5. Add: `"Rules:\n1. <First rule>\n2. <Second rule>..."` (derive from skill's Critical Rules)
6. Keep under 400 words. Must be self-contained — no references to external files.

**tools selection:**
- Read-only analysis: `["Read", "Glob", "Grep"]`
- Writes files: add `"Write"`, `"Edit"`
- Runs shell commands: add `"Bash"`
- Web research: add `"WebFetch"`, `"WebSearch"`

## Step 6: Write the Template

Save to:
```
<open-agents-repo>/agents/library/<category>/<skill-name>.json
```

Example paths:
```
agents/library/open-agents-meta/oa-skill-watcher.json
agents/library/code-dev/my-new-skill.json
agents/library/research/web-analyzer.json
```

Detect the Open-Agents repo path by checking common locations:
- `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents`
- `~/Documents/GitHub/Open-Agents`
- `$OA_REPO` environment variable

## Step 7: Update the Watcher Timestamp

After a successful run, update the timestamp file so future runs only check newer skills:

```bash
touch ~/.claude/skills/.last-watcher-run
```

## Step 8: Report

Output a summary:
```
Skill Watcher Report — <date>
──────────────────────────────
Skills scanned: N
New/modified:   N
Templates generated: N
Skipped (duplicate): N

Generated:
  - <skill-name> → agents/library/<category>/<file>.json
  - ...

Skipped:
  - <skill-name> — duplicate of <existing-template>
```

## Quality Gate

Before writing any template, verify:
- [ ] `id` is unique in the library
- [ ] `systemPrompt` is self-contained (no file references)
- [ ] `tools` list is minimal — no tools the agent won't use
- [ ] `category` matches an existing directory in `agents/library/`
- [ ] `description` starts with a verb and fits one sentence

## Reference

- See [oa-agent-library-builder](../oa-agent-library-builder/SKILL.md) — for manual template extraction from agent runs
- See [oa-library-templates](../oa-library-templates/SKILL.md) — for template field specifications
- Agent library categories: `agents/library/` in Open-Agents repo
