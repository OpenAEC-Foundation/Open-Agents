# Agent Library

Open-Agents includes **1612+ pre-built agent templates** across **112 categories**. This is the fastest way to get started with specialized tasks.

---

## Browsing the library

### Command line

```bash
# List all categories
oa templates

# Filter by category
oa templates --category code-dev
oa templates --category research
oa templates --category data

# Search by keyword
oa templates --search "security audit"
oa templates --search "unit test"
```

### File system

Templates are stored in `agents/library/` as JSON files:

```
agents/library/
├── code-dev/
│   ├── api-contract-validator.json
│   ├── bug-finder.json
│   ├── code-reviewer.json
│   └── ...
├── research/
│   ├── research-swarm.json
│   ├── literature-review.json
│   └── ...
├── aec-blender/
│   ├── bim-model-builder.json
│   └── ...
└── ... (112 categories)
```

---

## Domain overview

### Development

Code-dev, frontend, backend, testing, devops, security:

| Template | Description |
|----------|-------------|
| `code-dev/bug-finder` | Find and diagnose bugs in a codebase |
| `code-dev/code-reviewer` | Review code for quality, security, and best practices |
| `code-dev/api-contract-validator` | Validate API contracts and OpenAPI specs |
| `testing/unit-test-writer` | Write comprehensive unit tests for a module |
| `testing/integration-test-writer` | Create integration test suites |
| `devops/ci-pipeline-builder` | Generate CI/CD pipeline configurations |
| `security/vulnerability-scanner` | Scan code for security vulnerabilities |

---

### AEC (Architecture, Engineering & Construction)

Blender, Bonsai BIM, IfcOpenShell, Sverchok:

| Template | Description |
|----------|-------------|
| `aec-blender/3d-model-builder` | Generate 3D models with Python/Blender scripting |
| `aec-bonsai/bim-authoring` | BIM authoring with Bonsai/Blender |
| `aec-ifcopenshell/ifc-processor` | Process and analyze IFC files |
| `aec-sverchok/parametric-design` | Parametric design with Sverchok node graphs |

---

### Data & Analytics

Data pipelines, ML ops, databases, visualization:

| Template | Description |
|----------|-------------|
| `data/etl-pipeline-builder` | Build ETL pipelines for data transformation |
| `data/data-validator` | Validate datasets against schemas |
| `ml-ops/model-trainer` | Set up and run ML training pipelines |
| `database/schema-designer` | Design and document database schemas |

---

### Business

Finance, legal, marketing, HR, logistics:

| Template | Description |
|----------|-------------|
| `finance/financial-analyzer` | Analyze financial data and generate reports |
| `legal/contract-reviewer` | Review contracts for key clauses and risks |
| `marketing/content-writer` | Write marketing content for specific audiences |
| `hr/job-description-writer` | Create structured job descriptions |

---

### Infrastructure

Cloud, security, monitoring, IoT:

| Template | Description |
|----------|-------------|
| `cloud/aws-infrastructure-builder` | Generate AWS infrastructure as code |
| `security/penetration-test-reporter` | Document penetration testing findings |
| `monitoring/alert-rule-generator` | Create monitoring alert configurations |

---

### Research

Academic research, literature reviews, analysis:

| Template | Description |
|----------|-------------|
| `research/research-swarm` | 3 parallel researchers + combiner |
| `research/literature-review` | Comprehensive literature review |
| `research/paper-summarizer` | Summarize academic papers |

---

## Using a template

```bash
# Basic usage
oa run --template <template-id> "<your specific task>" --name my-agent --model claude/sonnet --direct

# Example
oa run --template code-dev/bug-finder \
  "Find all potential null pointer exceptions in src/api/" \
  --name bug-hunter \
  --model claude/sonnet \
  --direct
```

---

## Creating templates

Add your own templates to the library:

1. Create a JSON file in the appropriate category directory
2. Follow this structure:

```json
{
  "id": "my-template",
  "name": "My Template Name",
  "description": "What this template does",
  "systemPrompt": "You are a specialized agent for...\n\nYour task:\n{{task}}\n\nWrite results to ./output/result.md\nCreate .done when finished.",
  "modelHint": "claude/sonnet",
  "category": "my-category",
  "tags": ["keyword1", "keyword2"]
}
```

3. Test it with `oa run --template my-template "test task"`
4. Submit a PR to share it with the community

---

## Contributing templates

The library grows through community contributions. To add templates:

1. Fork [OpenAEC-Foundation/Open-Agents](https://github.com/OpenAEC-Foundation/Open-Agents)
2. Add your template JSON to the appropriate category
3. Test it thoroughly
4. Submit a pull request

Well-written templates with clear descriptions and reliable output are highly valued.

---

## Related

→ [Agent Templates guide](../guide/templates.md) — How to use and create templates
→ [CLI Reference](../reference/cli.md) — `oa templates` command options
