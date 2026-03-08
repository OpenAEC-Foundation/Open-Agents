# Validatierapport: oa-orchestration

Datum: 2026-03-08
Validator: skill-validator-orchestration

---

## Samenvatting

| Skill | Structuur | Content | Trigger | Syntax | Oordeel |
|-------|-----------|---------|---------|--------|---------|
| oa-orchestration-spawn | ✅ | ⚠️ | ✅ | ⚠️ | FAIL |
| oa-orchestration-pipeline | ✅ | ✅ | ✅ | ⚠️ | FAIL |
| oa-orchestration-communication | ✅ | ⚠️ | ✅ | ✅ | PASS |
| oa-orchestration-patterns | ✅ | ✅ | ⚠️ | ✅ | PASS |
| oa-orchestration-delegate | ✅ | ✅ | ⚠️ | ⚠️ | PASS |

> FAILs zijn uitsluitend op basis van **Core** criteria uit SKILL-PROTOCOL.md §5/§7.
> WARNs zijn **Nice** verbeteringen die kwaliteit verhogen maar geen blokkers zijn.

---

## Issues

### oa-orchestration-spawn

- ❌ **FAIL — Structuur/Frontmatter**: `disable-model-invocation: true` ontbreekt.
  `oa run` spawnt agents (side effect). Per SKILL-PROTOCOL.md §5 en §7 is dit **Core** voor orchestration/spawn skills.
  **Fix**: Voeg toe aan frontmatter:
  ```yaml
  disable-model-invocation: true
  ```

- ⚠️ **WARN — Content**: Critical rules gebruiken "Include…" / "Do not…" format, niet ALWAYS/NEVER.
  Protocol schrijft `ALWAYS {action} — {reason}` en `NEVER {action} — {reason}` voor (§4 Imperative Language). Reasoning is aanwezig, format wijkt af.
  **Fix**: Herformuleer b.v. `Include --direct in every oa run call — without it...` → `ALWAYS include --direct — without it, output goes to volatile /tmp/ and is lost on reboot (L-010).`

- ⚠️ **WARN — Content**: Geen `## Anti-Patterns` sectie. Protocol (§2 template + §8 checklist) verwacht een explicit anti-patterns blok met bad→good vergelijkingen.

- ⚠️ **WARN — Content**: Geen `## Instructions` sectie met genummerde stappen. Protocol §2 specificeert Instructions als vaste sectie volgorde: Critical Rules → Decision Tree → **Instructions** → Patterns → Anti-Patterns → References. Quick Reference vervangt dit niet volledig.

- ⚠️ **WARN — Syntax**: Pattern 2 (Full flag reference) toont een multi-line `oa run` met ingesprongen vlaggen zonder `\` continuations. Niet uitvoerbaar als bash. Voeg een expliciete noot toe of gebruik `\` backslashes.

---

### oa-orchestration-pipeline

- ❌ **FAIL — Frontmatter**: `disable-model-invocation: true` ontbreekt.
  `oa pipeline` spawnt automatisch planner + workers (side effect). Per SKILL-PROTOCOL.md §7 tabel is dit **Core** voor pipeline skills (zelfde categorie als spawn).
  **Fix**: Voeg toe aan frontmatter:
  ```yaml
  disable-model-invocation: true
  ```

- ⚠️ **WARN — Frontmatter**: `allowed-tools: Bash(oa *)` ontbreekt. Protocol §7 specificeert `Bash(oa *)` voor orchestration/side-effect skills. Spawn en delegate hebben dit wel.

- ⚠️ **WARN — Content**: Sectievolgorde wijkt af. Ontbrekend: `## Anti-Patterns` sectie (protocol §2 en §8). De anti-patterns zijn aanwezig als inline `- Bad:` bullets onder `## Anti-Patterns` — snel gecheckt: wél aanwezig op regel 73-77. Maar sectie staat ná References-equivalent, niet vóór. Volgorde: protocol schrijft Anti-Patterns vóór References.
  Feitelijk: de skill heeft geen `## References` sectie maar wel een `## References` equivalent. Correct format is aanwezig, volgorde acceptabel. Dit is een cosmetische WARN.

---

### oa-orchestration-communication

- ⚠️ **WARN — Content**: Critical rules gebruiken "Include…" / "Run…" / "Do not…" format, niet ALWAYS/NEVER.
  Protocol §4 schrijft ALWAYS/NEVER voor bij non-negotiable rules. Reasoning is aanwezig in alle drie gevallen, maar format wijkt af van de standaard.
  **Fix**: Herformuleer b.v.:
  - `Include --from flag when sending messages — ...` → `ALWAYS include --from — omitting it defaults sender to 'user', making agent attribution impossible in multi-agent sessions.`
  - `Run oa collect only after status is done — ...` → `NEVER run oa collect on a running agent — output file may not yet be written; wait for done status.`

---

### oa-orchestration-patterns

- ⚠️ **WARN — Trigger**: Beschrijving heeft potentiële overlap met oa-orchestration-pipeline (`build pipeline` keyword) en oa-orchestration-delegate (`orchestrator` concept). Gebruikers die vragen naar `build pipeline` zouden beide skills kunnen triggeren.
  **Fix**: Voeg een `Not for:` clause toe in description:
  ```yaml
  description: "4 reusable agent orchestration patterns: Research Swarm, Build Pipeline, Review Chain, Batch Processor. Use when choosing how to structure multi-agent work. Not for: oa pipeline command syntax (see oa-orchestration-pipeline) or oa delegate syntax (see oa-orchestration-delegate). Activates for: orchestration pattern, research swarm, build pipeline, review chain, batch processor."
  ```
  LET OP: controleer woordtelling — dit is nu >50 woorden. Inkorten tot ≤50 woorden.

- ⚠️ **WARN — Content**: Geen `## Instructions` sectie. Protocol sectievolgorde: Critical Rules → Decision Tree → **Instructions** → Patterns. Voor een reference/patterns skill is dit acceptabel, maar de sectie ontbreekt volledig. Decision Tree springt direct naar Patterns.

---

### oa-orchestration-delegate

- ⚠️ **WARN — Trigger**: Lichte overlap met oa-orchestration-spawn: beide skills bespreken de keuze `oa run` vs. alternatieven in hun Decision Tree. Geen echte false positive risk — de keywords in de descriptions zijn voldoende gedifferentieerd.

- ⚠️ **WARN — Syntax**: Pattern 2 (Full flag reference) toont multi-line `oa delegate` zonder `\` backslashes. Niet uitvoerbaar als bash. Voeg een noot toe of gebruik backslash continuations.

---

## Aanbevelingen

### Prioriteit 1 — Core FAILs (direct fixen)

1. **oa-orchestration-spawn**: Voeg `disable-model-invocation: true` toe aan frontmatter.
2. **oa-orchestration-pipeline**: Voeg `disable-model-invocation: true` toe aan frontmatter. Voeg ook `allowed-tools: Bash(oa *)` toe voor consistentie met spawn en delegate.

### Prioriteit 2 — Content kwaliteit (Nice)

3. **oa-orchestration-spawn + oa-orchestration-communication**: Herformuleer critical rules naar ALWAYS/NEVER format met because-clauses per protocol §4.
4. **oa-orchestration-spawn**: Voeg `## Anti-Patterns` sectie toe. Voeg `## Instructions` sectie toe met numbered steps (minimaal: start session, spawn, monitor).
5. **oa-orchestration-spawn + oa-orchestration-delegate**: Fix Pattern 2 multi-line bash syntax met `\` continuations of voeg commentaar toe dat dit een reference-only weergave is.

### Prioriteit 3 — Trigger overlap (Nice)

6. **oa-orchestration-patterns**: Voeg `Not for:` clause toe in description om overlap te reduceren met oa-orchestration-pipeline en oa-orchestration-delegate. Houd description ≤50 woorden.

---

## Verificatie oa-cli syntax

Alle gevalideerde commando's geverifieerd tegen `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py`:

| Commando | Status |
|----------|--------|
| `oa run "<task>" --name X --model Y --direct` | ✅ correct |
| `oa run ... --parent X --template Y --context-skills Z --guardians` | ✅ correct |
| `oa pipeline "<task>"` | ✅ correct |
| `oa pipeline "<task>" --model claude/opus` | ✅ correct |
| `oa status` | ✅ correct |
| `oa collect <name>` | ✅ correct |
| `oa send <to> "<msg>" --from <sender>` | ✅ correct |
| `oa inbox <name>` | ✅ correct |
| `oa inbox <name> --unread` | ✅ correct |
| `oa inbox <name> --mark-read` | ✅ correct |
| `oa broadcast "<msg>" --from <sender>` | ✅ correct |
| `oa delegate "<task>" --name X --model Y --orchestrator-model Z` | ✅ correct |
| `oa delegate "<task>" --max-workers N` | ✅ correct |
| `oa start` | ✅ correct |
| `oa kill <name>` | ✅ correct |

Geen onjuiste syntax gevonden. Multi-line `oa run` / `oa delegate` zonder `\` zijn display-conventies, geen syntaxfouten in de CLI zelf.
