# Multi-Agent Workflows

Orchestrating multiple agents together unlocks the real power of Open-Agents. This page covers the most useful patterns.

---

## Why multi-agent?

A single agent handles one task at a time. With multiple agents you can:

- **Parallelize** — 4 agents write 4 modules simultaneously instead of sequentially
- **Specialize** — one agent researches, one writes, one reviews
- **Scale** — 20 agents process 20 files in the time it would take one to do 1
- **Validate** — a separate reviewer catches errors the writer missed

---

## Pattern 1: Research Swarm

**Use for:** Comprehensive research on a topic that requires multiple angles.

**Structure:** 3+ parallel researchers → 1 combiner

```bash
# Step 1: Spawn parallel researchers
oa run "Research React 19 new features — focus on compiler improvements" \
  --name research-compiler --model claude/sonnet --direct

oa run "Research React 19 new features — focus on concurrent rendering" \
  --name research-concurrent --model claude/sonnet --direct

oa run "Research React 19 new features — focus on new hooks and APIs" \
  --name research-hooks --model claude/sonnet --direct

# Step 2: Wait for them to finish
oa status  # check until all show 'done'

# Step 3: Collect results
oa collect research-compiler > /tmp/compiler.md
oa collect research-concurrent > /tmp/concurrent.md
oa collect research-hooks > /tmp/hooks.md

# Step 4: Spawn a combiner
oa run "Combine these three research reports into one comprehensive guide on React 19.
Read: /tmp/compiler.md, /tmp/concurrent.md, /tmp/hooks.md.
Write a unified, well-structured Markdown document." \
  --name research-combiner --model claude/opus --direct
```

---

## Pattern 2: Build Pipeline

**Use for:** Implementing a feature end-to-end with planner, builders, and validator.

**Structure:** 1 planner → N parallel builders → 1 validator

```bash
# Step 1: Planner creates the architecture
oa run "Plan the implementation of a user authentication system for a Flask API.
Output a JSON plan with subtasks, file paths, and dependencies.
Write to /tmp/auth-plan.json" \
  --name auth-planner --model claude/opus --direct

# Step 2: Wait for plan, then spawn builders
# (after auth-planner is done)
oa run "Implement the auth models in src/models/user.py per /tmp/auth-plan.json" \
  --name build-models --model claude/sonnet --direct

oa run "Implement the auth routes in src/routes/auth.py per /tmp/auth-plan.json" \
  --name build-routes --model claude/sonnet --direct

oa run "Implement JWT middleware in src/middleware/auth.py per /tmp/auth-plan.json" \
  --name build-middleware --model claude/sonnet --direct

# Step 3: Validate after builders finish
oa run "Review the auth implementation across src/models/user.py, src/routes/auth.py,
and src/middleware/auth.py. Check for security issues, missing edge cases,
and API consistency. Write findings to output/review.md" \
  --name auth-validator --model claude/opus --direct
```

**Shortcut:** Use `oa pipeline` to automate this pattern:

```bash
oa pipeline "Build a user authentication system for Flask with JWT, models, routes, and middleware"
```

`oa pipeline` automatically spawns a planner, parallel workers, and a combiner.

---

## Pattern 3: Review Chain

**Use for:** Quality-critical output where a second pair of eyes is essential.

**Structure:** 1 writer → 1 reviewer → 1 fixer (if needed)

```bash
# Step 1: Writer
oa run "Write a technical blog post about async Python patterns (1500 words).
Target audience: intermediate Python developers.
Write to /tmp/blog-draft.md" \
  --name blog-writer --model claude/sonnet --direct

# Step 2: Reviewer (after writer is done)
oa run "Review the blog post at /tmp/blog-draft.md.
Check: technical accuracy, clarity, code examples, flow.
Rate each dimension 1-10 and list specific improvements needed.
Write to /tmp/blog-review.md" \
  --name blog-reviewer --model claude/opus --direct

# Step 3: Fixer (if review score is < 8)
oa run "Revise /tmp/blog-draft.md based on the review at /tmp/blog-review.md.
Address every issue mentioned. Write final version to /tmp/blog-final.md" \
  --name blog-fixer --model claude/sonnet --direct
```

---

## Pattern 4: Batch Processor

**Use for:** Applying the same transformation to many files.

**Structure:** N parallel workers (one per file/item)

```bash
# Process 5 Python files in parallel
for f in auth.py api.py models.py utils.py config.py; do
  oa run "Add Google-style docstrings to all functions in src/$f.
  Do not change any logic. Only add or improve docstrings." \
    --name "docstring-$f" --model claude/haiku --direct
done

# Check progress
oa status
```

Using Haiku for this — it's fast and cheap for simple formatting tasks.

---

## Using oa pipeline

For the build pipeline pattern, `oa pipeline` automates the whole flow:

```bash
oa pipeline "Build a CSV validator library with:
- Validation rules engine
- CLI interface
- Unit tests (pytest)
- README with examples"
```

What happens:

1. **Planner agent** (Opus) analyzes the task and creates a structured plan
2. **Worker agents** (Sonnet) implement each subtask in parallel
3. **Combiner agent** (Sonnet) integrates all outputs into a coherent whole

Monitor the pipeline:

```bash
oa status
```

Pipeline agents are named `pipe-<timestamp>-planner`, `pipe-<timestamp>-worker-1`, etc.

---

## Coordination via messaging

Agents can communicate with each other using the messaging system:

```bash
# Send a message to a specific agent
oa send researcher-agent "Focus on 2024-2025 publications only" --from meta

# Check an agent's inbox
oa inbox researcher-agent --unread

# Broadcast to all running agents
oa broadcast "Wrap up your current task, session ending in 10 minutes" --from meta
```

This is useful when you need to redirect an agent mid-task without killing and restarting it.

---

## Nested agents (agent trees)

Agents can spawn their own sub-agents using `oa run` from within their tmux session. This creates agent trees up to 6 levels deep:

```
meta (you)
└── orchestrator-agent
    ├── research-1
    ├── research-2
    └── combiner-agent
        └── formatter-agent
```

When spawning from within an agent, always pass `--parent <my-name>` so the hierarchy is visible in `oa status`.

---

## Next steps

→ [Feedback Loop](feedback-loop.md) — How agents report back and how to respond
→ [CLI Reference](../reference/cli.md) — Full command reference
→ [Agent Templates](templates.md) — Pre-built workflow templates
