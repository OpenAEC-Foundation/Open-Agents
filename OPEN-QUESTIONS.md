# Open Questions - Open-Agents

> **Versie**: 0.2
> **Datum**: 2026-02-28
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
- **Hoe gaan we om met agent failures mid-flow?** *(Gedeeltelijk beantwoord: Sprint 3.4 definieert retry/skip/abort. Nog geen formele beslissing.)*

### Beantwoord (zie DECISIONS.md)

- ~~**In-process agents vs process-spawning vs containers**~~ → D-009 (Claude SDK only voor PoC), D-101 (Docker per agent), D-015 (runtime adapter)
- ~~**Config format dat naar Claude SDK en Pi kan exporteren?**~~ → D-010 (eigen JSON schema met Claude SDK mapping)
- ~~**State management bij multi-agent flows?**~~ → D-015 (runtime adapter slaat per-step output op als fallback)

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

### Nog Open

- **Hoe embedden we de canvas UI in een VS Code webview met goede performance?** Welke beperkingen legt de webview API op qua state, communicatie en rendering? *(Relevant voor Sprint 7)*
- **Hoe integreren we de canvas UI in Frappe Desk zonder iframe?** Frappe gebruikt eigen routing en bundling -- hoe voegen we een SPA-achtige canvas toe? *(Relevant voor Sprint 8)*

---

## Product Vragen

- **Hoe vullen we de library met 100+ agents?** *(Deels beantwoord: AGENTS.md definieert 100 agents. Sprint 9 plant het bouwproces. Groeipad: MVP=10, Beta=25, v1.0=50, v2.0=100+)*
- **Wat is ons verdienmodel?** Open core met premium features? SaaS hosting? Templates marketplace met revenue share? *(Spanning met MIT licentie — zie PRINCIPLES.md #9)*
- **Hoe positioneren we ons t.o.v. Langflow, Flowise, Dify?** Onze differentiators: atomaire agent filosofie, VS Code embed, Frappe embed, Claude/Pi dual runtime. *(Feature matrix nog niet uitgewerkt)*
- **Wie zijn onze eerste gebruikers?** *(Voorstel: developers die AI agents bouwen voor eigen projecten. Past bij AGENTS.md library, tech stack, en het feit dat de eerste gebruiker de maker is.)*

---

## Research Nog Uit Te Voeren

- **Claude Agent SDK V2 stabiliteit**: Wanneer wordt de V2 session API (unstable_v2_*) stable? Welke breaking changes zijn gepland? *(Kritiek voor Sprint 3.3 session management)*
- **Agent Teams productie-readiness**: Bekende limitaties: session resume werkt niet met lopende teammates, task status kan achterlopen, 3-4x token kosten. *(Risico voor Sprint 4 pool pattern)*
- **Pi agent-core als runtime adapter**: Hoe mapt pi-agent-core op onze AgentRuntime interface? Welke features biedt het bovenop de Claude SDK? *(Relevant wanneer D-002 geimplementeerd wordt)*
- **ERPNext_Anthropic_Claude_Development_Skill_Package**: bevat 28 gedefinieerde skills -- kunnen we die importeren als kant-en-klare agent templates?
- **Frappe UI architecture**: hoe embedden we custom web apps het beste in Frappe Desk? Welke hooks en entry points zijn beschikbaar?

---

*Laatste update: 2026-02-28*
