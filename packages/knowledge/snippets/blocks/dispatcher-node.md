---
id: dispatcher-node
name: Dispatcher Node
type: block
blockType: dispatcher
tags: [canvas, node, core]
---

# Dispatcher Node

## Description
A routing node that classifies incoming tasks and directs them to the appropriate downstream agent. The dispatcher does not process the task itself — it analyzes the task's intent, domain, complexity, or other routing criteria and selects the best-matching downstream node. Dispatchers are typically lightweight, using a cheap model (Haiku-class) since classification is simpler than execution. They are the entry points for router-specialist patterns and can route based on content analysis, keyword matching, priority levels, or load balancing rules.

## Capabilities
- Classifies incoming requests by intent, domain, complexity, or custom criteria
- Routes to one of multiple downstream agent nodes based on classification
- Supports confidence-based routing with fallback paths for ambiguous requests
- Can route to multiple downstream nodes simultaneously (fan-out behavior)
- Lightweight execution — uses minimal tokens for classification decisions
- Configurable routing rules (static mapping, dynamic classification, or hybrid)
- Provides routing metadata to downstream agents (why this route was chosen)

## Limitations
- Does not process the task itself — purely a routing decision maker
- Classification accuracy depends on the clarity of routing criteria and the model's capability
- Cannot learn from routing outcomes (no built-in feedback loop for improving classification)
- Single point of failure — if the dispatcher misroutes, the entire downstream pipeline processes the wrong task
- Limited to routing decisions available at classification time (cannot discover new routes dynamically)
- Does not transform the input — passes it through unchanged to the selected downstream node
