# Open-Agents - Claude Instructies

> **Versie**: 4
> **Laatste update**: 2026-03-02
> **Template versie**: 4.0 (oa-cli als primaire orchestratie)
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
| `MASTERPLAN.md` | **Sprintplan met uitvoerbare prompts.** Bevat 12 sprints, elke fase heeft een concrete prompt die je kopieert naar een Claude Code sessie. Dit is het BOUWPLAN. | Bij elke taak: welke fase ben ik, wat is de prompt, wat zijn de taken? |
| `ROADMAP.md` | **Single source of truth voor STATUS.** Percentages, checkboxes, wat is af en wat niet. | Bij sessiestart: waar staan we? |
| `DECISIONS.md` | **Alle beslissingen (open + genomen).** Genummerd (D-001+), met rationale en datum. | Bij elke architectuurkeuze: is dit al besloten? Nieuwe beslissing? Documenteer hier. |
| `REQUIREMENTS.md` | **Functionele en non-functionele requirements.** FR-01..FR-14, NFR-01..NFR-05. | Bij feature-implementatie: voldoe ik aan de requirements? |

### Kennis & Research

| Bestand | Functie | Wanneer raadplegen |
|---------|---------|-------------------|
| `AGENTS.md` | **Agent library definitie.** 1015 atomaire agents in 20 categorieën (A-T). Elke agent: id, naam, beschrijving, tools, model hint. | Bij Sprint 9 (agent library), bij assembly pipeline, bij het kiezen van agents voor templates. |
| `PRINCIPLES.md` | **11 design uitgangspunten** die elke beslissing sturen. Atomaire agents, visuele orchestratie, privacy-first, etc. | Bij architectuurkeuzes: past dit bij onze principes? |
| `SOURCES.md` | **Bronnenregister.** Research inzichten, vergelijkbare platforms (Langflow, Flowise, Dify, n8n), Anthropic Agent Teams model. | Bij research-first werk: wat weten we al? |
| `OPEN-QUESTIONS.md` | **Onbeantwoorde vragen en risico's.** Pi.dev vs Agent SDK vergelijking, deployment vragen. | Bij onzekerheid: staat dit al als open vraag? |

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
> CLAUDE.md bevat HOE je werkt. ROADMAP.md bevat WAAR je staat. MASTERPLAN.md bevat WAT je bouwt.

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
├── docs/                # Documentatie
│   ├── research/
│   └── design/
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
5. `ROADMAP.md` — waar staan we? Welke fase is actief?
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
| Taak afgerond | `ROADMAP.md` checkboxes + percentage |
| Beslissing genomen | `DECISIONS.md` verplaats naar "Genomen" |
| Nieuwe open vraag | `OPEN-QUESTIONS.md` toevoegen |
| Requirement veranderd | `REQUIREMENTS.md` updaten |
| Agent toegevoegd/gewijzigd | `AGENTS.md` bijwerken |
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

1. **Research-first** — Geen beslissingen zonder onderbouwing
2. **Keuze-opties bieden** — Altijd alternatieven presenteren
3. **Geen aannames** — Verifieer, doorvragen
4. **Documenteer beslissingen** — In DECISIONS.md
5. **Kennis bewaren** — Generieke inzichten -> deployment repo
6. **Documenten actueel** — Sync direct, niet achteraf
7. **Geen tracking in instructies** — CLAUDE.md = HOE, ROADMAP.md = WAAR
8. **Workspace-local** — Alle config in workspace, nooit global (CC_007)
9. **MASTERPLAN is het bouwplan** — Kopieer prompts, volg fases, check taken

---

## Quick Reference

```bash
# oa-cli (primair)
oa start                    # tmux sessie starten
oa run "taak"               # agent spawnen
oa status                   # agents overzicht
oa dashboard                # TUI dashboard
oa web                      # web UI op localhost:5174
oa pipeline "taak"          # pipeline: planner -> workers -> combiner

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
