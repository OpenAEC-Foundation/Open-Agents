---
id: debate
name: Debate
type: pattern
category: validation
tags: [adversarial, argumentation, critical-thinking, decision-making]
minNodes: 3
maxNodes: 3
tokenProfile:
  avgInputPerNode: 3000
  avgOutputPerNode: 2500
  costMultiplier: 3.0
---

# Debate

## Description
Two agents argue opposing sides of a question while a judge agent evaluates their arguments and renders a final decision. The proponent argues for a position, the opponent argues against it, and the judge weighs both arguments to reach a well-reasoned conclusion. This pattern leverages adversarial reasoning to surface strengths and weaknesses that a single agent might miss. The debate can optionally include multiple rounds where each debater responds to the other's arguments. The judge benefits from seeing the best case for each side before deciding, leading to more nuanced and well-considered conclusions.

## Diagram
```
[Input/Question]
       |
       v
  +---------+
  |         |
  v         v
[Pro]     [Con]
  |         |
  +----+----+
       |
       v
    [Judge]
       |
       v
   [Decision]
```

## When to Use
- The question involves trade-offs where the best answer depends on weighing competing considerations
- You want to stress-test a proposed solution by having it attacked
- The decision has significant consequences and you want to ensure all perspectives are considered
- The topic is genuinely debatable (reasonable people could disagree)
- You want to surface hidden assumptions, risks, or counter-arguments

## Anti-Patterns
- Do not use for factual questions with clear, unambiguous answers (use consensus instead)
- Avoid when the debate positions are artificial and one side has no genuine argument
- Not suitable when the judge cannot meaningfully evaluate technical arguments (domain mismatch)
- Do not use for tasks that require collaborative construction rather than adversarial analysis
- Avoid when multiple rounds of debate add no new arguments (one round may suffice)

## Node Templates

### Proponent (Pro)
- **Role**: Argues the strongest possible case FOR the given position or proposal. Presents evidence, reasoning, examples, and benefits. Anticipates counter-arguments and addresses them preemptively. Must argue in good faith — presenting the genuinely best case, not a straw man version of support. In multi-round debates, responds directly to the opponent's specific arguments.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, WebSearch, WebFetch]
- **Prompt Template**: You are a debate proponent. Argue the strongest possible case FOR the following position: [position]. Structure your argument: (1) thesis statement, (2) main arguments with evidence and reasoning (at least 3), (3) preemptive responses to likely counter-arguments, (4) conclusion. Be persuasive but honest — do not make claims you cannot support. If you genuinely believe the position is weak, still present the best possible case for it. In round 2+, directly address the opponent's specific arguments.

### Opponent (Con)
- **Role**: Argues the strongest possible case AGAINST the given position or proposal. Identifies weaknesses, risks, unintended consequences, and alternative approaches. Challenges the proponent's assumptions and evidence. Must argue in good faith — presenting genuine concerns, not manufactured objections. In multi-round debates, responds directly to the proponent's specific arguments.
- **Model**: anthropic/claude-sonnet-4-6
- **Tools**: [Read, Grep, WebSearch, WebFetch]
- **Prompt Template**: You are a debate opponent. Argue the strongest possible case AGAINST the following position: [position]. Structure your argument: (1) counter-thesis, (2) main objections with evidence and reasoning (at least 3), (3) risks and unintended consequences the proponent likely overlooks, (4) alternative approaches that might be better, (5) conclusion. Be rigorous but fair — attack the strongest version of the argument, not a straw man. In round 2+, directly address the proponent's specific claims.

### Judge
- **Role**: Evaluates both sides' arguments and renders a reasoned decision. Does not simply count arguments but weighs their quality, evidence strength, and relevance. Identifies which arguments from each side are most compelling and which are weak. The decision must be well-reasoned and acknowledge the merits of both sides even if one clearly prevails.
- **Model**: anthropic/claude-opus-4-6
- **Tools**: [Read]
- **Prompt Template**: You are an impartial judge. You will receive arguments from a proponent and an opponent on the same question. Evaluate them: (1) summarize each side's strongest arguments, (2) identify the weakest arguments from each side, (3) assess the quality of evidence and reasoning on both sides, (4) render your decision with detailed justification, (5) note any important considerations that neither side raised. Format: {"decision": "pro|con|nuanced", "confidence": "high|medium|low", "key_factors": [...], "ruling": "detailed explanation"}.

## Edge Flow
User Input -> Proponent (parallel with Opponent)
User Input -> Opponent (parallel with Proponent)
Proponent -> Judge (join, presents pro arguments)
Opponent -> Judge (join, presents con arguments)
Judge -> Output (renders decision)
Optional Round 2: Proponent responds to Opponent's arguments, Opponent responds to Proponent's, Judge re-evaluates
