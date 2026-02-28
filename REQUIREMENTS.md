# Requirements - Open-Agents

> **Versie**: 0.1 (concept)
> **Laatste update**: 2026-02-28
> **Status**: In ontwikkeling

## Visie

Open-Agents is een visueel platform waarmee je AI agent-architecturen bouwt door blokken te slepen en te verbinden. Geen code nodig. De app genereert automatisch configuratie die AI agents (Claude, Pi, etc.) aanstuurt. Complexe prompt-engineering en context-engineering achter een simpele interface.

---

## Functionele Requirements

### FR-01: Visuele Canvas Editor

- Drag-and-drop canvas voor agent-blokken
- Verbindingen (edges) trekken tussen blokken
- Blokken verplaatsen, groeperen, kopiëren, verwijderen
- Zoom, pan, minimap voor overzicht
- Undo/redo
- Snap-to-grid en alignment helpers

### FR-02: Agent Blokken

- Voorgedefinieerde agent types (generiek, specialist, dispatcher, safety, reviewer)
- Per blok configureerbaar: naam, system prompt, allowed tools, model, skills
- Custom agent types aanmaken (via Factory)
- Visuele indicatie van agent status (idle, running, done, error)
- Klein en modulair: elke agent heeft één duidelijke kleine taak

### FR-03: Orchestratie Patronen

- **Flow**: sequentiële pipeline (output A = input B)
- **Pool**: dispatcher-based (orchestrator routeert naar juiste agent)
- **Subagent**: fire-and-forget achtergrondtaken
- Patronen combineerbaar in één architectuur
- Complexiteit ontstaat door agents te verbinden, niet door individuele agents complex te maken

### FR-04: Factory Portal

- Dedicated tabblad/portal voor het aanmaken van assets
- Agent creation wizard (conversational + formulier)
- Ondersteuning voor meerdere asset types: agents, templates, rules, snippets
- Assets opslaan, versiebeheer, hergebruiken
- Lage drempel: ook voor niet-technische gebruikers
- Doel: 100+ agents in de library

### FR-05: Configuratie Generatie

- Canvas → JSON/YAML configuratie export
- Configuratie bevat: agents, verbindingen, regels, model routing
- Import/export van configuraties (delen met team/community)
- Versioning van configuraties
- Config compatibel met Claude Agent SDK en Pi agent-core

### FR-06: Agent Runtime Integratie

- Claude Agent SDK: `query()` met `agents:{}` map
- Session management: starten, stoppen, hervatten (`--resume`)
- Real-time output streaming per agent node
- `--append-system-prompt` per agent node
- `--allowedTools` per agent node
- Pi agent-core als alternatieve/complementaire runtime
- MCP server integratie voor externe systemen

### FR-07: Safety & Rules

- Visueel safety rules definiëren (vergelijkbaar met damage-control in pi-vs-cc)
- Bash command filtering per agent
- File access restricties per agent
- Tool permissies per agent (read-only, edit, full access)
- Visuele audit trail van alle agent acties
- Run history met replay mogelijkheid

### FR-08: Templates & Presets

- Voorgebouwde architectuur templates (team, chain, reviewer, safety audit)
- Community template sharing / marketplace
- One-click deploy van templates
- Template customization wizard

### FR-09: Semantische Intelligentie

- App begrijpt natural language intent van de gebruiker
- Auto-genereert agent architecturen op basis van beschrijving
- Bouwt eigen context op (weet wat de gebruiker al heeft, suggereert volgende stappen)
- Geen complexe commando's nodig voor volledige functionaliteit
- In-app user guide die contextueel meegroeit
- Slim genoeg om eigen functies te schrijven/suggereren

### FR-10: UI Skill Levels

- **Beginner**: conversational interface, beschrijf wat je wilt, app bouwt het
- **Intermediate**: canvas editor, configuratie panels, drag-and-drop
- **Advanced**: raw YAML/JSON editing, custom agent code, API access
- Naadloze overgang tussen niveaus
- UI past zich aan op basis van gebruikersgedrag

### FR-11: Ingebouwde User Guide

- Interactieve onboarding voor Pi.dev, Claude Code Toolkit, en Open-Agents zelf
- Contextual help: uitleg verschijnt wanneer relevant
- Video/tutorial integratie
- "Explain this" functie op elk UI element
- Progressive disclosure: complexiteit tonen wanneer de gebruiker er klaar voor is

### FR-12: API-first

- REST API voor alle functionaliteit die de UI biedt
- Gedocumenteerde API (OpenAPI/Swagger)
- API keys / auth voor externe toegang
- Webhook support voor integraties
- Essentieel voor Scrum iteratie en extensibility

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
- Consistent design system
- Dark/light mode

### NFR-05: Architectuur

- Frontend als standalone SPA (embeddable in VS Code + Frappe)
- API-first backend
- Stateless frontend, alle state in backend/configuratie
- Docker containers voor agent isolatie (optioneel per agent)

---

## Technologie Opties (Open)

> Deze opties worden afgestreept naarmate beslissingen genomen worden.
> Zie DECISIONS.md voor de formele besluitvorming.

### Frontend Framework

| Optie | Pro | Con | Frappe fit | Status |
|-------|-----|-----|------------|--------|
| React + React Flow | Grootste ecosysteem, 35k+ stars, gebruikt door Langflow/Flowise | Frappe Desk is Vue-based | Via iframe of aparte SPA | Open |
| Vue + Vue Flow | Native Frappe integratie (Frappe UI = Vue) | Kleiner ecosysteem (~4k stars) | Direct in Frappe Desk | Open |
| Rete.js (framework-agnostic) | Werkt met React/Vue/Angular, eigen execution engine | Steepere learning curve, kleiner community | Via Vue renderer | Open |
| Svelte + Svelte Flow | Modern, performant, deel van xyflow monorepo | Geen Frappe fit, kleinste ecosysteem | Lastig | Open |

### Backend Framework

| Optie | Pro | Con | Status |
|-------|-----|-----|--------|
| Python (FastAPI) | Frappe-compatible, Claude Python SDK | Twee talen (TS frontend + Python backend) | Open |
| Node.js (Fastify) | Zelfde taal als frontend, Claude TS SDK | Geen native Frappe integratie | Open |
| Frappe (Python) | Direct ERPNext integratie | Vendor lock-in voor standalone versie | Open |

### Agent Runtime

| Optie | Pro | Con | Status |
|-------|-----|-----|--------|
| Claude Agent SDK (Python/TS) | Officieel, subagents, hooks, MCP, sessions | Anthropic-only | Open |
| Pi agent-core (TS) | Embeddable, MIT, multi-provider, extension hooks | Kleiner ecosysteem | Open |
| Combinatie | Best of both worlds | Meer complexiteit | Open |

---

*Laatste update: 2026-02-28*
