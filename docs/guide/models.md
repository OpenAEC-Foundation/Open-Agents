# Models

Open-Agents works with multiple AI models. This page explains the options, when to use each, and how costs work.

---

## No API costs

**Open-Agents does not use the Anthropic API directly.** It runs agents through the Claude Code CLI, which uses your Claude subscription. This means:

- No per-token charges
- No API key required
- Run 50 agents in parallel — same cost as 1
- All usage is covered by your Claude subscription plan

The only cost is your Claude Code subscription (available at [claude.ai/code](https://claude.ai/code)).

---

## Claude models

### Claude Haiku — `claude/haiku`

**Best for:** Fast, simple tasks. Batch processing. Formatting. Classification.

```bash
oa run "Convert this list of names to JSON format" --name formatter --model claude/haiku --direct
oa run "Add docstrings to all functions in utils.py" --name docstring-writer --model claude/haiku --direct
oa run "Translate these error messages to Dutch" --name translator --model claude/haiku --direct
```

**Characteristics:**
- Fastest model
- Lower quality for complex reasoning
- Ideal for tasks that don't require depth

---

### Claude Sonnet — `claude/sonnet`

**Best for:** Most tasks. The default choice for implementation, research, and code generation.

```bash
oa run "Implement a REST API endpoint for user registration" --name api-builder --model claude/sonnet --direct
oa run "Research the best Python ORM libraries and compare them" --name researcher --model claude/sonnet --direct
oa run "Write unit tests for the auth module" --name test-writer --model claude/sonnet --direct
```

**Characteristics:**
- Balanced quality and speed
- Good at coding, writing, reasoning
- **Recommended default for most agents**

---

### Claude Opus — `claude/opus`

**Best for:** Architecture decisions. Deep reasoning. Complex analysis. Planning.

```bash
oa run "Design the database schema for a multi-tenant SaaS platform" --name db-architect --model claude/opus --direct
oa run "Review this codebase for security vulnerabilities — be thorough" --name security-auditor --model claude/opus --direct
oa run "Create a detailed technical specification for the payment integration" --name spec-writer --model claude/opus --direct
```

**Characteristics:**
- Highest reasoning quality
- Slower than Sonnet
- Use when depth matters more than speed

---

## Choosing the right model

| Task type | Model | Reason |
|-----------|-------|--------|
| Simple formatting, conversion | Haiku | Fast, cheap, sufficient |
| Coding, writing, implementation | Sonnet | Best balance |
| Architecture, design decisions | Opus | Maximum depth |
| QA/review of important output | Sonnet or Opus | Needs judgment |
| Batch processing (many files) | Haiku | Speed over depth |
| Research (broad survey) | Sonnet | Good breadth |
| Research (deep analysis) | Opus | When depth matters |
| Planning (complex projects) | Opus | Highest planning quality |

---

## Local models with Ollama

Open-Agents supports local models via [Ollama](https://ollama.com/). This is useful for:

- Privacy-sensitive tasks
- Offline work
- Experimenting without subscription usage
- Extremely high-volume tasks

### Setup

1. Install Ollama: [ollama.com/download](https://ollama.com/download)
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ollama pull mistral
   ollama pull codellama
   ```
3. Spawn an agent with the Ollama model:
   ```bash
   oa run "Summarize this document" --name summarizer --model ollama/llama3.2 --direct
   ```

### Available Ollama models

Use any model available in your local Ollama instance:

```bash
ollama list  # see what's installed
```

Common choices:

| Model | ID | Use for |
|-------|----|---------|
| Llama 3.2 | `ollama/llama3.2` | General purpose |
| Mistral | `ollama/mistral` | Code and reasoning |
| Code Llama | `ollama/codellama` | Programming tasks |
| Gemma 2 | `ollama/gemma2` | Efficient, fast |

!!! note "Quality expectations"
    Local models are significantly less capable than Claude for complex tasks. Use them for simple, well-defined tasks or when privacy requires it.

---

## Model selection in templates

Templates include a `modelHint` field that recommends the right model:

```json
{
  "id": "architecture-planner",
  "modelHint": "claude/opus"
}
```

When you use `--template` without specifying `--model`, the template's hint is used automatically.

---

## Next steps

→ [Spawning Agents](spawning.md) — How to use `--model` in `oa run`
→ [Agent Templates](templates.md) — Templates with built-in model hints
→ [Multi-Agent Workflows](workflows.md) — Combining different models in a pipeline
