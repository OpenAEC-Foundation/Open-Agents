---
id: consensus
name: Consensus
type: pattern
category: validation
tags: [voting, agreement, multi-perspective, reliability]
minNodes: 3
maxNodes: 7
tokenProfile:
  avgInputPerNode: 2000
  avgOutputPerNode: 1500
  costMultiplier: 3.0
---

# Consensus

## Description
Multiple agents independently analyze the same question or produce solutions for the same task, then a tally agent compares their outputs and determines the consensus answer. This pattern trades cost for reliability: by getting multiple independent opinions, you reduce the probability of any single model's biases, hallucinations, or errors dominating the result. The pattern is inspired by ensemble methods in machine learning — multiple weak learners often outperform a single strong learner. The key requirement is independence: voters must not see each other's answers before voting.

## Diagram
```
               +---> [Voter A] ---+
               |                  |
[Input] -------+---> [Voter B] ---+---> [Tally Agent] --> [Output]
               |                  |
               +---> [Voter C] ---+
```

## When to Use
- Correctness is critical and you want to minimize the chance of error
- The question has a definitive answer that multiple agents should converge on
- You want to detect and filter out hallucinations (an answer agreed on by 3/3 agents is more trustworthy)
- You are comparing models or prompting strategies and want to see where they agree or disagree
- The cost of an incorrect answer exceeds the cost of running multiple agents

## Anti-Patterns
- Do not use for creative or open-ended tasks where there is no single "correct" answer
- Avoid when all voters use the same model and prompt (they will have correlated errors, reducing ensemble benefit)
- Not suitable when the task is so simple that consensus adds no value
- Do not use when voters would all make the same systematic error (e.g., all lack domain knowledge)
- Avoid when the tally criteria are subjective and cannot be consistently applied

## Node Templates

### Voter A
- **Role**: Independently analyzes the question and produces an answer. Has no knowledge of other voters' existence or answers. Should include reasoning and confidence level alongside the answer to help the tally agent adjudicate disagreements.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, Glob, WebSearch]
- **Prompt Template**: You are an independent analyst. Answer the following question based on your analysis. Provide: (1) your answer in a clearly marked section, (2) your reasoning step by step, (3) your confidence level (high/medium/low) with justification. Do not hedge — commit to a specific answer. Your response will be compared with other independent analyses.

### Voter B
- **Role**: Same as Voter A but ideally uses a different model or prompting approach to ensure diversity of perspective. Independence from other voters is essential.
- **Model**: openai/o3
- **Tools**: [Read, Grep, Glob, WebSearch]
- **Prompt Template**: You are an independent analyst. Answer the following question based on your analysis. Provide: (1) your answer in a clearly marked section, (2) your reasoning step by step, (3) your confidence level (high/medium/low) with justification. Do not hedge — commit to a specific answer. Your response will be compared with other independent analyses.

### Voter C
- **Role**: Third independent perspective. Diversity in model or approach maximizes the ensemble benefit.
- **Model**: mistral/mistral-large
- **Tools**: [Read, Grep, Glob, WebSearch]
- **Prompt Template**: You are an independent analyst. Answer the following question based on your analysis. Provide: (1) your answer in a clearly marked section, (2) your reasoning step by step, (3) your confidence level (high/medium/low) with justification. Do not hedge — commit to a specific answer. Your response will be compared with other independent analyses.

### Tally Agent
- **Role**: Collects all voter responses and determines the consensus. If all voters agree, the consensus is straightforward. If there is disagreement, the tally agent analyzes the reasoning of each voter, considers confidence levels, and determines the most likely correct answer. Reports the consensus answer along with the level of agreement and any notable dissent.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read]
- **Prompt Template**: You are a consensus tally agent. You will receive independent analyses from N voters. Determine the consensus: (1) identify where voters agree and disagree, (2) for agreements, report the consensus answer, (3) for disagreements, analyze each voter's reasoning quality and confidence to determine the most likely correct answer, (4) report: {"consensus_answer": "...", "agreement_level": "unanimous|majority|split", "voter_count": N, "agreeing": N, "dissenting": N, "dissent_summary": "...", "confidence": "high|medium|low"}.

## Edge Flow
User Input -> Voter A (parallel, independent)
User Input -> Voter B (parallel, independent)
User Input -> Voter C (parallel, independent)
Voter A -> Tally Agent (join)
Voter B -> Tally Agent (join)
Voter C -> Tally Agent (join)
Tally Agent -> Output (consensus result)
