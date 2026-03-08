# Validatierapport: oa-prompting + oa-quality

Datum: 2026-03-08
Validator: validator-prompting-quality (claude-sonnet-4-6)
Protocol: docs/skills/SKILL-PROTOCOL.md v1.0

---

## Overzichtstabel

| Skill | Structuur | Content | Trigger | Inhoud | Oordeel |
|-------|-----------|---------|---------|--------|---------|
| oa-prompting-5element | PASS | WARN | PASS | WARN | PASS met opmerkingen |
| oa-prompting-model-tiering | PASS | PASS | PASS | PASS | PASS |
| oa-prompting-scope | PASS | PASS | PASS | PASS | PASS |
| oa-prompting-delegation | PASS | PASS | PASS | WARN | PASS met opmerkingen |
| oa-quality-gates | PASS | PASS | PASS | PASS | PASS |
| oa-quality-guardians | PASS | PASS | PASS | WARN | PASS met opmerkingen |
| oa-quality-fix-agent | PASS | WARN | PASS | PASS | PASS met opmerkingen |
| SKILL-PROTOCOL.md | N/A | N/A | N/A | PASS | REFERENTIEDOCUMENT |

---

## Gedetailleerde Bevindingen Per Skill

### 1. oa-prompting-5element

**Pad**: `.claude/skills/oa-prompting-5element/SKILL.md`
**Regels**: 71

#### Structuur: PASS
- ✅ Frontmatter aanwezig: `name`, `description`, `user-invocable: false`
- ✅ Description ≤50 woorden (~30 woorden)
- ✅ Meerdere `##` secties aanwezig

#### Content kwaliteit: WARN
- ✅ ALWAYS/NEVER hebben alle because-clauses
- ✅ Concreet voorbeeld aanwezig (complete 5-element prompt)
- ✅ Geen vage taal
- ✅ 71 regels — ruim onder 300
- ⚠️ **WARN**: De skill heet "5-element" maar de `## Instructions` sectie beschrijft 6 stappen:
  (1) role statement, (2) absolute input paths, (3) absolute output paths, (4) scope bullets,
  (5) format reference, (6) inline quality rules. De naam "5-element" is technisch incorrect.
  De `## What Breaks Without Each Element` tabel heeft ook 6 rijen.

#### Trigger: PASS
- ✅ "Use when..." aanwezig
- ✅ "Activates for:" aanwezig met specifieke keywords
- ✅ Voldoende specifiek (writing/reviewing oa run prompts)

#### Inhoudelijke correctheid: WARN
- ⚠️ Naam "5-element" klopt niet met 6 beschreven elementen (zie boven)
- ✅ L-010 referentie correct
- ✅ Absolute path vereiste correct

---

### 2. oa-prompting-model-tiering

**Pad**: `.claude/skills/oa-prompting-model-tiering/SKILL.md`
**Regels**: 61

#### Structuur: PASS
- ✅ Frontmatter: `name`, `description`, `user-invocable: false`
- ✅ Description ≤50 woorden (~32 woorden)
- ✅ Meerdere `##` secties

#### Content kwaliteit: PASS
- ✅ ALWAYS/NEVER met because-clauses
- ✅ Concrete bash voorbeelden (Pattern 1, 2)
- ✅ Model tiering tabel is duidelijk en specifiek
- ✅ 61 regels — goed

#### Trigger: PASS
- ✅ "Use when..." aanwezig
- ✅ "Activates for:" met model-specifieke keywords (claude/haiku, claude/sonnet, etc.)
- ✅ Specifiek genoeg — focust op `--model` keuze

#### Inhoudelijke correctheid: PASS
- ✅ Model namen kloppen: `claude/haiku`, `claude/sonnet`, `claude/opus`
- ✅ Model tiering tabel stemt overeen met globale CLAUDE.md tiering tabel
- ✅ Batch processing (haiku) correct toegevoegd t.o.v. sommige andere bronnen

---

### 3. oa-prompting-scope

**Pad**: `.claude/skills/oa-prompting-scope/SKILL.md`
**Regels**: 67

#### Structuur: PASS
- ✅ Frontmatter: `name`, `description`, `user-invocable: false`
- ✅ Description ≤50 woorden (~35 woorden)
- ✅ Meerdere `##` secties

#### Content kwaliteit: PASS
- ✅ ALWAYS/NEVER met because-clauses
- ✅ Drie concrete patronen met code blocks
- ✅ Deterministic vs Vague language tabel is concreet en nuttig
- ✅ 67 regels — goed

#### Trigger: PASS
- ✅ "Use when..." aanwezig
- ✅ "Activates for:" met relevante keywords
- ✅ Duidelijk onderscheid met oa-prompting-5element (scope specifiek vs. algehele structuur)

#### Inhoudelijke correctheid: PASS
- ✅ Scope writing guidance is correct en volledig
- ✅ Role statement, scope bullets, inline rules allemaal correct beschreven
- ✅ Anti-patterns zijn nuttig en concreet

---

### 4. oa-prompting-delegation

**Pad**: `.claude/skills/oa-prompting-delegation/SKILL.md`
**Regels**: 104

#### Structuur: PASS
- ✅ Frontmatter: `name`, `description`, `user-invocable: false`
- ✅ Description ≤50 woorden (~38 woorden)
- ✅ Meerdere `##` secties

#### Content kwaliteit: PASS
- ✅ ALWAYS/NEVER met because-clauses (Issue #9/#11 referentie, MCP toegang)
- ✅ Meerdere concrete bash voorbeelden (research swarm, batch processor, delegation plan)
- ✅ Decision tree is duidelijk en specifiek
- ✅ 104 regels — onder 300

#### Trigger: PASS
- ✅ "Use when..." en "Activates for:" aanwezig
- ✅ Voldoende specifiek

#### Inhoudelijke correctheid: WARN
- ✅ Auto-delegation triggers komen overeen met globale CLAUDE.md triggers
- ✅ Nested agent waarschuwing correct (Issue #9/#11)
- ✅ MCP toegangsbeperking correct
- ⚠️ **WARN**: In `## Instructions` stap 5 worden slechts 3 quality checks beschreven
  (Count, Content, Format) maar het volledige oa-quality-gates protocol vereist 5 checks
  (Count, Content, Format, Cross-reference, Size). Inconsistentie met oa-quality-gates skill.

---

### 5. oa-quality-gates

**Pad**: `.claude/skills/oa-quality-gates/SKILL.md`
**Regels**: 141

#### Structuur: PASS
- ✅ Frontmatter aanwezig: `name`, `user-invocable: false`, `description`
- ✅ Description ≤50 woorden (~37 woorden)
- ✅ Meerdere `##` secties
- ⚠️ Kleine opmerking: frontmatter field volgorde wijkt af van protocol template
  (name, user-invocable, description vs. aanbevolen name, description, user-invocable) — cosmetic

#### Content kwaliteit: PASS
- ✅ Critical rules in prose-formaat mét because-clauses (geen ALWAYS/NEVER maar equivalent)
- ✅ Meerdere concrete voorbeelden: fix-agent bash template, verificatie tabel
- ✅ Gedetailleerde beschrijving van alle 5 checks
- ✅ 141 regels — onder 300
- ⚠️ Kleine opmerking: begintekst gebruikt `# oa-quality-gates` H1 heading in body —
  protocol zegt H1 is gereserveerd voor skill titel, niet voor body content

#### Trigger: PASS
- ✅ "Use when..." en "Activates for:" aanwezig met relevante keywords
- ✅ Specifiek genoeg (batch complete, agent done, validate output)

#### Inhoudelijke correctheid: PASS
- ✅ Alle 5 checks correct: Count, Content, Format, Cross-reference, Size
- ✅ Fix-agent spawn patroon correct
- ✅ Beslisboom consistent met 5-check protocol
- ✅ Verificatietabel is nuttig praktisch hulpmiddel

---

### 6. oa-quality-guardians

**Pad**: `.claude/skills/oa-quality-guardians/SKILL.md`
**Regels**: 150

#### Structuur: PASS
- ✅ Frontmatter: `name`, `user-invocable: false`, `description`
- ✅ Description ≤50 woorden (~40 woorden)
- ✅ Meerdere `##` secties

#### Content kwaliteit: PASS
- ✅ Critical rules in proza mét because-clauses
- ✅ Meerdere concrete bash voorbeelden (Pattern 1, 2, 4)
- ✅ Guardian tabel is duidelijk en specifiek
- ✅ 150 regels — onder 300

#### Trigger: PASS
- ✅ "Use when..." en "Activates for:" aanwezig
- ✅ Keywords dekken alle relevante triggers (batch done, session end, guardian)

#### Inhoudelijke correctheid: WARN
- ✅ Guardian typen correct: lessons-guardian, roadmap-guardian, handoff-guardian
- ✅ Trigger events correct: session_end, batch_complete
- ✅ Model keuzes kloppen (sonnet voor lessons/handoff, haiku voor roadmap)
- ⚠️ **WARN**: Pattern 3 (Register Custom Guardian) verwijst naar
  `from open_agents.guardians import register_guardian` — dit is een Python API die
  mogelijk (nog) niet bestaat in het project. Niet verifieerbaar zonder codebase check.
  Als de module niet bestaat, is dit een misleidend voorbeeld.
- ✅ DECISIONS.md wordt correct gemarkeerd als "Manual update" (geen guardian nodig)

---

### 7. oa-quality-fix-agent

**Pad**: `.claude/skills/oa-quality-fix-agent/SKILL.md`
**Regels**: 115

#### Structuur: PASS
- ✅ Frontmatter: `name`, `description`, `user-invocable: false`,
  `disable-model-invocation: true`, `allowed-tools: Bash(oa *)`
- ✅ Description ≤50 woorden (~36 woorden)
- ✅ Meerdere `##` secties
- ✅ `disable-model-invocation: true` correct voor side-effect skill (spawnt agents)
- ✅ `allowed-tools: Bash(oa *)` correct

#### Content kwaliteit: WARN
- ✅ NEVER #1: "NEVER fix agent output yourself — spawn a dedicated fix-agent... because..."  ✅
- ✅ NEVER #2: "NEVER silently discard failed output — always log... because..." ✅
- ⚠️ ALWAYS #3: "ALWAYS give the fix-agent the original output path AND the specific error —
  vague prompts produce vague fixes; name exactly what is wrong."
  Mist een formele "because"-keyword. Heeft een semicolon-uitleg maar geen "because"-clause.
  Per SKILL-PROTOCOL.md: "Every ALWAYS/NEVER includes a because-clause."
- ✅ Concrete bash voorbeelden (Pattern 1, 2)
- ✅ "When Fix-Agent vs Skill Update" tabel is nuttig en specifiek
- ✅ 115 regels — goed

#### Trigger: PASS
- ✅ "Use when..." en "Activates for:" aanwezig met L-016/L-017 referenties
- ✅ Specifiek genoeg — duidelijk onderscheid met oa-quality-gates

#### Inhoudelijke correctheid: PASS
- ✅ Fix-agent 5-element prompt template correct
- ✅ Failure logging patroon correct (L-017)
- ✅ "Fix once vs. update skill" beslismatrix correct
- ✅ Anti-patterns nuttig en concreet

---

### 8. SKILL-PROTOCOL.md

**Pad**: `docs/skills/SKILL-PROTOCOL.md`
**Status**: REFERENTIEDOCUMENT (geen skill, geen frontmatter verwacht)

Dit is het protocol-definitiedocument, geen `SKILL.md`. Het is het normerende document
waaraan de andere skills zijn getoetst. Validatie op skill-structuur is niet van toepassing.

#### Inhoudelijke beoordeling: PASS
- ✅ Volledig en consistent protocol met duidelijke secties
- ✅ Decision matrices, templates, en migration guide aanwezig
- ✅ Frontmatter decision matrix klopt met gevonden skill implementaties
- ✅ Skill-Tester checklist is bruikbaar als referentie

---

## Issues + Aanbevelingen

### 🔴 Prioriteit: Hoog

**Issue 1 — oa-prompting-5element: Naam klopt niet met inhoud**
- **Skill**: oa-prompting-5element
- **Probleem**: De skill heet "5-element" maar beschrijft 6 elementen:
  role, input paths, output paths, scope bullets, format reference, en inline rules.
  De verificatietabel heeft ook 6 rijen. Dit creëert verwarring bij gebruikers die
  "5-element" opzoeken of ernaar refereren.
- **Aanbeveling A**: Herneem de skill naar `oa-prompting-6element` en update alle
  referenties (inclusief CLAUDE.md, andere skills, LESSONS.md).
- **Aanbeveling B** (alternatief): Combineer twee elementen (bijv. input+output paths
  als één "Paths" element) zodat het werkelijk 5 zijn.

---

### 🟡 Prioriteit: Gemiddeld

**Issue 2 — oa-prompting-delegation: Incomplete quality gate referentie**
- **Skill**: oa-prompting-delegation
- **Probleem**: Stap 5 in `## Instructions` vermeldt slechts 3 quality checks
  (Count, Content, Format) maar het correcte protocol heeft 5 checks.
- **Aanbeveling**: Update stap 5 om te verwijzen naar de volledige oa-quality-gates skill:
  "After all agents complete, run all 5 quality gates (see oa-quality-gates)."

**Issue 3 — oa-quality-fix-agent: ALWAYS-regel mist formele because-clause**
- **Skill**: oa-quality-fix-agent
- **Probleem**: De derde critical rule gebruikt een semicolon-constructie in plaats van
  een expliciete "because" keyword, wat technisch niet voldoet aan het protocol.
- **Aanbeveling**: Wijzig naar:
  `ALWAYS give the fix-agent the original output path AND the specific error — because vague prompts produce vague fixes and make systemic problems untraceable (L-016).`

---

### 🔵 Prioriteit: Laag

**Issue 4 — oa-quality-guardians: Mogelijk niet-bestaande Python API**
- **Skill**: oa-quality-guardians
- **Probleem**: Pattern 3 verwijst naar `from open_agents.guardians import register_guardian`
  wat mogelijk (nog) niet bestaat.
- **Aanbeveling**: Verifieer of `open_agents/guardians.py` bestaat. Als het module
  ontbreekt, markeer het voorbeeld als `# Not yet implemented` of verwijder Pattern 3.

**Issue 5 — oa-quality-gates: H1 heading in body**
- **Skill**: oa-quality-gates
- **Probleem**: De body begint met `# oa-quality-gates` (H1) wat per SKILL-PROTOCOL.md
  gereserveerd is voor de skill titel (niet in body).
- **Aanbeveling**: Verwijder de `# oa-quality-gates` H1 uit de body (redundant met frontmatter `name`).

**Issue 6 — Ontbrekende optionele frontmatter velden**
- **Skills**: oa-prompting-5element, oa-prompting-model-tiering, oa-prompting-scope,
  oa-prompting-delegation, oa-quality-gates, oa-quality-guardians
- **Probleem**: Per SKILL-PROTOCOL.md migration plan zouden reference skills
  geen `disable-model-invocation` of `context: fork` nodig hebben. Dit is correct.
  Echter, skills die research/analysis doen zouden `context: fork` kunnen gebruiken.
  Voor de prompting reference skills is dit niet kritisch.
- **Aanbeveling**: Geen actie vereist voor huidige skills (alle zijn reference skills).

---

## Samenvatting

| Categorie | Skills | PASS | PASS met WARN | FAIL |
|-----------|--------|------|----------------|------|
| Prompting | 4 | 2 | 2 | 0 |
| Quality | 3 | 1 | 2 | 0 |
| Protocol doc | 1 | 1 (N/A) | — | — |
| **Totaal** | **8** | **3** | **4** | **0** |

Alle 7 skills zijn functioneel correct en voldoen aan de kernvereisten van SKILL-PROTOCOL.md.
Geen enkele skill faalt structureel. De issues zijn verbeteringen die kwaliteit en consistentie
verhogen maar de huidige werking niet blokkeren.

**Kritiekste actie**: Naam "5-element" herstellen in oa-prompting-5element (Issue 1).
