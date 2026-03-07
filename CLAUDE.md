# Open-Agents - Claude Instructies

> **Versie**: 5
> **Laatste update**: 2026-03-07
> **Template versie**: 5.0 (oa-cli workflow best practices)
> **Setup tier**: Standard

## Projectdoel

Hyper session workspace builder met agentic orchestratie. **oa-cli is de PRIMAIRE manier om agents te gebruiken** — spawn agents via de terminal, beheer ze met tmux, volg status via dashboard. Gebruikers kunnen ook visueel de workspace-configuratie per agent bouwen (6-layer stack: CLAUDE.md, skills, rules, MCP, hooks) en ze orkestreren op een canvas (packages/ — SECUNDAIR/geavanceerd). Drie engineering-lagen (D-025): orchestratie (WIE), agent identiteit (WAT), workspace/context (HOE). Multi-provider LLM support (Anthropic, OpenAI, Mistral, Ollama). Eerste focus: generiek platform, ERPNext agents als latere use case (D-003).

**oa-cli commando's (12)**:
`oa start`, `oa stop`, `oa status`, `oa run`, `oa list`, `oa logs`, `oa attach`, `oa kill`, `oa dashboard`, `oa web`, `oa pipeline`, `oa config`

---

## Core Bestanden

Elk bestand heeft een specifieke functie. **Gebruik ze actief — anders heeft het geen zin ze te maken.**

### Lessen & Overdracht

| Bestand | Functie | Wanneer raadplegen |
|---------|---------|-------------------|
| `LESSONS.md` | **Geleerde lessen.** Genummerd (L-001+), per sessie bijgewerkt. Bevat concrete fouten en oplossingen uit eerdere runs. | Bij sessiestart: welke fouten moeten we vermijden? Bij sessie-einde: nieuwe lessen toevoegen. |
| `docs/HANDOFF-*.md` | **Overdrachtsdocumenten.** Per sessie geschreven, bevat alles wat de volgende instance moet weten. | Bij sessiestart: lees het meest recente handoff document. |

### Plannen & Bouwen

| Bestand | Functie | Wanneer raadplegen |
|---------|---------|-------------------|
| `docs/MASTERPLAN.md` | **Sprintplan met uitvoerbare prompts.** Bevat 12 sprints, elke fase heeft een concrete prompt die je kopieert naar een Claude Code sessie. Dit is het BOUWPLAN. | Bij elke taak: welke fase ben ik, wat is de prompt, wat zijn de taken? |
| `docs/ROADMAP.md` | **Single source of truth voor STATUS.** Percentages, checkboxes, wat is af en wat niet. | Bij sessiestart: waar staan we? |
| `docs/DECISIONS.md` | **Alle beslissingen (open + genomen).** Genummerd (D-001+), met rationale en datum. | Bij elke architectuurkeuze: is dit al besloten? Nieuwe beslissing? Documenteer hier. |
| `docs/REQUIREMENTS.md` | **Functionele en non-functionele requirements.** FR-01..FR-14, NFR-01..NFR-05. | Bij feature-implementatie: voldoe ik aan de requirements? |

### Kennis & Research

| Bestand | Functie | Wanneer raadplegen |
|---------|---------|-------------------|
| `docs/AGENTS.md` | **Agent library definitie.** 1015 atomaire agents in 20 categorieën (A-T). Elke agent: id, naam, beschrijving, tools, model hint. | Bij Sprint 9 (agent library), bij assembly pipeline, bij het kiezen van agents voor templates. |
| `docs/PRINCIPLES.md` | **11 design uitgangspunten** die elke beslissing sturen. Atomaire agents, visuele orchestratie, privacy-first, etc. | Bij architectuurkeuzes: past dit bij onze principes? |
| `docs/SOURCES.md` | **Bronnenregister.** Research inzichten, vergelijkbare platforms (Langflow, Flowise, Dify, n8n), Anthropic Agent Teams model. | Bij research-first werk: wat weten we al? |
| `docs/OPEN-QUESTIONS.md` | **Onbeantwoorde vragen en risico's.** Pi.dev vs Agent SDK vergelijking, deployment vragen. | Bij onzekerheid: staat dit al als open vraag? |

### Project & Community

| Bestand | Functie | Wanneer raadplegen |
|---------|---------|-------------------|
| `README.md` | **Publieke project introductie.** Quick start, architectuur, setup instructies. | Bij onboarding of als iemand vraagt "wat is dit project?" |
| `CHANGELOG.md` | **Wijzigingslog.** Keep a Changelog format, gegenereerd bij releases. | Bij releases: wat is er veranderd sinds vorige versie? |
| `CONTRIBUTING.md` | **Bijdrage-instructies.** Code conventies, PR process, development setup. | Bij externe bijdragen of PR reviews. |
| `SECURITY.md` | **Security policy.** Hoe kwetsbaarheden melden. | Bij security-gerelateerde vragen. |

### Instructies & Credentials

| Bestand | Functie | Wanneer raadplegen |
|---------|---------|-------------------|
| `CLAUDE.md` | **Dit bestand.** HOE je werkt, niet WAAR je staat. Conventies, kerngedrag, session protocol. | Wordt automatisch geladen bij elke sessie. |
| `CLAUDE.local.md` | **Credentials.** GitHub tokens, API keys. NIET gecommit. | Bij API calls of GitHub operaties. |

> **GOUDEN REGEL**: GitHub = Single Source of Truth.
> CLAUDE.md bevat HOE je werkt. docs/ROADMAP.md bevat WAAR je staat. docs/MASTERPLAN.md bevat WAT je bouwt.

---

## Repositories

| Repo | Doel |
|------|------|
| `OpenAEC-Foundation/Open-Agents` | **Dit project** |
| `OpenAEC-Foundation/Impertio-AI-Ecosystem-Deployment` | **Generieke kennis** - methodologieën, skills, lessons learned |

---

## Project Structuur

```
Open-Agents/
├── oa-cli/              # Python CLI orchestrator (tmux-based) — PRIMAIR
│   ├── src/open_agents/ # CLI, orchestrator, dashboard, pipeline, bridge
│   └── web/             # React SPA web UI (Vite + React 19)
├── packages/            # TypeScript monorepo — SECUNDAIR (Visual Canvas)
│   ├── frontend/        # React 19 + React Flow v12 + Tailwind 4 + Vite
│   ├── backend/         # Fastify + Agent SDK integratie
│   ├── shared/          # @open-agents/shared — TypeScript types
│   ├── knowledge/       # @open-agents/knowledge — patterns, model profiles, cost estimation
│   ├── vscode-extension/# VS Code extension met MCP server
│   ├── vscode-webview/  # VS Code webview (React Flow canvas)
│   └── frappe-app/      # Frappe/ERPNext app wrapper
├── agents/
│   └── presets/         # 10 voorgebouwde agent JSON configs
├── templates/           # Flow + pool + ERPNext templates
├── docs/                # Documentatie (AGENTS, MASTERPLAN, DECISIONS, ROADMAP, etc.)
│   ├── design/
│   ├── proposals/
│   └── research/
├── docker-compose.yml   # Development environment
└── .claude/             # Claude Code workspace config
```

**Twee ecosystemen**:
1. **oa-cli/** — Python CLI orchestrator (PRIMAIR). Gebruikt Claude Code subscription via tmux.
2. **packages/** — TypeScript monorepo (SECUNDAIR, pnpm workspaces, D-008). Visueel canvas.

---

## Dev Commando's

### Primair: oa-cli

```bash
# Installeren
cd oa-cli && pip install -e .

# Sessie beheren
oa start          # tmux sessie starten
oa stop           # sessie stoppen
oa status         # lopende agents checken

# Agents spawnen & beheren
oa run "taak"     # agent spawnen met taak
oa list           # alle agents tonen
oa logs <id>      # logs van specifieke agent
oa attach <id>    # tmux pane van agent attachen
oa kill <id>      # agent stoppen

# Interfaces
oa dashboard      # Textual TUI openen
oa web            # React web UI starten op localhost:5174

# Pipeline & config
oa pipeline "taak"  # pipeline mode: planner -> subtasks -> combiner
oa config           # configuratie bekijken/aanpassen
```

### Advanced: Visual Canvas (packages/)

```bash
pnpm dev:frontend   # Vite dev server op port 5173
pnpm dev:backend    # Fastify op port 3001
pnpm dev            # beide tegelijk
```

---

## Known Issues & Workarounds

> **Raadpleeg bij ELKE oa-sessie.** Deze issues zijn open en vereisen workarounds.

### Issue #9 / #11: Agents negeren `oa run` en gebruiken Claude Code Agent tool

**Probleem**: Wanneer een oa-agent geïnstrueerd wordt om sub-agents te spawnen via `oa run`, gebruikt hij in plaats daarvan Claude Code's ingebouwde Agent tool. Sub-agents zijn dan onzichtbaar voor `oa status` en kunnen niet communiceren via `oa send`/`oa inbox`.

**Workaround: FLAT SPAWNING (L-004)**
Spawn ALLE agents direct vanuit de top-level Claude Code sessie. Gebruik GEEN nested delegatie.

```
✅ CORRECT — Flat spawning:
Meta-orchestrator (Claude Code sessie)
├── worker-1 (oa run)
├── worker-2 (oa run)
├── worker-3 (oa run)
└── worker-4 (oa run)

❌ FOUT — Nested spawning (werkt NIET):
Meta-orchestrator → orchestrator (oa run) → worker (oa run)
```

### Issue #10: Agent output verdwijnt in /tmp

**Probleem**: Zonder `--direct` flag schrijven agents hun output naar `/tmp/oa-agent-*/`. Dit is volatiel en gaat verloren bij reboot.

**Workaround: ALTIJD `--direct` gebruiken**
```bash
# ✅ CORRECT — output gaat naar project directory
oa run "taak" --name worker-1 --direct

# ❌ FOUT — output verdwijnt in /tmp
oa run "taak" --name worker-1
```

### Issue #12: Ongestructureerde prompts → inconsistente output

**Workaround**: Gebruik de 5-element prompt template (zie volgende sectie).

---

## 5-Element Task Prompt Template (L-010)

Elke `oa run` prompt MOET deze 5 elementen bevatten voor consistente output:

| # | Element | Waarom | Voorbeeld |
|---|---------|--------|-----------|
| 1 | **Absolute file paths** | Input/output locaties voorkomen verkeerde bestanden | `Lees: /path/to/input.md` `Schrijf naar: /path/to/output.md` |
| 2 | **Explicit scope** | Voorkomt ongerichte output | `Scope: • Node categorieën • Socket types • Data flow` |
| 3 | **Reference files** | Consistente structuur | `Volg format van: /path/to/example.md` |
| 4 | **Quality rules** | Agents erven GEEN project CLAUDE.md | `Regels: Engels, < 500 regels, deterministic taal` |
| 5 | **Source URLs** | Voorkomt hallucinaties | `Bronnen: https://docs.example.com` |

### Voorbeeld: Complete oa run prompt

```bash
oa run 'Je bent een RESEARCHER.

## Input
Lees: /mnt/c/project/docs/SOURCES.md

## Output
Schrijf naar: /mnt/c/project/docs/research/topic-research.md

## Scope
- API surface analysis (alle publieke functies)
- Versie-specifieke breaking changes
- Best practices en anti-patterns

## Format
Volg de structuur van: /mnt/c/project/docs/research/existing-research.md

## Regels
- Engels
- Minimaal 200 regels, maximaal 800 regels
- Deterministic taal (ALWAYS/NEVER, niet "you might consider")
- Alleen officiële documentatie als bron

## Bronnen
- https://docs.example.com/api
- https://github.com/example/repo' --name topic-researcher --direct
```

---

## Best Practices uit Multi-Agent Sessies

### Batch grootte: 3-5 agents tegelijk
Optimale parallelisatie zonder QA-overload. Quality gate na ELKE batch.

### Stage → Merge → Verify → Cleanup patroon (L-005)
Workers schrijven naar staging area, orchestrator merged naar main bestanden:
```
1. Workers schrijven naar: worker-output/<agent-naam>.md
2. Orchestrator merged naar: docs/final-output.md
3. Verify: controleer completeness
4. Cleanup: verwijder worker-output/
```

### Phase overlap wanneer dependencies het toelaten (L-011)
De pipeline hoeft niet strikt sequentieel. Foundation-taken (geen deps) kunnen eerder starten.

### Research → Masterplan → Review → Create → Validate pipeline
Bewezen pipeline voor kennisintensief werk. 15-25 agents totaal voor een volledig pakket.

---

## Hoe Agents Context Meekrijgen

Elke agent draait in een geïsoleerde workspace:

1. **Workspace builder** maakt een tijdelijke folder aan: `/tmp/oa-agent-<id>/`
2. **CLAUDE.md wordt gegenereerd** per agent met taak-specifieke instructies (rol, doel, output-locatie, constraints)
3. **Agent start** in die workspace — Claude Code ziet alleen die context
4. **Output** wordt weggeschreven naar `/tmp/oa-agent-<id>/output/`
5. **Resultaten** worden opgehaald via de bridge/combiner

Agents zien hun workspace als hun wereld — ze weten niet van andere agents, tenzij expliciet geconfigureerd.

---

## Hoe de Orchestrator Werkt

```
oa run "taak"
    │
    ├── Workspace builder: /tmp/oa-agent-<uuid>/
    │   ├── CLAUDE.md (gegenereerd, taak-specifiek)
    │   └── output/
    │
    ├── tmux: nieuwe pane/window met claude agent
    │
    ├── State: ~/.oa/agents.json
    │   └── { id, status, task, workspace, started_at, ... }
    │
    └── Pipeline mode (oa pipeline):
        ├── Planner agent  → breekt taak op in subtasks
        ├── Worker agents  → voeren subtasks parallel uit
        └── Combiner agent → integreert resultaten
```

**State management**: `~/.oa/agents.json` bevat alle agent-records met status (`running`, `done`, `error`), workspace-pad, en taak-omschrijving.

---

## Skill-Backed Agent Architectuur

### Concept

Skill packages zijn externe repositories met diepe domeinkennis, opgeslagen als `SKILL.md` bestanden. Elke skill mappt 1:1 naar een **atomaire agent** in `agents/library/`. De agent's `systemPrompt` bevat de gecomprimeerde kern van de skill. Dit patroon is generiek — het werkt voor elke domein (AEC, ERP, DevOps, data engineering, etc.).

### Architectuur

```
┌─────────────────────────────────────────────────────┐
│  Meta-Orchestrator (mens + Claude Code sessie)      │
│  Denkt, strategiseert, delegeert                    │
├─────────────────────────────────────────────────────┤
│  Presets (agents/presets/)                           │
│  Composities van meerdere atomaire agents            │
│  Voorbeeld: "IFC Validatie Pipeline" = 4 agents     │
├─────────────────────────────────────────────────────┤
│  Atomaire Agents (agents/library/<domein>/)          │
│  1:1 mapping met skills, enkelvoudige taak           │
├─────────────────────────────────────────────────────┤
│  Skill Packages (externe repos)                      │
│  SKILL.md bestanden met diepe domeinkennis           │
│  Generiek patroon, onafhankelijk van Open-Agents     │
└─────────────────────────────────────────────────────┘
```

### Agent Template Format

Atomaire agents gebruiken deze velden in hun JSON definitie:

```json
{
  "id": "aec-blender-mesh-operations",
  "name": "Blender Mesh Operations",
  "atomic": true,
  "skillRef": "aec-blender/skills/mesh-operations/SKILL.md",
  "skillPackage": "blender-bonsai-ifcos-sverchok",
  "executionContext": "blender-mcp",
  "systemPrompt": "...(gecomprimeerde kern van SKILL.md)...",
  "tools": ["blender-mcp"],
  "modelHint": "anthropic/claude-sonnet-4-6"
}
```

| Veld | Beschrijving |
|------|-------------|
| `skillRef` | Pad naar de SKILL.md in het skill package |
| `skillPackage` | Naam van het skill package (externe repo) |
| `atomic` | `true` — dit is een atomaire, single-skill agent |
| `executionContext` | Waar de agent draait: `blender-mcp`, `python-standalone`, etc. |

### Huidige Skill Packages

**blender-bonsai-ifcos-sverchok** — 73 skills → 73 atomaire agents

| Categorie | Agents | Domein |
|-----------|--------|--------|
| `aec-blender/` | 26 | Blender Python API, mesh, materials, rendering, animation |
| `aec-ifcopenshell/` | 19 | IFC model manipulatie, validatie, geometrie |
| `aec-bonsai/` | 14 | Native IFC BIM authoring in Blender |
| `aec-sverchok/` | 12 | Parametrisch/wiskundig ontwerp |
| `aec-cross/` | 2 | Cross-technology workflow orchestratie |

### Toekomstige Skill Packages

Het patroon is ontworpen om te schalen naar elk domein:

- **erpnext-frappe** — agents bestaan al in `agents/library/erpnext/`
- **devops-infrastructure** — CI/CD, Kubernetes, monitoring
- **data-engineering** — ETL, data pipelines, analytics
- Elk domein kan zijn eigen skill package krijgen

### Workspace Builder (Toekomst)

Gepland commando om kant-en-klare workspaces te genereren vanuit skill packages:

```bash
oa workspace create --skills blender-bonsai-ifcos-sverchok
```

Dit zal:
1. Skills extraheren uit het package
2. `.claude/skills/` vullen met relevante skill bestanden
3. Een CLAUDE.md genereren met domein-specifieke instructies
4. Een ready-to-clone workspace opleveren voor eindgebruikers

---

## Conventies

### Model IDs
Provider/model format (D-011): `"anthropic/claude-sonnet-4-6"`, `"openai/o3"`, `"mistral/mistral-large"`, `"ollama/<model>"`.

### Commit Messages
Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
Scope optioneel: `feat(frontend):`, `fix(backend):`

### Taal
- Documentatie: Nederlands (tenzij technische docs)
- Code en configs: Engels

---

## Session Recovery Protocol

**Bij ELKE sessiestart:**

1. `LESSONS.md` — lees geleerde lessen (fouten vermijden!)
2. `docs/HANDOFF-*.md` — lees het meest recente handoff document
3. `oa start` — tmux sessie starten (als nog niet actief)
4. `oa status` — lopende agents checken
5. `docs/ROADMAP.md` — waar staan we? Welke fase is actief?
6. `git status` — lokaal werk checken
7. **Spawn orchestrator** — `oa run "taak" --name orchestrator --model claude/opus`
8. **Delegeer ALLES** — Claude Code = doorgeefluik, niet de werker
9. Bevestiging vragen voordat je verdergaat

**Bij ELKE sessie-einde:**

1. Nieuwe lessen toevoegen aan `LESSONS.md`
2. Handoff document schrijven: `docs/HANDOFF-<datum>.md`
3. Committen en pushen

---

## Document Update Protocol

**Bij ELKE wijziging die impact heeft op core-bestanden:**

| Wanneer | Update |
|---------|--------|
| Taak afgerond | `docs/ROADMAP.md` checkboxes + percentage |
| Beslissing genomen | `docs/DECISIONS.md` verplaats naar "Genomen" |
| Nieuwe open vraag | `docs/OPEN-QUESTIONS.md` toevoegen |
| Requirement veranderd | `docs/REQUIREMENTS.md` updaten |
| Agent toegevoegd/gewijzigd | `docs/AGENTS.md` bijwerken |
| Release gemaakt | `CHANGELOG.md` bijwerken |

> **Sync direct, niet achteraf.** Als je code commit maar vergeet ROADMAP.md te updaten, is de tracking onbetrouwbaar.

---

## Settings Discipline (CC_007)

| Wat | Waar | NOOIT |
|-----|------|-------|
| MCP servers | `<workspace>/.mcp.json` | `~/.claude/settings.local.json` |
| Skills | `<workspace>/.claude/skills/` | `~/.claude/skills/` |
| Hooks | `<workspace>/.claude/settings.json` | `~/.claude/settings.json` |
| Secrets | `<workspace>/CLAUDE.local.md` | Committed files |

---

## Kerngedrag

1. **META-ORCHESTRATOR** — De Claude Code sessie + de gebruiker samen zijn het strategisch brein (de meta-orchestrator). Denken, strategiseren, en beslissen gebeurt HIER. Uitvoering wordt gedelegeerd via `oa run` of `oa delegate`. (L-010, L-017)
2. **FLAT SPAWNING** — Spawn ALLE agents direct vanuit de top-level sessie. NOOIT nested (oa agent die oa agents spawnt). Claude Code's Agent tool overschrijft `oa run` instructies. (L-004, #9, #11)
3. **ALTIJD --direct** — Elke `oa run` MOET `--direct` bevatten. Zonder --direct verdwijnt output in `/tmp`. (L-010, #10)
4. **5-ELEMENT PROMPTS** — Elke oa run prompt MOET bevatten: absolute paden, explicit scope, reference files, quality rules, source URLs. (L-010, #12)
5. **Orchestrator-first** — Elke taak heeft minimaal 2 agents: 1 orchestrator + workers. Gebruik `oa delegate` voor automatische hiërarchie. (D-051)
6. **Proposal mode** — Agents schrijven proposals, nooit directe wijzigingen. Review via `oa review`, apply via `oa apply`. (L-005, L-006)
7. **Validator before apply** — Syntax-check proposals VOOR ze applied worden. Spawn een tester-agent als er twijfel is. (L-015)
8. **Guardian agents** — Na elke batch: spawn guardians die core docs updaten (LESSONS, ROADMAP, DECISIONS, etc.)
9. **Agent voor alles** — Error? Spawn fix-agent. Review nodig? Spawn reviewer. Context nodig? Spawn researcher. (L-016)
10. **Documenteer beslissingen** — In DECISIONS.md
11. **Kennis bewaren** — Generieke inzichten → LESSONS.md en core docs
12. **Workspace-local** — Alle config in workspace, nooit global (CC_007)
13. **Templates hergebruiken** — Check `agents/library/` en `templates/` voordat je nieuwe agents definieert

---

## Quick Reference

```bash
# oa-cli (primair)
oa start                    # tmux sessie starten
oa run "taak" --direct      # agent spawnen (ALTIJD --direct!)
oa run "taak" -n naam --direct  # agent met naam
oa status                   # agents overzicht
oa dashboard                # TUI dashboard
oa web                      # web UI op localhost:5174
oa pipeline "taak"          # pipeline: planner -> workers -> combiner

# Agent communicatie
oa send <agent> "bericht" --from <naam>  # bericht sturen
oa inbox <agent>            # berichten lezen
oa broadcast "bericht" --from <naam>     # naar alle agents

# Git status
git status

# Advanced: Visual Canvas (packages/)
pnpm dev:frontend           # Vite dev server op port 5173
pnpm dev:backend            # Fastify op port 3001

# TypeScript check
pnpm --filter @open-agents/frontend typecheck

# Token 1 (Open-Agents access) testen
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/OpenAEC-Foundation/Open-Agents" | python -c "import sys,json; print(json.loads(sys.stdin.read()).get('permissions'))"
```

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
