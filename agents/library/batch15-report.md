# Batch 15 — Agent Library Report

**Date:** 2026-03-08
**Total templates created:** 30

## Categories

### sales-crm (10 agents)
| File | Agent Name | Description |
|------|-----------|-------------|
| lead-scoring-model.json | Lead Scoring Model | Scores inbound leads 0-100 based on firmographic, behavioral, and engagement signals |
| sales-pitch-writer.json | Sales Pitch Writer | Generates personalized, compelling sales pitches tailored to prospect context |
| proposal-formatter.json | Proposal Formatter | Structures raw proposal content into professional client-ready documents |
| deal-stage-advisor.json | Deal Stage Advisor | Recommends correct CRM pipeline stage and next best actions |
| cold-email-writer.json | Cold Email Writer | Writes short, high-converting cold outreach emails (<100 words) |
| follow-up-sequence-planner.json | Follow-Up Sequence Planner | Designs 5-step multi-touch follow-up sequences with timing and channel guidance |
| win-loss-analyzer.json | Win-Loss Analyzer | Identifies patterns in closed deals to drive sales improvement |
| territory-mapper.json | Territory Mapper | Assigns accounts to reps for balanced, geographically sensible territories |
| quota-calculator.json | Quota Calculator | Calculates individualized rep quotas based on territory and performance data |
| crm-data-cleaner.json | CRM Data Cleaner | Deduplicates and normalizes CRM records, producing an audit report |

### healthcare (10 agents)
| File | Agent Name | Description |
|------|-----------|-------------|
| clinical-note-formatter.json | Clinical Note Formatter | Converts unstructured dictation into SOAP note format |
| icd-code-mapper.json | ICD Code Mapper | Maps diagnoses to ICD-10-CM codes with official descriptions |
| patient-journey-mapper.json | Patient Journey Mapper | Documents care journey and identifies gaps/delays |
| medication-interaction-checker.json | Medication Interaction Checker | Flags drug-drug and drug-condition interactions with severity ratings |
| hl7-parser.json | HL7 Message Parser | Parses HL7 v2.x messages into labeled JSON structures |
| fhir-resource-builder.json | FHIR Resource Builder | Converts clinical data to valid FHIR R4 resource JSON |
| clinical-trial-protocol-writer.json | Clinical Trial Protocol Writer | Drafts ICH E6(R2)-aligned protocol sections from study design inputs |
| hipaa-compliance-checker.json | HIPAA Compliance Checker | Identifies PHI exposure risks and missing safeguards in workflows |
| medical-report-summarizer.json | Medical Report Summarizer | Condenses radiology/pathology/lab reports to <200-word structured summaries |
| drug-dosage-calculator.json | Drug Dosage Calculator | Calculates weight/age-adjusted dosages with safety range flagging |

### supply-chain (10 agents)
| File | Agent Name | Description |
|------|-----------|-------------|
| inventory-optimizer.json | Inventory Optimizer | Calculates EOQ, safety stock, and reorder points per SKU |
| supplier-risk-assessor.json | Supplier Risk Assessor | Scores suppliers across financial, geographic, operational, and compliance risk |
| demand-forecaster.json | Demand Forecaster | Generates 4-week weighted moving average forecasts with confidence intervals |
| procurement-order-writer.json | Procurement Order Writer | Drafts formal purchase orders from requisition and supplier data |
| warehouse-layout-advisor.json | Warehouse Layout Advisor | Recommends slotting and zone layout based on SKU velocity and characteristics |
| shipping-route-optimizer.json | Shipping Route Optimizer | Ranks route options by composite cost/time/reliability score |
| customs-document-preparer.json | Customs Document Preparer | Generates commercial invoice and customs declaration drafts |
| lead-time-calculator.json | Lead Time Calculator | Sums procurement phases and identifies critical path, adds buffer recommendation |
| stockout-predictor.json | Stockout Predictor | Predicts days-until-stockout and urgency level per SKU |
| bom-analyzer.json | BOM Analyzer | Identifies single-source risks, cost drivers, and dual-sourcing opportunities |

## Template Conventions
- **modelHint:** `anthropic/claude-haiku-4-5-20251001` (all templates — fast and cost-efficient for deterministic tasks)
- **maturity:** `tool-capable`
- **tools:** `["Read", "Write"]`
- **atomic:** `true`
- All system prompts follow the pattern: Role → Task → Input format → Output format → Determinism instruction
