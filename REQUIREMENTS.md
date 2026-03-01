# Requirements - Open-Agents

> **Versie**: 0.2
> **Laatste update**: 2026-03-03
> **Status**: In ontwikkeling — status annotaties toegevoegd per FR

## Visie

Open-Agents is een **hyper session workspace builder met agentic orchestratie**. Je bouwt visueel de ideale workspace-configuratie per agent — CLAUDE.md, skills, rules, MCP servers, hooks — en orkestreert ze samen op een canvas. Zelf instellen of door AI laten genereren. Geen code nodig.

**Drie lagen in één tool (D-025):**
1. **Orchestratie** (canvas): WIE doet wat — flows, pools, routing
2. **Agent Identiteit** (SDK): WAT is elke entiteit — agent, subagent, teammate, skill
3. **Workspace Engineering** (Docker): HOE denkt de agent — 6-layer context stack per container

Het verschil met Langflow/Flowise/Dify: die doen alleen Laag 1 (orchestratie). Open-Agents optimaliseert alle drie de lagen, en maakt dat gebruiksvriendelijk via Factory, AI assistant, en self-assembly.

---

## Functionele Requirements

### FR-01: Visuele Canvas Editor

> **Status**: 80% — Canvas met drag-drop, zoom, pan, minimap, undo/redo werkt. Snap-to-grid niet geïmplementeerd.

- Drag-and-drop canvas voor agent-blokken
- Verbindingen (edges) trekken tussen blokken
- Blokken verplaatsen, groeperen, kopiëren, verwijderen
- Zoom, pan, minimap voor overzicht
- Undo/redo
- Snap-to-grid en alignment helpers

### FR-02: Agent Blokken (D-023)

> **Status**: 20% — Alleen Agent node en Dispatcher node werken. Teammate, Skill Badge, Connector, Gate niet geïmplementeerd. `NodeType` in types.ts mist 4 van 6 D-023 block types.

- **Zes canvas block types** gebaseerd op Anthropic Agent SDK taxonomie:
  - **Agent Node**: Top-level of subagent — groot blok met status indicator, systemPrompt, tools, model, skills, hooks
  - **Teammate Node**: Onafhankelijke peer — peer blok met mailbox icon, bidirectionele messaging edges
  - **Skill Badge**: Kennis/instructie — klein label/tag op een agent-blok (geen standalone blok)
  - **Connector Node**: MCP Server — klein blok met plug icon, server config, tool definitions
  - **Gate Node**: Hook/approval — diamant shape, filter condition of approval rule
  - **Dispatcher Node**: Orchestratie — groot blok met routing icon, routing rules
- Per blok configureerbaar: naam, system prompt, allowed tools, model, skills, hooks
- Custom agent types aanmaken (via Factory)
- Visuele indicatie van agent status (idle, running, done, error)
- Klein en modulair: elke agent heeft één duidelijke kleine taak
- **Lakmoestest**: als het in één LLM-call kan → het is een skill (badge), geen agent (node)

### FR-03: Orchestratie Patronen

> **Status**: 50% — Flow pattern (sequentieel) volledig werkend (Sprint 3). Pool pattern (dispatcher) en parallelle execution niet geïmplementeerd (Sprint 4).

- **Flow**: sequentiële pipeline (output A = input B)
- **Pool**: dispatcher-based (orchestrator routeert naar juiste agent)
- **Subagent**: fire-and-forget achtergrondtaken
- Patronen combineerbaar in één architectuur
- Complexiteit ontstaat door agents te verbinden, niet door individuele agents complex te maken

### FR-04: Factory Portal

> **Status**: 90% — Factory tab, 5-stap wizard, LLM-powered generatie werken. Alleen Agent asset type beschikbaar; Template, Rule, Skill marked "Coming soon".

- Dedicated tabblad/portal voor het aanmaken van assets
- Agent creation wizard (conversational + formulier)
- Ondersteuning voor meerdere asset types: agents, templates, rules, snippets
- Assets opslaan, versiebeheer, hergebruiken
- Lage drempel: ook voor niet-technische gebruikers
- Doel: 100+ agents in de library

### FR-05: Configuratie Generatie

> **Status**: 70% — Canvas exporteert JSON, import/export werkt. Geen versiebeheer of diff-view.

- Canvas → JSON configuratie export (D-010: eigen JSON schema)
- Configuratie bevat: agents, verbindingen, regels, model routing
- Import/export van configuraties (delen met team/community)
- Versioning van configuraties
- Config compatibel met meerdere runtimes via AgentRuntime interface (D-015):
  - PoC: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
  - Later: Pi agent-core als complementaire runtime (D-002)

### FR-06: Agent Runtime Integratie

> **Status**: 70% — Claude SDK runtime volledig (tool use, multi-turn, streaming). OpenAI, Mistral, Ollama zijn text-in/text-out only (D-032 PoC beperking).

- **Runtime adapter pattern** (D-015): AgentRuntime interface abstraheert runtime-specifieke details
- Claude Agent SDK (PoC runtime, D-009):
  - `query()` met `agents:{}` map
  - Session management: starten, stoppen, hervatten (V2 session API, unstable)
  - Real-time output streaming per agent node
  - `systemPrompt` per agent node
  - `tools` allowlist per agent node
- Pi agent-core (toekomstige runtime, D-002):
  - Embeddable agent runtime, multi-provider
  - Extension hooks en custom tools
- MCP server integratie voor externe systemen

### FR-07: Safety & Rules

> **Status**: 60% — SafetySettingsView met visuele rule editor werkt. Tool filtering enforced in execution engine. Bash blacklist filtering bestaat maar wordt NIET aangeroepen tijdens runtime (alleen via test API). Audit trail en run history werkend.

- Visueel safety rules definiëren (vergelijkbaar met damage-control in pi-vs-cc)
- Bash command filtering per agent
- File access restricties per agent
- Tool permissies per agent (read-only, edit, full access)
- Visuele audit trail van alle agent acties
- Run history met replay mogelijkheid

### FR-08: Templates & Presets

> **Status**: 40% — 3 flow templates, 10 agent presets. Geen marketplace, geen template customization wizard.

- Voorgebouwde architectuur templates (team, chain, reviewer, safety audit)
- Community template sharing / marketplace
- One-click deploy van templates
- Template customization wizard

### FR-09: Semantische Intelligentie

> **Status**: 25% — GeneratePanel doet single-agent NL generatie. Geen auto-architectuur generatie, geen groeiend context systeem.

- App begrijpt natural language intent van de gebruiker
- Auto-genereert agent architecturen op basis van beschrijving
- Bouwt eigen context op (weet wat de gebruiker al heeft, suggereert volgende stappen)
- Geen complexe commando's nodig voor volledige functionaliteit
- In-app user guide die contextueel meegroeit
- Slim genoeg om eigen functies te schrijven/suggereren

### FR-10: UI Skill Levels

> **Status**: 80% — 3 niveaus (beginner/intermediate/advanced) sturen UI labels en tooltips aan. Geen gedrag-gebaseerde auto-switch.

- **Beginner**: conversational interface, beschrijf wat je wilt, app bouwt het
- **Intermediate**: canvas editor, configuratie panels, drag-and-drop
- **Advanced**: raw YAML/JSON editing, custom agent code, API access
- Naadloze overgang tussen niveaus
- UI past zich aan op basis van gebruikersgedrag

### FR-11: Ingebouwde User Guide

> **Status**: 0% — Niet geïmplementeerd. Geen onboarding, contextual help, of tutorials.

- Interactieve onboarding voor Pi.dev, Claude Code Toolkit, en Open-Agents zelf
- Contextual help: uitleg verschijnt wanneer relevant
- Video/tutorial integratie
- "Explain this" functie op elk UI element
- Progressive disclosure: complexiteit tonen wanneer de gebruiker er klaar voor is

### FR-12: Workspace Selectie & Git Integratie

> **Status**: 0% — Niet geïmplementeerd. Geen workspace browser, Git integratie, of branch viewer.

- Gebruiker kan een lokale workspace (map met Git repo) openen/selecteren
- Ondersteunt `.code-workspace` bestanden (VS Code compatible)
- Agents werken binnen de geselecteerde workspace context
- Git-aware: agents zien bestanden, branches, commit history
- Workspace browser: bestandsboom zichtbaar in de app
- Meerdere workspaces tegelijk open (tabs of vensters)
- Workspace-specifieke agent configuraties (per project andere agents)
- Workspace state persistent: heropenen met laatste configuratie
- De app is een laag bovenop je bestaande workspace - raakt je bestanden niet aan tenzij een agent dat doet
- Docker containers mounten de workspace directory: agents draaien geïsoleerd maar werken alsof ze `cd [WORKSPACE] && claude` hebben gedaan
- Volume mount strategie: workspace als read/write mount, agent config als read-only mount

### FR-13: Switchable Orchestrator Context

> **Status**: 0% — Niet geïmplementeerd. Geen context selector of specialized contexts.

- Input venster waar de gebruiker praat met de orchestrator
- Context selector (dropdown/tabs) bovenaan het input venster
- Schakelbaar tussen rollen/specialisaties:
  - Neutraal (algemene orchestrator, routeert naar agents)
  - Gespecialiseerde contexten (Code Review, Security, ERPNext, etc.)
- Elke context heeft eigen system prompt, model voorkeur en kennis
- Custom contexten aanmaken via Factory
- Claude Code als onderliggende engine voor het input venster
- Sneltoetsen om snel van context te wisselen

### FR-14: API-first

> **Status**: 40% — REST API voor alle operaties. Geen OpenAPI/Swagger docs, geen authenticatie, geen webhooks.

- REST API voor alle functionaliteit die de UI biedt
- Gedocumenteerde API (OpenAPI/Swagger)
- API keys / auth voor externe toegang
- Webhook support voor integraties
- Essentieel voor Scrum iteratie en extensibility

### FR-15: Multi-Provider Model Support (D-011)

> **Status**: 70% — 4 providers werken (Anthropic, OpenAI, Mistral, Ollama). Non-Claude providers zijn text-in/text-out only, geen tool use (D-032 PoC beperking).

- Elke agent is configureerbaar met een LLM van een willekeurige provider
- Ondersteunde providers (minimaal): Anthropic (Claude), OpenAI (GPT/o-series/Codex), Mistral AI, Ollama (lokaal)
- Model is een parameter per agent in `provider/model` formaat (bv. `anthropic/claude-sonnet-4-6`, `openai/o3`, `mistral/codestral`)
- Presets/defaults per agent, maar altijd door gebruiker aanpasbaar
- API keys per provider configureerbaar in workspace settings
- Backend routeert naar de juiste provider SDK op basis van het model-prefix
- Optioneel: `maxTokens` per agent configureerbaar
- Toekomst: custom/self-hosted endpoints toevoegen (OpenAI-compatible API)

### FR-16: Knowledge Base & Snippet Engine (D-020, D-021)

> **Status**: 60% — @open-agents/knowledge package met 35 patterns, 7 principes, 13 blocks. Backend API endpoints werkend. Geen frontend Knowledge UI (geen browser, geen visualisatie).

- Gestructureerde kennisbibliotheek als apart package (`@open-agents/knowledge`)
- **Hardcoded engine logic** (TypeScript): model capability profiles (cost/speed/capabilities), tool risico-niveaus, token budget berekening, graph validatie regels
- **Extensible snippets** (Markdown met YAML frontmatter): 20 routing patterns, 7 orchestratie principes, 13 building block profiles
- Elk routing pattern bevat: naam, diagram, when-to-use, token profiel, node/edge templates
- API endpoints: `GET /api/knowledge/patterns`, `/principles`, `/blocks`
- Extensible: gebruikers kunnen eigen snippets toevoegen
- Bron: kennis geëxtraheerd uit meta-analyse van 68 ontwikkelsessies (Claude Workspace Development Workflows)

### FR-17: Self-Assembly Engine - NL naar Agent Graph (D-017, D-022)

> **Status**: 25% — GeneratePanel doet single-agent generatie via Sonnet. 5-staps pipeline (Haiku intent → TS pattern match → Sonnet graph → TS cost → TS validate) niet geïmplementeerd.

- Gebruiker beschrijft gewenste taak in natuurlijke taal
- **5-staps pipeline**:
  1. Intent classificatie (Haiku): task type, complexiteit, domein, geschat aantal agents
  2. Pattern matching (TypeScript): score-based matching van intent op routing patterns
  3. Graph generatie (Sonnet): concrete nodes met model, tools, system prompt, edges
  4. Cost estimatie (TypeScript): USD schatting per node en totaal
  5. Graph validatie (TypeScript): cycle detectie, orphan nodes, ongeldige referenties
- Resultaat verschijnt direct op canvas, volledig editeerbaar
- GenerateBar component boven het canvas voor NL input
- LLM alleen waar creativiteit nodig is; deterministische TypeScript waar betrouwbaarheid cruciaal is

### FR-18: AI Assembly Assistant - Sidebar (D-018)

> **Status**: 0% — Geen AssistantSidebar component. Geen context-aware chat, canvas sync, of suggesties.

- Chat panel naast het canvas als kennispartner bij het assembleren
- **Context-aware**: leest huidige canvas state mee bij elke interactie
- **Zes query modes**:
  - Explain: "Wat doet deze pipeline?"
  - Suggest: "Hoe verbeter ik dit?" → suggesties met one-click Apply
  - Generate: "Bouw een code review pipeline" → genereert canvas acties
  - Modify: "Verander de analyst naar Sonnet" → specifieke node wijziging
  - Cost: "Wat kost dit?" → cost estimate
  - Pattern: "Welk pattern past bij 3 reviewers?" → pattern informatie
- **Bidirectionele canvas sync**: assistant kan nodes toevoegen, wijzigen, verwijderen via CanvasAction objecten
- Context selector (neutral, code-review, security, ERPNext, custom)
- Gebruikt knowledge base (FR-16) als referentiemateriaal

### FR-19: Pattern Library Browser

> **Status**: 20% — Backend API voor patterns bestaat (GET /api/knowledge/patterns). Geen frontend pattern browser met ASCII diagrammen of drag-to-canvas.

- Visueel doorbladerbare bibliotheek van alle routing patterns uit de knowledge base
- Per pattern: naam, ASCII diagram, wanneer gebruiken, cost profiel, voorbeeld use case
- Drag-to-canvas of one-click toepassen van een pattern
- Zoeken en filteren op tags en categorieën
- Categorieën: linear, pyramid, parallel, iterative, validation, efficiency, specialist

### FR-20: Agent Taxonomie & Entiteittypes (D-023)

> **Status**: 30% — D-023 taxonomie gedocumenteerd. Type systeem heeft alleen agent/dispatcher/aggregator. Geen skill progressive loading, geen teammate messaging.

- **Vier entiteittypes** op basis van Anthropic Agent SDK, elk met eigen eigenschappen:
  - **Top-level Agent**: eigen context window, autonome executie-loop, tool use, multi-turn. Minimum: `description` + `prompt` + tools.
  - **Subagent**: eigen context window, fire-and-forget, rapporteert aan parent. Minimum: `description` + `prompt`.
  - **Teammate**: volledig onafhankelijke sessie, peer-to-peer messaging, gedeelde takenlijst. Minimum: `description` + `prompt` + `tools`.
  - **Skill**: deelt parent's context window, geen autonome executie, is kennis/instructie. Progressive loading (metadata → instructies → resources).
- Elk entiteittype heeft een eigen canvas representatie (zie FR-02)
- Agent definitie velden (configureerbaar per node):
  - Verplicht: `description`, `prompt` (system prompt)
  - Optioneel: `tools`, `model` (provider/model format, D-011), `maxTurns`, `permissionMode`, `skills`, `mcpServers`, `hooks`, `memory`, `isolation`
- **Scheidslijn agent vs prompt template**: een agent heeft een autonome executie-loop met tool use over meerdere turns. Een prompt template/skill is een single-turn LLM-call (tekst in → tekst uit, geen tools).
- AGENTS.md library (1015 definities) bevat overwegend prompt templates; bij implementatie worden ze skills of prompt templates binnen agent-workspaces. Echte agents ontstaan bij toevoegen van tools + autonome loop.

### FR-21: Per-Agent Workspace Engineering (D-024, D-025)

> **Status**: 0% — Niet geïmplementeerd. Geen Docker containers, geen 6-layer stack editor, geen CLAUDE.md/rules/skills configuratie per agent. Gepland Sprint 7-8.

- Elke agent draait in een Docker container met een geoptimaliseerde workspace
- Workspace volgt het **6-layer stack model** (uit Claude Workspace Development Workflows):
  1. **CLAUDE.md** — Agent identity, domeinkennis, conventies (altijd geladen, ~100-300 regels)
  2. **.claude/rules/** — Conditionele path-scoped regels (geladen bij matching files)
  3. **.claude/skills/** — On-demand domein-expertise, progressive loading (metadata ~100 tokens)
  4. **.mcp.json** — Externe tool connecties (altijd geladen als tool definitions)
  5. **.claude/agents/** — Subagent definities voor werk-delegatie (eigen context window)
  6. **Hooks** — Lifecycle automatisering: PreToolUse, PostToolUse, Setup (zero tokens, shell)
- **Docker volume strategie**:
  - `/workspace` (read/write): project bestanden
  - `/agent-config` (read-only): agent workspace template (CLAUDE.md, skills, etc.)
  - `/shared-skills` (read-only): gedeelde skill library
- **Multi-layered engineering** (D-025): drie optimalisatielagen:
  - Laag 1 (Orchestratie): WIE doet wat — canvas flow/pool patronen
  - Laag 2 (Agent Identiteit): WAT is elke entiteit — SDK type, tools, model, permissies
  - Laag 3 (Workspace/Context): HOE denkt de agent — 6-layer stack per Docker container
- Factory portal (FR-04) genereert workspace templates per agent type
- Token efficiency: CLAUDE.md kort houden, skills on-demand laden, hooks zero-cost

### FR-22: Library Ecosystem (D-025)

> **Status**: 10% — Library pagina toont 10 tabs. Alleen Agent library is actief (grid/lijst view, zoek/filter, drag-to-canvas). 9 andere libraries tonen "Coming soon".

- **Tien browsable libraries** georganiseerd per engineering laag (D-025):

**Laag 1 — Orchestratie (WIE doet wat):**

| # | Library | Inhoud | Bron |
|---|---------|--------|------|
| 1 | **Pattern Library** | 20+ routing patterns (Diamond, Escalation, Map-Reduce, etc.) met diagram, when-to-use, cost profiel, node/edge templates | FR-19, Knowledge Base |
| 2 | **Template Gallery** *(composiet)* | Kant-en-klare multi-agent pipelines voor specifieke use cases (code review team, security audit, data pipeline) | Combinatie van patterns + agents + skills |

**Laag 2 — Agent Identiteit (WAT is elke entiteit):**

| # | Library | Inhoud | Bron |
|---|---------|--------|------|
| 3 | **Agent Library** | Atomaire agent definities (1015+ in AGENTS.md) met description, prompt, tools, model hint | FR-20, AGENTS.md |
| 4 | **Skill Library** | On-demand kennis/instructie snippets, progressive loading (metadata → full content) | FR-21 laag 3, .claude/skills/ |
| 5 | **Model Catalog** | Provider/model profielen met cost, speed, capabilities, aanbevolen use cases | FR-16 engine, D-011 |

**Laag 3 — Workspace/Context (HOE denkt de agent):**

| # | Library | Inhoud | Bron |
|---|---------|--------|------|
| 6 | **Connector Library** | MCP server definities (GitHub, filesystem, database, API connectors) met tool definitions en risico-niveaus | FR-21 laag 4, .mcp.json |
| 7 | **Hook Library** | Herbruikbare lifecycle hooks (PreToolUse guards, PostToolUse validators, Setup scripts) | FR-21 laag 6 |
| 8 | **Rule Library** | Conditionele path-scoped regels voor agent gedrag (file conventions, code style, safety constraints) | FR-21 laag 2, .claude/rules/ |
| 9 | **Plugin Library** *(composiet)* | Bundels van skills + hooks + connectors + agents als herbruikbaar pakket | Composiet van 4+6+7+8 |
| 10 | **Workspace Template Library** *(composiet)* | Complete 6-layer workspace configuraties per agent type (CLAUDE.md + rules + skills + MCP + agents + hooks) | FR-21, composiet van alle lagen |

- Elke library heeft: zoeken, filteren op tags/categorie, preview, one-click toepassen op canvas of agent
- Drie composiet libraries (2, 9, 10) combineren assets uit atomaire libraries
- Gebruikers kunnen eigen assets toevoegen aan elke library via Factory (FR-04, FR-23)
- Community sharing: assets exporteren/importeren (JSON + Markdown)
- Versiebeheer per asset

### FR-23: LLM-Powered Asset Generation (Factory)

> **Status**: 80% — Conversational generatie, preview/edit, refinement, save to library werken voor agent assets. Niet beschikbaar voor templates, rules, skills of andere asset types.

- Factory portal (FR-04) gebruikt een LLM om nieuwe assets te genereren voor elke library uit FR-22
- **Generatie modes**:
  - **Conversational**: gebruiker beschrijft in natuurlijke taal wat ze nodig hebben, LLM genereert het asset
  - **Template-based**: gebruiker kiest een template/categorie, LLM vult de details in
  - **Refinement**: gebruiker past bestaand asset aan via chat met LLM suggesties
- **Platform-aware generatie**: LLM kent de platform regels, conventies en best practices:
  - Agent definities volgen D-023 taxonomie (agent vs skill lakmoestest)
  - Workspace templates volgen 6-layer stack model (D-024)
  - Skills volgen progressive loading formaat (metadata ~100 tokens)
  - Hooks volgen lifecycle event specificaties
  - Rules volgen path-scoped conditionele structuur
  - Patterns volgen snippet formaat met YAML frontmatter (D-020)
- **Validatie bij generatie**: elk gegenereerd asset wordt automatisch gevalideerd:
  - Structurele correctheid (vereiste velden, geldig formaat)
  - Consistentie met bestaande assets (geen duplicaten, compatibele interfaces)
  - Token efficiency check (CLAUDE.md niet te lang, skills compact)
  - Cost impact schatting bij agent/pattern assets
- **Batch generatie**: meerdere gerelateerde assets in één keer genereren (bijv. een agent + bijbehorende skills + workspace template)
- Gegenereerde assets verschijnen als draft in de library, gebruiker reviewt en publiceert

### FR-24: White-Label Theming (D-029)

> **Status**: 100% — Volledig geïmplementeerd: themes.ts, impertio.css, ThemePicker, 3 thema's (impertio, neutral, midnight), CSS custom properties met --oa-* tokens, Tailwind v4 @theme mapping.

- Alle visuele branding (kleuren, fonts, accenten) via **CSS custom properties** (`--oa-*`)
- Tailwind v4 `@theme` block mapt semantische tokens naar CSS variabelen
- **Impertio Studio B.V.** huisstijl als default thema
- **Semantic token categorieën**:
  - Surface: `surface-base`, `surface-raised`, `surface-overlay`, `surface-input`
  - Border: `border-default`, `border-subtle`, `border-focus`
  - Text: `text-primary`, `text-secondary`, `text-tertiary`, `text-muted`
  - Accent: `accent-primary`, `accent-primary-hover`, `accent-secondary`, `accent-code`
  - Typography: `font-sans`, `font-mono`
- **White-label procedure**: kopieer themabestand, pas `--oa-*` waarden aan, wijzig import in index.css
- Geen component code wijzigen nodig bij branding wissel
- Model badge kleuren (per LLM provider) blijven los van het themasysteem

---

## Niet-Functionele Requirements

### NFR-01: Deployment Targets

- Stand-alone web app (self-hosted of cloud)
- VS Code extension (webview panel, integratie met Claude Code extension)
- Frappe app (inbouwbaar in ERPNext/Frappe ecosysteem)
- Dezelfde core codebase voor alle drie de targets

### NFR-02: Performance

- Canvas responsief tot 50+ nodes
- Real-time agent status updates via streaming
- Streaming output zonder merkbare lag
- Context meter per agent node (token usage)

### NFR-03: Gebruiksvriendelijkheid

- Onboarding in < 5 minuten voor beginner niveau
- Geen code kennis vereist voor basis gebruik
- Keyboard shortcuts voor power users
- Responsive design (desktop-first, tablet-friendly)

### NFR-04: Visueel Ontwerp

- Moderne, cleane UI die niet afschrikt
- Visueel aantrekkelijk voor non-technical users
- Consistent design system via semantic token theming (FR-24, D-029)
- White-label: branding inwisselbaar zonder code wijzigingen
- Dark/light mode

### NFR-05: Architectuur

- Frontend als standalone SPA (embeddable in VS Code + Frappe)
- API-first backend
- Stateless frontend, alle state in backend/configuratie
- Docker containers voor agent isolatie (optioneel per agent)

### NFR-06: Token Cost Awareness

- Cost estimate zichtbaar bij elk canvas ontwerp (FR-17 stap 4)
- Per-node cost breakdown met model en geschatte tokens
- Model suggesties voor cost optimalisatie door AI Assistant (FR-18)
- Waarschuwingen bij dure configuraties (Opus voor eenvoudige taken, hoge fan-out)
- Confidence levels: high/medium/low afhankelijk van voorspelbaarheid

---

## Technologie Keuzes

> Zie DECISIONS.md voor de formele besluitvorming en rationale.

### Frontend Framework — **React + React Flow** (D-006)

| Optie | Pro | Con | Frappe fit | Status |
|-------|-----|-----|------------|--------|
| **React + React Flow** | **Grootste ecosysteem, 35k+ stars, gebruikt door Langflow/Flowise** | **Frappe Desk is Vue-based** | **Via standalone SPA embed** | **Gekozen (D-006)** |
| Vue + Vue Flow | Native Frappe integratie (Frappe UI = Vue) | Kleiner ecosysteem (~4k stars) | Direct in Frappe Desk | Afgevallen |
| Rete.js (framework-agnostic) | Werkt met React/Vue/Angular, eigen execution engine | Steepere learning curve, kleiner community | Via Vue renderer | Afgevallen |
| Svelte + Svelte Flow | Modern, performant, deel van xyflow monorepo | Geen Frappe fit, kleinste ecosysteem | Lastig | Afgevallen |

### Backend Framework — **Node.js + Fastify** (D-007)

| Optie | Pro | Con | Status |
|-------|-----|-----|--------|
| Python (FastAPI) | Frappe-compatible, Claude Python SDK | Twee talen (TS frontend + Python backend) | Afgevallen |
| **Node.js (Fastify)** | **Zelfde taal als frontend, Claude TS SDK** | **Geen native Frappe integratie** | **Gekozen (D-007)** |
| Frappe (Python) | Direct ERPNext integratie | Vendor lock-in voor standalone versie | Afgevallen |

### Agent Runtime — **Claude Agent SDK (PoC) + Pi agent-core (later)** (D-002, D-009)

| Optie | Pro | Con | Status |
|-------|-----|-----|--------|
| **Claude Agent SDK (TS)** | **Officieel, subagents, hooks, MCP, sessions** | **Anthropic-only** | **Gekozen voor PoC (D-009)** |
| Pi agent-core (TS) | Embeddable, MIT, multi-provider, extension hooks | Kleiner ecosysteem | **Product scope (D-002), niet PoC** |
| **Combinatie via runtime adapter** | **Best of both worlds via AgentRuntime interface** | **Meer complexiteit** | **Architectuur gekozen (D-015)** |

> **Runtime adapter strategie (D-015)**: Een `AgentRuntime` interface abstraheert
> de communicatie met agent runtimes. Voor de PoC implementeert `ClaudeSDKRuntime`
> deze interface. Later kan `PiAgentRuntime` dezelfde interface implementeren,
> waardoor Pi agent-core als complementaire runtime wordt toegevoegd zonder
> bestaande code te wijzigen.

---

*Laatste update: 2026-03-03*
