# SOURCES.md - Open-Agents Bronnenregister

> **Versie**: 1.1
> **Datum**: 2026-03-02
> **Project**: Open-Agents (OpenAEC Foundation)
> **Doel**: Overzicht van alle externe bronnen, platforms, referentieprojecten en inspiratie

---

## 1. Platforms & Frameworks

| Bron | Type | Licentie | Beschrijving |
|------|------|----------|--------------|
| [Pi.dev](https://pi.dev/) | Platform | MIT | Coding agent platform door Mario Zechner. Extensible via TypeScript, jiti runtime (geen build step). Toekomstige complementaire runtime via AgentRuntime adapter (D-002, D-015). Niet in PoC scope (D-009). |
| [pi-mono](https://github.com/badlogic/pi-mono) | Monorepo | MIT | Pi monorepo met 7 packages: `pi-ai` (unified LLM API), `pi-agent-core` (embeddable agent runtime), `pi-coding-agent` (CLI + SDK + extension host), `pi-tui` (terminal UI), `pi-web-ui` (web components voor chat), `pi-mom` (Slack bot), `pi-pods` (vLLM op GPU pods). |
| [pi-vs-claude-code](https://github.com/disler/pi-vs-claude-code) | Referentie | -- | Referentieproject door disler dat agent teams, chains, safety patterns en 15 TypeScript extensions demonstreert. Praktijkvoorbeeld van Pi extensie-architectuur. |

---

## 2. Anthropic / Claude Documentatie

| Bron | Onderwerp | Kernpunten |
|------|-----------|------------|
| [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) | Agent SDK | `query()` functie, subagent spawning, session management (resume/fork), hooks (PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd), MCP server integratie, permission modes, Python + TypeScript SDKs. |
| [**Agent Teams**](https://code.claude.com/docs/en/agent-teams) | **Agent Teams (KERN)** | **Experimentele multi-session orchestratie.** Team lead coördineert teammates (elk eigen context window). Shared task list met self-claiming, inter-agent messaging (direct + broadcast), plan approval workflow, hooks (`TeammateIdle`, `TaskCompleted`), display modes (in-process/split-pane). Architectuur: team lead + teammates + shared task list + mailbox. Verschil met subagents: subagents rapporteren alleen terug, teammates communiceren onderling. **Dit is exact wat Open-Agents visueel moet maken.** |
| [Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | Skills | Progressieve 3-level loading (metadata ~100 tokens, instructions <5K tokens, resources unlimited), YAML frontmatter, custom upload via `/v1/skills` API. |
| [Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) | Context | 200K standaard, 1M beta (tier 4+), server-side compaction, context awareness (token budget updates), prijsverhoging boven 200K. |

---

## 3. OpenAEC Foundation (eigen organisatie)

| Repository | Zichtbaarheid | Beschrijving |
|------------|---------------|--------------|
| [OpenAEC-Foundation repos](https://github.com/orgs/OpenAEC-Foundation/repositories) | Overzicht | 36 repos totaal (4 private, 32 public). |
| `OpenAEC-Foundation/Open-Agents` | Private | **Dit project.** Open-source agentic coding platform met ERPNext agents en smart context layer. |
| `OpenAEC-Foundation/Impertio-AI-Ecosystem-Deployment` | Private | Methodologieen, deployment scripts, MCP configs, Claude skills, lessons learned. Template-bron voor alle projecten. |
| `OpenAEC-Foundation/ERPNext_Anthropic_Claude_Development_Skill_Package` | Public | 28 productie Claude skills voor ERPNext/Frappe (`agents/`, `core/`, `impl/`, `errors/`, `syntax/`). 20 stars. Direct herbruikbaar als snippet-basis. |
| `OpenAEC-Foundation/erpnext-departments` | Private | ERPNext department development. Testbed voor agent-gestuurde ERPNext workflows. |
| `OpenAEC-Foundation/ERPNext-Salary-Administration-NL` | Private | Nederlandse salarisadministratie met MCP Claude integratie. Voorbeeld van domein-specifieke agent toepassing. |
| `OpenAEC-Foundation/nextcloud-talk-erp-next-bot` | Public | Dockerized bot die Nextcloud Talk met ERPNext verbindt. Referentie voor chat-naar-ERP integratie. |
| `OpenAEC-Foundation/open-2d-studio` | Public | TypeScript 2D drawing studio met extensie-systeem. Potentieel herbruikbare patronen voor plugin-architectuur. |

---

## 4. Gerelateerde Werkmap

| Locatie | Beschrijving |
|---------|--------------|
| `C:\Users\Freek Heijting\Documents\GitHub\Claude_Workspace_Development_Workflows` | **KERN** — 6-Layer Stack model, workspace engineering patterns, agent context optimalisatie. |

Deze werkmap bevat 17 gespecialiseerde workflow-modules (Hooks, MCP, Skills, Subagents, Workspace Builder, etc.) en een uitgebreide research-bibliotheek met 20+ analyse-documenten over workspace-orkestratie, multi-model patronen (Opus/Sonnet/Haiku routing), token efficiency en skill-architectuur.

**Directe impact op Open-Agents (D-024, D-025):**

- **6-Layer Stack**: CLAUDE.md → Rules → Skills → MCP → Subagents → Hooks. Dit is het model dat elke agent-workspace in Open-Agents volgt (zie FR-21).
- **Token Efficiency Hiërarchie**: Van duurste (CLAUDE.md, altijd geladen) naar goedkoopste (hooks, zero tokens). Bepaalt hoe we agent-workspaces samenstellen.
- **Progressive Skill Loading**: 3 niveaus (metadata ~100 tokens, instructies <5K, resources onbeperkt). Essentieel voor schaalbare agent context.
- **Research-first Methodologie**: 87% one-shot success rate aangetoond in 68 ontwikkelsessies. Onderbouwt Principle 12 (meerlaagse engineering).
- **Kloon-klare Workspace Repos**: Template-structuur per domein (CLAUDE.md + skills + rules + MCP + hooks). Direct herbruikbaar als agent-workspace templates.
- **Workspace-als-eenheid**: Elke workspace is een complete, geïsoleerde context-omgeving. Vertaalt naar Docker containers per agent (D-101, D-024).

---

## 5. Vergelijkbare Platforms (inspiratie)

| Platform | Frontend | Licentie | Beschrijving |
|----------|----------|----------|--------------|
| [Langflow](https://github.com/langflow-ai/langflow) | React + React Flow | MIT | Visuele LangChain builder met Python backend. Referentie voor node-based agent compositie. |
| [Flowise](https://github.com/FlowiseAI/Flowise) | React | MIT | No-code LLM flow builder met Node.js backend. Lage instapdrempel voor visuele workflows. |
| [Dify](https://github.com/langgenius/dify) | Next.js (React) | Apache 2.0 | Productie LLM platform met visuele workflows, RAG, en agent tooling. Meest complete referentie. |
| [n8n](https://github.com/n8n-io/n8n) | Vue.js | Fair-code | Workflow automation met 400+ integraties. Inspiratie voor connector-architectuur. |
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | Vue.js | GPL-3.0 | Visuele node-based workflow (Stable Diffusion). Niet LLM-gericht maar inspirerend UI-paradigma voor node editors. |
| [CrewAI](https://github.com/crewAIInc/crewAI) | -- (code-first) | MIT | Python multi-agent framework. Geen ingebouwde GUI. Referentie voor agent role-definitie en task delegation. |

### Visuele Diagramming Tools

| Platform | Frontend | Licentie | Beschrijving |
|----------|----------|----------|--------------|
| [draw.io / diagrams.net](https://github.com/jgraph/drawio-desktop) | mxGraph (JS) | Apache 2.0 | Open-source diagramming tool met desktop app (Electron) en VS Code extensie. Referentie voor complexe visuele editors in desktop + VS Code context. |

---

## 6. Visuele Editor Libraries

| Library | Stars | Licentie | Beschrijving |
|---------|-------|----------|--------------|
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | 35k+ | MIT | Marktleider voor node-based editors. Gebruikt door Langflow en vele anderen. |
| [Vue Flow](https://github.com/bcakmakoglu/vue-flow) | -- | MIT | Vue 3 port van React Flow. Native fit voor Frappe (ook Vue-gebaseerd). |
| [Rete.js](https://github.com/retejs/rete) | -- | MIT | Framework-agnostisch. Ingebouwde execution engine voor dataflow + control flow. |

---

## 7. Gekozen Tech Stack (D-006 t/m D-015)

| Technologie | Versie | Rol | Beslissing |
|------------|--------|-----|------------|
| [@xyflow/react](https://www.npmjs.com/package/@xyflow/react) (React Flow v12) | 12.10.1 | Canvas editor | D-006 |
| [React 19](https://react.dev/) | 19.x | Frontend framework | D-006 |
| [Tailwind CSS 4](https://tailwindcss.com/) | 4.x | Styling | D-006 |
| [shadcn/ui](https://ui.shadcn.com/) | -- | UI components | D-006 |
| [Fastify](https://fastify.dev/) | 5.x | Backend framework | D-007 |
| [pnpm](https://pnpm.io/) | 9.x | Package manager (workspaces) | D-008 |
| [@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) | 0.2.63 | Agent runtime (PoC) | D-009 |
| [Vite](https://vite.dev/) | 6.x | Frontend build tool | D-006 |
| [Vitest](https://vitest.dev/) | -- | Test framework | D-015 (Fase 1.2a) |
| [Pino](https://getpino.io/) | -- | Structured logging | D-015 (Fase 1.2a) |
| [tmux](https://github.com/tmux/tmux) | -- | Terminal multiplexer | Kern van oa-cli agent orchestratie. Elke agent draait in eigen tmux window binnen de `oa` session. |
| [Textual](https://github.com/Textualize/textual) | -- | Python TUI framework | Gebruikt voor `oa dashboard` — de interactieve terminal UI. |
| [Rich](https://github.com/Textualize/rich) | -- | Rich text rendering | Gebruikt voor `oa status` en alle CLI output formatting. |
| [Typer](https://github.com/tiangolo/typer) | -- | CLI framework | Basis voor alle `oa` CLI commands. |
| [LiteLLM](https://github.com/BerriAI/litellm) | -- | MIT | Multi-provider LLM gateway. OpenAI-compatible endpoint die routeert naar 100+ providers. Kandidaat voor LocalLLM routing (LOCAL-LLM-INTEGRATION.md Fase 3). |
| [vLLM](https://github.com/vllm-project/vllm) | -- | Apache 2.0 | High-throughput inference server voor grote lokale modellen (19x Ollama bij concurrency). Kandidaat als lokale inference backend. |
| [LocalAI](https://github.com/mudler/LocalAI) | -- | MIT | Drop-in OpenAI replacement met MCP support. Universele lokale inference backend. |

> **Let op**: De Claude Agent SDK package is hernoemd van `@anthropic-ai/claude-code` naar
> `@anthropic-ai/claude-agent-sdk`. De V2 session API gebruikt `unstable_v2_*` prefix
> en is nog niet stabiel. Zie D-015 voor de mitigatiestrategie (runtime adapter).

---

## 8. Key Research Inzichten

Onderstaande inzichten komen voort uit het analyseren van bovenstaande bronnen en bepalen de architectuurrichting van Open-Agents.

### Runtime & Embedding

- **Pi `pi-agent-core` is embeddable als agent runtime** -- geen CLI nodig, direct integreerbaar als library in eigen applicatie.
- **Pi `pi-web-ui` heeft kant-en-klare web components** voor chat interfaces, herbruikbaar zonder eigen UI te bouwen.

### Claude Agent SDK Mapping

- **`query()` met `agents:{}` map = directe mapping van canvas nodes naar agent definities.** Elk visueel node in een canvas editor kan 1:1 vertaald worden naar een AgentDefinition.
- **Canvas node naar AgentDefinition**: elk visueel node mapt naar `{description, prompt, tools}`.
- **Skills naar "capability marketplace"**: sleep skills op agent nodes in de visuele builder. Progressieve loading voorkomt token overhead bij grote snippet libraries.
- **MCP servers naar "connector nodes"**: speciaal node type voor externe systeemverbindingen (ERPNext, Nextcloud, databases).

### Agent Teams → Canvas Mapping (KERN)

- **Agent Teams = native bevestiging van ons concept.** Claude Code heeft nu zelf multi-agent orchestratie met team lead, teammates, shared task list en mailbox. Open-Agents maakt dit visueel en toegankelijk.
- **Team lead → Orchestrator node op canvas.** De lead coördineert, assignt taken, synthestiseert resultaten. In onze UI is dit het centrale dispatcher-blok.
- **Teammates → Agent nodes op canvas.** Elk teammate is een volledige Claude Code sessie met eigen context window. In onze canvas zijn dit de individuele agent-blokken.
- **Shared task list → Flow/Pool edges op canvas.** Task dependencies worden visueel als verbindingslijnen. Self-claiming = Pool pattern. Sequentiële dependencies = Flow pattern.
- **Mailbox (message/broadcast) → Inter-agent messaging edges.** Directe communicatie tussen agents wordt visueel als verbindingslijnen met message-indicatoren.
- **Plan approval workflow → Visuele gate nodes.** Teammates plannen eerst, lead keurt goed. In onze UI: review/approval stap als apart blok in de flow.
- **Hooks (`TeammateIdle`, `TaskCompleted`) → Event triggers op canvas.** Quality gates als visuele checkpoints op edges.
- **Subagents vs Agent Teams = twee orchestratieniveaus.** Subagents voor fire-and-forget (rapport terug), Teams voor collaboratief werk (onderling communiceren). Open-Agents moet beide visueel ondersteunen.

### Context & Session Management

- **Claude Skills progressieve loading = grote snippet library zonder token overhead.** Drie niveaus (metadata, instructions, resources) zorgen dat alleen relevante kennis geladen wordt.
- **Claude hooks (PreToolUse, PostToolUse, Stop) = audit trail zonder agent logica aan te raken.** Monitoring en logging als orthogonale concern.
- **Session management (resume, fork) = "run history" en "branching" in UI.** Gebruikers kunnen eerdere runs hervatten of vertakken voor experimenten.
- **Context awareness in Sonnet 4.6 = native "context meter" per agent node.** Het model rapporteert zelf zijn tokengebruik, bruikbaar als visuele indicator.

---

## 9. Marktvalidatie & Landscape Update (2026-03-02)

> Bron: platform beoordeling sessie — web research naar huidige staat agentic platforms.

### Platform Acquisities & Validatie

| Platform | Gebeurtenis | Betekenis voor Open-Agents |
|----------|-------------|---------------------------|
| **Langflow** → DataStax → **IBM** | IBM koopt DataStax (dat Langflow bezit). Wordt onderdeel van IBM watsonx. 100K+ GitHub stars. | Visuele agent builders zijn enterprise-validated. Acquisitieprijs bevestigt marktwaarde. |
| **Flowise** → **Workday** (aug 2025) | Enterprise HR/Finance gigant koopt visuele agent builder. | Tweede grote acquisitie bevestigt: canvas-based agent platforms zijn gewild. |
| **n8n** | 200K+ community, 5.815 AI workflow templates, 400+ nodes. Positioneert zich als THE AI agent workflow platform. | Sterkste community-gedreven concurrent. Hybride: visueel + code escape hatches. |
| **Dify** | 180K+ developers, 59K+ end users. Self-hostable in 30 min. Human-in-the-loop node, async execution engine. | Meest complete open-source concurrent. Self-hosted model vergelijkbaar met onze visie. |
| **OpenAI** | Lanceerde eigen visuele agent builder in 2026. Agents SDK vervangt Swarm (nu alleen educational). | Zelfs OpenAI ziet waarde in visuele constructie. Agents SDK: handoffs, guardrails, MCP support. |
| **Google** | ADK v1.0.0 GA + Visual Builder + A2A protocol (agent-to-agent communicatie) | A2A complementeert MCP: MCP=tools, A2A=agent-agent. Nieuwe standaard om te volgen. |

### Docker Sandboxes (Nieuw Product)

Docker lanceerde "Sandboxes" specifiek voor AI agents:
- Draait op dedicated **microVMs**, niet standaard containers
- Elke sandbox krijgt eigen VM met **private Docker daemon**
- Claude Code is een van de eerste ondersteunde agents
- Relevant voor D-101 (Docker per agent) en D-040 (autonomous-first)

### Productie-Realiteit: Wat Werkt en Wat Niet

**Wat werkt in enterprise:**
- Document processing, data reconciliatie, compliance checks, invoice handling
- Coding assistance (90% van organisaties, 86% deployen agents voor productie-code)
- Data analyse en rapportage (60% adoptie)
- Interne procesautomatisering (48% adoptie)

**Drie eisen voor productie-succes:**
1. Unified context engine (alle data types in één semantische laag)
2. Semantic governor (deterministische business rules, alles auditeerbaar)
3. Active orchestrator (governed workflows met configureerbare human-in-the-loop)

**Waarom deployments falen:**
1. Context gaps — agents zien geen ongestructureerde data
2. Governance gaps — autonome acties zonder deterministische regels
3. Data silo architectuur — agents zien één systeem per keer
4. Geen audit trails
5. Pilot-to-production death valley — demos op schone data, productie op rommelige data

### "1000 Atomic Agents" — Marktperspectief

Niemand onderhoudt succesvol een library van 1000+ voorgebouwde agents. Wat wél werkt:
- **Tool libraries**: Composio 500+ tools, MCP 10.000+ servers
- **Workflow templates**: n8n 5.815 templates
- **Dynamische compositie**: LLM genereert agent config at runtime
- **Atomic Agents framework** (BrainBlend-AI): valideert de atomaire filosofie architectureel, maar bescheiden schaal

Open-Agents onderscheidt zich met D-042 (Agent Maturity Model): library begint als prompt templates en groeit naar volledige agents. Dit is uniek in de markt.

### MCP Status (maart 2026)

- 10.000+ actieve publieke MCP servers
- 97M+ maandelijkse SDK downloads (Python + TypeScript)
- Geadopteerd door: ChatGPT, Cursor, Gemini, Microsoft Copilot, VS Code
- Gedoneerd aan Agentic AI Foundation (december 2025)
- Nieuwe MCP extension: servers kunnen interactieve UI's serveren binnen chat
- Tool Search / auto-deferral bij >10% context window

---

## 10. Protocollen & Standaarden

| Protocol | Beheerder | Beschrijving |
|----------|-----------|--------------|
| [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) | Agentic AI Foundation | Standaard voor tool-connecties. 10.000+ servers, 97M+ maandelijkse SDK downloads. Geadopteerd door ChatGPT, Cursor, Gemini, VS Code. |
| [Google A2A Protocol](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) | Google | Agent-to-Agent communicatiestandaard. Complementeert MCP: MCP=tools, A2A=agent-agent. Sprint 16 evaluatie gepland. |

---

*Bronnenregister voor Open-Agents. Wordt bijgewerkt bij nieuwe inzichten of bronnen.*
