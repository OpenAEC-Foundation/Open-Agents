# Skill Performance & Prompt Engineering: Best Practices for AI Agents

**Research date:** 2026-03-08
**Scope:** Context window efficiency, instruction format, trigger optimization, content structure, Claude 4.x developments

---

## A. Context Window Efficiency

### How much context do skill descriptions consume?

Claude Code skill descriptions are loaded into context automatically so Claude knows what's available. The character budget scales dynamically at **2% of the context window**, with a fallback ceiling of **16,000 characters**. With Claude's 200K context window (~800K characters), this allows for roughly 16,000 characters of skill descriptions before Claude begins excluding skills.

**Source:** [Claude Code Skills docs](https://code.claude.com/docs/en/skills)

### When does a skill hurt more than it helps?

A skill becomes a net negative when:
- It is **too broad**: a description like "helps with coding" triggers on everything, polluting context and creating false positives
- It is **too long**: skills over ~500 lines push total skill context past the 2% budget, causing other skills to be excluded
- It uses **aggressive trigger language**: "CRITICAL: ALWAYS use this when..." causes Claude 4.5/4.6 to overtrigger, as these models are already highly responsive to system prompts

**Source:** [Anthropic Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)

> "Claude Opus 4.5 and Claude Opus 4.6 are also more responsive to the system prompt than previous models. If your prompts were designed to reduce undertriggering on tools or skills, these models may now overtrigger. The fix is to dial back any aggressive language."

### How to write a description that conveys maximum information in minimum tokens?

1. **State the trigger condition precisely**: "Use when the user asks how something works, or requests an explanation of a codebase." Not: "Explains things."
2. **Include 1–3 concrete usage keywords**: match the natural language users actually type
3. **Keep under 50 words**: descriptions exist only to help Claude decide whether to load the full skill — they are not the instructions themselves
4. **Omit capability claims**: don't say what the skill *can* do, say *when* to use it

**Pattern:**
```
description: Explains code with visual diagrams and analogies. Use when explaining
how code works, teaching about a codebase, or when the user asks "how does this work?"
```

---

## B. Instruction Format

### Which instruction format performs best: bullets, numbered steps, or prose?

**Numbered steps** win for procedural, ordered tasks. Bullet lists work for discrete, unordered items. Prose works for context and rationale.

From Anthropic's official guidance:
> "Provide instructions as sequential steps using numbered lists or bullet points **when the order or completeness of steps matters**."
> "Instead of listing items with bullets or numbers, incorporate them naturally into sentences" — for non-discrete content.

**Rule of thumb:**
- **Task steps** → numbered list
- **Discrete options/items** → bullets
- **Rationale, context, caveats** → prose
- **Never**: a series of overly short bullet points that fragment information

**Source:** [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### Does ALWAYS/NEVER language outperform "you should"?

**Partially — but with an important caveat for Claude 4.x.**

Strong imperative language (ALWAYS, NEVER, MUST) was effective on Claude 2/3 to compensate for undertriggering. On Claude 4.5/4.6, it causes **overtriggering**. Anthropic explicitly recommends dialing back aggressive language:

> "Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting like 'Use this tool when...'"

However, context-bearing ALWAYS/NEVER still works better than "you should" **when paired with a reason**:
- Weak: `NEVER use ellipses`
- Better: `Your response will be read aloud by TTS, so never use ellipses since TTS cannot pronounce them.`

**Pattern:** NEVER/ALWAYS + because-clause = clearest intent. Bare imperatives on Claude 4.x = overtriggering.

### What is the optimal length for a skill?

| Component | Target |
|-----------|--------|
| Skill description (frontmatter) | < 50 words |
| `SKILL.md` main body | < 500 lines |
| Supporting reference files | Unlimited (loaded on demand) |

The Anthropic Claude Code documentation explicitly states: "Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files."

For API prompt engineering:
- System prompts: 200–800 tokens is optimal for most use cases; beyond 2000 tokens, performance degrades unless well-structured
- Few-shot examples: 3–5 examples deliver near-maximum gain; more examples yield diminishing returns

**Source:** [Claude Code Skills docs](https://code.claude.com/docs/en/skills); [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### Do headings help Claude navigate?

Yes. Headings serve as **semantic anchors** that help Claude locate the relevant portion of a long skill without reading it all. Best practices:
- Use `##` headings for major sections (Setup, Instructions, Output Format, Edge Cases)
- Keep heading names action-oriented ("When to trigger this", "Steps to execute")
- Headings also reduce the "lost in the middle" effect by giving Claude structural cues

---

## C. Trigger Optimization

### How to write a description so Claude ALWAYS triggers when relevant?

1. **Mirror user phrasing**: include the natural-language phrases users will type. If they say "how does this work?" put exactly that in the description.
2. **List the domain signals**: "Use when: working with API calls, importing `anthropic`, or user asks about Claude SDK"
3. **Be specific about the situation**: "Use when reviewing recently changed files" not "Use for code review"
4. **Name the user intent**: combine action + object: "Explains how code works", "Generates formatted changelogs", "Migrates database schemas"

Example of a strong description:
```yaml
description: Fix a GitHub issue by number. Use when the user says "fix issue",
"resolve bug #", or provides a GitHub issue URL.
```

### How to prevent false positives (skill triggers when not needed)?

1. **Set `disable-model-invocation: true`** for workflow skills with side effects (deploy, commit, send-message) — only you control when they run
2. **Narrow the trigger phrase**: instead of "code review", use "review recently changed files after implementing a feature"
3. **Use contrast statements**: "Use for X, not for Y"
4. **Avoid broad verbs alone**: "helps", "assists", "improves" without object specificity cause false positives

### Specific vs. broad triggers — what works better?

**Specific triggers always outperform broad ones.** The skill is loaded at full into context only when triggered; false-positive loads waste context budget and can confuse Claude's behavior.

Broad (poor): `description: Helps with code`
Specific (good): `description: Teaches Claude to explain code using visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when the user asks "how does this work?"`

---

## D. Content Structure for Retrieval

### How to structure content so Claude finds the most relevant part quickly?

Use **progressive disclosure**:
1. **First paragraph**: the "what and when" — trigger condition + one-sentence summary
2. **Numbered steps**: the primary task execution
3. **Edge cases**: branching behavior for non-default inputs
4. **Reference links**: point to supporting files, don't inline them

Move all large reference material (API docs, example collections) to separate files referenced from SKILL.md:
```markdown
For complete API details, see [reference.md](reference.md)
For usage examples, see [examples.md](examples.md)
```
Claude loads these only when needed, preserving context budget.

### Does information position (beginning vs. end) matter?

Yes — significantly. This is the **"lost in the middle" effect**, documented in peer-reviewed research (Liu et al., 2024, *Transactions of the Association for Computational Linguistics*):

> Models perform best when relevant information appears at the **beginning or end** of the context. Performance drops up to **47%** when relevant information is in the middle of long contexts.

Practical rules:
- **Critical instructions at the top** of SKILL.md
- **Long reference data (documents, code)** at the top of the *prompt* when calling the API, above queries and instructions
- **Queries/tasks at the end**: Anthropic documents that "Queries at the end can improve response quality by up to 30% in tests, especially with complex, multi-document inputs."
- **Key constraints or non-negotiables** repeated at the end (primacy + recency bias)

**Source:** [Liu et al. 2023/2024 "Lost in the Middle"](https://arxiv.org/abs/2307.03172); [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### How to use the "lost in the middle" effect strategically?

- Place the **most critical instruction** (safety rule, output format, key constraint) at **position 1** in your system prompt or SKILL.md
- Place **secondary context** (background, examples) in the middle where it can be "safely forgotten" if context is long
- Place **your task/query** at the **very end** of the prompt
- For multi-document prompts, use XML tags (`<document index="1">`) and ask Claude to quote relevant passages first — this forces it to re-locate critical information actively

---

## E. 2025/2026 Developments

### Claude 3.7/4.x improvements for instruction following

**Claude 4.5 and 4.6 (Opus/Sonnet)** represent a significant leap in instruction adherence:

1. **Prefill deprecated**: Prefilled assistant-turn responses are no longer supported in Claude 4.6. The model reliably follows output format instructions without prefill hacks. Use structured outputs or explicit format instructions instead.

2. **Adaptive thinking**: Claude 4.6 uses `thinking: {type: "adaptive"}` — it dynamically decides when and how much to think per query. This replaces manual `budget_tokens`. Use the `effort` parameter (`low`, `medium`, `high`, `max`) to control depth.

3. **Context awareness**: Claude 4.5/4.6 models can track their own remaining token budget and self-regulate accordingly — critical for long agentic tasks.

4. **Overtriggering risk**: These models are more responsive to system prompts than Claude 3.x. Strong imperative language ("CRITICAL: ALWAYS") that prevented undertriggering in earlier models now causes overtriggering. **Scale back aggressive language**.

5. **Parallel tool calling**: Claude 4.x executes independent tool calls in parallel by default. Boost to ~100% with explicit prompt: "make all independent tool calls in parallel."

**Source:** [Anthropic Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)

### New Claude Code features affecting skill writing

**Skills have merged with custom commands** (2025):
- `.claude/commands/review.md` and `.claude/skills/review/SKILL.md` are equivalent
- Skills add: supporting files directory, frontmatter control, subagent execution (`context: fork`), dynamic context injection

**Key new features:**

| Feature | Impact on Skill Design |
|---------|------------------------|
| `context: fork` | Run skill in isolated subagent; skill content becomes the agent prompt |
| `disable-model-invocation: true` | Hide from Claude auto-discovery; user-only invocation |
| `user-invocable: false` | Background knowledge Claude loads but user cannot `/invoke` |
| `!`command`` syntax` | Shell preprocessing — inject live data (git log, PR diff) before Claude sees anything |
| `$ARGUMENTS[N]` | Positional argument access for parameterized skills |
| `agent` field | Specify subagent type (`Explore`, `Plan`, `general-purpose`, custom) |

**Monorepo support**: Claude Code now auto-discovers skills from nested `.claude/skills/` directories when working in subdirectories, enabling per-package skills in monorepos.

### Context window size trends and impact on skill design

- Current Claude models: 200K token context window (~800K characters)
- Skills budget: 2% of context = up to ~16,000 characters of descriptions before skills get excluded
- **Impact**: You can have roughly 20–40 well-described skills before hitting the budget ceiling
- **Strategy**: Keep descriptions lean (< 50 words), use `user-invocable: false` for background skills to exclude them from the description budget

**Practical limit check:**
```bash
/context   # Shows warning if skills are being excluded due to budget
```
Override: `SLASH_COMMAND_TOOL_CHAR_BUDGET=32000` (env var)

---

## F. Few-Shot Prompting

### When to use few-shot vs. zero-shot?

| Situation | Recommendation |
|-----------|---------------|
| Output format is ambiguous | Few-shot (3–5 examples) |
| Classification with fuzzy categories | Few-shot with labeled examples |
| Tool-calling tasks | Few-shot: Claude 3 Sonnet jumped from 16% → 52% correct with 3 examples |
| Reasoning/math tasks | Zero-shot CoT ("think step by step") often outperforms few-shot |
| Simple, clear tasks | Zero-shot — examples add overhead without gain |

**Optimal**: 3–5 examples wrapped in `<examples>` tags. Beyond 5, returns diminish significantly.

**Source:** [LangChain few-shot for tool-calling](https://blog.langchain.com/few-shot-prompting-to-improve-tool-calling-performance/); [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

### Using few-shot with thinking (Claude 4.x)

> "Multishot examples work with thinking. Use `<thinking>` tags inside your few-shot examples to show Claude the reasoning pattern. It will generalize that style to its own extended thinking blocks."

---

## G. XML Tags & Structural Patterns

XML tags are Claude's preferred structural delimiter. They:
- Prevent instruction/data boundary confusion
- Enable reliable output parsing
- Signal section types to Claude's attention mechanism

**Recommended tag pattern for skills:**
```xml
<instructions>
  Step-by-step task instructions
</instructions>
<context>
  Background the model needs
</context>
<examples>
  <example>
    Input: ...
    Output: ...
  </example>
</examples>
```

For long-context prompts (20K+ tokens), always wrap documents:
```xml
<documents>
  <document index="1">
    <source>filename.md</source>
    <document_content>...</document_content>
  </document>
</documents>
```

---

## Impact Matrix

| Technique | Performance Impact | Implementation Effort | Priority |
|-----------|-------------------|-----------------------|----------|
| Place task/query at end of prompt | High (+30% on complex inputs) | Low | P0 |
| Few-shot examples (3–5, in `<example>` tags) | High (+15–40% accuracy) | Medium | P0 |
| XML tags for structure | High (prevents misparse) | Low | P0 |
| Specific, narrow skill description | High (prevents false positives) | Low | P0 |
| Keep SKILL.md < 500 lines, move refs to files | High (preserves context budget) | Low | P0 |
| Critical instructions at top of prompt/skill | Medium-High | Low | P1 |
| NEVER/ALWAYS + because-clause | Medium (better than bare imperative) | Low | P1 |
| Numbered steps for ordered tasks | Medium | Low | P1 |
| `disable-model-invocation: true` for side-effect skills | High (prevents unintended execution) | Low | P1 |
| Context-aware headings (## sections) | Medium (improves retrieval) | Low | P1 |
| `context: fork` for isolated subagent execution | High for parallel/isolated work | Medium | P1 |
| Dynamic context injection (`!`cmd``) | High for live-data skills | Medium | P2 |
| Adaptive thinking (effort parameter) | High for complex reasoning | Medium | P2 |
| Prompt compression for long contexts | High for token cost | High | P2 |
| RAG for large knowledge bases | High (avoids lost-in-middle) | High | P3 |
| `<thinking>` tags in few-shot examples | Medium (improves reasoning style) | Low | P3 |

---

## Sources

- Anthropic: [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- Anthropic: [Claude Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Anthropic: [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- Anthropic: [Claude Code Skills](https://code.claude.com/docs/en/skills)
- Liu et al. (2024): [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) — *Transactions of the ACL*
- LangChain: [Few-Shot Prompting for Tool-Calling](https://blog.langchain.com/few-shot-prompting-to-improve-tool-calling-performance/)
- Prompt Engineering Guide: [Few-Shot Prompting](https://www.promptingguide.ai/techniques/fewshot)
- Maxim AI: [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
