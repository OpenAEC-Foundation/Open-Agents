---
id: pipeline-gate
name: Pipeline Gate
type: pattern
category: validation
tags: [quality, gate, approval, sequential, checkpoint]
minNodes: 3
maxNodes: 6
tokenProfile:
  avgInputPerNode: 2500
  avgOutputPerNode: 2000
  costMultiplier: 2.5
---

# Pipeline Gate

## Description
A sequential pipeline where quality gates are inserted between processing stages. Each gate evaluates the output of the preceding stage against defined criteria before allowing it to proceed to the next stage. If the output fails the gate, it can be sent back for revision, escalated, or the pipeline can be halted entirely. This pattern enforces quality standards at every transition point rather than only checking quality at the end. It is the agent equivalent of a CI/CD pipeline with stage gates: build -> test -> review -> deploy, where each transition requires passing checks.

## Diagram
```
[Input] --> [Stage 1] --> [Gate 1] --pass--> [Stage 2] --> [Gate 2] --pass--> [Stage 3] --> [Output]
                             |                                 |
                          fail|                             fail|
                             v                                 v
                        [Revise/Halt]                     [Revise/Halt]
```

## When to Use
- The task has multiple stages with distinct quality requirements at each transition
- Errors caught early are much cheaper to fix than errors caught late
- You need an audit trail of quality checks for compliance or review purposes
- Each stage builds on the previous one, and a bad foundation corrupts everything downstream
- You want to fail fast rather than wasting tokens on downstream stages if an early stage fails

## Anti-Patterns
- Do not use when quality cannot be meaningfully assessed at intermediate stages
- Avoid excessive gates that add latency without catching real issues
- Not suitable when revision at a gate requires re-running all previous stages (cost explosion)
- Do not use when gates are so strict that nothing ever passes (calibrate thresholds)
- Avoid when a single final review would be equally effective

## Node Templates

### Stage 1: Initial Processing
- **Role**: First processing stage. Receives the raw input and produces an intermediate result. The output must conform to a defined schema or format that the gate can evaluate.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are the first processing stage. Produce your output according to the following specification: [task-specific]. Your output will be evaluated by a quality gate before proceeding. Ensure your output is complete, well-structured, and includes any metadata required for quality assessment.

### Gate 1: Quality Checkpoint
- **Role**: Evaluates Stage 1's output against defined criteria. Produces a pass/fail verdict with detailed reasoning. On failure, provides specific feedback for revision. On pass, forwards the output unchanged to the next stage. Gates should be lightweight — they evaluate, they do not produce new content.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: You are a quality gate. Evaluate the incoming output against these criteria: (1) completeness — are all required sections present? (2) correctness — are there factual or logical errors? (3) format compliance — does the output match the expected structure? (4) consistency — are there internal contradictions? Verdict format: {"gate": "gate-1", "verdict": "pass|fail", "criteria": [{"name": "...", "status": "pass|fail", "detail": "..."}], "action": "proceed|revise|halt"}. Only fail on genuine issues, not style preferences.

### Stage 2: Secondary Processing
- **Role**: Receives gate-approved output from Stage 1 and performs the next processing step. Can assume the input meets the quality criteria enforced by Gate 1. Builds on the previous stage's output.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Write, Edit, Bash, Grep, Glob]
- **Prompt Template**: You are the second processing stage. You will receive output that has passed quality gate 1. Build on this foundation to produce the next deliverable: [task-specific]. Your output will also be evaluated by a quality gate before final delivery.

### Gate 2: Final Quality Checkpoint
- **Role**: Final quality gate before output delivery. Applies the most stringent criteria including overall coherence, end-to-end correctness, and production readiness. This is the last line of defense before the user receives the result.
- **Model**: anthropic/claude-haiku-3-5
- **Tools**: [Read, Bash, Grep]
- **Prompt Template**: You are the final quality gate. This is the last check before delivery to the user. Evaluate against: (1) all criteria from previous gates (regression check), (2) end-to-end coherence, (3) production readiness — would you be comfortable delivering this to a stakeholder? (4) completeness against the original requirements. Same verdict format as previous gates.

## Edge Flow
User Input -> Stage 1 (sequential)
Stage 1 -> Gate 1 (sequential, passes output for evaluation)
Gate 1 -> Stage 2 (if pass, forwards approved output)
Gate 1 -> Stage 1 (if fail with action=revise, sends feedback)
Gate 1 -> Output (if fail with action=halt, returns failure report)
Stage 2 -> Gate 2 (sequential, passes output for final evaluation)
Gate 2 -> Output (if pass, delivers final result)
Gate 2 -> Stage 2 (if fail with action=revise, sends feedback)
