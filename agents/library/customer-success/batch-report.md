# Customer Success Agent Library Batch Report
**Generated:** 2026-03-10 | **Builder:** batch-cust-success

## Summary
Created 10 atomic agent templates for customer success workflows. All templates follow the standardized JSON format with consistent metadata, tool configurations, and specialized system prompts.

## Agents Created

### 1. Onboarding Checklist Builder
- **ID:** customer-success-onboarding-checklist-builder
- **Model Hint:** haiku-4-5
- **Purpose:** Generates comprehensive onboarding checklists tailored to customer profile, product tier, and use case
- **Key Capability:** Role-specific checklists, milestone tracking, success criteria definition

### 2. Churn Signal Detector
- **ID:** customer-success-churn-signal-detector
- **Model Hint:** haiku-4-5
- **Purpose:** Analyzes customer behavior patterns to identify early warning signs of churn risk
- **Key Capability:** Pattern analysis, risk flagging, intervention recommendations

### 3. Health Score Calculator
- **ID:** customer-success-health-score-calculator
- **Model Hint:** haiku-4-5
- **Purpose:** Computes customer health scores from engagement metrics, usage data, and support interactions
- **Key Capability:** Multi-factor scoring, driver analysis, opportunity identification

### 4. Success Plan Writer
- **ID:** customer-success-success-plan-writer
- **Model Hint:** haiku-4-5
- **Purpose:** Drafts customized customer success plans aligned with customer goals and product capabilities
- **Key Capability:** Goal alignment, timeline mapping, resource planning

### 5. NPS Follow-up Writer
- **ID:** customer-success-nps-follow-up-writer
- **Model Hint:** haiku-4-5
- **Purpose:** Writes personalized follow-up messages for NPS survey responses with appropriate tone and actions
- **Key Capability:** Sentiment-aware responses, actionable feedback handling, relationship deepening

### 6. Escalation Path Designer
- **ID:** customer-success-escalation-path-designer
- **Model Hint:** haiku-4-5
- **Purpose:** Maps escalation workflows and decision trees for critical customer issues and disputes
- **Key Capability:** Workflow design, decision criteria definition, contact mapping

### 7. Renewal Forecast Builder
- **ID:** customer-success-renewal-forecast-builder
- **Model Hint:** haiku-4-5
- **Purpose:** Predicts renewal likelihood and identifies upsell/cross-sell opportunities based on account data
- **Key Capability:** Predictive analysis, expansion opportunities, risk assessment

### 8. Customer QBR Planner
- **ID:** customer-success-customer-qbr-planner
- **Model Hint:** haiku-4-5
- **Purpose:** Plans quarterly business reviews including agenda, metrics review, and strategic discussion topics
- **Key Capability:** Strategic planning, agenda building, partnership deepening

### 9. Product Adoption Analyzer
- **ID:** customer-success-product-adoption-analyzer
- **Model Hint:** haiku-4-5
- **Purpose:** Measures and reports on feature adoption rates, usage patterns, and capability underutilization
- **Key Capability:** Adoption gap analysis, feature utilization reporting, learning recommendations

### 10. Support Ticket Categorizer
- **ID:** customer-success-support-ticket-categorizer
- **Model Hint:** haiku-4-5
- **Purpose:** Categorizes support tickets by priority, issue type, and severity for optimal routing and response
- **Key Capability:** Triage automation, priority assessment, routing recommendations

## Quality Metrics
- **Total Templates:** 10
- **Format:** Valid JSON (RFC 8259)
- **All Templates Include:**
  - Unique ID following naming convention
  - Clear, single-sentence description
  - Relevant tags (min 4 per template)
  - Specialized system prompt (80-150 words)
  - Standard tool configuration (Read, Write)
  - Maturity level: tool-capable
  - Atomic flag: true
  - Model hint: claude-haiku-4-5-20251001

## Directory Structure
```
/agents/library/customer-success/
├── onboarding-checklist-builder.json
├── churn-signal-detector.json
├── health-score-calculator.json
├── success-plan-writer.json
├── nps-follow-up-writer.json
├── escalation-path-designer.json
├── renewal-forecast-builder.json
├── customer-qbr-planner.json
├── product-adoption-analyzer.json
├── support-ticket-categorizer.json
└── batch-report.md
```

## Implementation Notes
1. All templates use haiku model hint for fast execution on lightweight CSM tasks
2. Each agent has a specialized system prompt tailored to their specific domain
3. Tags enable discovery by workflow, skill, and use case
4. All JSON formatted with valid double-quote strings per RFC 8259
5. Templates are immediately available for use via oa-cli agent spawning

## Validation
- ✓ Directory creation with os.makedirs
- ✓ All JSON files created with valid syntax
- ✓ All required fields present in each template
- ✓ Naming conventions consistent (id format: customer-success-{name})
- ✓ Descriptions concise (single sentence)
- ✓ System prompts specialized and actionable
- ✓ batch-report.md created

## Next Steps
- Use `oa run` with agent IDs to spawn agents from this library
- Monitor performance and collect feedback for template refinement
- Expand taxonomy based on customer success domain evolution
