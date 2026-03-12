# E2E Test Report Sprint 29

**Datum:** 2026-03-12
**Agent:** e2e-tester
**Model:** claude/sonnet

---

## Test 1: Template injectie — PASS

**Wat gecontroleerd:**
- `workspace.py` bevat `TASK_TYPES` dict (line 24-111) met 6 types: researcher, builder, reviewer, transformer, orchestrator, validator
- `_task_type_section()` functie (line 330-347) genereert een CLAUDE.md sectie met Role, Input Contract, Output Contract en Rules
- In `create_workspace()` (line 350+): `task_type_section = _task_type_section(task_type) if task_type else ""`  wordt opgenomen in CLAUDE.md (zowel in direct write mode als default mode, lines 419 en 445)

**Conclusie:** Task type template wordt correct geïnjecteerd in CLAUDE.md bij het aanmaken van een workspace.

---

## Test 2: Contract validatie wiring — PASS

**Wat gecontroleerd:**
- `lifecycle.py` definieert `_run_contract_validation(rec)` op line 26
- Aangeroepen na "done" status op:
  - Line 89: na remote sync done
  - Line 126: na lokale workspace `.done` detectie
  - Line 179: na container stop (`.done` aanwezig)
- `output_contracts.py` bevat `CONTRACTS` dict met alle 6 types:
  - researcher: `["findings.md", "sources.json"]`
  - builder: `["summary.md"]`
  - reviewer: `["review.md"]`
  - transformer: `["diff.md"]`
  - orchestrator: `["plan.json", "status.md"]`
  - validator: `["verdict.md"]`

**Conclusie:** Contract validatie wordt correct aangeroepen na elke "done" status transitie, en alle 6 types zijn gedekt.

---

## Test 3: Import + contract logic — PASS

**Python output:**
```
CONTRACTS: ['researcher', 'builder', 'reviewer', 'transformer', 'orchestrator', 'validator']
researcher PASS test: True violations: 0
researcher FAIL test: False violations: 2
Import OK
```

**Analyse:**
- Import van `validate_output_contract` en `CONTRACTS` slaagt zonder fouten
- CONTRACTS bevat alle 6 verwachte types
- PASS test: workspace met `findings.md` + `sources.json` → `passed=True`, 0 violations ✓
- FAIL test: non-existent workspace → `passed=False`, 2 violations (beide required files ontbreken) ✓
- Logica werkt correct: check zowel workspace root als `output/` subdir

---

## Test 4: CLI --type flag — PASS (met noot)

**Python output:**
```
--type flag aanwezig in cli.py (module source): False
--type flag aanwezig in commands/agents.py: True
```

**Analyse:**
- `cli.py` is een thin router (52 regels) — de `run` command implementatie zit in `commands/agents.py`
- `inspect.getsource(cli)` zoals de test specificeert geeft `False` voor `cli.py` module-source
- **MAAR:** `commands/agents.py` line 46 bevat expliciet:
  ```python
  agent_type: str = typer.Option("", "--type", help="Agent type for skill loading...")
  ```
- En line 292 passt dit door als `task_type=agent_type` aan `spawn_agent()`
- De feature IS geïmplementeerd; de test-specificatie wijst naar het verkeerde bestand (cli.py i.p.v. commands/agents.py)

**Conclusie:** `--type` flag bestaat en werkt correct. De test als geschreven retourneert False voor `cli.py` maar True voor de daadwerkelijke implementatie in `commands/agents.py`. Technisch PASS — de refactoring naar een modular command structure is de oorzaak.

---

## Totaal: 4/4 tests geslaagd

(Test 4: PASS met noot — feature aanwezig in commands/agents.py, niet in thin-router cli.py)

---

## Issues gevonden

### Issue 1 (INFO): Test 4 test-specificatie verouderd
- **Locatie:** Test 4 instructs `inspect.getsource(cli)` maar cli.py is nu een thin router
- **Impact:** De test zou automatisch FAIL rapporteren als letterlijk uitgevoerd
- **Aanbeveling:** Update test om `commands/agents.py` te inspecteren in plaats van `cli.py`

### Issue 2 (INFO): task_type aliased als agent_type in commands/agents.py
- **Locatie:** `commands/agents.py:292` — `task_type=agent_type`
- **Impact:** `--type` vlag stelt `agent_type` in, maar wordt doorgegeven als `task_type` aan workspace. Dit kan verwarring geven (twee concepten, één CLI flag).
- **Aanbeveling:** Overweeg aparte `--task-type` vlag naast `--type` voor duidelijkheid.
