# Principles - Open-Agents

> **Versie**: 0.1
> **Laatste update**: 2026-02-28
> **Doel**: Design uitgangspunten die elke beslissing sturen

---

## 1. UX boven alles

Niet-technische gebruikers moeten agents kunnen bouwen. Complexe prompt-engineering en context-engineering zitten achter een simpele, uitnodigende interface. Als een gebruiker het niet snapt, is het een bug in onze UX.

## 2. Simpel aan de voorkant, slim aan de achterkant

De UI is clean en begrijpbaar. De backend doet het zware werk: context assembly, model routing, prompt optimization, session management. De gebruiker hoeft niet te weten hoe het werkt - alleen dat het werkt.

## 3. Semantisch eerst

De app begrijpt intent. Je beschrijft wat je wilt in normale taal, en de app bouwt het. Geen complexe commando's, geen config syntax onthouden, geen documentatie doorploegen voor basis functionaliteit.

## 4. Factory mindset

Alles is een "asset": agents, templates, rules, snippets, workflows. De Factory is het centrale portaal waar je assets maakt, beheert en deelt. De drempel om een nieuwe agent te maken moet zo laag zijn als een bericht typen.

## 5. Klein en modulair

Elke agent heeft **één duidelijke kleine taak**. Complexiteit ontstaat niet in individuele agents, maar in de architectuur erboven: door agents te verbinden in flows, pools en combinaties. Doel: 100+ agents in de library, elk met een scherpe focus.

## 6. Drie niveaus, één platform

- **Beginner**: conversational, guided, templates
- **Intermediate**: visueel canvas, configuratie panels
- **Advanced**: raw editing, custom code, API access

Nooit one-size-fits-all. De UI past zich aan het niveau van de gebruiker aan.

## 7. API-first

Alles wat de UI kan, kan ook via de API. Dit is essentieel voor:
- Snelle Scrum iteratie (we testen via API voordat UI klaar is)
- Extensibility (andere tools kunnen integreren)
- Automation (CI/CD pipelines, scheduled runs)

## 8. Platform-agnostisch

Standalone web app, VS Code extension, Frappe app: dezelfde core, verschillende shells. De architectuur maakt geen aannames over waar hij draait.

## 9. Open-source

Transparant, community-driven. MIT license. Iedereen kan bijdragen, forken, en leren van de code. Community templates en agents verrijken het platform.

## 10. Docker-first isolatie

Agents draaien in containers voor security en schaalbaarheid. Geen agent kan buiten zijn sandbox. Dit maakt multi-tenant deployment veilig en voorspelbaar.

## 11. Scrum iteratie

Korte sprints, snel waarde leveren, vroeg valideren met echte gebruikers. Liever een werkend PoC vandaag dan een perfect plan morgen.

## 12. Meerlaagse engineering (D-025)

Open-Agents optimaliseert op **drie niveaus tegelijk**:

1. **Orchestratie** (canvas): WIE doet wat, in welke volgorde — flows, pools, routing
2. **Agent Identiteit** (SDK): WAT is elke entiteit — agent, subagent, teammate, skill (D-023)
3. **Workspace/Context** (Docker): HOE denkt de agent — 6-layer stack per container (D-024)

Alleen de orchestratie optimaliseren levert "werkende" agents. Alle drie de lagen optimaliseren levert agents die **excelleren**. Context engineering op agent-niveau — de juiste CLAUDE.md, skills, rules, MCP en hooks per agent — is het verschil.

## 13. SDK-taxonomie als waarheid (D-023)

We volgen de Anthropic Agent SDK definitie van wat een agent is. Een agent heeft een autonome executie-loop met tool use. Iets dat in één LLM-call kan (tekst in → tekst uit) is een skill of prompt template, geen agent. Dit bepaalt welke block types op het canvas verschijnen en hoe ze zich gedragen.

---

## Samenvatting

> **Open-Agents is een hyper session workspace builder met agentic orchestratie. Je bouwt visueel de ideale workspace per agent en orkestreert ze samen op een canvas — zelf of door AI. De complexiteit van drie engineering-lagen zit achter de schermen. De gebruiker ziet alleen de eenvoud.**

---

*Laatste update: 2026-03-01*
