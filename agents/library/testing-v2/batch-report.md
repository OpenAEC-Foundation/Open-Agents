# Testing Agent Library v2 - Batch Report

**Generated:** 2026-03-10
**Library:** `/agents/library/testing-v2/`
**Total Templates:** 10
**Category:** testing
**Status:** ✅ Complete

---

## Agent Templates Created

### 1. **test-case-writer** (testing-test-case-writer)
- **Purpose:** Generates comprehensive test cases from requirements and specifications
- **Input:** requirements.md, code_spec.txt, user_story.md
- **Output:** test_cases.md, test_cases.json
- **Focus:** Functional and non-functional test case generation with coverage mapping
- **Status:** ✅ Ready for use

### 2. **boundary-value-analyzer** (testing-boundary-value-analyzer)
- **Purpose:** Identifies boundary values and edge cases for validation testing
- **Input:** function_code.py, api_schema.json, data_constraints.md
- **Output:** boundary_test_values.json, boundary_analysis.md
- **Focus:** Boundary value analysis, equivalence partitioning, edge case identification
- **Status:** ✅ Ready for use

### 3. **regression-suite-planner** (testing-regression-suite-planner)
- **Purpose:** Plans comprehensive regression testing strategies after code changes
- **Input:** change_log.md, code_diff.patch, feature_description.md
- **Output:** regression_plan.md, test_selection.json
- **Focus:** Risk-based test selection, change impact analysis
- **Status:** ✅ Ready for use

### 4. **load-test-scenario-designer** (testing-load-test-scenario-designer)
- **Purpose:** Designs realistic load testing scenarios and stress tests
- **Input:** system_requirements.md, user_analytics.json, performance_targets.txt
- **Output:** load_test_scenario.jmx, scenario_definition.json
- **Focus:** Performance testing, capacity planning, load profiling
- **Status:** ✅ Ready for use

### 5. **mutation-test-advisor** (testing-mutation-test-advisor)
- **Purpose:** Advises on mutation testing to validate test quality
- **Input:** test_code.py, mutation_report.json, coverage_data.xml
- **Output:** mutation_advice.md, test_improvements.json
- **Focus:** Test effectiveness, weak test detection, mutation analysis
- **Status:** ✅ Ready for use

### 6. **contract-test-planner** (testing-contract-test-planner)
- **Purpose:** Plans contract testing for microservices and API integrations
- **Input:** api_schema.json, integration_map.md, service_interfaces.yaml
- **Output:** contract_tests.json, contract_plan.md
- **Focus:** Consumer-provider contracts, API compatibility, integration testing
- **Status:** ✅ Ready for use

### 7. **chaos-engineering-scenario-builder** (testing-chaos-engineering-scenario-builder)
- **Purpose:** Designs chaos engineering and resilience testing scenarios
- **Input:** system_architecture.md, dependencies.json, reliability_requirements.txt
- **Output:** chaos_experiments.yaml, scenario_plan.md
- **Focus:** Failure scenario design, resilience validation, controlled experiments
- **Status:** ✅ Ready for use

### 8. **test-data-generator** (testing-test-data-generator)
- **Purpose:** Generates realistic test data covering various scenarios
- **Input:** data_schema.json, requirements.md, database_model.sql
- **Output:** test_data.csv, test_data.sql, test_data.json
- **Focus:** Realistic dataset generation, edge cases, bulk data for performance testing
- **Status:** ✅ Ready for use

### 9. **coverage-gap-analyzer** (testing-coverage-gap-analyzer)
- **Purpose:** Analyzes test coverage and identifies gaps
- **Input:** coverage_report.xml, coverage_report.json, code_with_coverage.py
- **Output:** coverage_analysis.md, gap_remediation.json
- **Focus:** Coverage metrics, untested paths, quality improvement
- **Status:** ✅ Ready for use

### 10. **test-pyramid-advisor** (testing-test-pyramid-advisor)
- **Purpose:** Advises on optimal test pyramid architecture
- **Input:** test_inventory.json, test_metrics.json, test_suite_analysis.md
- **Output:** pyramid_recommendations.md, test_strategy.json
- **Focus:** Test strategy, layer optimization, CI/CD integration
- **Status:** ✅ Ready for use

---

## Technical Specifications

### Common Configuration
- **Model Hint:** `anthropic/claude-haiku-4-5-20251001` (optimized for efficiency)
- **Tools:** `Read`, `Write` (atomic, focused operations)
- **Atomic:** `true` (each agent handles single concern)
- **Maturity:** `tool-capable` (proven tool usage patterns)

### File Structure
```
/agents/library/testing-v2/
├── test-case-writer.json
├── boundary-value-analyzer.json
├── regression-suite-planner.json
├── load-test-scenario-designer.json
├── mutation-test-advisor.json
├── contract-test-planner.json
├── chaos-engineering-scenario-builder.json
├── test-data-generator.json
├── coverage-gap-analyzer.json
├── test-pyramid-advisor.json
└── batch-report.md
```

---

## Testing Domain Coverage

### Test Design & Strategy
- test-case-writer (requirement-based testing)
- test-pyramid-advisor (architecture & strategy)
- regression-suite-planner (change management)

### Quality Analysis
- boundary-value-analyzer (input validation)
- coverage-gap-analyzer (completeness)
- mutation-test-advisor (test effectiveness)

### Performance & Reliability
- load-test-scenario-designer (performance)
- chaos-engineering-scenario-builder (resilience)

### Integration & Data
- contract-test-planner (service contracts)
- test-data-generator (test data management)

---

## Usage Patterns

### Common Workflows
1. **New Feature Testing:** test-case-writer → boundary-value-analyzer → test-data-generator
2. **Quality Improvement:** coverage-gap-analyzer → mutation-test-advisor → test-pyramid-advisor
3. **Change Management:** regression-suite-planner → boundary-value-analyzer
4. **Microservice Testing:** contract-test-planner → load-test-scenario-designer
5. **Resilience:** chaos-engineering-scenario-builder → load-test-scenario-designer

### Tool Usage
- **Read:** Input files (requirements, specs, code, reports)
- **Write:** Output files (test plans, test data, recommendations, analyses)

---

## Quality Assurance

✅ All 10 templates created with consistent structure
✅ Valid JSON with proper double-quote syntax
✅ Complete systemPrompt for each agent
✅ Clear input/output format definitions
✅ Comprehensive tag organization
✅ Tool specifications match atomic pattern
✅ Model hint correctly specified
✅ All IDs follow naming convention: `testing-{name}`

---

## Deployment Ready

The testing-v2 library is ready for integration with the Open-Agents platform.

**To use these agents:**
```bash
oa run "<task>" --name agent-name --model claude/haiku-4-5 \
  --agent-template testing-v2/test-case-writer
```

Or reference directly:
```json
{
  "template": "testing-v2/test-case-writer",
  "model": "anthropic/claude-haiku-4-5-20251001"
}
```

---

**Library Version:** 2.0
**Created:** 2026-03-10
**Author:** batch-testing-v2 Agent
**Status:** Production Ready
