# Batch Report — Cybersecurity Agent Library

**Date:** 2026-03-10
**Total templates created:** 10
**Status:** ✅ Complete

---

## Category: `cybersecurity` (10 agents)

| File | ID | Description |
|------|----|-------------|
| `threat-model-builder.json` | cybersecurity-threat-model-builder | Constructs comprehensive threat models for systems using STRIDE or similar frameworks with identified assets, threats, and mitigations. |
| `cve-impact-assessor.json` | cybersecurity-cve-impact-assessor | Analyzes CVE severity, exploitability, and business impact for vulnerability prioritization and response. |
| `penetration-test-report-writer.json` | cybersecurity-penetration-test-report-writer | Produces professional penetration test reports with executive summaries, technical findings, and remediation roadmaps. |
| `security-policy-writer.json` | cybersecurity-security-policy-writer | Drafts security policies for access control, data handling, incident response, and compliance with relevant standards. |
| `incident-response-planner.json` | cybersecurity-incident-response-planner | Develops incident response plans with detection, containment, eradication, and recovery procedures for security breaches. |
| `vulnerability-severity-ranker.json` | cybersecurity-vulnerability-severity-ranker | Prioritizes vulnerabilities by exploitability, business impact, and environmental context for efficient remediation. |
| `security-awareness-quiz-builder.json` | cybersecurity-security-awareness-quiz-builder | Creates interactive security awareness training quizzes with realistic scenarios and immediate feedback. |
| `oauth-flow-reviewer.json` | cybersecurity-oauth-flow-reviewer | Audits OAuth 2.0 and OpenID Connect implementations for security vulnerabilities and compliance with standards. |
| `secret-scanner-configurator.json` | cybersecurity-secret-scanner-configurator | Sets up and configures secrets detection tools for repositories and code pipelines to prevent credential leaks. |
| `zero-trust-architecture-advisor.json` | cybersecurity-zero-trust-architecture-advisor | Designs zero-trust network architecture with identity verification, least privilege access, and continuous verification. |

---

## Summary

- All 10 templates use `modelHint: "anthropic/claude-haiku-4-5-20251001"`
- All templates are `atomic: true` with `maturity: "tool-capable"`
- Tools: `["Read", "Write"]` for all templates
- systemPrompts follow the pattern: Role → Task → Input → Output → Deterministic rules
- Agents cover critical security domains: threat modeling, vulnerability assessment, incident response, policy, compliance, and architecture
- Each agent is specialized for a single, well-defined security task (atomic design principle)

---

## Agent Roles & Specializations

| Agent | Primary Function | Use Case |
|-------|-----------------|----------|
| Threat Model Builder | Risk assessment | Design-phase security analysis |
| CVE Impact Assessor | Vulnerability evaluation | Patch prioritization |
| Pentest Report Writer | Finding documentation | Post-engagement reporting |
| Security Policy Writer | Governance documentation | Compliance and control definition |
| Incident Response Planner | Crisis management | Breach readiness planning |
| Vulnerability Severity Ranker | Remediation prioritization | Resource allocation |
| Security Awareness Quiz Builder | Employee training | Human risk reduction |
| OAuth Flow Reviewer | Authentication audit | API/SSO security validation |
| Secret Scanner Configurator | Credential leak prevention | CI/CD hardening |
| Zero Trust Architecture Advisor | Network security design | Modern perimeter-less infrastructure |

---

## Technical Implementation Details

- **Format:** Valid JSON with deterministic field ordering
- **ID convention:** `cybersecurity-{agent-name}` (kebab-case)
- **Description field:** Single sentence, action-oriented
- **Tags:** Semantic, searchable terms reflecting agent specialization
- **System Prompts:** Detailed, role-based instructions with explicit input/output format and validation rules
- **Output location:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/cybersecurity/`

All templates are production-ready and follow the Open-Agents library standards.
