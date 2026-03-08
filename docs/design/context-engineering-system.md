# Context Engineering System — Continu Verbeteringssysteem

> **Versie**: 1.0
> **Datum**: 2026-03-08
> **Auteur**: context-architect agent
> **Project**: Open-Agents (OpenAEC Foundation)
> **Doel**: Een concreet, implementeerbaar systeem voor continue kwaliteitsverbetering van skills, agents, clusters en orchestratie

---

## Overzicht

Dit document beschrijft het **Context Engineering System** — een 4-laags verbeteringssysteem dat de kwaliteit van Open-Agents continu verhoogt. Elke laag bouwt voort op de vorige:

```
┌─────────────────────────────────────────────────┐
│  Laag 4: ORCHESTRATION ENGINEERING              │
│  Meta-orchestrator × feedback loops × routing   │
├─────────────────────────────────────────────────┤
│  Laag 3: CLUSTER ENGINEERING                    │
│  Meerdere agents samenwerken in patronen        │
├─────────────────────────────────────────────────┤
│  Laag 2: AGENT ENGINEERING                      │
│  Skill → Agent mapping, systemPrompt, model     │
├─────────────────────────────────────────────────┤
│  Laag 1: SKILL ENGINEERING                      │
│  Atomaire kennis, SKILL.md formaat, testen      │
└─────────────────────────────────────────────────┘
```

**Kernprincipe**: Kwaliteitsproblemen in hogere lagen worden ALTIJD opgelost in de laagste relevante laag. Een agent die slechte output produceert heeft waarschijnlijk een zwakke skill — fix de skill, niet de orchestratie.

---

## Laag 1: Skill Engineering

### Definitie

Een **skill** is de kleinste eenheid van domeinkennis in Open-Agents. Het is een SKILL.md bestand dat één specifiek kennisdomein beschrijft — compact genoeg om in een systemPrompt te passen, diep genoeg om een agent expert te maken.

### SKILL.md Formaat

Elke skill volgt dit exacte formaat:

```markdown
# SKILL: <naam>

## Doel
Eén zin die beschrijft wat deze skill kan.

## Kernconcepten
- Concept 1: uitleg
- Concept 2: uitleg
- (max 10 concepten)

## Syntax / Patronen
\`\`\`<taal>
// Concrete codevoorbeelden of patronen
// Geen uitleg, alleen werkende code
\`\`\`

## Veelgemaakte Fouten
| Fout | Correct | Waarom |
|------|---------|--------|
| fout patroon | goed patroon | korte uitleg |

## Kwaliteitscriteria
- [ ] Criterium 1
- [ ] Criterium 2

## Bronnen
- Bron 1 (URL of bestandspad)
```

### Kwaliteitscriteria voor Skills

| # | Criterium | Meetbaar | Test |
|---|-----------|----------|------|
| S-01 | **Atomair** — Skill beschrijft exact één domein | Ja | Kan je de skill in één zin samenvatten? |
| S-02 | **Compact** — Past in < 2000 tokens | Ja | `wc -w SKILL.md` < 1500 woorden |
| S-03 | **Concreet** — Bevat werkende codevoorbeelden | Ja | Syntax sectie niet leeg |
| S-04 | **Foutbewust** — Bevat veelgemaakte fouten | Ja | Tabel met minstens 3 fouten |
| S-05 | **Testbaar** — Heeft expliciete kwaliteitscriteria | Ja | Checklist niet leeg |
| S-06 | **Bronvermelding** — Verwijst naar primaire bronnen | Ja | Bronnen sectie niet leeg |
| S-07 | **Zelfstandig** — Geen verwijzing naar andere skills nodig | Nee | Review nodig |
| S-08 | **Actueel** — Bronversie matcht huidige release | Nee | Periodieke controle |

### Skill Tester Agent

Om skills automatisch te testen, gebruiken we een **skill-tester agent**:

```bash
# Skill tester spawnen
oa run "Test deze skill op kwaliteitscriteria S-01 t/m S-08.
Lees: /pad/naar/SKILL.md
Schrijf rapport naar: /pad/naar/output/skill-test-report.md

Per criterium:
- PASS of FAIL
- Bewijs (quote uit de skill)
- Als FAIL: concrete fix-suggestie

Eindig met een score: X/8 passed." \
  --name skill-tester --model claude/sonnet --direct
```

**Template**: `agents/library/core/skill-tester.json`

```json
{
  "name": "Skill Tester",
  "description": "Test een SKILL.md op de 8 kwaliteitscriteria (S-01 t/m S-08). Produceert een pass/fail rapport.",
  "model": "anthropic/claude-sonnet-4-6",
  "modelHint": "claude/sonnet",
  "systemPrompt": "Je test SKILL.md bestanden op 8 kwaliteitscriteria...",
  "tools": ["Read", "Write", "Glob"],
  "maturity": "tool-capable",
  "category": "core",
  "tags": ["quality", "testing", "skills", "validation"]
}
```

### Iteratieve Skill Verbetering

Het verbeterproces voor een individuele skill:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Schrijf   │ ──→ │ 2. Test      │ ──→ │ 3. Fix       │
│    SKILL.md  │     │    (tester)  │     │    (fixer)   │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     score < 6/8            score >= 6/8
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ Loop terug   │     │ 4. Commit    │
                     │ naar stap 1  │     │    naar repo │
                     └──────────────┘     └──────────────┘
```

**Commando's**:

```bash
# Stap 1: Skill schrijven (of laten schrijven door een agent)
oa run "Schrijf een SKILL.md voor IFC property sets.
Bronnen: https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/
Schrijf naar: /pad/naar/skills/ifc-property-sets/SKILL.md
Volg exact het SKILL.md formaat uit context-engineering-system.md." \
  --name skill-writer --model claude/sonnet --direct

# Stap 2: Test
oa run "Test de skill: /pad/naar/skills/ifc-property-sets/SKILL.md
Schrijf rapport naar: /pad/naar/output/test-report.md" \
  --name skill-tester --model claude/sonnet --direct

# Stap 3: Fix (als score < 6/8)
oa run "Fix deze skill op basis van het testrapport.
Skill: /pad/naar/skills/ifc-property-sets/SKILL.md
Rapport: /pad/naar/output/test-report.md
Schrijf verbeterde versie naar hetzelfde pad." \
  --name skill-fixer --model claude/sonnet --direct
```

### Skill Packages — Wat Hebben We Nodig?

Gebaseerd op de huidige agent library (90 agents, 73 AEC agents) en het doel van 1000+:

| Package | Domein | Skills | Status | Prioriteit |
|---------|--------|:------:|--------|:----------:|
| `aec-blender` | Blender Python scripting | 26 | Bestaand | ✓ |
| `aec-ifcopenshell` | IFC/BIM data manipulatie | 12 | Bestaand | ✓ |
| `aec-bonsai` | Bonsai BIM addon | 12 | Bestaand | ✓ |
| `aec-sverchok` | Procedureel modelleren | 11 | Bestaand | ✓ |
| `aec-cross` | Cross-technologie workflows | 2 | Bestaand | ✓ |
| `code-general` | Generieke code skills | 0 | Nieuw | **Hoog** |
| `devops-cicd` | Docker, CI/CD, monitoring | 0 | Nieuw | **Hoog** |
| `testing-qa` | Test strategieën en frameworks | 0 | Nieuw | **Hoog** |
| `api-integration` | REST, GraphQL, webhooks | 0 | Nieuw | **Middel** |
| `database-sql` | SQL, migraties, query optimalisatie | 0 | Nieuw | **Middel** |
| `erpnext-frappe` | ERPNext/Frappe domeinkennis | 0 | Nieuw | **Middel** |
| `security-audit` | OWASP, vulnerability patterns | 0 | Nieuw | **Middel** |
| `frontend-react` | React, TypeScript, CSS patterns | 0 | Nieuw | **Laag** |
| `data-science` | Data analyse, visualisatie | 0 | Nieuw | **Laag** |

**Regel**: Elke skill package leeft in een eigen Git repository. De skill packages worden als bronmateriaal gebruikt voor agent generatie — niet direct ingeladen door agents.

---

## Laag 2: Agent Engineering

### Skill → Agent Mapping (1:1 Patroon)

Elke skill mappt exact naar één agent (L-034). De mapping is mechanisch:

```
SKILL.md (bron)           →  agent.json (output)
─────────────────────────────────────────────────
Doel                      →  description
Kernconcepten + Syntax    →  systemPrompt (gecomprimeerd)
Veelgemaakte Fouten       →  systemPrompt (negatieve instructies)
Kwaliteitscriteria        →  interne validatie in prompt
Bronnen                   →  niet in agent (te groot)
```

**Generator commando**:

```bash
# Genereer agent JSON uit skill
oa run "Genereer een atomaire agent JSON uit deze SKILL.md.
Skill: /pad/naar/skills/blender-mesh/SKILL.md
Referentie agent formaat: /pad/naar/agents/library/core/explain-code.json

Regels:
- systemPrompt bevat de gecomprimeerde kern van de skill
- systemPrompt < 500 woorden
- modelHint bepaald door complexiteit:
  - haiku: syntax checks, validatie, classificatie
  - sonnet: implementatie, analyse, generatie (DEFAULT)
  - opus: architectuur, diepe redenering
- tools: minimale set (Read, Write, Glob, Grep, Bash)
- maturity: prompt-template | tool-capable | autonomous
- category: mappt op library subdirectory
- tags: 3-5 relevante tags

Schrijf naar: /pad/naar/agents/library/<category>/<agent-naam>.json" \
  --name agent-generator --model claude/sonnet --direct
```

### systemPrompt Engineering

Een goede systemPrompt volgt deze structuur:

```
┌─────────────────────────────────────────────────┐
│ 1. IDENTITEIT (1 zin)                           │
│    "You are a [rol] that [doel]."               │
├─────────────────────────────────────────────────┤
│ 2. INPUT/OUTPUT CONTRACT (2-3 regels)           │
│    "You receive: [X]. You produce: [Y]."        │
├─────────────────────────────────────────────────┤
│ 3. KERNKENNIS (5-10 bullets)                    │
│    De gecomprimeerde skill content              │
├─────────────────────────────────────────────────┤
│ 4. KWALITEITSREGELS (3-5 bullets)               │
│    "Always...", "Never..."                      │
├─────────────────────────────────────────────────┤
│ 5. OUTPUT FORMAAT (exact format)                │
│    "Output as: [structured format]"             │
└─────────────────────────────────────────────────┘
```

**Anti-patronen in systemPrompts**:

| Anti-patroon | Waarom slecht | Fix |
|--------------|---------------|-----|
| "You are a helpful assistant" | Te generiek, geen expertise | Specifieke rol + domein |
| Lange inleidingen | Verspilt context window | Direct naar het punt |
| "Try to...", "Attempt to..." | Zwak, niet-deterministisch | "Always...", "Must..." |
| Geen output formaat | Onvoorspelbare output | Exact formaat specificeren |
| Alles in proza | Moeilijk te scannen | Bullets, tabellen, structured |
| Te veel tools | Agent raakt afgeleid | Minimale tool set |

### modelHint Strategie

| Agent Type | modelHint | Rationale | Voorbeeld |
|------------|-----------|-----------|-----------|
| **Classificatie** | `claude/haiku` | Binaire beslissing, snel | detect-language, classify-sentiment |
| **Validatie** | `claude/haiku` | Regel-gebaseerd, geen creativiteit | validate-json, check-style |
| **Transformatie** | `claude/haiku` | Mechanische conversie | json-to-yaml, format-code |
| **Analyse** | `claude/sonnet` | Patroonherkenning nodig | find-bugs, check-security |
| **Generatie** | `claude/sonnet` | Creativiteit + kwaliteit | generate-test, explain-code |
| **Review** | `claude/sonnet` | Oordeel + nuance | code-reviewer, plan-reviewer |
| **Architectuur** | `claude/opus` | Diepe redenering, trade-offs | iterative-planner, system designer |
| **Debugging** | `claude/opus` | Complexe probleemanalyse | root-cause analyzer |

**Regel**: Default is altijd `claude/sonnet`. Alleen afwijken met expliciete reden.

### Tool Selectie per Agent Type

| Agent Type | Tools | Rationale |
|------------|-------|-----------|
| **Read-only** (analyse, review) | `Read`, `Glob`, `Grep` | Kan niets kapot maken |
| **Write** (generatie, fix) | `Read`, `Write`, `Edit`, `Glob`, `Grep` | Moet bestanden kunnen aanpassen |
| **System** (devops, infra) | `Read`, `Write`, `Bash`, `Glob`, `Grep` | Shell toegang nodig |
| **Research** (onderzoek) | `Read`, `Glob`, `Grep`, `WebFetch`, `WebSearch` | Internet toegang nodig |
| **Orchestratie** (planner) | `Read`, `Write`, `Glob`, `Grep`, `Bash` | Moet agents kunnen spawnen |

**Regel**: Geef een agent NOOIT meer tools dan strikt noodzakelijk. Elke extra tool vergroot de kans op onverwacht gedrag.

### Agent Kwaliteitscriteria

| # | Criterium | Meetbaar | Test |
|---|-----------|----------|------|
| A-01 | **Atomair** — Agent doet exact één ding | Ja | Description past in één zin |
| A-02 | **Deterministisch** — Zelfde input → consistent output formaat | Ja | 3× draaien, output formaat vergelijken |
| A-03 | **Compact prompt** — systemPrompt < 500 woorden | Ja | `wc -w` op systemPrompt |
| A-04 | **Minimale tools** — Alleen noodzakelijke tools | Ja | Review: elke tool gerechtvaardigd? |
| A-05 | **Correct model** — modelHint past bij complexiteit | Nee | Review nodig |
| A-06 | **Gestructureerde output** — Formaat gespecificeerd in prompt | Ja | Output formaat sectie aanwezig |
| A-07 | **Foutafhandeling** — Beschrijft wat te doen bij fouten | Nee | Review nodig |
| A-08 | **Skill-backed** — Gebaseerd op een SKILL.md | Ja | Verwijzing naar bron-skill |

### Agent Test Framework

```bash
# Agent tester spawnen
oa run "Test deze agent met 3 voorbeeldinputs.
Agent: /pad/naar/agents/library/core/find-bugs.json
Test inputs:
1. Een Python bestand met een bekende bug (off-by-one)
2. Een JavaScript bestand zonder bugs
3. Een TypeScript bestand met een null-pointer risico

Per test:
- Input beschrijving
- Verwachte output (wat zou de agent moeten vinden?)
- Werkelijke output (voer de agent uit)
- PASS/FAIL + reden

Schrijf naar: /pad/naar/output/agent-test-report.md" \
  --name agent-tester --model claude/sonnet --direct
```

---

## Laag 3: Cluster Engineering

### Definitie

Een **cluster** is een groep agents die samenwerken om een taak te voltooien die geen enkele agent alleen aankan. Een cluster heeft:

- **Doel**: Eén helder einddoel (bijv. "volledige code review")
- **Agents**: 3-5 agents met complementaire rollen (L-025)
- **Patroon**: Een vastgelegd samenwerkingspatroon
- **Communicatie**: Gedefinieerde data-flow tussen agents
- **Kwaliteitsgate**: Meetbare succescriteria

### Cluster Patronen

Open-Agents ondersteunt 5 cluster patronen:

#### Patroon 1: Pipeline (Flow)

```
Agent A → Agent B → Agent C → Agent D
  │          │          │          │
  └──────────┴──────────┴──────────┘
  Output van vorige = input van volgende
```

**Wanneer**: Stappen zijn strikt sequentieel, output verandert van vorm.

**Voorbeeld**: Code Review Pipeline
```bash
# Pipeline: read-file → detect-language → check-style → find-bugs → summarize
oa pipeline "Review de code in /pad/naar/src/main.py.
Stap 1: Lees het bestand
Stap 2: Detecteer de programmeertaal
Stap 3: Check code stijl
Stap 4: Zoek bugs
Stap 5: Vat bevindingen samen in een rapport"
```

**Kwaliteitsmeting**:
- Elke stap produceert output? (count check)
- Output formaat correct voor volgende stap? (format check)
- Eindresultaat bevat bijdragen van alle stappen? (completeness check)

#### Patroon 2: Research Swarm (Pool)

```
         ┌── Researcher A ──┐
         │                   │
Task ────┼── Researcher B ──┼──→ Combiner → Output
         │                   │
         └── Researcher C ──┘
```

**Wanneer**: Dezelfde vraag vanuit meerdere invalshoeken beantwoorden.

**Voorbeeld**: Technologie Evaluatie
```bash
# 3 researchers parallel + 1 combiner
oa run "Onderzoek React Server Components. Focus op: performance impact.
Schrijf naar: /tmp/research/rsc-performance.md" \
  --name researcher-perf --model claude/sonnet --direct

oa run "Onderzoek React Server Components. Focus op: developer experience.
Schrijf naar: /tmp/research/rsc-dx.md" \
  --name researcher-dx --model claude/sonnet --direct

oa run "Onderzoek React Server Components. Focus op: migratie-strategie.
Schrijf naar: /tmp/research/rsc-migration.md" \
  --name researcher-migration --model claude/sonnet --direct

# Wacht tot alle 3 klaar zijn, dan:
oa run "Combineer deze 3 onderzoeksrapporten tot één evaluatie.
Bestanden:
- /tmp/research/rsc-performance.md
- /tmp/research/rsc-dx.md
- /tmp/research/rsc-migration.md
Schrijf naar: /tmp/research/rsc-evaluatie.md" \
  --name combiner --model claude/sonnet --direct
```

**Kwaliteitsmeting**:
- Alle researchers produceren output? (count)
- Combiner verwijst naar alle bronnen? (coverage)
- Geen tegenstrijdige conclusies zonder uitleg? (consistency)

#### Patroon 3: Build Pipeline

```
Planner (opus) → N× Workers (sonnet) → Validator (sonnet)
     │                    │                     │
     └── plan.md ─────────┴── artifacts ────────┘
```

**Wanneer**: Complexe taak die planning, uitvoering en validatie vereist.

**Voorbeeld**: Feature implementatie
```bash
# Stap 1: Plan
oa run "Maak een plan voor het toevoegen van dark mode aan de web UI.
Lees: /pad/naar/packages/frontend/src/
Schrijf plan naar: /tmp/darkmode/plan.md" \
  --name planner --model claude/opus --direct

# Stap 2: Workers (na plan review)
oa run "Implementeer CSS variabelen voor dark mode.
Plan: /tmp/darkmode/plan.md
Scope: alleen CSS/Tailwind configuratie
Schrijf naar: /pad/naar/packages/frontend/src/styles/" \
  --name worker-css --model claude/sonnet --direct

oa run "Implementeer theme toggle component.
Plan: /tmp/darkmode/plan.md
Scope: alleen React component + context
Schrijf naar: /pad/naar/packages/frontend/src/components/" \
  --name worker-toggle --model claude/sonnet --direct

# Stap 3: Validator
oa run "Valideer de dark mode implementatie.
Plan: /tmp/darkmode/plan.md
Code: /pad/naar/packages/frontend/src/
Check: alle taken uit het plan afgerond? Code consistent? Geen regressies?
Schrijf rapport naar: /tmp/darkmode/validation.md" \
  --name validator --model claude/sonnet --direct
```

#### Patroon 4: Review Chain

```
Writer → Reviewer → Fixer (als nodig) → Final Check
```

**Wanneer**: Output vereist hoge kwaliteit en correctheid.

**Voorbeeld**: Documentatie schrijven
```bash
# Writer
oa run "Schrijf API documentatie voor de execute endpoint.
Lees: /pad/naar/packages/backend/src/routes/execute.ts
Schrijf naar: /tmp/docs/api-execute.md" \
  --name doc-writer --model claude/sonnet --direct

# Reviewer
oa run "Review deze API documentatie op volledigheid en correctheid.
Documentatie: /tmp/docs/api-execute.md
Broncode: /pad/naar/packages/backend/src/routes/execute.ts
Schrijf review naar: /tmp/docs/api-execute-review.md
VERDICT: PASS of NEEDS_REVISION" \
  --name doc-reviewer --model claude/sonnet --direct
```

#### Patroon 5: Iterative Feedback Loop

```
┌→ Agent A (produceer) → Agent B (review) → Score ──┐
│                                                     │
│  score < threshold ← ← ← ← ← ← ← ← ← ← ← ← ← ┘
│
└── max 3 iteraties
```

**Wanneer**: Kwaliteit moet een drempel halen, eerste poging vaak onvoldoende.

Dit patroon is geïmplementeerd in `agents/library/core/iterative-planner.json`.

### Cluster Ontwerpen voor een Specifiek Doel

Stappenplan om een cluster te ontwerpen:

1. **Definieer het einddoel** — Wat is het concrete eindresultaat?
2. **Decomposeer** — Welke subtaken zijn nodig? (max 5)
3. **Kies patroon** — Pipeline, swarm, build, review, of loop?
4. **Wijs agents toe** — Welke bestaande agent per subtaak?
5. **Definieer dataflow** — Wat is input/output per agent?
6. **Stel kwaliteitsgate** — Hoe weet je dat het resultaat goed is?

**Beslisboom voor patroonselectie**:

```
Is de taak sequentieel (stap A moet klaar voor stap B)?
├── Ja → PIPELINE
└── Nee → Zijn er meerdere onafhankelijke invalshoeken?
    ├── Ja → RESEARCH SWARM
    └── Nee → Is planning + uitvoering + validatie nodig?
        ├── Ja → BUILD PIPELINE
        └── Nee → Moet de kwaliteit een drempel halen?
            ├── Ja → FEEDBACK LOOP
            └── Nee → REVIEW CHAIN
```

### Communicatie Tussen Agents

Agents communiceren via **bestanden** (primair) en **messaging** (secundair):

| Mechanisme | Wanneer | Hoe |
|------------|---------|-----|
| **File-based** | Data overdracht | Agent A schrijft naar `/tmp/cluster/step1.md`, Agent B leest het |
| **oa send** | Coördinatie | `oa send agent-b "stap 1 klaar, je kunt beginnen" --from agent-a` |
| **oa broadcast** | Status updates | `oa broadcast "fase 1 compleet" --from orchestrator` |
| **Shared task list** | Taak claiming | `~/.oa/tasks/<team>/` (Sprint 17) |

**Regel**: File-based communicatie is altijd de primaire methode. Messaging is voor coördinatie, niet voor data.

### Cluster Kwaliteitsmeting

Na elke cluster run, 5 checks (de "Quality Gates" uit CLAUDE.md):

| # | Check | Hoe | Automatable? |
|---|-------|-----|:------------:|
| CQ-01 | **Count** — Alle agents produceerden output? | `ls /tmp/cluster/` | Ja |
| CQ-02 | **Content** — Output niet truncated? | `wc -l` > minimum | Ja |
| CQ-03 | **Format** — Output volgt verwacht formaat? | Regex/pattern check | Deels |
| CQ-04 | **Cross-reference** — Outputs consistent met elkaar? | Reviewer agent | Nee |
| CQ-05 | **Completeness** — Einddoel bereikt? | Validator agent | Nee |

```bash
# Automatische cluster quality check
oa run "Voer een kwaliteitscheck uit op deze cluster output.
Directory: /tmp/cluster/
Verwachte bestanden: step1.md, step2.md, step3.md, final.md
Checks: CQ-01 (count), CQ-02 (content), CQ-03 (format)
Schrijf rapport naar: /tmp/cluster/quality-report.md" \
  --name cluster-qa --model claude/haiku --direct
```

---

## Laag 4: Orchestration Engineering

### Meta-Orchestrator Rol

De meta-orchestrator is **mens + Claude Code sessie** (L-035). Verantwoordelijkheden:

| Verantwoordelijkheid | Mens | Claude Code |
|---------------------|------|-------------|
| **Strategische beslissingen** | Wat bouwen we? | Hoe bouwen we het? |
| **Patroonselectie** | Goedkeuring | Suggestie op basis van taaktype |
| **Agent spawning** | Trigger ("doe X") | `oa run` commando's formuleren |
| **Kwaliteitsbeoordeling** | Final call | Automatische checks + rapport |
| **Skill verbetering** | Prioritering | Fix-agents spawnen |
| **Bijsturing** | "Dit klopt niet" | Herstart met feedback |

### Dynamische Cluster Selectie

De meta-orchestrator kiest het juiste cluster patroon op basis van **taakkenmerken**:

```
┌─────────────────────────────────────────────────────────┐
│ TAAK ANALYSE                                            │
│                                                         │
│ Vraag 1: Hoeveel bestanden raakt deze taak?             │
│   > 3 bestanden → AUTO-DELEGEER naar agents             │
│                                                         │
│ Vraag 2: Hoeveel bronnen moeten geraadpleegd?           │
│   > 2 bronnen → RESEARCH SWARM                          │
│                                                         │
│ Vraag 3: Is het dezelfde operatie op N inputs?           │
│   Ja → BATCH PROCESSOR (N parallel workers)             │
│                                                         │
│ Vraag 4: Zijn er 3+ sequentiële stappen?                │
│   Ja → BUILD PIPELINE                                   │
│                                                         │
│ Vraag 5: Moet de kwaliteit hoog zijn?                   │
│   Ja → REVIEW CHAIN na de primaire operatie             │
│                                                         │
│ Default → Enkelvoudige agent (oa run)                   │
└─────────────────────────────────────────────────────────┘
```

### Wanneer Pipeline vs Swarm vs Hiërarchie?

| Kenmerk | Pipeline | Swarm | Hiërarchie |
|---------|----------|-------|------------|
| **Dataflow** | Lineair (A→B→C) | Parallel (A,B,C→D) | Boom (lead→workers) |
| **Afhankelijkheden** | Strikt sequentieel | Onafhankelijk | Lead coördineert |
| **Ideaal voor** | Transformatie chains | Onderzoek, batch | Complex projectwerk |
| **Team grootte** | 3-6 agents | 3-5 + combiner | 1 lead + 3-5 workers |
| **oa commando** | `oa pipeline` | N× `oa run` + combiner | `oa delegate` |
| **Faalgedrag** | Keten stopt | Deelresultaten bruikbaar | Lead kan herstarten |
| **Overhead** | Laag | Laag | Middel (coördinatie) |

### Feedback Loops: Output → Skill Verbetering

Dit is het hart van het continu verbeteringssysteem:

```
┌─────────────────────────────────────────────────────────┐
│                  CONTINUOUS IMPROVEMENT LOOP             │
│                                                         │
│  ┌─────────┐    ┌───────────┐    ┌──────────────┐      │
│  │ Agent   │───→│ Output    │───→│ Quality      │      │
│  │ draait  │    │ geproduct │    │ Check        │      │
│  └─────────┘    └───────────┘    └──────┬───────┘      │
│                                         │               │
│                              ┌──────────┴──────────┐   │
│                              │                      │   │
│                         PASS ▼                 FAIL ▼   │
│                    ┌──────────────┐      ┌───────────┐  │
│                    │ Output       │      │ Root Cause│  │
│                    │ gebruiken    │      │ Analyse   │  │
│                    └──────────────┘      └─────┬─────┘  │
│                                                │        │
│                                    ┌───────────┴─────┐  │
│                                    │                  │  │
│                              Skill zwak?        Prompt zwak? │
│                                    │                  │  │
│                              ┌─────▼─────┐    ┌──────▼──┐│
│                              │ Fix       │    │ Fix     ││
│                              │ SKILL.md  │    │ prompt  ││
│                              └─────┬─────┘    └────┬────┘│
│                                    │               │     │
│                                    ▼               ▼     │
│                              ┌──────────────────────┐   │
│                              │ Re-test agent        │   │
│                              │ met dezelfde input   │   │
│                              └──────────┬───────────┘   │
│                                         │               │
│                                  PASS ──┴── FAIL        │
│                                    │          │         │
│                              ┌─────▼─────┐   └→ Loop   │
│                              │ Commit     │             │
│                              │ verbetering│             │
│                              └────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Root Cause Analyse: Waar Zit het Probleem?

Wanneer een agent slechte output produceert, analyseer in deze volgorde:

| # | Laag | Vraag | Fix |
|---|------|-------|-----|
| 1 | **Skill** | Bevat de skill de kennis die nodig was? | SKILL.md updaten |
| 2 | **Prompt** | Geeft de systemPrompt de juiste instructies? | systemPrompt herschrijven |
| 3 | **Model** | Is het model krachtig genoeg? | modelHint upgraden |
| 4 | **Tools** | Heeft de agent de juiste tools? | tools array aanpassen |
| 5 | **Cluster** | Is het samenwerkingspatroon correct? | Cluster herontwerpen |
| 6 | **Input** | Was de input voldoende specifiek? | Input format verbeteren |

**Regel**: Begin altijd bij laag 1 (skill). 80% van de problemen zit in onvolledige of incorrecte domeinkennis.

### Automatische Verbetering Commando's

```bash
# 1. Agent output beoordelen
oa run "Beoordeel deze agent output op kwaliteit.
Agent: find-bugs
Input: /pad/naar/test-file.py
Output: /pad/naar/output/bugs-found.md
Verwacht: minstens de off-by-one bug op regel 42

VERDICT: PASS of FAIL
Als FAIL: root cause analyse (skill/prompt/model/tools/cluster/input)
Schrijf naar: /pad/naar/output/quality-assessment.md" \
  --name output-assessor --model claude/sonnet --direct

# 2. Skill fixen (als root cause = skill)
oa run "Verbeter deze skill op basis van het kwaliteitsrapport.
Skill: /pad/naar/skills/python-bugs/SKILL.md
Rapport: /pad/naar/output/quality-assessment.md
Probleem: skill mist kennis over off-by-one patronen in Python
Voeg toe: concrete voorbeelden van off-by-one bugs
Schrijf verbeterde versie naar hetzelfde pad." \
  --name skill-fixer --model claude/sonnet --direct

# 3. Agent prompt updaten (als root cause = prompt)
oa run "Verbeter de systemPrompt van deze agent.
Agent: /pad/naar/agents/library/core/find-bugs.json
Rapport: /pad/naar/output/quality-assessment.md
Probleem: agent vindt geen off-by-one bugs
Voeg toe: expliciete instructie om loop boundaries te checken
Schrijf verbeterde agent JSON naar hetzelfde pad." \
  --name prompt-fixer --model claude/sonnet --direct

# 4. Re-test na fix
oa run "Hertest de agent na de fix.
Agent: /pad/naar/agents/library/core/find-bugs.json
Zelfde input: /pad/naar/test-file.py
Verwacht: off-by-one bug op regel 42 nu WEL gevonden
VERDICT: PASS of FAIL
Schrijf naar: /pad/naar/output/retest-report.md" \
  --name retester --model claude/sonnet --direct
```

---

## Continu Verbeteringscyclus — Implementatieplan

### De 6-staps Cyclus

```
1. PRODUCE   → Agent draait, produceert output
2. ASSESS    → Kwaliteitscheck (automatisch + handmatig)
3. DIAGNOSE  → Als FAIL: welke laag is zwak?
4. FIX       → Fix de skill, prompt, of cluster
5. RETEST    → Draai agent opnieuw met zelfde input
6. COMMIT    → Bij PASS: commit verbetering naar library
```

### Automatische Quality Tracking

Maak een `quality-log.jsonl` aan die elke agent run + assessment logt:

```jsonl
{"timestamp": "2026-03-08T10:00:00Z", "agent": "find-bugs", "input": "test.py", "verdict": "FAIL", "root_cause": "skill", "fix": "added off-by-one patterns", "retest": "PASS"}
{"timestamp": "2026-03-08T10:30:00Z", "agent": "check-style", "input": "main.ts", "verdict": "PASS", "score": 9}
```

Dit bestand wordt de basis voor:
- **Zwakste agents identificeren**: welke agents falen het vaakst?
- **Skill gaps vinden**: welke domeinen missen kennis?
- **Model tiering valideren**: zijn haiku agents echt goed genoeg?
- **Trend analyse**: wordt het systeem beter over tijd?

### Guardian Agents

Drie permanente agents die het systeem bewaken:

| Agent | Rol | Frequentie | Template |
|-------|-----|------------|----------|
| `guardian-quality` | Analyseert `quality-log.jsonl`, rapporteert trends | Dagelijks | Nieuw |
| `guardian-lessons` | Schrijft nieuwe lessen naar LESSONS.md | Per sessie | Bestaand |
| `guardian-roadmap` | Update MASTERPLAN.md status | Per sprint | Bestaand |

```bash
# Guardian quality rapport
oa run "Analyseer de quality log en maak een rapport.
Log: /pad/naar/quality-log.jsonl
Rapport bevat:
- Top 5 meest falende agents (met failure rate)
- Top 3 meest voorkomende root causes
- Trend: wordt het systeem beter? (vergelijk laatste 7 dagen met vorige 7)
- Aanbevelingen: welke skills/prompts moeten als eerste gefixt?
Schrijf naar: /pad/naar/output/quality-trend-report.md" \
  --name guardian-quality --model claude/sonnet --direct
```

---

## Integratie met Bestaande Systemen

### LESSONS.md Koppeling

Elke verbetering uit de cyclus wordt een les in LESSONS.md:

```markdown
| L-0XX | **[Skill fix] find-bugs miste off-by-one patronen** —
SKILL.md uitgebreid met 3 off-by-one voorbeelden. Agent vindt nu
loop boundary bugs. | quality-log entry 2026-03-08 |
```

### Agent Library Koppeling

Verbeterde agents worden direct gecommit naar `agents/library/`:

```bash
# Na succesvolle retest
cd "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents"
git add agents/library/core/find-bugs.json
git commit -m "fix(agent): find-bugs detecteert nu off-by-one bugs

Root cause: SKILL.md miste off-by-one patronen
Fix: systemPrompt uitgebreid met loop boundary check instructies
Retest: PASS (3/3 test cases)"
```

### Skill Package Koppeling

Skill fixes worden gecommit naar de betreffende skill package repo:

```bash
cd "/pad/naar/skill-package"
git add skills/python-bugs/SKILL.md
git commit -m "fix(skill): voeg off-by-one bug patronen toe

3 concrete voorbeelden toegevoegd aan Syntax sectie
Veelgemaakte Fouten tabel uitgebreid met 2 entries
Getest met skill-tester agent: 8/8 passed"
```

---

## Nieuwe Agent Templates

Het context engineering systeem vereist deze nieuwe agent templates:

### 1. skill-tester.json

```json
{
  "name": "Skill Tester",
  "description": "Test een SKILL.md op de 8 kwaliteitscriteria (S-01 t/m S-08).",
  "model": "anthropic/claude-sonnet-4-6",
  "modelHint": "claude/sonnet",
  "systemPrompt": "Je bent een skill kwaliteitstester. Je ontvangt een SKILL.md bestand en test het op 8 criteria:\n\nS-01 Atomair: beschrijft exact één domein (test: samen te vatten in één zin?)\nS-02 Compact: < 2000 tokens (test: wc -w < 1500)\nS-03 Concreet: bevat werkende codevoorbeelden (test: Syntax sectie niet leeg)\nS-04 Foutbewust: bevat veelgemaakte fouten (test: tabel met minstens 3 fouten)\nS-05 Testbaar: heeft kwaliteitscriteria (test: checklist niet leeg)\nS-06 Bronvermelding: verwijst naar bronnen (test: Bronnen sectie niet leeg)\nS-07 Zelfstandig: geen verwijzing naar andere skills nodig (review)\nS-08 Actueel: bronversie matcht huidige release (review)\n\nOutput formaat:\n## Skill Test Rapport\n| # | Criterium | Verdict | Bewijs | Fix (als FAIL) |\n|---|-----------|---------|--------|----------------|\n\n## Score: X/8\n## Verdict: PASS (>= 6/8) of FAIL (< 6/8)",
  "tools": ["Read", "Write", "Glob"],
  "maturity": "tool-capable",
  "category": "core",
  "tags": ["quality", "testing", "skills", "validation"]
}
```

### 2. agent-generator.json

```json
{
  "name": "Agent Generator",
  "description": "Genereert een atomaire agent JSON uit een SKILL.md bestand.",
  "model": "anthropic/claude-sonnet-4-6",
  "modelHint": "claude/sonnet",
  "systemPrompt": "Je genereert atomaire agent JSON bestanden uit SKILL.md bronnen.\n\nMapping:\n- SKILL Doel → agent description\n- SKILL Kernconcepten + Syntax → systemPrompt (gecomprimeerd, < 500 woorden)\n- SKILL Veelgemaakte Fouten → systemPrompt negatieve instructies\n- SKILL Kwaliteitscriteria → interne validatie in prompt\n\nAgent JSON formaat:\n{\n  \"name\": \"...\",\n  \"description\": \"Eén zin\",\n  \"model\": \"anthropic/claude-sonnet-4-6\",\n  \"modelHint\": \"claude/sonnet\",\n  \"systemPrompt\": \"...\",\n  \"tools\": [\"Read\", ...],\n  \"maturity\": \"tool-capable\",\n  \"category\": \"...\",\n  \"tags\": [\"...\", \"...\"]\n}\n\nModelHint regels:\n- haiku: classificatie, validatie, transformatie\n- sonnet: analyse, generatie, review (DEFAULT)\n- opus: architectuur, diepe redenering\n\nTool regels: minimale set. Read-only agents krijgen alleen Read/Glob/Grep.",
  "tools": ["Read", "Write", "Glob"],
  "maturity": "tool-capable",
  "category": "core",
  "tags": ["generation", "skills", "agents", "automation"]
}
```

### 3. output-assessor.json

```json
{
  "name": "Output Assessor",
  "description": "Beoordeelt agent output op kwaliteit en doet root cause analyse bij FAIL.",
  "model": "anthropic/claude-sonnet-4-6",
  "modelHint": "claude/sonnet",
  "systemPrompt": "Je bent een kwaliteitsbeoordelaar voor agent output.\n\nJe ontvangt:\n- De agent naam en configuratie\n- De input die de agent ontving\n- De output die de agent produceerde\n- De verwachte output (indien beschikbaar)\n\nBeoordeel op:\n1. Volledigheid — Bevat de output alles wat verwacht werd?\n2. Correctheid — Zijn de bevindingen/resultaten juist?\n3. Formaat — Volgt de output het gespecificeerde formaat?\n4. Bruikbaarheid — Kan een mens hiermee verder?\n\nOutput:\n## Assessment\n| Criterium | Score (1-5) | Toelichting |\n\n## Verdict: PASS (gem >= 3.5) of FAIL (gem < 3.5)\n\n## Root Cause (alleen bij FAIL)\nLaag: skill | prompt | model | tools | cluster | input\nAnalyse: wat ging er mis en waarom?\nFix suggestie: concrete actie om het probleem op te lossen",
  "tools": ["Read", "Write", "Glob", "Grep"],
  "maturity": "tool-capable",
  "category": "core",
  "tags": ["quality", "assessment", "root-cause", "improvement"]
}
```

### 4. guardian-quality.json

```json
{
  "name": "Guardian Quality",
  "description": "Analyseert de quality-log en rapporteert trends en aanbevelingen.",
  "model": "anthropic/claude-sonnet-4-6",
  "modelHint": "claude/sonnet",
  "systemPrompt": "Je bent de kwaliteitsbewaker van het Open-Agents systeem.\n\nJe analyseert quality-log.jsonl en produceert een trendrapport:\n\n1. Top 5 meest falende agents (naam, failure rate, laatste faal-datum)\n2. Top 3 meest voorkomende root causes (skill/prompt/model/tools/cluster/input)\n3. Trend: gemiddelde score laatste 7 dagen vs vorige 7 dagen\n4. Aanbevelingen: prioritijtslijst van fixes (hoogste impact eerst)\n5. Successen: agents die verbeterd zijn na een fix\n\nOutput formaat: Markdown rapport met tabellen.\nEindig altijd met: '## Volgende Actie' — de #1 fix die nu gedaan moet worden.",
  "tools": ["Read", "Write", "Glob", "Grep"],
  "maturity": "tool-capable",
  "category": "core",
  "tags": ["quality", "monitoring", "trends", "guardian"]
}
```

---

## Sprint 19 Taken

Gebaseerd op dit ontwerp, dit zijn de concrete taken voor Sprint 19:

### Sprint 19: Context Engineering Foundation

**Doel**: Het context engineering verbeteringssysteem bouwen en activeren.

**Afhankelijk van**: Sprint 12 (oa-cli werkend), Sprint 9 (agent library)

| # | Taak | Type | Model | Afhankelijk van | Prioriteit |
|---|------|------|-------|-----------------|:----------:|
| 19.1 | **Skill formaat standaardiseren** — SKILL.md template schrijven + validatie script | `[SEQ]` | sonnet | — | P0 |
| 19.2 | **4 nieuwe core agents** — skill-tester, agent-generator, output-assessor, guardian-quality | `[PAR]` | sonnet | — | P0 |
| 19.3 | **Quality log infrastructuur** — `quality-log.jsonl` format + schrijf/lees tooling | `[PAR]` | sonnet | — | P0 |
| 19.4 | **Eerste skill package bouwen** — `code-general` met 10 skills (Python bugs, JS patterns, etc.) | `[SEQ]` | sonnet | 19.1 | P1 |
| 19.5 | **Agents genereren uit skills** — 10 agents genereren uit `code-general` skills via agent-generator | `[SEQ]` | sonnet | 19.2, 19.4 | P1 |
| 19.6 | **E2E test van de verbeteringscyclus** — 1 complete loop: produce → assess → diagnose → fix → retest → commit | `[SEQ]` | sonnet | 19.2, 19.3 | P1 |
| 19.7 | **Guardian quality eerste run** — quality-log vullen met 20 agent test runs, guardian rapport genereren | `[SEQ]` | sonnet | 19.3, 19.6 | P2 |
| 19.8 | **Documentatie** — Dit document updaten met bevindingen uit sprint 19 | `[SEQ]` | sonnet | 19.7 | P2 |

### Concrete Prompts voor Sprint 19

**Taak 19.1** — SKILL.md template:
```bash
oa run "Schrijf een SKILL.md template bestand + een bash validatie script.
Template pad: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/templates/SKILL-TEMPLATE.md
Validatie script: /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/scripts/validate-skill.sh

Template bevat alle secties uit context-engineering-system.md Laag 1.
Validatie script checkt S-01 t/m S-06 automatisch (S-07, S-08 zijn handmatig).
Script exit 0 bij pass, exit 1 bij fail, met duidelijke output per criterium." \
  --name skill-template-writer --model claude/sonnet --direct
```

**Taak 19.2** — 4 nieuwe core agents:
```bash
# Parallel: 4 agents tegelijk
oa run "Schrijf deze agent JSON naar /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/core/skill-tester.json
[volledige JSON uit sectie 'Nieuwe Agent Templates']" \
  --name write-skill-tester --model claude/haiku --direct

oa run "Schrijf deze agent JSON naar /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/core/agent-generator.json
[volledige JSON]" \
  --name write-agent-generator --model claude/haiku --direct

oa run "Schrijf deze agent JSON naar /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/core/output-assessor.json
[volledige JSON]" \
  --name write-output-assessor --model claude/haiku --direct

oa run "Schrijf deze agent JSON naar /mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/core/guardian-quality.json
[volledige JSON]" \
  --name write-guardian-quality --model claude/haiku --direct
```

**Taak 19.6** — E2E test verbeteringscyclus:
```bash
oa run "Voer een volledige verbeteringscyclus uit:

1. PRODUCE: Draai de find-bugs agent op /pad/naar/test-file-met-bekende-bugs.py
2. ASSESS: Beoordeel de output met de output-assessor
3. DIAGNOSE: Als FAIL, bepaal root cause (skill/prompt/model/tools)
4. FIX: Fix de geïdentificeerde laag
5. RETEST: Draai de agent opnieuw
6. COMMIT: Log resultaat in quality-log.jsonl

Schrijf een volledig verslag naar ./output/e2e-cycle-report.md
Inclusief: wat was het probleem, welke laag was zwak, hoe is het gefixt, retest resultaat." \
  --name e2e-cycle-test --model claude/opus --direct
```

### Succeescriteria Sprint 19

- [ ] SKILL.md template bestaat en is gevalideerd
- [ ] 4 nieuwe core agents gecommit naar `agents/library/core/`
- [ ] `quality-log.jsonl` formaat gedefinieerd en tooling werkend
- [ ] Minstens 10 skills geschreven in `code-general` package
- [ ] Minstens 10 agents gegenereerd uit skills
- [ ] 1 volledige verbeteringscyclus succesvol doorlopen (6 stappen)
- [ ] Guardian quality rapport gegenereerd met echte data
- [ ] Alle verbeteringen gecommit naar de repo

---

*Dit document is een levend artefact. Na elke sprint wordt het bijgewerkt met bevindingen en verfijningen.*

*Open-Agents — Context Engineering System v1.0*
