# Batch 4 Agent Library Report

## Summary
30 new agent templates added across 3 new categories.

## Category: testing (10 agents)
| File | ID | Description |
|------|-----|-------------|
| unit-test-generator.json | testing-unit-test-generator | Generates unit tests for source files covering edge cases and happy paths |
| integration-test-planner.json | testing-integration-test-planner | Plans integration test scenarios for multi-component systems |
| mock-data-generator.json | testing-mock-data-generator | Generates realistic mock data fixtures based on schema definitions |
| test-coverage-reporter.json | testing-test-coverage-reporter | Analyzes coverage output and produces prioritized uncovered code path reports |
| snapshot-tester.json | testing-snapshot-tester | Generates snapshot test cases for UI components to detect regressions |
| e2e-test-scripter.json | testing-e2e-test-scripter | Writes E2E test scripts for user flows using Playwright/Cypress/Selenium |
| load-test-designer.json | testing-load-test-designer | Designs load and stress test scenarios using k6, Locust, or JMeter |
| regression-finder.json | testing-regression-finder | Identifies regression areas by analyzing recent changes vs existing tests |
| flaky-test-detector.json | testing-flaky-test-detector | Analyzes test result history to identify and explain flaky tests |
| test-suite-organizer.json | testing-test-suite-organizer | Restructures and categorizes test suites for better discoverability |

## Category: security (10 agents)
| File | ID | Description |
|------|-----|-------------|
| vulnerability-scanner.json | security-vulnerability-scanner | Scans source code for OWASP Top 10 vulnerabilities |
| secret-detector.json | security-secret-detector | Detects hardcoded secrets, API keys, and tokens in code |
| sql-injection-checker.json | security-sql-injection-checker | Identifies SQL injection vulnerabilities and suggests fixes |
| xss-vulnerability-detector.json | security-xss-vulnerability-detector | Detects XSS vulnerabilities in frontend code and templates |
| dependency-cve-checker.json | security-dependency-cve-checker | Reviews dependency manifests for known CVEs |
| auth-flow-reviewer.json | security-auth-flow-reviewer | Reviews auth flows for security weaknesses and logic flaws |
| input-validation-auditor.json | security-input-validation-auditor | Audits user input handling for missing validation and sanitization |
| rate-limit-advisor.json | security-rate-limit-advisor | Recommends rate limiting strategies to prevent abuse and DoS |
| cors-policy-checker.json | security-cors-policy-checker | Reviews CORS configuration for overly permissive settings |
| ssl-certificate-validator.json | security-ssl-certificate-validator | Validates SSL/TLS configuration and certificate settings |

## Category: devops (10 agents)
| File | ID | Description |
|------|-----|-------------|
| dockerfile-generator.json | devops-dockerfile-generator | Generates optimized multi-stage Dockerfiles for any tech stack |
| ci-pipeline-builder.json | devops-ci-pipeline-builder | Generates CI/CD pipeline config for GitHub Actions/GitLab CI/CircleCI |
| kubernetes-manifest-writer.json | devops-kubernetes-manifest-writer | Writes K8s manifests: Deployment, Service, Ingress, HPA |
| terraform-module-generator.json | devops-terraform-module-generator | Generates reusable Terraform modules for AWS/GCP/Azure |
| monitoring-alert-writer.json | devops-monitoring-alert-writer | Creates alert rules and runbooks for Prometheus/Grafana/Datadog |
| log-aggregation-configurator.json | devops-log-aggregation-configurator | Generates log aggregation config for ELK/Loki/Fluentd/Datadog |
| deployment-checklist-generator.json | devops-deployment-checklist-generator | Generates deployment checklists tailored to app type and environment |
| rollback-planner.json | devops-rollback-planner | Creates rollback plans covering DB migrations and service restoration |
| environment-variable-auditor.json | devops-environment-variable-auditor | Audits env var usage for consistency, missing values, and secret exposure |
| healthcheck-endpoint-designer.json | devops-healthcheck-endpoint-designer | Designs liveness/readiness health check endpoints with K8s probe config |

## Total
- **30 files written** across 3 new categories
- All templates follow the standard format with `atomic: true`, `maturity: tool-capable`, `modelHint: anthropic/claude-haiku-4-5-20251001`
- Destination: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/`
