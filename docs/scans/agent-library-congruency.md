# Agent Library Congruency Report

**Generated:** 2026-03-08
**Scope:** `agents/library/` (185 files), `agents/presets/` (10 files), `template_loader.py`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| JSON files in `agents/library/` | 185 |
| JSON files in `agents/presets/` | 10 |
| Agent definitions (individual files) | 172 |
| Agent definitions (in category arrays) | 130 |
| Presets | 10 |
| **Total agent definitions** | **312** |
| ROADMAP claims | 293 |
| Agents loadable via `template_loader.py` | **172** (57% of 302 in library) |

---

## Critical Issues

### 🔴 ISSUE 1: template_loader.py silently skips array-format category files

`_load_json()` returns `None` for JSON arrays — only dicts are accepted:

```python
if isinstance(data, dict):
    return data
return None  # arrays silently dropped
```

The 13 root-level category files (`category-a.json` through `category-m.json`) each contain an **array of 10 agents** = **130 agent definitions are completely inaccessible** via `list_templates()` and `load_template()`.

**Impact:** 43% of library agents are unreachable by the CLI.

### 🔴 ISSUE 2: 73 broken skillRef paths (100% broken)

All AEC subdirectory files (73 files) reference SKILL.md files that do not exist.

| Pattern | Count | Example |
|---------|-------|---------|
| `skills/blender/*/SKILL.md` | 26 | `skills/blender/core/blender-core-api/SKILL.md` |
| `skills/bonsai/*/SKILL.md` | 14 | `skills/bonsai/core/bonsai-core-architecture/SKILL.md` |
| `skills/aec-cross-tech/*/SKILL.md` | 2 | `skills/aec-cross-tech/core/aec-core-bim-workflows/SKILL.md` |
| `skills/ifcopenshell/*/SKILL.md` | 19 | `skills/ifcopenshell/core/ifcos-core-concepts/SKILL.md` |
| `skills/sverchok/*/SKILL.md` | 12 | `skills/sverchok/core/sverchok-core-concepts/SKILL.md` |
| **Total** | **73** | |

These skills directories do not exist in the repo root. Skills are referenced but never resolved at runtime.

### 🔴 ISSUE 3: modelHint missing in 90+ files

| Directory | Files | Have modelHint | Missing |
|-----------|-------|----------------|---------|
| `core/` | 19 | 9 | 10 |
| `code-dev/` | 10 | 0 | 10 |
| `communication/` | 7 | 0 | 7 |
| `data-transform/` | 10 | 0 | 10 |
| `erpnext/` | 10 | 0 | 10 |
| `file-system/` | 5 | 0 | 5 |
| `git-versioning/` | 8 | 0 | 8 |
| `research/` | 10 | 0 | 10 |
| `review-quality/` | 10 | 0 | 10 |
| `text-language/` | 10 | 0 | 10 |
| `agents/presets/` | 10 | 0 | 10 |
| **Total** | **109** | **9** | **100** |

---

## Warnings

### 🟡 ISSUE 4: modelHint format inconsistent

Two different formats are used — should be the shorthand format only:

| Format | Count | Status |
|--------|-------|--------|
| `claude/sonnet` | ~51 | 🟢 Correct |
| `claude/haiku` | ~24 | 🟢 Correct |
| `claude/opus` | ~7 | 🟢 Correct |
| `anthropic/claude-sonnet-4-6` | 121 | 🟡 Wrong field (model ID, not hint) |
| `anthropic/claude-haiku-4-5` | 8 | 🟡 Wrong field |
| `anthropic/claude-haiku-4-5-20251001` | 1 | 🟡 Wrong field |

The `anthropic/claude-*` format belongs in the `model` field, not `modelHint`. The 130 category-file agents all use the wrong format in `modelHint`.

### 🟡 ISSUE 5: 13 category files missing top-level `model` field

The 13 root category JSON files are arrays, not objects. They have no top-level `model` field. The `model` field exists inside each agent in the array. This format is inconsistent with other templates and incompatible with `template_loader.py`.

### 🟡 ISSUE 6: ROADMAP count discrepancy

| Count Method | Value |
|--------------|-------|
| ROADMAP claims | 293 |
| Individual JSON agent files (library) | 172 |
| Agents inside category arrays | 130 |
| Presets (`agents/presets/`) | 10 |
| **Total definitions** | **312** |
| Loadable by template_loader | **172** |

The ROADMAP likely counts 293 based on (172 + 130 - 13 category files + 4 overlap?). Exact reconciliation unclear, but the fundamental count gap is significant.

### 🟡 ISSUE 7: `agents/presets/` not scanned by template_loader

`LIBRARY_DIR = REPO_ROOT / "agents" / "library"` — presets directory is excluded. The 10 preset agents are not accessible via `list_templates()`.

---

## Per-Template Status: Core Library (19 files)

| Template | id | name | systemPrompt | model | modelHint | skillRef | Status |
|----------|----|------|-------------|-------|-----------|----------|--------|
| agent-generator.json | auto | ✅ | ✅ | ✅ | ✅ claude/sonnet | none | 🟢 |
| check-security.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| explain-code.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| find-bugs.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| format-code.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| generate-commit-msg.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| generate-test.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| guardian-handoff.json | auto | ✅ | ✅ | ✅ | ✅ claude/sonnet | none | 🟢 |
| guardian-lessons.json | auto | ✅ | ✅ | ✅ | ✅ claude/sonnet | none | 🟢 |
| guardian-quality.json | auto | ✅ | ✅ | ✅ | ✅ claude/sonnet | none | 🟢 |
| guardian-roadmap.json | auto | ✅ | ✅ | ✅ | ✅ claude/haiku | none | 🟢 |
| iterative-planner.json | auto | ✅ | ✅ | ✅ | ✅ claude/opus | none | 🟢 |
| output-assessor.json | auto | ✅ | ✅ | ✅ | ✅ claude/sonnet | none | 🟢 |
| read-file.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| search-in-files.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| session-start-orchestrator.json | auto | ✅ | ✅ | ✅ | ✅ claude/sonnet | none | 🟢 |
| skill-tester.json | auto | ✅ | ✅ | ✅ | ✅ claude/sonnet | none | 🟢 |
| summarize.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |
| translate.json | auto | ✅ | ✅ | ✅ | ❌ missing | none | 🔴 |

**Core result:** 9/19 fully valid 🟢, 10/19 missing modelHint 🔴

---

## Per-Template Status: Presets (10 files)

| Template | id | name | systemPrompt | model | modelHint | Status |
|----------|----|------|-------------|-------|-----------|--------|
| api-designer.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| bug-hunter.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| code-reviewer.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| database-modeler.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| devops-engineer.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| documentation-writer.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| performance-analyst.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| refactoring-expert.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| security-auditor.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |
| test-generator.json | none | ✅ | ✅ | ✅ | ❌ missing | 🔴 |

**Presets result:** 0/10 fully valid 🔴. All missing modelHint AND not scanned by template_loader.

---

## Per-Directory Status: Subdirectory Agents

| Directory | Count | Has modelHint | Has model | Has skillRef | SkillRef valid | Status |
|-----------|-------|---------------|-----------|--------------|----------------|--------|
| aec-blender/ | 26 | 26/26 ✅ | 26/26 ✅ | 26/26 | 0/26 ❌ | 🔴 |
| aec-bonsai/ | 14 | 14/14 ✅ | 14/14 ✅ | 14/14 | 0/14 ❌ | 🔴 |
| aec-cross/ | 2 | 2/2 ✅ | 2/2 ✅ | 2/2 | 0/2 ❌ | 🔴 |
| aec-ifcopenshell/ | 19 | 19/19 ✅ | 19/19 ✅ | 19/19 | 0/19 ❌ | 🔴 |
| aec-sverchok/ | 12 | 12/12 ✅ | 12/12 ✅ | 12/12 | 0/12 ❌ | 🔴 |
| code-dev/ | 10 | 0/10 ❌ | 10/10 ✅ | 0/10 | n/a | 🟡 |
| communication/ | 7 | 0/7 ❌ | 7/7 ✅ | 0/7 | n/a | 🟡 |
| core/ | 19 | 9/19 🟡 | 19/19 ✅ | 0/19 | n/a | 🟡 |
| data-transform/ | 10 | 0/10 ❌ | 10/10 ✅ | 0/10 | n/a | 🟡 |
| erpnext/ | 10 | 0/10 ❌ | 10/10 ✅ | 0/10 | n/a | 🟡 |
| file-system/ | 5 | 0/5 ❌ | 5/5 ✅ | 0/5 | n/a | 🟡 |
| git-versioning/ | 8 | 0/8 ❌ | 8/8 ✅ | 0/8 | n/a | 🟡 |
| research/ | 10 | 0/10 ❌ | 10/10 ✅ | 0/10 | n/a | 🟡 |
| review-quality/ | 10 | 0/10 ❌ | 10/10 ✅ | 0/10 | n/a | 🟡 |
| text-language/ | 10 | 0/10 ❌ | 10/10 ✅ | 0/10 | n/a | 🟡 |
| category-*.json | 13 (=130 def) | 130/130 🟡 | ❌ no file-level | none | n/a | 🔴 |

---

## Valid Model Values

All `model` field values found are valid Anthropic model IDs:
- `anthropic/claude-sonnet-4-6` — 172 files
- `anthropic/claude-haiku-4-5` — 47 files
- `anthropic/claude-opus-4-6` — 1 file
- Missing (category array files have per-agent model fields) — 13 files

---

## Recommendations

| Priority | Action |
|----------|--------|
| 🔴 P1 | Fix `template_loader.py` to handle array-format JSON (or convert category files to individual JSONs) |
| 🔴 P1 | Create missing skill files for 73 AEC agents or remove/fix broken `skillRef` paths |
| 🔴 P2 | Add `modelHint` field to 100 templates (core 10, presets 10, code-dev/comms/data/erpnext/fs/git/research/review/text = 80) |
| 🟡 P2 | Fix `modelHint` format in category files: replace `anthropic/claude-*` with `claude/sonnet`/`claude/haiku`/`claude/opus` |
| 🟡 P3 | Move `agents/presets/` into `agents/library/presets/` so template_loader discovers them |
| 🟡 P3 | Reconcile ROADMAP count (293) with actual agent definition count (312 or 172 loadable) |
