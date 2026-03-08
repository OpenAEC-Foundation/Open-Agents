# Skill Performance Competitor Analysis
## How Leading AI Platforms Build Rules/Context/Skills Systems

**Research date:** 2026-03-08
**Scope:** Cursor, GitHub Copilot, Windsurf, Continue.dev vs Claude Code skills
**Goal:** Derive best-practice patterns for Open-Agents SKILL.md format

---

## A. Platform Comparison Table

| Platform | Mechanism | Max Size | Auto-Trigger? | Structure | What Works Well |
|----------|-----------|----------|---------------|-----------|-----------------|
| **Cursor** | `.cursor/rules/*.mdc` (project) or `.cursorrules` (legacy) | ~500 lines per file | Yes — `alwaysApply`, glob-match, or agent-decided | YAML frontmatter + Markdown body | File-glob scoping; composable rule files; MDC format for fine control |
| **GitHub Copilot** | `.github/copilot-instructions.md` (repo-wide) + `.github/instructions/**/*.instructions.md` (path-specific) | ~1,000 lines recommended | Yes — always loaded per chat/agent request | Plain Markdown with headers + bullet points | Path-specific instruction files; version-controlled; short imperative directives |
| **Windsurf** | `.windsurf/rules/*.md` (workspace) + global `global_rules.md` | 12,000 chars/workspace file; 6,000 chars global | Yes — Cascade retrieves when relevant; auto-generated Memories supplement | Markdown files with GUI wrapper | Two-layer system (global + workspace); auto-generated Memories for cross-session context |
| **Continue.dev** | `.continue/rules/` files + MCP context providers + config.yaml | Not publicly capped | Partial — rules loaded based on agent mode; MCP servers on-demand | YAML config + Markdown rule files | MCP server integration; model-role separation (chat vs autocomplete); codebase + repo-map providers |
| **Claude Code** | `.claude/skills/<name>/SKILL.md` + CLAUDE.md + hooks | ~500 lines SKILL.md (guideline) | Yes — description-based auto-load; or `/skill-name` explicit; or `user-invocable: false` | YAML frontmatter + Markdown body + supporting files directory | `context: fork` isolation; `!command` dynamic injection; allowed-tools scoping; subagent delegation; hooks lifecycle; 4 invocation modes |

---

## B. Universal Patterns (Works on All Platforms)

### Structural patterns found everywhere

1. **YAML frontmatter + Markdown body**
   Every platform that has evolved past v1 uses structured metadata (YAML/frontmatter) separate from prose content. This allows tooling to parse intent without reading the full document.

2. **Scope/glob-based targeting**
   Cursor (globs), Copilot (path-specific `*.instructions.md`), Windsurf (workspace vs global), Claude Code (project vs personal vs enterprise). **Lesson: rules should be scoped, not monolithic.**

3. **Short, imperative directives beat narrative prose**
   All platforms (especially Copilot docs) emphasize bullet points + headers over paragraph explanations. The AI parses directives faster and more reliably than stories.

4. **Size limits exist and matter**
   Cursor: 500 lines. Copilot: 1,000 lines. Windsurf: 12K chars. Claude Code: 500 lines guideline. Violating these degrades response quality. **Split large rules into composable units.**

5. **Version-control as first-class citizen**
   Every platform recommends committing rules to the repo. Treat rules like source code — iterative, reviewed, updated.

6. **Start minimal, grow iteratively**
   All platforms recommend starting with 10–20 specific rules and adding more based on observed failures. Do not pre-populate rules speculatively.

### Content types that universally perform well

- **Tech stack declaration** — explicit language/framework declarations (always effective)
- **Naming conventions** — consistent token patterns the model can follow reliably
- **Error handling style** — "how to handle errors in this codebase" is highly repetitive value
- **Project structure map** — directory layout + module responsibilities
- **Anti-patterns** — explicit "never do X" is more effective than "prefer Y"
- **Example code snippets** — concrete examples outperform abstract rules

### Gaps no platform solves well (opportunities)

1. **Cross-session memory with human oversight** — Windsurf Memories auto-generate but are opaque. Copilot/Cursor have no memory at all. **Gap: auditable persistent memory with user approval.**
2. **Conditional rules** — No platform supports `if file matches X then load rule Y` at rule-level. Cursor globs come closest but are static.
3. **Dynamic context injection at skill runtime** — Only Claude Code supports `!command` to inject live CLI output. Others are static files only.
4. **Parallel skill execution** — Only Claude Code (`context: fork` + `agent`) supports spawning parallel subagents from within a skill.
5. **Skill composition** — Skills referencing other skills. Only Claude Code has a supporting-files directory structure.

---

## C. Claude Code Unique Advantages

### What Claude Code can do that others cannot

| Feature | Claude Code | Others |
|---------|-------------|--------|
| **`context: fork`** | Runs skill in isolated subagent context | Not available anywhere |
| **`agent: Explore/Plan/general-purpose`** | Choose subagent type per skill | Not available |
| **`!command` dynamic injection** | Shell output injected before Claude sees prompt | Static files only |
| **`allowed-tools` per skill** | Scope tool permissions at skill level | Not available |
| **`hooks` in frontmatter** | Lifecycle automation (PreToolUse, PostToolUse, etc.) | Not available |
| **`disable-model-invocation`** | Prevent Claude from auto-triggering dangerous skills | Not available |
| **Supporting files directory** | `SKILL.md` + `examples/`, `scripts/`, `templates/` | Not available |
| **`user-invocable: false`** | Background knowledge skills invisible to user | Not available |
| **Enterprise scope** | Organization-wide managed skills | Only Copilot has org-level rules |
| **Nested monorepo discovery** | Auto-discovers skills from subdirectory `.claude/skills/` | Not available |
| **`$ARGUMENTS` / `$N` substitution** | Positional arg injection into skill body | Not available |
| **`${CLAUDE_SKILL_DIR}`** | Self-referential path for bundled scripts | Not available |
| **Open standard (agentskills.io)** | Portable across multiple AI tools | Proprietary formats |

### How `context: fork` enables unique patterns

```yaml
context: fork
agent: Explore
```
- Creates an **isolated context** — no conversation history pollution
- Subagent receives skill content as its task
- Results are summarized back to main conversation
- **Use case:** Research tasks, parallel analysis, destructive operations that shouldn't affect main session

### How `!command` enables dynamic context

```yaml
---
name: pr-review
allowed-tools: Bash(gh *)
---
## Live context
- Diff: !`gh pr diff`
- Comments: !`gh pr view --comments`
- CI status: !`gh pr checks`
```

**Key insight:** Commands execute BEFORE Claude sees the prompt. Claude receives already-rendered data. This is **preprocessing**, not tool calling. No other platform has this.

**Practical uses:**
- Inject current git log, recent commits, branch status
- Inject API schema from live endpoint
- Inject environment variables, config files
- Inject test results, coverage reports

### How hooks extend skill power

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "echo 'Bash about to run: $CLAUDE_TOOL_INPUT' >> audit.log"
```

Hooks allow:
- **Pre-validation**: block dangerous operations
- **Post-processing**: transform outputs
- **Audit trails**: log all tool use
- **Integration**: trigger external systems

---

## D. Lessons for Open-Agents Skill Format

### What to DO (from platform research)

1. **Always include a precise `description`** — This is how Claude decides when to auto-load. Be specific about triggers: "Use when the user asks how X works" not "Explains X".

2. **Use `disable-model-invocation: true` for side-effect skills** — Deploy, commit, send-message, destructive operations. Never let the agent decide to deploy because code looks ready.

3. **`context: fork` for isolation** — Any research task, any parallel workload, any long-running analysis. Prevents context pollution.

4. **Scope `allowed-tools` tightly** — Read-only skills: `Read, Grep, Glob`. Write skills: `Read, Edit, Write`. Never open-ended unless necessary.

5. **Use `!command` for live data** — Instead of asking Claude to run `git log`, inject it directly. Faster, more reliable, costs fewer tokens.

6. **Support files directory** — Put large reference docs in `reference.md`, examples in `examples/`, scripts in `scripts/`. Keep SKILL.md under 200 lines.

7. **Include `argument-hint`** — Tells users what args to pass: `[issue-number]` or `[filename] [format]`. Improves DX.

8. **Be concrete, not abstract** — "Always use `const` for variables that don't change" beats "prefer immutability where possible".

### What to AVOID (from platform failure modes)

1. **Don't duplicate CLAUDE.md content in SKILL.md** — The project context is already loaded. Skills should ADD, not repeat.

2. **Don't write narrative prose** — Bullets > paragraphs. The model parses imperatives faster.

3. **Don't monolith** — One skill file > 500 lines is a warning sign. Split into composable units.

4. **Don't auto-trigger dangerous skills** — Windsurf and Cursor both suffer from agent over-triggering. Use `disable-model-invocation: true` liberally.

5. **Don't document edge cases** — Rules for rare scenarios waste token budget. Focus on the 80% case repeated daily.

6. **Don't hardcode paths** — Use `${CLAUDE_SKILL_DIR}` for portability. Absolute paths break on other machines.

7. **Don't skip `context: fork` for research** — Running research in main context pollutes conversation history and wastes tokens.

---

## E. Open-Agents Competitive Positioning

Based on this analysis, Open-Agents skills have the most technically capable foundation of any platform. The gaps are in:

1. **Discoverability** — No skill marketplace or hub (Copilot and Continue.dev have hubs)
2. **Debugging** — No skill-level observability (which skills fired, why, with what result)
3. **Templates** — Library templates not yet in a shareable format

Recommendation: leverage Claude Code's unique `context: fork` + `!command` + `hooks` combination aggressively. These are genuine differentiators no competitor has.

---

## Recommended Format: Open-Agents SKILL.md

This is the exact template every Open-Agents skill should follow:

```markdown
---
name: <kebab-case-name>
description: <What this skill does. Use trigger phrases: "Use when...", "Invoke when the user asks...". Be specific enough for Claude to auto-match correctly.>
argument-hint: <[optional-arg] [optional-arg2]>
context: <fork | omit for inline>
agent: <Explore | Plan | general-purpose | omit if not fork>
allowed-tools: <Read, Grep, Glob | Read, Edit, Write | Bash(git *) | omit for default>
model: <claude/haiku | claude/sonnet | claude/opus | omit for default>
disable-model-invocation: <true | omit — use true for side-effect skills>
user-invocable: <false | omit — use false for background knowledge>
hooks:
  PreToolUse:
    - matcher: "<ToolName>"
      hooks:
        - type: command
          command: "<shell command>"
---

## Purpose
One paragraph: what this skill does and when to use it.

## Dynamic Context (if applicable)
<!-- !`command` blocks inject live data here -->
- Current state: !`git status --short`
- Recent changes: !`git log --oneline -5`

## Instructions
<!-- Short, imperative bullet points. No narrative. -->
1. Step one — concrete action
2. Step two — concrete action
3. Step three — concrete action

**Rules:**
- Always do X
- Never do Y
- When Z, prefer W

## Output Format
<!-- Exact format Claude should produce -->
- Type: [markdown | JSON | plain text]
- Structure: [describe sections/fields]

## References
<!-- Point to supporting files, not inline -->
- For API details, see [reference.md](reference.md)
- For examples, see [examples/](examples/)
```

### Supporting files convention

```
<skill-name>/
├── SKILL.md           # Main skill (< 200 lines)
├── reference.md       # Detailed reference (loaded on demand)
├── examples/
│   ├── good.md        # Positive examples
│   └── bad.md         # Anti-patterns to avoid
└── scripts/
    └── helper.sh      # Bash/Python utilities
```

### Model selection in skills

| Skill type | Recommended model | Rationale |
|------------|-------------------|-----------|
| Scanning, listing, analysis | `claude/haiku` | Fast, cheap |
| Writing, coding, implementation | `claude/sonnet` | Balanced (default) |
| Architecture, deep reasoning | `claude/opus` | Maximum depth |
| Research with `context: fork` | `claude/sonnet` | Good breadth |
| Review/QA skills | `claude/sonnet` | Needs judgment |

---

*Sources: Cursor Docs (cursor.com/docs/context/rules), GitHub Blog (5 tips for Copilot instructions), Windsurf Docs (docs.windsurf.com), Continue.dev Docs (docs.continue.dev), Claude Code Docs (code.claude.com/docs/en/skills), PromptHub Blog, awesome-cursorrules (GitHub), awesome-copilot (GitHub)*
