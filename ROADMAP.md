# ROADMAP - Open-Agents

> Dit is de SINGLE SOURCE OF TRUTH voor project status en voortgang.
> Claude Project Instructies verwijzen hiernaar - geen dubbele tracking.
>
> **Laatste update**: 2026-02-28
> **Status**: Fase 0 - Foundation IN PROGRESS
> **Visie**: Visueel agent orchestratie platform
> **Zie ook**: MASTERPLAN.md (sprints), REQUIREMENTS.md (requirements), PRINCIPLES.md (uitgangspunten)

---

## Project Status

| Categorie | Voltooid | Totaal |
|-----------|:--------:|:------:|
| Research & Visie | 3 | 3 |
| Core Documenten | 5 | 7 |
| PoC Canvas | 0 | 1 |
| Factory Portal | 0 | 1 |
| Orchestratie (Flow + Pool) | 0 | 2 |
| Safety & Audit | 0 | 1 |
| Semantische Laag | 0 | 1 |
| VS Code Extension | 0 | 1 |
| Frappe App | 0 | 1 |
| Agent Library (doel: 100+) | 0 | 100 |

**Fase 0 (Foundation)**: ████████████████░░░░ **80%** - documenten, visie, research
**Fase 1 (PoC)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 2 (Factory)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 3 (Orchestratie)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 4 (Intelligence)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 5 (Deployment)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 6 (Scale)**: ░░░░░░░░░░░░░░░░░░░░ **0%**

---

## Fase Overzicht

### Fase 0: Foundation (In Progress)

- [x] Pi.dev research en documentatie
- [x] OpenAgents projectplan geschreven
- [x] GitHub repo aangemaakt onder OpenAEC-Foundation
- [x] Repository structuur opgezet
- [x] Visie verscherpt: van ERPNext-first naar visueel platform
- [x] Anthropic Agent SDK + Skills + Context Windows research
- [x] Visuele editor libraries research (React Flow, Vue Flow, Rete.js)
- [x] Vergelijkbare platforms analyse (Langflow, Flowise, Dify, n8n)
- [x] OpenAEC repos inventaris (36 repos, relevante tools geïdentificeerd)
- [ ] REQUIREMENTS.md geschreven
- [ ] MASTERPLAN.md geschreven
- [ ] PRINCIPLES.md geschreven
- [ ] SOURCES.md geschreven
- [ ] OPEN-QUESTIONS.md geschreven
- [ ] DECISIONS.md geüpdate met nieuwe beslissingen
- [ ] ROADMAP.md geüpdate (dit document)

### Fase 1: Proof of Concept (Sprint 1)

- [ ] Frontend framework gekozen (D-006)
- [ ] Backend framework gekozen (D-007)
- [ ] Minimale canvas met 2 agent-blokken
- [ ] Blokken visueel verbinden
- [ ] Canvas exporteert naar JSON configuratie
- [ ] Config triggert Claude Code via Agent SDK
- [ ] End-to-end flow werkend

### Fase 2: Factory & Asset Library (Sprint 2)

- [ ] Factory portal tabblad
- [ ] Agent creation wizard
- [ ] Conversational agent creation
- [ ] Basis asset library
- [ ] Eerste 10 voorgebouwde agents

### Fase 3: Orchestratie Patronen (Sprint 3-4)

- [ ] Flow pattern: sequentiële pipeline (A→B→C)
- [ ] Output passing tussen agents
- [ ] Session management (pause, resume, fork)
- [ ] Pool pattern: dispatcher-based routing
- [ ] Parallelle agent execution
- [ ] Patronen combineerbaar

### Fase 4: Intelligence (Sprint 5-6)

- [ ] Safety rules editor (visueel)
- [ ] Audit trail en run history
- [ ] Natural language → architectuur generatie
- [ ] Auto-context building
- [ ] Smart suggestions
- [ ] Beginner conversational mode

### Fase 5: Deployment Targets (Sprint 7-8)

- [ ] VS Code extension met webview canvas
- [ ] Integratie met Claude Code extension
- [ ] Frappe app wrapper
- [ ] ERPNext use case templates
- [ ] Docker agent isolation

### Fase 6: Scale & Community

- [ ] Agent library uitbreiden naar 100+
- [ ] Community template marketplace
- [ ] Multi-tenant deployment
- [ ] Performance optimalisatie
- [ ] Documentatie en tutorials

---

## Model Routing Strategie

| Vraag type | Model | Waarom |
|-----------|-------|--------|
| Simpele lookup | Haiku 4.5 | Snel, goedkoop |
| Standaard werk | Sonnet 4.6 | Balans kwaliteit/snelheid |
| Complexe analyse | Opus 4.6 | Maximale redenering |
| Code generatie | Sonnet 4.6 | Sterk in code, snel genoeg |
| Classificatie | Haiku 4.5 | Alleen classificatie, minimale kosten |
| Semantische laag | Sonnet 4.6 | Intent herkenning + architectuur generatie |

---

## Legenda

| Symbool | Betekenis |
|:-------:|-----------|
| [x] | Voltooid |
| [ ] | Gepland |

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
