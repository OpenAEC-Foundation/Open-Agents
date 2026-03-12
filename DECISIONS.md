# Decisions - Open-Agents

> Alle open en genomen beslissingen voor dit project.
> GitHub = Single Source of Truth voor tracking (M1).

---

## Open Beslissingen

| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-077 | Open-source LLM provider beleid | Open-Agents gebruikt alleen modellen van Europese initiatieven of écht open-source/non-profit projecten. Modellen van Google (Gemma), Meta (Llama), Microsoft (Phi), Alibaba (Qwen) en DeepSeek worden **niet** gebruikt — ook niet lokaal via Ollama. Rationale: data-soevereiniteit, ethische alignment, onafhankelijkheid van US Big Tech en Chinese tech. | **Gekozen**: Mistral AI (FR) als primaire open-source LLM + OLMo (Allen Institute, non-profit) als principieel alternatief. Claude (Anthropic PBC) voor agentic werk via subscription. | Genomen — 2026-03-11 |
| D-001 | Visibility: public of private repo? | Project is nu private, plan is open-source bij stabiel MVP | A) Nu public B) Private tot MVP | Open |
| D-053 | Strategische positionering: intern productiviteitstool vs open-source product | Open-Agents is gebouwd als intern platform (Optie A) maar architectureel ontworpen om later open-source te gaan (Optie B). De keuze is nu Optie A. Overgang naar B vereist: API-key model, onboarding flow, publieke docs. | A) Intern productiviteitstool B) Open-source SaaS/product C) Dual: intern + community edition | Open — Optie A actief, pad naar B open |
| D-004 | Lokaal model voor classificatie | Ollama op Hetzner vs alleen cloud API. Context verrijkt door D-017: Haiku via API als classificator in assembly pipeline. Ollama blijft optie voor offline/self-hosted. | A) Ollama B) Haiku C) Hybrid | Open (context verrijkt) |
| D-052 | Agent Teams patronen adopteren in oa-cli | Claude Code Agent Teams (experimenteel) implementeert patterns die oa-cli mist: shared task list met file locking, inter-agent messaging (DM + broadcast), graceful shutdown protocol, task dependencies, quality hooks (TeammateIdle/TaskCompleted), team discovery via config. Zie L-022 t/m L-029. | A) Full adopt: alle 6 patterns implementeren B) Selective: alleen shared task list + messaging C) Bridge: oa-cli als wrapper rond CC Agent Teams (geen eigen implementatie) D) Wait: wachten tot Agent Teams uit experimental is | Open |
| D-076 | Hetzner GPU Server: Full AI Stack Integration | `docs/proposals/hetzner-integration-v2.md` beschrijft uitbreiding van Hetzner van SSH-tunnel naar full AI compute node: Ollama inference routing (7 modellen, RTX 4000 Ada), LiteLLM gateway, STT/TTS/OCR/embedding services, Qdrant vector search, Open WebUI. ChatPanel ondersteunt al `hetzner/*` model prefix. Type A (Claude op Hetzner), Type B (Ollama via LiteLLM), Type C (service-agents) gedefinieerd. | A) Implementeer alle 3 types (full stack) B) Alleen Type A + B (inference, geen services) C) Alleen Type B (Ollama routing, geen remote agents) D) Defer: eerst stabiliseer bestaande features | IN PROGRESS — Fase 1 actief: Claude CLI geauthenticeerd, remote-first default geïmplementeerd (D-061) |
| D-072 | Skill System: Multi-File Folder Architectuur als atomaire eenheid | Anthropic specificeert een skill als een FOLDER (niet slechts een SKILL.md bestand). Onze huidige `skill_registry.py` injecteert alleen SKILL.md content; supporting files (scripts/, references/, assets/) worden niet gerepliceerd naar agents. Blender-Bonsai skill package gebruikt 4 nesting levels, maar `_scan_skill_dir()` scant slechts 1 level diep. | A) Full folder-aware registry: kopieer hele skill-folder naar agent workspace bij resolution B) Path-reference: injecteer SKILL.md + absolute paden naar supporting files (agent laadt zelf) C) Selective copy: kopieer alleen bestanden die SKILL.md expliciet refereert | PROPOSED |

---

## Genomen Beslissingen

| # | Beslissing | Gekozen | Rationale | Datum |
|---|-----------|---------|-----------|-------|
| D-079 | Orchestrator/Worker model split | Orchestrators → Claude (subscription CLI). Workers → Hetzner Ollama (mixtral:8x7b, codestral:22b). Geen API — alles via betaalde Max-subscription in tmux/SSH. | Open-Agents omzeilt API-kosten bewust door in de CLI te blijven. Claude heeft redeneerdiepte nodig voor orchestratie; OSS-modellen op de eigen GPU zijn voldoende voor uitvoerend werk en schalen parallel zonder limieten. | 2026-03-12 |
| D-073 | `_archive/` uitsluiten van template_loader.py scans | `EXCLUDED_DIRS = {"_archive"}` in template_loader.py | Gearchiveerde templates horen niet in de actieve library, UI, of CLI. Structureel uitsluiten is schoner dan 130 JSON-patches. validate_library() biedt explicit scan inclusief archive voor CI. | 2026-03-11 |
| D-074 | Root-detectie vóór SSH-spawn in spawn_remote_agent() | SSH `id -u` check vóór spawn, RuntimeError bij UID=0 | Fail-fast is beter dan silent failure. Een duidelijke fout met fix-instructies is betere UX dan een agent die na 1s stil faalt en "done" rapporteert. | 2026-03-11 |
| D-075 | Machine-selector in SpawnForm conditioneel tonen | Verborgen als geen niet-lokale machines aanwezig | UI-features tonen zonder relevante data is rommel. Solo-devs zien een cleaner form; teams met remote servers zien de volledige selector. Data-driven UI rendering als principe. | 2026-03-11 |
| D-061 | Remote-first agent execution | Hetzner als default machine voor alle `oa run` spawns — ook claude/haiku/sonnet/opus. Lokale machine wordt NIET belast met agent processen. `--local` als opt-out. | Claude CLI al geauthenticeerd op Hetzner (freek@3bm.co.nl, Max subscription). Hetzner heeft 64GB RAM + RTX 4000 — ideaal voor parallelle agents. Lokale WSL machine vertraagt bij veel agents. | 2026-03-12 |
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
| D-030 | Zustand slice-compositie met Immer middleware | 10 slices (canvas, selection, history, ui, settings, execution, workspace, factory, safety, audit) gecomponeerd in één appStore met Immer + devtools + persist middleware | Gebaseerd op open-2d-studio patroon (19 slices). Undo/redo via Immer `produceWithPatches`/`applyPatches`. Alleen canvas state (nodes/edges) wordt getrackt in history. Max 50 entries. Vervangt 4 losse stores. | 2026-03-01 |
| D-031 | Command Registry met auto-MCP tool generatie | CommandDef met JSON Schema params, execute/undo/redo, `getMcpTools()` auto-genereert MCP tool definitions. Fundament gebouwd (CommandRegistry + 4 canvas commands + getMcpTools()). MCP auto-generatie pipeline nog niet end-to-end verbonden met VS Code extension. | Gebaseerd op open-2d-studio command patroon. Elke canvas operatie is gedocumenteerd, undoable, en programmatisch aanroepbaar. Fundament voor AI-gestuurde canvas manipulatie via MCP. | 2026-03-01 |
| D-032 | Raw fetch voor non-Claude runtime adapters | OpenAI, Mistral en Ollama adapters gebruiken raw `fetch()` zonder SDK dependencies | Geen extra dependencies nodig. Zelfde `AgentRuntime` interface als ClaudeSDKRuntime. Text-in/text-out voor PoC (geen tool use voor non-Claude). Ollama draait lokaal op configurable base URL. | 2026-03-01 |
| D-033 | Dynamic preset loading van agents/presets/*.json via backend API | GET /api/presets endpoint laadt JSON files uit agents/presets/ met in-memory caching | 10 rijke agent presets beschikbaar in repo werden genegeerd. Nu dynamisch geladen met fallback naar 4 hardcoded presets als backend onbereikbaar is. POST /api/presets/reload voor development hot-reload. | 2026-03-01 |
| D-034 | VS Code Extension architectuur | 2 packages (vscode-extension CJS/tsup + vscode-webview browser/Vite), webview direct HTTP naar backend, MCP server in extension package, geen backend auto-start | Extension host en webview hebben fundamenteel verschillende build targets. Direct HTTP simpeler dan postMessage proxy. MCP server is thin bridge naar backend REST API. | 2026-03-02 |
| D-035 | Safety rule enforcement point | execution-engine.ts VOOR runtime.execute() | Eén enforcement punt voor alle providers. Twee lagen: (1) tool filtering via resolveRules() + allowedTools, (2) bash blacklist via buildSafetyPromptBlock() system prompt injectie + scanOutputForViolations() post-hoc scanning met safety:violation SSE events en audit logging (status: blocked). RuntimeExecutionConfig draagt safetyRules mee. Soft enforcement (LLM compliance) + detectie achteraf. Hard enforcement via container isolation (D-040) gepland voor later. | 2026-03-05 |
| D-036 | Audit granularity | Step-niveau (per node in een run), niet per tool-call | Consistent across alle providers. Huidige runtime interface yieldt geen per-tool-call events. Step-level logging hergebruikt bestaande SSE event data. | 2026-03-02 |
| D-037 | Replay implementatie | Frontend-gecontroleerde playback van bestaande eventBuffers | Geen nieuwe backend infrastructuur nodig. EventBuffers Map bewaart al alle SSE events per run. Frontend fetcht via GET /api/audit/replay/:id en stept lokaal door. | 2026-03-02 |
| D-038 | User Instructions systeem | Globale instructies in `agents/USER_INSTRUCTIONS.md` worden als `<user-instructions>` prefix geïnjecteerd in alle agent system prompts bij uitvoering | Markdown met YAML frontmatter (`injectIntoExecution: true`). Backend store met file caching. API: `GET/PUT /api/instructions`, `GET /api/instructions/section/:name`. Injectie op 2 punten in execution-engine (flow + pool pattern). Frontend: UserInstructionsEditor in SettingsPage met auto-save (1.5s debounce). Bewust geen aparte shared type — backend-only parsing, frontend ziet alleen raw markdown string. | 2026-03-03 |
| D-039 | Agent library bestandsformaat: JSON | 90 atomaire agents als JSON in `agents/library/{category}/*.json`, geladen door `library-loader.ts` | JSON consistent met bestaande presets en templates (geen YAML dependency). Category afgeleid van subdirectory naam. ID prefix `lib-{category}-{filename}`. Agents krijgen `source: "library"` en `readonly: true`. Frontend toont category filter bar met count badges. Delete geblokkeerd voor readonly agents (backend 403 + frontend hide). | 2026-03-04 |
| D-040 | Agent executie-model: autonomous-first met container isolation | Agents draaien autonoom zonder permission dialogen. Veiligheid via container isolation, niet via UX gates. Geïnspireerd door Pi Dev's autonomous-first aanpak vs Claude Code's permission-gated model. Bouwt voort op D-101 (Docker per agent) en D-024 (per-agent workspace). Zie D-040 Details. | 2026-03-04 |
| D-041 | Open-VSCode-Controller als toekomstig integratiepunt | Open-VSCode-Controller biedt 40+ HTTP endpoints en 25 MCP tools voor programmatische VS Code controle (editor, terminal, files, git, debug, agent spawning). Integratie met Open-Agents zou canvas-agents in staat stellen VS Code aan te sturen. Drie opties: A) Compose (twee extensions, HTTP/MCP communicatie), B) Absorb (features overnemen in OA extension), C) Extension Pack (bundelen). Status: OPEN — beslissing uitgesteld tot Open-VSCode-Controller Phase 1-3 stabiel is. Zie docs/PARALLEL-SESSIONS.md Sessie E. | 2026-03-05 |
| D-042 | Agent Maturity Model: drielaags groeipad voor library agents | Elk agent JSON krijgt een `maturity` veld: `prompt-template`, `tool-capable`, `autonomous`. Platform gebruikt maturity voor runtime-optimalisatie. Zie D-042 Details. | Doel blijft 1000+ bouwblokken. Maturity tracking maakt het groeipad expliciet en meetbaar. Voorkomt verwarring over wat een "agent" is vs een prompt template (versterkt D-023 taxonomie). | 2026-03-05 |
| D-043 | Sprint 10 DRY-refactor strategie | Gedupliceerde code elimineren via extractie naar gedeelde utilities, niet via abstractie-lagen | Concrete extracties: SSE utilities (sse.ts), KnowledgeRegistry singleton, STATUS_COLORS constant, getNodeBorderStyle(). Minimale blast radius, maximale herbruikbaarheid. | 2026-03-05 |
| D-044 | v0.1.0 release scope | Eerste milestone: alle 10 sprints afgerond, 155 tests groen, alle packages op 0.1.0 | PoC-beperkingen geaccepteerd: geen auth (D-012), in-memory storage (D-026), beperkte non-Claude tool use (D-032). Productie-hardening uitgesteld naar v0.2.0. | 2026-03-05 |
| D-045 | oa-cli: Tmux Agentic Layer als apart Python pakket | CLI orchestrator die Claude Code sessies aanstuurt via tmux. Draait op subscription, geen API. Temp folder isolatie, CLAUDE.md als context mechanisme. | Python 3.10+, typer CLI, rich output. 9 commando's: start, run, status, dashboard, kill, collect, clean, pipeline, version. State in ~/.oa/agents.json. Workspaces in /tmp/oa-agent-*. Zie D-045 Details. | 2026-03-02 |
| D-046 | Textual TUI dashboard vervangt tmux attach | Interactieve terminal UI met Textual (≥0.80) vervangt simpele `tmux attach-session`. 60/40 split layout met DataTable + detail panel. | Auto-refresh elke 2s, live output capture via tmux capture-pane, keyboard bindings (K=Kill, C=Collect, R=Refresh, Q=Quit). Lazy import in cli.py voor snelle CLI startup. | 2026-03-02 |
| D-047 | Pipeline orchestrator: planner → subtasks → combiner | Multi-agent orchestratie als 4-fase pipeline. Planner agent splitst taak op, subtasks draaien parallel, combiner voegt samen. | Planner timeout 5min, subtasks 30min, combiner 10min. Max 10 subtasks. plan.json als tussenformaat. Custom CLAUDE.md templates per fase. Error handling: planner faalt → stop, subtask faalt → placeholder, combiner faalt → subtask outputs beschikbaar. | 2026-03-02 |
| D-048 | UI Strategie: drie interfaces, één state | Drie manieren om oa te gebruiken: CLI (terminal), TUI (Textual), React SPA (browser). Allemaal lezen/schrijven dezelfde ~/.oa/agents.json state en roepen dezelfde Python functies aan. Geen cloud, geen Claude API — alles lokaal op subscription. Tauri desktop app als toekomstige vierde optie. Zie D-048 Details. | 2026-03-02 |
| D-049 | Live Session Viewing via tmux capture-pane | Gebruikers kunnen meekijken met draaiende agents. `tmux capture-pane` vangt terminal output op. TUI toont dit in detail panel, React SPA toont het in een streaming terminal view met polling elke 1-2s. Geen WebSocket nodig voor v1 — HTTP polling volstaat. | 2026-03-02 |
| D-050 | React SPA met lokale Python bridge (geen API) | React SPA op localhost praat met een Flask bridge server die de oa-cli Python functies wrapt. Bridge serveert agent state + live tmux output. Geen cloud endpoints, geen token kosten. Bridge start via `oa web`. Later wrappable in Tauri voor native desktop. | 2026-03-02 |
| D-054 | Open-Agents bouwen als Tauri 2 desktop applicatie | React frontend (ongewijzigd) + Rust shell + Python sidecar via HTTP. Cross-platform installatie (Win/Mac/Linux/Android), native performance, kleine installer (~50MB), geen Electron overhead. Referentie: Open PDF Studio als bewezen Tauri 2 patroon. Fases: MVP (Tauri wrapper) → native integratie → auto-update → bundled Python → Android | 2026-03-08 |
| D-053 | Multi-provider auth via CLI browser login | Geen API keys in de app — elke provider heeft een CLI tool met browser-based login. Providers: Claude Code (claude login), OpenAI/Codex (codex login), Mistral CLI, Ollama (geen login). App detecteert welke CLI tools geïnstalleerd zijn, start login flow via Tauri shell plugin. | 2026-03-08 |
| D-055 | Session Persistence Architecture | Aparte session records in ~/.oa/sessions/<ts>.json, 3 shutdown modes (stop/detach/crash), tmux hook + periodic checkpoints als dual safety net | Eliminates concurrent write conflicts, crash-safe (corrupteert alleen 1 file), periodic checkpoints als primary safety (tmux hook unreliable op Windows Terminal) | 2026-03-11 |
| D-056 | Session Resume UX | Automatische resume met non-blocking banner, --fresh flag voor opt-out, 4 zichtbare config opties | Volgt patronen van tmux-continuum, Zellij en VS Code. Geen interactief menu — CLI tools blokkeren niet bij startup | 2026-03-11 |
| D-057 | Desktop + Web App Architectuur | Approach C: Web-first PWA + Desktop Wrapper | Eén React codebase (95% gedeeld) voor zowel hosted web app als desktop app (Tauri). Backend: Fastify + node-pty voor echte terminal (xterm.js). WebSocket (web) en IPC (desktop) delen dezelfde TerminalService interface. Bestaande stack (React 19, Fastify, pnpm monorepo) wordt hergebruikt. Approach A (Tauri-only) en B (Electron-only) afgewezen: geen web support. Approach D (Textual Web) afgewezen: incompatibele stacks. Approach E (ttyd) afgewezen: geen desktop. Tauri gekozen boven Electron: kleiner (10-50MB vs 150-250MB), minder RAM, Rust backend. | 2026-03-11 |
| D-058 | Terminal Emulator Stack | xterm.js + node-pty via Fastify WebSocket | xterm.js is de standaard (VS Code, Hyper, GitHub Codespaces). node-pty (Microsoft) spawnt echte shell processen. Combinatie bewezen in productie. Ondersteunt tmux, Claude Code, oa-cli, streaming AI output. | 2026-03-11 |
| D-059 | Desktop Wrapper Keuze | Tauri v2 (boven Electron) | Bundle size 10-50MB (vs Electron 150-250MB). RAM ~30MB (vs ~150MB+). Rust backend voor security en performance. Kan dezelfde React frontend laden als de web versie. | 2026-03-11 |
| D-105 | Code als deterministisch fundament, AI als intelligentielaag | Bak reproduceerbaar gedrag in code in; gebruik AI alleen voor oordeel en begrip | Code is reproduceerbaar, AI is de onvoorspelbare schakel. oa-cli bevat het altijd-werkend deterministisch fundament; agents leveren intelligentie op de juiste momenten. Elke architectuurkeuze in oa-cli toetst: kan dit deterministisch? Dan in code. Niet deterministisch? Dan AI. Zie D-105 Details. | 2026-03-11 |
| D-060 | Kernfilosofie: Recursive Agent Tree met bottom-up result propagation | Alle complexe taken worden uitgevoerd als een zelfspawnende agent-boom. Root-sessie spawnt orchestrators, die spawnen workers, die spawnen sub-workers — tot 5+ generaties diep. Werk daalt de boom in, verificatie stijgt de boom uit. Resultaten zijn pas geldig als ze alle niveaus hebben doorlopen. | Dit is de centrale metafoor van het platform: informatie duikt eerst heel diep de boom in (specialisatie, parallellisatie), wordt diep in de boom gegenereerd en geverifieerd, en stijgt dan gecheckt omhoog naar de root. Agents op hetzelfde niveau controleren elkaars werk. De eindgebruiker ziet alleen het eindresultaat dat door alle lagen is goedgekeurd. Visualisatie van deze boom is een eerste-klas UI-feature: de canvas toont de live spawning boom als interactief diagram (inspiratie: draw.io). Zie ook D-025 (Multi-Layered Engineering Model) en D-051 (AgentRecord depth/lineage). | 2026-03-12 |

---

## D-042 Details: Agent Maturity Model

> **Bron**: Platform beoordeling sessie 2026-03-05. Analyse van huidige library (90 agents) tegen D-023 taxonomie en marktpraktijk.
> **Kernvraag**: De library bevat 1015 gedefinieerde "agents" maar D-023 erkent zelf dat de meeste prompt templates zijn. Hoe maken we het groeipad expliciet?

### Drie Maturity Niveaus

| Niveau | Naam | Kenmerken | Voorbeeld | Runtime Gedrag |
|:------:|------|-----------|-----------|---------------|
| 1 | `prompt-template` | Geen tools, single-turn, tekst in → tekst uit | `summarize`, `translate`, `fix-grammar` | Eén LLM-call, goedkoopst |
| 2 | `tool-capable` | Heeft tools, maar single-purpose, beperkte autonomie | `read-file`, `search-in-files`, `find-bugs` (huidig) | LLM-call met tool use, meerdere turns mogelijk |
| 3 | `autonomous` | Volledige agent: tools + multi-turn loop + eigen beslissingen + skills | `find-bugs` (doel), `code-reviewer`, `security-auditor` | Autonome executie-loop, duurste maar krachtigste |

### Relatie met D-023 Taxonomie

| D-023 Type | Typische Maturity | Toelichting |
|------------|:-:|---|
| Skill | `prompt-template` | Deelt parent's context, geen autonomie |
| Subagent | `tool-capable` → `autonomous` | Eigen context, fire-and-forget |
| Agent (top-level) | `autonomous` | Volledige executie-loop |
| Teammate | `autonomous` | Peer-to-peer, altijd volledig autonoom |

### Implementatie

Agent JSON formaat wordt uitgebreid:
```json
{
  "name": "Summarize Text",
  "maturity": "prompt-template",
  "tools": [],
  ...
}
```

Platform kan maturity gebruiken voor:
- **Runtime optimalisatie**: prompt-template → enkele API call; autonomous → agent loop
- **Cost schatting**: maturity bepaalt geschatte turns en kosten
- **Library filtering**: gebruikers filteren op maturity niveau
- **Groeipad dashboard**: hoeveel agents zijn op welk niveau?

### Huidige Status (90 agents, schatting)

| Maturity | Aantal | % |
|----------|:------:|:-:|
| `prompt-template` | ~55 | 61% |
| `tool-capable` | ~30 | 33% |
| `autonomous` | ~5 | 6% |

> **Doel**: Alle 1000+ bouwblokken groeien naar `tool-capable` of `autonomous`. Maturity tracking maakt dit meetbaar.

---

## D-023 Details: Agent Taxonomie

> **Bron**: Anthropic Agent SDK (`@anthropic-ai/claude-agent-sdk`), Agent Teams documentatie, Skills documentatie.
> **Kernvraag**: Wanneer noemen we iets een agent? Wanneer een skill? Wat zijn de canvas block types?
> **Implementatiestatus**: Momenteel geïmplementeerd: Agent Node (`agent`), Dispatcher Node (`dispatcher`), Aggregator (`aggregator` — PoC utility type voor data-merge logica, niet in oorspronkelijke taxonomie). Teammate, Skill Badge, Connector en Gate zijn gepland voor Sprint 10 (Refactor) of een toekomstige iteratie. Zie `NodeType` in `packages/shared/src/types.ts`.

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
> **Implementatiestatus**: Nog niet gebouwd. Sprint 7 (VS Code) en 8 (Frappe) zijn voltooid maar Docker per-agent isolatie was niet in scope voor die sprints. Gepland voor een toekomstige iteratie (post-v0.1.0). Huidig PoC draait alle agents in-process op de backend, niet in Docker containers.

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
> **Implementatiestatus**: Laag 1 (Orchestratie/Canvas) is werkend (Flow pattern Sprint 3, Assembly Engine Sprint 6b). Laag 2 (Agent Identiteit) is gedeeltelijk werkend (agent + dispatcher + aggregator node types). Laag 3 (Workspace/Docker) is nog niet geïmplementeerd (gepland post-v0.1.0).

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

## D-040 Details: Autonomous-First Agent Execution

> **Kernvraag**: Hoe garanderen we veiligheid bij agent executie?
> **Twee modellen**: Permission-gated (Claude Code: vraag toestemming per tool call) vs Autonomous-first (Pi Dev: agents draaien door, isolatie biedt veiligheid).
> **Gekozen**: Autonomous-first. Geen permission dialogen. Container isolation als veiligheidsgrens.
> **Rationale**: Permission gates introduceren friction die complexe agent chains breekt. Veiligheid hoort in de architectuur, niet in de UX.

### Fundamenteel Verschil

| Aspect | Permission-gated (Claude Code) | Autonomous-first (Open-Agents) |
|--------|-------------------------------|-------------------------------|
| Veiligheid zit in | UX (approve/deny per tool call) | Architectuur (container boundary) |
| Agent autonomie | Beperkt — wacht op gebruiker | Volledig — chain loopt door |
| Friction | Hoog — constant onderbroken | Laag — resultaat achteraf reviewen |
| Blast radius bij fouten | Onbeperkt (agent draait op host) | Begrensd (alleen binnen container) |
| Geschikt voor | Developer tooling (1 agent, interactief) | Orchestratie (multi-agent flows, headless) |

### Vier Isolatie-Dimensies

Elke container wordt afgebakend op vier assen:

| Dimensie | Wat | Implementatie |
|----------|-----|---------------|
| **1. Filesystem** | Temp workspace per run, geen toegang tot host filesystem | Docker volume mount (read/write) voor workspace, read-only voor agent config. Workspace wordt weggegooid na run tenzij output expliciet gepersisteerd wordt. |
| **2. Network** | Welke APIs mag de agent aanroepen? | Network policy per container. Default: geen outbound. Whitelist per agent config (bv. alleen `api.github.com`, `openai.api.com`). |
| **3. Secrets** | API keys veilig in container zonder lekmogelijkheid | Secrets als environment variables geïnjecteerd bij container start. Niet zichtbaar in agent output. Geen shell access tot `/proc/*/environ`. Secret rotation via orchestrator. |
| **4. Resources** | CPU, memory, time caps | Docker resource limits (`--memory`, `--cpus`). Hard timeout per run (configureerbaar, default 5 min). OOM-kill als fallback. |

### Relatie met Bestaande Beslissingen

- **D-101** (Docker per agent): Bevestigd en uitgebreid. Docker is niet alleen voor schaalbaarheid maar is nu de primaire veiligheidsgrens.
- **D-024** (Per-agent workspace): Het 6-layer stack model draait nu binnen een container met strict gedefinieerde grenzen.
- **D-035** (Safety enforcement): Verschuift van tool-filtering in de execution engine naar container-level isolation. Safety rules worden container policies (network whitelist, resource limits) in plaats van tool blacklists.

### Implementatie Implicaties

1. **Execution engine** refactor: `runtime.execute()` start een container i.p.v. een in-process call
2. **Output capture**: Agent output (files, logs, artifacts) wordt uit de container gehaald na afloop
3. **Canvas UX**: Geen permission modals meer. Status indicators tonen: running → completed/failed. Review achteraf.
4. **Safety settings**: Worden container policies (network whitelist, resource limits, allowed mounts) i.p.v. tool blacklists

---

## D-043 Details: VS Code Bridge Integration (Open-VSCode-Controller → Open-Agents)

**Datum**: 2026-03-01
**Status**: Genomen
**Context**: Agents in Open-Agents draaiden alleen via API (ClaudeSDKRuntime). Voor echte filesystem-toegang en geauthenticeerde Claude Code sessies is een VS Code bridge nodig. Dit was apart ontwikkeld als `Open-VSCode-Controller`.

**Beslissing**: Open-VSCode-Controller wordt geïntegreerd in Open-Agents als `packages/vscode-bridge`. Nieuwe `ClaudeCLIRuntime` adapter verbindt via HTTP met de bridge.

**Rationale**:
- Eén monorepo, gedeelde types, één build pipeline
- Bridge is geen los product maar execution backend van Open-Agents
- `cli/claude` als model selector naast `anthropic/claude-sonnet-4-6`
- Gebruiker's Claude subscription (geen API key nodig)
- Agents zichtbaar als live terminals (transparantie)

**Impact**: Nieuwe ModelProvider `"cli"`, nieuw package `@open-agents/vscode-bridge`, Sprint 11 in MASTERPLAN.

---

## D-048 Details: UI Strategie — Drie Interfaces, Één State

> **Kernprincipe**: Alle interfaces delen dezelfde state (~/.oa/agents.json) en dezelfde Python functies. Geen duplicatie van logica.

### Architectuur

```
~/.oa/agents.json  ←── Shared State
/tmp/oa-agent-*    ←── Workspaces
tmux sessions      ←── Agent Processen
        │
        ├── CLI (oa run/status/kill/...)     ← Python direct
        ├── TUI (oa dashboard)               ← Python direct (Textual)
        ├── React SPA (oa web)               ← Python via Flask bridge
        └── Tauri Desktop (toekomst)         ← Rust → Python bridge
```

### Drie Interfaces Vergeleken

| | CLI | TUI (Textual) | React SPA |
|---|---|---|---|
| Start | `oa <command>` | `oa dashboard` | `oa web` |
| Live meekijken | `oa attach <naam>` | Detail panel (20 regels) | Terminal view (full output) |
| Agent spawnen | `oa run "<taak>"` | N-toets → dialoog | Formulier in UI |
| Pipeline | `oa pipeline "<taak>"` | P-toets → dialoog | Pipeline panel |
| Best voor | Scripting, quick actions | Monitoring, keyboard users | Visueel overzicht, browsing |

### Geen API, Geen Cloud

- **Absoluut geen Claude API** — alles draait op subscription via Claude Code CLI
- **Lokale bridge** — Flask op localhost, alleen voor React SPA ↔ Python communicatie
- **Geen externe services** — alles draait op de host machine
- **Tauri later** — dezelfde React SPA in native window, Rust backend roept `oa` CLI aan

---

## D-045 Details: oa-cli — Tmux Agentic Layer

> **Bron**: claude-code-agentic-layer.md (architectuurdocument) + open-agents-prompts.md (implementatieprompts)
> **Kernidee**: Claude Code CLI op je subscription als agent runtime, tmux als orchestratielaag, temp folders als isolatie.

### Waarom een apart Python pakket?

De bestaande Open-Agents codebase (TypeScript monorepo) is gericht op het visuele platform met React frontend en Fastify backend. De tmux agentic layer is fundamenteel anders:
- **Runtime**: Python CLI, geen webserver
- **Interface**: Terminal/tmux, niet browser
- **Kosten**: Subscription-based (geen API tokens)
- **Isolatie**: Temp folders, niet Docker (v1)

### Pakketstructuur

```
oa-cli/
├── pyproject.toml              # open-agents-cli v0.1.0
├── src/open_agents/
│   ├── __init__.py
│   ├── cli.py                  # 9 typer commando's
│   ├── orchestrator.py         # Agent lifecycle via tmux
│   ├── workspace.py            # Temp folder + CLAUDE.md builder
│   ├── state.py                # ~/.oa/agents.json CRUD
│   ├── monitor.py              # Rich status tabellen
│   ├── dashboard.py            # Textual TUI app (D-046)
│   └── pipeline.py             # Pipeline orchestrator (D-047)
```

### 9 CLI Commando's

| Commando | Functie |
|----------|---------|
| `oa start` | Start tmux session 'oa' met dashboard window |
| `oa run "<taak>"` | Spawn agent: workspace → tmux window → claude CLI |
| `oa status` | Rich tabel met alle agents |
| `oa dashboard` | Textual TUI (D-046) |
| `oa kill <naam>` | Stop agent + close tmux window |
| `oa collect <naam>` | Toon output van voltooide agent |
| `oa clean` | Ruim voltooide workspaces op |
| `oa pipeline "<taak>"` | Multi-agent pipeline (D-047) |
| `oa version` | Versie tonen |

### Relatie met bestaande codebase

De oa-cli is complementair aan het TypeScript platform:
- **Platform** (packages/*): Visueel ontwerpen van agent flows, API-based execution
- **oa-cli**: Direct terminal-based agent spawning op subscription

Toekomstige integratie: oa-cli als alternatieve execution backend voor het platform, naast ClaudeSDKRuntime en ClaudeCLIRuntime (D-043).

---

## Decision Template

```markdown
| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-XXX | [Wat moet besloten worden?] | [Waarom is dit relevant?] | A) ... B) ... | Open |
```

Bij het nemen van een beslissing, verplaats naar "Genomen" met rationale en datum.

---

*Laatste update: 2026-03-05*

| D-051 | Orchestrator-First Hierarchie: elke taak = orchestrator + worker(s) | Altijd minimaal 2 agents: 1 orchestrator (delegeert/reviewt, doet NOOIT zelf werk) + 1+ workers (voeren uit, melden via proposals). `oa delegate` als primair commando. | Losse agents (L-001, L-002) leiden tot ongecontroleerde output, gemiste QA, en context-vervuiling. Orchestrator-first dwingt structuur af: planning → delegatie → review → approve/reject. Past bij D-040 (autonomous-first) en D-047 (pipeline). | 2026-03-02 |
| D-053 | Skill-backed agent template format | JSON met skillRef, skillPackage, atomic, executionContext, modelHint velden | Elke skill mappt 1:1 naar een atomaire agent. skillRef wijst naar SKILL.md pad, modelHint bepaalt LLM tier, executionContext bepaalt runtime (blender-mcp, python-standalone). Generiek patroon voor elk domein. | 2026-03-07 |
| D-054 | Model tiering strategie | syntax/errors→haiku, impl/core→sonnet, agents→opus | Goedkoopste model dat de taak aankan. Haiku voor referentie-lookup, Sonnet voor implementatie, Opus voor orchestratie en complex redeneren. Consistent met D-017 (Haiku classificatie, Sonnet generatie). | 2026-03-07 |
| D-055 | Workspace-as-product pattern | Skill package = broncode-repo, workspace = geassembleerd eindproduct | Scheiding tussen ontwikkeling (skill package met 7-fase methodologie) en distributie (workspace met skills + MCP + CLAUDE.md + demo prompts). Toekomstig: oa workspace create --skills <package> commando. | 2026-03-07 |
| D-056 | permissions.defaultMode: bypassPermissions als workspace standaard | Standaard in .claude/settings.json | Minder interrupts, betere flow bij delegatie-heavy sessies. Veiligheid verplaatst van UX gates (D-040) naar architectuur (container isolation). Permissies blijven voor preview-modus maar niet voor production agents. | 2026-03-08 |
| D-057 | Guardian agents als reflexen — session_end en batch_complete triggers | Automatische updates van LESSONS.md, ROADMAP.md, HANDOFF.md zonder menselijke herinnering | Systeem verbetert zichzelf door reflectie op elke sessie-afsluiting en batch-voltooiing. Guardian agents (read-only access, scripted) schrijven geleerde lessen automatisch weg. Voorkomt context-verlies tussen sessies. Implementatie in oa-cli guardians.py module. | 2026-03-08 |
| D-058 | open-pdf-studio async queue pattern — toepassen op oa-cli task scheduling | Task scheduling via async queue in plaats van direct spawn | Voorkomt race conditions bij parallelle agent spawns op gedeelde resources (tmux sessions, ~/.oa/agents.json state). Inspiratie uit open-pdf-studio's async-queue patroon voor stabiel concurrent design. Toekomstige task_queue.py module in oa-cli. | 2026-03-08 |
| D-059 | Maximale delegatie als sessie-strategie — alles wat een agent kan doen, gaat naar een agent | Meta-orchestrator = strategisch brein, agents = handen. Consequent toepassen. | Schaalbare sessie-workflow: orchestrator analyseert/beslist, agents voeren uit. Voorkomt bottleneck van manual work in het hoofd van de gebruiker. Sessie focus op coördinatie, niet uitvoering. Versterkt D-047 (pipeline) en D-051 (orchestrator-first). | 2026-03-08 |
| D-060 | Nested spawning via PATH fix + CLAUDE.md instructie (niet via bridge HTTP) | PATH `/home/freek/.local/bin` in agent omgeving + expliciete CLAUDE.md instructie "gebruik Bash tool met oa run, nooit de ingebouwde Agent tool" | Bridge HTTP was overwogen als mechanisme voor nested spawning, maar PATH + CLAUDE.md is simpeler, robuuster, en minder dan 40 regels wijziging totaal. De ingebouwde Agent tool van Claude Code is invisible voor oa status. Zie L-052. | 2026-03-08 |
| D-061 | SSE streaming i.p.v. WebSocket voor live agent output | Server-Sent Events (SSE) via Flask native `stream_with_context` | WebSocket vereist extra dependencies (flask-socketio, eventlet/gevent). SSE is HTTP-native, werkt met Flask's bestaande `Response` API, geen extra packages. Voldoende voor unidirectionele output streaming (agent → frontend). Polling blijft optie voor v1, SSE als upgrade voor v2. | 2026-03-08 |
| D-062 | Inter-agent communicatie: filesystem JSON mailbox gekozen boven message bus | Filesystem-based JSON mailboxes (`~/.oa/messages/<agent>/`) gekozen als inter-agent communicatie. Antwoord op research issues #48 en #49. | A) Filesystem JSON mailbox B) Redis pub/sub C) NATS D) ZeroMQ E) Unix named pipes | Zero externe dependencies, werkt offline, debuggable met `cat`, integreert met bestaand ~/.oa/ state patroon. Redis/NATS/ZeroMQ overtollig voor lokale CLI tool zonder cloud vereisten. Geïmplementeerd in messaging.py (Sprint 17). | 2026-03-11 |
| D-063 | A2A Protocol Adoptie Strategie — Compatibiliteitslaag boven native rewrite | Optie B: `oa a2a serve` adapter die bestaande oa-cli wraps in A2A-compliant HTTP endpoints. Fase 1: read-only Agent Card (`/.well-known/agent.json`) + task state endpoint. Fase 2: inbound task delegation. Fase 3: outbound A2A client + ecosysteem integratie. Interne file-based messaging blijft ongewijzigd. | Optie A (native rewrite — te disruptief, breekt tmux model) en Optie C (uitstellen) afgewezen. Fase 1 is 2-3 dagen werk, strikt additief aan bestaande architectuur. A2A v0.3.0 heeft real adoption (LangChain, IBM, Vertex AI). Volgt hetzelfde patroon als gepland oa MCP Server (D-sprint-15). | 2026-03-11 |
| D-064 | Agent Registry Backend — File-based YAML voor MVP | `~/.oa/registry/<agent-id>.yaml` per agent als registry backend. Eén YAML-bestand per agent met Agent Card metadata. Atomaire writes via rename-atomicity. Migreerpad naar SQLite wanneer query-filtering bottleneck wordt zonder API-wijziging. | Nul extra dependencies, menselijk leesbaar en debuggable, git-trackable, naturlijke extensie van bestaand `oa status` directory-listing patroon. Redis te zwaar voor single-machine CLI tool. In-memory verliest data bij restart. | 2026-03-11 |
| D-065 | Agent Card Schema & Discovery Protocol | JSON Schema Draft-07 voor Agent Cards (`docs/schemas/agent-card.json`). Slug IDs (niet UUIDs) voor leesbaarheid en hergebruik als tmux-sessienaam. Model hint (`haiku`/`sonnet`/`opus`) losgekoppeld van exact model-ID zodat routeringslogica model-versie-agnostisch blijft. Heartbeat: 30s interval, 90s timeout voor stale detection. Discovery via YAML-filtering voor MVP. | A2A-terminologie overgenomen (`capabilities`, `skills`) maar met eigen extensies voor tmux-transport, runtime-status, en agent-hiërarchieën (parent-veld). A2A-compatibele HTTP response als optionele Fase 4. | 2026-03-11 |
| D-066 | Agent Permission Tier Model — 5-tier systeem, default Tier 1 (Worker) | Implementeer 5 permission tiers in `spawn_agent()`: Tier 0 Sandbox (read-only, no network), Tier 1 Worker (default, read/write eigen workspace), Tier 2 Builder (schrijft naar repo), Tier 3 Orchestrator (kan sub-agents spawnen), Tier 4 Guardian (schrijft alleen naar specifieke core docs). Mapping naar `permissions.deny` lists in `settings.json`. | Huidige `bypassPermissions` is MVP shortcut met breed aanvalsoppervlak. Tier systeem biedt defense-in-depth zonder infrastructuurwijzigingen. Losse agents krijgen minimale rechten; escalatie is expliciet. Versterkt D-040 (container isolation), past bij security-model research issue #59. | 2026-03-11 |
| D-067 | Credential Handling — Geen credentials in agent context | Agent prompts (CLAUDE.md, taakbeschrijvingen) mogen NOOIT credentials bevatten. Credentials worden als scoped environment variables geïnjecteerd voor de specifieke operatie die ze nodig heeft, daarna verwijderd met de workspace. Credential path blocklist in PreToolUse hook. `scrub_output()` in `oa collect` verwijdert credential patronen voor ze de orchestrator bereiken. | Elke content in CLAUDE.md is zichtbaar voor het model en kan worden geëxfiltreerd via output, messaging, of netwerk. Environment variables zijn niet direct zichtbaar voor Claude Code tools. Output scrubbing als vangnet. Zie security-model research issue #59. | 2026-03-11 |
| D-068 | Prompt Injection Bescherming — Structurele Quarantaine van Externe Content | Alle externe content (web fetches, user-provided files, inter-agent berichten) wordt gewrapped in `<UNTRUSTED_DATA>` delimiters in agent prompts. Base CLAUDE.md template krijgt expliciete injection-resistance instructies. Injectie-heuristische filtering in `messaging.py` `read_messages()`. Reviewer agent voor high-stakes pipelines (schrijven naar DECISIONS.md, LESSONS.md). | Structurele scheiding is robuuster dan model-niveau instructies alleen — het model kan worden geïnjecteerd. Twee onafhankelijke lagen: structurele quarantaine + output validatie. Geïmplementeerd in `prompt_templates.py` via `wrap_untrusted()` utility. Zie security-model research issue #59. | 2026-03-11 |
| D-069 | HITL Protocol — File-Based Approval Gate voor Risicovolle Acties | Agents schrijven pending approval requests naar `~/.oa/hitl/<agent>/<id>.json` en pauzeren executie. Orchestrator pollt `~/.oa/hitl/` en keurt goed of af. Nieuwe CLI commando's: `oa approve <id>` / `oa deny <id>`. Timeout: 10 minuten zonder goedkeuring → automatisch deny. Verplichte triggers: destructieve shell commando's, schrijven buiten workspace, toegang tot credential files, spawnen van Tier 3+ agents. | Huidige systeem heeft geen mechanisme voor menselijke interventie bij risicovolle agent-acties. File-based protocol is consistent met bestaande messaging architectuur (~/.oa/ patroon) en vereist geen nieuwe infrastructuur. Implementatie in nieuw `hitl.py` module (naar model van `messaging.py`). Zie security-model research issue #59. | 2026-03-11 |
| D-070 | Dispatcher Architectuur — `oa dispatch` als oa-cli Module met Hybride Routing | Custom `oa/dispatcher.py` module: capability-first routing op basis van tags uit template JSON, load als tiebreaker via `active_tasks` in `~/.oa/agents.json`, priority queue (`--priority [low\|normal\|high\|critical]`), guardrail pre-check voor dispatch, file lock registry (`~/.oa/file_locks.json`) voor concurrent write prevention, cycle detection via task lineage tracking. CLI: `oa dispatch "<taak>" --tags <tags> --priority <level>`. | LangGraph afgewezen: Python in-process model incompatibel met tmux subprocess agents. AutoGen GroupChat afgewezen: LLM-call per routeringsbeslissing te duur en breekt bij 6+ agents. Handmatige dispatch (huidig) is bottleneck zonder capability awareness. Custom module: nul externe dependencies, past in tmux model, deterministisch. Zie dispatcher-architecture research issue #55. | 2026-03-11 |
| D-071 | Context Engineering Strategie — Write/Select/Compress/Isolate als Standaard | System prompt ≤5K tokens (overschrijding = on-demand info die naar reference files moet). Just-in-time file reads: agent ontvangt paden, laadt content wanneer nodig. Compact bij 70% context fill (Haiku: 30K, Sonnet: 70K, Opus: 100K). ISOLATE via multi-agent architectuur: elke agent krijgt alleen zijn scope. ACE patroon voor LESSONS.md: add only, nooit wholesale replace. L-010 prompt template (absolute paden + scope + reference files + kwaliteitsregels + bronnen) als standaard ~700-1000 tokens. | O(n²) attention overhead: context rot degradeert kwaliteit voorbij effectieve werkrange. Isolatie van agents is de ISOLATE strategie als architectuurpatroon. Skills progressieve disclosure: 40+ skills bij ~4K overhead totaal mits descriptions keyword-dense zijn met "TRIGGER when:" prefix. Zie context-engineering research issue #58. | 2026-03-11 |


---

## D-052 — Context Skills: Skill Package Injection in `oa run` (2026-03-08)

**Beslissing**: `oa run` uitgebreid met `--context-skills` flag voor automatische skill-injectie in agent prompts.

**Aanleiding**: Kinetic Facade showcase (Linkedin_Showcase_Skillpackage) — agents maakten fouten die al gedocumenteerd stonden in de skill package (SNLite socket syntax, verkeerde node IDs, data nesting). Skills bestonden maar bereikten agents niet.

**Implementatie** (Open-Agents oa-cli):
- `--context-skills "id1,id2"` — comma-separated skill IDs
- `_load_skills()` — resolveert via: template JSON `skillRef` → `skill_packages` config → `.claude/skills/` cwd → `~/.claude/skills/` global
- `~/.oa/config.json`: nieuw veld `skill_packages` (lijst van absolute paden naar skill package repos)
- Library path fix: `_resolve_library_dir()` via config > `OA_AGENTS_LIBRARY` env > `parents[3]` (was `parents[4]` = fout)
- Bij `--template` met `skillRef`: auto-injectie als geen `--context-skills` opgegeven

**Bewijs**: Test-agent (claude/haiku) genereerde correcte SNLite hexagon-grid node zonder debugging op eerste poging. 27k chars context, 2 skills tegelijk.

**Impact**: Sluit de gap tussen skill packages (kennis) en agents (uitvoering). Fundamenteel voor schaalbare agent-kwaliteit.

**Config voorbeeld**:
```json
{ "skill_packages": ["/absolute/path/to/skill-package-repo"] }
```

**Gebruik**:
```bash
oa run "Schrijf SNLite node" --context-skills "sverchok-errors-common,sverchok-syntax-scripting" --model claude/sonnet --direct
oa run "" --template aec-sverchok/sv-builder --direct  # auto-injectie via skillRef
```

---

## D-072 — Skill System: Multi-File Folder Architectuur (2026-03-11)

**Status**: PROPOSED

**Context**

Anthropic's officiële skill specificatie definieert een skill als een **FOLDER** — niet slechts een enkel SKILL.md bestand. Een skill folder bevat:

```
skill-name/           ← atomaire eenheid (de folder)
├── SKILL.md          ← verplicht, case-sensitive
├── scripts/          ← optioneel: Python/Bash executables
├── references/       ← optioneel: extra documentatie
└── assets/           ← optioneel: templates, icons, fonts
```

Supporting files worden gerefereerd **vanuit** SKILL.md via progressive disclosure: de hoofdinstructies staan in SKILL.md, details staan in aparte bestanden die alleen geladen worden wanneer nodig (token-efficiënt).

**Probleem met huidige implementatie**:
1. `skill_registry.py` injecteert alleen SKILL.md content — supporting files bereiken agents niet
2. `_scan_skill_dir()` scant slechts 1 level diep — Blender-Bonsai skill package gebruikt 4 nesting levels
3. Bij skill resolution weet een agent niet dat er scripts/ of references/ bestaan
4. Skill packages (externe repos) moeten eenmalig gelinkt worden, daarna recursief gescand

**Beslissing**

Optie B: **Path-reference approach** — injecteer SKILL.md content + absolute paden naar supporting files in agent prompt. Agent laadt supporting files zelf via Read tool wanneer nodig.

Rationale boven Optie A (full copy):
- Geen workspace-bloat: grote asset-mappen worden niet blind gekopieerd
- Token-efficiënt: agent laadt alleen wat hij nodig heeft (progressive disclosure behoud)
- Consistentie: paden in SKILL.md blijven geldig (geen path-rewriting nodig)
- Simpeler implementatie: geen file-copy logica, alleen path-listing

**Implementatieplan**:

1. **`_scan_skill_dir()` uitbreiden** — recursief scannen tot 5 levels diep (dekt Blender-Bonsai + marge)
2. **Skill folder manifest genereren** — bij resolution: lijst van alle bestanden in de skill folder als context-sectie in agent prompt
3. **`--context-skills` uitbreiden** — naast SKILL.md content ook bestandslijst injecteren met absolute paden
4. **Skill packages recursief indexeren** — `~/.oa/config.json skill_packages` paden worden recursief gescand, index gecached in `~/.oa/skill_index.json`
5. **Twee skill types expliciteren** in template JSON:
   - `"invocationType": "reference"` → `user-invocable: false` (auto-loads als achtergrondkennis)
   - `"invocationType": "task"` → `disable-model-invocation: true` (user-invokes expliciet)

**Gevolgen**

- `skill_registry.py` krijgt nieuwe `scan_skill_folder()` functie die volledige folder structuur retourneert
- Agent prompts krijgen een `## Skill Supporting Files` sectie met absolute paden
- `~/.oa/skill_index.json` als gecachede index (invalidatie op mtime-wijziging)
- Blender-Bonsai en andere deep-nested skill packages werken correct zonder handmatige configuratie
- Bestaande `--context-skills` API blijft backward-compatible
- Breaking change: `_scan_skill_dir()` gedragswijziging — test op bestaande skill packages voor release

**Gerelateerd**: D-052 (skill-backed agent template), D-071 (context engineering strategie / progressive disclosure), L-010 (agent prompt best practices)

---

## D-105 Details: Code als deterministisch fundament, AI als intelligentielaag

> **Datum**: 2026-03-11
> **Status**: Genomen
> **Kernprincipe**: "Code is reproduceerbaar. AI is de onvoorspelbare schakel."

### Het inzicht

oa-cli en de agents die het orkestreert werken samen, maar ze zijn fundamenteel anders van aard. Code (oa-cli) is deterministisch: hetzelfde commando geeft altijd hetzelfde resultaat, ongeacht welke AI er draait, welk model actief is, of hoe de dag begint. AI (agents) is niet-deterministisch: twee runs met identieke input leveren verschillende output, afhankelijk van context, model-toestand en formulering.

Dit verschil stuurt ELKE architectuurkeuze in oa-cli.

### De toetsvraag

Voor elke feature geldt de expliciete vraag: **kan dit deterministisch?**

- **Ja → code.** Installeer het als gedrag dat altijd werkt. Geen agent nodig.
- **Nee → AI.** Gebruik een agent voor het oordeel, het begrip, de creativiteit.

### Concrete toepassingen

| Functie | Deterministisch (code) | Niet-deterministisch (AI) |
|---------|----------------------|--------------------------|
| PO gate | Hook installeert ALTIJD bij `oa start` | AI evalueert inhoudelijk of output voldoet |
| Core files enforcement | Staleness check draait ALTIJD | Guardian agent schrijft en verbetert inhoud |
| Session bootstrap | Protocol wordt ALTIJD uitgevoerd bij `oa start` | Agents analyseren de sessie-context |
| Agent spawning | tmux window aanmaken is ALTIJD reproduceerbaar | Agent beslist welke subtaak prioriteit heeft |
| Quality check | `.done` file aanmaken is ALTIJD deterministisch | Reviewer agent beoordeelt of output voldoet |

### Architecturele impact

Dit principe voorkomt twee architectuurfouten die zonder expliciete toetsvraag sluipen:

1. **AI waar code volstaat**: een agent spawnen voor iets wat altijd hetzelfde moet werken — traag, kostbaar, foutgevoelig.
2. **Code waar AI nodig is**: hard-coded regels voor iets wat oordeel vereist — rigide, onderhoudsgevoelig, breekt bij randgevallen.

oa-cli is bewust gebouwd als deterministisch fundament. Alle orkestratie-logica (tmux sessions, state management, agent registry, messaging bus, skill registry) zit in Python code — reproduceerbaar, testbaar, versioneerbaar. De AI-laag zit in de agents die oa-cli aanstuurt: oordeel, begrip, creativiteit op de momenten dat code tekortschiet.

### Gevolgen voor nieuwe features

- NEVER een agent spawnen voor iets dat deterministisch kan.
- ALWAYS oa-cli uitbreiden met code voor infrastructureel gedrag.
- NEVER AI-afhankelijkheid introduceren in de bootstrapping-flow van oa-cli zelf.
- ALWAYS AI inzetten voor evaluatie, validatie en inhoudelijke beoordeling.

**Gerelateerd**: D-022 (self-assembly architectuur), D-040 (autonomous-first), P-16 (Code enforceert, AI evalueert), L-076
