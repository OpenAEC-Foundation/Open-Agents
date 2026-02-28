# Decisions - Open-Agents

> Alle open en genomen beslissingen voor dit project.
> GitHub = Single Source of Truth voor tracking (M1).

---

## Open Beslissingen

| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-001 | Visibility: public of private repo? | Project is nu private, plan is open-source bij stabiel MVP | A) Nu public B) Private tot MVP | Open |
| D-004 | Lokaal model voor classificatie | Ollama op Hetzner vs alleen cloud API | A) Ollama B) Haiku C) Hybrid | Open |

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
| D-006 | Frontend framework | React + React Flow (xyflow v12) | Marktleider (24k stars), gebruikt door Langflow/Flowise/Dify, bewezen VS Code webview support, React 19 + Tailwind 4 + shadcn/ui components, dark mode built-in. Frappe embed als standalone SPA (NFR-05). | 2026-02-28 |
| D-007 | Backend framework | Node.js + Fastify | TypeScript everywhere = shared types in monorepo, 1 toolchain. Claude Agent SDK TS (v0.2.63) met V2 preview async iterators mappen direct op Fastify SSE plugin. Pi agent-core (ook TS) past naadloos bij. 2-3x sneller dan Express. | 2026-02-28 |
| D-008 | Mono-repo vs multi-repo | Mono-repo met pnpm workspaces | Shared TypeScript types, 1 CI/CD pipeline, eenvoudig dependency management. Packages: shared, frontend, backend, vscode-extension (later), frappe-wrapper (later). Alle concurrenten gebruiken mono-repo. | 2026-02-28 |
| D-009 | Agent runtime strategie | Claude Agent SDK only (voor PoC) | SDK heeft alles: query(), sessions, hooks, MCP, subagents, streaming. Pi agent-core toevoegen voegt complexiteit toe zonder PoC-voordeel. Later als runtime adapter toevoegen. | 2026-02-28 |
| D-010 | Config format voor canvas export | Eigen JSON schema met Claude SDK mapping | Canvas exporteert {nodes: [...], edges: [...]}. Backend vertaalt naar Agent SDK calls. Simpel, menselijk leesbaar, vrijheid om later Pi of andere runtimes toe te voegen. | 2026-02-28 |
| D-011 | Multi-provider model support | Harde eis: elke agent moet configureerbaar zijn met verschillende LLM providers (Anthropic, OpenAI/Codex, Mistral, Ollama, etc.). Model is een parameter per agent, met default/preset maar altijd aanpasbaar. | Model identifier wordt `provider/model` string (bv. `anthropic/claude-sonnet-4-6`, `mistral/mistral-large`, `openai/o3`). Backend routeert via provider-specifieke adapters. API keys per provider in workspace config. | 2026-02-28 |

---

## Decision Template

```markdown
| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-XXX | [Wat moet besloten worden?] | [Waarom is dit relevant?] | A) ... B) ... | Open |
```

Bij het nemen van een beslissing, verplaats naar "Genomen" met rationale en datum.

---

*Laatste update: 2026-03-01*
