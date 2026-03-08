# Docs Congruency Scan — Open-Agents

> Comparing ROADMAP.md + DECISIONS.md claims against actual code in cli.py, bridge.py, state.py
> Date: 2026-03-08 | Checker: check-docs-congruency agent

**Legend:** 🔴 incorrect · 🟡 outdated · 🟢 correct

---

## 1. CLI Command Count (Sprint 12 / Fase 9)

**Claim in ROADMAP:**
> "Totaal 14 CLI commando's: start, run, status, dashboard, attach, watch, kill, collect, clean, pipeline, web, version, setup, delegate"
> "Fase 9 (CLI Agentic Layer): 100% - oa-cli werkend: 14 commando's"

**Actual in cli.py:**

Top-level commands: `setup`, `start`, `run`, `templates`, `status`, `dashboard`, `attach`, `watch`, `kill`, `collect`, `clean`, `pipeline`, `web`, `delegate`, `send`, `inbox`, `broadcast`, `stop`, `guardians`, `version`, `resume` = **21 top-level commands**

Sub-command groups:
- `oa team`: create, list, add-member, delete (4 sub-commands)
- `oa task`: create, list, done, update (4 sub-commands)
- `oa checkpoint`: list, show (2 sub-commands)

**Verdict:** 🔴 ROADMAP claims 14 commands, actual count is 21+ top-level commands plus 10 sub-commands.

**Missing from the documented 14:**
- `oa send` / `oa inbox` / `oa broadcast` (messaging — Sprint 17)
- `oa stop` (session stop with guardian triggers)
- `oa guardians` (guardian management)
- `oa templates` (list agent templates)
- `oa resume` (checkpoint resume)
- `oa team` / `oa task` / `oa checkpoint` (sub-command groups)

---

## 2. Sprint 17 (Agent Teams) — Status Mismatch

**Claim in ROADMAP:**
All Sprint 17 items are `[ ]` (unimplemented). Status: "Foundation gestart, items gedelegeerd"

**Actual in cli.py + code:**

| Sprint 17 Item | ROADMAP | Code Reality |
|----------------|---------|--------------|
| Team config (`teams.py`) — create/list/delete | `[ ]` | 🟢 `oa team create/list/delete/add-member` implemented |
| Inter-agent messaging (`messaging.py`) — DM + broadcast | `[ ]` | 🟢 `oa send`, `oa inbox`, `oa broadcast` implemented |
| CLI: `oa team`, `oa task`, `oa send`, `oa inbox`, `oa broadcast` | `[ ]` | 🟢 All present in cli.py |
| Shared task list (`task_list.py`) | `[ ]` | 🟢 `oa task create/list/done/update` implemented |
| Graceful shutdown protocol via messaging | `[ ]` | 🟡 Partial: `oa stop --no-guardians` triggers guardian events |
| AgentRecord uitbreiden: `team` veld, `mailbox_path` | `[ ]` | 🟡 state.py has no `team` or `mailbox_path` field |
| Quality hooks (`hooks.py`) — on_idle, on_task_complete | `[ ]` | 🔴 Not found in cli.py imports |
| TUI dashboard: team view | `[ ]` | 🔴 Not confirmed in dashboard.py |
| Web UI: team overzicht pagina | `[ ]` | 🔴 Not confirmed in web/src |

**Verdict:** 🔴 Sprint 17 is largely IMPLEMENTED in CLI layer (teams, tasks, messaging) but ROADMAP marks everything as `[ ]`. Core CLI commands should be checked off.

---

## 3. Guardian Module — Status Mismatch

**Claim in ROADMAP:**
> "Guardian Agents Module — In Progress (2026-03-08)"
> All items `[ ]`

**Actual in cli.py:**
- `from .guardians import list_guardians, log_event, register_guardian, trigger_guardian` ✅
- `oa stop` triggers `trigger_guardian("session_end")` ✅
- `oa guardians` command: list, trigger, register ✅
- `oa run --guardians` flag triggers `batch_complete` event ✅
- `bridge.py` has `/api/guardians` and `/api/guardians/trigger` endpoints ✅

**Verdict:** 🔴 Guardian module is IMPLEMENTED and integrated. ROADMAP marks all items as `[ ]`.

---

## 4. Checkpoint Module — Undocumented Feature

**Claim in ROADMAP:** Not mentioned anywhere.

**Actual in cli.py:**
- `oa checkpoint list` — lists incomplete checkpoints
- `oa checkpoint show <name>` — shows checkpoint details
- `oa resume <name>` — resumes agent from checkpoint
- `bridge.py` has `/api/checkpoints` and `/api/resume/<agent>` endpoints

**Verdict:** 🔴 Feature exists in code, not documented in ROADMAP at all. Missing entirely.

---

## 5. `oa templates` Command — Undocumented

**Claim in ROADMAP:** Not listed in any sprint or command list.

**Actual in cli.py:**
- `oa templates [--category]` lists all agent templates from `agents/library/`

**Verdict:** 🟡 Feature exists but not documented in ROADMAP command list.

---

## 6. Timeout Default — State vs. ROADMAP

**Claim in ROADMAP (Sprint 12 Prompt 1):**
> "Timeout detectie (30 min default)"

**Actual in state.py:**
```python
auto_cleanup_minutes: int = 20  # na hoeveel minuten inactiviteit opruimen
```

**Verdict:** 🟡 ROADMAP says 30 min, state.py defaults to 20 min for auto_cleanup. The `auto_cleanup_minutes` may differ from the timeout in spawner/pipeline. Worth verifying in spawner.py.

---

## 7. D-052 Decision Number Conflict

**Claim in DECISIONS.md:**
> `D-052 | Agent Teams patronen adopteren in oa-cli | ... | Open`

**Claim in ROADMAP Sprint 18:**
> "Beslissingen: D-052 (Tauri 2 architectuur), D-053 (multi-provider CLI auth)"

**Verdict:** 🔴 D-052 is assigned to TWO different decisions:
- DECISIONS.md: Agent Teams adoption (Open)
- ROADMAP Sprint 18: Tauri 2 architectuur

This is a numbering collision. DECISIONS.md should have a separate D-054 or D-055 for Tauri decisions.

---

## 8. D-051 Reference Mismatch

**Claim in cli.py (delegate command docstring):**
> `"""Delegate a task: spawns orchestrator + workers automatically (D-051)."""`

**Claim in ROADMAP Sprint 16:**
> "Beslissing D-051 documenteren in DECISIONS.md" (about Google A2A Protocol)

**In DECISIONS.md:** D-051 does not appear as an explicit decision row.

**Verdict:** 🟡 D-051 referenced in delegate command code but not formally recorded in DECISIONS.md. Sprint 16 plans to document D-051 about A2A, which conflicts with the delegate command's attribution.

---

## 9. State File Location — Correct

**Claim in ROADMAP:**
> "State management via ~/.oa/agents.json"

**Actual in state.py:**
```python
OA_DIR = Path.home() / ".oa"
STATE_FILE = OA_DIR / "agents.json"
```

**Verdict:** 🟢 Correct.

---

## 10. Bridge Server — Mostly Correct

**Claim in ROADMAP (Sprint 12 Prompt 2b):**
> "Flask bridge server (bridge.py) — localhost-only, serveert React SPA + API endpoints"

**Actual in bridge.py:**
```python
app.run(host="127.0.0.1", port=port, debug=False)
```
Serves React SPA from `web/dist`, provides all expected API endpoints.

**Verdict:** 🟢 Correct. Bridge is localhost-only, serves React SPA.

**Extra in bridge.py not in ROADMAP:**
- `/api/agents/<name>/pause` + `/api/agents/<name>/resume` (pause/resume pane)
- `/api/guardians` + `/api/guardians/trigger`
- `/api/teams` + `/api/tasks` + `/api/templates` + `/api/checkpoints`
- `/api/messages/broadcast` + `/api/broadcast` alias
- `/api/run` + `/api/spawn` aliases

---

## 11. AgentRecord Fields — State Extensions Not Documented

**Actual in state.py** (fields not mentioned in ROADMAP):
- `depth`, `lineage`, `task_hash`, `max_children`, `shared_results_dir` — hierarchy fields
- `last_activity`, `auto_cleanup_minutes` — auto-cleanup fields
- `project_root` — direct mode field
- `validate_spawn()` — prevents infinite loops via task_hash deduplication
- `get_lineage()`, `get_children()`, `count_children()` — tree navigation

**Verdict:** 🟡 State has significantly more features than documented (hierarchy, deduplication, auto-cleanup). ROADMAP doesn't mention these.

---

## 12. `oa run --direct` Flag

**Claim in ROADMAP (CLAUDE.md global):**
> "Always --direct. Every `oa run` MUST include `--direct`."

**Actual in cli.py:**
```python
direct: bool = typer.Option(False, "--direct", "-d", help="Direct write mode...")
proj_root = str(Path.cwd()) if direct else None
```

**Verdict:** 🟢 `--direct` flag exists and works as documented.

---

## 13. `oa run --model` Accepted Values

**Claim in ROADMAP (CLAUDE.md global):**
> "Specify `claude/sonnet`, `claude/opus`, or `claude/haiku`"

**Actual in cli.py:**
```python
model: str = typer.Option("claude", "--model", "-m", help="Model: 'claude' or 'ollama/<model>'")
```

**Verdict:** 🟡 cli.py default help text says `claude` or `ollama/<model>`, but global CLAUDE.md uses `claude/sonnet`, `claude/opus`, `claude/haiku` format. The model format with slash is handled by the spawner (not verified here but appears supported based on bridge.py usage).

---

## 14. Fase 11 Progress Percentage

**Claim in ROADMAP:**
> "Fase 11 (Agent Teams Patterns): ████░░░░░░░░░░░░░░░ **20%**"
> Sprint 17 table: 0/12 completed

**Actual:** Based on CLI commands, at minimum 5–7 Sprint 17 items are implemented (team CRUD, task CRUD, messaging CLI, send/inbox/broadcast).

**Verdict:** 🔴 20% is too low. Conservative estimate is 50–60% implemented based on CLI layer alone.

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Incorrect claims (🔴) | 6 | High |
| Outdated/incomplete (🟡) | 5 | Medium |
| Correct (🟢) | 3 | — |

### Top Priority Fixes

1. **Update command count** in Sprint 12 / Fase 9: 14 → 21+ commands
2. **Check off Sprint 17 items** that are implemented: team, task, messaging CLI
3. **Check off Guardian module** items that are implemented
4. **Add Checkpoint module** to ROADMAP (new sprint or Sprint 12 addendum)
5. **Resolve D-052 number conflict** (Agent Teams vs Tauri)
6. **Update Fase 11 progress** from 20% to ~55%
