---
id: model-routing
name: Model Routing
type: principle
tags: [cost, routing]
---

# Model Routing

## Description
Use the cheapest model that can handle the task. Not every agent needs Claude Opus or GPT-4. Simple classification, formatting, data extraction, and routing tasks can be handled by smaller, faster, cheaper models (Haiku, GPT-4o-mini). Reserve premium models for tasks that genuinely require deep reasoning, complex analysis, or creative problem solving. Model routing is both a cost optimization and a latency optimization — smaller models are not just cheaper but also faster.

## Rationale
The cost difference between model tiers is dramatic: Haiku is roughly 25x cheaper than Opus per token. In a workflow with 10 agents, using Opus for all of them costs 25x what it would cost using Haiku for the 8 simple tasks and Opus for the 2 complex ones. Beyond cost, smaller models often perform better on simple tasks because they are less likely to overthink or add unnecessary complexity. The principle also future-proofs your workflows: as cheaper models improve, tasks naturally cascade to lower tiers. Finally, model routing enables sustainability — lower compute usage means lower energy consumption and environmental impact.

## Examples
- Good: A dispatcher agent that classifies requests uses Haiku (fast, cheap, classification is simple). The specialist it routes to uses Sonnet (capable, good value). A final quality reviewer uses Opus (deep reasoning needed for nuanced evaluation).
- Good: A data extraction pipeline uses Haiku for parsing structured data (reliable for well-defined formats) and Sonnet only for ambiguous fields that require interpretation.
- Bad: Using Opus for every agent in a 10-step pipeline "just to be safe." The total cost is 25x higher than necessary and latency is significantly worse.
