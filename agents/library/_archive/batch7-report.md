# Batch 7 Agent Library Report

**Date:** 2026-03-08
**Agent:** library-batch7
**Total templates created:** 30

---

## Summary

30 new agent templates were created across 3 categories.

---

## Category: `machine-learning` (10 agents)

| File | Agent Name | Description |
|------|-----------|-------------|
| `dataset-cleaner.json` | Dataset Cleaner | Analyzes a dataset and produces a cleaned version by handling missing values, duplicates, and outliers. |
| `feature-engineer.json` | Feature Engineer | Generates new features from raw dataset columns using domain-agnostic transformations. |
| `model-evaluator.json` | Model Evaluator | Evaluates a trained ML model against a test set and produces a comprehensive metrics report. |
| `hyperparameter-tuner.json` | Hyperparameter Tuner | Designs a hyperparameter search strategy and configuration for a given ML model and dataset. |
| `training-pipeline-designer.json` | Training Pipeline Designer | Designs an end-to-end ML training pipeline with preprocessing, training, and evaluation steps. |
| `model-card-writer.json` | Model Card Writer | Generates a structured model card document for a trained ML model following Hugging Face standards. |
| `bias-detector.json` | Bias Detector | Analyzes model predictions for demographic or feature-based bias and produces a fairness report. |
| `data-splitter.json` | Data Splitter | Splits a dataset into train/validation/test sets using configurable strategies. |
| `embedding-generator.json` | Embedding Generator | Generates vector embeddings for text, image, or tabular data using a specified embedding model. |
| `inference-optimizer.json` | Inference Optimizer | Analyzes a trained model and recommends optimization techniques to reduce inference latency and memory usage. |

---

## Category: `frontend` (10 agents)

| File | Agent Name | Description |
|------|-----------|-------------|
| `component-designer.json` | Component Designer | Designs a reusable UI component with props interface, accessibility attributes, and usage examples. |
| `accessibility-auditor.json` | Accessibility Auditor | Audits frontend source files for WCAG 2.1 AA accessibility violations and produces a prioritized fix list. |
| `responsive-layout-advisor.json` | Responsive Layout Advisor | Analyzes a layout specification and produces a responsive CSS/Tailwind implementation plan with breakpoint strategy. |
| `state-management-selector.json` | State Management Selector | Analyzes an application's state requirements and recommends the optimal state management solution. |
| `bundle-size-analyzer.json` | Bundle Size Analyzer | Analyzes a frontend project's dependencies and build output to identify bundle size issues and optimization opportunities. |
| `css-variable-extractor.json` | CSS Variable Extractor | Extracts hardcoded CSS values from stylesheets and converts them to CSS custom properties with a design token structure. |
| `animation-designer.json` | Animation Designer | Designs CSS/JS animation specifications for UI interactions following motion design principles. |
| `form-validator-builder.json` | Form Validator Builder | Generates a form validation schema and reusable validation logic for a given form specification. |
| `i18n-setup-advisor.json` | i18n Setup Advisor | Designs an internationalization setup plan including library choice, file structure, and translation key conventions. |
| `dark-mode-implementer.json` | Dark Mode Implementer | Designs and implements a dark mode system using CSS custom properties and user preference detection. |

---

## Category: `backend` (10 agents)

| File | Agent Name | Description |
|------|-----------|-------------|
| `middleware-designer.json` | Middleware Designer | Designs a middleware chain for a web framework with ordering, error propagation, and context passing patterns. |
| `session-manager.json` | Session Manager | Designs a server-side session management system including storage backend, expiry, and security hardening. |
| `job-queue-configurator.json` | Job Queue Configurator | Configures a background job queue system with retry policies, priority queues, and dead-letter handling. |
| `caching-layer-designer.json` | Caching Layer Designer | Designs a multi-tier caching strategy for a backend API including cache keys, TTLs, and invalidation patterns. |
| `pagination-implementer.json` | Pagination Implementer | Implements a pagination system for API endpoints supporting cursor-based and offset-based strategies. |
| `webhook-handler-builder.json` | Webhook Handler Builder | Builds a secure webhook receiver with signature verification, idempotency, and retry handling. |
| `background-worker-designer.json` | Background Worker Designer | Designs a background worker process with graceful shutdown, health reporting, and concurrency management. |
| `rate-limiter-implementer.json` | Rate Limiter Implementer | Implements a rate limiting system for API endpoints with configurable strategies and client identification. |
| `health-endpoint-builder.json` | Health Endpoint Builder | Builds comprehensive health check endpoints for liveness, readiness, and deep dependency checks. |
| `graceful-shutdown-handler.json` | Graceful Shutdown Handler | Implements a graceful shutdown sequence for a backend service that drains in-flight requests before terminating. |

---

## Template Conventions

- **modelHint:** `anthropic/claude-haiku-4-5-20251001` (all 30 — deterministic, structured output tasks)
- **maturity:** `tool-capable`
- **atomic:** `true`
- **tools:** `Read`, `Write` (+ `Glob`, `Grep` where file scanning is needed)
- **systemPrompt pattern:** ROLE → Task → Input → Output → Rules (5 rules per template)
