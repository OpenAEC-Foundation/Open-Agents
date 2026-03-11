# Library Audit Report

**Date:** 2026-03-11
**Auditor:** library-auditor (claude/opus)

---

## 1. Summary

| Metric | Value |
|--------|-------|
| Total JSON files scanned | 1,453 |
| Total agents validated | 1,570 |
| Critical issues | 494 |
| Warnings | 132 |
| Clean (OK) | 944 |
| Categories after cleanup | 105 directories |

## 2. Schema Validation

### Required fields
Every agent JSON must have: `id`, `name`, `description`, `atomic`, `systemPrompt`, `tools`, `tags`, `modelHint`

### Critical Issues (missing required fields)

| Source | Issue | Count |
|--------|-------|-------|
| category-*.json (root files) | Missing `atomic`, `tags` | 130 agents → **FIXED**: extracted to subdirectories |
| api-design-v2/*.json | Missing `tags` | 10 agents → **FIXED**: merged into api-design/ |
| blockchain-defi/*.json | Missing `systemPrompt`, `tags` | 10 agents → merged into blockchain/ |
| database-ops/*.json | Missing `tags` | 10 agents → merged into database/ |
| testing-v2/*.json | Missing `tags` | 9 agents → merged into testing/ |

### Warnings (non-critical)

| Pattern | Issue | Count |
|---------|-------|-------|
| aec-* agents | `modelHint` uses `claude/sonnet` instead of `anthropic/claude-*` | 73 |
| aec-* agents | Description > 150 chars | 70 |
| ai-safety agents | Description > 150 chars | 5 |

**Note:** The `claude/sonnet` modelHint format is used consistently across aec-* agents. This is a convention choice — the oa-cli supports both `claude/sonnet` and `anthropic/claude-*` formats. No action required unless standardization is desired.

## 3. Duplicate Merges Performed

| Sources | Target | Result |
|---------|--------|--------|
| api-design + api-design-v2 + api-integration | **api-design/** | 83 agents (2 duplicates skipped) |
| testing + testing-qa + testing-v2 | **testing/** | 84 agents (1 duplicate skipped) |
| database + database-data + database-ops | **database/** | 85 agents (4 renamed with -merged suffix) |
| blockchain + blockchain-defi | **blockchain/** | 20 agents |

Duplicate IDs skipped during merge:
- `api-design-openapi-spec-writer` (already in api-design)
- `api-design-rest-endpoint-designer` (already in api-design)
- `testing-boundary-value-analyzer` (already in testing)

Renamed files (name collision, different content):
- `backup-strategy-planner-merged.json`
- `connection-pool-configurator-merged.json`
- `query-optimizer-merged.json`
- `slow-query-analyzer-merged.json`

## 4. Clutter Removed

All moved to `agents/library/_archive/` (not deleted):

| File(s) | Count |
|---------|-------|
| batch4-report.md through batch17-report.md | 14 |
| fix-report.txt | 1 |
| category-a.json through category-m-design-ux.json | 13 |
| **Total archived** | **28** |

### Category file extraction (before archiving)

| Category file | Extracted to | Agents |
|---------------|-------------|--------|
| category-a.json (code analysis) | code-dev/ | 10 |
| category-b.json (code generation) | code-dev/ | 10 |
| category-c.json (documentation) | documentation/ | 10 |
| category-d.json (devops) | devops/ | 10 |
| category-e.json (data processing) | data-pipeline/ | 10 |
| category-f.json (communication) | communication/ | 10 |
| category-g.json (research) | research/ | 10 |
| category-h.json (quality assurance) | review-quality/ | 10 |
| category-i.json (project management) | project-management/ | 10 |
| category-j.json (infrastructure) | infrastructure/ | 10 |
| category-k (PM roles) | project-management/ | 10 |
| category-l (security compliance) | security/ | 10 |
| category-m (design UX) | design-system/ | 10 |

## 5. Skills Validation

### Global skills (~/.claude/skills/)

| Skill | Status | Notes |
|-------|--------|-------|
| algorithmic-art | OK | Frontmatter present |
| brand-guidelines | OK | |
| brand-guidelines-slim | OK | |
| canvas-design | OK | |
| core-files | OK | |
| core-files-backup-2026-03-09 | OK | Backup copy |
| **delegatie-override** | **MISSING SKILL.md** | Empty skill directory |
| frontend-design | OK | |
| mcp-builder | OK | |
| oa-skill-watcher | OK | |
| pdf | OK | |
| skill-creator | OK | |
| skill-tester | OK | |
| theme-factory | OK | |
| web-artifacts-builder | OK | |
| webapp-testing | OK | |
| workspace-tester | OK | |

### Project skills (Open-Agents/.claude/skills/)

| Skill | Frontmatter | Desc words | Status |
|-------|------------|------------|--------|
| brand-guidelines | Yes | 24 | OK |
| oa-agent-library-builder | Yes | 46 | OK |
| oa-cli-architecture | Yes | 18 | OK |
| oa-library-discovery | **No** | 37 | WARNING: missing frontmatter |
| oa-library-templates | **No** | 41 | WARNING: missing frontmatter |
| oa-orchestration-communication | Yes | 37 | OK |
| oa-orchestration-delegate | Yes | 32 | OK |
| oa-orchestration-patterns | Yes | 34 | OK |
| oa-orchestration-pipeline | Yes | 28 | OK |
| oa-orchestration-spawn | Yes | 38 | OK |
| oa-prompting-5element | Yes | 30 | OK |
| oa-prompting-delegation | Yes | 39 | OK |
| oa-prompting-model-tiering | Yes | 31 | OK |
| oa-prompting-scope | Yes | 38 | OK |
| oa-quality-fix-agent | Yes | 36 | OK |
| oa-quality-gates | Yes | 38 | OK |
| oa-quality-guardians | Yes | 39 | OK |
| oa-skill-watcher | Yes | **54** | WARNING: description > 50 words (L-057) |
| oa-state-agents-json | Yes | 39 | OK |
| oa-state-checkpoint | Yes | 38 | OK |
| oa-state-collect | Yes | 41 | OK |
| oa-state-lifecycle | Yes | 36 | OK |
| oa-state-workspace | Yes | 35 | OK |
| oa-teams-coordination | Yes | 40 | OK |
| oa-tmux-patterns | Yes | 20 | OK |
| oa-web-dashboard | Yes | 38 | OK |

**Skills issues found:**
1. `delegatie-override` (global) — empty, no SKILL.md
2. `oa-library-discovery` (project) — missing YAML frontmatter
3. `oa-library-templates` (project) — missing YAML frontmatter
4. `oa-skill-watcher` (project) — description exceeds 50-word limit (54 words)

## 6. Library Directory Structure (post-cleanup)

105 category directories, ~1,570 agents total. Top categories by size:

| Category | Agents |
|----------|--------|
| database | 85 |
| testing | 84 |
| api-design | 83 |
| infra-devops | 50 |
| core | 41 |
| code-dev | 40 |
| project-management | 30 |
| research | 30 |
| review-quality | 30 |
| communication | 27 |
| aec-blender | 26 |
| nlp | 25 |

Empty directories: `ar-vr/`, `logistics/` — consider removing or populating.

## 7. Recommendations

1. **Fix missing `tags` field** across merged agents (especially former api-design-v2, blockchain-defi, database-ops, testing-v2)
2. **Standardize `modelHint`** format project-wide (choose `claude/sonnet` or `anthropic/claude-sonnet-4-6`)
3. **Truncate descriptions** to ≤150 chars for consistency
4. **Fix skills**: remove empty `delegatie-override`, add frontmatter to `oa-library-discovery` and `oa-library-templates`
5. **Remove or populate** empty dirs: `ar-vr/`, `logistics/`
6. **Consider deleting** `_archive/` after confirming contents are no longer needed
