---
id: dual-review
name: Dual Review
type: pattern
category: validation
tags: [review, quality, verification, safety]
minNodes: 3
maxNodes: 4
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 1500
  costMultiplier: 2.5
---

# Dual Review

## Description
A producer agent creates output, then two independent reviewers evaluate it from different perspectives (e.g., correctness and security, or functionality and performance). Both reviewers must approve before the output is accepted. This provides multi-dimensional quality assurance.

## Diagram
```
[Input] --> [Producer] --> [Reviewer A] --both pass--> [Output]
                       --> [Reviewer B] /
```

## When to Use
- Output must meet multiple quality dimensions simultaneously
- Different review perspectives require different expertise
- A single reviewer cannot cover all relevant concerns
- High-stakes output where multiple sign-offs are required

## Anti-Patterns
- Do not use when one review dimension is clearly sufficient
- Avoid if reviewers overlap significantly in what they check
- Not suitable when the reviews cannot be done independently
- Do not use for low-stakes output where one review suffices

## Node Templates

### Producer
- **Role**: Creates the initial output that must pass dual review.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Glob, Grep]
- **Prompt Template**: Produce high-quality output for the given task. Your output will undergo dual review for both correctness and security. Aim for excellence on both dimensions.

### Reviewer A
- **Role**: Reviews for correctness, completeness, and functionality.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: Review the following output for correctness and completeness. Check that it meets all functional requirements. Respond with PASS or FAIL with specific issues.

### Reviewer B
- **Role**: Reviews for security, performance, and best practices.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: Review the following output for security vulnerabilities, performance issues, and adherence to best practices. Respond with PASS or FAIL with specific issues.

## Edge Flow
Input -> Producer (direct)
Producer -> Reviewer A (parallel review)
Producer -> Reviewer B (parallel review)
Both PASS -> Output (accepted)
Any FAIL -> Producer (revision with feedback)
