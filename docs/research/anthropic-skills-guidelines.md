# Anthropic Official Guidelines: Claude Code Skills & Slash Commands

> Research date: 2026-03-08
> Sources: code.claude.com/docs (official Claude Code documentation)

---

## 1. What is a Claude Code Skill / Slash Command?

### Definition and Purpose

A **skill** extends what Claude can do in Claude Code. You create a `SKILL.md` file with instructions, and Claude adds it to its toolkit. Claude uses skills when relevant, or you can invoke one directly with `/skill-name`.

Skills follow the [Agent Skills](https://agentskills.io) open standard, which works across multiple AI tools. Claude Code extends the standard with:
- Invocation control (disable-model-invocation, user-invocable)
- Subagent execution (`context: fork`)
- Dynamic context injection (`!`command`` syntax)

**Key insight**: Skills are prompt-based, not code-based. They give Claude a playbook and let it orchestrate work using its tools.

### How They Are Loaded and Triggered

Skills have two-phase loading:
1. **Description phase**: Skill descriptions are always loaded into context (so Claude knows what's available)
2. **Full load phase**: Full skill content only loads when the skill is actually invoked

Triggering happens two ways:
- **User invocation**: Type `/skill-name [arguments]`
- **Auto-invocation**: Claude loads a skill automatically when it determines the skill is relevant to your prompt (based on the `description` field)

The character budget for skill descriptions is **2% of context window** (fallback: 16,000 chars). Beyond that limit, skills may be excluded.

### Difference Between Global and Project Skills

| Location   | Path                                      | Applies to              | Priority |
|:-----------|:------------------------------------------|:------------------------|:---------|
| Enterprise | `/etc/claude-code/CLAUDE.md` (Linux/WSL)  | All org users           | Highest  |
| Personal   | `~/.claude/skills/<name>/SKILL.md`        | All your projects       | High     |
| Project    | `.claude/skills/<name>/SKILL.md`          | This project only       | Medium   |
| Plugin     | `<plugin>/skills/<name>/SKILL.md`         | Where plugin is enabled | Namespaced |

**Priority rule**: When skills share the same name, enterprise > personal > project wins. Plugin skills use `plugin-name:skill-name` namespace to avoid conflicts.

**Legacy compatibility**: `.claude/commands/review.md` and `.claude/skills/review/SKILL.md` both create `/review` and work the same way. Skills are preferred (more features). If both exist with same name, skill takes precedence.

---

## 2. How to Write an Effective Skill

### Recommended File Structure

Each skill is a **directory** with `SKILL.md` as the entrypoint:

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples/
│   └── sample.md      # Example output showing expected format
└── scripts/
    └── validate.sh    # Script Claude can execute
```

Keep `SKILL.md` under **500 lines**. Move detailed reference material to separate files and reference them from SKILL.md.

### SKILL.md Structure: Frontmatter + Markdown

Every `SKILL.md` has two parts:
1. **YAML frontmatter** (between `---` markers): controls behavior
2. **Markdown content**: instructions Claude follows when skill is invoked

```yaml
---
name: explain-code
description: Explains code with visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when the user asks "how does this work?"
---

When explaining code, always include:

1. **Start with an analogy**: Compare the code to something from everyday life
2. **Draw a diagram**: Use ASCII art to show the flow, structure, or relationships
3. **Walk through the code**: Explain step-by-step what happens
4. **Highlight a gotcha**: What's a common mistake or misconception?
```

### Frontmatter Reference (All Fields)

| Field                      | Required    | Description |
|:---------------------------|:------------|:------------|
| `name`                     | No          | Slash command name. Uses directory name if omitted. Lowercase, numbers, hyphens only (max 64 chars). |
| `description`              | **Recommended** | What it does and WHEN to use it. Claude uses this for auto-invocation decisions. Falls back to first markdown paragraph. |
| `argument-hint`            | No          | Autocomplete hint, e.g. `[issue-number]` or `[filename] [format]` |
| `disable-model-invocation` | No          | `true` = only you can invoke it (not Claude). Default: `false` |
| `user-invocable`           | No          | `false` = hide from `/` menu (Claude can still invoke). Default: `true` |
| `allowed-tools`            | No          | Tools Claude can use without per-use approval when skill is active |
| `model`                    | No          | Model to use when skill is active |
| `context`                  | No          | `fork` = run in isolated subagent |
| `agent`                    | No          | Subagent type for `context: fork` (e.g., `Explore`, `Plan`, `general-purpose`) |
| `hooks`                    | No          | Lifecycle hooks scoped to this skill |

### What to Put in the Description

The `description` field is critical — it determines when Claude auto-invokes the skill. Best practices:
- Include **keywords users would naturally say**
- Specify trigger conditions explicitly: "Use when the user asks 'how does this work?'"
- Be specific enough to avoid false positives, broad enough to catch real use cases
- If `description` is omitted, Claude uses the first paragraph of markdown content

### Trigger Conditions

| Frontmatter                      | User can invoke | Claude can invoke | Context loading |
|:---------------------------------|:----------------|:------------------|:----------------|
| (default)                        | Yes             | Yes               | Description always in context, full skill loads on invoke |
| `disable-model-invocation: true` | Yes             | No                | Description NOT in context, full skill loads when you invoke |
| `user-invocable: false`          | No              | Yes               | Description always in context, full skill loads on invoke |

**Rule of thumb**: Use `disable-model-invocation: true` for skills with side effects (deploy, commit, send messages) — you don't want Claude triggering these automatically.

### Best Practices for Skill Content

**Two types of content:**

1. **Reference content**: Background knowledge Claude applies to current work. Conventions, patterns, style guides. Runs inline alongside conversation context.
   ```yaml
   ---
   name: api-conventions
   description: API design patterns for this codebase
   ---
   When writing API endpoints:
   - Use RESTful naming conventions
   - Return consistent error formats
   ```

2. **Task content**: Step-by-step instructions for a specific action. Use `disable-model-invocation: true` for these.
   ```yaml
   ---
   name: deploy
   description: Deploy the application to production
   disable-model-invocation: true
   ---
   1. Run the test suite
   2. Build the application
   3. Push to the deployment target
   ```

**General content best practices:**
- Keep SKILL.md under 500 lines
- Reference supporting files explicitly so Claude knows they exist
- Use numbered steps for procedural tasks
- Include specific commands, not vague instructions

---

## 3. CLAUDE.md vs `.claude/skills/` — When to Use Which

### CLAUDE.md: Always-on Project Memory

CLAUDE.md files give Claude **persistent instructions** loaded every session. Use for:
- Project architecture and conventions
- Build/test commands
- Coding standards that apply to all work in the project
- Instructions that should ALWAYS be active

**Size limit**: Target under **200 lines** per CLAUDE.md. Longer files consume more context and reduce adherence.

### `.claude/skills/`: On-demand Expertise

Skills only load when invoked (or when Claude decides they're relevant). Use for:
- Task-specific workflows (commit, deploy, review)
- Domain expertise that isn't always needed
- Complex playbooks with many steps

**Key distinction** (from official docs):
> "Rules load into context every session or when matching files are opened. For task-specific instructions that don't need to be in context all the time, use skills instead, which only load when you invoke them or when Claude determines they're relevant to your prompt."

### `.claude/rules/`: Scoped Project Instructions

The `.claude/rules/` directory organizes instructions that load conditionally:
- Without `paths` frontmatter: loaded like `.claude/CLAUDE.md` (every session)
- With `paths` frontmatter: load only when Claude works with matching files

```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API Development Rules
- All endpoints must include input validation
```

### Priority Order (Highest to Lowest)

1. Managed policy CLAUDE.md (`/etc/claude-code/CLAUDE.md`) — cannot be excluded
2. User CLAUDE.md (`~/.claude/CLAUDE.md`)
3. Project CLAUDE.md (`./CLAUDE.md` or `./.claude/CLAUDE.md`)
4. Local CLAUDE.md (`./CLAUDE.local.md`) — not version-controlled

For skills: enterprise > personal > project (same name conflict resolution).

### Decision Matrix

| Use case | Use |
|----------|-----|
| Always-on coding conventions | CLAUDE.md |
| Project architecture docs | CLAUDE.md |
| Personal preferences across projects | `~/.claude/CLAUDE.md` |
| Deploy workflow | `.claude/skills/deploy/SKILL.md` with `disable-model-invocation: true` |
| Code review playbook | `.claude/skills/review/SKILL.md` |
| TypeScript-only rules | `.claude/rules/typescript.md` with `paths: ["**/*.ts"]` |
| Reusable knowledge (invoked when relevant) | `.claude/skills/` with good `description` |

---

## 4. Prompt Engineering Best Practices for Skills

### Write Deterministic Instructions

- **Concrete over vague**: "Use 2-space indentation" not "format code nicely"
- **Verifiable**: Instructions should be checkable: "Run `npm test` before committing"
- **Numbered steps**: For procedures, use numbered lists — order matters
- **Avoid hedging**: Don't write "try to" or "consider" — write what Claude must do

### Avoid Ambiguity

- Check for **conflicting rules** across CLAUDE.md files and rules — Claude may pick arbitrarily
- **Specific triggers**: In `description`, use exact user phrases: `when the user asks "how does this work?"`
- **Separate concerns**: One topic per rules file, one workflow per skill
- **Explicit scope**: Don't assume — state where rules apply (file types, directories, situations)

### Structure Complex Instructions

- **Headers**: Use markdown headers to group related steps
- **Supporting files**: Move detailed reference material to `reference.md` — reference it from SKILL.md
- **Size constraint**: SKILL.md under 500 lines, CLAUDE.md under 200 lines
- **Progressive loading**: Put what Claude always needs in SKILL.md, details in linked files

### Arguments and Dynamic Context

Use `$ARGUMENTS` for parameterized skills:
```yaml
---
name: fix-issue
description: Fix a GitHub issue by number
disable-model-invocation: true
argument-hint: "[issue-number]"
---
Fix GitHub issue $ARGUMENTS following our coding standards.
1. Read the issue description
2. Implement the fix
3. Write tests
```

Use `$ARGUMENTS[N]` or `$N` for positional args:
```yaml
Migrate the $0 component from $1 to $2.
```

Use `!`command`` for dynamic context injection (runs before Claude sees anything):
```yaml
## Current PR context
- Diff: !`gh pr diff`
- Files changed: !`gh pr diff --name-only`
```

Available substitutions: `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`

---

## 5. Agent-Skill Coupling

### How Skills Interact with Subagents

Two complementary patterns:

| Approach | System prompt | Task | Also loads |
|:---------|:--------------|:-----|:-----------|
| Skill with `context: fork` | From agent type (Explore, Plan, etc.) | SKILL.md content | CLAUDE.md |
| Subagent with `skills` field | Subagent's markdown body | Claude's delegation message | Preloaded skills + CLAUDE.md |

**Pattern 1: Skill drives subagent** (`context: fork`)
```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---
Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

The skill content becomes the subagent's prompt. The `agent` field selects execution environment. Results return to main conversation.

**Pattern 2: Subagent uses skills as reference** (via `.claude/agents/` + `skills` field in agent definition)
- Full skill content is injected at agent startup (unlike regular sessions where only descriptions load)
- Subagents with preloaded skills receive full skill content in their system context

### systemPrompt vs Skill Injection

- **CLAUDE.md / systemPrompt**: Always-on context, every session. Use for constraints and conventions.
- **Skill injection**: On-demand, only when relevant. Use for specialized knowledge or workflows.
- **Subagent preloaded skills**: Full content injected at agent startup — use when the agent always needs the skill's knowledge.

### Anthropic's Building Effective Agents Guidance

From [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents):

1. **Start simple**: Begin with simple prompts and single LLM calls. Only add complexity when simpler approaches fail.
2. **ACI design**: Invest in tool documentation as much as UI design. Include example usage, edge cases, input requirements, and clear boundaries between similar tools.
3. **Format selection**: Choose formats closer to natural language the model sees online. Avoid artificial overhead.
4. **Cognitive load**: Provide sufficient context for Claude to "think" before committing — prevents errors from premature decisions.
5. **Poka-yoke**: Structure arguments and instructions to make mistakes harder to commit.
6. **Transparency**: Show planning steps explicitly. Don't hide intermediate reasoning.
7. **Measure before optimizing**: Iterate on prompts and measure performance before architectural changes.

---

## Summary: Quick Reference for Open-Agents Skill Writing

### Minimal viable skill

```yaml
---
name: my-skill
description: Does X. Use when the user asks Y or mentions Z.
---

## Task
Step-by-step instructions here.
1. First do this
2. Then do that
```

### Full-featured skill template

```yaml
---
name: my-skill
description: One sentence on what it does + when Claude should auto-trigger it.
argument-hint: "[arg1] [arg2]"
disable-model-invocation: true   # omit if Claude should auto-invoke
user-invocable: true             # set false for background-only skills
allowed-tools: Read, Grep, Bash(git *)
context: fork                    # omit to run inline
agent: Explore                   # or Plan, general-purpose, custom agent name
---

## Context
$ARGUMENTS

## Task
Numbered steps...

## Quality rules
- Specific, verifiable requirements

## Additional resources
- For details, see [reference.md](reference.md)
```

### Checklist before publishing a skill

- [ ] Description contains natural-language trigger phrases
- [ ] SKILL.md is under 500 lines
- [ ] `disable-model-invocation` is set correctly for side-effect tasks
- [ ] Arguments use `$ARGUMENTS` or `$N` placeholders
- [ ] No conflicting instructions with other skills/CLAUDE.md
- [ ] Supporting files are referenced explicitly in SKILL.md
- [ ] Tested with both direct invocation and natural-language trigger

---

*Sources: [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills), [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory), [anthropic.com/research/building-effective-agents](https://www.anthropic.com/research/building-effective-agents)*
