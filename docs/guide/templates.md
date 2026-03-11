# Agent Templates

Open-Agents includes over **1612 pre-built agent templates** across 112 categories. Templates are ready-to-use agent configurations with pre-written prompts, model hints, and structured output.

---

## What is a template?

A template is a JSON file in `agents/library/` that defines:

- **id** — unique identifier (e.g., `research-swarm`)
- **name** — human-readable name
- **description** — what the agent does
- **systemPrompt** — the pre-written task instructions
- **modelHint** — recommended model (haiku/sonnet/opus)

Example template (`agents/library/research/research-swarm.json`):

```json
{
  "id": "research-swarm",
  "name": "Research Swarm",
  "description": "3 parallel researchers + combiner for comprehensive research",
  "systemPrompt": "You are a specialized research agent...",
  "modelHint": "claude/sonnet"
}
```

---

## Browsing templates

### Via CLI

List all available templates:

```bash
oa templates
```

Filter by category:

```bash
oa templates --category code-dev
oa templates --category research
oa templates --category data
```

Search by keyword:

```bash
oa templates --search "security"
oa templates --search "test"
```

### Via Web UI

```bash
oa web
```

The web interface has a searchable template browser at `http://localhost:5174`.

---

## Using a template

Pass the template ID with `--template`:

```bash
oa run --template research-swarm "What are the best practices for microservices security in 2025?" --name security-research --model claude/sonnet --direct
```

The template's `systemPrompt` is used as the base instructions, and your task text is inserted as the specific topic or goal.

If the template has a `modelHint`, it's used automatically when you don't specify `--model`.

---

## Template categories

Open-Agents templates span 112 categories:

| Domain | Categories | Examples |
|--------|-----------|----------|
| **Development** | `code-dev`, `frontend`, `backend`, `testing`, `devops` | Bug finder, test writer, PR reviewer |
| **AEC** | `blender`, `bonsai`, `ifcopenshell`, `sverchok` | 3D modeling, BIM, IFC processing |
| **Data** | `analytics`, `data-pipeline`, `ml-ops`, `database` | ETL pipelines, visualizations |
| **Business** | `finance`, `legal`, `marketing`, `hr` | Compliance, content, reporting |
| **Infrastructure** | `cloud`, `security`, `monitoring`, `iot` | Deploy, audit, observe |
| **Research** | `research`, `academic`, `literature` | Paper summaries, literature reviews |

---

## Creating your own template

Create a JSON file in `agents/library/` (or any subdirectory):

```bash
mkdir -p agents/library/my-domain
```

```json
{
  "id": "my-custom-agent",
  "name": "My Custom Agent",
  "description": "Does a specific task in my workflow",
  "systemPrompt": "You are a specialized agent for [domain]. Your task is:\n\n{{task}}\n\nRules:\n- Write output to ./output/result.md\n- Create .done when finished\n- Work autonomously",
  "modelHint": "claude/sonnet"
}
```

Save as `agents/library/my-domain/my-custom-agent.json`.

Use it immediately:

```bash
oa run --template my-custom-agent "specific task description" --name my-agent --direct
```

---

## Template best practices

**Include output instructions** — always tell the agent where to write results:
```
Write your findings to ./output/result.md and create .done when done.
```

**Be specific about format** — if you need structured output, say so:
```
Format your output as a Markdown table with columns: Feature, Status, Priority.
```

**Set the right model** — use `modelHint` to guide model selection:
- `claude/haiku` for simple, fast tasks
- `claude/sonnet` for most tasks (default)
- `claude/opus` for deep analysis

**Test before committing** — try your template a few times with different inputs before adding it to the library.

---

## Sharing templates

Templates in `agents/library/` are part of the repository. To share a useful template:

1. Add it to the appropriate category directory
2. Test it thoroughly
3. Submit a pull request to [Open-Agents on GitHub](https://github.com/OpenAEC-Foundation/Open-Agents)

---

## Next steps

→ [Multi-Agent Workflows](workflows.md) — Combine templates into pipelines
→ [CLI Reference](../reference/cli.md) — Full `oa templates` command reference
