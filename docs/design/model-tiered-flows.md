# Model-Tiered Flows — Design Document

> **Version**: 1.0
> **Date**: 2026-03-07
> **Status**: Proposal
> **Author**: oa-flow-designer

---

## 1. Problem

Open-Agents currently spawns every agent with a single model (typically `claude/sonnet` via `DEFAULT_MODEL` in `spawner.py`). This creates two inefficiencies:

- **Cost waste**: Simple tasks (parsing, validation, JSON generation) use the same expensive model as complex reasoning tasks.
- **No pipeline intelligence**: There is no way to define a multi-model workflow where each stage uses the model best suited for its complexity.

The existing `pipeline.py` (planner → subtasks → combiner) runs all stages on the same model. The `CLAUDE_MODEL_MAP` in `spawner.py` supports `opus`, `sonnet`, `haiku`, and `ollama`, but the choice is per-agent, not per-stage.

---

## 2. Model Tiers

| Tier | Models | Best For | Cost/Speed |
|------|--------|----------|------------|
| **Light** | `claude/haiku`, small ollama | Parsing, validation, JSON generation, file reading, structuring | Fastest, cheapest |
| **Standard** | `claude/sonnet`, medium ollama | Code writing, implementation, skill-backed tasks | Balanced |
| **Deep** | `claude/opus` | Architecture decisions, complex planning, cross-domain coordination, final review | Slowest, most expensive |

---

## 3. Proposed Solution: `oa flow`

### Option A: Inline Stage Definition

```bash
oa flow 'Build a school management system' \
  --stages 'haiku:parse,opus:plan,sonnet:execute,haiku:validate,opus:review'
```

Each stage is `model:action`. Stages run sequentially; each stage's output feeds the next.

### Option B: Flow File (JSON)

```bash
oa flow --file flows/build-school.json
```

```json
{
  "name": "build-school",
  "task": "Build a school management system",
  "stages": [
    {"name": "parse",    "model": "claude/haiku",  "action": "Parse requirements into structured JSON"},
    {"name": "plan",     "model": "claude/opus",   "action": "Create architecture and implementation plan"},
    {"name": "execute",  "model": "claude/sonnet", "action": "Implement the plan", "parallel": true},
    {"name": "validate", "model": "claude/haiku",  "action": "Validate output against requirements"},
    {"name": "review",   "model": "claude/opus",   "action": "Final quality review and recommendations"}
  ]
}
```

### Option C: Smart Auto-Routing

```bash
oa flow 'Build a school management system' --strategy cost-optimized
```

The system classifies each subtask by complexity and assigns models automatically:

| Strategy | Behavior |
|----------|----------|
| `cost-optimized` | Haiku by default, sonnet for code, opus only for architecture |
| `quality-first` | Opus for planning/review, sonnet for execution, haiku for validation |
| `balanced` | Sonnet default, opus for planning, haiku for parsing (recommended) |

---

## 4. Integration with Atomic Agents

Each agent template in `agents/presets/` gains a `modelHint` field:

```json
{
  "name": "syntax-checker",
  "category": "syntax",
  "modelHint": "light",
  "task": "Check and fix syntax errors"
}
```

Category-to-tier mapping:

| Agent Category | Model Hint | Rationale |
|---------------|------------|-----------|
| `syntax/*` | `light` | Simple pattern matching, API knowledge |
| `errors/*` | `standard` | Needs reasoning about what went wrong |
| `impl/*` | `standard` | Needs to write good code |
| `agents/*` | `deep` | Orchestration and cross-domain reasoning |
| `core/*` | `standard` | Needs understanding of internals |

The `modelHint` is a suggestion — the flow engine resolves it to an actual model based on available providers and the chosen strategy.

---

## 5. Cost/Speed Impact

Example: 7-agent flow for "Build a school management system"

### All-Opus (current worst case)

| Stage | Model | Input tokens | Output tokens | Cost estimate |
|-------|-------|-------------|---------------|---------------|
| 7 agents | opus | ~50K each | ~10K each | ~$5.25 |
| **Total** | | **350K** | **70K** | **~$5.25** |

### Tiered Flow

| Stage | Model | Count | Input tokens | Output tokens | Cost estimate |
|-------|-------|-------|-------------|---------------|---------------|
| Parse + Validate | haiku | 2 | ~30K each | ~5K each | ~$0.04 |
| Execute | sonnet | 3 | ~50K each | ~10K each | ~$1.35 |
| Plan + Review | opus | 2 | ~50K each | ~10K each | ~$1.50 |
| **Total** | | **7** | **310K** | **55K** | **~$2.89** |

**Savings: ~45% cost reduction** with comparable quality, since expensive reasoning is reserved for tasks that need it.

---

## 6. Implementation Sketch

### New Files

| File | Purpose |
|------|---------|
| `oa-cli/src/open_agents/flow.py` | Flow definition, stage sequencing, model resolution |
| `oa-cli/flows/` | Directory for flow definition files (JSON) |

### Modified Files

| File | Change |
|------|--------|
| `spawner.py` | `spawn_agent()` already accepts `model` — add `model_hint` resolution |
| `cli.py` | New `oa flow` command with `--stages`, `--file`, `--strategy` options |
| `pipeline.py` | Refactor to support per-stage model override |

### Core Data Structures

```python
@dataclass
class FlowStage:
    name: str
    model: str              # resolved model (e.g., "claude/haiku")
    action: str             # task description for this stage
    parallel: bool = False  # can this stage spawn parallel agents?

@dataclass
class FlowDefinition:
    name: str
    task: str
    stages: list[FlowStage]
    strategy: str | None = None  # for auto-routing

MODEL_HINT_MAP = {
    "light":    "claude/haiku",
    "standard": "claude/sonnet",
    "deep":     "claude/opus",
}
```

### Flow Execution (Pseudocode)

```
def run_flow(flow: FlowDefinition):
    context = {"task": flow.task}
    for stage in flow.stages:
        workspace = create_stage_workspace(stage, context)
        agent = spawn_agent(name=stage.name, model=stage.model, workspace=workspace)
        wait_for_completion(agent)
        context[stage.name] = read_output(agent)
    return context
```

### CLI Interface

```python
@app.command()
def flow(
    task: str = typer.Argument(None),
    stages: str = typer.Option(None, help="Inline stages: 'haiku:parse,opus:plan,...'"),
    file: Path = typer.Option(None, help="Path to flow definition JSON"),
    strategy: str = typer.Option(None, help="Auto-routing: cost-optimized|quality-first|balanced"),
    model: str = typer.Option(None, help="Override all stages to one model"),
):
    """Run a multi-model flow pipeline."""
```

---

## 7. Relation to Existing Patterns

| Pattern | How Flow Builds On It |
|---------|----------------------|
| `pipeline.py` (planner → workers → combiner) | Flow generalizes this into N stages with per-stage models |
| `spawner.py` model support | Flow uses existing `CLAUDE_MODEL_MAP` for model resolution |
| `workspace.py` isolation | Each flow stage gets its own workspace with previous stage output |
| Guardian agents (`core-agents-architecture.md`) | Guardians could be a post-flow stage: `haiku:validate` or `sonnet:guardian` |
| `.done` signaling | Each stage signals completion the same way |

---

## 8. Open Questions

1. **Stage output format**: Should stages communicate via `output/result.md` (current pattern) or a structured `output/stage-result.json`?
2. **Error handling**: If a mid-flow stage fails, should the flow retry, skip, or abort?
3. **Ollama integration**: Should `--strategy` respect local ollama models as a "free" tier below haiku?
4. **Parallel stages**: How to handle fan-out (one stage spawns multiple parallel agents) and fan-in (combining their results)?
