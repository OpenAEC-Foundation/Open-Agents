# Open Questions - Open-Agents

> **Versie**: 0.6
> **Datum**: 2026-03-03
>
> Open-Agents is een visueel agent-orchestratieplatform waar gebruikers agent-blokken
> op een canvas slepen en verbinden. De gegenereerde configuratie stuurt agents aan
> via de Claude Agent SDK (PoC) met Pi agent-core als toekomstige complementaire
> runtime (D-002, D-009). Drie deployment targets: standalone web app,
> VS Code extension, Frappe app.

---

## Architectuur Vragen

### Nog Open

- **Hoe communiceren agents onderling?** Message bus, stdout piping, shared state? Welke combinatie past bij zowel real-time canvas feedback als headless execution? *(Deels beantwoord: Sprint 3 gebruikt prompt injection voor sequentieel, Sprint 4 voor parallel. Schaalt dit bij grote outputs? Zie MASTERPLAN Sprint 3.1)*
- **Hoe schalen we naar 50+ agents op een canvas zonder performance issues?** Virtualisatie, lazy loading, off-screen culling? *(React Flow v12 ondersteunt honderden nodes technisch, maar UX bij 50+ vereist grouping/collapsing)*
- ~~**Assembly pipeline tijdlijn**: Sprint 6b (Assembly Engine) en 6c (AI Assistant) zijn gepland maar niet gescheduled.~~ → Afgerond in Sprint 6b en 6c.
- ~~**Bash safety enforcement gap**: testCommand() in safety-store.ts werd nooit aangeroepen tijdens executie.~~ → Opgelost in Sprint 10 (D-035): bash blacklist enforcement in execution engine.
- **Memory management backend**: In-memory stores in execution-engine.ts (runs, eventBuffers, emitters, runControls) groeien onbeperkt. Elke run bewaart alle SSE events. Bij welk punt wordt dit een probleem en moeten we TTL of database-backed storage implementeren? Zie D-026.
- ~~**NodeType 'aggregator' herkomst**~~ → Beantwoord: D-023 Details in DECISIONS.md bevestigt dat `aggregator` een "PoC utility type voor data-merge logica" is, niet in de oorspronkelijke taxonomie. Vervangen door D-023 types bij refactor.

### Beantwoord (zie DECISIONS.md)

- ~~**In-process agents vs process-spawning vs containers**~~ → D-009 (Claude SDK only voor PoC), D-101 (Docker per agent), D-015 (runtime adapter)
- ~~**Config format dat naar Claude SDK en Pi kan exporteren?**~~ → D-010 (eigen JSON schema met Claude SDK mapping)
- ~~**State management bij multi-agent flows?**~~ → D-015 (runtime adapter slaat per-step output op als fallback)
- ~~**Hoe gaan we om met agent failures mid-flow?**~~ → Opgelost in Sprint 3. execution-engine.ts implementeert retry (max 3 pogingen), skip, en abort decision flow. Frontend ErrorDecisionDialog stelt de vraag aan de gebruiker. Zie D-035 voor enforcement punt.
- ~~**Permission-gated vs autonomous-first agent executie?**~~ → D-040: Autonomous-first met container isolation. Veiligheid via architectuur (4 isolatie-dimensies: filesystem, network, secrets, resources), niet via permission dialogen. Geïnspireerd door Pi Dev.

---

## Waar Verbeteren We Pi?

> Pi agent-core blijft een inspiratiebron en toekomstige complementaire runtime (D-002).
> Voor de PoC gebruiken we Claude Agent SDK (D-009). De runtime adapter (D-015)
> maakt het later toevoegen van Pi een kwestie van één nieuwe implementatie.

| # | Pi (huidige situatie) | Open-Agents (verbetering) |
|:-:|----------------------|--------------------------|
| 1 | Geen visuele orchestratie -- alles via config files en CLI | Canvas editor: drag-and-drop agent blokken, visuele verbindingen |
| 2 | Geen Factory portal -- agents aanmaken vereist handmatig config werk | Lage drempel asset creation: templates, wizards, voorbeelden |
| 3 | Vereist TypeScript kennis voor extensions en tools | Semantische interface: beschrijf wat je wilt, platform genereert config |
| 4 | Geen community marketplace -- elke gebruiker bouwt vanaf nul | Template sharing: publiceer en hergebruik agent configs en flows |
| 5 | TUI-first ontwerp -- terminal-only interactie | Web-first met moderne UI, toegankelijk voor niet-developers |
| 6 | Process spawning voor subagents -- overhead per agent | In-process agents waar mogelijk, snellere communicatie |
| 7 | Geen inter-agent message bus -- agents werken geisoleerd | Communicatiemodel: agents kunnen data uitwisselen binnen een flow |
| 8 | Geen beginner onboarding -- steile leercurve | 3 skill levels: beginner (templates), gevorderd (canvas), expert (code) |
| 9 | Geen Frappe/ERPNext integratie | Deployment target: direct inzetbaar als Frappe Desk app |
| 10 | Geen audit trail of run history | Ingebouwde run history, logging per agent node, replay mogelijkheid |

---

## Technologie Vragen

### Beantwoord (zie DECISIONS.md)

- ~~**React Flow vs Vue Flow**~~ → D-006: React + React Flow (xyflow v12)
- ~~**Mono-repo of multi-repo?**~~ → D-008: Mono-repo met pnpm workspaces
- ~~**Welke state management?**~~ → D-014 (te nemen in Sprint 1.2a). Pinia valt af door D-006 (React, niet Vue).
- ~~**Hoe embedden we de canvas UI in een VS Code webview met goede performance?**~~ → Beantwoord door Sprint 7. Oplossing: webview panel met React build (Vite), communicatie via VS Code postMessage API. Build pipeline: tsup (extension CJS) + Vite (webview). Beperkingen: webview heeft geen directe DOM-toegang, state sync loopt via extension host.
- ~~**Hoe integreren we de canvas UI in Frappe Desk zonder iframe?**~~ → Beantwoord door Sprint 8. Oplossing bleek toch iframe te zijn: canvas embedding in Frappe Desk via iframe met postMessage bridge. Frappe's routing en bundling zijn te complex voor directe SPA-integratie; iframe geeft de beste isolatie en herbruikbaarheid.

### Nog Open

*(Geen nieuwe onbeantwoorde technologie vragen na Sprint 12)*

---

## Product Vragen

- **Hoe vullen we de library met 100+ agents?** *(Deels beantwoord: AGENTS.md definieert 100 agents. Sprint 9 plant het bouwproces. Groeipad: MVP=10, Beta=25, v1.0=50, v2.0=100+)*
- **Wat is ons verdienmodel?** Open core met premium features? SaaS hosting? Templates marketplace met revenue share? *(Spanning met MIT licentie — zie PRINCIPLES.md #9)*
- **Hoe positioneren we ons t.o.v. Langflow, Flowise, Dify?** Onze differentiators: atomaire agent filosofie, VS Code embed, Frappe embed, Claude/Pi dual runtime. *(Feature matrix nog niet uitgewerkt)*
- **Wie zijn onze eerste gebruikers?** *(Voorstel: developers die AI agents bouwen voor eigen projecten. Past bij AGENTS.md library, tech stack, en het feit dat de eerste gebruiker de maker is.)*

---

## Strategische Vragen (uit platform beoordeling 2026-03-05)

- **Niche keuze / differentiatie**: Waarom Open-Agents i.p.v. Dify (180K devs), Langflow (IBM-backed, 100K stars), of n8n (200K community)? Huidige kandidaat-differentiators: (1) Laag 3 workspace engineering, (2) Claude Code native, (3) ERPNext focus. Welke kiezen we?
- **Laag 3 (D-024/D-025) realisme**: Docker workspace engineering (6-layer stack per container) is het enige dat ons echt onderscheidt van concurrenten (zij doen alleen Laag 1). Maar het is nog 0% gebouwd. Is dit haalbaar, en zo ja wanneer? Docker Sandboxes (microVMs) als mogelijke shortcut evalueren.
- **Non-Claude tool calling gap (D-032)**: 3 van 4 runtime adapters (OpenAI, Mistral, Ollama) zijn text-in/text-out only — geen tool calling. In een platform gebouwd rond agent orchestratie is dit een fundamentele beperking. OpenAI Agents SDK en Google ADK ondersteunen beide tool calling. Prioriteit voor v0.1.0?
- **Google A2A protocol**: Agent-to-Agent protocol standaardiseert agent communicatie (discovery, capabilities, interactie). Google positioneert MCP (tools) + A2A (agent-agent) als complementaire standaarden. Moeten we A2A ondersteunen naast MCP?
- **Agent Maturity Model implementatie (D-042)**: Hoe migreren we de 90 bestaande library agents naar het maturity model? Handmatig taggen of automatisch afleiden op basis van tools array?

---

## oa-cli Vragen (Sprint 12)

### Nog Open

- **Hoe integreren we de oude TypeScript packages/* met oa-cli?** Het canvas, knowledge engine, assembly pipeline etc. bevatten waardevolle elementen. Cherry-pick strategie nog niet bepaald.
- **Tauri desktop app**: Is Tauri een goede keuze voor een standalone desktop app die CLI + TUI + web UI combineert? Versus Electron? (D-048 noemt dit als toekomstige optie)
- **Pipeline afhankelijkheden**: plan.json `depends_on` wordt geparsed maar niet afgedwongen in v1. Wanneer implementeren we dependency-aware scheduling?
- **Ollama model routing**: `oa run --model ollama/qwen3:8b` werkt, maar er is geen automatische model selectie op basis van taak complexiteit. Moet dit?
- **oa-cli en packages/ convergentie**: Twee ecosystemen (Python CLI + TypeScript web platform) die dezelfde agents beheren. Wat wordt de uiteindelijke architectuur?
- **oa-cli als primaire execution layer**: Wordt oa-cli de dominante runtime en packages/* een UI-only laag? Sprint 15 plant een `OaCLIRuntime` adapter, maar de bredere architecturale richting — welk ecosysteem "wint" als primaire orchestrator — is nog niet besloten.
- ~~**Proposal-based workflow formaliseren**~~ → Beantwoord: Proposal mode is afgeschaft (L-018, L-031, sessie 2026-03-03). Agents schrijven direct. Geen `oa review` / `oa apply` meer. Principe 16 verwijderd uit PRINCIPLES.md.
- **Security bij --dangerously-skip-permissions**: Alle oa-cli agents draaien met volledige Claude permissies. Hoe beperken we blast radius zonder API-gebaseerde tool filtering? Is workspace isolatie (temp directory per agent) voldoende, of hebben we toch Docker sandboxing nodig (Sprint 13)?

---

## Vragen uit HANDOFF-2026-03-03

- **Hoe implementeren we inter-agent messaging?** Shared file? Unix socket? In-memory bus? Moet werken met tmux-geïsoleerde agents. CC Agent Teams gebruikt file-based approach. *(P0 — blokkerend)*
- **Willen we draw.io-achtige functionaliteit?** Vrije tekenfunctie, shapes, connectors? Of alleen agent nodes? React Flow kan veel maar is geen vrij tekenprogramma.
- **Hoe routeren we taken naar lokale LLM's?** Automatisch op basis van complexiteit? Of user kiest per task? Models <1B params zijn beperkt.
- **PyPI publicatie — onder welke naam?** `open-agents`? `oa-cli`? `open-agents-cli`? Check beschikbaarheid.
- **Moet de web UI standalone draaien (zonder oa-cli)?** Of altijd als onderdeel van `oa web`? Standalone = meer bereik maar meer werk.

---

## Research Nog Uit Te Voeren

- **Claude Agent SDK V2 stabiliteit**: Wanneer wordt de V2 session API (unstable_v2_*) stable? Welke breaking changes zijn gepland?
- **Pi agent-core als runtime adapter**: Hoe mapt pi-agent-core op onze AgentRuntime interface? Welke features biedt het bovenop de Claude SDK?
- **ERPNext_Anthropic_Claude_Development_Skill_Package**: bevat 28 gedefinieerde skills -- kunnen we die importeren als kant-en-klare agent templates?
- ~~**Frappe UI architecture**~~ → Beantwoord door Sprint 8: iframe met postMessage bridge. Frappe's routing en bundling zijn te complex voor directe SPA-integratie; iframe geeft de beste isolatie en herbruikbaarheid. Zie Technologie Vragen → Beantwoord.

---

*Laatste update: 2026-03-03*
