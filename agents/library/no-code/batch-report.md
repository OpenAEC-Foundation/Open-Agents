# No-Code Agent Templates - Batch Report

**Generated:** 2026-03-10  
**Agent Library:** `agents/library/no-code/`  
**Total Templates:** 10  
**Status:** ✓ Complete

## Summary

This batch creates 10 atomic agent templates for the no-code category, each specialized in a specific no-code platform or automation domain.

## Templates Created

| # | Agent ID | Name | Purpose |
|---|----------|------|---------|
| 1 | `no-code-zapier-workflow-designer` | Zapier Workflow Designer | Designs and optimizes Zapier automation workflows |
| 2 | `no-code-airtable-schema-builder` | Airtable Schema Builder | Creates and maintains Airtable base schemas and structures |
| 3 | `no-code-notion-template-creator` | Notion Template Creator | Builds and customizes Notion database templates |
| 4 | `no-code-webflow-cms-architect` | Webflow CMS Architect | Architects content management systems using Webflow |
| 5 | `no-code-bubble-data-designer` | Bubble Data Designer | Designs data structures for Bubble no-code applications |
| 6 | `no-code-make-scenario-planner` | Make Scenario Planner | Plans and designs Make.com automation scenarios |
| 7 | `no-code-n8n-workflow-advisor` | n8n Workflow Advisor | Advises on n8n workflow design and optimization |
| 8 | `no-code-retool-app-designer` | Retool App Designer | Designs internal tools and dashboards using Retool |
| 9 | `no-code-glide-app-planner` | Glide App Planner | Plans mobile app structures for Glide no-code platform |
| 10 | `no-code-automation-trigger-mapper` | Automation Trigger Mapper | Maps and documents automation triggers and actions |

## Template Specification

All templates follow this JSON schema:

```json
{
  "id": "no-code-{agent-name}",
  "name": "{agent-name}",
  "category": "no-code",
  "modelHint": "anthropic/claude-haiku-4-5-20251001",
  "description": "{Specialized purpose}",
  "tools": ["Read", "Write"],
  "atomic": true,
  "maturity": "tool-capable",
  "systemPrompt": "{Agent role and expertise}"
}
```

## Key Characteristics

- **Model Tier:** Haiku 4.5 (fast, cost-effective for specific tasks)
- **Tools:** Read & Write (perfect for template-based operations)
- **Atomicity:** Each agent focuses on one platform/domain
- **Maturity:** Tool-capable (ready for production use)
- **Category:** no-code (consistent classification)

## Files

- `zapier-workflow-designer.json`
- `airtable-schema-builder.json`
- `notion-template-creator.json`
- `webflow-cms-architect.json`
- `bubble-data-designer.json`
- `make-scenario-planner.json`
- `n8n-workflow-advisor.json`
- `retool-app-designer.json`
- `glide-app-planner.json`
- `automation-trigger-mapper.json`
- `batch-report.md` (this file)

## Quality Checklist

- [x] All 10 templates created
- [x] Valid JSON syntax (double quotes)
- [x] Consistent id pattern: `no-code-{name}`
- [x] All have modelHint set to Haiku 4.5
- [x] All have tools: ["Read", "Write"]
- [x] All have atomic=true
- [x] All have maturity="tool-capable"
- [x] All have meaningful descriptions
- [x] All have systemPrompt for role clarity
- [x] Directory structure verified

## Usage

These agents can be invoked directly:

```bash
oa run "<task>" --name zapier-workflow-designer --model anthropic/claude-haiku-4-5-20251001 --direct
```

Or by referencing the template ID in agent discovery systems.

## Next Steps

- Register templates in agent registry (if applicable)
- Validate with actual no-code workflows
- Gather feedback from users of each platform
- Iterate on system prompts based on real-world usage
