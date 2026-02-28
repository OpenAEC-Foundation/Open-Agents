# Open Questions - Open-Agents

> **Versie**: 0.1
> **Datum**: 2026-02-28
>
> Open-Agents is een visueel agent-orchestratieplatform waar gebruikers agent-blokken
> op een canvas slepen en verbinden. De gegenereerde configuratie stuurt Claude Code
> (via Agent SDK) en Pi agent-core aan. Drie deployment targets: standalone web app,
> VS Code extension, Frappe app.

---

## Architectuur Vragen

- **Hoe communiceren agents onderling?** Message bus, stdout piping, shared state? Welke combinatie past bij zowel real-time canvas feedback als headless execution?
- **In-process agents (pi-agent-core) vs process-spawning vs containers** -- welke mix? Wanneer kies je welk isolatieniveau?
- **Hoe handelen we state management af bij complexe multi-agent flows?** Centraal of gedistribueerd? Wat gebeurt er als een agent halverwege faalt?
- **Wat is het optimale config format dat naar zowel Claude SDK als Pi agent-core kan exporteren?** JSON, YAML, iets anders? Hoe houden we het menselijk leesbaar en machine-parseable?
- **Hoe schalen we naar 50+ agents op een canvas zonder performance issues?** Virtualisatie, lazy loading, off-screen culling?
- **Hoe gaan we om met agent failures mid-flow?** Retry, fallback, skip? Kan de gebruiker dit per connectie configureren op het canvas?

---

## Waar Verbeteren We Pi?

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

- **React Flow vs Vue Flow**: welke past beter bij onze 3 deployment targets (standalone, VS Code, Frappe)? React heeft beter VS Code webview ecosysteem, Vue past beter bij Frappe.
- **Hoe embedden we de canvas UI in een VS Code webview met goede performance?** Welke beperkingen legt de webview API op qua state, communicatie en rendering?
- **Hoe integreren we de canvas UI in Frappe Desk zonder iframe?** Frappe gebruikt eigen routing en bundling -- hoe voegen we een SPA-achtige canvas toe?
- **Welke state management past bij multi-target deployment?** Zustand (React), Pinia (Vue), Redux, of een framework-agnostisch alternatief?
- **Mono-repo of multi-repo?** Frontend, backend, VS Code extension, Frappe app -- hoe organiseren we de codebase? Welke tooling (Turborepo, Nx, pnpm workspaces)?

---

## Product Vragen

- **Hoe vullen we de library met 100+ agents?** Community-driven, zelf bouwen, of een combinatie? Wat is de minimale set voor lancering?
- **Wat is ons verdienmodel?** Open core met premium features? SaaS hosting? Templates marketplace met revenue share?
- **Hoe positioneren we ons t.o.v. Langflow, Flowise, Dify?** Onze differentiator is de Claude/Pi integratie en ERPNext focus -- is dat genoeg?
- **Hoe zorgen we dat de semantische laag echt goed werkt?** Niet alleen een chatbot wrapper, maar echte intentie-herkenning naar configuratie-generatie.
- **Wie zijn onze eerste gebruikers?** Developers die agents bouwen? Consultants die ERPNext inrichten? ERPNext admins die workflows automatiseren?

---

## Research Nog Uit Te Voeren

- **Pi web-ui components**: Pi heeft een eigen TUI -- zijn er web-UI componenten die we kunnen hergebruiken of forken voor onze canvas?
- **Claude Agent SDK streaming**: hoe tonen we real-time output per agent node op het canvas? Welke streaming primitives biedt de SDK?
- **OpenAEC open-2d-studio**: heeft een extension system voor canvas-gebaseerde tools -- zijn de patronen herbruikbaar voor ons platform?
- **ERPNext_Anthropic_Claude_Development_Skill_Package**: bevat 28 gedefinieerde skills -- kunnen we die importeren als kant-en-klare agent templates?
- **Claude_Workspace_Development_Workflows**: dynamic workspace building concept -- herbruikbaar voor onze configuratie-generatie vanuit het canvas?
- **Frappe UI architecture**: hoe embedden we custom web apps het beste in Frappe Desk? Welke hooks en entry points zijn beschikbaar?

---

*Laatste update: 2026-02-28*
