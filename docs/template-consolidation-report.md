# Template Consolidation Report

> **Date**: 2026-03-11
> **Scope**: `/agents/library/` — all JSON template files
> **Goal**: Reduce 1626 templates to ~200 canonical templates
> **Author**: template-dedup agent (claude/opus)

---

## 1. Current State

| Metric | Value |
|--------|-------|
| Total JSON files | 1626 |
| Successfully parsed | 1613 |
| Parse errors | 13 (all in `_archive/`) |
| Categories (directories) | 107 |
| Empty categories | 2 (`logistics/`, `ar-vr/`) |
| Archive (excluded per D-073) | 13 |

### Maturity Distribution

| Maturity | Count | % |
|----------|------:|--:|
| tool-capable | 1132 | 70.2% |
| prompt-template | 236 | 14.6% |
| unknown | 190 | 11.8% |
| experimental | 45 | 2.8% |
| orchestrator | 6 | 0.4% |
| prompt-only | 3 | 0.2% |
| stable | 1 | 0.1% |

### Model Hint Distribution

| Model | Count | % |
|-------|------:|--:|
| anthropic/claude-haiku-4-5-20251001 | 1067 | 66.1% |
| anthropic/claude-sonnet-4-6 | 538 | 33.4% |
| anthropic/claude-opus-4-6 | 7 | 0.4% |
| claude-sonnet-4-6 (non-standard) | 1 | 0.1% |

---

## 2. Templates Per Category

### Large Categories (>20 templates) — Prime Dedup Targets

| Category | Count | Notes |
|----------|------:|-------|
| database | 85 | Highest count. Heavy overlap with data-pipeline, data-transform |
| testing | 84 | Overlaps with review-quality, code-dev, security |
| api-design | 83 | Overlaps with backend, microservices |
| infra-devops | 50 | Overlaps with devops, infrastructure, cloud |
| core | 42 | Platform-specific agents for oa-cli |
| code-dev | 40 | Overlaps with testing, review-quality |
| research | 30 | General-purpose |
| review-quality | 30 | Heavy overlap with testing, code-dev |
| project-management | 30 | Overlaps with operations |
| communication | 27 | Overlaps with content, content-marketing |
| aec-blender | 26 | Domain-specific (AEC) |
| nlp | 25 | Overlaps with text-language |

### Cookie-Cutter Categories (exactly 10 templates each)

**71 categories** have exactly 10 templates each (710 total = 44% of library). ALL share these properties:
- Model: `anthropic/claude-haiku-4-5-20251001`
- Maturity: `tool-capable`
- SystemPrompt length: 250–650 chars

This is a strong signal of batch generation. These categories include: accessibility, agriculture, ai-integration, ai-safety, analytics, architecture, architecture-patterns, backend, blockchain, cloud, cloud-native, community, compliance, content, content-marketing, creative-writing, customer-success, cybersecurity, data-quality, data-visualization, design-system, devrel, education, education-tech, embedded, energy, event-driven, fashion-retail, finance, finance-ops, fintech, frontend, game-dev, geospatial, growth-hacking, healthcare, healthcare-ai, hr-ops, hr-people, insurance-tech, iot, iot-embedded, legal, legal-compliance, legal-tech, localization, machine-learning, media-processing, media-strategy, mental-health-tech, microservices, ml-ops, mobile, monitoring, no-code, observability, operations, performance, platform-engineering, privacy, product-management, prompt-engineering, quantum-computing, real-estate, real-time-systems, robotics, sales-crm, scientific, search-systems, sports-analytics, supply-chain, support, sustainability, technical-writing, ux-research, workflow-automation.

### Medium Categories (11–20 templates)

| Category | Count |
|----------|------:|
| erpnext | 20 |
| documentation | 20 |
| devops | 20 |
| data-transform | 20 |
| data-pipeline | 20 |
| blockchain | 20 |
| design-system | 20 |
| security | 20 |
| infrastructure | 20 |
| text-language | 20 |
| aec-ifcopenshell | 19 |
| git-versioning | 18 |
| file-system | 15 |
| aec-bonsai | 14 |
| open-agents-meta | 12 |
| aec-sverchok | 12 |
| workspace-management | 8 |

---

## 3. Exact Name Duplicates

**62 templates** share an identical name with at least one other template across different categories. These are the highest-confidence duplicates.

### Top 10 Exact Duplicate Clusters

| # | Template Name | Categories | Action |
|---|--------------|------------|--------|
| 1 | `kubernetes manifest writer` | cloud-native, devops, devops | Keep 1 in devops |
| 2 | `etl pipeline designer` | data-pipeline, data-pipeline, database | Keep 1 in data-pipeline |
| 3 | `sql query optimizer` | code-dev, data-pipeline | Keep 1 in database |
| 4 | `test data generator` | review-quality, testing | Keep 1 in testing |
| 5 | `api test generator` | testing, testing | Deduplicate within testing |
| 6 | `unit test generator` | testing, testing | Deduplicate within testing |
| 7 | `dead code detector` | code-dev, code-dev | Deduplicate within code-dev |
| 8 | `changelog generator` | documentation, git-versioning | Keep 1 in git-versioning |
| 9 | `job description writer` | hr-ops, hr-people | Keep 1 in hr-people |
| 10 | `privacy impact assessor` | legal-compliance, privacy | Keep 1 in compliance |

### Full List of Exact Duplicates (62 pairs/triples)

Cross-category duplicates (different categories, same name):
- `api changelog writer` → api-design, devrel
- `api documentation generator` → api-design, api-design (within-category dupe)
- `api gateway configurator` → api-design, microservices
- `rest endpoint designer` → api-design, api-design
- `graphql schema generator` → api-design, code-dev
- `dependency graph builder` → architecture, code-dev
- `disaster recovery planner` → cloud, infrastructure
- `service mesh configurator` → cloud-native, infrastructure
- `code smell detector` → code-dev, testing
- `code complexity analyzer` → code-dev, testing
- `mock object generator` → code-dev, testing
- `release notes writer` → communication, git-versioning
- `onboarding guide writer` → communication, technical-writing
- `email sequence planner` → content, content-marketing
- `video script writer` → content, media-strategy
- `generate commit message` → core, git-versioning
- `skill tester` → core, open-agents-meta
- `onboarding checklist builder` → customer-success, hr-people
- `data lineage tracker` → data-pipeline, data-pipeline
- `data retention policy builder` → data-pipeline, legal-tech
- `changelog formatter` → documentation, technical-writing
- `readme writer` → documentation, documentation
- `architecture decision record writer` → documentation, technical-writing
- `troubleshooting guide writer` → documentation, technical-writing
- `learning objective writer` → education, education-tech
- `quiz generator` → education, education-tech
- `rubric builder` → education, education-tech
- `power management optimizer` → embedded, iot-embedded
- `cash flow forecaster` → finance, finance-ops
- `cost center allocator` → finance, finance-ops
- `financial report formatter` → finance, fintech
- `interview question generator` → hr-ops, hr-people
- `performance review writer` → hr-ops, hr-people
- `network topology designer` → infrastructure, infrastructure
- `load balancer configurator` → infrastructure, infrastructure
- `contract clause extractor` → legal, legal-tech
- `hyperparameter tuner` → machine-learning, ml-ops
- `model card writer` → machine-learning, ml-ops
- `alert rule writer` → monitoring, observability
- `log query builder` → monitoring, observability
- `text summarizer` → nlp, text-language
- `incident postmortem writer` → observability, support
- `risk register builder` → operations, project-management
- `load test designer` → review-quality, testing
- `vulnerability assessor` → security, testing
- `visual regression tester` → testing, testing
- `test fixture generator` → testing, testing

Within-category duplicates:
- `backlog groomer` → project-management ×2
- `sprint planner` → project-management ×2
- `retrospective facilitator` → project-management ×2
- `accessibility checker` → review-quality ×2
- `rollback planner` → devops ×2

---

## 4. Semantic Duplicate Clusters

Beyond exact name matches, templates cluster by **function + subject matter**. The top clusters:

### Functional Role Distribution (1613 templates)

| Function | Count | % |
|----------|------:|--:|
| generation (builder/writer/creator) | 340 | 21.1% |
| design (designer/architect) | 158 | 9.8% |
| analysis (analyzer/assessor/evaluator) | 95 | 5.9% |
| planning (planner/scheduler) | 84 | 5.2% |
| review (reviewer/auditor/checker) | 71 | 4.4% |
| optimization (optimizer/tuner) | 52 | 3.2% |
| scanning (scanner/detector) | 30 | 1.9% |
| monitoring (monitor/tracker/watcher) | 24 | 1.5% |
| testing (tester) | 24 | 1.5% |
| validation (validator/verifier) | 20 | 1.2% |
| formatting | 15 | 0.9% |
| other/unique | 624 | 38.7% |

### Largest Semantic Clusters

| # | Cluster | Templates | Categories | Examples |
|---|---------|----------:|-----------|----------|
| 1 | test-related generators | 16 | 5 | `accessibility-test-plan-writer`, `penetration-test-report-writer`, `unit-test-generator` |
| 2 | test-related testers | 13 | 4 | `embedded-test-harness`, `regression-test-identifier`, `chaos-test-runner` |
| 3 | database designers | 12 | 6 | `database-replication-architect`, `mongodb-schema-designer`, `query-parallelization-designer` |
| 4 | test designers | 10 | 7 | `a-b-test-designer`, `sso-integration-architect`, `wallet-integration-designer` |
| 5 | compliance reviewers | 9 | 8 | `wcag-compliance-checker`, `gdpr-checker`, `license-compliance-auditor` |
| 6 | API generators | 7 | 4 | `api-changelog-writer`, `graphql-subscription-builder`, `rest-hateoas-builder` |
| 7 | API designers | 7 | 3 | `api-sandbox-designer`, `graphql-federation-architect`, `rest-endpoint-designer` |
| 8 | data generators | 7 | 6 | `data-retention-policy-writer`, `data-catalog-entry-writer`, `test-data-factory-generator` |
| 9 | CI/CD generators | 6 | 4 | `embedding-pipeline-builder`, `ci-pipeline-builder`, `github-actions-pipeline-writer` |
| 10 | database optimizers | 6 | 3 | `sql-query-optimizer` ×2, `query-statistics-optimizer`, `index-tuning-advisor` |

### Category Pairs With Most Overlap

| Category A | Category B | Overlapping Function-Subject Groups |
|-----------|-----------|:---:|
| testing | review-quality | 5 |
| testing | code-dev | 4 |
| data-pipeline | database | 4 |
| testing | security | 3 |
| testing | blockchain | 2 |
| compliance | legal-tech | 2 |
| data-pipeline | data-quality | 2 |
| observability | monitoring | 2 |

---

## 5. Category Merge Recommendations

### Tier 1: MUST Merge (high overlap, redundant taxonomy)

| Merge Into | Absorb From | Rationale |
|-----------|-------------|-----------|
| `testing` | `review-quality` | 5 overlapping groups; review-quality is a subset of testing concerns |
| `devops` | `infra-devops` | Identical domain; infra-devops is 50 templates that duplicate devops+infrastructure |
| `infrastructure` | (part of `infra-devops`) | Split infra-devops: infra topics → infrastructure, devops topics → devops |
| `monitoring` | `observability` | Same domain, 2 exact name duplicates |
| `legal` | `legal-compliance`, `legal-tech` | Three legal categories is excessive; merge into one |
| `hr-people` | `hr-ops` | 3 exact name duplicates; same domain |
| `finance` | `finance-ops`, `fintech` | Three finance categories; merge non-tech into finance |
| `healthcare` | `healthcare-ai` | healthcare-ai is a specialization that fits inside healthcare |
| `education` | `education-tech` | 3 exact name duplicates |
| `iot` | `iot-embedded` | Same domain |
| `content` | `content-marketing` | Overlapping; email-sequence-planner is duplicated |
| `nlp` | `text-language` | text-summarizer duplicated; same functional domain |
| `cloud` | `cloud-native` | Kubernetes/service-mesh duplicated |
| `data-pipeline` | `data-transform`, `data-quality` | Same ETL/data-engineering domain |

**Result of Tier 1 merges**: 107 categories → ~90 categories, ~62 exact duplicates removed.

### Tier 2: SHOULD Merge (moderate overlap)

| Merge Into | Absorb From | Rationale |
|-----------|-------------|-----------|
| `documentation` | `technical-writing` | 4 exact name duplicates |
| `architecture` | `architecture-patterns` | Same domain |
| `security` | `cybersecurity` | Cybersecurity is subset of security |
| `media-processing` | `media-strategy` | Same media domain |
| `machine-learning` | `ml-ops` | 2 exact name duplicates |
| `code-dev` | (testing overlap) | Move code-smell-detector, mock-object-generator back to code-dev |

**Result of Tier 2 merges**: ~90 → ~83 categories.

### Tier 3: CONSIDER Removing (empty or near-zero value)

| Category | Count | Reason |
|----------|------:|--------|
| `logistics` | 0 | Empty |
| `ar-vr` | 0 | Empty |
| `_archive` | 13 | Excluded by D-073 |
| `smart-city` | 3 | Too niche for 3 templates |
| `server-ops` | 3 | Fits in infrastructure |
| `aec-cross` | 2 | Fits in aec-blender or aec-bonsai |

---

## 6. Consolidation Strategy

### Phase 1: Remove Exact Duplicates (immediate)
- Delete 62 duplicate templates (keep the one in the most specific category)
- **Result**: 1613 → 1551

### Phase 2: Merge Overlapping Categories (Tier 1 + Tier 2)
- Execute 20 category merges
- Remove duplicates surfaced by merging
- **Result**: 1551 → ~1450, 107 categories → ~83

### Phase 3: Consolidate Cookie-Cutter Batches
- The 71 categories with exactly 10 batch-generated templates (710 total) EACH need review
- Within each batch: identify templates that serve identical functions under different names
- Conservative estimate: 30% reduction within batches
- **Result**: ~1450 → ~1240

### Phase 4: Cross-Category Functional Dedup
- Group all remaining templates by function+subject fingerprint
- For each group with 3+ members across categories: keep 1 canonical, tag others as aliases
- **Result**: ~1240 → ~800

### Phase 5: Prune Low-Value Templates
- Remove templates with `maturity: unknown` that have no unique function (190 candidates)
- Remove templates whose systemPrompt is <300 chars AND duplicates a function already covered
- **Result**: ~800 → ~500

### Phase 6: Deep Semantic Dedup (requires LLM-assisted review)
- Compare systemPrompt content (not just first 200 chars) for remaining templates
- Identify templates that differ only in domain framing but share identical logic
- **Result**: ~500 → **~200–250**

---

## 7. Estimated Final State

| Metric | Before | After |
|--------|-------:|------:|
| Total templates | 1613 | ~200–250 |
| Categories | 107 | ~40–50 |
| Exact duplicates | 62 | 0 |
| Batch-generated (10-per-cat) | 710 | ~150 |
| AEC domain | 73 | ~25 |
| Core/platform | 42 | ~15 |

### Recommended Category Taxonomy (post-consolidation)

| # | Category | Est. Templates | Covers |
|---|----------|---------------:|--------|
| 1 | core | 15 | oa-cli platform agents |
| 2 | code-dev | 15 | Code generation, refactoring, linting |
| 3 | testing | 15 | Test generation, execution, coverage, QA |
| 4 | api-design | 12 | REST, GraphQL, gRPC, API lifecycle |
| 5 | database | 12 | SQL, NoSQL, schema, migration, optimization |
| 6 | data-engineering | 10 | ETL, pipelines, quality, transformation |
| 7 | devops | 10 | CI/CD, deployment, containers, IaC |
| 8 | infrastructure | 8 | Networking, load balancing, cloud setup |
| 9 | security | 8 | Vuln scanning, compliance, auth |
| 10 | monitoring | 6 | Logging, alerting, observability |
| 11 | documentation | 8 | READMEs, changelogs, ADRs, technical writing |
| 12 | git-versioning | 6 | Commits, branches, releases |
| 13 | research | 8 | Multi-source research, analysis |
| 14 | communication | 6 | Reports, notifications, status updates |
| 15 | project-management | 6 | Sprint, backlog, retrospective |
| 16 | nlp | 8 | Summarization, translation, classification |
| 17 | aec-blender | 10 | Blender/Bonsai/IFC/Sverchok |
| 18 | erpnext | 8 | DocTypes, workflows, Frappe |
| 19 | frontend | 5 | UI/UX, CSS, React, accessibility |
| 20 | ml-ops | 6 | Training, tuning, model management |
| 21 | finance | 5 | Accounting, forecasting, compliance |
| 22 | legal | 5 | Contracts, GDPR, privacy |
| 23 | hr | 5 | Hiring, reviews, onboarding |
| 24 | education | 5 | Learning, quizzes, curriculum |
| 25–40 | (domain-specific) | 2–3 each | healthcare, agriculture, energy, etc. |
| **Total** | | **~200** | |

---

## 8. AGENTS.md Alignment

AGENTS.md documents **1015 agents** across 20 categories (A–T). The library contains **1613 JSON templates** across 107 categories. Key misalignments:

1. **AGENTS.md uses functional categories** (Text & Language, Code & Development) while the library uses **domain categories** (agriculture, fashion-retail). These taxonomies are incompatible.
2. **AGENTS.md agents are not 1:1 with library templates**. Many AGENTS.md entries (e.g., A-01 `summarize`) have no corresponding JSON template. Many library templates have no AGENTS.md entry.
3. **Recommendation**: After consolidation, regenerate AGENTS.md from the canonical template set. Use the library's category structure as the single source of truth.

---

## 9. Implementation Priority

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| P0 | Delete 62 exact-name duplicates | -62 templates | 1 hour (scripted) |
| P1 | Merge 14 Tier-1 category pairs | -20 categories, ~-50 templates | 2 hours |
| P2 | Merge 6 Tier-2 category pairs | -6 categories, ~-20 templates | 1 hour |
| P3 | Audit 71 cookie-cutter categories | -200 templates | 4 hours |
| P4 | Cross-category functional dedup | -300 templates | 4 hours |
| P5 | Prune low-value templates | -200 templates | 2 hours |
| P6 | LLM-assisted deep semantic dedup | -200 templates | 8 hours |

**Total estimated reduction: 1613 → ~200 canonical templates.**

---

## 10. Appendix: All 62 Exact-Name Duplicate Pairs

```
kubernetes-manifest-writer:        cloud-native, devops, devops
etl-pipeline-designer:             data-pipeline, data-pipeline, database
api-changelog-writer:              api-design, devrel
api-documentation-generator:       api-design, api-design
api-gateway-configurator:          api-design, microservices
rest-endpoint-designer:            api-design, api-design
graphql-schema-generator:          api-design, code-dev
dependency-graph-builder:          architecture, code-dev
disaster-recovery-planner:         cloud, infrastructure
service-mesh-configurator:         cloud-native, infrastructure
dead-code-detector:                code-dev, code-dev
code-smell-detector:               code-dev, testing
code-complexity-analyzer:          code-dev, testing
mock-object-generator:             code-dev, testing
sql-query-optimizer:               code-dev, data-pipeline
release-notes-writer:              communication, git-versioning
onboarding-guide-writer:           communication, technical-writing
email-sequence-planner:            content, content-marketing
video-script-writer:               content, media-strategy
generate-commit-message:           core, git-versioning
skill-tester:                      core, open-agents-meta
onboarding-checklist-builder:      customer-success, hr-people
data-lineage-tracker:              data-pipeline, data-pipeline
data-retention-policy-builder:     data-pipeline, legal-tech
rollback-planner:                  devops, devops
changelog-formatter:               documentation, technical-writing
readme-writer:                     documentation, documentation
changelog-generator:               documentation, git-versioning
architecture-decision-record-writer: documentation, technical-writing
troubleshooting-guide-writer:      documentation, technical-writing
learning-objective-writer:         education, education-tech
quiz-generator:                    education, education-tech
rubric-builder:                    education, education-tech
power-management-optimizer:        embedded, iot-embedded
cash-flow-forecaster:              finance, finance-ops
cost-center-allocator:             finance, finance-ops
financial-report-formatter:        finance, fintech
interview-question-generator:      hr-ops, hr-people
job-description-writer:            hr-ops, hr-people
performance-review-writer:         hr-ops, hr-people
network-topology-designer:         infrastructure, infrastructure
load-balancer-configurator:        infrastructure, infrastructure
contract-clause-extractor:         legal, legal-tech
privacy-impact-assessor:           legal-compliance, privacy
hyperparameter-tuner:              machine-learning, ml-ops
model-card-writer:                 machine-learning, ml-ops
alert-rule-writer:                 monitoring, observability
log-query-builder:                 monitoring, observability
text-summarizer:                   nlp, text-language
incident-postmortem-writer:        observability, support
risk-register-builder:             operations, project-management
backlog-groomer:                   project-management, project-management
sprint-planner:                    project-management, project-management
retrospective-facilitator:         project-management, project-management
accessibility-checker:             review-quality, review-quality
test-data-generator:               review-quality, testing
load-test-designer:                review-quality, testing
vulnerability-assessor:            security, testing
api-test-generator:                testing, testing
test-fixture-generator:            testing, testing
unit-test-generator:               testing, testing
visual-regression-tester:          testing, testing
```

---

*Report generated 2026-03-11 by template-dedup agent. No files were modified — this is an analysis-only report.*
