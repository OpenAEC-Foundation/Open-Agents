---
name: oa-library-templates
user-invocable: false
description: "Reference for creating and storing agent templates in the Open-Agents library. Use when Claude needs to write a new agent JSON template or understand the library structure. Activates for: save template, add to library, new agent template, agents/library, template format."
---

# oa-library-templates

## Quick Reference

### Critical Rules

Check for duplicate agents before writing a new template because the library must remain deduplicated — search by name, description, and tags.

Use the minimum model that can reliably perform the task because haiku costs significantly less than sonnet and should be preferred whenever input/output is well-defined.

Match an existing `agents/library/` directory for the category because putting a template in the wrong category breaks discoverability — verify the directory exists before writing.

Use the full model identifier (never shorthand) because the runner resolves model IDs literally — shorthand breaks the agent launch.

### Decision Tree: Which Model?

```
Task type?
  └── Parsing, validation, formatting, simple transforms
        → anthropic/claude-haiku-4-5-20251001
  └── Standard implementation, code generation, analysis
        → anthropic/claude-sonnet-4-6
  └── Complex orchestration, architecture, multi-domain reasoning
        → anthropic/claude-opus-4-6
```

Default: **haiku**. Upgrade only when the task genuinely requires more reasoning.

## Template Format (JSON)

Every agent template MUST include these fields:

```json
{
  "name": "Descriptive Agent Name",
  "description": "One-line description of what this agent does and when to use it.",
  "model": "anthropic/claude-haiku-4-5-20251001",
  "systemPrompt": "You are a [role] that [primary task].\n\nOutput format: [describe expected output].\n\nRules:\n1. [First rule]\n2. [Second rule]",
  "tools": ["Read", "Glob", "Grep"],
  "maturity": "tool-capable",
  "category": "code-dev",
  "tags": ["tag1", "tag2", "tag3"]
}
```

### Field Specifications

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Title case, 2-4 words, action-oriented ("Validate IFC Psets") |
| `description` | string | Single sentence, starts with verb, explains purpose and when to use |
| `model` | string | Full ID from Model IDs table — NEVER shorthand |
| `systemPrompt` | string | Self-contained role + output format + numbered rules. Max 500 words |
| `tools` | array | Minimum set required — remove any tool not strictly needed |
| `maturity` | string | One of: `"prompt-only"`, `"tool-capable"`, `"orchestrator"` |
| `category` | string | Must match existing directory in `agents/library/` |
| `tags` | array | 2-5 lowercase keywords for discovery |

## Model IDs

| Use Case | Full Model ID |
|----------|---------------|
| Haiku (default for simple tasks) | `anthropic/claude-haiku-4-5-20251001` |
| Sonnet (standard implementation) | `anthropic/claude-sonnet-4-6` |
| Opus (complex reasoning) | `anthropic/claude-opus-4-6` |

## Maturity Levels

| Level | Meaning | Tools |
|-------|---------|-------|
| `prompt-only` | No tool use, pure text in/out | `[]` |
| `tool-capable` | Uses Read/Write/Grep/Glob/Bash | `["Read", "Glob", ...]` |
| `orchestrator` | Spawns sub-agents or manages workflow | `["Bash", ...]` |

## Available Tools

```
Read        — Read files from filesystem
Write       — Write files to filesystem
Edit        — Edit specific lines in files
Glob        — Find files by pattern
Grep        — Search file contents by regex
Bash        — Execute shell commands
WebFetch    — Fetch content from URLs
WebSearch   — Search the web
```

Read-only agents: `["Read", "Glob", "Grep"]`
Writing agents: add `"Write"` and `"Edit"`
Shell agents: add `"Bash"`
Research agents: add `"WebFetch"` or `"WebSearch"`

## Library Categories

Existing directories in `agents/library/`:

| Category | Domain |
|----------|--------|
| `aec-blender` | Blender Python API, mesh, materials, rendering |
| `aec-bonsai` | Native IFC BIM authoring in Blender |
| `aec-cross` | Cross-technology AEC workflow orchestration |
| `aec-ifcopenshell` | IFC model manipulation, validation, geometry |
| `aec-sverchok` | Parametric/mathematical design in Blender |
| `code-dev` | Code generation, refactoring, analysis |
| `communication` | Reports, emails, markdown, diagrams |
| `core` | General-purpose: summarize, translate, explain |
| `data-transform` | CSV/JSON/YAML conversion and transformation |
| `erpnext` | Frappe/ERPNext doctypes, scripts, reports |
| `file-system` | File finding, listing, counting |
| `git-versioning` | Commit messages, changelogs, PR descriptions |
| `research` | Architecture analysis, dependency analysis |
| `review-quality` | Code review, style, performance, test coverage |
| `text-language` | NLP, sentiment, grammar, entity extraction |

If no category fits, create a new directory and document why in DECISIONS.md.

## File Location

```
agents/library/<category>/<topic>.json
```

Naming: kebab-case, descriptive, matches the agent's primary action.

Examples:
```
agents/library/code-dev/validate-ifc-psets.json
agents/library/data-transform/csv-to-json.json
agents/library/review-quality/check-naming-conventions.json
```

## Essential Patterns

### Pattern 1: Complete Template Example

```json
{
  "name": "Validate IFC Psets",
  "description": "Validates IFC property set names and values against a reference schema.",
  "model": "anthropic/claude-haiku-4-5-20251001",
  "systemPrompt": "You are an IFC property set validator.\n\nRead the provided IFC file or extracted property sets and validate them against the reference schema.\n\nOutput format: For each property set, report:\n- Pset name: PASS/FAIL\n- Missing required properties\n- Invalid value types\n- Summary: X/Y property sets valid\n\nRules:\n1. Read the target file before analysis.\n2. Compare each Pset_ prefixed set against the schema.\n3. Flag missing required properties as FAIL.\n4. Report results sorted by severity (FAIL first, then PASS).\n5. Do not modify any files — this is a read-only validation.",
  "tools": ["Read", "Glob", "Grep"],
  "maturity": "tool-capable",
  "category": "aec-ifcopenshell",
  "tags": ["ifc", "validation", "pset", "bim"]
}
```

### Pattern 2: Duplicate Check Before Writing

```bash
grep -rl "<keyword>" agents/library/
grep -rl '"ifc"' agents/library/
```

Avoid creating a template if an existing one covers the same task.

### Pattern 3: Skill-to-Agent Mapping (1:1)

When generating agents from a skill package:

```
SKILL.md → extract core prompt → compress → systemPrompt field
SKILL.md → identify required tools → tools field
SKILL.md → determine complexity → model field (haiku/sonnet/opus)
SKILL.md → identify category → category field
```

Result: one `.json` file per `SKILL.md`, saved to `agents/library/<category>/`.

## Reference

- Related: `oa-agent-library-builder` — full workflow for extracting templates from agent runs
- Related: `oa-quality-gates` — validate batch of generated templates before committing
- Source: `Open-Agents/CLAUDE.md` section "Skill-Backed Agent Architectuur"
- Source: `Open-Agents/LESSONS.md` L-034, L-036, L-037, L-042
