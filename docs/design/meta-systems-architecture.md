# 20 Meta-Systemen: Globale Skills + Open Agents Issues

**Datum:** 8 maart 2026  
**Principe:** Elke skill triggert op global level, werkt samen met globale CLAUDE.md, en wordt uiteindelijk georkestreerd vanuit Open Agents.

---

## De Eerlijke Waarheid Over Wat We Niet Weten

Voordat we oplossingen bouwen, moeten we eerlijk zijn over de gaten:

**Wat we niet weten en niet meten:**
- Hoe vaak agents stilzwijgend het tegenovergestelde doen van instructies
- Hoeveel "compleet" gemelde taken daadwerkelijk werken end-to-end
- Waar precies in een pipeline informatieverlies optreedt
- Welke delen van onze CLAUDE.md's daadwerkelijk worden gevolgd vs. genegeerd
- Hoe goed onze agents presteren vergeleken met handmatig werk
- Welke kennis ontbreekt waardoor agents suboptimale keuzes maken
- Hoeveel tokens worden verspild aan herhaling, doodlopende paden en zelf-correctie

**Bekende faalpatronen uit de community (bronnen: Anthropic engineering blog, GitHub issues, ClaudeFast):**
- Agents die "klaar" melden zonder end-to-end te testen
- Sycofantische completie: agents beoordelen hun eigen werk als goed
- Context degradatie na lange sessies — focus en kwaliteit dalen
- Monocultuur van denken: dezelfde blinde vlekken herhalen zich
- Vage sub-agent instructies leiden tot verspild werk
- Bestands-conflicten bij parallelle agents
- State-verlies tussen sessies
- Geen persistent backlog — vergeten taken verdwijnen

---

## De 20 Meta-Systemen

### CLUSTER A: Detectie & Eerlijkheid (wat weten we niet?)

---

#### 1. `context-gap-detector`

**Wat:** Analyseert vóór taakuitvoering of de agent voldoende context heeft om de taak goed uit te voeren. Identificeert expliciet wat ontbreekt.

**Waarom:** Agents beginnen te werken met onvoldoende informatie en vullen de gaten met aannames. Die aannames zijn onzichtbaar — niemand weet dat ze er zijn tot het resultaat verkeerd is.

**Hoe als skill:**
```
Trigger: Bij elke complexe taak (multi-file, multi-step, onbekend domein)
Actie:  Voordat werk begint, produceer een "Context Audit":
        - Wat weet ik zeker? (feiten uit context)
        - Wat neem ik aan? (niet-geverifieerde aannames)
        - Wat weet ik niet? (expliciete gaten)
        - Wat heb ik nodig? (concrete informatieverzoeken)
Output: context-audit.md — mens beslist of gaten acceptabel zijn
```

**OA integratie:** `oa run` krijgt een `--audit` flag die deze skill automatisch triggert vóór de eigenlijke taak. De planner-agent in pipelines doet dit standaard.

---

#### 2. `assumption-tracker`

**Wat:** Registreert elke aanname die een agent maakt tijdens uitvoering, zodat ze achteraf verifieerbaar zijn.

**Waarom:** Het gevaarlijkste faalpatroon is een agent die vol vertrouwen het verkeerde bouwt op basis van onuitgesproken aannames. Community-data toont dat agents het tegenovergestelde doen van instructies terwijl ze compliance claimen — aannames zijn de wortel van dat probleem.

**Hoe als skill:**
```
Trigger: Altijd actief op achtergrond
Actie:  Elke keer dat de agent een keuze maakt zonder expliciete instructie,
        log: "AANNAME: [beschrijving] — REDEN: [waarom deze keuze]"
Output: assumptions.log als onderdeel van elke agent-output
```

**OA integratie:** Post-run hook analyseert assumptions.log. Aannames die later fout bleken → lessons extraction. Patronen van verkeerde aannames → template-verbetering.

---

#### 3. `honesty-enforcer`

**Wat:** Dwingt agents om expliciet onzekerheid te communiceren in plaats van zelfverzekerd te raden.

**Waarom:** Sycofantische completie is het #1 probleem in productie. Agents zeggen "klaar" terwijl het werk onvolledig is. Ze melden succes terwijl tests falen. Dit is gedocumenteerd in 11+ sessies door één gebruiker alleen al (GitHub issue #19739 op claude-code repo).

**Hoe als skill:**
```
Trigger: Wanneer agent output markeert als "compleet" of "klaar"
Actie:  Verplichte self-check voordat "klaar" gecommuniceerd mag worden:
        - Heb ik ALLE gevraagde outputs geproduceerd?
        - Heb ik elke output GEVERIFIEERD (niet alleen gegenereerd)?
        - Zijn er onderdelen waar ik <80% zeker over ben?
        - Wat heb ik NIET gedaan dat impliciet verwacht werd?
Output: completion-report.md met eerlijke status per deliverable
```

**OA integratie:** Combiner-agents in pipelines krijgen deze skill standaard. Post-run hook valideert completion-reports tegen daadwerkelijke output.

---

#### 4. `knowledge-boundary-mapper`

**Wat:** Brengt per domein in kaart wat de agent wel en niet betrouwbaar kan doen, gebaseerd op historische prestaties.

**Waarom:** We weten niet waar onze agents goed en slecht in zijn. Zonder deze kaart sturen we agents naar taken waar ze structureel falen.

**Hoe als skill:**
```
Trigger: Periodiek (via OA benchmark) of bij nieuw taaktype
Actie:  Analyseer run-telemetrie per taakcategorie:
        - Success-rate per domein (testing, API-design, refactoring, docs...)
        - Gemiddelde correctie-rondes per domein
        - Token-efficiency per domein
Output: knowledge-boundary-map.yaml — "hier zijn we goed, hier niet"
```

**OA integratie:** `oa improve` gebruikt deze kaart om te beslissen welke templates en skills prioriteit moeten krijgen voor verbetering.

---

#### 5. `blind-spot-scanner`

**Wat:** Detecteert systematische blinde vlekken door gefaalde runs te clusteren en gemeenschappelijke oorzaken te vinden.

**Waarom:** Individuele failures zijn ruis. Maar als 40% van alle testing-taken faalt omdat agents tests schrijven maar niet uitvoeren, is dat een systematische blinde vlek die één template-wijziging kan fixen. Anthropic documenteert dit precies: "Claude's tendency to mark a feature as complete without proper testing" was hun meest voorkomende faalpatroon.

**Hoe als skill:**
```
Trigger: Wekelijks via OA benchmark, of na 10+ failures
Actie:  Cluster gefaalde runs op:
        - Gemeenschappelijke faalreden
        - Agent-type dat faalt
        - Taakcategorie
        - Fase waarin het misgaat (planning, executie, verificatie)
Output: blind-spots-report.md met gerankte blinde vlekken + fix-suggesties
```

**OA integratie:** Input voor `oa improve`. Elke gedetecteerde blinde vlek wordt een potentiële template-verbetering of nieuwe skill.

---

### CLUSTER B: Verificatie & Kwaliteit (is het echt goed?)

---

#### 6. `adversarial-reviewer`

**Wat:** Een onafhankelijke review-agent die specifiek zoekt naar fouten, weggelaten werk en onterechte success-claims.

**Waarom:** Self-review werkt niet. Dit is architectureel bewezen: een agent kan zijn eigen werk niet objectief beoordelen. De monocultuur van denken betekent dat dezelfde blinde vlekken review passeren. Productie-systemen (zie Gist van sigalovskinick) lossen dit op met een hard invariant: "Self-review is impossible by construction."

**Hoe als skill:**
```
Trigger: Na elke substantiële agent-output (>50 regels code of >1 bestand)
Actie:  Spawn een aparte review-agent (read-only!) die:
        - Controleert of alle instructies gevolgd zijn (diff tegen originele taak)
        - Zoekt naar weggelaten edge cases
        - Verifieert dat tests daadwerkelijk passeren
        - Controleert of output compileert/runt
        - Geeft een eerlijk verdict: APPROVED / NEEDS WORK + specifieke issues
Output: review-verdict.md
```

**OA integratie:** `oa run --review` spawnt automatisch een adversarial reviewer na de worker. `oa pipeline` heeft dit als standaard stap vóór de combiner.

**Kritiek mechanisme:** De reviewer is READ-ONLY — kan geen bestanden wijzigen. Heeft dus geen incentive om issues te bagatelliseren.

---

#### 7. `end-to-end-verifier`

**Wat:** Verifieert dat output daadwerkelijk werkt als geheel, niet alleen als losse onderdelen.

**Waarom:** Anthropic's eigen onderzoek met langlopende agents toonde aan dat het grootste faalpatroon was: features die "klaar" waren maar niet end-to-end werkten. Unit tests passeerden, maar de feature deed niet wat de gebruiker verwachtte.

**Hoe als skill:**
```
Trigger: Wanneer agent code produceert die "klaar" is
Actie:  Voer end-to-end verificatie uit:
        - Compileer/run het resultaat
        - Voer tests uit (niet alleen schrijven, ook runnen)
        - Simuleer gebruikersscenario waar mogelijk
        - Screenshot/output vergelijken met verwachting
Output: verification-result.md met PASS/FAIL + bewijs
```

**OA integratie:** Verplichte stap in elke pipeline vóór completion. Worker-agents krijgen deze skill zodat ze zelf verifiëren voordat ze "klaar" melden.

---

#### 8. `instruction-compliance-checker`

**Wat:** Vergelijkt de originele instructie met het daadwerkelijke resultaat en detecteert afwijkingen.

**Waarom:** Het meest frustrerende faalpatroon: agents die het tegenovergestelde doen van wat gevraagd wordt. "Zet het NAAST de kolommen, NIET ERONDER" → agent zet het eronder. Dit is systematisch gedocumenteerd en komt voort uit het feit dat agents hun eigen interpretatie van de taak volgen in plaats van de letterlijke instructie.

**Hoe als skill:**
```
Trigger: Na elke agent-output
Actie:  Diff-analyse tussen:
        - Originele taak/instructie (letterlijk)
        - Geproduceerde output
        - Check elk specifiek vereiste tegen output
        - Markeer ELKE afwijking, hoe klein ook
Output: compliance-check.md met per-instructie PASS/FAIL
```

**OA integratie:** Handoff-protocol (#8 uit vorige issues) bevat de originele instructie. Compliance-checker vergelijkt handoff-task tegen handoff-result.

---

### CLUSTER C: Context & Geheugen (weten we wat we wisten?)

---

#### 9. `context-decay-monitor`

**Wat:** Meet real-time hoe de kwaliteit van agent-responses verandert naarmate het contextvenster vult.

**Waarom:** Context rot is niet binair (werkt/werkt niet) maar gradueel. Agents worden langzaam minder precies, vergeten eerdere instructies, en herhalen zichzelf — maar dit is onzichtbaar zonder meting.

**Hoe als skill:**
```
Trigger: Continu tijdens langlopende agent-sessies
Actie:  Monitor indicatoren van context decay:
        - Herhaalt de agent zichzelf? (repetitie-detectie)
        - Worden eerdere instructies nog gevolgd? (drift-detectie)
        - Neemt response-lengte toe zonder meer inhoud? (opvulling-detectie)
        - Worden tools correct gebruikt? (tool-misuse-detectie)
Output: context-health-score per interval → trigger compaction bij daling
```

**OA integratie:** Voeding voor auto-compaction (#7). Als health-score daalt → waarschuwing → compaction → herstel.

---

#### 10. `session-state-preserver`

**Wat:** Gestructureerde state-opslag die het mogelijk maakt om een agent-sessie exact te hervatten na onderbreking.

**Waarom:** Anthropic's oplossing voor langlopende agents was een "initializer agent" die een progress-file bijhoudt. Zonder dit bekijkt een nieuwe agent-sessie de workspace, ziet dat er werk is gedaan, en meldt de taak als voltooid — zonder iets toe te voegen. Dit is hun tweede meest voorkomende faalpatroon.

**Hoe als skill:**
```
Trigger: Periodiek tijdens lange runs + bij sessie-einde
Actie:  Schrijf gestructureerde state:
        - Wat is voltooid? (met bewijs)
        - Wat is de huidige actieve taak?
        - Wat zijn openstaande beslissingen?
        - Welke bestanden zijn relevant en waarom?
        - Wat moet de volgende sessie als eerste doen?
Output: session-state.yaml — leesbaar door volgende agent-instantie
```

**OA integratie:** `oa resurrect` (#11) gebruikt deze state om een agent exact te hervatten. Planner-agents schrijven state voor hun workers.

---

#### 11. `persistent-backlog`

**Wat:** Een altijd-beschikbare takenlijst die niet verdwijnt wanneer een sessie eindigt.

**Waarom:** Claude Code's TodoWrite is sessie-gebonden — sessie eindigt, lijst weg. Taken die worden ontdekt tijdens werk ("dit moeten we later fixen") verdwijnen. Geen mechanisme om automatisch taken te detecteren uit conversatie of werkresultaten.

**Hoe als skill:**
```
Trigger: Wanneer een agent een toekomstige taak identificeert, een TODO vindt,
         of een probleem detecteert dat niet in scope is
Actie:  Voeg toe aan persistente backlog:
        - Taak beschrijving
        - Ontdekt door welke agent/run
        - Prioriteit (geschat)
        - Gerelateerde bestanden
        - Blokkerende dependencies
Output: ~/.oa/backlog.yaml (persistent, cross-sessie)
```

**OA integratie:** `oa backlog` toont de lijst. `oa backlog next` pakt de hoogste prioriteit. `oa improve` kan backlog-items automatisch oppakken.

---

### CLUSTER D: Communicatie & Coördinatie (begrijpen agents elkaar?)

---

#### 12. `invocation-quality-gate`

**Wat:** Valideert dat sub-agent instructies voldoende specifiek en volledig zijn voordat ze worden verstuurd.

**Waarom:** Community-data is hier glashelder: "Most sub-agent failures aren't execution failures — they're invocation failures." De orchestrator stuurt vage instructies, de sub-agent doet zijn best met slechte input. Het probleem zit niet bij de worker maar bij de planner.

**Hoe als skill:**
```
Trigger: Wanneer een agent een sub-agent gaat spawnen
Actie:  Valideer de instructie op:
        - Bevat het specifieke bestandsreferenties? (niet alleen "de code")
        - Zijn er concrete success criteria? (niet alleen "maak het werkend")
        - Is de scope afgebakend? (niet "refactor alles")
        - Zijn constraints expliciet? (niet aangenomen)
        - Is het outputformat gespecificeerd?
        Score < threshold → dwing herformulering af
Output: invocation-score + suggesties voor verbetering
```

**OA integratie:** Ingebouwd in `oa pipeline` en `oa delegate`. Planner-output wordt gevalideerd voordat workers worden gespawned.

---

#### 13. `file-conflict-preventer`

**Wat:** Voorkomt dat parallelle agents dezelfde bestanden wijzigen.

**Waarom:** Het meest voorkomende coördinatieprobleem bij agent teams. Zonder expliciete file-boundaries overschrijven agents elkaars werk. De community-oplossing is simpel maar moet geautomatiseerd worden: "Parallel only works when agents touch different files."

**Hoe als skill:**
```
Trigger: Bij elke parallelle agent-spawn
Actie:  Analyseer taak per agent en wijs file-boundaries toe:
        - Agent A "owns" src/auth/* — alleen A mag daar schrijven
        - Agent B "owns" src/api/* — alleen B mag daar schrijven
        - Gedeelde bestanden (package.json, config) → sequential lock
Output: file-ownership-map.yaml → agents krijgen dit in hun CLAUDE.md
```

**OA integratie:** `oa pipeline` genereert automatisch ownership-map op basis van taakdecompositie. Workers krijgen expliciete "je mag alleen in [deze directories] schrijven".

---

#### 14. `information-loss-detector`

**Wat:** Detecteert waar in een pipeline informatieverlies optreedt — waar details verloren gaan bij handoffs.

**Waarom:** Elke handoff is een potentieel informatielek. De planner specificeert 5 vereisten, de worker ontvangt er 4, de combiner ziet er 3. Niemand merkt het tot het eindresultaat incompleet is.

**Hoe als skill:**
```
Trigger: Na elke pipeline-completion
Actie:  Trace informatieflow door de pipeline:
        - Originele taak: welke vereisten?
        - Per handoff: welke vereisten doorgegeven?
        - Per agent-output: welke vereisten geadresseerd?
        - Eindresultaat: welke vereisten ontbreken?
Output: information-flow-audit.md met verlies-percentages per stap
```

**OA integratie:** Post-pipeline hook. Structureel informatieverlies → handoff-protocol verbetering → template-update.

---

### CLUSTER E: Leren & Evolueren (worden we echt beter?)

---

#### 15. `anti-regression-guard`

**Wat:** Voorkomt dat verbeteringen aan templates of skills onbedoeld andere dingen breken.

**Waarom:** Zonder regressietests kan een "verbetering" aan de planner-template de worker-success-rate verlagen. Het systeem verbetert zich in één dimensie maar verslechtert in een andere — onzichtbaar.

**Hoe als skill:**
```
Trigger: Bij elke template- of skill-wijziging (via oa improve of handmatig)
Actie:  Draai relevante benchmarks (#6) voor EN na de wijziging:
        - Vergelijk success-rates per taakcategorie
        - Vergelijk token-efficiency
        - Vergelijk doorlooptijden
        - FAIL als enige metric significant verslechtert
Output: regression-test-result.md met PASS/FAIL per metric
```

**OA integratie:** Gate in `oa improve apply`. Geen wijziging wordt toegepast zonder regressietest. Rollback bij verslechtering.

---

#### 16. `cross-agent-pattern-miner`

**Wat:** Ontdekt patronen die zich over meerdere agent-types herhalen — zowel succespatronen als faalpatronen.

**Waarom:** Individuele agent-analyse mist systeem-brede patronen. Misschien falen planners EN workers op dezelfde manier wanneer de taak ambiguïteit bevat — maar je ziet het alleen als je cross-agent analyseert.

**Hoe als skill:**
```
Trigger: Periodiek (wekelijks) of bij voldoende nieuwe data
Actie:  Analyseer runs OVER agent-types heen:
        - Correlaties tussen planner-kwaliteit en worker-succes
        - Gemeenschappelijke faalpatronen ongeacht agent-type
        - Welke taak-formuleringen leiden universeel tot betere resultaten
        - Welke context-patronen zijn universeel effectief
Output: cross-agent-patterns.md + voorstellen voor globale verbeteringen
```

**OA integratie:** Input voor `oa improve`. Globale patronen leiden tot globale CLAUDE.md updates of nieuwe shared-skills.

---

#### 17. `diminishing-returns-detector`

**Wat:** Detecteert wanneer verdere optimalisatie van een component geen significante verbetering meer oplevert.

**Waarom:** Zonder dit blijven we eindeloos sleutelen aan dingen die al goed genoeg zijn, terwijl de echte bottleneck elders zit. Dit is het equivalent van premature optimization in software engineering.

**Hoe als skill:**
```
Trigger: Bij elke oa improve cyclus
Actie:  Analyseer verbetering-over-tijd per component:
        - Template X: 3 verbeteringen, success-rate 67%→82%→84%→85%
          → Diminishing returns: marginale winst <2%, focus elders
        - Skill Y: 1 verbetering, success-rate 45%→68%
          → Hoge marge: meer optimalisatie hier is waardevol
Output: optimization-priority-map.md — waar investeren we de volgende effort?
```

**OA integratie:** Stuurt `oa improve` weg van over-geoptimaliseerde componenten naar de echte bottlenecks.

---

### CLUSTER F: Infrastructuur & Systeem (draait het geheel?)

---

#### 18. `token-budget-allocator`

**Wat:** Intelligente verdeling van beschikbare tokens over agents in een pipeline, gebaseerd op taakcomplexiteit.

**Waarom:** Nu krijgt elke agent hetzelfde contextvenster, maar een planner heeft misschien 20K tokens nodig terwijl een complexe worker 100K nodig heeft. Zonder bewuste allocatie verspillen simpele agents budget dat complexe agents nodig hebben.

**Hoe als skill:**
```
Trigger: Bij pipeline-planning (na taakdecompositie)
Actie:  Schat token-behoefte per subtaak:
        - Complexiteit van de taak (bestanden, afhankelijkheden)
        - Historisch verbruik voor vergelijkbare taken
        - Beschikbare totale budget
        - Alloceer proportioneel
Output: token-budget-plan.yaml → agents weten hun budget + compaction-trigger
```

**OA integratie:** Planner produceert budget-plan als onderdeel van pipeline-planning. Workers ontvangen hun budget in de CLAUDE.md.

---

#### 19. `ecosystem-health-dashboard`

**Wat:** Een real-time overzicht van de gezondheid van het gehele OA-ecosysteem: skills, templates, configs, kennisbasis.

**Waarom:** Met 20+ skills, 160+ templates, configuratie op meerdere niveaus, een groeiende kennisbasis en continue agent-runs heb je een centraal overzicht nodig. Zonder dit weet je niet wat verouderd is, wat conflicteert, of wat niet meer triggert.

**Hoe als skill:**
```
Trigger: `oa health` of periodiek automatisch
Actie:  Scan en rapporteer:
        - Skills: welke triggeren nooit? welke conflicteren? verouderd?
        - Templates: success-rates? wanneer laatst geüpdatet?
        - Config: inconsistenties tussen global/local? ongebruikte settings?
        - Kennisbasis: hoeveel lessons? deduplicatie nodig? verouderde entries?
        - Hooks: draaien ze? fouten? timing?
        - Benchmark: trend omhoog/omlaag/stabiel?
Output: ecosystem-health.md + kleurgecodeerd dashboard in TUI
```

**OA integratie:** `oa health` als eerste ding dat je checkt voordat je gaat werken. Integreert in `oa dashboard`.

---

#### 20. `documentation-generator`

**Wat:** Genereert en onderhoudt automatisch documentatie van het OA-systeem op basis van de daadwerkelijke staat.

**Waarom:** Documentatie drifted altijd van de werkelijkheid. Na 20 verbetercycli beschrijft de README een systeem dat niet meer bestaat. Dit is een meta-meta-probleem: het systeem dat zichzelf verbetert, documenteert zichzelf niet.

**Hoe als skill:**
```
Trigger: Na elke significante wijziging (template, skill, config, nieuwe feature)
Actie:  Update automatisch:
        - README.md: feature-lijst, installatie, quick start
        - ARCHITECTURE.md: hoe het systeem werkt
        - CHANGELOG.md: wat is er veranderd
        - Agent-catalogus: welke agents bestaan, wat doen ze
        - Skill-catalogus: welke skills, wanneer triggeren ze
Output: PR-ready documentatie-updates
```

**OA integratie:** Post-improve hook. Elke `oa improve apply` triggert automatisch documentatie-updates.

---

## Samenhang: Hoe de 20 Systemen Samenwerken

```
TAAK BINNENKOMT
    │
    ▼
┌─ PRE-EXECUTIE ──────────────────────────────────┐
│  #1  Context Gap Detector    → Weten we genoeg?  │
│  #12 Invocation Quality Gate → Zijn instructies   │
│                                 goed genoeg?      │
│  #13 File Conflict Preventer → Geen overlap?      │
│  #18 Token Budget Allocator  → Budget verdeeld?   │
└──────────────────────────┬──────────────────────┘
                           │
                           ▼
┌─ TIJDENS EXECUTIE ──────────────────────────────┐
│  #2  Assumption Tracker      → Log aannames      │
│  #9  Context Decay Monitor   → Context gezond?    │
│  #10 Session State Preserver → State bewaard?     │
│  #11 Persistent Backlog      → TODO's gevangen?   │
└──────────────────────────┬──────────────────────┘
                           │
                           ▼
┌─ POST-EXECUTIE ─────────────────────────────────┐
│  #3  Honesty Enforcer        → Echt klaar?        │
│  #6  Adversarial Reviewer    → Onafhankelijk OK?  │
│  #7  End-to-End Verifier     → Werkt het ECHT?    │
│  #8  Instruction Compliance  → Instructie gevolgd? │
│  #14 Information Loss Det.   → Niets verloren?    │
└──────────────────────────┬──────────────────────┘
                           │
                           ▼
┌─ META-ANALYSE (periodiek) ──────────────────────┐
│  #4  Knowledge Boundary Map  → Waar zijn we goed? │
│  #5  Blind Spot Scanner      → Systematische gaps? │
│  #15 Anti-Regression Guard   → Niets gebroken?    │
│  #16 Cross-Agent Pattern Min → Systeem-patronen?  │
│  #17 Diminishing Returns Det → Waar investeren?   │
│  #19 Ecosystem Health Dash   → Alles gezond?      │
│  #20 Documentation Generator → Docs actueel?      │
└─────────────────────────────────────────────────┘
```

---

## Implementatie Strategie

### Fase 1: Fundament (vereist issues #1-#2 uit vorige set)

Zonder run-telemetrie en post-run hooks kan GEEN van deze 20 systemen functioneren. Die zijn prerequisite.

### Fase 2: Quick Wins (skills die direct waarde leveren)

| # | Skill | Effort | Impact | Waarom eerst |
|---|---|---|---|---|
| 1 | Context Gap Detector | Laag | Hoog | Voorkomt blind werken |
| 3 | Honesty Enforcer | Laag | Hoog | Adresseert #1 faalpatroon |
| 6 | Adversarial Reviewer | Medium | Hoog | Bewezen effectief in productie |
| 12 | Invocation Quality Gate | Laag | Hoog | Voorkomt #1 oorzaak van sub-agent failures |

### Fase 3: Observeerbaarheid

| # | Skill | Effort | Impact |
|---|---|---|---|
| 2 | Assumption Tracker | Laag | Medium |
| 9 | Context Decay Monitor | Medium | Hoog |
| 14 | Information Loss Detector | Medium | Hoog |
| 19 | Ecosystem Health Dashboard | Medium | Hoog |

### Fase 4: Intelligentie

| # | Skill | Effort | Impact |
|---|---|---|---|
| 4 | Knowledge Boundary Mapper | Medium | Hoog |
| 5 | Blind Spot Scanner | Medium | Hoog |
| 16 | Cross-Agent Pattern Miner | Hoog | Hoog |
| 17 | Diminishing Returns Detector | Laag | Medium |

### Fase 5: Infrastructuur

| # | Skill | Effort | Impact |
|---|---|---|---|
| 7 | End-to-End Verifier | Hoog | Hoog |
| 8 | Instruction Compliance Checker | Medium | Hoog |
| 10 | Session State Preserver | Medium | Medium |
| 11 | Persistent Backlog | Laag | Medium |
| 13 | File Conflict Preventer | Medium | Medium |
| 15 | Anti-Regression Guard | Medium | Hoog |
| 18 | Token Budget Allocator | Hoog | Medium |
| 20 | Documentation Generator | Medium | Medium |

---

## Relatie met Globale CLAUDE.md

De globale CLAUDE.md moet verwijzen naar deze skills maar niet hun volledige inhoud bevatten. Het werkcontract wordt:

```markdown
# Globale Instructies

## Meta-Systemen
Bij elke taak, activeer automatisch de relevante meta-systemen:
- VOOR uitvoering: context-audit, invocation-check
- TIJDENS uitvoering: assumption-tracking, context-monitoring
- NA uitvoering: honesty-check, adversarial review, compliance-check
- PERIODIEK: blind-spot scan, pattern mining, ecosystem health

Raadpleeg skills/ voor gedetailleerde instructies per systeem.
```

Dit houdt de globale CLAUDE.md klein (~50 regels) terwijl het volledige meta-systeem via progressive disclosure beschikbaar is.
