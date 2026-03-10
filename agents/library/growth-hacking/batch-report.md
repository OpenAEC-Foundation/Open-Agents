# Growth-Hacking Agent Library Batch Report

**Generation Date:** 2026-03-10
**Category:** growth-hacking
**Status:** ✅ Complete

---

## Summary

Successfully created **10 atomic agent templates** for growth-hacking category. All agents follow the standardized template format with consistent configuration and domain expertise.

---

## Generated Agents

| # | Agent ID | Name | Purpose |
|---|----------|------|---------|
| 1 | growth-hacking-viral-loop-designer | Viral Loop Designer | Self-amplifying viral growth mechanics |
| 2 | growth-hacking-referral-program-builder | Referral Program Builder | Two-sided referral incentive systems |
| 3 | growth-hacking-onboarding-funnel-optimizer | Onboarding Funnel Optimizer | User activation and time-to-value |
| 4 | growth-hacking-activation-metric-definer | Activation Metric Definer | Leading indicator identification |
| 5 | growth-hacking-pirate-metrics-analyzer | PIRATE Metrics Analyzer | Full-funnel growth analysis |
| 6 | growth-hacking-growth-experiment-planner | Growth Experiment Planner | Rapid hypothesis testing methodology |
| 7 | growth-hacking-north-star-metric-advisor | North Star Metric Advisor | Primary success metric alignment |
| 8 | growth-hacking-cohort-retention-improver | Cohort Retention Improver | User retention and churn reduction |
| 9 | growth-hacking-product-led-growth-advisor | Product-Led Growth Advisor | Product-driven growth strategy |
| 10 | growth-hacking-distribution-channel-analyzer | Distribution Channel Analyzer | Acquisition channel optimization |

---

## Configuration Details

### Standard Fields (All Agents)
- **category:** growth-hacking
- **modelHint:** anthropic/claude-haiku-4-5-20251001
- **tools:** ["Read", "Write"]
- **atomic:** true
- **maturity:** tool-capable

### Coverage

**Growth Funnel Stages:**
- ✅ **Acquisition:** Distribution Channel Analyzer
- ✅ **Activation:** Onboarding Funnel Optimizer, Activation Metric Definer
- ✅ **Retention:** Cohort Retention Improver
- ✅ **Revenue:** Product-Led Growth Advisor
- ✅ **Referral:** Viral Loop Designer, Referral Program Builder

**Cross-Functional Coverage:**
- ✅ **Analytics:** PIRATE Metrics Analyzer, Activation Metric Definer, North Star Metric Advisor
- ✅ **Product:** Onboarding Funnel Optimizer, Product-Led Growth Advisor
- ✅ **Growth Ops:** Growth Experiment Planner
- ✅ **Marketing:** Referral Program Builder, Distribution Channel Analyzer, Viral Loop Designer

---

## File Output

```
/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/growth-hacking/
├── viral-loop-designer.json
├── referral-program-builder.json
├── onboarding-funnel-optimizer.json
├── activation-metric-definer.json
├── pirate-metrics-analyzer.json
├── growth-experiment-planner.json
├── north-star-metric-advisor.json
├── cohort-retention-improver.json
├── product-led-growth-advisor.json
├── distribution-channel-analyzer.json
└── batch-report.md
```

---

## Quality Assurance

- ✅ All JSON files contain valid formatting with double quotes
- ✅ All agents have unique IDs following naming convention
- ✅ System prompts are domain-specific and actionable
- ✅ Each agent focuses on atomic, single-concern responsibility
- ✅ Tags provide semantic discovery and categorization
- ✅ Model hint supports lightweight (haiku) execution for parallel operations

---

## Next Steps for Integration

1. **Discovery:** Agents are now discoverable via `oa agents --category growth-hacking`
2. **Activation:** Use agents via `oa run "task" --agent growth-hacking-{agent-name}`
3. **Composition:** Combine agents in pipelines for end-to-end growth strategy
4. **Extension:** Add more agents or refine existing system prompts based on usage patterns

---

## Agent Relationships

```
┌─────────────────────────────────────┐
│  North Star Metric Advisor (align)  │
└────────────────┬────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    v            v            v
Activation    Retention     Revenue
 Metrics      Improver       Growth
  │           │              │
  ├──> Onboarding Funnel Optimizer
  │
  └──> PIRATE Metrics Analyzer
        │
        ├──> Viral Loop Designer
        ├──> Referral Program Builder
        ├──> Distribution Channel Analyzer
        └──> Product-Led Growth Advisor

Growth Experiment Planner: Tests all of the above
```

---

## Metadata

- **Total Agents:** 10
- **Category:** growth-hacking
- **Atomic:** Yes (each agent has single primary responsibility)
- **Tool Set:** Read, Write (common tools)
- **Model Tier:** Haiku (fast, cost-effective)
- **Batch Generation:** Successful
