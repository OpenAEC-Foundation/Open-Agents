# Agent Library — Batch 6 Report

**Date:** 2026-03-08  
**Total templates created:** 30  

## Summary

Batch 6 adds three new categories to the agent library covering API design, documentation, and software architecture. All templates follow the standard format with deterministic system prompts, `tool-capable` maturity, and `anthropic/claude-haiku-4-5-20251001` model hint.

---

## Category: `api-design` (10 agents)

| File | Agent Name | Description |
|------|-----------|-------------|
| `openapi-spec-writer.json` | OpenAPI Spec Writer | Generates complete OpenAPI 3.x specs |
| `rest-endpoint-designer.json` | REST Endpoint Designer | Designs RESTful endpoint structures |
| `graphql-schema-generator.json` | GraphQL Schema Generator | Generates GraphQL SDL schemas |
| `webhook-designer.json` | Webhook Designer | Designs webhook systems with retry policies |
| `rate-limit-planner.json` | Rate Limit Planner | Defines rate limiting strategy per tier |
| `api-versioning-advisor.json` | API Versioning Advisor | Recommends versioning strategy and migration |
| `auth-scheme-selector.json` | Auth Scheme Selector | Selects authentication/authorization schemes |
| `pagination-designer.json` | Pagination Designer | Designs consistent pagination strategies |
| `error-response-standardizer.json` | Error Response Standardizer | Standardizes error formats (RFC 7807) |
| `api-mock-generator.json` | API Mock Generator | Generates mock server configs and fixtures |

---

## Category: `documentation` (10 agents)

| File | Agent Name | Description |
|------|-----------|-------------|
| `readme-writer.json` | README Writer | Generates comprehensive README.md files |
| `api-docs-generator.json` | API Docs Generator | Generates API reference documentation |
| `changelog-formatter.json` | Changelog Formatter | Formats git log into CHANGELOG.md |
| `architecture-decision-recorder.json` | Architecture Decision Recorder | Creates formal ADR documents |
| `onboarding-guide-creator.json` | Onboarding Guide Creator | Creates developer onboarding guides |
| `troubleshooting-guide-writer.json` | Troubleshooting Guide Writer | Maps symptoms to solutions |
| `glossary-builder.json` | Glossary Builder | Builds domain-specific glossaries |
| `diagram-generator.json` | Diagram Generator | Generates Mermaid/PlantUML diagrams |
| `release-notes-formatter.json` | Release Notes Formatter | Transforms changelogs to user-facing notes |
| `wiki-page-creator.json` | Wiki Page Creator | Creates structured wiki pages |

---

## Category: `architecture` (10 agents)

| File | Agent Name | Description |
|------|-----------|-------------|
| `system-design-reviewer.json` | System Design Reviewer | Reviews designs for scalability/reliability |
| `microservices-splitter.json` | Microservices Splitter | Decomposes monoliths into microservices |
| `domain-model-designer.json` | Domain Model Designer | Designs DDD domain models |
| `event-driven-architect.json` | Event-Driven Architect | Designs event-driven architectures |
| `cqrs-pattern-advisor.json` | CQRS Pattern Advisor | Advises on CQRS implementation |
| `saga-pattern-planner.json` | Saga Pattern Planner | Plans distributed transaction sagas |
| `circuit-breaker-advisor.json` | Circuit Breaker Advisor | Recommends circuit breaker configuration |
| `cache-strategy-designer.json` | Cache Strategy Designer | Designs multi-level caching strategies |
| `data-flow-mapper.json` | Data Flow Mapper | Maps complete system data flows |
| `dependency-graph-builder.json` | Dependency Graph Builder | Builds and analyzes dependency graphs |

---

## Quality Notes

- All 30 templates pass schema validation (id, name, description, atomic, category, tags, maturity, modelHint, tools, systemPrompt)
- System prompts follow the pattern: Role → Task → Input → Output → Rules
- Tags are specific and searchable
- Model: `anthropic/claude-haiku-4-5-20251001` (appropriate for structured output tasks)
