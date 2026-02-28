# Masterplan - Open-Agents

> **Versie**: 0.1
> **Laatste update**: 2026-02-28
> **Methodiek**: Scrum (korte sprints, snel waarde leveren)
> **Zie ook**: REQUIREMENTS.md, PRINCIPLES.md, ROADMAP.md

---

## Overzicht

| Sprint | Naam | Doel | Status |
|--------|------|------|--------|
| 0 | Foundation | Core documenten + dev environment | In Progress |
| 1 | Proof of Concept | Minimale canvas → Claude Code, end-to-end | Planned |
| 2 | Factory Portal | Agents aanmaken via UI | Planned |
| 3 | Flow Pattern | Sequentiële pipeline werkend | Planned |
| 4 | Pool Pattern | Dispatcher + parallelle execution | Planned |
| 5 | Safety & Audit | Rules editor + audit trail | Planned |
| 6 | Semantische Laag | Natural language → architectuur | Planned |
| 7 | VS Code Extension | Canvas als VS Code webview | Planned |
| 8 | Frappe App | Frappe wrapper + ERPNext templates | Planned |

---

## Sprint 0: Foundation

**Doel**: Visie vastleggen, core documenten schrijven, development environment keuzes maken.

### Deliverables

- [x] Visie verscherpt: van ERPNext-first naar generiek visueel platform
- [ ] REQUIREMENTS.md - alle requirements vastgelegd
- [ ] MASTERPLAN.md - dit document
- [ ] PRINCIPLES.md - design uitgangspunten
- [ ] SOURCES.md - alle bronnen en research
- [ ] OPEN-QUESTIONS.md - onderzoeksvragen
- [ ] DECISIONS.md geupdate met nieuwe beslissingen
- [ ] ROADMAP.md geupdate naar nieuwe richting

### Acceptatiecriteria

- Alle core documenten aangemaakt en consistent
- Open beslissingen geïdentificeerd (D-006 t/m D-010)
- Geen tegenstrijdigheden tussen documenten

### Definition of Done

- Documenten gecommit naar main branch
- Alle teamleden kunnen het lezen en begrijpen

---

## Sprint 1: Proof of Concept

**Doel**: Bewijzen dat het concept werkt. Een minimale canvas met 2 blokken die Claude Code aansturen via de Agent SDK.

### Deliverables

- [ ] Frontend framework gekozen (D-006)
- [ ] Backend framework gekozen (D-007)
- [ ] Minimale canvas met 2 agent-blokken
- [ ] Blokken visueel verbinden (edge)
- [ ] Canvas exporteert naar JSON configuratie
- [ ] JSON config triggert Claude Code via `claude -p` of Agent SDK `query()`
- [ ] Output van Claude Code zichtbaar in UI
- [ ] End-to-end flow werkend: canvas → config → execution → output

### Acceptatiecriteria

- Gebruiker kan 2 blokken op canvas slepen
- Gebruiker kan blokken verbinden
- Klik op "Run" voert de configuratie uit via Claude Code
- Output verschijnt in de UI

### Definition of Done

- Werkende demo (lokaal)
- Code gecommit
- Screenshot/video van werkende flow

---

## Sprint 2: Factory Portal

**Doel**: Gebruikers kunnen nieuwe agents aanmaken via een intuïtieve interface.

### Deliverables

- [ ] Factory tabblad in de app
- [ ] Agent creation wizard (stap-voor-stap formulier)
- [ ] Conversational agent creation ("Maak een agent die code reviewed")
- [ ] Agent opslaan als herbruikbaar asset
- [ ] Basis asset library (lijst van aangemaakte agents)
- [ ] Agent bewerken en verwijderen
- [ ] Eerste 10 voorgebouwde agents in library

### Acceptatiecriteria

- Niet-technische gebruiker kan een agent aanmaken in < 2 minuten
- Aangemaakte agent verschijnt in de library en is sleepbaar naar canvas
- Conversational mode genereert werkende agent configuratie

### Definition of Done

- Factory tabblad werkend
- Minimaal 10 agents in library
- Usability test met niet-technische gebruiker

---

## Sprint 3: Flow Pattern

**Doel**: Sequentiële pipeline werkend - Agent A → Agent B → Agent C.

### Deliverables

- [ ] Flow execution engine
- [ ] Output van agent N wordt input van agent N+1
- [ ] Visuele flow status op canvas (welke agent is actief)
- [ ] Session management: pauze, hervatten, herstarten
- [ ] Foutafhandeling: wat gebeurt er als een agent faalt?
- [ ] Flow configuratie opslaan als template

### Acceptatiecriteria

- 3-stap flow uitvoerbaar: Scout → Planner → Worker
- Intermediate output zichtbaar per stap
- Flow kan gepauzeerd en hervat worden

### Definition of Done

- Flow pattern werkend met 3+ agents
- Template "Code Review Pipeline" beschikbaar
- Error handling gedocumenteerd

---

## Sprint 4: Pool Pattern

**Doel**: Dispatcher-based orchestratie - agents in een pool, orchestrator routeert.

### Deliverables

- [ ] Dispatcher node type op canvas
- [ ] Routeringslogica: op basis van taak/intent naar juiste agent
- [ ] Parallelle execution (meerdere agents tegelijk)
- [ ] Pool configuratie: welke agents zitten in de pool
- [ ] Visuele status: welke agent is getriggerd, welke idle

### Acceptatiecriteria

- Pool met 5 agents, dispatcher routeert correct op basis van vraag
- Parallelle taken voeren gelijktijdig uit
- Status per agent zichtbaar op canvas

### Definition of Done

- Pool pattern werkend
- Template "ERPNext Support Team" beschikbaar (5 domain agents)
- Performance acceptabel bij 5 parallelle agents

---

## Sprint 5: Safety & Audit

**Doel**: Visuele safety rules en volledige audit trail.

### Deliverables

- [ ] Safety rules editor (visueel, niet YAML)
- [ ] Bash command filtering per agent
- [ ] File access restricties per agent
- [ ] Tool permissies per agent (read-only, edit, full access)
- [ ] Audit trail: elke agent actie gelogd met timestamp
- [ ] Run history: overzicht van alle uitgevoerde flows
- [ ] Replay: een historische run opnieuw bekijken

### Acceptatiecriteria

- Safety rule blokkeert gevaarlijke bash commando's
- Audit trail toont complete geschiedenis van een run
- Gebruiker kan historische run terugkijken

### Definition of Done

- Safety layer werkend
- Audit trail compleet
- Security review uitgevoerd

---

## Sprint 6: Semantische Laag

**Doel**: De app begrijpt natural language en genereert architecturen automatisch.

### Deliverables

- [ ] Natural language input: "Ik wil een team dat code reviewed"
- [ ] Auto-generatie van agent architectuur op canvas
- [ ] Context building: app onthoudt wat gebruiker heeft en suggereert
- [ ] Smart suggestions: "Je hebt een reviewer maar geen tester, wil je die toevoegen?"
- [ ] Beginner mode: volledig conversational, geen canvas nodig

### Acceptatiecriteria

- Beschrijving in plain text genereert werkende architectuur
- Suggesties zijn relevant en nuttig
- Beginner kan zonder canvas een flow opzetten

### Definition of Done

- Semantische laag werkend voor top 10 use cases
- A/B test: beginner mode vs canvas mode
- User feedback verwerkt

---

## Sprint 7: VS Code Extension

**Doel**: Open-Agents canvas als VS Code extension.

### Deliverables

- [ ] VS Code extension met webview panel
- [ ] Canvas werkend in webview
- [ ] Integratie met Claude Code extension (output sharing)
- [ ] Extension marketplace listing
- [ ] Keyboard shortcuts voor VS Code

### Acceptatiecriteria

- Extension installeerbaar via VS Code marketplace
- Canvas werkend als sidebar/panel
- Kan Claude Code aansturen vanuit VS Code

### Definition of Done

- Extension gepubliceerd op marketplace
- Documentatie voor VS Code gebruikers
- Compatibiliteit getest met Claude Code extension

---

## Sprint 8: Frappe App

**Doel**: Open-Agents als Frappe app in ERPNext ecosysteem.

### Deliverables

- [ ] Frappe app wrapper voor Open-Agents
- [ ] Canvas embedded in Frappe Desk
- [ ] ERPNext use case templates (Boekhouding, Inkoop, HR, Project, Admin)
- [ ] MCP server integratie voor ERPNext API
- [ ] Eerste 5 ERPNext-specifieke agents

### Acceptatiecriteria

- Frappe app installeerbaar via bench
- Canvas werkend binnen Frappe Desk
- ERPNext template uitvoerbaar tegen live ERPNext instance

### Definition of Done

- Frappe app gepubliceerd
- ERPNext documentatie geschreven
- Pilot met eigen ERPNext instance

---

## Doorlopende Activiteiten

| Activiteit | Frequentie |
|-----------|------------|
| Agent library uitbreiden (doel: 100+) | Elke sprint |
| Community templates verzamelen | Vanaf Sprint 3 |
| User testing met niet-technische gebruikers | Elke sprint |
| API documentatie bijwerken | Elke sprint |
| Security review | Elke 2 sprints |

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
