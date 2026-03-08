# Skill Performance Testing Framework for Open-Agents

> Research date: 2026-03-08
> Author: research-perf-testing agent
> Sources: Anthropic docs, IFEval, promptfoo, DeepEval, Traceloop, Confident AI

---

## Overview

This framework defines how to measure, validate, and iterate on Claude Code skills in the Open-Agents skill library. It covers metrics, test case design, a concrete validation protocol, automation via oa agents, and an iteration process.

---

## A. What Does "Good Performance" Mean for a Skill?

### A.1 Metrics by Skill Type

#### Reference Skills (background knowledge, coding conventions)

Reference skills load passively and inform Claude's behavior throughout a session.

| Metric | Definition | Target |
|--------|-----------|--------|
| **Coverage** | % of stated conventions that appear in Claude's output | ≥ 80% |
| **Precision** | % of Claude's stated behaviors that match the skill's conventions | ≥ 90% |
| **Groundedness** | % of claims in Claude's output that are traceable to the skill | ≥ 85% |
| **False application rate** | How often Claude applies the skill when it's not relevant | < 5% |

Measure by: LLM-as-a-judge with rubric. Feed skill content + Claude's output to an evaluator LLM. Ask: "Does this output follow the conventions in the skill? Score 0 (no), 1 (partial), 2 (yes)."

#### Task Skills (step-by-step workflows)

Task skills provide procedural instructions for specific actions.

| Metric | Definition | Target |
|--------|-----------|--------|
| **Step completion rate** | % of numbered steps executed in correct order | 100% |
| **Error rate** | % of runs where Claude skips or reorders a step | < 2% |
| **ALWAYS/NEVER adherence** | % of explicit rules that are followed | 100% |
| **Argument handling** | $ARGUMENTS / $N placeholders are correctly substituted | 100% |

Measure by: Verifiable instruction checking (IFEval style). For each step, define a binary checker: "Was this step executed? (yes/no)". For ALWAYS/NEVER rules, automate the check where possible (e.g., flag presence checker, regex match).

#### Orchestration Skills (agent spawning, oa run)

Orchestration skills govern how Claude uses oa-cli to spawn and manage agents.

| Metric | Definition | Target |
|--------|-----------|--------|
| **Flag correctness rate** | % of oa run calls with `--direct` AND `--model` | 100% |
| **Flat-spawn adherence** | 0 nested spawns (agents never spawn from inside agents) | 100% |
| **5-element prompt rate** | % of agent prompts with all 5 required elements | 100% |
| **Model tier match** | Correct model (haiku/sonnet/opus) chosen for task type | ≥ 90% |
| **Trigger precision** | % of skill activations that are appropriate | ≥ 95% |
| **Trigger recall** | % of relevant oa run scenarios where skill triggers | ≥ 90% |

Measure by: Verifiable rule checkers for flag presence; LLM-as-a-judge for model tier and prompt structure.

### A.2 How to Know if Claude Applies a Skill Correctly

Use a 3-layer measurement approach:

1. **Structural check** (automated): Does the output contain required elements? (flags, steps, keywords)
2. **Semantic check** (LLM judge): Does the output's intent match the skill's intent?
3. **Behavioral check** (human review): In production use, does the skill achieve its goal?

For each skill, define a **skill scorecard** with 3-5 verifiable checks and 1-2 semantic checks.

---

## B. Test Cases Per Skill Type

### B.1 Reference Skills

**Positive test** (skill should trigger AND apply correctly):
- Input: A task directly in the skill's domain (e.g., "write an API endpoint" for api-conventions skill)
- Expected: Output follows all conventions listed in the skill
- Pass criterion: Coverage ≥ 80%, Precision ≥ 90%

**Negative test** (skill should NOT interfere):
- Input: A task completely outside the skill's domain (e.g., a math problem for api-conventions skill)
- Expected: Output does not mention or apply the skill's conventions inappropriately
- Pass criterion: False application rate = 0%

**Edge case** (skill partially relevant):
- Input: A task tangentially related (e.g., "design a data pipeline" for api-conventions skill)
- Expected: Claude applies relevant conventions, skips irrelevant ones
- Pass criterion: No incorrect convention application; relevant ones appear if applicable

### B.2 Task Skills

**Positive test**:
- Input: Direct user invocation `/skill-name` with valid arguments
- Expected: All steps executed in order, ALWAYS rules obeyed, NEVER rules not violated
- Pass criterion: Step completion rate = 100%, ALWAYS/NEVER adherence = 100%

**Negative test**:
- Input: A query that sounds similar but is not the skill's domain
- Expected: Skill does NOT auto-invoke (if `disable-model-invocation: false`)
- Pass criterion: Trigger precision check — no false positive

**Edge case**:
- Input: Valid invocation but with missing or malformed $ARGUMENTS
- Expected: Claude either asks for clarification or gracefully handles the missing arg
- Pass criterion: No silent failure; no crash; no hallucinated argument substitution

### B.3 Orchestration Skills

**Positive test**:
- Input: "Spawn two parallel agents to research X and Y"
- Expected: Two `oa run` commands, both with `--direct`, explicit `--model`, valid 5-element prompts
- Pass criterion: All flags present (100%); flat spawn (no nested calls)

**Negative test**:
- Input: A coding task with no multi-agent requirement (e.g., "fix this typo in line 3")
- Expected: Skill does NOT trigger; no oa run commands generated
- Pass criterion: Trigger precision check — no false positive

**Edge case**:
- Input: "Run an agent" (vague, no model/task specified)
- Expected: Claude asks for clarification OR applies sensible defaults (sonnet, --direct)
- Pass criterion: `--direct` present; `--model` present; no forbidden defaults

---

## C. Concrete Validation Protocol for Open-Agents

### Step 1: Validate the Description (Trigger Condition)

```
For the skill under test:
1. Extract the `description` field from SKILL.md frontmatter.
2. Create 10 positive prompts: natural-language inputs that clearly match the description.
3. Create 10 negative prompts: inputs from other domains.
4. Create 5 edge-case prompts: inputs that are adjacent but not clearly in-scope.
5. For each prompt, check: does Claude load and apply the skill? (yes/no)
6. Calculate: Trigger Precision = TP / (TP + FP); Trigger Recall = TP / (TP + FN)
7. Target: Precision ≥ 95%, Recall ≥ 90%, F1 ≥ 0.92
8. If below target: rewrite the description to be more specific (lower FP) or broader (lower FN).
```

### Step 2: Validate ALWAYS/NEVER Rules

```
For each ALWAYS/NEVER rule in the skill:
1. Write one test input guaranteed to require the rule.
2. Run the skill. Check the output for the rule's verifiable marker.
3. Binary pass/fail per rule.
4. All ALWAYS rules: must pass 100% of the time.
5. All NEVER rules: must never appear in output.
6. If any rule fails: identify ambiguity in wording; rewrite more precisely.
```

### Step 3: Validate Code Examples

```
For each code block or CLI example in SKILL.md:
1. Extract the example. Run it or have Claude reproduce it.
2. For oa run examples: verify flags (--direct, --model) are present.
3. For code snippets: run linter or syntax checker.
4. Check example matches current skill version (no stale flags, deprecated APIs).
5. Mark example as valid/invalid. Fix invalid examples before publishing.
```

### Step 4: Validate Against False Positives

```
Build a "false positive test set":
1. Collect 20 prompts from unrelated skill domains.
2. Run all prompts; count how many incorrectly trigger this skill.
3. False Positive Rate = FP / (FP + TN)
4. Target: FPR < 5%
5. If FPR ≥ 5%: add NOT conditions or negative examples to the description field.
```

### Step 5: Regression Testing (Skill Updates)

```
Before every skill update:
1. Lock the current golden test set (positive + negative + edge cases).
2. Record baseline scores: Precision, Recall, Step Completion, ALWAYS/NEVER rate.
3. Apply the update.
4. Rerun the golden test set.
5. Compare scores: delta = new_score - baseline_score.
6. Gate: delta >= 0 for all metrics AND no new ALWAYS/NEVER failures.
7. If regression detected: revert and analyze what changed.
8. Document the regression root cause in LESSONS.md.
```

---

## D. Automation via oa Agents

### D.1 Can Skill Tests Be Automated?

Yes. The following components can be automated via oa agents:

| Test Step | Automation Approach |
|-----------|-------------------|
| Trigger precision/recall | Skill-tester agent runs labeled prompt set, records TP/FP/TN/FN |
| ALWAYS/NEVER checks | Regex/string checker script per rule |
| Code example validation | Bash script: `shellcheck`, `node --check`, `python -m py_compile` |
| Regression comparison | Skill-tester agent compares against stored baseline JSON |
| LLM-as-a-judge scoring | Evaluator agent with rubric template |

### D.2 Skill-Tester Agent Template

Save this template to `agents/library/skill-tester.json`:

```json
{
  "id": "skill-tester",
  "name": "Skill Tester",
  "description": "Automated tester for Claude Code skills. Given a skill directory, runs a full validation suite: trigger precision/recall, ALWAYS/NEVER rule adherence, code example validity, and regression comparison.",
  "modelHint": "claude/sonnet",
  "systemPrompt": "You are a skill validation agent for the Open-Agents skill library.\n\nYour job:\n1. Read the target SKILL.md file.\n2. Extract: description, ALWAYS/NEVER rules, code examples, skill type (reference/task/orchestration).\n3. Generate and run a validation suite:\n   - 10 positive trigger prompts\n   - 10 negative trigger prompts\n   - 5 edge case prompts\n   - Binary check per ALWAYS/NEVER rule\n   - Syntax check per code example\n4. Simulate Claude behavior by analyzing each prompt against the skill description.\n5. Calculate: Trigger Precision, Trigger Recall, F1, ALWAYS/NEVER pass rate.\n6. Compare against baseline if provided.\n7. Output a structured JSON report.\n\nALWAYS write output to the specified output path.\nALWAYS include a pass/fail verdict per metric.\nNEVER skip ALWAYS/NEVER rule validation.\nNEVER report partial results — run all checks before writing output.",
  "promptTemplate": "You are a SKILL VALIDATOR.\n\n## Input\nSkill directory: {{skill_dir}}\nBaseline file (optional): {{baseline_path}}\n\n## Output\nWrite JSON report to: {{output_path}}\n\n## Scope\n- Read SKILL.md at {{skill_dir}}/SKILL.md\n- Extract skill type, description, all ALWAYS/NEVER rules, all code examples\n- Generate trigger test set: 10 positive, 10 negative, 5 edge cases\n- Evaluate each prompt: would Claude load this skill? (yes/no/maybe)\n- Check each ALWAYS/NEVER rule: is it verifiable? would a compliant output satisfy it?\n- Syntax-check each code block (identify language, apply appropriate checker)\n- If baseline provided at {{baseline_path}}: compare all metrics, flag regressions\n\n## Output Format\n```json\n{\n  \"skill\": \"<name>\",\n  \"type\": \"reference|task|orchestration\",\n  \"test_date\": \"<ISO date>\",\n  \"trigger\": {\n    \"precision\": 0.0,\n    \"recall\": 0.0,\n    \"f1\": 0.0,\n    \"false_positive_rate\": 0.0,\n    \"verdict\": \"pass|fail\"\n  },\n  \"rules\": [\n    {\"rule\": \"<text>\", \"verifiable\": true, \"pass\": true}\n  ],\n  \"code_examples\": [\n    {\"snippet\": \"...\", \"language\": \"bash\", \"valid\": true}\n  ],\n  \"regression\": {\n    \"compared_to\": \"<baseline date or null>\",\n    \"delta_precision\": 0.0,\n    \"delta_recall\": 0.0,\n    \"regressions_detected\": []\n  },\n  \"overall_verdict\": \"pass|fail\",\n  \"action_items\": [\"<specific fix for each failure>\"]\n}\n```\n\n## Rules\n- English output\n- Max 300 lines\n- Be specific: list exact failures with line numbers from SKILL.md\n- ALWAYS include action_items for every failure"
}
```

### D.3 Running the Skill-Tester Agent

```bash
# Test a single skill
oa run "$(cat <<'EOF'
You are a SKILL VALIDATOR.

## Input
Skill directory: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/.claude/skills/oa-orchestration-spawn

## Output
Write JSON report to: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/research/skill-test-reports/oa-orchestration-spawn-report.json

## Scope
- Read SKILL.md
- Extract description, ALWAYS/NEVER rules, code examples
- Generate 10 positive + 10 negative + 5 edge case trigger prompts
- Check all ALWAYS/NEVER rules for verifiability and likely adherence
- Validate all code examples for correct flags (--direct, --model)
- Output structured JSON report with pass/fail verdicts

## Rules
- English
- Include specific action items for every failure
EOF
)" --name skill-tester-spawn --model claude/sonnet --direct

# Collect results
oa collect skill-tester-spawn
```

### D.4 Integration into Release Process

```
1. PRE-MERGE GATE (CI step before merging skill changes):
   a. Detect which SKILL.md files changed (git diff --name-only).
   b. For each changed skill, spawn one skill-tester agent.
   c. Wait for all agents to complete (oa status polling).
   d. Collect all JSON reports.
   e. If any report shows overall_verdict = "fail": block merge.
   f. If regression detected (delta < 0): block merge, post report to PR.

2. POST-MERGE BASELINE UPDATE:
   a. After successful merge: save report JSON as new baseline.
   b. Store in: docs/research/skill-test-reports/<skill-name>-baseline.json

3. WEEKLY REGRESSION SWEEP:
   a. Spawn one skill-tester agent per skill in the library.
   b. Compare all results against baselines.
   c. Flag any skills with degrading precision/recall trends.
   d. Create issues for skills with overall_verdict = "fail".

4. NEW SKILL RELEASE CHECKLIST:
   - [ ] skill-tester report run and attached to PR
   - [ ] Trigger Precision ≥ 0.95, Recall ≥ 0.90
   - [ ] All ALWAYS/NEVER rules: pass rate 100%
   - [ ] All code examples: valid syntax, correct flags
   - [ ] No regressions vs. sibling skills (cross-skill FP check)
   - [ ] SKILL.md < 500 lines
   - [ ] Description contains natural-language trigger phrases
```

---

## E. Iteration Process

### E.1 Improving a Skill Based on Test Results

| Failure Type | Root Cause Investigation | Fix Action |
|-------------|-------------------------|-----------|
| Low Trigger Recall (FN > 10%) | Description too narrow; missing trigger keywords | Add natural-language phrases to description; add "Use when..." examples |
| Low Trigger Precision (FP > 5%) | Description too broad; overlaps with other skills | Add "NOT for..." clauses to description; add negative constraints |
| ALWAYS rule failures | Rule is ambiguous or too long | Rewrite rule as a specific, one-line verifiable statement |
| NEVER rule failures | Rule conflicts with other instructions | Check for conflicts in CLAUDE.md; add explicit override directive |
| Step completion failures | Steps are underspecified or assume context | Add pre-conditions; make each step self-contained |
| Code example failures | Outdated flags or API changes | Update examples; add flag validation to the rule list |

**Iteration cycle:**
1. Run skill-tester → get report
2. Pick the lowest-scoring metric
3. Apply one targeted fix
4. Re-run skill-tester
5. Confirm delta ≥ 0 on fixed metric AND no regression on others
6. Commit the fix, update baseline

### E.2 When to Split a Skill

Split a skill into two when:
- Trigger Recall is > 90% but Trigger Precision is < 85% — the skill is too broad
- The skill has two distinct use cases with different ALWAYS/NEVER rules
- SKILL.md exceeds 400 lines (approaching 500-line limit)
- Two user groups consistently invoke the skill for different purposes
- One section causes false positives but the other doesn't

**Split procedure:**
1. Identify the two sub-domains in the skill
2. Create two new skills with focused descriptions
3. Run skill-tester on both
4. Deprecate the original (add `deprecated: true` to frontmatter, then delete after 1 sprint)

### E.3 When to Extend a Skill

Extend a skill (add content to existing SKILL.md) when:
- A new workflow follows the same trigger pattern as the existing skill
- Trigger Recall drops because a new related use case isn't covered
- A new ALWAYS rule applies to all existing use cases
- The addition keeps SKILL.md under 400 lines

### E.4 When to Delete a Skill

Delete a skill when:
- Trigger Precision and Recall are both < 70% after two iteration cycles
- The skill's domain is now covered by a better-structured skill
- The skill produces more false positives than true positives in production
- The underlying workflow it describes has been deprecated
- Usage data shows 0 invocations over 30 days

**Deletion procedure:**
1. Set `disable-model-invocation: true` for one sprint (no auto-triggers)
2. Monitor for user complaints
3. If none: delete the skill directory
4. Archive the SKILL.md in `docs/deprecated-skills/` for reference
5. Add a lesson to `LESSONS.md` about why it failed

---

## Summary: Minimum Viable Testing Per Skill

For every skill before publishing:

1. **10 trigger tests** (positive + negative): Precision ≥ 0.95, Recall ≥ 0.90
2. **ALWAYS/NEVER rule check**: 100% pass rate on all explicit rules
3. **Code example validation**: All snippets syntactically valid with correct flags
4. **Cross-skill FP check**: Skill doesn't trigger on inputs meant for 3 adjacent skills

For orchestration skills specifically, also verify:
- `--direct` flag appears in every oa run example
- `--model` flag appears in every oa run example
- No nested spawn pattern (no oa run inside agent prompt)
- 5-element prompt structure present in every example

---

## Quick Reference: Metrics Targets

| Metric | Target | Critical |
|--------|--------|---------|
| Trigger Precision | ≥ 0.95 | Yes |
| Trigger Recall | ≥ 0.90 | Yes |
| ALWAYS/NEVER adherence | 100% | Yes |
| Step completion rate | 100% | Yes |
| False positive rate | < 5% | Yes |
| Code example validity | 100% | Yes |
| Reference coverage | ≥ 80% | No |
| Reference precision | ≥ 90% | No |
| Regression delta | ≥ 0 | Yes |

---

*Sources: Anthropic Console Eval Tool, IFEval (arxiv 2311.07911), promptfoo, DeepEval contextual relevancy, Traceloop regression testing guide, Confident AI LLM evaluation metrics, EvidentlyAI LLM-as-a-judge guide*
