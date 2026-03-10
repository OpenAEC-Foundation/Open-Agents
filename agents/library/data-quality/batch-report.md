# Data Quality Agent Library - Batch Report

**Generated:** 2026-03-10
**Builder:** batch-data-quality
**Category:** data-quality
**Status:** Complete

## Overview

Successfully created 10 atomic agent templates for data quality operations in the Open-Agents library.

## Agents Created

### 1. schema-validator
- **ID:** data-quality-schema-validator
- **Purpose:** Validates data schemas against defined structures
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 2. duplicate-detector
- **ID:** data-quality-duplicate-detector
- **Purpose:** Detects and reports duplicate records in datasets
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 3. null-value-analyzer
- **ID:** data-quality-null-value-analyzer
- **Purpose:** Analyzes NULL values and missing data patterns
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 4. data-freshness-checker
- **ID:** data-quality-data-freshness-checker
- **Purpose:** Checks data actuality and source provenance
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 5. referential-integrity-checker
- **ID:** data-quality-referential-integrity-checker
- **Purpose:** Validates referential integrity between datasets
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 6. outlier-detector
- **ID:** data-quality-outlier-detector
- **Purpose:** Identifies statistical outliers in numeric data
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 7. data-lineage-mapper
- **ID:** data-quality-data-lineage-mapper
- **Purpose:** Maps data provenance and transformation history
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 8. format-standardizer
- **ID:** data-quality-format-standardizer
- **Purpose:** Standardizes data formats across datasets
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 9. completeness-scorer
- **ID:** data-quality-completeness-scorer
- **Purpose:** Calculates completeness scores for datasets
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

### 10. data-contract-writer
- **ID:** data-quality-data-contract-writer
- **Purpose:** Generates data contracts and SLAs for datasets
- **Model:** claude-haiku-4-5-20251001
- **Tools:** Read, Write
- **Atomic:** Yes
- **Maturity:** tool-capable

## Technical Details

- **Format:** JSON
- **Location:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/data-quality/`
- **File Naming:** `{agent-name}.json`
- **Encoding:** UTF-8
- **Schema Compliance:** All agents follow atomic template standards

## Quality Metrics

| Metric | Value |
|--------|-------|
| Total Agents | 10 |
| Creation Status | 100% Complete |
| Atomic Compliance | ✓ All |
| Model Consistency | ✓ Haiku 4.5 |
| Tool Configuration | ✓ Read, Write |
| Maturity Level | ✓ tool-capable |

## Usage

To use any of these agents, reference by ID:

```bash
oa run "task" --model claude/haiku --agent-id data-quality-schema-validator
```

Or by file path from the library:

```bash
# Agent library auto-discovers these agents
```

## Next Steps

- Agents are ready for use in data quality workflows
- Can be combined in parallel for comprehensive data audits
- Consider creating composite agents that chain multiple data-quality agents
- Each agent is atomic and can work independently or as part of a quality pipeline
