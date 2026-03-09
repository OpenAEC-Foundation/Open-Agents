# Analyse: open-agents-research-issues.md
_Datum: 2026-03-09 | Analist: research-issues agent_

## Samenvatting
Het document bevat 13 gestructureerde research-issues (#0–#12) voor de Open-Agents repository.
Elk issue heeft een vaste structuur: labels, beschrijving, achtergrond, onderzoeksvragen, deliverables en CLI-tools.
De issues bestrijken de volledige technische stack: CLI-toolchain, communicatieprotocollen, agent lifecycle, security en observability.
Het document is productierijp: issues kunnen direct worden aangemaakt op GitHub zonder verdere aanpassing.
Aanbeveling: alle 13 issues aanmaken, daarna het bronbestand archiveren.

## Relevantie voor Open-Agents
**Hoog.** De issues dekken kernproblemen die het project momenteel moet oplossen:
agent communicatie, workspace isolatie, registry/discovery, en security zijn directe blockers.
Issues #0, #1, #3, #12 zijn priority:high; de overige zijn architectureel fundament.

---

## Issues — Overzicht & Beslissing

| # | Titel | Labels | Aanmaken |
|---|-------|--------|----------|
| 0 | CLI Toolchain voor Agentic Orchestration — Overzicht & Evaluatie | research, tooling, foundation, priority:high | **Ja** |
| 1 | Inter-Agent Communication Protocol Design | research, architecture, priority:high | **Ja** |
| 2 | CLI-based Message Bus Evaluatie | research, infrastructure, tooling | **Ja** |
| 3 | Agent Registry & Discovery Mechanisme | research, architecture, priority:high | **Ja** |
| 4 | Tmux als Agent Container Runtime | research, tooling, developer-experience | **Ja** |
| 5 | Agent Workspace Templating & Isolation | research, architecture, workspace | **Ja** |
| 6 | Agent Pool Management & Scaling | research, architecture, scaling | **Ja** |
| 7 | Orchestration Task Runner Evaluatie | research, tooling, developer-experience | **Ja** |
| 8 | Emergent Agent Gedrag & Dispatcher Architectuur | research, architecture, advanced | **Ja** |
| 9 | Observability & Logging voor Multi-Agent Systemen | research, infrastructure, observability | **Ja** |
| 10 | A2A Protocol Compatibiliteit Onderzoek | research, standards, interoperability | **Ja** |
| 11 | Context Engineering voor Agent Workspaces | research, context-engineering, optimization | **Ja** |
| 12 | Security Model voor Autonome Agent Communicatie | research, security, priority:high | **Ja** |

---

## Issue Bodies (volledig, klaar voor aanmaken)

### Issue #0 — CLI Toolchain voor Agentic Orchestration
**Labels:** `research`, `tooling`, `foundation`, `priority:high`

Evalueer, documenteer en benchmark het complete landschap van CLI-gebaseerde tools die de foundation vormen voor Open Agents' orchestration-stack. Categorieën: terminal multiplexing (tmux, Zellij), shell (Zsh, Fish, Nushell), bestandsbeheer (fzf, eza, bat), zoeken (ripgrep, fd, jq), process management (PM2, Supervisord, GNU Parallel), messaging (Redis, NATS, ZeroMQ), task runners (Just, Task, Make), environment isolation (direnv, mise), monitoring (btop, lnav, watchexec), git (lazygit, gh).

**Deliverables:** Gerankte tool-lijst per categorie, installatie-script, integratie-matrix, benchmark, Getting Started guide, compatibiliteits-matrix (macOS/Ubuntu/Arch/WSL2).

---

### Issue #1 — Inter-Agent Communication Protocol Design
**Labels:** `research`, `architecture`, `priority:high`

Onderzoek en ontwerp een communicatieprotocol voor inter-agent berichtuitwisseling. Onderzoeksvragen: optimaal message format (JSON-RPC, protobuf), push vs pull, vergelijking met A2A/MCP, sync vs async, reply-chains, loop-preventie.

**Deliverables:** Protocol specificatie, vergelijkingsmatrix (A2A/MCP/custom), proof-of-concept, sequence diagrams voor directe request, broadcast en chain-of-delegation.

---

### Issue #2 — CLI-based Message Bus Evaluatie
**Labels:** `research`, `infrastructure`, `tooling`

Evalueer message bus oplossingen: Unix Named Pipes/socat, Redis pub/sub+Streams, NATS, ZeroMQ. Focus op CLI-vriendelijkheid, zero-config setup, observeerbaarheid en schaalbaarheid.

**Deliverables:** Benchmark (latency, throughput, resource), evaluatiematrix, aanbeveling voor MVP en productie, Docker-compose/shell setup script.

---

### Issue #3 — Agent Registry & Discovery Mechanisme
**Labels:** `research`, `architecture`, `priority:high`

Ontwerp een registry waarmee agents capabilities adverteren en andere agents ontdekken. Vragen: capability definitie, statisch vs dynamisch, health checks, centrale vs gedistribueerde registry, A2A Agent Card integratie, dispatcher-rol.

**Deliverables:** Agent Card schema (CLI-native), registry implementatie opties, discovery protocol, health check strategie.

---

### Issue #4 — Tmux als Agent Container Runtime
**Labels:** `research`, `tooling`, `developer-experience`

Onderzoek tmux als lightweight container runtime voor agents. Topics: declaratieve layouts (tmuxinator, tmuxp), programmatische output capture, limieten bij honderden agents, lifecycle management, dashboard concept, vergelijking met Zellij.

**Deliverables:** Session layout template (YAML), spawning script met logging, tmux vs Zellij vergelijking, dashboard concept.

---

### Issue #5 — Agent Workspace Templating & Isolation
**Labels:** `research`, `architecture`, `workspace`

Onderzoek automatisch genereren en isoleren van agent workspaces. Topics: template engines (Cookiecutter, Copier), workspace componenten, environment isolation (direnv, virtualenvs), gedeelde resources, relatie workspace↔agent templates, context-vervuiling preventie.

**Deliverables:** Workspace template specificatie, vergelijking templating tools, isolation strategie, cleanup strategie, 3 voorbeeld templates (reviewer/architect/developer).

---

### Issue #6 — Agent Pool Management & Scaling
**Labels:** `research`, `architecture`, `scaling`

Onderzoek patronen voor agent pool beheer: spawnen, schalen, load-balancen, monitoren. Topics: process managers (PM2, Supervisord, systemd), work-stealing/round-robin, statische vs dynamische pools, crash recovery, resource constraints, metrics rapportage.

**Deliverables:** Pool management architectuur, process manager vergelijking, taakverdelings-algoritme, scaling policy, monitoring dashboard concept.

---

### Issue #7 — Orchestration Task Runner Evaluatie
**Labels:** `research`, `tooling`, `developer-experience`

Evalueer task runners voor declaratieve agent workflow definitie. Topics: Just vs Task vs Make, workflow format (YAML/TOML/DSL), GNU Parallel integratie, conditionele stappen, workflow logging, integratie met message bus en registry.

**Deliverables:** Vergelijkingsmatrix, workflow definitie format, voorbeeld workflows (single/multi-agent/conditional), integratie-architectuur.

---

### Issue #8 — Emergent Agent Gedrag & Dispatcher Architectuur
**Labels:** `research`, `architecture`, `advanced`

Onderzoek intelligente dispatcher en emergent gedrag bij autonome agent samenwerking. Topics: LLM-gebaseerde routing, kosten/latency van dispatcher LLM-calls, loop-preventie, guardrails (max recursion, budget caps, approval gates), visualisatie agent-interactie, lessen uit CrewAI/AutoGen/LangGraph/OpenAI Swarm.

**Deliverables:** Dispatcher architectuur, guardrail specificatie, framework vergelijking, visualisatie concept, risk assessment.

---

### Issue #9 — Observability & Logging voor Multi-Agent Systemen
**Labels:** `research`, `infrastructure`, `observability`

Onderzoek monitoring, logging en debugging voor multi-agent systemen. Topics: conversation trace structuur, multitail vs lnav vs custom aggregatie, correlation/trace IDs, kernmetrics (uptime/response time/token usage/error rate), OpenTelemetry integratie, TUI dashboards.

**Deliverables:** Logging format specificatie, tool evaluatie, metrics definitie, TUI dashboard concept, replay/debug strategie.

---

### Issue #10 — A2A Protocol Compatibiliteit Onderzoek
**Labels:** `research`, `standards`, `interoperability`

Onderzoek haalbaarheid A2A protocol adoptie (v0.3, Linux Foundation, 150+ organisaties). Topics: A2A model vs CLI-first aanpak, compatibele laag bovenop intern protocol, overhead lokale netwerken, A2A+MCP combinatie, intern gebruik Agent Cards, security (auth, token management).

**Deliverables:** A2A gap analyse, architectuurvoorstel (native vs optionele laag), Agent Card prototype, security assessment, gefaseerde adoptie roadmap.

---

### Issue #11 — Context Engineering voor Agent Workspaces
**Labels:** `research`, `context-engineering`, `optimization`

Onderzoek efficiënt context management binnen agent workspaces. Topics: progressive disclosure/lazy loading, optimale verhouding system/skills/workspace/conversation, context scoping, global vs local settings, cumulatieve bestanden en context-vervuiling, Anthropic skills architectuur patronen.

**Deliverables:** Context budget model, scoping strategie, cleanup/rotation beleid, skill-ontwerp best practices, vergelijking global/workspace/agent niveau.

---

### Issue #12 — Security Model voor Autonome Agent Communicatie
**Labels:** `research`, `security`, `priority:high`

Ontwerp security model voor autonoom communicerende agents. Topics: prompt injection via inter-agent berichten, permissie model (capability/role-based/per-action), sandboxing en resource limieten, audit logging, human-in-the-loop approval, secrets management in multi-agent omgeving.

**Deliverables:** Threat model, permissie-model specificatie, sandboxing strategie per agent-type, audit logging specificatie, API budget management, HITL approval flow design.

---

## Aanbevolen Actie
- **Aanmaken:** Alle 13 issues direct aanmaken op GitHub (open-agents-research-issues)
- **Volgorde:** Priority:high eerst (#0, #1, #3, #12), dan rest
- **Archiveren:** Bronbestand verplaatsen naar `/raw/archive/` na aanmaken issues
