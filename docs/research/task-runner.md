# Task Runner Evaluation for Open-Agents (#54)

**Date:** 2026-03-11
**Author:** research-taskrunner agent
**Status:** Draft → Ready for Review
**Context:** Evaluating task runners for declarative `oa pipeline` workflow definitions

---

## Executive Summary

Open-Agents currently implements `oa pipeline` as an imperative Python orchestrator
(planner → workers → combiner). Issue #54 asks: should we support a **declarative workflow
definition file** — and if so, in which format?

**Recommendation:** Adopt a **custom OA-native YAML format**, inspired by `go-task`'s
`Taskfile.yml` schema, but purpose-built for agent workflows. Do not add a dependency on
an external task runner. Provide `oa pipeline --file workflow.yaml` as the entry point.

---

## 1. Landscape: Task Runners Evaluated

### 1.1 Make / Makefile

**Origin:** 1976 (Bell Labs). Designed for C build systems.

**Strengths:**
- Universally installed on Unix/Linux
- File-based dependency tracking (only rebuilds what changed)
- Zero additional dependencies

**Weaknesses:**
- Syntax is archaic (tab-sensitive, `.PHONY` declarations, cryptic variables)
- No native support for parallel task execution with dependency graphs
- No structured data types — values are strings, not objects
- Not designed for long-running processes (agents)
- Poor error reporting and no progress tracking

**Verdict for OA:** ❌ Not suitable. Makefile's model (files as artifacts) doesn't map to
agent workflows. Syntax complexity creates friction. No path forward for structured config.

---

### 1.2 Just

**Origin:** 2016 (Casey Rodarmor). Written in Rust.
**Website:** https://github.com/casey/just
**Config:** `justfile` or `.justfile`

**Strengths:**
- Clean, readable syntax (closer to shell scripting)
- Named parameters with defaults: `just deploy env="production"`
- Modules and namespacing (v1.19+)
- Cross-platform (Windows/Mac/Linux)
- `.env` file auto-loading
- Recipes can depend on other recipes

**Weaknesses:**
- Syntax is custom (not YAML/TOML) — harder to parse/generate programmatically
- No structured metadata (no `description`, `model`, `output_path` fields per task)
- Dependency execution is sequential by default (parallel needs `--parallel` or `&`)
- Not designed for workflows with data passing between steps
- No built-in variable interpolation between dependent tasks

**Example:**
```justfile
planner task:
    oa run "{{task}}" --name planner --model claude/opus --direct

research: planner
    oa run "research topic X" --name researcher --model claude/sonnet --direct

combine: research
    oa run "combine results" --name combiner --model claude/sonnet --direct
```

**Verdict for OA:** 🟡 Partial fit. Works for simple sequential recipes, but can't express
agent metadata (model, role, output path, parallel groups) without embedding it as shell args.
Programmatic generation of justfiles is awkward.

---

### 1.3 Task (go-task)

**Origin:** 2018 (Andrey Nering). Written in Go.
**Website:** https://taskfile.dev
**Config:** `Taskfile.yml` or `Taskfile.yaml`

**Strengths:**
- YAML format — structured, machine-readable, easy to generate/parse
- First-class dependency graph: `deps: [task-a, task-b]`
- Native parallel execution: `deps` run in parallel by default
- Variables with interpolation: `MODEL: claude/sonnet`
- `internal: true` for private helper tasks
- `summary` and `desc` fields for documentation
- Supports `dotenv`, `env` files, and platform-specific tasks
- Active development, good community

**Weaknesses:**
- Requires installing `task` binary (not universally available)
- YAML verbosity for simple tasks
- Still primarily shell-oriented — agent metadata is second-class (embedded in `cmd` strings)
- No concept of "agent role" (planner/worker/combiner) at the schema level

**Example:**
```yaml
version: '3'

vars:
  MODEL: claude/sonnet
  OPUS: claude/opus

tasks:
  planner:
    desc: "Run planner agent"
    cmd: oa run "{{.TASK_DESC}}" --name planner --model {{.OPUS}} --direct

  researcher:
    desc: "Run researcher agent"
    deps: [planner]
    cmd: oa run "Research the topic" --name researcher --model {{.MODEL}} --direct

  combiner:
    desc: "Combine results"
    deps: [researcher]
    cmd: oa run "Combine all outputs" --name combiner --model {{.MODEL}} --direct
```

**Verdict for OA:** 🟢 Best external fit. YAML format maps well to agent configuration.
However, still shell-centric — agent properties (model, role, output path) would be
embedded in `cmd` strings, losing type safety and discoverability.

---

### 1.4 GNU Make (Modern Usage)

Essentially the same as §1.1. Some projects use Make as a thin wrapper that calls other tools.
This approach would mean `make pipeline` calls `oa pipeline`. Adds indirection with no benefit.

**Verdict for OA:** ❌ Same as Make above.

---

## 2. Comparison Matrix

| Criterion | Make | Just | go-task | OA-native YAML |
|-----------|:----:|:----:|:-------:|:--------------:|
| YAML/structured format | ❌ | ❌ | ✅ | ✅ |
| Parallel execution | ⚠️ | ⚠️ | ✅ | ✅ |
| Dependency graph | ✅ | ✅ | ✅ | ✅ |
| Agent metadata (model, role) | ❌ | ❌ | ⚠️ | ✅ |
| Data passing between stages | ❌ | ❌ | ❌ | ✅ |
| Zero external dependencies | ✅ | ❌ | ❌ | ✅ |
| Machine-readable/generatable | ❌ | ⚠️ | ✅ | ✅ |
| OA-native concepts (planner/combiner) | ❌ | ❌ | ❌ | ✅ |
| Human readable | ⚠️ | ✅ | ✅ | ✅ |
| Version control friendly | ✅ | ✅ | ✅ | ✅ |

---

## 3. Proposed OA-Native YAML Format

Rather than adopting an external task runner, Open-Agents should define its own
**workflow schema** that directly expresses agent concepts. The file is read and
executed natively by `oa pipeline --file <path>`.

### 3.1 Design Principles

1. **Agent-first**: Schema uses agent vocabulary (`role`, `model`, `depends_on`)
2. **Declarative**: Define *what*, not *how* — oa-cli handles execution
3. **Inspectable**: `oa pipeline --file workflow.yaml --dry-run` prints execution plan
4. **Composable**: Workflows can reference shared variable files (`vars_from`)
5. **Minimal**: No external binary required — pure Python parsing via PyYAML (already installed)

### 3.2 Schema Definition

```yaml
# OA Pipeline Workflow Format v1
# Parsed by: oa-cli/src/open_agents/pipeline.py
# Invocation: oa pipeline --file <path>

version: "1"                        # Schema version
name: string                        # Human-readable pipeline name
description: string                 # Optional description

vars:                               # Global variables (interpolated with ${VAR})
  KEY: value

stages:                             # Ordered list of execution stages
  - name: string                    # Stage identifier (slug)
    parallel: bool                  # Run agents in this stage concurrently (default: true)
    agents:
      - name: string                # Agent name (used in oa status)
        role: planner|worker|combiner  # Agent role (affects workspace setup)
        model: claude/sonnet        # Model override
        task: string                # Task description (interpolated)
        depends_on: [string]        # Names of agents that must complete first
        output_path: string         # Optional: where to write result (absolute path)
        timeout: int                # Timeout in seconds (optional)
        direct: bool                # Write directly to project (default: false)
```

### 3.3 Role Semantics

| Role | Behavior | Output |
|------|----------|--------|
| `planner` | Writes `plan.json` to workspace output | Subtask list |
| `worker` | Executes assigned task, writes `result.md` | Markdown result |
| `combiner` | Reads all upstream outputs, writes final `result.md` | Combined markdown |

### 3.4 Integration with `oa pipeline`

**Current invocation:**
```bash
oa pipeline "Research and summarize topic X"
```

**Extended invocation (proposed):**
```bash
oa pipeline --file workflow.yaml           # Execute a workflow file
oa pipeline --file workflow.yaml --dry-run # Print execution plan without running
oa pipeline "..."                          # Existing auto-planner mode (unchanged)
```

**Implementation path in `pipeline.py`:**

```python
def run_pipeline_from_file(workflow_path: str) -> None:
    """Execute a declarative YAML workflow file."""
    import yaml
    workflow = yaml.safe_load(Path(workflow_path).read_text())
    validate_workflow(workflow)  # schema check

    for stage in workflow["stages"]:
        agents_to_run = stage["agents"]
        if stage.get("parallel", True):
            _run_stage_parallel(agents_to_run, workflow.get("vars", {}))
        else:
            _run_stage_sequential(agents_to_run, workflow.get("vars", {}))
```

This adds ~100 lines to `pipeline.py` with no new dependencies (PyYAML is in the
existing `pyproject.toml`).

---

## 4. Recommendation

**Adopt the OA-native YAML format described in §3.**

Rationale:
- **No external dependency**: go-task or Just require installing additional binaries.
  OA-native YAML is parsed directly by oa-cli using PyYAML (already present).
- **Agent-first semantics**: External runners don't know what a "planner" or "combiner" is.
  Embedding agent metadata in shell command strings loses type safety.
- **Programmatic generation**: The Factory portal (Fase 2) can generate workflow YAML from
  the UI. YAML is trivial to generate from Python dicts; justfiles are not.
- **Inspectable/dry-run**: `oa pipeline --file workflow.yaml --dry-run` can validate
  agent names, model strings, and dependency graphs before running.
- **Compatibility**: Nothing prevents wrapping `oa pipeline` in a Makefile or justfile
  for teams that prefer those tools — they become thin launchers.

**Migration path from current imperative pipeline:**
- Phase 1: Add `--file` flag support; existing auto-planner mode unchanged
- Phase 2: Ship example workflows in `examples/workflows/`
- Phase 3: Factory UI generates `.oa-workflow.yaml` alongside agent configs

---

## 5. References

- go-task documentation: https://taskfile.dev/reference/schema/
- Just documentation: https://just.systems/man/en/
- GNU Make manual: https://www.gnu.org/software/make/manual/
- Open-Agents pipeline source: `oa-cli/src/open_agents/pipeline.py`
- Open-Agents issue #54: Task Runner Evaluatie voor Open-Agents
