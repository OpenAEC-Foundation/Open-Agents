---
name: oa-agent-library-builder
description: Automatically grows the agent library from successful oa runs. Triggers when reviewing completed agent output, when discussing reusable patterns, or when the user mentions saving an agent as template.
---

# OA Agent Library Builder

## When to Trigger

Activate this skill when ANY of these conditions are met:
- `oa collect` shows a successful agent result
- User says "save this as template", "make this reusable", or "add to library"
- You are reviewing agent output that follows a clear, repeatable pattern
- User asks to create a new agent template from an existing run

## Template Extraction Process

### Step 1: Read the Source Material

Read the completed agent's workspace to extract task definition and result:

```bash
# Read the original task
cat <workspace>/CLAUDE.md

# Read the agent output
cat <workspace>/output/result.md
```

### Step 2: Analyze the Pattern

Determine these properties from the source material:
- **Task category**: What domain does this belong to? (code-dev, data-transform, review-quality, etc.)
- **Tools needed**: Which Claude Code tools did the agent use? (Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch)
- **Complexity**: Is this a parsing task, standard implementation, or complex reasoning?
- **Atomicity**: Can this run as a single prompt without multi-step orchestration?

### Step 3: Assign Model Hint

Select the smallest model that can reliably perform the task:

| Task Type | Model | When to Use |
|-----------|-------|-------------|
| Parsing, validation, formatting, simple transforms | `anthropic/claude-haiku-4-5-20251001` | Well-defined input/output, no ambiguity |
| Standard implementation, code generation, analysis | `anthropic/claude-sonnet-4-6` | Requires reasoning but follows known patterns |
| Complex orchestration, architecture, multi-domain | `anthropic/claude-opus-4-6` | Needs deep reasoning or creative problem-solving |

Default to Haiku when possible. Every Haiku agent saves significant tokens over Sonnet/Opus.

### Step 4: Generate the Template JSON

Create a JSON file following this exact format:

```json
{
  "name": "Descriptive Agent Name",
  "description": "One-line description of what this agent does and when to use it.",
  "model": "anthropic/claude-haiku-4-5-20251001",
  "systemPrompt": "You are a [role] that [primary task].\n\nOutput format: [describe expected output].\n\nRules:\n1. [First rule]\n2. [Second rule]\n3. [Additional rules as needed]",
  "tools": ["Read", "Glob", "Grep"],
  "maturity": "tool-capable",
  "category": "code-dev",
  "tags": ["tag1", "tag2", "tag3"]
}
```

Field requirements:
- **name**: Title case, 2-4 words, action-oriented (e.g., "Validate IFC Psets")
- **description**: Single sentence, starts with verb, explains purpose and scope
- **model**: Full model identifier from the model hint table above
- **systemPrompt**: Clear role, output format, and numbered rules. Max 500 words. Must be self-contained — the agent receives only this prompt plus user input.
- **tools**: Minimum set required. Read-only agents use `["Read", "Glob", "Grep"]`. Writing agents add `"Write"` and `"Edit"`. Shell agents add `"Bash"`.
- **maturity**: One of `"prompt-only"`, `"tool-capable"`, `"orchestrator"`
- **category**: Must match an existing directory in `agents/library/`
- **tags**: 2-5 lowercase keywords for discovery

### Step 5: Quality Gate

Before writing the template, verify ALL of these conditions:

1. **Single purpose**: The systemPrompt describes exactly one task. If it says "and also", split into two agents.
2. **No duplicates**: Search `agents/library/` for agents with similar names, descriptions, or tags.

```bash
# Check for duplicates by searching existing library
grep -rl "<keyword>" agents/library/
```

3. **Testable output**: The template defines a clear output format that can be verified.
4. **Minimal tools**: Remove any tool the agent does not strictly need.

### Step 6: Write the Template File

Save to `agents/library/<category>/<topic>.json`:

```bash
# Use kebab-case for file names
# Examples:
#   agents/library/code-dev/validate-ifc-psets.json
#   agents/library/data-transform/csv-to-json.json
#   agents/library/review-quality/check-naming-conventions.json
```

Existing categories in `agents/library/`:
- `aec-blender`, `aec-bonsai`, `aec-cross`, `aec-ifcopenshell`, `aec-sverchok`
- `code-dev`, `communication`, `core`, `data-transform`
- `erpnext`, `file-system`, `git-versioning`, `research`
- `review-quality`, `text-language`

If no category fits, create a new directory and document why.

## Complete Example

Given a successful agent run that validated IFC property sets:

```json
{
  "name": "Validate IFC Psets",
  "description": "Validates IFC property set names and values against a reference schema.",
  "model": "anthropic/claude-haiku-4-5-20251001",
  "systemPrompt": "You are an IFC property set validator.\n\nRead the provided IFC file or extracted property sets and validate them against the reference schema.\n\nOutput format: For each property set, report:\n- Pset name: PASS/FAIL\n- Missing required properties\n- Invalid value types\n- Summary: X/Y property sets valid\n\nRules:\n1. Read the target file before analysis.\n2. Compare each Pset_ prefixed set against the schema.\n3. Flag missing required properties as FAIL.\n4. Flag type mismatches (string vs integer vs enum).\n5. Report results sorted by severity (FAIL first, then PASS).\n6. Do not modify any files — this is a read-only validation.",
  "tools": ["Read", "Glob", "Grep"],
  "maturity": "tool-capable",
  "category": "aec-ifcopenshell",
  "tags": ["ifc", "validation", "pset", "bim"]
}
```

## Token Efficiency Reminder

- Prefer Haiku for any task with well-defined input/output and no ambiguity.
- Each saved template means future runs use the optimal model instead of defaulting to Opus.
- A library of 50 Haiku agents replaces 50 ad-hoc Opus calls — significant cost reduction.
- Review existing templates periodically: if a Sonnet agent could be Haiku, downgrade it.
