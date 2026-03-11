# Doc Guardian — Design Document

**Date:** 2026-03-11
**Author:** doc-guardian agent (spawned by meta)
**Status:** Implemented

---

## Overview

The Doc Guardian is an automatic documentation and release management system for Open-Agents. It ensures that README, docs, CHANGELOG, and GitHub releases stay synchronized with the actual codebase state at all times.

---

## Architecture

```
Trigger (push / release / manual)
         │
         ▼
  GitHub Actions: doc-guardian.yml
         │
         ├── generate-release-notes.py
         │         ├─ git log → categorize commits
         │         ├─ count agent templates
         │         └─ write release-notes.md + CHANGELOG.md
         │
         ├── Update README.md (agent count badge)
         │
         ├── Commit + push (bot commit, skip CI)
         │
         └── gh release edit (if release trigger)
```

---

## Files Created

### 1. Agent Template
**Path:** `agents/library/core/doc-guardian.json`

An oa-cli agent template that the guardian CLI command spawns. Contains full system prompt covering all three trigger types (release, feature-complete, manual) with concrete bash commands for:
- `git log` between tags
- Agent count via `find agents/library -name '*.json' | wc -l`
- CHANGELOG.md Keep a Changelog format
- GitHub release creation via `gh release create`

### 2. GitHub Actions Workflow
**Path:** `.github/workflows/doc-guardian.yml`

Triggers:
- `push` to `main` with paths: `oa-cli/**`, `agents/library/**`, `docs/**`
- `release` event type `published`
- `workflow_dispatch` with `trigger_type` input (release|feature|manual)

Steps:
1. Checkout with `fetch-depth: 0` (full git history for `git log`)
2. Python 3.11 setup
3. Install open-agents-cli from repo (`pip install -e oa-cli/`)
4. Determine trigger type and current tag
5. Generate release notes (release trigger only)
6. Update README.md agent count badge via `sed`
7. Bot commit + push (skips CI with `[skip ci]`)
8. Update GitHub release notes via `gh release edit`

### 3. Release Notes Generator Script
**Path:** `scripts/generate-release-notes.py`

CLI tool: `python scripts/generate-release-notes.py [--tag v0.3.1] [--prev v0.3.0]`

Features:
- Auto-detects previous tag via `git describe`
- Groups commits by conventional commit prefix: feat/fix/docs/refactor/perf/test/chore
- Counts agent templates recursively
- Reads version from `oa-cli/pyproject.toml`
- Writes `release-notes.md` + updates `CHANGELOG.md`
- Inserts new version section after `[Unreleased]`

### 4. CLI Command: `oa guardian`
**File:** `oa-cli/src/open_agents/cli.py`

```bash
oa guardian [release|feature|manual] [--tag v0.3.1]
```

Spawns the doc-guardian agent template with the specified trigger context. Uses the existing `spawn_agent` infrastructure with model `claude/sonnet`.

---

## Trigger Matrix

| Event | GitHub Actions | Agent Spawned | Output |
|-------|---------------|---------------|--------|
| Push to main (oa-cli/ or agents/) | `doc-guardian.yml` (feature) | No | CHANGELOG [Unreleased] update |
| `gh release create v*` | `doc-guardian.yml` (release) | No | release-notes.md + GitHub release notes |
| `oa guardian release --tag v0.3.1` | Manual | Yes (doc-guardian) | Full release docs |
| `oa guardian feature` | Manual | Yes (doc-guardian) | Docs update |
| `workflow_dispatch` | Manual GitHub UI | No | Depends on trigger_type |

---

## Commit Format (Release Notes Grouping)

The generator recognizes [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` / `feat(scope):` → 🚀 New Features
- `fix:` / `fix(scope):` → 🐛 Bug Fixes
- `docs:` → 📚 Documentation
- `refactor:` → ♻️ Refactoring
- `perf:` → ⚡ Performance
- `test:` → 🧪 Tests
- `chore:` → 🔧 Chores
- Anything else → 📝 Other

---

## Stats Section Format

```markdown
### 📊 Stats
- Agent templates: 1625
- Python: 3.10+
- Full diff: [v0.3.0...v0.3.1](https://github.com/...)
```

---

## Security Notes

- GitHub Actions uses `permissions: contents: write` (minimal required scope)
- Bot commits include `[skip ci]` to prevent workflow loops
- `GITHUB_TOKEN` is used (not a personal access token) for release edits
- No hardcoded credentials anywhere

---

## Usage Examples

```bash
# Manual release notes generation
python scripts/generate-release-notes.py --tag v0.3.1

# Spawn doc-guardian agent for a release
oa guardian release --tag v0.3.1

# Feature docs update
oa guardian feature

# Manual trigger via GitHub UI
gh workflow run doc-guardian.yml -f trigger_type=release
```

---

## Integration with Existing Guardians System

The doc-guardian CLI command (`oa guardian`) is a new top-level command distinct from `oa guardians` (the existing guardian registry system). The doc-guardian agent template can also be registered in the guardian registry for automatic triggering:

```bash
oa guardians --register
# Name: doc-guardian
# Trigger: release
# Task: ...
```
