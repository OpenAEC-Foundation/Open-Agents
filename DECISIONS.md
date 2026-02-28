# Decisions - Open-Agents

> Alle open en genomen beslissingen voor dit project.
> GitHub = Single Source of Truth voor tracking (M1).

---

## Open Beslissingen

| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-001 | Visibility: public of private repo? | Project is nu private, plan is open-source bij stabiel MVP | A) Nu public B) Private tot MVP | Open |
| D-004 | Lokaal model voor classificatie | Ollama op Hetzner vs alleen cloud API | A) Ollama B) Haiku C) Hybrid | Open |
| D-006 | Frontend framework keuze | Canvas editor voor agent orchestratie, moet werken in standalone, VS Code en Frappe | A) React + React Flow (35k stars, marktleider) B) Vue + Vue Flow (native Frappe fit) C) Rete.js (framework-agnostisch) | Open |
| D-007 | Backend framework keuze | API-first backend voor configuratie opslag en agent execution | A) Python (FastAPI) B) Node.js (Fastify) C) Frappe (Python) | Open |
| D-008 | Mono-repo vs multi-repo | Frontend, backend, VS Code extension, Frappe app - hoe organiseren? | A) Mono-repo (alles samen) B) Multi-repo (per component) C) Hybrid (core mono-repo, wrappers apart) | Open |
| D-009 | Agent runtime strategie | Welke runtime(s) stuurt het platform aan? | A) Claude Agent SDK only B) Pi agent-core only C) Hybride (beide) | Open |
| D-010 | Config format voor canvas export | Canvas exporteert naar configuratie - welk format? | A) Eigen JSON schema B) Pi agent definition format C) Claude agents:{} map D) Universeel format dat naar beide kan | Open |

---

## Genomen Beslissingen

| # | Beslissing | Gekozen | Rationale | Datum |
|---|-----------|---------|-----------|-------|
| D-100 | Repository locatie | OpenAEC-Foundation/Open-Agents | Past in ecosysteem: Impertio = intern, OpenAEC = open-source later | 2026-02-26 |
| D-101 | Docker per agent | Ja, elke agent als container | Isolatie, schaalbaarheid, security, bestaande Hetzner workflow | 2026-02-26 |
| D-102 | Snippet-based context | Markdown snippets met YAML frontmatter | Lichtgewicht, versionable, leesbaar voor mens en AI | 2026-02-26 |
| D-103 | Credential management pattern | CLAUDE.local.md + defense-in-depth .gitignore | Conform Impertio SEC_002, workspace-local principle | 2026-02-26 |
| D-104 | Workspace tooling | Claude Code als primaire AI-assistent | Bestaande expertise, workspace discipline via AI Ecosystem Deployment | 2026-02-26 |
| D-002 | Pi.dev vs Claude Code als agent framework | Eigen platform met Claude Agent SDK + Pi agent-core als complementaire runtimes | Niet puur Pi.dev of Claude Code, maar eigen visueel platform dat beide als runtime kan aansturen. Claude SDK voor officiële Anthropic integratie, Pi agent-core voor open-source flexibiliteit. | 2026-02-28 |
| D-003 | Eerste pilot agent kiezen | Generiek platform eerst | Focus verschoven van ERPNext-first naar generiek visueel platform. ERPNext agents worden later een use case, niet de kern. | 2026-02-28 |
| D-005 | Flowchart tooling voor agent architectuur | In-app visuele editor (eigen canvas) | We bouwen de visuele editor zelf als kernfunctionaliteit van het platform. Geen externe tooling nodig. | 2026-02-28 |

---

## Decision Template

```markdown
| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-XXX | [Wat moet besloten worden?] | [Waarom is dit relevant?] | A) ... B) ... | Open |
```

Bij het nemen van een beslissing, verplaats naar "Genomen" met rationale en datum.

---

*Laatste update: 2026-02-28*
