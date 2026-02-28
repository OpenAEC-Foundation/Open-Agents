# Decisions - Open-Agents

> Alle open en genomen beslissingen voor dit project.
> GitHub = Single Source of Truth voor tracking (M1).

---

## Open Beslissingen

| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-001 | Visibility: public of private repo? | Project is nu private, plan is open-source bij stabiel MVP | A) Nu public B) Private tot MVP | Open |
| D-004 | Lokaal model voor classificatie | Ollama op Hetzner vs alleen cloud API. Context verrijkt door D-017: Haiku via API als classificator in assembly pipeline. Ollama blijft optie voor offline/self-hosted. | A) Ollama B) Haiku C) Hybrid | Open (context verrijkt) |

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
| D-015 | Runtime Adapter Pattern | AgentRuntime interface abstraheert runtime-specifieke details | Open/closed principle: PoC implementeert ClaudeSDKRuntime. Later PiAgentRuntime toevoegen zonder bestaande code te wijzigen. | 2026-02-28 |
| D-014 | Frontend state management | Zustand | Klein, serializable (VS Code webview), werkt met React 19. Nodig voor canvasStore + assistantStore. | 2026-02-28 |
| D-016 | Knowledge package structuur | Apart `@open-agents/knowledge` package in monorepo | Scheidt domeinkennis van runtime code, herbruikbaar door backend en toekomstige CLI. | 2026-02-28 |
| D-017 | Assembly LLM model allocatie | Haiku voor intent classificatie, Sonnet voor graph generatie | Volgt research-first principe: goedkoopste model dat de taak aankan. Haiku classificeert NL input, Sonnet genereert concrete agent graphs. | 2026-02-28 |
| D-018 | AI Assistant model | Sonnet voor alle assistant queries | Gebalanceerde cost/quality voor interactieve chat naast het canvas. | 2026-02-28 |
| D-019 | Auto-layout library | @dagrejs/dagre | Standaard voor React Flow auto-layout, gebruikt door Langflow. Positioneert gegenereerde nodes automatisch. | 2026-02-28 |
| D-020 | Snippet formaat knowledge base | Markdown met YAML frontmatter | Consistent met D-102, LLM-leesbaar, version-controllable. Routing patterns, principes en building blocks als .md snippets. | 2026-02-28 |
| D-021 | Kennisbron voor assembly | Hybrid: structurele regels in engine, domeinkennis als extensible snippets | Hard in TypeScript: model profiles, tool capabilities, token budgets, graph validatie. Soft als markdown: routing patterns, orchestratie principes, best practices. | 2026-02-28 |
| D-022 | Self-assembly architectuur | NL → Intent (Haiku) → Pattern Match (TypeScript) → Graph Generate (Sonnet) → Cost + Validate (TypeScript) | 5-staps pipeline. LLM alleen waar creativiteit nodig is (classificatie + generatie), deterministische TypeScript waar betrouwbaarheid cruciaal is (matching, validatie, cost). | 2026-02-28 |
| D-023 | Agent Taxonomie: wanneer is iets een agent? | Vier entiteittypes gebaseerd op Anthropic Agent SDK + Agent Teams. Bepaalt canvas block types en runtime gedrag. | Zie D-023 Details hieronder. | 2026-02-28 |
| D-024 | Per-Agent Workspace Engineering | Elke agent draait in Docker met volledige 6-layer context stack (CLAUDE.md, rules, skills, MCP, agents, hooks). | Gebaseerd op Claude Workspace Development Workflows research. Zie D-024 Details. | 2026-02-28 |
| D-025 | Multi-Layered Engineering Model | Drie lagen: (1) Orchestratie/Canvas = WIE, (2) Agent Identiteit/SDK = WAT, (3) Workspace/Context = HOE. | Maximale output kwaliteit door alle drie de lagen apart te optimaliseren. Zie D-025 Details. | 2026-02-28 |
| D-026 | Database (PoC) | In-memory Map (geen persistentie) | PoC draait lokaal, persistentie is niet nodig. Backend gebruikt `Map<string, CanvasConfig>`. Productie-database (SQLite/PostgreSQL) is een latere beslissing. | 2026-03-01 |
| D-012 | Authenticatie (PoC) | Geen auth (localhost only) | PoC draait lokaal. Authenticatie toevoegen bij deployment (Sprint 7-8). Gedocumenteerd als beperking in README. | 2026-03-01 |
| D-013 | Claude API Key Beheer | Environment variable (`ANTHROPIC_API_KEY` in `.env`) | Simpelst voor PoC. `.env` in `.gitignore`, `.env.example` als template. BYOK via UI is latere iteratie. | 2026-03-01 |
| D-027 | Library Ecosystem architectuur | 10 browsable libraries (7 atomair + 3 composiet) georganiseerd per D-025 engineering laag | Dekt alle asset types van het platform: patterns, agents, skills, connectors, hooks, rules, models (atomair) + templates, plugins, workspace templates (composiet). Elke library heeft zoeken, filteren, preview, one-click apply. | 2026-02-28 |
| D-028 | LLM-Powered Asset Generation | Factory gebruikt LLM voor conversational generatie van library assets | LLM kent platform regels (D-023 taxonomie, D-024 workspace stack, D-020 snippet formaat). Automatische validatie bij generatie. Draft-first: gebruiker reviewt voor publicatie. | 2026-02-28 |
| D-029 | White-Label Theming Architectuur | CSS custom properties + Tailwind v4 `@theme` voor swappable branding | Twee lagen: (1) `@theme` in index.css mapt semantische tokens naar CSS vars, (2) themabestand (bv. impertio.css) definieert de `--oa-*` variabelen. White-labelen = één CSS bestand swappen, geen component code wijzigen. Impertio Studio als default thema. Zie D-029 Details. | 2026-03-01 |
| D-030 | Zustand slice-compositie met Immer middleware | 7 slices (canvas, selection, history, ui, settings, execution, workspace) gecomponeerd in één appStore met Immer + devtools + persist middleware | Gebaseerd op open-2d-studio patroon (19 slices). Undo/redo via Immer `produceWithPatches`/`applyPatches`. Alleen canvas state (nodes/edges) wordt getrackt in history. Max 50 entries. Vervangt 4 losse stores. | 2026-03-01 |
| D-031 | Command Registry met auto-MCP tool generatie | CommandDef met JSON Schema params, execute/undo/redo, `getMcpTools()` auto-genereert MCP tool definitions | Gebaseerd op open-2d-studio command patroon. Elke canvas operatie is gedocumenteerd, undoable, en programmatisch aanroepbaar. Fundament voor AI-gestuurde canvas manipulatie via MCP. | 2026-03-01 |
| D-032 | Raw fetch voor non-Claude runtime adapters | OpenAI, Mistral en Ollama adapters gebruiken raw `fetch()` zonder SDK dependencies | Geen extra dependencies nodig. Zelfde `AgentRuntime` interface als ClaudeSDKRuntime. Text-in/text-out voor PoC (geen tool use voor non-Claude). Ollama draait lokaal op configurable base URL. | 2026-03-01 |
| D-033 | Dynamic preset loading van agents/presets/*.json via backend API | GET /api/presets endpoint laadt JSON files uit agents/presets/ met in-memory caching | 10 rijke agent presets beschikbaar in repo werden genegeerd. Nu dynamisch geladen met fallback naar 4 hardcoded presets als backend onbereikbaar is. POST /api/presets/reload voor development hot-reload. | 2026-03-01 |
| D-034 | VS Code Extension architectuur | 2 packages (vscode-extension CJS/tsup + vscode-webview browser/Vite), webview direct HTTP naar backend, MCP server in extension package, geen backend auto-start | Extension host en webview hebben fundamenteel verschillende build targets. Direct HTTP simpeler dan postMessage proxy. MCP server is thin bridge naar backend REST API. | 2026-03-02 |

---

## D-023 Details: Agent Taxonomie

> **Bron**: Anthropic Agent SDK (`@anthropic-ai/claude-agent-sdk`), Agent Teams documentatie, Skills documentatie.
> **Kernvraag**: Wanneer noemen we iets een agent? Wanneer een skill? Wat zijn de canvas block types?

### De Vier Entiteittypes

| Type | Eigen Context Window? | Autonome Executie? | Tool Use? | Multi-turn? | Canvas Representatie |
|------|:--------------------:|:------------------:|:---------:|:-----------:|---------------------|
| **Top-level Agent** | Ja | Ja | Ja | Ja | Primair blok (groot, centraal) |
| **Subagent** | Ja (eigen) | Ja | Ja | Ja | Kind-blok, verbonden aan parent |
| **Teammate** | Ja (eigen) | Ja | Ja | Ja | Peer-blok, bidirectionele verbindingen |
| **Skill** | Nee (deelt parent's) | Nee | Nee | Nee | Attachment op een agent-blok |

### Definitie per Type

**1. Agent (Top-level)**
- De hoofdagent die via `query()` wordt aangeroepen
- Heeft een autonome executie-loop: observeert → denkt → handelt → herhaalt
- Kan tools gebruiken, bestanden lezen/schrijven, commando's uitvoeren
- Heeft een `systemPrompt`, `tools`, `model`, `permissionMode`
- **Minimum**: `description` + `prompt` + ten minste één tool
- **Canvas**: Het startpunt van een flow of pool

**2. Subagent**
- Eigen context window (gescheiden van parent)
- Fire-and-forget: rapporteert alleen aan parent
- Parent delegeert werk, subagent voert uit en keert terug
- Gedefinieerd in `agents: {}` map of `.claude/agents/`
- **Minimum**: `description` + `prompt`
- **Canvas**: Kind-blok met directional edge naar parent

**3. Teammate (Agent Teams)**
- Volledig onafhankelijke Claude sessie
- Peer-to-peer messaging via mailbox (geen hiërarchie)
- Gedeelde takenlijst met team
- Kan zelf subagents spawnen
- **Minimum**: `description` + `prompt` + `tools`
- **Canvas**: Peer-blok met bidirectionele messaging edges

**4. Skill**
- **Geen** eigen context window — deelt parent's window
- **Geen** autonome executie — is kennis/instructie, geen uitvoerder
- Progressive loading: metadata (~100 tokens) → instructies (<5K) → resources (onbeperkt)
- Gedefinieerd in `.claude/skills/` met `SKILL.md` + optionele `references/`
- **Rol**: Verandert HOE een agent denkt over een domein, niet WAT hij kan
- **Canvas**: Attachment/badge op een agent-blok (geen standalone blok)

### Scheidslijn: Agent vs Prompt Template

| Criterium | Agent | Prompt Template / Skill |
|-----------|-------|------------------------|
| Executie-loop | Meerdere turns, observeert resultaten, past aan | Eén LLM-call: tekst in → tekst uit |
| Tool gebruik | Ja (bestanden, shell, MCP, etc.) | Nee |
| Autonomie | Beslist zelf welke stap volgende is | Volgt vaste instructie |
| Context | Eigen window (groeit per turn) | Deelt parent's window |
| **Lakmoestest**: kan het in één LLM-call? | Nee | Ja |

> **Implicatie voor AGENTS.md**: De 1015 gedefinieerde "agents" zijn overwegend **prompt templates** (single-turn transformaties). Bij implementatie worden ze skills of prompt templates binnen een agent-workspace. Echte agents ontstaan wanneer ze tools krijgen en in een autonome executie-loop draaien.

### Canvas Block Types (Mapping naar SDK)

| Block Type | SDK Concept | Visueel | Configuratie |
|-----------|------------|---------|-------------|
| **Agent Node** | Top-level / Subagent | Groot blok met status indicator | systemPrompt, tools, model, skills, hooks |
| **Skill Badge** | Skill | Klein label/tag op agent-blok | SKILL.md reference, progressive loading level |
| **Teammate Node** | Teammate | Peer blok met mailbox icon | Volledige agent config + team membership |
| **Connector Node** | MCP Server | Klein blok met plug icon | Server config, transport type, tool definitions |
| **Gate Node** | Hook (PreToolUse) | Diamant/ruit shape | Approval rule, filter condition |
| **Dispatcher Node** | Orchestratie logica | Groot blok met routing icon | Routing rules, model routing tabel |

---

## D-024 Details: Per-Agent Workspace Engineering

> **Bron**: Claude Workspace Development Workflows (17 modules, 6-layer stack), Docker-first isolatie (D-101, Principle 10).
> **Kernvraag**: Hoe optimaliseer je de context van elke individuele agent?

### Het 6-Layer Stack Model

Elke agent draait in een Docker container met een workspace die de **6-layer stack** implementeert:

```
┌─────────────────────────────────────────┐
│ Docker Container (per agent)            │
│                                         │
│  1. CLAUDE.md        → altijd geladen   │
│  2. .claude/rules/   → conditioneel     │
│  3. .claude/skills/  → on-demand        │
│  4. .mcp.json        → tool connecties  │
│  5. .claude/agents/  → sub-workers      │
│  6. hooks            → lifecycle auto   │
│                                         │
│  + workspace files (mounted volume)     │
│  + .env (credentials, per container)    │
└─────────────────────────────────────────┘
```

### Per Laag

| Laag | Wat | Wanneer Geladen | Token Kosten | Doel |
|------|-----|----------------|:------------:|------|
| 1. CLAUDE.md | Agent-specifieke context, conventies, domeinkennis | Altijd (sessiestart) | Hoog (~100-300 regels) | Base identity per agent |
| 2. .claude/rules/ | Path-scoped regels (frontend/, backend/, etc.) | Conditioneel (bij matching files) | Medium | Contextuele guidance |
| 3. .claude/skills/ | Domein-expertise (progressive loading) | On-demand (metadata ~100 tokens) | Laag → Medium | HOE de agent denkt |
| 4. .mcp.json | Externe tool connecties (GitHub, ERPNext, etc.) | Altijd (tool definitions) | Medium | WAT de agent kan bereiken |
| 5. .claude/agents/ | Subagent definities voor delegatie | Bij delegatie | Eigen window | Werk uitbesteden |
| 6. Hooks | PreToolUse, PostToolUse, Setup | Automatisch (lifecycle) | Zero (shell) | Quality gates, guardrails |

### Workspace Template per Agent Type

```
agent-workspace/
├── CLAUDE.md                    # Agent identity + domeinkennis
├── .claude/
│   ├── settings.json            # Permissies, hooks, model
│   ├── rules/                   # Conditionele regels
│   │   └── code-review.md       # (voorbeeld: alleen bij .ts/.js)
│   ├── skills/                  # Domein-skills
│   │   └── erpnext-server/
│   │       ├── SKILL.md         # Frontmatter + instructies
│   │       └── references/      # Snippets, voorbeelden
│   └── agents/                  # Sub-workers
│       └── linter.md            # Subagent definitie
├── .mcp.json                    # Tool connections
├── .env                         # Credentials (niet in Git)
└── workspace/                   # Mounted project files (read/write)
```

### Docker Volume Strategie

| Mount | Modus | Inhoud |
|-------|-------|--------|
| `/workspace` | Read/Write | Project bestanden (de werkelijke code/data) |
| `/agent-config` | Read-Only | Agent workspace template (CLAUDE.md, skills, etc.) |
| `/shared-skills` | Read-Only | Gedeelde skill library (cross-agent herbruikbaar) |

### Token Efficiency Hiërarchie

Van duurste naar goedkoopste per use:

1. **CLAUDE.md** — Altijd geladen, hoge impact → kort en scherp houden
2. **Rules** — Conditioneel geladen → alleen activeren bij matching paths
3. **MCP definitions** — Altijd geladen → Tool Search (lazy loading) boven 10% context
4. **Skills** — On-demand → metadata ~100 tokens, content <5K bij activatie
5. **Subagents** — Eigen window → geen impact op parent
6. **Hooks** — Zero tokens → shell executie buiten context window

---

## D-025 Details: Multi-Layered Engineering Model

> **Kernidee**: Open-Agents is niet één laag engineering. Het zijn drie lagen die elk apart geoptimaliseerd worden. De combinatie levert output van een fundamenteel hoger niveau.

```
┌─────────────────────────────────────────────────────────┐
│ Laag 3: WORKSPACE / CONTEXT ENGINEERING                 │
│ Hoe denkt elke agent? (6-layer stack per Docker)        │
│ → CLAUDE.md, skills, rules, MCP, hooks per agent        │
│ → Optimaliseer context voor maximale kwaliteit           │
├─────────────────────────────────────────────────────────┤
│ Laag 2: AGENT IDENTITEIT                                │
│ Wat is elke entiteit? (SDK taxonomy, D-023)             │
│ → Agent, Subagent, Teammate, Skill                      │
│ → Bepaalt: eigen context? autonomie? tools? messaging?  │
├─────────────────────────────────────────────────────────┤
│ Laag 1: ORCHESTRATIE (Canvas)                           │
│ Wie doet wat? (visueel)                                 │
│ → Flow (pipeline), Pool (dispatcher), Combinatie        │
│ → Canvas → JSON config → runtime execution              │
└─────────────────────────────────────────────────────────┘
```

| Laag | Vraag | Optimalisatie | Verantwoordelijk |
|------|-------|--------------|-----------------|
| 1. Orchestratie | WIE doet wat, in welke volgorde? | Flow/pool patronen, routing rules | Canvas editor (gebruiker) |
| 2. Agent Identiteit | WAT is elke entiteit, welke capabilities? | Type keuze (D-023), tools, model, permissies | Agent configuratie (Factory) |
| 3. Workspace/Context | HOE denkt elke agent, welke kennis? | 6-layer stack (D-024), skills, CLAUDE.md | Workspace engineering (per agent) |

> **Kracht**: Door alle drie de lagen te optimaliseren — niet alleen de orchestratie — krijg je output van een fundamenteel hoger niveau. Context engineering op agent-niveau is het verschil tussen een agent die "werkt" en een agent die "excelleert".

> **Referentie**: Het 6-layer stack model komt uit de `Claude_Workspace_Development_Workflows` repository (17 modules, 68 ontwikkelsessies geanalyseerd). Daar is aangetoond dat research-first workspace optimalisatie leidt tot 87% one-shot success rates.

---

## D-029 Details: White-Label Theming Architectuur

> **Kernvraag**: Hoe leggen we huisstijl vast zonder het statisch in te bakken? Andere bedrijven moeten hun branding kunnen inwisselen.

### Architectuur: Twee Lagen

```
┌─────────────────────────────────────────┐
│ index.css                               │
│                                         │
│  @theme {                               │
│    --color-surface-base: var(--oa-...); │  ← Tailwind utilities genereren
│    --color-accent-primary: var(--oa-...)│     (bg-surface-base, etc.)
│    --font-sans: var(--oa-font-sans);    │
│  }                                      │
├─────────────────────────────────────────┤
│ themes/impertio.css (swappable)         │
│                                         │
│  :root {                                │
│    --oa-surface-base: #0a0a0a;          │  ← Branding waarden
│    --oa-accent-primary: #ff6b00;        │
│    --oa-font-sans: 'Montserrat', ...;   │
│  }                                      │
└─────────────────────────────────────────┘
```

### Semantic Token Systeem

| Categorie | Tokens | Voorbeeld Impertio |
|-----------|--------|-------------------|
| Surface | `surface-base`, `surface-raised`, `surface-overlay`, `surface-input` | #0a0a0a, #1a1a1a, #2d2d2d, #0a0a0a |
| Border | `border-default`, `border-subtle`, `border-focus` | #404040, #333333, #ff6b00 |
| Text | `text-primary`, `text-secondary`, `text-tertiary`, `text-muted` | #ffffff, #b3b3b3, #8a8a8a, #666666 |
| Accent | `accent-primary`, `accent-primary-hover`, `accent-secondary`, `accent-code` | #ff6b00, #ff8c00, #00ff88, #00cc6a |
| Typography | `font-sans`, `font-mono` | Montserrat, JetBrains Mono |

### White-Label Procedure

1. Kopieer `themes/impertio.css` → `themes/my-brand.css`
2. Vervang alle `--oa-*` waarden met eigen branding
3. Wijzig `@import` in `index.css` naar nieuw bestand
4. Geen component code wijzigen nodig

### Wat NIET in het themasysteem zit

- **Model badge kleuren** (emerald, blue, purple, teal, orange): semantisch per model, niet per brand
- **React Flow dark mode**: eigen theming via `colorMode="dark"`
- **Layout/spacing**: vaste UX, niet per brand aanpasbaar

---

## Decision Template

```markdown
| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-XXX | [Wat moet besloten worden?] | [Waarom is dit relevant?] | A) ... B) ... | Open |
```

Bij het nemen van een beslissing, verplaats naar "Genomen" met rationale en datum.

---

*Laatste update: 2026-03-02*
