---
id: test-driven
name: Test-Driven Pattern
type: pattern
category: validation
tags: [testing, validation, tdd, automated]
minNodes: 2
maxNodes: 4
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 2000
  costMultiplier: 3.0
---

# Test-Driven Pattern

## Description
A test-writer agent creates test cases first, then a producer agent writes code to pass those tests. A validator agent runs the tests and reports results. If tests fail, the producer revises. This enforces test-driven development with automated validation at each iteration.

## Diagram
```
[Input] --> [Test Writer] --> [Producer] --> [Validator] --pass--> [Output]
                                  ^              |
                                  +----fail------+
```

## When to Use
- The task produces code that can be automatically tested
- You want to enforce correctness through automated validation
- Test cases can be defined before implementation
- You need provable correctness, not just review-based quality

## Anti-Patterns
- Do not use for non-code tasks where automated testing is impossible
- Avoid if writing good tests is harder than writing the code itself
- Not suitable when the acceptance criteria are too vague for test cases
- Do not use when the test suite execution time is prohibitively long

## Node Templates

### Test Writer
- **Role**: Creates comprehensive test cases from the requirements before any code is written.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Grep]
- **Prompt Template**: Write comprehensive test cases for the following requirements. Cover happy paths, edge cases, and error conditions. Tests must be executable and self-contained.

### Producer
- **Role**: Writes code to pass all test cases. Revises based on test failures.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash]
- **Prompt Template**: Write code to pass all the provided test cases. If you receive test failure reports, fix the specific failures. Do not modify the tests.

### Validator
- **Role**: Runs the test suite and reports results. Determines pass/fail.
- **Model**: anthropic/claude-haiku-4-5
- **Tools**: [Read, Bash]
- **Prompt Template**: Run the test suite and report results. List passing and failing tests. For failures, include the error message and expected vs actual values.

## Edge Flow
Input -> Test Writer (direct)
Test Writer -> Producer (test cases as spec)
Producer -> Validator (code for testing)
Validator -> Output (if all pass)
Validator -> Producer (if failures, with report)
