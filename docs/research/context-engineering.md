# Context Engineering for Open-Agents — Research Report

**Issue:** #58
**Date:** 2026-03-11
**Status:** Final
**Sources:** REF_anthropic-context-engineering.md, REF_ace-self-learning-contexts.md, REF_claude-code-memory-system.md, REF_langchain-context-strategies.md, REF_skill-architecture.md

---

## 1. Context Budget Model

Context engineering is the discipline of managing the optimal set of tokens available during LLM inference. Unlike prompt engineering (writing instructions), context engineering manages the entire context state: system prompts, tools, memory, retrieval results, and conversation history.

### Why context budgets matter

Transformers create O(n²) pairwise relationships between tokens. This means:
- Every new token adds attention overhead across the full context
- Retrieval accuracy degrades as context size grows ("context rot")
- Effective attention is a finite, depletable resource

**Rule of thumb:** treat context like RAM. The OS (your agent design) decides what fits. More is not better — high-signal density is.

### Context Windows by Model (2026)

| Model | Context Window | Effective Working Range | Cost Tier |
|-------|---------------|------------------------|-----------|
| claude-haiku-4-5 | 200K tokens | ≤50K (tight budget) | Low |
| claude-sonnet-4-6 | 200K tokens | ≤100K (balanced) | Medium |
| claude-opus-4-6 | 200K tokens | ≤150K (deep reasoning) | High |

"Effective working range" is the token count where retrieval accuracy and instruction-following remain high. Beyond this, models technically process the full window but recall degrades.

### Budget Model per Agent Type

| Agent Type | System Prompt | Tools | Memory/Notes | Active Context | Total Budget |
|------------|--------------|-------|--------------|----------------|-------------|
| **Researcher** | ~2K | ~1K | ~5K (notes + refs) | ~20K (docs read) | ~28K → use Sonnet |
| **Code Worker** | ~3K | ~2K | ~3K (task spec) | ~30K (files + diffs) | ~38K → use Sonnet |
| **Orchestrator** | ~5K | ~3K | ~8K (agent states) | ~10K (outputs review) | ~26K → use Opus |
| **Formatter / Scanner** | ~1K | ~1K | ~1K | ~5K (files scanned) | ~8K → use Haiku |
| **Reviewer / QA** | ~2K | ~1K | ~5K (checklist + prior output) | ~20K (output reviewed) | ~28K → use Sonnet |
| **Pipeline Planner** | ~4K | ~2K | ~10K (requirements) | ~15K (planning) | ~31K → use Opus |

**Key implication:** Most agents fit comfortably within Sonnet's effective working range. Haiku is appropriate for mechanical tasks with minimal context needs. Opus is warranted when an agent must maintain deep coherence across large bodies of information (orchestration, architecture planning).

---

## 2. Scoping Strategy

### The Write/Select/Compress/Isolate Framework (LangChain, 2025)

Four strategies, applied in layers:

| Strategy | What it does | Open-Agents Implementation |
|----------|-------------|---------------------------|
| **WRITE** | Capture information for later use | Auto-memory, agent notes in `/tmp/`, scratchpads |
| **SELECT** | Choose the right information to load | Skills progressive disclosure, just-in-time file reads |
| **COMPRESS** | Reduce context to high-signal tokens | Compaction at context limits, summary-on-handoff |
| **ISOLATE** | Give different tasks different information | Multi-agent architecture — each agent gets only its scope |

### What goes ALWAYS in context

These elements should be present from the first token of every agent run:

1. **Agent identity** — Role, task scope, output path (absolute), quality rules
2. **Key constraints** — File boundaries, no-overlap rule (L-003), format requirements
3. **Reference anchors** — Paths to files the agent will read, not the file contents themselves
4. **Communication setup** — Agent name, inbox commands, `--parent` linkage

**Concrete token budget for always-in-context:** 2,000–5,000 tokens. If your system prompt exceeds 5K tokens, it contains on-demand information that should be moved to reference files.

### What goes ON-DEMAND

- File contents (load via Read when needed, not upfront)
- Reference documentation (link to it, don't paste it)
- Prior agent outputs (load with `oa collect` at the moment needed)
- Code files (read the relevant section, not the whole codebase)
- LESSONS.md / DECISIONS.md (reference key numbers upfront, full read on demand)

### Just-in-Time Retrieval Pattern

```
Agent receives:
  → Task description + output path
  → List of file paths to potentially read (not content)
  → Key constraints as bullet points

Agent decides:
  → Which files to actually read
  → When to read them
  → How much to read (use offset/limit)
```

This mirrors how Claude Code operates: CLAUDE.md files are loaded naively at startup, while grep and glob enable targeted just-in-time retrieval during execution.

---

## 3. Skill Design Guide

Skills are context-loading mechanisms. A well-designed skill adds value without adding context waste.

### Progressive Disclosure — The Three Layers

| Layer | Loaded when | Token cost | Purpose |
|-------|-------------|-----------|---------|
| Metadata (name + description) | Always | ~50–100 tokens | Triggering |
| SKILL.md body | When triggered | <2,000 tokens ideally | Instructions |
| Bundled resources (refs, scripts) | On-demand | Unlimited | Deep content |

A workspace with 40+ skills has minimal context overhead if progressive disclosure works correctly: only ~4,000 tokens of metadata are always present.

### Writing Context-Efficient Skills

**Rule 1: Under 500 lines for SKILL.md body.**
If you need more, add a supporting reference file and link to it. The body stays lean; details live in `references/`.

**Rule 2: Description is the trigger, not the title.**
Bad: `"Use this skill for Python projects"`
Good: `"TRIGGER when: code imports anthropic, user asks about Claude API, or mentions Anthropic SDK"`
Claude under-triggers. Make descriptions explicit and keyword-dense.

**Rule 3: Write for context efficiency, not completeness.**
Don't include background theory the agent can infer. Don't list examples the agent already knows. Include only what changes behavior.

**Rule 4: Separate stable knowledge from volatile state.**
Stable knowledge (conventions, patterns) → SKILL.md
Volatile state (current task, in-progress work) → never in skills

**Rule 5: Skills do NOT inherit project CLAUDE.md.**
When oa agents need skill knowledge, the skill content must be embedded explicitly in the agent prompt or passed via `--skill-path`.

### Skill Architecture Pattern for Domain Knowledge

```
domain-skill/
├── SKILL.md          # <500 lines: workflow + decision logic
└── references/
    ├── framework-a.md    # Read only when framework A is chosen
    ├── framework-b.md    # Read only when framework B is chosen
    └── examples.md       # Read only when examples are needed
```

Claude reads only the reference file relevant to the current task. Unused references cost zero tokens.

### Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Pasting full docs into SKILL.md | Inflates context on every trigger | Move to references/, link from body |
| Generic skill descriptions | Under-triggering | Add explicit trigger conditions |
| Skills that overlap in scope | Ambiguous triggering | Define clear domain boundaries |
| Context-heavy examples | Examples dominate the body | Move to `references/examples.md` |
| Volatile state in skills | Stale instructions | Keep skills stateless |

---

## 4. Context Window Management

### When to COMPACT

Compact when: active context exceeds 60–70% of the model's effective working range.

| Model | Compact threshold | Reset threshold |
|-------|-----------------|----------------|
| Haiku | ~30K tokens | ~40K tokens |
| Sonnet | ~70K tokens | ~100K tokens |
| Opus | ~100K tokens | ~150K tokens |

**What to preserve during compaction:**
- Architecture decisions and reasoning (not just conclusions)
- Unresolved blockers and open questions
- Implementation details that affect correctness
- File paths and their roles

**What to discard:**
- Tool output details that are superseded
- Intermediate reasoning steps with clear conclusions
- Repeated context (re-reads of the same content)
- Error messages for errors that are now resolved

### When to RESET (Start Fresh)

Reset when:
- The task changes significantly in scope
- You've completed a major milestone (e.g., one of multiple independent files)
- Context contains conflicting information that compaction can't resolve
- The current context is making the agent worse, not better

For Open-Agents: each `oa run` starts a fresh context window. This is by design — isolation (the ISOLATE strategy). The cost is losing inter-agent context, which is solved by explicit file-based handoff.

### When to SPLIT

Split a single agent into multiple agents when:
- A task has two or more distinct phases with different context needs
- The combined context would exceed the reset threshold
- Two subtasks can run in parallel without dependencies

**Splitting pattern:**
```
Agent A: researcher → writes /tmp/findings.md (compact context)
Agent B: writer     → reads /tmp/findings.md, writes final output (fresh context)
```

This is better than one large agent because each starts with focused, high-signal context.

### The ACE Pattern for Long-Running Knowledge Accumulation

The Agentic Context Engineering (ACE) framework (Zhang et al., 2026) addresses context collapse in iterative systems:

1. **Generation** — Produce new knowledge from execution feedback
2. **Reflection** — Evaluate which knowledge was actually useful
3. **Curation** — Deduplicate, organize, and structure retained knowledge

Applied to Open-Agents: LESSONS.md follows this pattern implicitly. Each session adds lessons (generation), Claude reads them at startup and rates their relevance (reflection), and periodic cleanup removes outdated entries (curation).

**Anti-collapse rule:** Always ADD to existing knowledge structures. Never wholesale-replace. Replacement erodes subtle but valuable context across iterations.

---

## 5. Open-Agents Specifics

### The L-010 Prompt Template and Context Optimization

L-010 defines the 5-element prompt template for `oa run`. Each element serves a specific context function:

| Element | Context function | Token budget |
|---------|----------------|-------------|
| **Absolute file paths** (input + output) | Eliminates ambiguity, no extra lookup needed | ~100 tokens |
| **Explicit scope** (bullet list) | Defines task boundary → agent doesn't drift | ~200 tokens |
| **Reference files** (format/structure) | Anchors output format without pasting templates | ~100 tokens |
| **Quality rules inline** | Compensates for agents not inheriting CLAUDE.md | ~200 tokens |
| **Source URLs** if researching | Prevents hallucination by grounding facts | ~100 tokens |

**Total for a well-formed L-010 prompt: ~700–1,000 tokens.**
This is efficient. An agent that receives this starts with high-signal, low-noise context and needs to add at most 3–5K tokens of content reads before reaching peak coherence.

### Context Isolation as Architecture

Open-Agents' multi-agent architecture IS the ISOLATE strategy:

```
Orchestrator (26K context)
├── Agent A: researcher (28K context, isolated)
│   └── Writes /tmp/findings-a.md
├── Agent B: code worker (38K context, isolated)
│   └── Writes /tmp/code-b.py
└── Agent C: reviewer (28K context, isolated)
    ├── Reads /tmp/findings-a.md
    ├── Reads /tmp/code-b.py
    └── Writes /tmp/review-c.md
```

Each agent has a focused context window. The orchestrator maintains a high-level view without accumulating implementation details.

**Design implication:** Never give a single agent the entire project context. Instead, design the agent's input to contain only what it needs, and its output to be a compact artifact the next agent can load.

### Auto-Memory as the WRITE Strategy

Claude Code's auto-memory (`~/.claude/projects/.../memory/`) implements the WRITE strategy:
- MEMORY.md (first 200 lines): always loaded → functions as the agent's long-term index
- Topic files (debugging.md, patterns.md): on-demand → loaded when relevant

For oa agents, the equivalent is writing to `/tmp/<name>/` or shared paths specified in the task prompt. Agents don't have auto-memory, so the orchestrator must explicitly include any persistent knowledge in the prompt.

### Context Poisoning in Agent Pipelines

Context poisoning (Breunig): a hallucination enters context and contaminates downstream reasoning.

**Open-Agents specific risks:**
- An agent reads a file and misinterprets its structure → writes incorrect output → next agent inherits the error
- An orchestrator collects partial output from a timed-out agent → passes incomplete state forward

**Mitigations:**
1. QA agent after each batch (L-004)
2. Validate output format before passing to downstream agents
3. Never pass raw agent output without a review step for high-stakes pipelines
4. Use explicit output schemas (e.g., "output must be valid JSON with keys: X, Y, Z")

---

## 6. Cost Implications

### Token Cost Model (March 2026 estimates)

| Model | Input cost (per 1M tokens) | Output cost (per 1M tokens) | Cache write | Cache read |
|-------|--------------------------|----------------------------|------------|-----------|
| claude-haiku-4-5 | $0.80 | $4.00 | $1.00 | $0.08 |
| claude-sonnet-4-6 | $3.00 | $15.00 | $3.75 | $0.30 |
| claude-opus-4-6 | $15.00 | $75.00 | $18.75 | $1.50 |

### Cost per Agent Run (estimates)

| Agent Type | Model | Avg tokens in | Avg tokens out | Est. cost per run |
|------------|-------|--------------|----------------|------------------|
| Scanner / Formatter | Haiku | 8K | 2K | ~$0.01 |
| Researcher | Sonnet | 28K | 5K | ~$0.16 |
| Code Worker | Sonnet | 38K | 8K | ~$0.23 |
| Orchestrator | Opus | 26K | 3K | ~$0.62 |
| Pipeline Planner | Opus | 31K | 5K | ~$0.84 |

**Prompt caching significantly reduces cost for repeated system prompts.** If an agent's system prompt is 3K tokens and runs 10 times in a session:
- Without cache: 30K tokens × $3.00/M = $0.09
- With cache (first run writes, remaining 9 read): 3K write + 27K read = $0.009 + $0.008 = $0.017

**Caching recommendation:** Design system prompts to be stable across runs within a session. The task-specific part (file paths, scope) can vary, but the identity/rules section should be static to maximize cache hits.

### Cost Optimization Rules

1. **Right-tier every task.** Never use Opus for formatting, scanning, or simple writes. Haiku for mechanical tasks saves 18× vs. Opus.

2. **Minimize output tokens.** Output tokens cost 5× more than input. Design agents to produce compact artifacts, not verbose explanations. Use structured formats (JSON, tables) instead of prose where downstream processing needs it.

3. **Isolate to limit context growth.** Each agent runs in a fresh window. Splitting a 100K-token monolithic run into four 25K-token specialized agents reduces cost: 4 × (25K × $3/M) = $0.30 vs. 100K × $3/M = $0.30 — same cost, but with much higher reliability and lower risk of context rot.

4. **Compact aggressively for long tasks.** At 70% context fill, compact before continuing rather than running to the limit. Context rot at 90%+ fill wastes tokens on low-quality completions.

5. **Cache stable system prompts.** Structure prompts so that the identity + rules block comes first (cache-eligible) and the variable task description comes last.

---

## Summary: Practical Recommendations for Open-Agents

| Context Challenge | Recommendation | Impact |
|------------------|---------------|--------|
| Agent context bloat | Keep system prompt ≤5K; reference don't paste | High quality, lower cost |
| Skill over-loading | Progressive disclosure; references for deep content | 40+ skills at ~4K overhead total |
| Long agent runs | Compact at 70% fill; reset at task boundaries | Prevents context rot |
| Agent pipeline poisoning | QA agent after each batch; validate output schemas | Prevents cascading errors |
| Cross-agent knowledge | Write to `/tmp/` files; orchestrator passes selectively | Clean isolation |
| Model selection | Haiku for mechanics, Sonnet for default, Opus for architecture | 10–18× cost savings |
| Skill triggering | Explicit keyword-dense descriptions; "TRIGGER when:" prefix | Better coverage |
| Long-running knowledge | ACE pattern: add to LESSONS.md, never wholesale-replace | Prevents context collapse |

**Core principle:** The smallest possible set of high-signal tokens that maximizes the probability of the desired outcome. Every token in context is a cost, an attention consumer, and a potential distractor. Earn its place.
