# SOURCES.md - Open-Agents Bronnenregister

> **Versie**: 1.0
> **Datum**: 2026-02-28
> **Project**: Open-Agents (OpenAEC Foundation)
> **Doel**: Overzicht van alle externe bronnen, platforms, referentieprojecten en inspiratie

---

## 1. Platforms & Frameworks

| Bron | Type | Licentie | Beschrijving |
|------|------|----------|--------------|
| [Pi.dev](https://pi.dev/) | Platform | MIT | Coding agent platform door Mario Zechner. Extensible via TypeScript, jiti runtime (geen build step). Basis voor Open-Agents Pijler 1. |
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
| `C:\Users\Freek Heijting\Documents\GitHub\Claude_Workspace_Development_Workflows` | Dynamic workspace builder concept voor Claude Code. |

Deze werkmap bevat 17 gespecialiseerde workflow-modules (Hooks, MCP, Skills, Subagents, Workspace Builder, etc.) en een uitgebreide research-bibliotheek met 20+ analyse-documenten over workspace-orkestratie, multi-model patronen (Opus/Sonnet/Haiku routing), token efficiency en skill-architectuur. Het project definieert een zes-lagen stack (CLAUDE.md, Skills, MCP, Hooks, Subagents, Commands) en evolueert van losse skill packages naar "kloon-klare workspace-repos". Dit is direct relevant voor Open-Agents omdat de smart context layer (Pijler 2) dezelfde patronen moet implementeren: progressieve kennisloading, model routing en workspace-als-eenheid.

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

## 7. Key Research Inzichten

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

*Bronnenregister voor Open-Agents. Wordt bijgewerkt bij nieuwe inzichten of bronnen.*
