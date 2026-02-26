# ROADMAP - Open-Agents

> Dit is de SINGLE SOURCE OF TRUTH voor project status en voortgang.
> Claude Project Instructies verwijzen hiernaar - geen dubbele tracking.

> **Laatste update**: 2026-02-26
> **Status**: Fase 0 - Foundation IN PROGRESS
> **Research**: [openagents-plan.md](openagents-plan.md), [pi-dev-onderzoek-compleet.md](pi-dev-onderzoek-compleet.md)

---

## Project Status

| Categorie | Voltooid | Totaal |
|-----------|:--------:|:------:|
| Research | 2 | 2 |
| Repo Foundation | 1 | 1 |
| Shared Snippets | 0 | 10 |
| Eerste Agent | 0 | 1 |
| Smart Context Extension | 0 | 1 |
| Model Router | 0 | 1 |
| Docker Deployment | 0 | 1 |

**Fase 0 (Foundation)**: ████████░░░░░░░░░░░░ **40%** - repo structuur, research
**Fase 1 (Snippets)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 2 (First Agent)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 3 (Smart Context)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 4 (Deployment)**: ░░░░░░░░░░░░░░░░░░░░ **0%**
**Fase 5 (Scale)**: ░░░░░░░░░░░░░░░░░░░░ **0%**

---

## Fase Overzicht

### Fase 0: Foundation (In Progress)

- [x] Pi.dev research en documentatie
- [x] OpenAgents projectplan geschreven
- [x] GitHub repo aangemaakt onder OpenAEC-Foundation
- [x] Repository structuur opgezet (core files, .gitignore, CLAUDE workspace)
- [ ] Pi.dev installeren en werkend krijgen
- [ ] Impertio infrastructuur overzicht finaliseren

### Fase 1: Snippet Bibliotheek

- [ ] 5-10 shared snippets schrijven (bedrijfsinfo, ERPNext API, klanten)
- [ ] Frontmatter standaard definiëren (tags, weight, model_hint)
- [ ] Eerste agent-specifieke snippets (boekhouding of admin)
- [ ] Snippet discovery en loading mechanisme

### Fase 2: Eerste Agent

- [ ] Agent config (JSON) voor eerste domein
- [ ] Custom tools definiëren (frappe_get_document, etc.)
- [ ] Frappe REST API wrapper
- [ ] Testen met eigen ERPNext instance

### Fase 3: Smart Context & Model Routing

- [ ] Smart Context extension bouwen (snippet selectie + assembly)
- [ ] Model router extension bouwen (complexiteit → model)
- [ ] Classificatie pipeline (vraag → categorie → tags)
- [ ] End-to-end test

### Fase 4: Docker Deployment

- [ ] Dockerfile per agent type
- [ ] docker-compose.yml voor Hetzner
- [ ] Environment variabelen en secrets management
- [ ] Deploy eerste agent op Hetzner
- [ ] Monitoring en logging

### Fase 5: Scale & Tweede Agent

- [ ] Tweede agent type (Inkoop of Admin)
- [ ] Klant-isolatie (multi-tenant)
- [ ] Klant pilot
- [ ] Documentatie voor Pritam (beheer)

---

## Model Routing Strategie

| Vraag type | Model | Waarom |
|-----------|-------|--------|
| Simpele lookup | Haiku / Llama 3.1 8B (lokaal) | Snel, goedkoop |
| Standaard werk | Sonnet 4.6 | Balans kwaliteit/snelheid |
| Complexe analyse | Opus 4.6 | Maximale redenering |
| Code generatie | Sonnet 4.6 | Sterk in code, snel genoeg |
| Classificatie (intern) | Haiku / lokaal model | Alleen classificatie |

---

## Legenda

| Symbool | Betekenis |
|:-------:|-----------|
| [x] | Voltooid |
| [ ] | Gepland |

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
