# Spawning Agents

The `oa run` command is the core of Open-Agents. This page covers all its options.

---

## Basic syntax

```bash
oa run "<task>" [options]
```

The task is a natural language description of what you want the agent to do. Be specific — the more detail you provide, the better the output.

---

## All options

| Option | Description | Example |
|--------|-------------|---------|
| `--name NAME` | Agent name (auto-generated if omitted) | `--name my-agent` |
| `--model MODEL` | AI model to use | `--model claude/sonnet` |
| `--direct` | Write directly to project (skip proposals) | `--direct` |
| `--template TEMPLATE` | Use an agent template from the library | `--template research-swarm` |
| `--parent NAME` | Set parent agent (for nested hierarchies) | `--parent orchestrator` |
| `--workspace DIR` | Use an existing workspace directory | `--workspace /tmp/my-ws` |
| `--prompt-file FILE` | Read the task from a file | `--prompt-file /tmp/task.txt` |

---

## --name

Give your agent a meaningful name. Names must be unique among running agents.

```bash
oa run "Analyze the sales data in data/sales.csv" --name sales-analyst --model claude/sonnet --direct
```

If you omit `--name`, Open-Agents generates one automatically (e.g., `agent-a4b2`).

**Naming conventions:**

- Use lowercase with hyphens: `code-reviewer`, `api-documenter`
- Include the role or domain: `backend-tester`, `data-analyst`
- For parallel agents on the same task, add a number: `researcher-1`, `researcher-2`

---

## --model

Choose the right model for your task. See [Models](models.md) for a full comparison.

```bash
# Fast, cheap — good for formatting, simple tasks
oa run "Convert this JSON to CSV" --name converter --model claude/haiku --direct

# Balanced — the default for most tasks
oa run "Implement a REST API for user management" --name api-builder --model claude/sonnet --direct

# Maximum reasoning — for complex architecture, deep analysis
oa run "Design a microservices architecture for our e-commerce platform" --name architect --model claude/opus --direct
```

**Available models:**

| Model | ID | Best for |
|-------|----|---------|
| Claude Haiku | `claude/haiku` | Simple tasks, formatting, batch work |
| Claude Sonnet | `claude/sonnet` | Most tasks (default recommendation) |
| Claude Opus | `claude/opus` | Architecture, complex reasoning |
| Ollama | `ollama/<model>` | Local models, offline, free |

---

## --direct

By default, agents work in an isolated workspace. `--direct` makes the agent write to your current directory instead.

```bash
# Works in /tmp/oa-workspaces/my-agent-xxx/ (isolated)
oa run "Write a login component" --name ui-builder --model claude/sonnet

# Works in your current directory (e.g., /home/you/my-project/)
oa run "Write a login component in src/components/Login.tsx" --name ui-builder --model claude/sonnet --direct
```

!!! tip "Always use --direct"
    In practice, you almost always want `--direct`. Without it, the agent works in isolation and you need to manually copy files out. With `--direct`, changes land directly where you need them.

---

## --template

Use a pre-built agent template from the library:

```bash
oa run --template research-swarm "What are the key trends in AI for 2025?"
```

Templates include pre-written instructions, model hints, and structured output formats. See [Agent Templates](templates.md) for details.

---

## --parent

Set the parent agent for nested hierarchies. Used when an agent spawns sub-agents:

```bash
# Parent agent spawns children with --parent set
oa run "Research React 19" --name react-researcher --model claude/sonnet --parent orchestrator --direct
oa run "Research Vue 4" --name vue-researcher --model claude/sonnet --parent orchestrator --direct
```

This makes the hierarchy visible in `oa status` and enables proper message routing.

---

## --prompt-file

When your task contains special characters, multi-line content, or shell metacharacters, use `--prompt-file` instead of inline text:

```bash
# Write your task to a file
cat > /tmp/task.txt << 'EOF'
Refactor the `parse_user()` function in src/utils.py.
It's broken when input contains $special chars or it's > 100 chars.
Also add proper type annotations and update the docstring.
EOF

# Spawn the agent with the file
oa run --prompt-file /tmp/task.txt --name refactor-agent --model claude/sonnet --direct
```

This avoids shell escaping issues with quotes, backticks, and variables.

---

## Parallel spawning

There's no `--parallel` flag — just run multiple `oa run` commands. They all start immediately:

```bash
oa run "Write unit tests for auth.py" --name test-auth --model claude/sonnet --direct
oa run "Write unit tests for api.py" --name test-api --model claude/sonnet --direct
oa run "Write unit tests for models.py" --name test-models --model claude/sonnet --direct
oa run "Write unit tests for utils.py" --name test-utils --model claude/sonnet --direct
```

All four agents run in parallel. Watch them all:

```bash
oa status
```

```
┌────────────┬────────┬─────────┬──────────────────────────────────┐
│ NAME       │ MODEL  │ STATUS  │ TASK                             │
├────────────┼────────┼─────────┼──────────────────────────────────┤
│ test-auth  │ sonnet │ running │ Write unit tests for auth.py     │
│ test-api   │ sonnet │ running │ Write unit tests for api.py      │
│ test-models│ sonnet │ running │ Write unit tests for models.py   │
│ test-utils │ sonnet │  done   │ Write unit tests for utils.py    │
└────────────┴────────┴─────────┴──────────────────────────────────┘
```

---

## Writing good task prompts

The quality of the agent's output depends heavily on the task description.

**Too vague:**
```bash
oa run "Fix the bug" --name fixer --model claude/sonnet --direct
```

**Much better:**
```bash
oa run "Fix the KeyError in src/api/users.py:45 — when a user doesn't have a 'role' field, the endpoint crashes. Add a fallback to 'viewer' role and write a test for this case." --name fixer --model claude/sonnet --direct
```

**Tips for good prompts:**
- Specify file paths (absolute when possible)
- Describe the expected output, not just the problem
- Include constraints (e.g., "don't modify the public API")
- Mention where to write results

---

## Next steps

→ [Agent Templates](templates.md) — Pre-built prompts for common tasks
→ [Multi-Agent Workflows](workflows.md) — Coordinate multiple agents
→ [Models](models.md) — Choose the right model for each task
