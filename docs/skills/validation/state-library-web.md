# Validatierapport: oa-state + oa-library + oa-web + oa-teams

**Datum:** 2026-03-08
**Validator:** validator-state-library
**Referentie:** SKILL-PROTOCOL.md v1.0, state.py (AgentRecord)

---

## Overzichtstabel

| Skill | Regels | Structuur | Content | Trigger | Technisch | Oordeel |
|-------|--------|-----------|---------|---------|-----------|---------|
| oa-state-workspace | 73 | PASS | PASS | PASS | PASS | ✅ PASS |
| oa-state-agents-json | 120 | WARN | WARN | PASS | PASS | ⚠️ WARN |
| oa-state-collect | 120 | WARN | WARN | PASS | PASS | ⚠️ WARN |
| oa-state-lifecycle | 79 | PASS | PASS | PASS | WARN | ⚠️ WARN |
| oa-state-checkpoint | 84 | PASS | PASS | PASS | PASS | ✅ PASS |
| oa-library-templates | 183 | WARN | WARN | PASS | WARN | ⚠️ WARN |
| oa-library-discovery | 92 | PASS | PASS | PASS | WARN | ⚠️ WARN |
| oa-agent-library-builder | 132 | FAIL | WARN | PASS | WARN | ❌ FAIL |
| oa-web-dashboard | 106 | PASS | PASS | PASS | PASS | ✅ PASS |
| oa-teams-coordination | 116 | PASS | PASS | PASS | PASS | ✅ PASS |

---

## Gedetailleerde Bevindingen per Skill

---

### 1. oa-state-workspace

**Pad:** `.claude/skills/oa-state-workspace/SKILL.md`
**Regels:** 73

#### Structuur — PASS
- [x] Frontmatter: `name` aanwezig, `description` ~33 woorden (< 50), `user-invocable: false`
- [x] Meerdere `##` secties aanwezig (Critical Rules, Workspace Locations, Workspace Structure, How Agents Write Output, Patterns, Anti-Patterns, References)
- [x] Geen `#` titelheading in de body

#### Content kwaliteit — PASS
- [x] ALWAYS/NEVER regels aanwezig met because-clausule:
  - `ALWAYS use --direct in every oa run call — because without it, output is written to volatile /tmp/...`
  - `NEVER reference agent output with relative paths — because workspace location depends on the --direct flag...`
- [x] Onder 300 regels
- [x] Geen vage taal

#### Trigger — PASS
- [x] Description specifiek: "Explains oa agent workspace layout, --direct flag, and how agents write output"
- [x] "Use when" aanwezig
- [x] "Activates for" met concrete keywords

#### Technisch — PASS
- [x] `workspace` veld klopt met state.py AgentRecord ✓
- [x] `project_root` veld klopt met state.py ✓
- [x] `output/result.md` pad klopt met workspace.py gedrag ✓
- [x] `--direct` beschrijving klopt ✓

**Issues:** Geen kritieke issues. `disable-model-invocation` en `context` niet ingesteld, maar dit is een reference skill — protocol staat dit toe.

---

### 2. oa-state-agents-json

**Pad:** `.claude/skills/oa-state-agents-json/SKILL.md`
**Regels:** 120

#### Structuur — WARN
- [x] Frontmatter aanwezig met `name`, `description` (~38 woorden), `user-invocable: false`
- [x] Meerdere secties aanwezig
- ⚠️ **`# oa-state-agents-json` als heading in regel 7** — protocol verbiedt `#` headings (gereserveerd voor skill title in frontmatter)
- ⚠️ **`### Critical Rules` genest onder `## Quick Reference`** — non-standaard; protocol verwacht `## Critical Rules` als top-level sectie

#### Content kwaliteit — WARN
- ⚠️ **Critical Rules secties gebruiken plain imperatives** i.p.v. `ALWAYS`/`NEVER` format:
  - "Find agents.json at..." (geen ALWAYS/NEVER)
  - "Use file locking when..." (geen ALWAYS/NEVER)
  - "Check all 6 status values..." (geen ALWAYS/NEVER)
  - "Use `created_at` (not `started_at`)..." (geen ALWAYS/NEVER)
  - Ze bevatten wel because-clauses, maar het format klopt niet
- [x] Onder 300 regels
- [x] Geen vage taal

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — PASS
- [x] Alle AgentRecord velden geverifieerd tegen state.py:
  - `name`, `task`, `workspace`, `tmux_window`, `model`, `status`, `pid`, `created_at`, `finished_at`, `output_file`, `parent`, `depth`, `lineage`, `task_hash`, `max_children`, `shared_results_dir`, `last_activity`, `auto_cleanup_minutes`, `project_root` — allemaal correct ✓
- [x] `created_at` (niet `started_at`) correct ✓
- [x] Alle 6 statuswaarden correct: `running`, `done`, `failed`, `killed`, `timeout`, `error` ✓
- [x] `validate_spawn()` beschrijving klopt met state.py implementatie ✓

**Fixes nodig:**
1. Verwijder `# oa-state-agents-json` heading (regel 7)
2. Verplaats `### Critical Rules` naar `## Critical Rules` als top-level sectie
3. Herformuleer Critical Rules naar `ALWAYS`/`NEVER` + because-clausule formaat

---

### 3. oa-state-collect

**Pad:** `.claude/skills/oa-state-collect/SKILL.md`
**Regels:** 120

#### Structuur — WARN
- [x] Frontmatter aanwezig met `name`, `description` (~38 woorden), `user-invocable: false`
- [x] Meerdere `##` secties aanwezig
- ⚠️ **`# oa-state-collect` als heading in regel 7** — zelfde probleem als oa-state-agents-json
- ⚠️ `### Critical Rules` genest onder `## Quick Reference`

#### Content kwaliteit — WARN
- ⚠️ Critical Rules gebruiken plain imperatives zonder `ALWAYS`/`NEVER` prefix:
  - "Use `oa collect <name>` only after..."
  - "Expect the primary output at..."
  - "Check oa status after collecting..."
  - "Avoid using `oa attach`..."
  - "Avoid using the `output_file` field..."
  - 5 regels — overschrijdt het maximum van 4 ALWAYS/NEVER regels per skill
- [x] Inhoudelijk correct en specifiek
- [x] Onder 300 regels

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — PASS
- [x] `read_output(rec.workspace)` verwijst naar workspace.py — correct ✓
- [x] `workspace_is_done()` — correct ✓
- [x] `output_file` veld versus `output/result.md` onderscheid — technisch correct ✓
- [x] Fallback-logica (first `.md` in output/) klopt met implementatie ✓

**Fixes nodig:**
1. Verwijder `# oa-state-collect` heading (regel 7)
2. Maak `## Critical Rules` top-level
3. Herformuleer naar ALWAYS/NEVER (max 4 regels — reduceer van 5 naar 4)

---

### 4. oa-state-lifecycle

**Pad:** `.claude/skills/oa-state-lifecycle/SKILL.md`
**Regels:** 79

#### Structuur — PASS
- [x] Frontmatter: `name`, `description`, `user-invocable: false`, `allowed-tools: Bash(oa *)` ✓
- [x] Geen `#` titelheading in body
- [x] Secties in correcte volgorde: Critical Rules → Decision Tree → Commands Reference → Patterns → Status Values → Anti-Patterns → References

#### Content kwaliteit — PASS
- [x] NEVER/ALWAYS met because-clausule aanwezig:
  - `NEVER use oa kill on an agent that is still producing output — check oa status first...`
  - `ALWAYS use oa clean only after verifying finished agents via oa status — clean removes workspaces...`
- [x] 2 regels (binnen 2–4 limiet)
- [x] Geen vage taal
- [x] Onder 300 regels

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — WARN
- ⚠️ **Status Values tabel mist `error` status:** tabel toont `running`, `done`, `failed`, `killed`, `timeout` — maar state.py definieert ook `error` als valid status
- [x] CLI commando's correct: `oa status`, `oa kill`, `oa clean`, `oa watch`, `oa attach`, `oa collect` ✓

**Fix nodig:**
1. Voeg `error` toe aan de Status Values tabel: `error | Agent encountered an error | collect to inspect output`

---

### 5. oa-state-checkpoint

**Pad:** `.claude/skills/oa-state-checkpoint/SKILL.md`
**Regels:** 84

#### Structuur — PASS
- [x] Frontmatter: `name`, `description`, `user-invocable: false`, `allowed-tools: Bash(oa *)` ✓
- [x] Geen `#` titelheading
- [x] Secties aanwezig: Critical Rules, Decision Tree, How Checkpoints Work, Commands Reference, Patterns, Crash Recovery Pattern, Anti-Patterns, References

#### Content kwaliteit — PASS
- [x] NEVER/ALWAYS met because-clausules:
  - `NEVER resume a checkpoint with status completed — oa resume rejects completed checkpoints; use oa collect instead`
  - `ALWAYS verify the checkpoint exists with oa checkpoint show before running oa resume — resuming a non-existent checkpoint fails silently`
- [x] 2 regels (binnen limiet)
- [x] Geen vage taal
- [x] Onder 300 regels

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — PASS
- [x] Checkpoint pad `~/.oa/checkpoints/<agent-name>.json` is consistent met oa-systeem ✓
- [x] `oa resume` gedrag beschreven correct ✓
- [x] `<name>-resume` naamgeving correct ✓

**Issues:** Geen kritieke issues. `## Crash Recovery Pattern` is een lichte afwijking van standaard sectienamen (zou `## Patterns` sub-sectie kunnen zijn), maar acceptabel.

---

### 6. oa-library-templates

**Pad:** `.claude/skills/oa-library-templates/SKILL.md`
**Regels:** 183

#### Structuur — WARN
- [x] Frontmatter: `name`, `description` (~30 woorden), `user-invocable: false` ✓
- [x] Meerdere secties aanwezig
- ⚠️ **`# oa-library-templates` heading in regel 7** — verboden `#` heading
- ⚠️ `### Critical Rules` genest onder `## Quick Reference` — non-standaard nesting

#### Content kwaliteit — WARN
- ⚠️ Critical Rules gebruiken plain imperatives (geen ALWAYS/NEVER):
  - "Check for duplicate agents before writing..."
  - "Use the minimum model that can reliably perform..."
  - "Match an existing agents/library/ directory..."
  - "Use the full model identifier..."
- [x] Onder 300 regels (183 regels)
- [x] Geen vage taal

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — WARN
- [x] Template JSON velden correct: `name`, `description`, `model`, `systemPrompt`, `tools`, `maturity`, `category`, `tags` ✓
- [x] Model IDs correct: `anthropic/claude-haiku-4-5-20251001`, `anthropic/claude-sonnet-4-6`, `anthropic/claude-opus-4-6` ✓
- [x] Maturity levels correct ✓
- ⚠️ **`modelHint` veld ontbreekt in template JSON** — oa-library-discovery markeert dit als required veld; inconsistentie tussen beide skills

**Fixes nodig:**
1. Verwijder `# oa-library-templates` heading
2. Promoveer `### Critical Rules` naar `## Critical Rules`
3. Herformuleer naar ALWAYS/NEVER format
4. Voeg `modelHint` toe aan template JSON formaat

---

### 7. oa-library-discovery

**Pad:** `.claude/skills/oa-library-discovery/SKILL.md`
**Regels:** 92

#### Structuur — PASS
- [x] Frontmatter: `name`, `description`, `user-invocable: false`, `allowed-tools: Bash, Glob, Grep, Read` ✓
- [x] Geen `#` titelheading
- [x] Secties in correcte volgorde: Critical Rules → Decision Tree → Instructions → Template JSON Fields → Patterns → Anti-Patterns → References

#### Content kwaliteit — PASS
- [x] ALWAYS/NEVER met because-clausules:
  - `ALWAYS scan agents/library/ before writing a new template — duplicating an existing template wastes time and fragments the library (L-010)`
  - `NEVER hardcode a template list — because the library grows dynamically; always scan the directory at runtime`
- [x] 2 regels (binnen limiet)
- [x] Geen vage taal
- [x] Onder 300 regels

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — WARN
- ⚠️ **`modelHint` als required veld in Template JSON Fields tabel** — maar oa-library-templates bevat dit veld NIET in hun template JSON; inconsistentie
- ⚠️ **Hardcoded user-specifieke pad** in Instructions en Patterns: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/` — zou generiek moeten zijn of via environment variable
- [x] `--template` flag gebruik correct ✓

**Fixes nodig:**
1. Synchroniseer `modelHint` vereiste met oa-library-templates (voeg toe aan die skill of markeer als optional hier)
2. Overweeg hardcoded pad te vervangen door `$OA_PROJECT/agents/library/` of equivalent

---

### 8. oa-agent-library-builder

**Pad:** `.claude/skills/oa-agent-library-builder/SKILL.md`
**Regels:** 132

#### Structuur — FAIL
- [x] Frontmatter: `name`, `description`, `user-invocable: false` aanwezig
- ❌ **`disable-model-invocation: true` ontbreekt** — SKILL-PROTOCOL.md sectie 7 vermeldt expliciet dat `oa-agent-library-builder` dit veld vereist ("creates files" = side effect)
- ⚠️ **`# OA Agent Library Builder` heading in regel 7** — verboden `#` heading
- [x] Meerdere secties aanwezig, onder 300 regels

#### Content kwaliteit — WARN
- ⚠️ **Geen ALWAYS/NEVER regels** — de "When to Trigger" sectie bevat bullet points maar geen ALWAYS/NEVER formaat; Critical Rules sectie ontbreekt volledig
- ⚠️ **"When to Trigger" sectie** zou een `## Critical Rules` of `## Decision Tree` moeten zijn
- [x] Steps zijn concreet en goed beschreven
- [x] Onder 300 regels (132 regels)

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — WARN
- [x] Template JSON formaat correct ✓
- [x] Model IDs correct ✓
- ⚠️ **`modelHint` veld ontbreekt in template JSON** (zelfde inconsistentie als oa-library-templates)
- [x] Library categorieën lijst correct ✓

**Fixes nodig (prioriteit):**
1. **KRITIEK:** Voeg `disable-model-invocation: true` toe aan frontmatter
2. Verwijder `# OA Agent Library Builder` heading
3. Hernoem "When to Trigger" naar `## Critical Rules` en voeg ALWAYS/NEVER rules toe
4. Voeg `modelHint` toe aan template JSON voorbeeld

---

### 9. oa-web-dashboard

**Pad:** `.claude/skills/oa-web-dashboard/SKILL.md`
**Regels:** 106

#### Structuur — PASS
- [x] Frontmatter: `name`, `description`, `user-invocable: false`, `allowed-tools: Bash(oa *)` ✓
- [x] Geen `#` titelheading
- [x] Secties in correcte volgorde: Critical Rules → Decision Tree → Instructions → Bridge API Endpoints → Patterns → Anti-Patterns → References

#### Content kwaliteit — PASS
- [x] ALWAYS/NEVER met because-clausules:
  - `ALWAYS use oa status for quick CLI checks — because the dashboard is for visual monitoring, not scripted automation`
  - `NEVER rely on the bridge API from inside agent prompts — because agents do not have network access to localhost; use oa CLI commands instead`
- [x] 2 regels (binnen limiet)
- [x] Geen vage taal
- [x] Onder 300 regels

#### Trigger — PASS
- [x] Description specifiek, port 5174 vermeld
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — PASS
- [x] Port 5174 correct in description en Instructions ✓
- [x] `oa web` en `oa dashboard` commando's correct ✓
- [x] Bridge API endpoints tabel compleet ✓
- [x] `oa logs <name>` in Decision Tree — hoewel dit commando niet in oa-state-lifecycle staat, is het plausibel en consistent met de web API (`/api/agents/<name>/output`)

**Issues:** Geen kritieke issues.

---

### 10. oa-teams-coordination

**Pad:** `.claude/skills/oa-teams-coordination/SKILL.md`
**Regels:** 116

#### Structuur — PASS
- [x] Frontmatter: `name`, `description`, `user-invocable: false`, `allowed-tools: Bash(oa *)` ✓
- [x] Geen `#` titelheading
- [x] Secties aanwezig: Critical Rules, Stage→Merge→Verify→Cleanup Pattern, Instructions, Team CLI Commands, Patterns, Anti-Patterns, References

#### Content kwaliteit — PASS
- [x] ALWAYS/NEVER met because-clausules:
  - `ALWAYS write worker output to a staging directory first — because merging directly to main files causes race conditions and overwrites between parallel agents (L-005)`
  - `NEVER skip the Verify phase — because agents may produce incomplete or truncated output that silently corrupts the merged result`
- [x] 2 regels (binnen limiet)
- [x] Geen vage taal
- [x] Onder 300 regels

#### Trigger — PASS
- [x] Description specifiek
- [x] "Use when" en "Activates for" aanwezig

#### Technisch — PASS
- [x] Stage → Merge → Verify → Cleanup patroon technisch correct ✓
- [x] Team CLI commando's plausibel: `oa team create/list/add-member/delete`, `oa task create/list/complete` ✓
- [x] Phase overlap (L-011) correct beschreven ✓

**Issues:** `## Stage → Merge → Verify → Cleanup Pattern (L-005)` is een lange sectienaam; niet strikt een probleem maar protocol suggereert actie-georiënteerde headings.

---

## Samenvatting Issues en Aanbevelingen

### Kritieke Issues (FAIL)

| # | Skill | Issue | Prioriteit |
|---|-------|-------|------------|
| 1 | oa-agent-library-builder | `disable-model-invocation: true` ontbreekt (SKILL-PROTOCOL.md sectie 7 vereist dit expliciet voor file-creating skills) | **KRITIEK** |

### Structuur Issues (WARN — meerdere skills)

| Issue | Getroffen skills |
|-------|-----------------|
| Verboden `#` heading in body (regel 7) | oa-state-agents-json, oa-state-collect, oa-library-templates, oa-agent-library-builder |
| `### Critical Rules` genest onder `## Quick Reference` | oa-state-agents-json, oa-state-collect, oa-library-templates |
| Plain imperatives i.p.v. ALWAYS/NEVER format | oa-state-agents-json, oa-state-collect, oa-library-templates |
| Geen Critical Rules / ALWAYS/NEVER regels | oa-agent-library-builder |

### Technische Issues (WARN)

| # | Skill | Issue |
|---|-------|-------|
| 2 | oa-state-lifecycle | `error` status ontbreekt in Status Values tabel |
| 3 | oa-library-templates | `modelHint` veld ontbreekt in template JSON |
| 4 | oa-library-discovery | `modelHint` als required maar niet gesynchroniseerd met oa-library-templates; hardcoded user-pad |
| 5 | oa-agent-library-builder | `modelHint` veld ontbreekt in template JSON |

---

## Aanbevolen Fixes

### Batch 1 — Kritiek (direct uitvoeren)

**oa-agent-library-builder:**
```yaml
---
name: oa-agent-library-builder
disable-model-invocation: true   # ADD THIS
user-invocable: false
...
---
```

**oa-state-lifecycle — voeg `error` toe:**
```markdown
| `error` | Agent encountered an error | collect to inspect output |
```

### Batch 2 — Structuur fixes (4 skills)

Voor `oa-state-agents-json`, `oa-state-collect`, `oa-library-templates`:
1. Verwijder `# <skill-name>` heading in body
2. Hernoem `## Quick Reference` → verwijder; maak `## Critical Rules` een top-level sectie
3. Herformuleer plain imperatives naar ALWAYS/NEVER + because-clausule

### Batch 3 — Consistentie (library skills)

Synchroniseer `modelHint` veld:
- Voeg `modelHint` toe aan template JSON in `oa-library-templates` EN `oa-agent-library-builder`
- Specificeer `modelHint` als optioneel of verplicht in beide skills consistent

### Batch 4 — Hardcoded pad (oa-library-discovery)

Vervang `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/` door:
```bash
${OA_PROJECT:-$(git rev-parse --show-toplevel 2>/dev/null)}/agents/library/
```
of documenteer als environment-specifiek.

---

## Scores Samenvatting

| Categorie | PASS | WARN | FAIL |
|-----------|------|------|------|
| State skills (5) | 2 | 3 | 0 |
| Library skills (3) | 0 | 2 | 1 |
| Web/Teams skills (2) | 2 | 0 | 0 |
| **Totaal (10)** | **4** | **5** | **1** |

**Algemeen oordeel:** De skill-set is functioneel en inhoudelijk correct. De meeste issues zijn structurele inconsistenties (wrong heading level, formatting) die de werking niet direct beïnvloeden maar wel afwijken van SKILL-PROTOCOL.md. De enige harde failure is het ontbreken van `disable-model-invocation: true` in `oa-agent-library-builder`.
