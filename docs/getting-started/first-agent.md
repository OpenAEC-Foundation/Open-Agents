# Your First Agent

Now that you've spawned an agent, let's understand what's actually happening.

---

## What is a workspace?

When you spawn an agent, Open-Agents creates a **temporary workspace directory**:

```
/tmp/oa-workspaces/fib-agent-abc123/
├── CLAUDE.md          ← the agent's instructions
├── output/
│   └── result.md      ← where the agent writes its output
└── .done              ← created when the agent finishes
```

The workspace is an isolated environment for each agent. Agents don't share workspaces by default — each has its own space to work.

---

## How does CLAUDE.md work?

`CLAUDE.md` is the agent's instruction file. When you run `oa run "Write a Fibonacci function" --name fib-agent`, Open-Agents generates a `CLAUDE.md` like this:

```markdown
# Agent: fib-agent

## Task
Write a Python function that calculates Fibonacci numbers

## Output Location
- Results: ./output/result.md
- Completion signal: ./.done

## Rules
- Work autonomously — no confirmation needed
- Write results to output/result.md
- Create .done when finished
```

Claude Code reads this file and knows exactly what to do, where to write output, and how to signal completion.

You can also use `--direct` mode, which tells the agent to write files directly to your project (rather than the isolated workspace). This is useful when you want the agent to edit your actual codebase.

---

## How does the agent read its task?

When spawned, the agent:

1. **Starts Claude Code** in the workspace directory
2. **Reads CLAUDE.md** — this is the first thing Claude Code reads in any directory
3. **Executes the task** — writes code, reads files, uses tools
4. **Writes output** to `output/result.md`
5. **Creates `.done`** — a signal file that tells Open-Agents it's finished

---

## How does the agent write output?

Agents write their final results to `output/result.md`. This is what you see when you run `oa collect fib-agent`.

During execution, you can see real-time output with:

```bash
oa watch fib-agent
```

This streams the agent's tmux terminal — you can see every tool call, file read, and response as it happens.

---

## How do you know when an agent is done?

Several ways:

**1. Check status:**
```bash
oa status
```
When `STATUS` changes from `running` to `done`, the agent has finished.

**2. Watch for the `.done` file:**
The agent creates `/tmp/oa-workspaces/fib-agent-abc123/.done` when it finishes. Open-Agents polls for this file.

**3. Use oa watch:**
```bash
oa watch fib-agent
```
When the tmux pane goes quiet and you see the agent's final output, it's done.

---

## The --direct flag

By default, agents work in their isolated workspace. With `--direct`, the agent writes directly to your current working directory (your actual project):

```bash
# Without --direct: agent works in /tmp/oa-workspaces/...
oa run "Write a Python function" --name writer --model claude/sonnet

# With --direct: agent writes to your project directory
oa run "Add error handling to src/api.py" --name fixer --model claude/sonnet --direct
```

Use `--direct` when you want the agent to:
- Edit files in your existing codebase
- Write to specific paths you reference in the task
- Make changes that should persist after the agent is done

---

## What happens to the workspace after the agent is done?

Workspaces persist until you clean them up. This lets you:
- Collect output at any time with `oa collect`
- Review what the agent did
- Restart an agent from the same workspace

Clean up finished workspaces:

```bash
oa clean          # removes all done/killed workspaces
oa kill fib-agent # stops and removes one specific agent
```

---

## Next steps

→ [Spawning Agents](../guide/spawning.md) — All `oa run` options explained
→ [Multi-Agent Workflows](../guide/workflows.md) — Coordinate multiple agents
→ [Feedback Loop](../guide/feedback-loop.md) — How agents talk to you
