# Batch 11 Report — Agent Library Builder

**Date:** 2026-03-08
**Status:** Complete
**Total templates created:** 30

---

## Category: `ai-integration` (10 agents)

| File | ID | Description |
|------|----|-------------|
| `prompt-template-writer.json` | ai-integration-prompt-template-writer | Creates structured, reusable prompt templates for LLM tasks |
| `embedding-pipeline-builder.json` | ai-integration-embedding-pipeline-builder | Designs end-to-end embedding pipelines for text vectorization |
| `rag-configurator.json` | ai-integration-rag-configurator | Configures RAG systems with optimal retrieval and prompt settings |
| `llm-router-designer.json` | ai-integration-llm-router-designer | Designs routing logic to dispatch queries to appropriate LLMs |
| `context-window-optimizer.json` | ai-integration-context-window-optimizer | Analyzes and restructures prompts to maximize context efficiency |
| `tool-calling-designer.json` | ai-integration-tool-calling-designer | Designs JSON schema definitions for LLM tool/function calling |
| `ai-cost-estimator.json` | ai-integration-ai-cost-estimator | Estimates monthly LLM API costs based on usage patterns |
| `model-fallback-planner.json` | ai-integration-model-fallback-planner | Creates fallback chains for LLM availability failures |
| `ai-evaluation-harness.json` | ai-integration-ai-evaluation-harness | Designs evaluation frameworks for measuring LLM output quality |
| `fine-tuning-dataset-preparer.json` | ai-integration-fine-tuning-dataset-preparer | Formats and validates training datasets for LLM fine-tuning |

---

## Category: `support` (10 agents)

| File | ID | Description |
|------|----|-------------|
| `ticket-classifier.json` | support-ticket-classifier | Classifies support tickets by category, priority, and team |
| `escalation-policy-writer.json` | support-escalation-policy-writer | Writes escalation policies for support teams |
| `sla-calculator.json` | support-sla-calculator | Calculates SLA compliance rates from ticket timestamps |
| `knowledge-base-curator.json` | support-knowledge-base-curator | Reviews and rewrites KB articles for clarity and searchability |
| `chatbot-flow-designer.json` | support-chatbot-flow-designer | Designs conversational chatbot flows for support scenarios |
| `canned-response-writer.json` | support-canned-response-writer | Creates professional canned response templates |
| `customer-sentiment-analyzer.json` | support-customer-sentiment-analyzer | Analyzes customer messages for sentiment and churn risk |
| `metric-reporter.json` | support-support-metric-reporter | Generates support performance reports from ticket data |
| `faq-auto-updater.json` | support-faq-auto-updater | Identifies FAQ gaps by analyzing recent support tickets |
| `incident-postmortem-writer.json` | support-incident-postmortem-writer | Writes structured incident postmortem reports |

---

## Category: `finance` (10 agents)

| File | ID | Description |
|------|----|-------------|
| `budget-tracker.json` | finance-budget-tracker | Analyzes spending vs budget and generates variance reports |
| `invoice-parser.json` | finance-invoice-parser | Extracts structured data from invoice text |
| `expense-categorizer.json` | finance-expense-categorizer | Categorizes business expenses into accounting categories |
| `financial-report-formatter.json` | finance-financial-report-formatter | Formats raw financial data into professional statements |
| `tax-calculation-advisor.json` | finance-tax-calculation-advisor | Calculates estimated tax obligations and deductions |
| `payroll-summary-writer.json` | finance-payroll-summary-writer | Generates payroll period summaries with deduction breakdowns |
| `cost-center-allocator.json` | finance-cost-center-allocator | Allocates shared costs across cost centers |
| `subscription-revenue-calculator.json` | finance-subscription-revenue-calculator | Calculates MRR, ARR, churn, and expansion revenue metrics |
| `cash-flow-forecaster.json` | finance-cash-flow-forecaster | Projects 13-week cash flow from balances and payment schedules |
| `vendor-contract-analyzer.json` | finance-vendor-contract-analyzer | Analyzes vendor contracts for key financial terms and risks |

---

## Summary

- All templates use `modelHint: "anthropic/claude-haiku-4-5-20251001"`
- All templates are `atomic: true` with `maturity: "tool-capable"`
- Tools: `["Read", "Write"]` for all templates
- systemPrompts follow the `You are a {ROLE}. Task: ... Input: ... Output: ...` pattern
