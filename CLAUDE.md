# Open-Agents - Claude Instructies

> **Versie**: 2
> **Laatste update**: 2026-03-01
> **Template versie**: 3.0 (gebaseerd op Impertio AI Ecosystem Deployment)
> **Setup tier**: Standard

## Projectdoel

Hyper session workspace builder met agentic orchestratie. Gebruikers bouwen visueel de ideale workspace-configuratie per agent (6-layer stack: CLAUDE.md, skills, rules, MCP, hooks) en orkestreren ze samen op een canvas — zelf of door AI. Drie engineering-lagen (D-025): orchestratie (WIE), agent identiteit (WAT), workspace/context (HOE). Multi-provider LLM support (Anthropic, OpenAI, Mistral, Ollama). Eerste focus: generiek platform, ERPNext agents als latere use case (D-003).

---

## Core Bestanden

Elk bestand heeft een specifieke functie. **Gebruik ze actief — anders heeft het geen zin ze te maken.**

### Plannen & Bouwen

| Bestand | Functie | Wanneer raadplegen |
|---------|---------|-------------------|
| `MASTERPLAN.md` | **Sprintplan met uitvoerbare prompts.** Bevat 10 sprints, elke fase heeft een concrete prompt die je kopieert naar een Claude Code sessie. Dit is het BOUWPLAN. | Bij elke taak: welke fase ben ik, wat is de prompt, wat zijn de taken? |
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
├── packages/
│   ├── frontend/        # React 19 + React Flow v12 + Tailwind 4 + Vite
│   ├── backend/         # Fastify + Agent SDK integratie
│   └── shared/          # @open-agents/shared — TypeScript types
├── agents/
│   └── presets/         # 10 voorgebouwde agent JSON configs
├── docs/                # Documentatie
│   ├── research/
│   └── design/
├── docker-compose.yml   # Development environment
└── .claude/             # Claude Code workspace config
```

**Monorepo**: pnpm workspaces (D-008). Shared types in `@open-agents/shared`.

**Dev commando's**:
- `pnpm dev:frontend` — Vite dev server op port 5173
- `pnpm dev:backend` — Fastify op port 3001
- `pnpm dev` — beide tegelijk

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

1. `ROADMAP.md` — waar staan we? Welke fase is actief?
2. `DECISIONS.md` — zijn er open beslissingen die invloed hebben?
3. `MASTERPLAN.md` — wat is de prompt/taak voor de huidige fase?
4. `git status` — lokaal werk checken
5. Bevestiging vragen voordat je verdergaat

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
# Status checken
git status

# Frontend dev
pnpm dev:frontend

# TypeScript check
pnpm --filter @open-agents/frontend typecheck

# Token 1 (Open-Agents access) testen
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/OpenAEC-Foundation/Open-Agents" | python -c "import sys,json; print(json.loads(sys.stdin.read()).get('permissions'))"
```

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
