# Open-Agents Skill Protocol v1.0

> The definitive standard for writing Claude Code skills in the Open-Agents ecosystem.
> Every skill in this project follows this protocol. No exceptions.

---

## 1. Directory Structure

### Layout (Required)

Every skill is a **directory** with `SKILL.md` as the entrypoint:

```
.claude/skills/
└── oa-orchestration-spawn/
    ├── SKILL.md           # Main instructions (REQUIRED, < 300 lines)
    ├── reference.md       # Detailed reference material (optional, loaded on demand)
    ├── examples/          # Example inputs/outputs (optional)
    │   ├── good.md        # Positive examples
    │   └── bad.md         # Anti-patterns
    └── scripts/           # Executable utilities (optional)
        └── validate.sh    # Scripts Claude can run
```

**Rationale**: Anthropic docs recommend directory-based skills for supporting files. The 300-line target (vs Anthropic's 500-line max) accounts for oa-cli skills being denser — most content belongs in `reference.md`.

### Naming Convention

| Rule | Pattern | Example |
|------|---------|---------|
| Directory name | `oa-{category}-{topic}` | `oa-orchestration-spawn` |
| Kebab-case only | lowercase, hyphens, no underscores | `oa-quality-gates` |
| Max 64 chars | Enforced by Claude Code | — |
| Category prefix | Must match one of: `orchestration`, `prompting`, `state`, `quality`, `library`, `teams`, `web` | — |

### Files

| File | Required | Purpose |
|------|----------|---------|
| `SKILL.md` | **Yes** | Main skill instructions. Everything Claude needs for the 80% case. |
| `reference.md` | When SKILL.md > 150 lines without it | Detailed syntax, full flag lists, edge cases. Referenced from SKILL.md. |
| `examples/` | When output format is ambiguous | Concrete input/output pairs. 3–5 examples = near-maximum gain. |
| `scripts/` | When skill needs executable validation | Shell/Python scripts Claude can run via Bash tool. |

---

## 2. SKILL.md Template (Copy-Ready)

```yaml
---
name: oa-{category}-{topic}
description: "{What it does}. Use when {trigger condition}. Activates for: {keyword1}, {keyword2}, {keyword3}."
argument-hint: "[optional-arg]"
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob
context: fork
agent: general-purpose
---

## Critical Rules

{Place the 2-4 most important rules here — top position = highest adherence.}

- ALWAYS {do X} — {reason} (Lesson L-NNN).
- NEVER {do Y} — {reason} (Lesson L-NNN).

## Decision Tree

{When the skill involves choosing between approaches:}

```
Need to do Z?
├── Condition A → Action 1
├── Condition B → Action 2
└── Condition C → Action 3
```

## Instructions

{Numbered steps for the primary task. Concrete, verifiable actions.}

1. {Step one — specific action with exact command or file path}
2. {Step two — specific action}
3. {Step three — specific action}

## Patterns

{Code blocks showing correct usage. 2-3 examples max in SKILL.md.}

### Pattern 1: {Name}
```bash
{exact command or code}
```

### Pattern 2: {Name}
```bash
{exact command or code}
```

## Anti-Patterns

{What NOT to do. Each with a reason.}

- Bad: `{incorrect example}` — {why it fails}
- Good: `{correct alternative}` — {why it works}

## References

- For full syntax: [reference.md](reference.md)
- For examples: [examples/](examples/)
- Related skills: {comma-separated list of related skill names}
```

### Section Order Rationale

| Position | Section | Why |
|----------|---------|-----|
| 1 (top) | Critical Rules | Primacy effect: highest adherence at the top. Lost-in-middle research shows up to 47% performance drop for mid-positioned info. |
| 2 | Decision Tree | Helps Claude choose the right path before executing. |
| 3 | Instructions | Core task steps — numbered for ordered execution. |
| 4 | Patterns | Concrete examples reinforce instructions. |
| 5 | Anti-Patterns | Negative examples prevent common mistakes. |
| 6 (bottom) | References | Recency effect: Claude remembers where to find details. |

---

## 3. Writing the Description (Critical)

The `description` field determines whether Claude auto-invokes the skill. It consumes the 2% context budget (~16,000 chars across ALL skills). With 20+ skills, each description must be lean.

### Rules

| Rule | Target | Rationale |
|------|--------|-----------|
| Max length | **50 words** (~300 chars) | 20 skills × 300 chars = 6,000 chars — well within budget |
| Structure | `{What}. Use when {trigger}. Activates for: {keywords}.` | Three-part pattern covers function, condition, and matching |
| Trigger phrases | Mirror user's natural language | "spawn agent", not "initiate agent instantiation" |
| Specificity | Name the user intent + object | "Explains how code works" not "Helps with code" |
| Contrast | Add "Not for: {X}" when overlap exists | Prevents false positives between similar skills |

### Good vs Bad

**Bad** (too broad, no trigger condition):
```yaml
description: "Helps with oa-cli orchestration and agent management."
```
Problems: triggers on everything oa-related; no specificity; wastes context.

**Good** (specific trigger, keywords, bounded):
```yaml
description: "Exact CLI reference for spawning oa agents. Use when Claude needs to spawn, configure, or manage agents via oa run. Activates for: oa run, spawn agent, start agent, --direct, --model."
```
Why it works: names the exact command (`oa run`), lists natural-language triggers, includes flag keywords.

**Bad** (aggressive language — overtriggers on Claude 4.x):
```yaml
description: "CRITICAL: ALWAYS use this when ANY agent work is needed."
```
Problems: Claude 4.5/4.6 overtriggers on aggressive system prompt language.

**Good** (natural, specific):
```yaml
description: "5-element prompt structure for oa agent tasks. Use when writing or reviewing an oa run prompt. Activates for: agent prompt, prompt template, 5-element."
```

### Claude 4.x Calibration

Claude 4.5/4.6 models are more responsive to system prompts than Claude 3.x. Dial back aggressive language:

| Instead of | Write |
|------------|-------|
| `CRITICAL: ALWAYS use this when...` | `Use when...` |
| `You MUST invoke this for ANY...` | `Activates for: {keywords}` |
| `NEVER ignore this skill` | *(just write a good description)* |

---

## 4. Content Rules

### Imperative Language

| Pattern | When to Use | Example |
|---------|-------------|---------|
| `ALWAYS {action}` + reason | Non-negotiable rules (2-4 per skill max) | `ALWAYS include --direct — without it, output is written to volatile /tmp/ (L-010).` |
| `NEVER {action}` + reason | Hard prohibitions | `NEVER spawn agents from inside another agent — they become invisible to oa status (L-009).` |
| `Use {X} when {condition}` | Conditional guidance | `Use claude/opus when the task requires deep architectural reasoning.` |
| Plain imperative | Standard instructions | `Run oa status before spawning agents.` |

**Rule**: Every ALWAYS/NEVER statement MUST include a because-clause. Bare imperatives without reasons cause overtriggering on Claude 4.x while providing less semantic value.

**Limit**: Max 4 ALWAYS/NEVER rules per skill. More than 4 creates cognitive overload and reduces adherence to each individual rule.

### Information Position

| Position | Place Here | Rationale |
|----------|-----------|-----------|
| **Top** (lines 1-20) | Critical rules, ALWAYS/NEVER | Primacy effect: highest recall |
| **Middle** | Instructions, patterns, examples | Standard content — acceptable recall |
| **Bottom** (last 10 lines) | References, related skills, key constraint repeat | Recency effect: second-highest recall |

**Never** place critical constraints only in the middle of a long skill. If a rule is critical, place it at the top AND repeat it at the bottom.

### Optimal Length

| Component | Target | Hard Max |
|-----------|--------|----------|
| SKILL.md body | 100–200 lines | 300 lines |
| reference.md | Unlimited | — |
| Description | < 50 words | ~300 chars |
| ALWAYS/NEVER rules | 2–4 per skill | 4 |

If SKILL.md exceeds 200 lines, extract detailed syntax tables and edge cases to `reference.md`.

### Format Selection

| Content Type | Use | Not |
|-------------|-----|-----|
| Ordered procedures | Numbered list | Bullets or prose |
| Unordered options/flags | Bullet list | Numbered list |
| Choosing between approaches | Decision tree (ASCII) | Prose explanation |
| Flag/syntax reference | Table | Inline prose |
| Context, rationale | Short prose (2-3 sentences) | Long paragraphs |
| Examples | Fenced code blocks | Inline code |
| Warning/prohibition | `NEVER` + reason (bold) | Buried in paragraph |

### Headings

Use `##` headings for every major section. Headings serve as semantic anchors that help Claude locate relevant content without reading the entire skill.

- Use action-oriented heading names: `## Critical Rules`, `## Instructions`, `## Patterns`
- Never use `#` (reserved for skill title) or `####`+ (too granular)
- Max 6–8 headings per SKILL.md

### Code Blocks

- Always specify the language: ` ```bash `, ` ```json `, ` ```python `
- Show complete, runnable commands — never `...` ellipsis
- Include inline comments for non-obvious flags
- For oa-cli commands: always show `--direct` and `--model` flags

---

## 5. Frontmatter Decision Matrix

### Required Fields

| Field | Required? | Default | Notes |
|-------|-----------|---------|-------|
| `name` | Recommended | Directory name | Use `oa-{category}-{topic}` format |
| `description` | **Yes** | First paragraph | Write it explicitly — never rely on fallback |

### Optional Fields Decision Matrix

| Field | Set When | Value | Example |
|-------|----------|-------|---------|
| `disable-model-invocation` | Skill has side effects (deploy, commit, send, delete, oa run) | `true` | Deploy, commit skills |
| `disable-model-invocation` | Skill is reference/knowledge only | `false` (default) | Convention skills |
| `context: fork` | Skill runs research, analysis, or parallel work that shouldn't pollute main context | `fork` | Research skills, validation skills |
| `context: fork` | Skill modifies conversation state or needs chat history | *(omit — runs inline)* | Fix-in-place skills |
| `agent` | Using `context: fork` and need specific subagent capabilities | `Explore`, `Plan`, `general-purpose` | `Explore` for codebase research |
| `allowed-tools` | Skill should be restricted to specific tools for safety | Tool list | `Read, Grep, Glob` for read-only; `Read, Edit, Write` for write skills |
| `allowed-tools` | Skill needs full tool access | *(omit)* | General-purpose skills |
| `user-invocable` | Skill is background knowledge Claude should auto-load but users shouldn't directly invoke | `false` | Convention/pattern skills |
| `user-invocable` | Skill is a user-facing command | `true` (default) | Workflow skills |
| `argument-hint` | Skill accepts parameters | `[arg-name]` | `[issue-number]`, `[filename]` |
| `model` | Skill needs a specific model tier | Model ID | `claude/opus` for deep reasoning |

### `!command` Injection for oa-cli Context

Use `!command` to inject live data before Claude processes the skill:

```yaml
---
name: oa-status-check
---
## Live Context
- Running agents: !`oa status --json 2>/dev/null | head -50`
- Recent output: !`ls -la /tmp/oa-agent-*/output/ 2>/dev/null | tail -10`
```

**When to use**: Skills that need current state (git status, agent status, PR diff).
**When NOT to use**: Skills with static instructions only.

### oa-cli Specific Frontmatter Patterns

| Skill Type | `disable-model-invocation` | `context` | `allowed-tools` |
|------------|---------------------------|-----------|-----------------|
| Orchestration (oa run, oa pipeline) | `true` — spawning agents is a side effect | *(inline)* — needs main context | `Bash(oa *)` |
| Reference (patterns, model-tiering) | `false` — should auto-load when relevant | *(inline)* | *(default)* |
| Research/analysis | `false` | `fork` — isolate from main context | `Read, Grep, Glob` |
| Quality/validation | `false` | `fork` — parallel execution | `Read, Grep, Glob, Bash` |

---

## 6. Pilot Skill Assessment: `oa-orchestration-spawn.md`

### What's Good

1. **Strong description** — includes exact command (`oa run`), natural triggers, flag keywords
2. **Critical Rules at top** — ALWAYS/NEVER rules with issue references (L-010, L-009)
3. **Decision tree** — clear fork between run/pipeline/delegate
4. **Concrete patterns** — runnable bash examples with all required flags
5. **5-element prompt structure** — shows the complete template
6. **Model tiering table** — quick reference for model selection

### What Must Change

| Issue | Current | Required | Priority |
|-------|---------|----------|----------|
| **File is flat `.md`** | `oa-orchestration-spawn.md` | `oa-orchestration-spawn/SKILL.md` | Core |
| **No `disable-model-invocation`** | Missing | Add `disable-model-invocation: true` — spawning agents is a side effect | Core |
| **Too long for SKILL.md** | 111 lines (ok now, but includes reference material) | Extract Agent State Reference + Model Tiering to `reference.md` | Nice |
| **ALWAYS/NEVER lack because-clauses** | `ALWAYS include --direct` has reason, good. But format is bold, not standard. | Standardize to: `ALWAYS {action} — {reason} (L-NNN).` on its own line | Nice |
| **Missing anti-patterns section** | No explicit "what NOT to do" | Add 2-3 anti-patterns with bad→good comparisons | Nice |
| **Agent State Reference** | Inline in SKILL.md | Move to `reference.md` — it's detail, not core instruction | Nice |
| **Session Prerequisites** at bottom | `oa start` / `oa status` | Move to top of Instructions — prerequisites come first | Nice |
| **No `allowed-tools`** | Missing | Add `allowed-tools: Bash(oa *)` | Nice |

### Concrete Edit Instructions (for a fix-agent)

```
1. Create directory: .claude/skills/oa-orchestration-spawn/
2. Move .claude/skills/oa-orchestration-spawn.md → .claude/skills/oa-orchestration-spawn/SKILL.md
3. In SKILL.md frontmatter, add:
   disable-model-invocation: true
   allowed-tools: Bash(oa *)
4. Extract lines 76-93 (Agent State Reference) and lines 95-101 (Model Tiering)
   → write to .claude/skills/oa-orchestration-spawn/reference.md
5. Replace extracted sections with:
   ## References
   - For agent state and model tiering: [reference.md](reference.md)
   - Related: oa-orchestration-pipeline, oa-orchestration-communication, oa-orchestration-patterns
6. Add ## Anti-Patterns section before ## References:
   ## Anti-Patterns
   - Bad: `oa run "task" --name worker` — missing --direct and --model flags
   - Good: `oa run "task" --name worker --model claude/sonnet --direct`
   - Bad: Spawning agents from inside an agent prompt — invisible to oa status
   - Good: Always spawn from the orchestrator session (flat spawning)
7. Move "Session Prerequisites" content to the start of ## Instructions
```

---

## 7. Format-Fix Migration Plan

### Migration Procedure (Per Skill)

```bash
# 1. Create directory
mkdir -p .claude/skills/oa-orchestration-spawn/

# 2. Move file
mv .claude/skills/oa-orchestration-spawn.md .claude/skills/oa-orchestration-spawn/SKILL.md

# 3. Verify Claude Code still discovers the skill
# (Claude Code looks for SKILL.md inside skill directories)
```

### Frontmatter Expansion Per Skill Type

| Skill | Add `disable-model-invocation: true` | Add `context: fork` | Add `allowed-tools` |
|-------|--------------------------------------|---------------------|---------------------|
| oa-orchestration-spawn | **Yes** (side effect) | No | `Bash(oa *)` |
| oa-orchestration-pipeline | **Yes** (side effect) | No | `Bash(oa *)` |
| oa-orchestration-communication | No (reference) | No | — |
| oa-orchestration-patterns | No (reference) | No | — |
| oa-prompting-5element | No (reference) | No | — |
| oa-prompting-model-tiering | No (reference) | No | — |
| oa-prompting-scope | No (reference) | No | — |
| oa-state-workspace | No (reference) | No | — |
| oa-state-agents-json | No (reference) | No | — |
| oa-state-collect | No (reference) | No | — |
| oa-quality-gates | No (reference) | No | — |
| oa-quality-guardians | No (reference) | No | — |
| oa-library-templates | No (reference) | No | — |
| oa-agent-library-builder | **Yes** (creates files) | No | `Read, Write, Bash` |

### Migration Order

**Batch 1 — Highest impact (side-effect skills first)**:
1. `oa-orchestration-spawn` — most used, needs `disable-model-invocation: true`
2. `oa-orchestration-pipeline` — side effect skill
3. `oa-agent-library-builder` — side effect skill

**Batch 2 — Core reference skills**:
4. `oa-orchestration-patterns`
5. `oa-prompting-5element`
6. `oa-prompting-model-tiering`
7. `oa-quality-gates`

**Batch 3 — Remaining skills**:
8–14. All remaining skills in alphabetical order.

### Migration Agent Prompt Template

```bash
oa run "You are a SKILL MIGRATOR.

## Input
Skill file: /path/to/.claude/skills/oa-{name}.md

## Output
1. Create directory: /path/to/.claude/skills/oa-{name}/
2. Write SKILL.md to that directory
3. If content > 200 lines, extract reference material to reference.md

## Rules
- Preserve all existing content
- Add missing frontmatter fields per SKILL-PROTOCOL.md
- Standardize ALWAYS/NEVER to include because-clauses
- Add ## Anti-Patterns section if missing
- Add ## References section pointing to reference.md and related skills
- Keep SKILL.md under 300 lines
- English only
" --name migrator-{name} --model claude/sonnet --direct
```

---

## 8. Skill-Tester Checklist

Run after EVERY skill creation or modification.

### Structure Checks

- [ ] Skill lives in a directory: `.claude/skills/{name}/SKILL.md`
- [ ] Directory name matches `name` in frontmatter
- [ ] SKILL.md is under 300 lines
- [ ] If `reference.md` exists, SKILL.md references it explicitly
- [ ] If `examples/` exists, SKILL.md references it explicitly
- [ ] No orphan files (every file in the directory is referenced from SKILL.md)

### Frontmatter Checks

- [ ] `name` field present and matches directory name
- [ ] `description` field present, explicit (not relying on paragraph fallback)
- [ ] `description` is under 50 words
- [ ] `description` contains at least one trigger phrase (`Use when...` or `Activates for:`)
- [ ] Side-effect skills have `disable-model-invocation: true`
- [ ] Research/analysis skills have `context: fork`
- [ ] `allowed-tools` is set for skills that should be restricted
- [ ] No deprecated or unknown frontmatter fields

### Content Checks

- [ ] Critical rules (ALWAYS/NEVER) are in the **first 20 lines** of markdown body
- [ ] Every ALWAYS/NEVER includes a because-clause
- [ ] Max 4 ALWAYS/NEVER rules per skill
- [ ] Numbered steps for ordered procedures
- [ ] Code blocks specify language (` ```bash `, ` ```json `)
- [ ] Code examples are complete and runnable (no `...` ellipsis)
- [ ] For oa-cli commands: `--direct` and `--model` flags present in examples
- [ ] No aggressive trigger language (`CRITICAL`, `YOU MUST`, `ALWAYS use this when ANY`)
- [ ] No vague language (`might`, `consider`, `could`, `try to`)
- [ ] Section order follows protocol: Critical Rules → Decision Tree → Instructions → Patterns → Anti-Patterns → References

### Trigger Checks

- [ ] Description triggers correctly on 3+ natural-language test prompts
- [ ] Description does NOT trigger on 3+ unrelated test prompts
- [ ] No overlap with descriptions of other skills (check for shared keywords)
- [ ] If `disable-model-invocation: true`: verify skill only activates on explicit `/skill-name` invocation

### Conflict Checks

- [ ] No ALWAYS/NEVER rules that contradict rules in CLAUDE.md
- [ ] No ALWAYS/NEVER rules that contradict rules in other skills
- [ ] No duplicate content with CLAUDE.md (skills ADD, not repeat)
- [ ] Description keywords don't cause false positives with adjacent skills

### Automated Validation Command

```bash
# Run the skill-tester agent
oa run "Validate skill at .claude/skills/{name}/SKILL.md against SKILL-PROTOCOL.md" \
  --name skill-tester-{name} --model claude/sonnet --direct
```

---

## Appendix A: Quick Reference Card

### Minimum Viable Skill

```yaml
---
name: oa-{category}-{topic}
description: "{What}. Use when {trigger}. Activates for: {keywords}."
---

## Critical Rules

- ALWAYS {rule} — {reason}.

## Instructions

1. {Step one}
2. {Step two}

## References

- Related: {skill-1}, {skill-2}
```

### Full-Featured Skill

See Section 2 template above.

### Context Budget Math

- Context window: 200K tokens (~800K chars)
- Skill budget: 2% = ~16,000 chars
- Per-skill description budget: 16,000 / 20 skills = **~800 chars max per description**
- Recommended: **~300 chars** (50 words) to leave headroom

### Priority Labels

- **Core**: Must follow — violating this degrades skill performance measurably
- **Nice**: Improves quality — skip only when time-constrained

---

*Open-Agents Skill Protocol v1.0 — Synthesized from: Anthropic Skills Guidelines, Prompt Engineering Research, Competitor Analysis, Testing Framework, Raw Masterplan, and Pilot Skill Assessment.*
