# E2E Integration Test Report — 2026-03-11

## Scope

End-to-end integration tests for the Open-Agents `oa-cli` stack, covering the full
lifecycle: `spawn_agent → workspace → AgentRecord → check_agent → collect`.

**Test file:** `oa-cli/tests/test_e2e.py`
**Created:** 2026-03-11

---

## Test Results

**30 passed / 0 failed / 0 skipped** in 19.04 s

---

## Test Suites

### 1. TestSpawnAndCollect (3 tests)

Tests the complete spawn → lifecycle → collect flow with mocked tmux and telemetry.

| Test | Result | Description |
|------|--------|-------------|
| `test_spawn_and_collect` | PASS | Spawns agent, simulates `.done`, verifies `check_agent()` returns `"done"` and `telemetry.finish_run()` called |
| `test_workspace_is_created` | PASS | Workspace directory and `output/` subdirectory exist after spawn |
| `test_agent_still_running_without_done_file` | PASS | `check_agent()` returns `"running"` when `.done` absent and tmux window exists |

**Mocks used:**
- `session_exists` → always returns `True`
- `_tmux` → returns mock with `returncode=0`
- `create_workspace` → returns `tmp_path` fixture
- `telemetry.start_run` / `telemetry.finish_run` → `MagicMock`
- `save_checkpoint` → no-op
- `_hooks.run_hooks` → no-op

---

### 2. TestTemplateLoading (7 tests)

Tests `_load_template()` logic with real templates from `agents/library/`.

| Test | Result | Description |
|------|--------|-------------|
| `test_load_template_by_stem` | PASS | Strategy 1: exact file stem match (`api-contract-validator`) |
| `test_load_template_by_relative_path` | PASS | Strategy 2: relative path (`code-dev/api-contract-validator`) |
| `test_load_template_by_id_field` | PASS | Strategy 3: JSON `id` field (`code-dev-api-contract-validator`) |
| `test_template_has_system_prompt` | PASS | `systemPrompt` field present and non-empty |
| `test_template_has_model_hint` | PASS | `modelHint` field present and is a string |
| `test_load_template_not_found_raises` | PASS | Non-existent template raises `FileNotFoundError` |
| `test_multiple_templates_have_required_fields` | PASS | 3 templates spot-checked for `systemPrompt` + `modelHint` |

**Note:** The JSON library contains some non-dict JSON files (lists). The test helper
correctly guards against this with `isinstance(data, dict)` before accessing `.get()`.

---

### 3. TestAgentNameValidation (20 tests)

Tests `spawn_agent()` name validation: `[a-z0-9][a-z0-9-]{0,61}`, max 62 chars.

**Invalid names rejected (8 parametrized):**
- `MyAgent` — uppercase
- `my agent` — space
- `my_agent` — underscore
- `A` × 63 — too long
- `-bad-start` — leading hyphen
- `""` — empty string
- `agent!name` — special character
- `UPPERCASE` — all uppercase

**Valid names accepted (9 parametrized):**
- `myagent`, `my-agent`, `agent-123`, `a`, 62× `a`, `test-e2e-agent`, `researcher-1`, `abc-def-ghi`, `0agent`

**Boundary tests:**
- 63-char name → rejected
- 62-char name → accepted

**Duplicate test:**
- Spawning same name when already `"running"` → `RuntimeError: already running`

---

## Architecture Notes

- All tests use `pytest`'s `tmp_path` fixture for workspace isolation
- State is redirected via `monkeypatch` on `state_module.OA_DIR` and `STATE_FILE`
- No real tmux session required — `_tmux` is fully mocked
- Template tests use real `agents/library/` at `Path(__file__).parents[2] / "agents/library"`
- `tests/__init__.py` created to make the tests directory a proper package

---

## Files Created/Modified

| File | Action |
|------|--------|
| `oa-cli/tests/test_e2e.py` | Created — 30 tests |
| `oa-cli/tests/__init__.py` | Created — package marker |
| `docs/e2e-test-report-2026-03-11.md` | Created — this report |
