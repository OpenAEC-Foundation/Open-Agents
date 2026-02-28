---
id: router-specialists
name: Router-Specialists
type: pattern
category: specialist
tags: [routing, expertise, intent-detection, domain-specific]
minNodes: 3
maxNodes: 8
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 2000
  costMultiplier: 2.0
---

# Router-Specialists

## Description
A dispatcher agent classifies the incoming request by intent or domain and routes it to the appropriate specialist agent. Each specialist is optimized for a specific domain: it has domain-specific tools, system prompts, and potentially a different model suited to its specialization. The dispatcher acts as a switchboard — it does not process the task itself but understands enough to determine which specialist should handle it. This pattern is the agent equivalent of a customer support system where a front-desk agent routes you to the right department. It enables building systems that handle diverse request types without a single agent needing all capabilities.

## Diagram
```
                     [Dispatcher/Router]
                    /        |         \
                   v         v          v
           [Specialist A] [Specialist B] [Specialist C]
           (Code Review)  (Documentation) (Security Audit)
                |            |              |
                v            v              v
             [Output A]   [Output B]     [Output C]
```

## When to Use
- Your system receives diverse request types that require different expertise
- Each domain has specific tools, context, or models that should not be loaded for every request
- You want to add new capabilities by adding specialists without changing existing ones
- Request classification is straightforward (clear intent signals)
- Specialists benefit from deep, focused system prompts rather than broad general ones

## Anti-Patterns
- Do not use when most requests require multiple specialists to collaborate (use a chain or diamond instead)
- Avoid when the dispatcher cannot reliably classify requests (misrouting is worse than using a generalist)
- Not suitable when there are only 1-2 specialists (overhead of routing exceeds benefit)
- Do not use when all specialists use the same model, tools, and prompt (no specialization benefit)
- Avoid when requests frequently fall between specialist boundaries (ambiguous routing)

## Node Templates

### Dispatcher/Router
- **Role**: Classifies the incoming request by analyzing its intent, domain, and required capabilities. Maps the request to one of the available specialists. Uses a lightweight model since classification is simpler than execution. Includes a fallback path for requests that do not match any specialist. Does NOT process the request itself.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read]
- **Prompt Template**: You are a request router. Classify the incoming request into one of these categories: {specialist_categories}. Analyze: (1) the primary intent of the request, (2) the domain knowledge required, (3) the tools needed. Output: {"category": "...", "confidence": 0.X, "reasoning": "...", "fallback": "general"}. If confidence is below 0.6, route to the "general" fallback specialist. Do not attempt to process the request yourself — only classify and route.

### Specialist A: Code Review
- **Role**: Handles code review requests. Has deep knowledge of code quality, best practices, security patterns, and performance optimization. Uses code-focused tools and a detailed system prompt about code review methodology.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob, Bash]
- **Prompt Template**: You are a senior code reviewer. Analyze the provided code for: (1) correctness — logic errors, edge cases, off-by-one errors, (2) security — injection vulnerabilities, authentication issues, data exposure, (3) performance — algorithmic complexity, unnecessary allocations, N+1 queries, (4) maintainability — naming, structure, documentation, SOLID principles. Provide actionable feedback with specific line references and suggested improvements.

### Specialist B: Documentation
- **Role**: Handles documentation requests. Specializes in technical writing, API documentation, user guides, and inline code comments. Uses web research tools for reference material and writing-focused prompts.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, WebSearch, WebFetch]
- **Prompt Template**: You are a technical writing specialist. Produce documentation that is: (1) accurate — technically correct and up-to-date, (2) clear — understandable by the target audience, (3) complete — covers all aspects the reader needs, (4) well-structured — logical organization with proper headings, examples, and cross-references. Match the existing documentation style if available. Include code examples where appropriate.

### Specialist C: Security Audit
- **Role**: Handles security-focused requests. Specializes in vulnerability assessment, threat modeling, security best practices, and compliance checking. Uses security-oriented tools and detailed security analysis prompts.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob, Bash, WebSearch]
- **Prompt Template**: You are a security auditor. Analyze the provided system/code for: (1) known vulnerability patterns (OWASP Top 10, CWE), (2) authentication and authorization weaknesses, (3) data handling issues (exposure, encryption, PII), (4) dependency vulnerabilities, (5) configuration security. Rate each finding by severity (critical/high/medium/low) and provide specific remediation steps. Include references to relevant security standards.

### General Fallback
- **Role**: Handles requests that do not clearly match any specialist. Uses a capable general-purpose model with broad tools. Acts as a safety net to ensure no request goes unhandled, even if it does not receive specialist-level treatment.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob, WebSearch]
- **Prompt Template**: You are a general-purpose agent handling a request that did not match any specialist category. Apply your broad knowledge to complete the task as thoroughly as possible. If you identify that the task would benefit from a specific specialist, note this in your output for future routing improvement.

## Edge Flow
User Input -> Dispatcher (sequential, classifies intent)
Dispatcher -> Specialist A (if category=code-review)
Dispatcher -> Specialist B (if category=documentation)
Dispatcher -> Specialist C (if category=security)
Dispatcher -> General Fallback (if confidence < 0.6 or no match)
Specialist -> Output (each specialist produces independent result)
