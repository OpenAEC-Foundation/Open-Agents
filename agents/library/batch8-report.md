# Batch 8 Report — Agent Library Builder

**Date:** 2026-03-08  
**Total templates created:** 30  
**Categories:** cloud (10), data-pipeline (10), performance (10)

---

## Category: cloud (10 agents)

| File | ID | Description |
|------|----|-------------|
| `cloud/aws-iam-policy-writer.json` | cloud-aws-iam-policy-writer | Generates least-privilege AWS IAM policies based on service and action requirements. |
| `cloud/s3-bucket-configurator.json` | cloud-s3-bucket-configurator | Generates S3 bucket configuration including policies, CORS, lifecycle rules, and versioning settings. |
| `cloud/lambda-function-designer.json` | cloud-lambda-function-designer | Designs AWS Lambda function scaffolding with handler, IAM role, environment variables, and trigger configuration. |
| `cloud/azure-arm-template-writer.json` | cloud-azure-arm-template-writer | Generates Azure Resource Manager templates for deploying Azure infrastructure resources. |
| `cloud/gcp-iam-binder.json` | cloud-gcp-iam-binder | Generates GCP IAM role bindings and custom role definitions for Google Cloud projects. |
| `cloud/cost-estimator.json` | cloud-cost-estimator | Estimates monthly cloud costs for a given infrastructure configuration across AWS, Azure, or GCP. |
| `cloud/multi-region-architect.json` | cloud-multi-region-architect | Designs multi-region cloud architectures with failover, data replication, and latency routing strategies. |
| `cloud/disaster-recovery-planner.json` | cloud-disaster-recovery-planner | Creates disaster recovery plans with RTO/RPO targets, backup strategies, and failover runbooks. |
| `cloud/migration-advisor.json` | cloud-migration-advisor | Analyzes on-premises workloads and recommends a cloud migration strategy with timeline and risk assessment. |
| `cloud/serverless-function-builder.json` | cloud-serverless-function-builder | Generates complete serverless function code with event handler, input validation, and error handling for any cloud provider. |

---

## Category: data-pipeline (10 agents)

| File | ID | Description |
|------|----|-------------|
| `data-pipeline/etl-pipeline-designer.json` | data-pipeline-etl-pipeline-designer | Designs ETL pipeline architecture with source connectors, transformations, and target loader configurations. |
| `data-pipeline/stream-processor-configurator.json` | data-pipeline-stream-processor-configurator | Configures streaming data processors (Kafka, Flink, Spark Streaming) with topics, consumers, and processing logic. |
| `data-pipeline/batch-job-scheduler.json` | data-pipeline-batch-job-scheduler | Designs Airflow DAG or similar batch job schedules with dependencies, retries, and SLA monitoring. |
| `data-pipeline/data-quality-checker.json` | data-pipeline-data-quality-checker | Generates data quality validation rules and Great Expectations suites for datasets. |
| `data-pipeline/schema-evolution-handler.json` | data-pipeline-schema-evolution-handler | Analyzes schema changes and generates backward-compatible migration scripts for data pipelines. |
| `data-pipeline/data-lineage-tracker.json` | data-pipeline-data-lineage-tracker | Documents data lineage by tracing column-level transformations through pipeline stages. |
| `data-pipeline/pipeline-error-handler.json` | data-pipeline-pipeline-error-handler | Designs error handling and dead-letter queue strategies for data pipeline failure scenarios. |
| `data-pipeline/data-catalog-entry-writer.json` | data-pipeline-data-catalog-entry-writer | Generates structured data catalog entries with descriptions, ownership, and data classification metadata. |
| `data-pipeline/incremental-load-designer.json` | data-pipeline-incremental-load-designer | Designs incremental data load strategies using watermarks, CDC, or partition-based approaches. |
| `data-pipeline/data-retention-policy-builder.json` | data-pipeline-data-retention-policy-builder | Generates data retention policies with tiering rules, deletion schedules, and compliance documentation. |

---

## Category: performance (10 agents)

| File | ID | Description |
|------|----|-------------|
| `performance/load-test-analyzer.json` | performance-load-test-analyzer | Analyzes load test results to identify performance degradation, percentile violations, and bottlenecks. |
| `performance/bottleneck-identifier.json` | performance-bottleneck-identifier | Identifies system bottlenecks by analyzing metrics across CPU, memory, I/O, and network layers. |
| `performance/memory-leak-detector.json` | performance-memory-leak-detector | Analyzes heap dumps and memory growth patterns to identify memory leak sources in applications. |
| `performance/cpu-profiler-advisor.json` | performance-cpu-profiler-advisor | Interprets CPU flame graphs and profiler output to identify hot paths and optimization opportunities. |
| `performance/database-query-profiler.json` | performance-database-query-profiler | Analyzes slow query logs and EXPLAIN plans to identify missing indexes and query inefficiencies. |
| `performance/cache-hit-analyzer.json` | performance-cache-hit-analyzer | Analyzes cache hit rates and eviction patterns to optimize caching strategy and TTL configuration. |
| `performance/network-latency-analyzer.json` | performance-network-latency-analyzer | Analyzes network latency, packet loss, and TCP retransmissions to diagnose connectivity performance issues. |
| `performance/frontend-scorer.json` | performance-frontend-performance-scorer | Scores frontend performance using Core Web Vitals and generates a prioritized optimization plan. |
| `performance/api-response-time-optimizer.json` | performance-api-response-time-optimizer | Analyzes API endpoint latency and generates optimization recommendations for response time reduction. |
| `performance/resource-usage-right-sizer.json` | performance-resource-usage-right-sizer | Analyzes resource utilization metrics to recommend right-sized compute configurations and eliminate waste. |

---

## Template Conventions Applied

- All templates use `modelHint: anthropic/claude-haiku-4-5-20251001` (fast, structured output tasks)
- All templates have `atomic: true` and `maturity: tool-capable`
- `tools` set to `["Read", "Write"]` for all templates
- `systemPrompt` follows the pattern: Role → Task → Input → Output → Rules
- IDs follow `{category}-{filename-stem}` convention
