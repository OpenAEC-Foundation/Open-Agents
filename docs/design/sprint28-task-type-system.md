# Sprint 28: Reproducible Task-Type System

> **Status**: Design — ready for builders
> **Author**: arch-planner (opus)
> **Date**: 2026-03-12

---

## 1. The 6 Task Types

Each type gets a hardcoded CLAUDE.md template injected via `workspace.py`. Templates define: role, input contract, output contract, strict rules.

### 1.1 Type Definitions

```python
# In workspace.py — new constant replacing CONTEXT_PROFILES

TASK_TYPES: dict[str, dict] = {
    "researcher": {
        "role": "Je bent een RESEARCHER. Je verzamelt, verifieert en structureert informatie.",
        "input_contract": "- `input_path`: pad naar bronbestanden of URL-lijst\n- `scope`: wat moet onderzocht worden",
        "output_schema": {
            "required_sections": ["## Samenvatting", "## Bevindingen", "## Bronnen"],
            "output_file": "result.md",
        },
        "rules": [
            "Citeer ELKE claim met bron (URL, bestandspad, of regelnummer)",
            "Schrijf GEEN productiecode — alleen research output",
            "Bij onzekerheid: markeer met [ONZEKER] tag",
        ],
        "skills": ["oa-prompting-5element", "oa-prompting-scope"],
    },
    "builder": {
        "role": "Je bent een BUILDER. Je implementeert code, configuratie of documentatie.",
        "input_contract": "- `input_path`: pad naar te wijzigen bestanden\n- `spec`: wat moet gebouwd worden",
        "output_schema": {
            "required_sections": ["## Wijzigingen", "## Bestanden"],
            "output_file": "result.md",
        },
        "rules": [
            "Lees ALTIJD bestaande code vóór je schrijft",
            "Schrijf direct naar productie-bestanden (geen proposals/)",
            "Geen backwards-compatibility hacks of ongebruikte code",
            "Elke wijziging moet in ## Bestanden staan met absoluut pad",
        ],
        "skills": ["oa-quality-gates"],
    },
    "reviewer": {
        "role": "Je bent een REVIEWER. Je beoordeelt code/output op correctheid en kwaliteit. NOOIT schrijven naar productie-bestanden.",
        "input_contract": "- `input_path`: pad naar te reviewen bestanden of output\n- `criteria`: waar moet op gelet worden",
        "output_schema": {
            "required_sections": ["## Verdict", "## Issues", "## Suggesties"],
            "output_file": "result.md",
        },
        "rules": [
            "NOOIT schrijven naar bronbestanden — alleen naar ./output/",
            "Elk issue: bestandsnaam + regelnummer + ernst (CRITICAL/WARNING/INFO)",
            "Verdict is APPROVE, REJECT, of WARN — altijd op eerste regel van ## Verdict",
        ],
        "skills": ["oa-quality-gates", "oa-prompting-scope"],
    },
    "transformer": {
        "role": "Je bent een TRANSFORMER. Je converteert input van formaat A naar formaat B.",
        "input_contract": "- `input_path`: pad naar bronbestand(en)\n- `target_format`: gewenst outputformaat",
        "output_schema": {
            "required_sections": ["## Conversie", "## Resultaat"],
            "output_file": "result.md",
        },
        "rules": [
            "Input NOOIT wijzigen — alleen lezen",
            "Output schrijven naar ./output/ (geconverteerde bestanden + result.md)",
            "Bij data-verlies: documenteer wat verloren gaat in ## Conversie",
        ],
        "skills": [],
    },
    "orchestrator": {
        "role": "Je bent een ORCHESTRATOR. Je decomposeert taken en coördineert sub-agents via oa run.",
        "input_contract": "- `task`: hoofd-opdracht om te decomposeren\n- `constraints`: tijds-/kwaliteitseisen",
        "output_schema": {
            "required_sections": ["## Plan", "## Agents", "## Resultaat"],
            "output_file": "result.md",
        },
        "rules": [
            "Spawn sub-agents via `oa run` — NOOIT zelf multi-file werk doen",
            "Elke sub-agent krijgt --parent en --model",
            "Wacht op alle agents en valideer hun output vóór je result.md schrijft",
            "Documenteer elke gespawnde agent in ## Agents (naam, taak, status)",
        ],
        "skills": ["oa-orchestration-patterns", "oa-orchestration-communication"],
    },
    "validator": {
        "role": "Je bent een VALIDATOR. Je controleert of output voldoet aan een contract/schema.",
        "input_contract": "- `input_path`: pad naar te valideren output\n- `contract`: verwacht schema of regels",
        "output_schema": {
            "required_sections": ["## Checks", "## Verdict"],
            "output_file": "result.md",
        },
        "rules": [
            "NOOIT de input wijzigen",
            "Elke check: naam, verwacht, gevonden, PASS/FAIL",
            "Verdict: PASS (alle checks OK) of FAIL (minstens 1 FAIL) — op eerste regel van ## Verdict",
        ],
        "skills": [],
    },
}
```

### 1.2 CLAUDE.md Template Generator

```python
# In workspace.py — new function

def _task_type_section(task_type: str) -> str:
    """Generate the task-type-specific CLAUDE.md section."""
    tt = TASK_TYPES.get(task_type)
    if not tt:
        return ""

    rules_list = "\n".join(f"- {r}" for r in tt["rules"])
    required = ", ".join(f"`{s}`" for s in tt["output_schema"]["required_sections"])

    return (
        f"\n## Role\n{tt['role']}\n"
        f"\n## Input Contract\n{tt['input_contract']}\n"
        f"\n## Output Contract\n"
        f"- Output file: `./output/{tt['output_schema']['output_file']}`\n"
        f"- Required sections: {required}\n"
        f"- Missing sections = contract violation (will be flagged)\n"
        f"\n## Rules\n{rules_list}\n"
    )
```

---

## 2. Output Contract Schema

### 2.1 result.md Structure Per Type

| Type | Required Sections | Verdict Field? |
|------|-------------------|----------------|
| researcher | `## Samenvatting`, `## Bevindingen`, `## Bronnen` | No |
| builder | `## Wijzigingen`, `## Bestanden` | No |
| reviewer | `## Verdict`, `## Issues`, `## Suggesties` | Yes: APPROVE/REJECT/WARN |
| transformer | `## Conversie`, `## Resultaat` | No |
| orchestrator | `## Plan`, `## Agents`, `## Resultaat` | No |
| validator | `## Checks`, `## Verdict` | Yes: PASS/FAIL |

### 2.2 Contract Verification (3 checks)

```python
# New file: oa-cli/src/open_agents/contract.py

from __future__ import annotations
import re
from pathlib import Path
from dataclasses import dataclass


@dataclass
class ContractResult:
    task_type: str
    checks: list[tuple[str, bool, str]]  # (check_name, passed, detail)

    @property
    def passed(self) -> bool:
        return all(c[1] for c in self.checks)

    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        details = "\n".join(
            f"  {'✓' if ok else '✗'} {name}: {detail}"
            for name, ok, detail in self.checks
        )
        return f"Contract [{self.task_type}]: {status}\n{details}"


def verify_contract(workspace: Path, task_type: str) -> ContractResult:
    """Verify the output contract for a completed agent.

    Three checks:
    1. PRESENT  — result.md exists and is non-empty
    2. SECTIONS — all required sections are present
    3. FORMAT   — verdict fields (if applicable) have correct values
    """
    from .workspace import TASK_TYPES

    tt = TASK_TYPES.get(task_type)
    if not tt:
        return ContractResult(task_type, [("type_known", False, f"Unknown type: {task_type}")])

    checks: list[tuple[str, bool, str]] = []
    output_file = workspace / "output" / tt["output_schema"]["output_file"]

    # Check 1: PRESENT — file exists and has content
    if not output_file.exists():
        checks.append(("present", False, f"{output_file.name} does not exist"))
        return ContractResult(task_type, checks)

    content = output_file.read_text().strip()
    if len(content) < 20:
        checks.append(("present", False, f"{output_file.name} is near-empty ({len(content)} chars)"))
        return ContractResult(task_type, checks)

    checks.append(("present", True, f"{output_file.name} exists ({len(content)} chars)"))

    # Check 2: SECTIONS — all required headings present
    required = tt["output_schema"]["required_sections"]
    missing = [s for s in required if s not in content]
    if missing:
        checks.append(("sections", False, f"Missing: {', '.join(missing)}"))
    else:
        checks.append(("sections", True, f"All {len(required)} sections present"))

    # Check 3: FORMAT — verdict fields have valid values
    if task_type in ("reviewer", "validator"):
        verdict_match = re.search(r"## Verdict\s*\n\s*(APPROVE|REJECT|WARN|PASS|FAIL)", content)
        if verdict_match:
            checks.append(("format", True, f"Verdict: {verdict_match.group(1)}"))
        else:
            checks.append(("format", False, "## Verdict must start with APPROVE/REJECT/WARN/PASS/FAIL"))
    else:
        checks.append(("format", True, "No verdict field required"))

    return ContractResult(task_type, checks)
```

---

## 3. Changes to spawner.py

### 3.1 Add `--type` Parameter to `spawn_agent()`

```python
# In spawner.py — modify spawn_agent signature:

def spawn_agent(
    name: str,
    task: str,
    model: str = DEFAULT_MODEL,
    workspace: Path | None = None,
    parent: str | None = None,
    max_depth: int = MAX_DEPTH,
    shared_results_dir: str | None = None,
    project_root: str | Path | None = None,
    agent_type: str = "",
    can_spawn: bool = False,
    team: str = "",
    skills: list[str] | None = None,
    profile: str = "",
    task_type: str = "",        # NEW — one of TASK_TYPES keys
) -> AgentRecord:
```

Pass `task_type` through to `create_workspace()`:

```python
    # In spawn_agent(), where create_workspace is called:
    if workspace is None:
        workspace = create_workspace(
            name, task, project_root=project_root,
            agent_type=agent_type, can_spawn=can_spawn,
            team=team, model=model, parent_name=parent_name,
            skills=skills, profile=profile,
            task_type=task_type,  # NEW
        )
```

Store `task_type` in `AgentRecord`:

```python
    rec = AgentRecord(
        name=name,
        task=task,
        workspace=str(workspace),
        # ... existing fields ...
        task_type=task_type,  # NEW — needed for post-completion verification
    )
```

### 3.2 Post-Completion Contract Verification

In the `.done` detection path (wherever agents.json is updated to status="done"), add:

```python
# In the status-check / collect flow (e.g., cli.py collect command):

from .contract import verify_contract

def _finalize_agent(rec: AgentRecord) -> None:
    """Called when .done is detected for an agent."""
    if rec.task_type:
        result = verify_contract(Path(rec.workspace), rec.task_type)
        if not result.passed:
            print(f"⚠ Contract violation for {rec.name}:\n{result.summary()}")
            rec.contract_status = "FAIL"
            rec.contract_detail = result.summary()
        else:
            rec.contract_status = "PASS"
            rec.contract_detail = result.summary()
    rec.status = "done"
    update_agent(rec)
```

### 3.3 Contract Violation Handling

On violation: **log warning + flag in agents.json** (non-blocking).

```python
# AgentRecord gets two new optional fields:
@dataclass
class AgentRecord:
    # ... existing fields ...
    task_type: str = ""
    contract_status: str = ""     # "PASS", "FAIL", or "" (no contract)
    contract_detail: str = ""     # Human-readable verification summary
```

---

## 4. Changes to workspace.py

### 4.1 Template Selection via `--type`

```python
# Modify create_workspace signature:
def create_workspace(
    agent_name: str, task: str,
    # ... existing params ...
    task_type: str = "",  # NEW
) -> Path:
```

Insert task-type section into CLAUDE.md **before** the task section:

```python
    # In create_workspace(), after building identity section:
    task_type_section = _task_type_section(task_type) if task_type else ""

    # Also merge task-type skills into the skills list:
    if task_type and task_type in TASK_TYPES:
        tt_skills = TASK_TYPES[task_type].get("skills", [])
        existing_skills = list(skills) if skills else []
        for s in tt_skills:
            if s not in existing_skills:
                existing_skills.append(s)
        skills = existing_skills
```

CLAUDE.md structure becomes:

```
# Agent: {name}
## Identity
## Role          ← NEW (from task_type)
## Input Contract ← NEW
## Output Contract ← NEW
## Rules          ← NEW
## Task
{task}
## Output Location
## Quality Rules
...
```

### 4.2 Relationship with CONTEXT_PROFILES

**Keep CONTEXT_PROFILES** for backward compatibility — `--profile researcher` still works. `--type researcher` is the new preferred path that includes everything `--profile` does plus the output contract.

If both `--type` and `--profile` are set, `--type` wins (its skills are merged, its sections take precedence).

---

## 5. CLI Integration

```python
# In cli.py — modify the `run` command:

@click.option("--type", "task_type", default="",
              type=click.Choice(["", "researcher", "builder", "reviewer",
                                 "transformer", "orchestrator", "validator"]),
              help="Task type — injects role, rules, and output contract")
def run_cmd(task, name, model, ..., task_type):
    rec = spawn_agent(name=name, task=task, model=model, ..., task_type=task_type)
```

Usage:
```bash
oa run "Onderzoek alle API endpoints" --name api-research --model claude/sonnet --type researcher
oa run "Review de output van api-research" --name api-review --model claude/sonnet --type reviewer
```

---

## 6. Verification in `oa collect`

```bash
$ oa collect api-research
# Output:
# Contract [researcher]: PASS
#   ✓ present: result.md exists (2847 chars)
#   ✓ sections: All 3 sections present
#   ✓ format: No verdict field required
#
# --- result.md ---
# ...
```

On FAIL:
```bash
$ oa collect bad-agent
# ⚠ Contract violation for bad-agent:
# Contract [reviewer]: FAIL
#   ✓ present: result.md exists (156 chars)
#   ✗ sections: Missing: ## Issues, ## Suggesties
#   ✗ format: ## Verdict must start with APPROVE/REJECT/WARN/PASS/FAIL
```

---

## 7. Implementation Order for Builders

1. **Add `TASK_TYPES` dict + `_task_type_section()` to `workspace.py`** (~40 lines)
2. **Create `contract.py`** with `verify_contract()` (~60 lines)
3. **Add `task_type` field to `AgentRecord` in `state.py`** (~3 lines)
4. **Thread `task_type` through `spawn_agent()` in `spawner.py`** (~5 lines)
5. **Thread `task_type` through `create_workspace()` in `workspace.py`** (~10 lines)
6. **Add `--type` option to `run` command in `cli.py`** (~5 lines)
7. **Add contract check to `collect` command in `cli.py`** (~10 lines)
8. **Tests**: verify each task type generates correct CLAUDE.md, verify contract passes/fails correctly

Total: ~133 lines of new code + ~20 lines of modifications.
