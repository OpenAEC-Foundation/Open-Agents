# AGENTS.md - Atomic Agent Library

> **Versie**: 1.0
> **Datum**: 2026-02-28
> **Project**: Open-Agents (OpenAEC Foundation)
> **Doel**: 100 voorbeelden van atomaire agents — het kleinst mogelijke elementaire deeltje
> **Principe**: Complexiteit ontstaat uit de architectuur (flows, pools), niet uit individuele agents

---

## Filosofie

Elke agent in deze library doet **één ding**. Niet twee, niet drie. Eén.

Een agent is het kleinste elementaire deeltje van functionaliteit. Net als Unix-commando's: `grep` zoekt, `sort` sorteert, `wc` telt. Pas wanneer je ze combineert (`grep "error" log.txt | sort | wc -l`) ontstaat krachtige functionaliteit.

Zo werkt Open-Agents ook:
- **Flow** (pipeline): Agent A → Agent B → Agent C — output wordt input
- **Pool** (dispatcher): Orchestrator routeert naar de juiste agent op basis van de vraag
- **Combinatie**: Flows binnen pools, pools binnen flows — onbeperkt nestbaar

**Voorbeeld**: Je wilt een code review. Dat is geen mega-agent. Dat is een flow:

```
[Read File] → [Detect Language] → [Check Style] → [Find Bugs] → [Check Security] → [Summarize Findings]
```

Zes simpele agents. Elk doet één ding. Samen: volledige code review.

---

## Categorieën

| # | Categorie | Agents | Beschrijving |
|---|-----------|:------:|--------------|
| A | Text & Taal | 15 | Tekst verwerken, vertalen, samenvatten |
| B | Code & Development | 20 | Code analyseren, genereren, transformeren |
| C | Data & Transformatie | 10 | Data converteren, valideren, extraheren |
| D | File & System | 10 | Bestanden lezen, schrijven, organiseren |
| E | Review & Kwaliteit | 10 | Controleren, valideren, feedback geven |
| F | Git & Versioning | 8 | Git operaties, branch management |
| G | Communicatie & Rapportage | 7 | Berichten, rapporten, notificaties |
| H | Research & Analyse | 10 | Onderzoeken, vergelijken, evalueren |
| I | ERPNext & Business | 10 | Domein-specifieke bedrijfslogica |
| **Totaal** | | **100** | |

---

## A. Text & Taal

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| A-01 | `summarize` | Tekst (any length) | Samenvatting (3-5 zinnen) | Vat tekst samen tot de kern |
| A-02 | `extract-keywords` | Tekst | Lijst van keywords | Haalt de belangrijkste termen uit tekst |
| A-03 | `translate` | Tekst + doeltaal | Vertaalde tekst | Vertaalt naar opgegeven taal |
| A-04 | `detect-language` | Tekst | Taalcode (nl, en, de...) | Detecteert de taal van de input |
| A-05 | `rewrite-formal` | Tekst | Formele versie | Herschrijft informele tekst naar zakelijke toon |
| A-06 | `rewrite-simple` | Tekst | Versimpelde versie | Herschrijft complexe tekst naar B1-niveau |
| A-07 | `fix-grammar` | Tekst | Gecorrigeerde tekst | Corrigeert spelling en grammatica |
| A-08 | `extract-action-items` | Vergadertekst / e-mail | Lijst van actiepunten | Haalt concrete to-do's uit tekst |
| A-09 | `generate-title` | Tekst / document | Titel (max 10 woorden) | Genereert een passende titel |
| A-10 | `classify-sentiment` | Tekst | Positief / Neutraal / Negatief | Classificeert de toon van tekst |
| A-11 | `classify-topic` | Tekst + categorieën | Categorie | Classificeert tekst in een opgegeven categorie |
| A-12 | `extract-entities` | Tekst | Lijst van namen, datums, bedragen | Named entity recognition |
| A-13 | `generate-questions` | Tekst | 5 vragen over de tekst | Genereert begripsvragen |
| A-14 | `compare-texts` | Twee teksten | Vergelijkingsrapport | Vergelijkt twee teksten op inhoudelijke verschillen |
| A-15 | `anonymize` | Tekst | Geanonimiseerde tekst | Vervangt PII (namen, adressen, BSN) door placeholders |

---

## B. Code & Development

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| B-01 | `detect-code-language` | Code snippet | Taal (Python, TS, etc.) | Detecteert de programmeertaal |
| B-02 | `explain-code` | Code snippet | Uitleg in plain text | Legt uit wat de code doet |
| B-03 | `add-comments` | Code snippet | Code met inline comments | Voegt verklarende comments toe |
| B-04 | `remove-comments` | Code snippet | Code zonder comments | Verwijdert alle comments |
| B-05 | `format-code` | Code snippet | Geformatteerde code | Formatteert code volgens standaard style |
| B-06 | `find-bugs` | Code snippet | Lijst van mogelijke bugs | Zoekt logische fouten en edge cases |
| B-07 | `suggest-fix` | Code + foutmelding | Fix suggestie | Stelt een oplossing voor bij een error |
| B-08 | `generate-types` | JavaScript code | TypeScript types/interfaces | Genereert type definities |
| B-09 | `generate-test` | Functie | Unit test | Schrijft een unit test voor één functie |
| B-10 | `generate-docstring` | Functie | Docstring / JSDoc | Schrijft documentatie voor een functie |
| B-11 | `rename-variable` | Code + oud + nieuw | Gerefactorde code | Hernoemt een variabele consistent |
| B-12 | `extract-function` | Code + selectie | Geëxtraheerde functie | Trekt geselecteerde code uit naar een aparte functie |
| B-13 | `convert-syntax` | Code + doelversie | Geconverteerde code | Converteert syntax (bijv. ES5→ES6, Python 2→3) |
| B-14 | `generate-regex` | Beschrijving in tekst | Regex patroon | Genereert een regex op basis van beschrijving |
| B-15 | `validate-api-response` | API response + schema | Valid / Invalid + errors | Valideert een API response tegen een schema |
| B-16 | `generate-mock-data` | Schema / interface | Mock data (JSON) | Genereert realistische testdata |
| B-17 | `minify-code` | Code snippet | Geminificeerde code | Comprimeert code tot minimale grootte |
| B-18 | `detect-complexity` | Functie | Complexiteitsscore | Meet cyclomatic complexity |
| B-19 | `list-dependencies` | Code bestand | Lijst van imports/dependencies | Inventariseert alle dependencies |
| B-20 | `generate-snippet` | Beschrijving | Code snippet | Genereert een kort stukje code op basis van beschrijving |

---

## C. Data & Transformatie

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| C-01 | `json-to-yaml` | JSON | YAML | Converteert JSON naar YAML |
| C-02 | `yaml-to-json` | YAML | JSON | Converteert YAML naar JSON |
| C-03 | `csv-to-json` | CSV data | JSON array | Converteert CSV naar JSON |
| C-04 | `validate-json` | JSON string | Valid / Invalid + errors | Valideert JSON syntax |
| C-05 | `validate-yaml` | YAML string | Valid / Invalid + errors | Valideert YAML syntax |
| C-06 | `flatten-json` | Genest JSON object | Plat JSON object | Maakt geneste structuur plat (dot notation) |
| C-07 | `extract-schema` | JSON data | JSON Schema | Genereert een schema uit voorbeeld data |
| C-08 | `transform-keys` | JSON + stijl (camel/snake/kebab) | Getransformeerd JSON | Converteert alle keys naar opgegeven stijl |
| C-09 | `filter-fields` | JSON + veldlijst | Gefilterd JSON | Houdt alleen opgegeven velden over |
| C-10 | `merge-objects` | Twee JSON objecten | Samengevoegd object | Deep merge van twee objecten |

---

## D. File & System

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| D-01 | `read-file` | Bestandspad | Bestandsinhoud | Leest een bestand en retourneert de inhoud |
| D-02 | `write-file` | Pad + inhoud | Bevestiging | Schrijft inhoud naar een bestand |
| D-03 | `list-files` | Directory pad + filter | Bestandslijst | Lijst bestanden in een map (met glob filter) |
| D-04 | `find-file` | Bestandsnaam (pattern) | Pad(en) | Zoekt een bestand in de workspace |
| D-05 | `count-lines` | Bestandspad | Aantal regels | Telt het aantal regels in een bestand |
| D-06 | `detect-filetype` | Bestandspad | Bestandstype + encoding | Detecteert het type en de encoding |
| D-07 | `compare-files` | Twee bestanden | Diff output | Toont de verschillen tussen twee bestanden |
| D-08 | `search-in-files` | Zoekterm + scope | Lijst van matches | Grep-achtig zoeken in bestanden |
| D-09 | `create-directory` | Pad | Bevestiging | Maakt een directory structuur aan |
| D-10 | `check-file-exists` | Pad | Bestaat (ja/nee) + metadata | Controleert of een bestand bestaat |

---

## E. Review & Kwaliteit

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| E-01 | `check-style` | Code bestand | Style violations lijst | Controleert code tegen style guide |
| E-02 | `check-security` | Code bestand | Security findings | Zoekt OWASP top-10 kwetsbaarheden |
| E-03 | `check-accessibility` | HTML/component | A11y issues lijst | Controleert op accessibility problemen |
| E-04 | `check-performance` | Code bestand | Performance suggesties | Identificeert performance bottlenecks |
| E-05 | `check-naming` | Code bestand | Naming inconsistenties | Controleert naamgevingsconventies |
| E-06 | `check-dead-code` | Code bestand | Ongebruikte code lijst | Vindt ongebruikte functies, variabelen, imports |
| E-07 | `check-duplication` | Code bestand(en) | Duplicaten lijst | Vindt gedupliceerde code blokken |
| E-08 | `rate-readability` | Code bestand | Score (1-10) + uitleg | Beoordeelt de leesbaarheid van code |
| E-09 | `check-test-coverage` | Test bestand + broncode | Coverage rapport | Analyseert welke paden niet getest zijn |
| E-10 | `check-documentation` | Code bestand | Missende docs lijst | Vindt ongedocumenteerde publieke functies |

---

## F. Git & Versioning

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| F-01 | `generate-commit-msg` | Git diff | Conventional commit message | Genereert commit bericht op basis van changes |
| F-02 | `summarize-diff` | Git diff | Samenvatting in tekst | Vat een diff samen in leesbare tekst |
| F-03 | `list-changed-files` | Branch / commit range | Lijst van gewijzigde bestanden | Inventariseert alle gewijzigde bestanden |
| F-04 | `check-conflicts` | Branch naam | Conflicten lijst | Controleert op merge conflicts met een branch |
| F-05 | `generate-changelog` | Commit range | Changelog entry | Genereert een changelog uit commits |
| F-06 | `classify-commit` | Commit message | Type (feat/fix/docs/etc.) | Classificeert een commit type |
| F-07 | `suggest-branch-name` | Taak beschrijving | Branch naam | Genereert een branch naam volgens conventie |
| F-08 | `generate-pr-description` | Branch diff | PR titel + beschrijving | Genereert een pull request beschrijving |

---

## G. Communicatie & Rapportage

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| G-01 | `format-markdown` | Ruwe tekst | Geformatteerde Markdown | Structureert tekst als Markdown document |
| G-02 | `generate-report` | Data + template type | Gestructureerd rapport | Genereert een rapport in een standaard format |
| G-03 | `draft-email` | Onderwerp + context | E-mail tekst | Schrijft een professionele e-mail |
| G-04 | `create-checklist` | Taak beschrijving | Checklist (Markdown) | Breekt een taak op in een checklist |
| G-05 | `format-table` | Data (JSON/CSV) | Markdown tabel | Formatteert data als leesbare tabel |
| G-06 | `generate-diagram-code` | Beschrijving | Mermaid/PlantUML code | Genereert diagram code uit beschrijving |
| G-07 | `create-status-update` | Projectdata + voortgang | Status update tekst | Schrijft een project status update |

---

## H. Research & Analyse

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| H-01 | `search-codebase` | Zoekterm + scope | Relevante code fragmenten | Doorzoekt de codebase semantisch |
| H-02 | `explain-error` | Error message + stack trace | Uitleg + mogelijke oorzaken | Analyseert een foutmelding |
| H-03 | `find-examples` | Functie/pattern naam | Voorbeelden uit de codebase | Vindt bestaand gebruik van een pattern |
| H-04 | `analyze-architecture` | Directory structuur | Architectuur beschrijving | Beschrijft de structuur van een project |
| H-05 | `compare-approaches` | Twee oplossingen | Pro/con analyse | Vergelijkt twee technische benaderingen |
| H-06 | `estimate-impact` | Wijziging beschrijving | Impact analyse | Schat de impact van een wijziging in |
| H-07 | `find-documentation` | Onderwerp | Relevante docs links/fragmenten | Zoekt documentatie over een onderwerp |
| H-08 | `analyze-dependencies` | Package.json / requirements.txt | Dependency rapport | Analyseert dependencies op risico's en updates |
| H-09 | `profile-codebase` | Directory | Statistieken (talen, regels, bestanden) | Maakt een profiel van de codebase |
| H-10 | `suggest-next-step` | Huidige taak + context | Volgende stap suggestie | Suggereert de logische volgende actie |

---

## I. ERPNext & Business

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| I-01 | `validate-doctype` | DocType JSON | Valid / Invalid + errors | Valideert een ERPNext DocType definitie |
| I-02 | `generate-doctype` | Beschrijving van velden | DocType JSON | Genereert een DocType op basis van beschrijving |
| I-03 | `explain-doctype` | DocType naam | Uitleg van het DocType | Legt uit wat een DocType doet en hoe het werkt |
| I-04 | `generate-whitelisted-api` | Functie beschrijving | Python API endpoint | Genereert een Frappe whitelisted API functie |
| I-05 | `validate-fixtures` | Fixtures JSON | Valid / Invalid + errors | Valideert ERPNext fixtures |
| I-06 | `generate-print-format` | Beschrijving + velden | Jinja print format | Genereert een ERPNext print format |
| I-07 | `check-permissions` | DocType + rol | Permissie matrix | Analyseert de permissie-instellingen |
| I-08 | `generate-client-script` | Beschrijving | JavaScript client script | Genereert een ERPNext client script |
| I-09 | `generate-report-query` | Rapportbeschrijving | Script Report (Python + JS) | Genereert een ERPNext script report |
| I-10 | `validate-naming-series` | Naming pattern | Valid / Invalid + uitleg | Valideert een ERPNext naming series |

---

## Voorbeelden: Flows & Pools

Hieronder voorbeelden van hoe atomaire agents combineerbaar zijn tot krachtige workflows.

### Voorbeeld 1: Automated Code Review (Flow)

```
[D-01 read-file]
  → [B-01 detect-code-language]
  → [E-01 check-style]
  → [B-06 find-bugs]
  → [E-02 check-security]
  → [E-06 check-dead-code]
  → [A-01 summarize] → Samenvatting van alle findings
```

**7 agents, elk doet één ding. Samen: volledige code review.**

### Voorbeeld 2: Smart Translator (Flow)

```
[A-04 detect-language]
  → [A-03 translate] (naar EN)
  → [A-07 fix-grammar]
  → [A-05 rewrite-formal]
```

**4 agents. Input in elke taal, output in formeel Engels.**

### Voorbeeld 3: PR Assistant (Flow)

```
[F-03 list-changed-files]
  → [F-02 summarize-diff]
  → [F-01 generate-commit-msg]
  → [F-08 generate-pr-description]
```

**4 agents. Van branch diff naar complete PR.**

### Voorbeeld 4: Multi-Reviewer (Pool)

```
                    ┌→ [E-01 check-style]
[D-01 read-file] → ├→ [E-02 check-security]
                    ├→ [E-04 check-performance]
                    └→ [E-05 check-naming]
                         ↓ (alle resultaten)
                    [A-01 summarize]
```

**Dispatcher stuurt bestand naar 4 parallelle reviewers, resultaten samengevoegd.**

### Voorbeeld 5: ERPNext Feature Builder (Flow + Pool)

```
[I-02 generate-doctype]
  → ┌→ [I-04 generate-whitelisted-api]
    ├→ [I-08 generate-client-script]
    └→ [I-06 generate-print-format]
       ↓ (alle resultaten)
    [I-01 validate-doctype]
    → [B-09 generate-test]
```

**6 agents. Beschrijf een feature, krijg een compleet ERPNext module.**

### Voorbeeld 6: Intelligent Bug Fixer (Flow)

```
[H-02 explain-error]
  → [H-01 search-codebase] (zoek gerelateerde code)
  → [B-07 suggest-fix]
  → [B-09 generate-test]
  → [F-01 generate-commit-msg]
```

**5 agents. Van error naar fix met test en commit message.**

### Voorbeeld 7: Documentation Generator (Flow)

```
[H-04 analyze-architecture]
  → [D-03 list-files]
  → [B-10 generate-docstring] (per bestand)
  → [G-01 format-markdown]
  → [G-06 generate-diagram-code]
```

**5 agents. Van codebase naar complete documentatie.**

### Voorbeeld 8: Security Audit (Pool + Flow)

```
[D-03 list-files] (alle code bestanden)
  → voor elk bestand:
    ┌→ [E-02 check-security]
    ├→ [B-06 find-bugs]
    └→ [A-15 anonymize] (rapport anonimiseren)
       ↓
    [G-02 generate-report]
```

**Pool over alle bestanden, resultaten in één audit rapport.**

---

## Agent Definitie Structuur

Elke agent wordt gedefinieerd als een minimaal configuratie-object:

```yaml
id: "summarize"
name: "Summarize"
category: "text"
description: "Vat tekst samen tot de kern (3-5 zinnen)"
input: "Tekst (any length)"
output: "Samenvatting (3-5 zinnen)"
model_hint: "haiku"        # haiku = snel/goedkoop, sonnet = standaard, opus = complex
max_tokens: 500
system_prompt: |
  Je bent een samenvatter. Je ontvangt tekst en retourneert een samenvatting
  van maximaal 5 zinnen. Behoud de kernboodschap. Geen inleiding, geen afsluiting,
  alleen de samenvatting.
tools: []                   # Geen tools nodig voor deze agent
```

### Model Routing per Agent

| Agent type | Model | Waarom |
|-----------|-------|--------|
| Classificatie (A-10, A-11, B-01, F-06) | Haiku 4.5 | Alleen categoriseren, minimale kosten |
| Transformatie (C-01..C-10, B-11..B-13) | Haiku 4.5 | Deterministische conversie, snel |
| Generatie (B-09, B-10, B-20, I-02..I-09) | Sonnet 4.6 | Creatieve output, goede kwaliteit |
| Analyse (E-01..E-10, H-01..H-10) | Sonnet 4.6 | Redenering nodig, maar niet maximaal |
| Complexe redenering (H-05, H-06, E-09) | Opus 4.6 | Diepe analyse, meerdere perspectieven |

---

## Groeipad

| Fase | Agents | Bron |
|------|:------:|------|
| MVP (Sprint 2) | 10 | Handmatig gebouwd |
| Beta | 25 | Factory portal |
| v1.0 | 50 | Community + Factory |
| v2.0 | 100+ | Community marketplace |

De library groeit door:
1. **Factory portal** — gebruikers maken agents via wizard of conversatie
2. **Community** — agents delen en importeren
3. **Auto-generatie** — de semantische laag suggereert nieuwe agents op basis van gebruik

---

*100 agents. Elk doet één ding. Combineer ze tot wat je wilt.*
