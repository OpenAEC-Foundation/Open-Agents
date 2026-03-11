# Batch 5 Report — Agent Library Builder

**Date:** 2026-03-08
**Total templates created:** 30

## Categories

### `database` (10 agents)
| File | ID | Description |
|------|----|-------------|
| schema-designer.json | database-schema-designer | Designs relational or NoSQL database schemas |
| query-optimizer.json | database-query-optimizer | Analyzes and rewrites SQL queries for performance |
| migration-generator.json | database-migration-generator | Generates up/down migration scripts |
| index-advisor.json | database-index-advisor | Recommends optimal database indexes |
| stored-procedure-writer.json | database-stored-procedure-writer | Writes parameterized stored procedures |
| backup-strategy-planner.json | database-backup-strategy-planner | Creates backup and recovery strategies |
| connection-pool-configurator.json | database-connection-pool-configurator | Calculates optimal connection pool settings |
| orm-model-generator.json | database-orm-model-generator | Generates ORM model definitions from SQL schema |
| seed-data-generator.json | database-seed-data-generator | Generates realistic seed data for testing |
| slow-query-analyzer.json | database-slow-query-analyzer | Analyzes slow query logs and EXPLAIN output |

### `infrastructure` (10 agents)
| File | ID | Description |
|------|----|-------------|
| load-balancer-configurator.json | infrastructure-load-balancer-configurator | Generates load balancer configuration |
| cdn-setup-advisor.json | infrastructure-cdn-setup-advisor | Designs CDN configuration strategies |
| firewall-rule-writer.json | infrastructure-firewall-rule-writer | Generates firewall rules from security policies |
| dns-configurator.json | infrastructure-dns-configurator | Generates DNS zone files and records |
| ssl-setup-guide.json | infrastructure-ssl-setup-guide | Generates SSL/TLS setup instructions |
| reverse-proxy-configurator.json | infrastructure-reverse-proxy-configurator | Configures Nginx/Caddy as reverse proxy |
| server-hardening-advisor.json | infrastructure-server-hardening-advisor | Generates server hardening scripts |
| network-topology-designer.json | infrastructure-network-topology-designer | Designs cloud VPC/network topology |
| service-mesh-configurator.json | infrastructure-service-mesh-configurator | Generates Istio/Linkerd service mesh config |
| ingress-controller-writer.json | infrastructure-ingress-controller-writer | Writes Kubernetes Ingress/Gateway API manifests |

### `monitoring` (10 agents)
| File | ID | Description |
|------|----|-------------|
| metrics-dashboard-designer.json | monitoring-metrics-dashboard-designer | Designs Grafana dashboards for Prometheus metrics |
| alert-rule-writer.json | monitoring-alert-rule-writer | Writes Prometheus alerting rules |
| log-query-builder.json | monitoring-log-query-builder | Builds LogQL/Splunk/Elasticsearch queries |
| slo-calculator.json | monitoring-slo-calculator | Calculates SLO error budgets and burn rates |
| incident-timeline-builder.json | monitoring-incident-timeline-builder | Builds structured incident timelines for postmortems |
| uptime-monitor-configurator.json | monitoring-uptime-monitor-configurator | Generates uptime monitoring configuration |
| trace-analyzer.json | monitoring-trace-analyzer | Analyzes distributed traces for bottlenecks |
| error-budget-tracker.json | monitoring-error-budget-tracker | Tracks error budget consumption over time |
| anomaly-detector-setup.json | monitoring-anomaly-detector-setup | Configures anomaly detection for metrics |
| on-call-schedule-planner.json | monitoring-on-call-schedule-planner | Designs on-call rotation schedules |

## Notes
- All templates use `maturity: "tool-capable"` and `modelHint: "anthropic/claude-haiku-4-5-20251001"`
- All templates include `"tools": ["Read", "Write"]`
- System prompts follow the pattern: Role → Task → Input → Output → Quality rules
