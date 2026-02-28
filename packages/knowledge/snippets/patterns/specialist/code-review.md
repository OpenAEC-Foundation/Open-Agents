---
id: code-review
name: Code Review Pipeline
type: pattern
category: specialist
tags: [code, review, quality, development]
minNodes: 2
maxNodes: 4
tokenProfile:
  avgInputPerNode: 3000
  avgOutputPerNode: 2000
  costMultiplier: 2.0
---

# Code Review Pipeline

## Description
A specialized pipeline for code review. A code analyzer agent examines code for issues, then a reviewer agent provides structured feedback with severity ratings and suggestions. Optionally, a fixer agent applies the suggestions automatically. This pattern encodes best practices for code quality into an automated workflow.

## Diagram
```
[Code Input] --> [Analyzer] --> [Reviewer] --> [Fix Suggestions]
                                                     |
                                               (optional)
                                                     v
                                                [Auto-Fixer] --> [Fixed Code]
```

## When to Use
- You need consistent, thorough code review
- Manual review bandwidth is limited
- You want to enforce coding standards automatically
- Code changes need multi-dimensional review (correctness, style, security)

## Anti-Patterns
- Do not use as a replacement for human review on critical systems
- Avoid for trivial changes that do not warrant the overhead
- Not suitable when the codebase context exceeds the model's context window
- Do not use when the review criteria are not well-defined

## Node Templates

### Analyzer
- **Role**: Performs static analysis-style review. Identifies potential bugs, security issues, and style violations.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob, Bash]
- **Prompt Template**: Analyze the following code changes. Identify potential bugs, security vulnerabilities, performance issues, and style violations. Categorize each finding by severity (critical, warning, info).

### Reviewer
- **Role**: Synthesizes analysis into structured, actionable feedback with fix suggestions.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep]
- **Prompt Template**: Review the analysis findings and produce structured feedback. For each issue, provide: severity, location, description, and a specific fix suggestion. Prioritize by severity.

## Edge Flow
Code Input -> Analyzer (direct)
Analyzer -> Reviewer (findings)
Reviewer -> Fix Suggestions (structured feedback)
Reviewer -> Auto-Fixer (optional, with fix instructions)
Auto-Fixer -> Fixed Code (applied fixes)
