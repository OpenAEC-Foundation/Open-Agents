# AGENTS.md - Atomic Agent Library

> **Versie**: 2.0
> **Datum**: 2026-02-28
> **Project**: Open-Agents (OpenAEC Foundation)
> **Doel**: 1000+ atomaire agents — het kleinst mogelijke elementaire deeltje
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
| A | Text & Taal | 55 | Tekst verwerken, vertalen, samenvatten, classificeren |
| B | Code & Development | 75 | Code schrijven, genereren, bewerken, converteren |
| C | Code Analyse & Review | 60 | Code beoordelen, bugs vinden, kwaliteit meten |
| D | Data & Transformatie | 55 | Data converteren, valideren, filteren, mappen |
| E | File & System | 45 | Bestanden beheren, doorzoeken, organiseren |
| F | Testing & QA | 55 | Tests genereren, uitvoeren, coverage meten |
| G | Git & Versioning | 45 | Git operaties, branch management, history analyse |
| H | API & Integratie | 50 | API's aanroepen, webhooks, connectors |
| I | Database & Query | 45 | Queries schrijven, schema's beheren, migraties |
| J | Security & Compliance | 50 | Kwetsbaarheden detecteren, compliance checken |
| K | DevOps & Infrastructure | 50 | Containers, CI/CD, monitoring, deployment |
| L | AI & LLM Operations | 60 | Prompts, embeddings, model routing, context |
| M | Orchestratie & Workflow | 45 | Agent orchestratie, task routing, workflow patterns |
| N | Research & Analyse | 45 | Onderzoeken, vergelijken, evalueren |
| O | Communicatie & Rapportage | 45 | Berichten, rapporten, notificaties |
| P | Documentation & Knowledge | 40 | Documentatie genereren, kennisbeheer |
| Q | ERPNext & Frappe | 65 | DocTypes, workflows, reports, scripts |
| R | Finance & Accounting | 35 | Boekhouding, facturen, belastingen |
| S | Project Management & Design | 46 | Planning, UI/UX, wireframes, sprint management |
| T | Search, Context & Multimedia | 49 | Zoeken, context assembly, media verwerking |
| **Totaal** | | **1015** | |

---

## A. Text & Taal

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| A-01 | `summarize` | Long text | Short summary | Vat een tekst samen in een paar zinnen |
| A-02 | `summarize-bullet` | Long text | Bullet-point summary | Vat een tekst samen als opsommingslijst |
| A-03 | `summarize-executive` | Long text | Executive summary | Maakt een managementsamenvatting |
| A-04 | `summarize-technical` | Technical document | Technical summary | Vat technische documentatie samen |
| A-05 | `summarize-one-line` | Any text | Single sentence | Vat een tekst samen in exact één zin |
| A-06 | `translate` | Text + target language | Translated text | Vertaalt tekst naar een doeltaal |
| A-07 | `translate-technical` | Technical text + target language | Translated technical text | Vertaalt technische teksten met behoud van terminologie |
| A-08 | `translate-legal` | Legal text + target language | Translated legal text | Vertaalt juridische teksten met behoud van rechtsbegrippen |
| A-09 | `back-translate` | Text + original language | Back-translated text | Vertaalt tekst terug naar de brontaal voor verificatie |
| A-10 | `detect-language` | Any text | Language code + confidence | Detecteert de taal van een tekst |
| A-11 | `rewrite-formal` | Informal text | Formal text | Herschrijft tekst in een formele stijl |
| A-12 | `rewrite-simple` | Complex text | Simple text | Vereenvoudigt tekst voor een breed publiek |
| A-13 | `rewrite-concise` | Verbose text | Concise text | Maakt tekst korter zonder inhoud te verliezen |
| A-14 | `rewrite-engaging` | Flat text | Engaging text | Herschrijft tekst om leesbaarder en boeiender te maken |
| A-15 | `rewrite-neutral` | Biased or opinionated text | Neutral text | Herschrijft tekst in neutrale, objectieve stijl |
| A-16 | `paraphrase` | Text | Paraphrased text | Parafraseert tekst met behoud van betekenis |
| A-17 | `fix-grammar` | Text with grammar errors | Grammatically correct text | Corrigeert grammaticafouten in een tekst |
| A-18 | `fix-spelling` | Text with spelling errors | Correctly spelled text | Corrigeert spelfouten in een tekst |
| A-19 | `fix-punctuation` | Text with punctuation errors | Correctly punctuated text | Corrigeert interpunctiefouten in een tekst |
| A-20 | `check-readability` | Text | Readability score + feedback | Analyseert leesbaarheid en geeft verbeteradvies |
| A-21 | `extract-keywords` | Text | List of keywords | Extraheert de belangrijkste trefwoorden uit een tekst |
| A-22 | `extract-entities` | Text | Named entity list | Extraheert personen, organisaties en locaties uit tekst |
| A-23 | `extract-dates` | Text | List of dates | Extraheert alle datums en tijdsaanduidingen uit tekst |
| A-24 | `extract-amounts` | Text | List of monetary amounts | Extraheert alle geldbedragen en getallen uit tekst |
| A-25 | `extract-emails` | Text | List of email addresses | Extraheert alle e-mailadressen uit een tekst |
| A-26 | `extract-urls` | Text | List of URLs | Extraheert alle URL's en weblinks uit een tekst |
| A-27 | `extract-phone-numbers` | Text | List of phone numbers | Extraheert alle telefoonnummers uit een tekst |
| A-28 | `extract-action-items` | Text | List of action items | Extraheert concrete actiepunten uit een tekst |
| A-29 | `extract-questions` | Text | List of questions | Extraheert alle vragen uit een tekst |
| A-30 | `extract-names` | Text | List of person names | Extraheert alle personennamen uit een tekst |
| A-31 | `classify-sentiment` | Text | Sentiment label + score | Classificeert het sentiment van een tekst (positief/negatief/neutraal) |
| A-32 | `classify-topic` | Text + topic list | Topic label | Classificeert een tekst naar onderwerp uit een gegeven lijst |
| A-33 | `classify-intent` | Text | Intent label | Classificeert de intentie achter een tekst of bericht |
| A-34 | `classify-urgency` | Text | Urgency level | Classificeert de urgentie van een bericht of verzoek |
| A-35 | `classify-language-level` | Text | Language level (A1-C2) | Bepaalt het taalniveau van een tekst op de CEF-schaal |
| A-36 | `classify-formality` | Text | Formality level | Classificeert het formaliteitsniveau van een tekst |
| A-37 | `generate-title` | Text or topic | Title suggestion | Genereert een passende titel voor een tekst of onderwerp |
| A-38 | `generate-subtitle` | Text + title | Subtitle suggestion | Genereert een ondertitel passend bij de hoofdtitel |
| A-39 | `generate-slug` | Title or text | URL slug | Genereert een URL-vriendelijke slug van een tekst |
| A-40 | `generate-meta-description` | Text or topic | Meta description | Genereert een SEO-geschikte metabeschrijving |
| A-41 | `generate-abstract` | Long document | Abstract | Genereert een wetenschappelijk abstract van een document |
| A-42 | `generate-tl-dr` | Long text | TL;DR paragraph | Genereert een "too long; didn't read" samenvatting |
| A-43 | `count-words` | Text | Word count | Telt het aantal woorden in een tekst |
| A-44 | `count-sentences` | Text | Sentence count | Telt het aantal zinnen in een tekst |
| A-45 | `measure-reading-time` | Text | Reading time in minutes | Berekent de verwachte leestijd van een tekst |
| A-46 | `detect-tone` | Text | Tone label | Detecteert de toon van een tekst (formeel, informeel, agressief, etc.) |
| A-47 | `detect-bias` | Text | Bias report | Detecteert mogelijke vooroordelen of eenzijdigheid in een tekst |
| A-48 | `compare-texts` | Two texts | Similarity/difference report | Vergelijkt twee teksten op overeenkomsten en verschillen |
| A-49 | `find-contradictions` | Text | List of contradictions | Vindt tegenstrijdige uitspraken in een tekst |
| A-50 | `anonymize-pii` | Text with PII | Anonymized text | Verwijdert of vervangt persoonsgegevens in een tekst |
| A-51 | `redact-sensitive` | Text | Redacted text | Zwart-wit maakt gevoelige informatie in een tekst |
| A-52 | `mask-names` | Text with names | Text with masked names | Vervangt persoonsnamen door anonieme placeholders |
| A-53 | `replace-placeholders` | Text + placeholder map | Filled-in text | Vervangt placeholders in een template met opgegeven waarden |
| A-54 | `detect-duplicate-sentences` | Text | List of duplicate sentences | Detecteert dubbele of sterk gelijkende zinnen in een tekst |
| A-55 | `split-text-by-topic` | Long text | List of topic-segmented sections | Splitst een lange tekst in secties per onderwerp |

---

## B. Code & Development

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| B-01 | `detect-code-language` | Code snippet | Language name + confidence | Detecteert de programmeertaal van een codefragment |
| B-02 | `convert-python-to-js` | Python code | JavaScript code | Converteert Python-code naar JavaScript |
| B-03 | `convert-js-to-ts` | JavaScript code | TypeScript code | Converteert JavaScript naar TypeScript met typedefinities |
| B-04 | `convert-es5-to-es6` | ES5 JavaScript | ES6+ JavaScript | Converteert verouderde ES5-code naar moderne ES6+ syntax |
| B-05 | `convert-class-to-function` | Class-based component | Function-based component | Converteert klasse-gebaseerde naar functie-gebaseerde componenten |
| B-06 | `convert-callback-to-async` | Callback-style code | Async/await code | Converteert callback-patronen naar async/await |
| B-07 | `convert-sql-dialect` | SQL query + target dialect | Converted SQL query | Converteert SQL-queries tussen dialecten (PostgreSQL, MySQL, SQLite, etc.) |
| B-08 | `explain-code` | Code snippet | Plain-language explanation | Legt uit wat een stuk code doet in begrijpelijke taal |
| B-09 | `explain-regex` | Regular expression | Plain-language explanation | Legt uit wat een reguliere expressie doet en matcht |
| B-10 | `explain-algorithm` | Algorithm code | Step-by-step explanation | Legt een algoritme stap voor stap uit |
| B-11 | `explain-error-message` | Error message | Plain-language explanation | Legt een foutmelding uit en suggereert oorzaken |
| B-12 | `explain-stack-trace` | Stack trace | Root cause analysis | Analyseert een stack trace en identificeert de oorzaak |
| B-13 | `add-comments` | Uncommented code | Code with inline comments | Voegt inline commentaar toe aan code |
| B-14 | `remove-comments` | Code with comments | Clean code without comments | Verwijdert alle commentaar uit code |
| B-15 | `add-jsdoc` | JavaScript/TypeScript function | Function with JSDoc | Voegt JSDoc-documentatieblokken toe aan functies |
| B-16 | `add-docstring` | Python function or class | Code with docstrings | Voegt Python docstrings toe aan functies en klassen |
| B-17 | `add-type-hints` | Python code without types | Python code with type hints | Voegt Python type hints toe aan functies en variabelen |
| B-18 | `generate-readme-section` | Code or module description | README markdown section | Genereert een README-sectie voor een module of functie |
| B-19 | `format-code` | Unformatted code + language | Formatted code | Formatteert code volgens de standaardconventies van de taal |
| B-20 | `sort-imports` | Code with imports | Code with sorted imports | Sorteert import-statements alfabetisch en op type |
| B-21 | `remove-unused-imports` | Code with imports | Code with clean imports | Verwijdert ongebruikte import-statements uit code |
| B-22 | `add-semicolons` | JavaScript without semicolons | JavaScript with semicolons | Voegt ontbrekende puntkomma's toe aan JavaScript-code |
| B-23 | `convert-tabs-to-spaces` | Code with tabs | Code with spaces | Converteert tab-inspringing naar spatie-inspringing |
| B-24 | `rename-variable` | Code + old name + new name | Refactored code | Hernoemt een variabele consistent door de hele code |
| B-25 | `extract-function` | Code + selection to extract | Code with extracted function | Extraheert een codeselectie naar een aparte functie |
| B-26 | `extract-class` | Code + selection to extract | Code with extracted class | Extraheert logica naar een aparte klasse |
| B-27 | `inline-variable` | Code + variable to inline | Code with inlined variable | Vervangt een variabele door zijn directe waarde (inline) |
| B-28 | `extract-interface` | Class or object code | Extracted interface/type | Extraheert een TypeScript interface of type uit een klasse |
| B-29 | `extract-constant` | Code + magic value | Code with named constant | Extraheert een hardcoded waarde naar een benoemde constante |
| B-30 | `convert-to-enum` | Code with string literals | Code with enum | Converteert herhaalde string-literals naar een enum |
| B-31 | `split-function` | Large function | Multiple smaller functions | Splitst een grote functie op in kleinere, gerichte functies |
| B-32 | `merge-functions` | Two similar functions | Single merged function | Voegt twee vergelijkbare functies samen tot één |
| B-33 | `generate-function` | Function description + signature | Function implementation | Genereert een functie-implementatie op basis van een beschrijving |
| B-34 | `generate-class` | Class description + requirements | Class implementation | Genereert een klassedefinitie op basis van een beschrijving |
| B-35 | `generate-interface` | Interface description | TypeScript interface | Genereert een TypeScript interface op basis van een beschrijving |
| B-36 | `generate-enum` | Enum description + values | Enum definition | Genereert een enum-definitie op basis van opgegeven waarden |
| B-37 | `generate-config` | Config description + format | Config file | Genereert een configuratiebestand op basis van een beschrijving |
| B-38 | `generate-types` | JSON or object example | TypeScript types | Genereert TypeScript-typedefinities op basis van een voorbeeld-object |
| B-39 | `generate-mock-data` | Type or schema | Mock data object | Genereert nep-testdata op basis van een type of schema |
| B-40 | `generate-fixture` | Schema or model | Test fixture | Genereert een testfixture op basis van een datamodel |
| B-41 | `generate-seed-data` | Database schema | SQL or JSON seed data | Genereert seeddata voor een database op basis van het schema |
| B-42 | `generate-factory` | Model or class | Factory function | Genereert een factory-functie voor het aanmaken van objecten |
| B-43 | `minify-code` | Readable code | Minified code | Minificeert code door whitespace en commentaar te verwijderen |
| B-44 | `beautify-code` | Minified or ugly code | Beautified code | Maakt minified of onleesbare code weer leesbaar |
| B-45 | `obfuscate-code` | JavaScript code | Obfuscated code | Maakt JavaScript-code moeilijk leesbaar via obfuscatie |
| B-46 | `deobfuscate-code` | Obfuscated code | Readable code | Maakt geobfusceerde code weer leesbaar |
| B-47 | `tree-shake` | Module code + used exports list | Trimmed module code | Verwijdert ongebruikte exports uit een module |
| B-48 | `generate-regex` | Pattern description in plain text | Regular expression | Genereert een reguliere expressie op basis van een beschrijving |
| B-49 | `validate-regex` | Regular expression | Validity report + issues | Valideert een reguliere expressie op correctheid en valkuilen |
| B-50 | `test-regex` | Regular expression + test strings | Match results | Test een reguliere expressie tegen opgegeven tekinvoer |
| B-51 | `generate-snippet` | Task description + language | Code snippet | Genereert een herbruikbaar codefragment voor een taak |
| B-52 | `generate-boilerplate` | Project type + language | Boilerplate code | Genereert boilerplate-startcode voor een project of module |
| B-53 | `generate-scaffold` | Entity name + fields | Scaffolded CRUD code | Genereert scaffolded CRUD-code voor een entiteit |
| B-54 | `generate-starter` | Framework + feature description | Starter code | Genereert startercode voor een specifiek framework en feature |
| B-55 | `add-error-handling` | Code without error handling | Code with error handling | Voegt foutafhandeling toe aan een stuk code |
| B-56 | `add-try-catch` | Code block | Code wrapped in try-catch | Omhult code met een try-catch blok |
| B-57 | `add-input-validation` | Function code | Function with validation | Voegt invoervalidatie toe aan een functie |
| B-58 | `generate-error-class` | Error name + description | Custom error class | Genereert een aangepaste foutklasse |
| B-59 | `optimize-loop` | Loop code | Optimized loop code | Optimaliseert een lus voor betere prestaties |
| B-60 | `memoize-function` | Function code | Memoized function | Voegt memoization toe aan een functie voor caching van resultaten |
| B-61 | `debounce-function` | Function code | Debounced function | Wikkelt een functie in een debounce voor vertraagde uitvoering |
| B-62 | `throttle-function` | Function code | Throttled function | Wikkelt een functie in een throttle voor beperkte uitvoeringsfrequentie |
| B-63 | `lazy-load` | Import or module code | Lazy-loaded code | Converteert directe imports naar lazy-loading |
| B-64 | `list-dependencies` | Package file (package.json, etc.) | Dependency list | Lijst alle afhankelijkheden op uit een pakketbestand |
| B-65 | `find-unused-dependencies` | Package file + codebase listing | Unused dependency list | Identificeert afhankelijkheden die niet gebruikt worden in de code |
| B-66 | `suggest-alternative-package` | Package name + reason | Alternative package suggestions | Suggereert alternatieve npm/pip-pakketten |
| B-67 | `check-dependency-version` | Package name | Latest version + changelog | Controleert de nieuwste versie van een pakket |
| B-68 | `generate-package-json` | Project description + requirements | package.json | Genereert een package.json op basis van projectvereisten |
| B-69 | `detect-complexity` | Function or file code | Complexity score + report | Berekent de cyclomatische complexiteit van code |
| B-70 | `count-functions` | Code file | Function count + names | Telt en noemt alle functies in een codebestand |
| B-71 | `list-exports` | Module code | List of exported names | Lijst alle exports op van een module |
| B-72 | `list-classes` | Code file | List of class names | Lijst alle klassen op in een codebestand |
| B-73 | `generate-index-file` | List of module files | index.ts / index.js | Genereert een indexbestand dat alle modules re-exporteert |
| B-74 | `detect-dead-code` | Code file | Dead code report | Detecteert onbereikbare of nooit aangeroepen codesecties |
| B-75 | `suggest-refactor` | Code file or function | Refactoring suggestions | Analyseert code en geeft concrete refactor-aanbevelingen |

---

## C. Code Analyse & Review

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| C-01 | `check-style` | Source code + style config | Style violation list | Controleert code op stijlregels conform configuratie |
| C-02 | `check-naming-conventions` | Source code + naming rules | Naming violation list | Detecteert naamgeving die afwijkt van de conventies |
| C-03 | `check-indentation` | Source code | Indentation violation list | Controleert consistentie van inspringing in de code |
| C-04 | `check-line-length` | Source code + max length | Line length violation list | Markeert regels die de maximale regellengte overschrijden |
| C-05 | `check-file-length` | Source file + max lines | File length verdict | Controleert of een bestand de maximale bestandslengte overschrijdt |
| C-06 | `check-function-length` | Source code + max lines | Function length violation list | Detecteert functies die te lang zijn |
| C-07 | `check-nesting-depth` | Source code + max depth | Nesting depth violation list | Controleert hoe diep code genest is |
| C-08 | `check-import-order` | Source code + import rules | Import order violation list | Valideert de volgorde en groepering van imports |
| C-09 | `find-bugs` | Source code | Bug report list | Detecteert algemene programmeerfouten en bugs |
| C-10 | `find-null-pointer` | Source code | Null pointer risk list | Identificeert plaatsen waar null pointer exceptions kunnen optreden |
| C-11 | `find-race-condition` | Source code | Race condition risk list | Detecteert potentiele race conditions in concurrent code |
| C-12 | `find-memory-leak` | Source code | Memory leak risk list | Vindt plaatsen waar geheugen niet vrijgegeven wordt |
| C-13 | `find-infinite-loop` | Source code | Infinite loop risk list | Detecteert lussen die mogelijk nooit eindigen |
| C-14 | `find-off-by-one` | Source code | Off-by-one risk list | Identificeert klassieke off-by-one fouten in loops en indexen |
| C-15 | `find-type-mismatch` | Source code | Type mismatch list | Detecteert type incompatibiliteiten en onjuiste casts |
| C-16 | `find-undefined-variable` | Source code | Undefined variable list | Vindt gebruik van variabelen die niet gedeclareerd zijn |
| C-17 | `find-unreachable-code` | Source code | Unreachable code list | Detecteert code die nooit uitgevoerd kan worden |
| C-18 | `check-sql-injection` | Source code | SQL injection risk list | Controleert op kwetsbaarheden voor SQL-injectie |
| C-19 | `check-xss` | Source code | XSS vulnerability list | Detecteert cross-site scripting kwetsbaarheden |
| C-20 | `check-csrf` | Source code | CSRF vulnerability list | Controleert op ontbrekende CSRF-bescherming |
| C-21 | `check-path-traversal` | Source code | Path traversal risk list | Detecteert kwetsbaarheden voor directory traversal |
| C-22 | `check-command-injection` | Source code | Command injection risk list | Vindt plaatsen waar shell-injectie mogelijk is |
| C-23 | `check-insecure-deserialization` | Source code | Deserialization risk list | Detecteert onveilige deserialisatie van externe data |
| C-24 | `check-hardcoded-secrets` | Source code | Hardcoded secret list | Vindt hardgecodeerde wachtwoorden, tokens en sleutels |
| C-25 | `check-insecure-crypto` | Source code | Weak crypto usage list | Detecteert gebruik van verouderde of zwakke cryptografie |
| C-26 | `check-open-redirect` | Source code | Open redirect risk list | Controleert op kwetsbaarheden voor open redirects |
| C-27 | `check-performance` | Source code | Performance issue list | Analyseert algemene prestatieknelpunten in de code |
| C-28 | `find-n-plus-one` | Source code + ORM hints | N+1 query risk list | Detecteert N+1 querypatronen in database interacties |
| C-29 | `find-unnecessary-render` | Source code (frontend) | Unnecessary render list | Vindt onnodige re-renders in UI-frameworks |
| C-30 | `find-blocking-call` | Source code | Blocking call list | Detecteert blokkerende aanroepen in async contexten |
| C-31 | `find-expensive-operation` | Source code | Expensive operation list | Identificeert rekenintensieve operaties in kritieke paden |
| C-32 | `check-bundle-size` | Build manifest / source | Bundle size report | Analyseert de omvang van JavaScript bundles |
| C-33 | `check-lazy-loading` | Source code (frontend) | Lazy loading gap list | Controleert of resources en routes lazy geladen worden |
| C-34 | `rate-readability` | Source code | Readability score + notes | Geeft een leesbaarheidscore met toelichting per sectie |
| C-35 | `check-solid-principles` | Source code | SOLID violation list | Controleert naleving van de SOLID ontwerpprincipes |
| C-36 | `check-dry` | Source code | DRY violation list | Detecteert schendingen van het Don't Repeat Yourself principe |
| C-37 | `check-separation-of-concerns` | Source code | SoC violation list | Controleert of verantwoordelijkheden goed gescheiden zijn |
| C-38 | `detect-code-smell` | Source code | Code smell list | Identificeert bekende code smells zoals god classes en long methods |
| C-39 | `detect-anti-pattern` | Source code | Anti-pattern list | Detecteert bekende anti-patronen in de codebase |
| C-40 | `check-error-handling` | Source code | Error handling gap list | Controleert of fouten correct afgehandeld en gelogd worden |
| C-41 | `check-logging` | Source code | Logging quality report | Beoordeelt de kwaliteit en volledigheid van logging |
| C-42 | `find-dead-code` | Source code + entry points | Dead code list | Detecteert code die nooit aangeroepen wordt |
| C-43 | `find-unused-variables` | Source code | Unused variable list | Vindt variabelen die gedeclareerd maar nooit gebruikt worden |
| C-44 | `find-unused-functions` | Source code | Unused function list | Detecteert functies die nergens aangeroepen worden |
| C-45 | `find-unused-imports` | Source code | Unused import list | Vindt imports die niet gebruikt worden in het bestand |
| C-46 | `find-unused-types` | Source code (typed) | Unused type list | Detecteert type-definities die nergens gebruikt worden |
| C-47 | `find-unused-css` | CSS + HTML/templates | Unused CSS selector list | Vindt CSS-selectors die niet overeenkomen met enig element |
| C-48 | `find-duplicates` | Source code | Duplicate code list | Detecteert exact gedupliceerde codefragmenten |
| C-49 | `find-similar-functions` | Source code | Similar function list | Vindt functies met vergelijkbare logica die samengevoegd kunnen worden |
| C-50 | `find-copy-paste` | Source code | Copy-paste block list | Detecteert gekopieerde en licht aangepaste codeblokken |
| C-51 | `suggest-deduplication` | Duplicate code report | Refactor suggestion list | Stelt concrete refactoringen voor om duplicatie te verwijderen |
| C-52 | `calculate-complexity` | Source code | Cyclomatic complexity per function | Berekent de cyclomatische complexiteit per functie |
| C-53 | `calculate-maintainability-index` | Source code | Maintainability index score | Berekent de onderhoudbaarheidsindex van de code |
| C-54 | `calculate-coupling` | Source code | Coupling metrics per module | Meet de koppeling tussen modules en klassen |
| C-55 | `calculate-cohesion` | Source code | Cohesion score per module | Berekent de cohesie binnen modules en klassen |
| C-56 | `count-code-lines` | Source code | LOC breakdown | Telt regels code, commentaar en lege regels per bestand |
| C-57 | `count-comment-ratio` | Source code | Comment ratio report | Berekent de verhouding commentaar versus code |
| C-58 | `detect-design-pattern` | Source code | Design pattern list | Herkent gebruikte ontwerppatronen zoals Singleton en Factory |
| C-59 | `detect-framework-usage` | Source code + dependencies | Framework usage map | Detecteert welke frameworks en versies gebruikt worden |
| C-60 | `detect-orm-pattern` | Source code | ORM pattern report | Herkent ORM-gebruikspatronen en query constructies |

---

## D. Data & Transformatie

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| D-01 | `json-to-yaml` | JSON string | YAML string | Converteert JSON naar YAML formaat |
| D-02 | `yaml-to-json` | YAML string | JSON string | Converteert YAML naar JSON formaat |
| D-03 | `csv-to-json` | CSV string + options | JSON array | Converteert CSV-data naar een JSON array van objecten |
| D-04 | `json-to-csv` | JSON array + field list | CSV string | Converteert een JSON array naar CSV formaat |
| D-05 | `xml-to-json` | XML string | JSON string | Converteert XML naar een JSON representatie |
| D-06 | `json-to-xml` | JSON string + root element | XML string | Converteert JSON naar XML formaat met opgegeven rootnaam |
| D-07 | `toml-to-json` | TOML string | JSON string | Converteert TOML configuratie naar JSON formaat |
| D-08 | `json-to-toml` | JSON string | TOML string | Converteert JSON naar TOML configuratieformaat |
| D-09 | `markdown-to-html` | Markdown string | HTML string | Converteert Markdown naar HTML |
| D-10 | `html-to-markdown` | HTML string | Markdown string | Converteert HTML naar Markdown formaat |
| D-11 | `json-to-graphql` | JSON schema | GraphQL type definitions | Genereert GraphQL types op basis van een JSON schema |
| D-12 | `protobuf-to-json` | Protobuf binary + .proto file | JSON string | Deserialiseert Protobuf binair naar JSON |
| D-13 | `validate-json` | JSON string | Validation result + errors | Valideert of een string geldig JSON is |
| D-14 | `parse-json` | JSON string | Parsed object | Parseert JSON naar een gestructureerd object met foutafhandeling |
| D-15 | `flatten-json` | Nested JSON object | Flat key-value object | Maakt een genest JSON-object plat met dot-notatiesleutels |
| D-16 | `unflatten-json` | Flat key-value object | Nested JSON object | Zet een plat object met dot-notatie terug naar geneste structuur |
| D-17 | `merge-json` | Two JSON objects | Merged JSON object | Samenvoegen van twee JSON-objecten met deep merge strategie |
| D-18 | `diff-json` | Two JSON objects | JSON diff report | Toont de verschillen tussen twee JSON-objecten |
| D-19 | `patch-json` | JSON object + JSON patch | Patched JSON object | Past een JSON Patch (RFC 6902) toe op een object |
| D-20 | `sort-json-keys` | JSON object | JSON object (sorted keys) | Sorteert alle sleutels van een JSON-object alfabetisch |
| D-21 | `minify-json` | JSON string | Minified JSON string | Verwijdert witruimte uit JSON voor compacte opslag |
| D-22 | `prettify-json` | JSON string + indent size | Formatted JSON string | Formatteert JSON met inspringing voor leesbaarheid |
| D-23 | `extract-schema` | JSON data sample | JSON Schema | Leidt automatisch een JSON Schema af uit voorbeelddata |
| D-24 | `validate-against-schema` | JSON data + JSON Schema | Validation result + errors | Valideert JSON-data tegen een opgegeven JSON Schema |
| D-25 | `generate-sample-from-schema` | JSON Schema | Sample JSON object | Genereert een voorbeeldobject op basis van een JSON Schema |
| D-26 | `convert-schema-version` | JSON Schema + target version | Converted JSON Schema | Converteert een JSON Schema tussen versies (draft-04/07/2020) |
| D-27 | `merge-schemas` | Two JSON Schemas | Merged JSON Schema | Samenvoegen van twee JSON Schemas tot een gecombineerd schema |
| D-28 | `transform-keys` | Object + key transform function | Transformed object | Past een transformatiefunctie toe op alle sleutels van een object |
| D-29 | `rename-keys` | Object + rename map | Object with renamed keys | Hernoemt specifieke sleutels in een object via een mapping |
| D-30 | `filter-fields` | Object + field filter | Filtered object | Filtert velden van een object op basis van een conditie |
| D-31 | `pick-fields` | Object + field list | Subset object | Selecteert alleen de opgegeven velden uit een object |
| D-32 | `omit-fields` | Object + field list | Object without specified fields | Verwijdert de opgegeven velden uit een object |
| D-33 | `map-values` | Object + value transform function | Object with mapped values | Past een transformatiefunctie toe op alle waarden van een object |
| D-34 | `group-by-key` | Array of objects + key | Grouped object | Groepeert een array van objecten op een opgegeven sleutel |
| D-35 | `sort-array` | Array + sort key/comparator | Sorted array | Sorteert een array op een opgegeven sleutel of comparator |
| D-36 | `filter-array` | Array + filter predicate | Filtered array | Filtert array-elementen op basis van een predicaatfunctie |
| D-37 | `deduplicate-array` | Array + optional key | Deduplicated array | Verwijdert dubbele elementen uit een array |
| D-38 | `chunk-array` | Array + chunk size | Array of chunks | Verdeelt een array in stukken van opgegeven grootte |
| D-39 | `flatten-array` | Nested array + optional depth | Flat array | Maakt een geneste array plat tot de opgegeven diepte |
| D-40 | `zip-arrays` | Two or more arrays | Array of tuples | Combineert meerdere arrays element voor element tot tuples |
| D-41 | `intersect-arrays` | Two arrays + optional key | Intersection array | Geeft de doorsnede van twee arrays terug |
| D-42 | `parse-date` | Date string + optional format | ISO 8601 date string | Parseert een datumstring naar ISO 8601 formaat |
| D-43 | `parse-currency` | Currency string + locale | Numeric amount + currency code | Parseert een valutatekst naar bedrag en valutacode |
| D-44 | `parse-address` | Address string + country | Structured address object | Parseert een adresstring naar gestructureerde velden |
| D-45 | `parse-phone` | Phone number string + region | E.164 phone number | Parseert en normaliseert een telefoonnummer naar E.164 formaat |
| D-46 | `parse-email-header` | Raw email header string | Parsed header object | Parseert e-mailheaders naar gestructureerde velden |
| D-47 | `parse-url` | URL string | URL components object | Parseert een URL naar afzonderlijke componenten |
| D-48 | `parse-csv-line` | CSV line string + delimiter | Field value array | Parseert een enkele CSV-regel naar een array van velden |
| D-49 | `parse-log-line` | Log line string + format | Structured log event | Parseert een logregel naar een gestructureerd event object |
| D-50 | `validate-email` | Email address string | Validation result | Valideert of een e-mailadres syntactisch correct is |
| D-51 | `validate-url` | URL string | Validation result | Valideert of een URL syntactisch correct en bereikbaar is |
| D-52 | `validate-phone` | Phone number string + region | Validation result | Valideert een telefoonnummer voor de opgegeven regio |
| D-53 | `validate-iban` | IBAN string | Validation result + bank info | Valideert een IBAN en extraheert bankinformatie |
| D-54 | `validate-bsn` | BSN string | Validation result | Valideert een Burgerservicenummer via de 11-proef |
| D-55 | `validate-kvk` | KvK number string | Validation result | Valideert een KvK-nummer op formaat en checksum |

---

## E. File & System

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| E-01 | `read-file` | Bestandspad | Bestandsinhoud als tekst | Leest de volledige inhoud van een bestand |
| E-02 | `read-file-head` | Bestandspad, aantal regels (N) | Eerste N regels van het bestand | Leest de eerste N regels van een bestand |
| E-03 | `read-file-tail` | Bestandspad, aantal regels (N) | Laatste N regels van het bestand | Leest de laatste N regels van een bestand |
| E-04 | `read-file-range` | Bestandspad, startlijn, eindlijn | Inhoud van het opgegeven regelbereik | Leest een specifiek regelbereik uit een bestand |
| E-05 | `read-binary-info` | Pad naar binair bestand | Hex-dump en bestandsmetadata | Leest binaire bestandsinformatie als hex-weergave |
| E-06 | `read-file-metadata` | Bestandspad | Metadata-object (mtime, ctime, atime, inode) | Haalt bestandssysteemmetadata op van een bestand |
| E-07 | `read-file-encoding` | Bestandspad | Gedetecteerde tekencodering | Detecteert de tekencodering van een bestand |
| E-08 | `read-file-permissions` | Bestandspad | Permissiebits en eigenaarsinformatie | Leest de bestandspermissies en eigenaar |
| E-09 | `write-file` | Bestandspad, inhoud | Bevestiging van schrijfoperatie | Schrijft inhoud naar een bestand (overschrijft) |
| E-10 | `append-to-file` | Bestandspad, toe te voegen inhoud | Bevestiging van append-operatie | Voegt inhoud toe aan het einde van een bestand |
| E-11 | `prepend-to-file` | Bestandspad, voor te voegen inhoud | Bevestiging van prepend-operatie | Voegt inhoud in aan het begin van een bestand |
| E-12 | `create-file-from-template` | Templatepad, variabelenmap | Nieuw bestand op doelpad | Maakt een bestand aan op basis van een template met variabelen |
| E-13 | `create-temp-file` | Bestandsextensie, optionele inhoud | Pad naar tijdelijk bestand | Maakt een tijdelijk bestand aan in de systeemtempmap |
| E-14 | `write-env-file` | Sleutel-waardeparen als map | .env-bestand op doelpad | Schrijft een .env-bestand vanuit een sleutel-waardemap |
| E-15 | `find-file` | Zoekmap, bestandsnaampatroon | Lijst van gevonden bestandspaden | Zoekt naar bestanden op naam of glob-patroon |
| E-16 | `find-by-extension` | Zoekmap, bestandsextensie | Lijst van bestanden met die extensie | Zoekt alle bestanden met een bepaalde extensie |
| E-17 | `find-by-size` | Zoekmap, minimale en/of maximale grootte | Lijst van bestanden binnen de grootterange | Zoekt bestanden op bestandsgrootte |
| E-18 | `find-by-date` | Zoekmap, datumbereik (van/tot) | Lijst van bestanden gewijzigd in het bereik | Zoekt bestanden op wijzigingsdatum |
| E-19 | `find-by-content` | Zoekmap, zoektekst of regex | Lijst van bestanden met overeenkomende inhoud | Zoekt bestanden die een bepaalde tekst of patroon bevatten |
| E-20 | `find-duplicates-by-hash` | Zoekmap | Groepen van identieke bestanden (op hash) | Vindt dubbele bestanden op basis van inhoudsHash |
| E-21 | `find-large-files` | Zoekmap, drempelgrootte in bytes | Gesorteerde lijst van grote bestanden | Zoekt naar bestanden die groter zijn dan een opgegeven drempel |
| E-22 | `find-empty-files` | Zoekmap | Lijst van bestanden met nul bytes | Vindt alle lege bestanden in een mapstructuur |
| E-23 | `list-files` | Mappad | Lijst van bestanden en mappen | Toont de directe inhoud van een map |
| E-24 | `list-recursive` | Mappad | Volledige recursieve lijst van alle paden | Toont alle bestanden en mappen recursief |
| E-25 | `create-directory` | Doelpad | Bevestiging van aanmaken map | Maakt een nieuwe map aan (inclusief tussenliggende paden) |
| E-26 | `create-directory-structure` | Structuurspecificatie (YAML of JSON) | Bevestiging van aangemaakte mapstructuur | Maakt een volledige mapstructuur aan vanuit een specificatie |
| E-27 | `list-directory-tree` | Mappad, optionele dieptelimiet | Visuele boomstructuur als tekst | Geeft een boomweergave van de mapstructuur |
| E-28 | `count-files-in-dir` | Mappad, optioneel: filter op extensie | Aantal bestanden (integer) | Telt het aantal bestanden in een map |
| E-29 | `count-lines` | Bestandspad | Aantal regels (integer) | Telt het totale aantal regels in een bestand |
| E-30 | `detect-filetype` | Bestandspad | Bestandstype als string | Detecteert het bestandstype op basis van inhoud en extensie |
| E-31 | `detect-encoding` | Bestandspad | Gedetecteerde codering en betrouwbaarheidsscore | Detecteert de tekencodering van een bestand |
| E-32 | `get-file-size` | Bestandspad | Bestandsgrootte in bytes en leesbare vorm | Geeft de bestandsgrootte in bytes en leesbaar formaat |
| E-33 | `get-file-hash` | Bestandspad, hashalgoritme | Hash-digest als hexadecimale string | Berekent de cryptografische hash van een bestand |
| E-34 | `check-file-exists` | Bestandspad | Boolean: bestand bestaat of niet | Controleert of een bestand of map bestaat |
| E-35 | `compare-files` | Pad naar bestand A, pad naar bestand B | Diff-uitvoer met regelverschillen | Vergelijkt twee bestanden en toont de verschillen |
| E-36 | `get-mime-type` | Bestandspad | MIME-type als string | Bepaalt het MIME-type van een bestand |
| E-37 | `rename-file` | Huidig pad, nieuw pad | Bevestiging van hernoemingsoperatie | Hernoemt een bestand of map |
| E-38 | `move-file` | Bronpad, doelpad | Bevestiging van verplaatsingsoperatie | Verplaatst een bestand of map naar een nieuwe locatie |
| E-39 | `copy-file` | Bronpad, doelpad | Bevestiging van kopieeroperatie | Kopieert een bestand of map naar een nieuwe locatie |
| E-40 | `merge-files` | Lijst van bestandspaden, doelpad | Gecombineerd bestand op doelpad | Voegt meerdere bestanden samen tot één bestand |
| E-41 | `split-file` | Bestandspad, splitsstrategie | Lijst van gesplitste bestandspaden | Splitst een bestand in meerdere kleinere bestanden |
| E-42 | `zip-files` | Lijst van bronpaden, doel-zip-pad | Zip-archief op doelpad | Comprimeert bestanden of mappen in een zip-archief |
| E-43 | `unzip-files` | Zip-bestandspad, doelmap | Uitgepakte bestanden in doelmap | Pakt een zip-archief uit naar een doelmap |
| E-44 | `watch-file-changes` | Bestandspad of mappad, pollinginterval | Stroom van wijzigingsgebeurtenissen | Bewaakt een bestand of map op wijzigingen |
| E-45 | `check-disk-usage` | Mappad | Schijfgebruiksrapport per submap | Toont schijfgebruik per map gesorteerd op grootte |

---

## F. Testing & QA

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| F-01 | `generate-unit-test` | Functiecode en taal | Unitteststub met basisasserts | Genereert een enkelvoudige unittest voor een functie |
| F-02 | `generate-test-suite` | Modulecode of klassencode | Volledige testsuite met meerdere testcases | Genereert een complete testsuite voor een module of klasse |
| F-03 | `generate-test-case` | Functiesignatuur en gedragsbeschrijving | Één testcase met arrange-act-assert | Genereert één gerichte testcase voor een specifiek scenario |
| F-04 | `generate-parameterized-test` | Functie en lijst van invoer-uitvoerparen | Geparametriseerde test met dataprovider | Genereert een geparametriseerde test voor meerdere invoersets |
| F-05 | `generate-edge-case-test` | Functiecode | Tests voor randgevallen | Genereert tests die randgevallen en grenzen testen |
| F-06 | `generate-boundary-test` | Functiecode met numerieke parameters | Tests op grenswaarden | Genereert grenswaardentests voor numerieke invoer |
| F-07 | `generate-negative-test` | Functiecode en verwachte foutcondities | Tests die foutpaden testen | Genereert negatieve tests voor foutafhandeling |
| F-08 | `generate-happy-path-test` | Functiecode en succesvol scenario | Test voor het standaard succespad | Genereert een happy-path-test met verwachte invoer |
| F-09 | `generate-integration-test` | Componentbeschrijving en afhankelijkheden | Integratietest | Genereert integratietests voor interactie tussen componenten |
| F-10 | `generate-e2e-test` | Gebruikersflowbeschrijving | End-to-end test (Playwright/Cypress) | Genereert een end-to-end browsertest voor een gebruikersflow |
| F-11 | `generate-snapshot-test` | Componentcode (bijv. React) | Snapshot-testbestand | Genereert een snapshottest voor UI-componenten |
| F-12 | `generate-smoke-test` | Lijst van kritieke endpoints | Basisrooktest | Genereert een smoke test voor basisfunctionaliteit |
| F-13 | `generate-regression-test` | Beschrijving van bugfix | Regressietest | Genereert een regressietest die een bugfix vastlegt |
| F-14 | `generate-load-test-script` | API-endpoint en gewenst RPS | Load-testscript (k6/Locust) | Genereert een load-testscript voor prestatiemetingen |
| F-15 | `generate-stress-test-config` | Systeemspecificaties en stressprofiel | Stress-testconfiguratie | Genereert een stress-testconfiguratie voor capaciteitslimieten |
| F-16 | `generate-api-test` | API-specificatie | API-testbestand | Genereert API-tests vanuit een API-specificatie |
| F-17 | `generate-mock` | Interface of klasse definitie | Mock-implementatie | Genereert een mock-object voor een interface of klasse |
| F-18 | `generate-stub` | Functiesignatuur en terugkeerwaarde | Stubimplementatie | Genereert een stub die een vaste waarde retourneert |
| F-19 | `generate-spy` | Functienaam en module | Spy-implementatie | Genereert een spy die aanroepgedrag registreert |
| F-20 | `generate-fake-data` | Dataschema of type definitie | Gegenereerde nep-testdata | Genereert realistische nepdata op basis van een schema |
| F-21 | `generate-mock-api` | API-eindpunten en responsen | Mock API-serverconfiguratie | Genereert een mock-API voor frontend-ontwikkeling |
| F-22 | `generate-mock-server-config` | Lijst van endpoints met responsen | Serverconfiguratie voor mock-API | Genereert een configuratiebestand voor een mock-server |
| F-23 | `generate-mock-response` | API-eindpunt en responsschema | Voorbeeld JSON-response | Genereert een voorbeeldrespons voor een API-eindpunt |
| F-24 | `generate-test-fixture` | Datamodel of databaseschema | Fixturebestand met testdata | Genereert testfixtures voor database- en integratietests |
| F-25 | `suggest-assertions` | Testcode zonder asserts | Lijst van gesuggereerde assert-statements | Suggereert passende assertions voor een functie |
| F-26 | `generate-custom-matcher` | Beschrijving van te matchen conditie | Aangepaste matcher-implementatie | Genereert een aangepaste testmatcher |
| F-27 | `validate-test-output` | Testuitvoer en verwachte uitkomst | Validatierapport: geslaagd/mislukt | Valideert testuitvoer ten opzichte van verwachte resultaten |
| F-28 | `check-assertion-coverage` | Testbestand | Rapport over geasserte codepaden | Controleert of testassertions alle uitkomsten afdekken |
| F-29 | `check-test-coverage` | Coveragerapport (lcov, JSON) | Samengevat coveragerapport | Parseert en vat een testcoveragerapport samen |
| F-30 | `find-untested-functions` | Broncode en coveragerapport | Lijst van functies zonder testdekking | Vindt functies die niet worden gedekt door tests |
| F-31 | `find-untested-branches` | Broncode en coveragerapport | Lijst van takken zonder testdekking | Vindt conditionele takken die niet worden getest |
| F-32 | `find-untested-paths` | Controlestroom en coveragedata | Lijst van niet-geteste uitvoeringspaden | Vindt uitvoeringspaden die niet worden afgedekt |
| F-33 | `suggest-missing-tests` | Broncode en bestaande tests | Lijst van aanbevolen tests | Suggereert tests die ontbreken op basis van code-analyse |
| F-34 | `calculate-coverage-gap` | Coveragerapport en deksingsdoel | Gap-analyse | Berekent het verschil tussen huidige en doelcoverage |
| F-35 | `check-test-quality` | Testbestand | Kwaliteitsrapport met aanbevelingen | Controleert testbestand op kwaliteitsindicatoren |
| F-36 | `find-flaky-tests` | Testuitvoerlogboeken | Lijst van onstabiele tests | Detecteert tests die inconsistente resultaten geven |
| F-37 | `find-slow-tests` | Testuitvoerlogboek met tijden | Lijst van trage tests | Identificeert tests die de testsuiteuitvoer vertragen |
| F-38 | `find-duplicate-tests` | Testsuite-bestanden | Lijst van semantisch dubbele tests | Vindt tests die hetzelfde scenario testen |
| F-39 | `check-test-isolation` | Testbestand | Rapport over state-lekken | Controleert of tests onafhankelijk kunnen draaien |
| F-40 | `check-test-naming` | Testbestand | Rapport over naamgevingsconventies | Controleert testbenaming op duidelijkheid en consistentie |
| F-41 | `suggest-test-refactor` | Testbestand met problemen | Gerefactorde testversie | Stelt verbeteringen voor in teststructuur |
| F-42 | `generate-test-config` | Projecttype en testraamwerk | Testconfiguratiebestand | Genereert een testconfiguratiebestand voor een project |
| F-43 | `generate-jest-config` | Projectstructuur | jest.config.js bestand | Genereert een Jest-configuratiebestand |
| F-44 | `generate-pytest-config` | Python-projectstructuur | pytest.ini of pyproject.toml sectie | Genereert een pytest-configuratiebestand |
| F-45 | `generate-test-runner-script` | Testraamwerk en CI/CD-omgeving | Shell-script voor tests | Genereert een script voor het uitvoeren van tests |
| F-46 | `generate-ci-test-stage` | CI-platform en testraamwerk | CI-stage voor testuitvoering | Genereert een CI/CD-teststage voor een pijplijn |
| F-47 | `setup-test-database` | Databasetype en schema | Script voor testdatabase | Genereert een script voor testdatabase-initialisatie |
| F-48 | `generate-test-plan` | Projectbeschrijving en scope | Gestructureerd testplan | Genereert een testplan voor een project of feature |
| F-49 | `generate-test-report` | Testuitvoerresultaten | Leesbaar testrapport | Genereert een mensvriendelijk testrapport |
| F-50 | `document-test-coverage` | Coveragerapport en broncode | Gedocumenteerd coverageoverzicht | Genereert documentatie over testdekking per module |
| F-51 | `generate-test-matrix` | Lijst van functies en scenario's | Testmatrix | Genereert een matrix die features aan testscenario's koppelt |
| F-52 | `generate-contract-test` | Twee service-interfaces | Contracttest | Genereert een contracttest voor service-communicatie |
| F-53 | `generate-mutation-test-config` | Broncode en testraamwerk | Mutatietestconfiguratie | Genereert configuratie voor mutatietesten |
| F-54 | `generate-performance-baseline` | Applicatiemetingen | Prestatiebaseline-testscript | Genereert een test die prestaties als basislijn vastlegt |
| F-55 | `generate-accessibility-test` | UI-component of paginacode | Toegankelijkheidstest | Genereert tests die WCAG-normen controleren |

---

## G. Git & Versioning

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| G-01 | `generate-commit-msg` | Git diff | Commitboodschap (Conventional Commits) | Genereert een commitboodschap op basis van een diff |
| G-02 | `validate-commit-msg` | Commitboodschap | Validatierapport: geldig/ongeldig | Valideert een commitboodschap tegen Conventional Commits |
| G-03 | `classify-commit` | Commitboodschap | Committype (feat, fix, docs, etc.) | Classificeert een commitboodschap naar type |
| G-04 | `split-commit-suggestion` | Grote diff | Gesuggereerde opdeling in atomaire commits | Stelt voor hoe een grote commit gesplitst kan worden |
| G-05 | `squash-suggestion` | Lijst van commitboodschappen | Gesuggereerde gecombineerde boodschap | Suggereert hoe meerdere commits samengeperst kunnen worden |
| G-06 | `generate-co-author` | Naam en e-mailadres | Co-Author trailer-regel | Genereert een correcte Co-Authored-By trailer |
| G-07 | `summarize-diff` | Git diff output | Beknopte samenvatting | Vat een git diff samen in begrijpelijke taal |
| G-08 | `explain-diff` | Git diff output | Uitleg van de wijzigingen | Legt uit wat een git diff doet en waarom |
| G-09 | `classify-diff-risk` | Git diff output | Risiconiveau (laag/gemiddeld/hoog) | Beoordeelt het risico van een diff |
| G-10 | `count-diff-lines` | Git diff output | Statistieken: toevoegingen, verwijderingen | Telt de toegevoegde en verwijderde regels |
| G-11 | `extract-diff-files` | Git diff output | Lijst van gewijzigde bestandspaden | Haalt de lijst van gewijzigde bestanden uit een diff |
| G-12 | `diff-to-patch` | Git diff output | Patch-bestand | Converteert een git diff naar een toepasbaar patch-bestand |
| G-13 | `compare-branches` | Branch A naam, branch B naam | Samenvatting van verschillen | Vergelijkt twee branches en toont de verschillen |
| G-14 | `suggest-branch-name` | Taakbeschrijving | Gesuggereerde branchnaam | Genereert een branchnaam op basis van een taakbeschrijving |
| G-15 | `list-stale-branches` | Lijst van branches | Lijst van verouderde branches | Identificeert branches die lang niet zijn bijgewerkt |
| G-16 | `check-branch-behind` | Branchnaam en doelbranch | Aantal commits achter | Controleert hoeveel commits een branch achterloopt |
| G-17 | `suggest-merge-strategy` | Branchhistorie en wijzigingen | Aanbevolen mergestrategie | Suggereert de beste mergestrategie voor een branch |
| G-18 | `check-conflicts` | Twee branches of diffs | Lijst van conflicterende bestanden | Detecteert potentiële mergeconflicten |
| G-19 | `find-merge-base` | Twee branchnamen | Gemeenschappelijke vooroudercommit | Vindt de gemeenschappelijke basiscommit |
| G-20 | `generate-pr-description` | Branch commits en diff | PR-beschrijving | Genereert een uitgebreide pull request beschrijving |
| G-21 | `generate-pr-checklist` | PR-type en projectconventies | PR-checklist in markdown | Genereert een checklist voor pull request review |
| G-22 | `generate-pr-review-comment` | Codediff en reviewopmerking | Geformatteerd review-commentaar | Genereert een review-commentaar voor een diff |
| G-23 | `classify-pr-size` | Aantal gewijzigde bestanden/regels | PR-grootteclassificatie (XS/S/M/L/XL) | Classificeert de grootte van een pull request |
| G-24 | `suggest-pr-reviewers` | Gewijzigde bestanden en eigenaarschapsdata | Lijst van aanbevolen reviewers | Stelt reviewers voor op basis van codebase-kennis |
| G-25 | `generate-pr-title` | Branchnaam en commitboodschappen | Beknopte PR-titel | Genereert een heldere pull request titel |
| G-26 | `split-pr-suggestion` | PR-diff met meerdere features | Gesuggereerde opdeling | Stelt voor hoe een grote PR gesplitst kan worden |
| G-27 | `generate-changelog` | Commitlijst tussen twee versies | CHANGELOG.md sectie | Genereert een changelogentry op basis van commits |
| G-28 | `generate-release-notes` | Commitlijst en versienummer | Gebruikersvriendelijke releasenotes | Genereert leesbare releasenotes voor eindgebruikers |
| G-29 | `generate-version-bump` | Huidige versie en wijzigingstype | Nieuwe versiestring | Berekent het nieuwe versienummer |
| G-30 | `classify-semver-change` | Lijst van wijzigingen | Semver-wijzigingstype: major/minor/patch | Classificeert wijzigingen naar semver-impactniveau |
| G-31 | `list-breaking-changes` | Commitlijst of diff | Lijst van breaking changes | Haalt breaking changes op uit commits of een diff |
| G-32 | `generate-migration-guide` | Lijst van breaking changes | Migratiehandleiding | Genereert een migratiehandleiding |
| G-33 | `find-commit-by-message` | Zoekterm, git-log uitvoer | Lijst van overeenkomende commits | Zoekt commits op basis van een zoekterm |
| G-34 | `find-file-history` | Bestandspad, git-log uitvoer | Chronologische commitgeschiedenis | Geeft de commitgeschiedenis van een bestand |
| G-35 | `find-author-stats` | Git-log uitvoer | Bijdragestatistieken per auteur | Berekent bijdragestatistieken per auteur |
| G-36 | `find-hotspot-files` | Git-log uitvoer | Lijst van meest gewijzigde bestanden | Identificeert bestanden met hoogste wijzigingsfrequentie |
| G-37 | `find-churn-rate` | Git-log uitvoer, tijdperiode | Churnrate per bestand | Berekent de wijzigingsfrequentie per bestand |
| G-38 | `blame-analysis` | Git blame uitvoer | Samenvatting van bijdragers per sectie | Analyseert git blame en vat bijdragen samen |
| G-39 | `find-first-introduction` | Symboolnaam, git-log | Commit van eerste introductie | Vindt wanneer een functie werd geïntroduceerd |
| G-40 | `generate-gitignore` | Projecttype | .gitignore-bestand | Genereert een .gitignore voor een projecttype |
| G-41 | `update-gitignore` | Bestaand .gitignore en nieuwe patronen | Bijgewerkt .gitignore | Voegt nieuwe patronen toe aan .gitignore |
| G-42 | `generate-gitattributes` | Projecttype en bestandstypen | .gitattributes-bestand | Genereert een .gitattributes voor consistente instellingen |
| G-43 | `validate-git-hooks` | Git-hook script en hook-type | Validatierapport | Valideert een git-hook op syntaxfouten |
| G-44 | `generate-pre-commit-hook` | Lijst van kwaliteitsregels | pre-commit hook-script | Genereert een pre-commit hook voor kwaliteitscontroles |
| G-45 | `analyze-repo-stats` | Git-log uitvoer en metadata | Repositorystatistieken | Genereert repositorystatistieken en gezondheidsmetrics |

---

## H. API & Integratie

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| H-01 | `http-get` | URL, headers (optional) | HTTP response (status, body, headers) | Voert een HTTP GET request uit naar een opgegeven URL |
| H-02 | `http-post` | URL, body, headers (optional) | HTTP response (status, body, headers) | Voert een HTTP POST request uit met een opgegeven body |
| H-03 | `http-put` | URL, body, headers (optional) | HTTP response (status, body, headers) | Voert een HTTP PUT request uit voor het volledig vervangen van een resource |
| H-04 | `http-patch` | URL, partial body, headers (optional) | HTTP response (status, body, headers) | Voert een HTTP PATCH request uit voor gedeeltelijke update van een resource |
| H-05 | `http-delete` | URL, headers (optional) | HTTP response (status, body, headers) | Voert een HTTP DELETE request uit om een resource te verwijderen |
| H-06 | `http-head` | URL, headers (optional) | HTTP response headers (no body) | Voert een HTTP HEAD request uit en retourneert alleen de headers |
| H-07 | `http-options` | URL, headers (optional) | Toegestane HTTP-methoden en CORS headers | Voert een HTTP OPTIONS request uit om ondersteunde methoden op te vragen |
| H-08 | `build-url` | Base URL, path segments, query params | Volledige URL string | Assembleert een correcte URL uit losse componenten |
| H-09 | `parse-url-params` | URL string | Gestructureerd object met URL-componenten | Ontleedt een URL naar host, pad, query parameters en fragment |
| H-10 | `build-auth-header` | Auth type, credentials | Authorization header string | Bouwt een correcte Authorization header op basis van het auth-type |
| H-11 | `build-bearer-token` | JWT of access token string | Bearer Authorization header | Wraps een token in een correcte Bearer Authorization header |
| H-12 | `build-basic-auth` | Username, password | Basic Authorization header (base64) | Codeert credentials naar een HTTP Basic Authentication header |
| H-13 | `build-query-string` | Key-value object | URL-gecodeerde query string | Converteert een object naar een correcte URL query string |
| H-14 | `build-form-data` | Key-value object | application/x-www-form-urlencoded body | Converteert een object naar een form-encoded request body |
| H-15 | `build-multipart-request` | Bestanden en velden | multipart/form-data body met boundary | Bouwt een multipart request body op voor bestandsuploads |
| H-16 | `set-content-type` | Data object, gewenst formaat | Headers object met Content-Type header | Stelt de juiste Content-Type header in op basis van het gegevensformaat |
| H-17 | `add-cors-headers` | Response headers, toegestane origins | Response headers inclusief CORS headers | Voegt correcte CORS-headers toe aan een response object |
| H-18 | `parse-response` | HTTP response object | Geparsd body object (JSON, XML of tekst) | Parseert een HTTP response body naar het juiste dataformaat |
| H-19 | `extract-response-data` | HTTP response, JSONPath of veldnaam | Geëxtraheerde waarde uit de response | Extraheert een specifiek veld of pad uit een HTTP response body |
| H-20 | `check-status-code` | HTTP status code | Boolean: success/failure + categorie | Valideert een HTTP statuscode en classificeert de categorie (2xx, 4xx, 5xx) |
| H-21 | `handle-pagination` | API response met paginering metadata | Genormaliseerde paginering informatie | Verwerkt paginering-metadata uit een API-response |
| H-22 | `extract-next-page` | API response, paginering strategie | URL of cursor voor volgende pagina | Extraheert de volgende-pagina-aanwijzer uit een gepagineerde response |
| H-23 | `aggregate-paginated-results` | Lijst van gepagineerde responses | Samengevoegde resultatenlijst | Combineert meerdere gepagineerde API-responses tot één resultaatlijst |
| H-24 | `parse-error-response` | HTTP error response | Gestructureerd foutobject (code, bericht, details) | Parseert een API-foutresponse naar een gestandaardiseerd foutobject |
| H-25 | `generate-openapi-spec` | API beschrijving (endpoints, modellen) | OpenAPI 3.0 YAML of JSON specificatie | Genereert een volledige OpenAPI-specificatie op basis van een API-beschrijving |
| H-26 | `validate-openapi-spec` | OpenAPI YAML of JSON bestand | Validatierapport met fouten en waarschuwingen | Valideert een OpenAPI-specificatie op correctheid en volledigheid |
| H-27 | `generate-api-client` | OpenAPI spec, doeltaal | API client code in de opgegeven taal | Genereert een typed API client op basis van een OpenAPI-specificatie |
| H-28 | `generate-api-types` | OpenAPI spec, doeltaal | Type definities (interfaces, schemas) | Genereert type-definities op basis van OpenAPI schema's |
| H-29 | `generate-api-docs` | OpenAPI spec of API beschrijving | Markdown of HTML API documentatie | Genereert leesbare API-documentatie vanuit een OpenAPI-specificatie |
| H-30 | `extract-endpoints-from-spec` | OpenAPI spec | Lijst van endpoints (methode, pad, operatie-ID) | Extraheert alle API-endpoints uit een OpenAPI-specificatie |
| H-31 | `generate-postman-collection` | OpenAPI spec of endpoint lijst | Postman Collection JSON | Converteert een API-specificatie naar een importeerbare Postman Collection |
| H-32 | `generate-webhook-handler` | Webhook event schema, doeltaal | Webhook handler code | Genereert een handler functie voor het verwerken van een specifiek webhook-event |
| H-33 | `validate-webhook-signature` | Webhook payload, signature, secret | Boolean: geldig/ongeldig | Verifieert de HMAC-signature van een inkomende webhook request |
| H-34 | `parse-webhook-payload` | Webhook raw payload, event type | Gestructureerd event object | Parseert en normaliseert een webhook payload naar een gestandaardiseerd formaat |
| H-35 | `generate-webhook-config` | Service naam, events, endpoint URL | Webhook configuratie object of YAML | Genereert de configuratie voor het registreren van een webhook bij een service |
| H-36 | `test-webhook-endpoint` | Endpoint URL, sample payload | Test response en validatieresultaat | Stuurt een test webhook payload naar een endpoint en valideert de response |
| H-37 | `rest-to-graphql` | REST endpoint definitie | GraphQL query of mutation | Converteert een REST API call naar een equivalente GraphQL operatie |
| H-38 | `graphql-to-rest` | GraphQL query of mutation | REST endpoint aanroep | Converteert een GraphQL operatie naar een equivalente REST API aanroep |
| H-39 | `soap-to-rest` | WSDL of SOAP request/response | REST equivalent endpoint en datamodel | Converteert een SOAP service definitie naar een REST API equivalent |
| H-40 | `convert-api-version` | API request, bronversie, doelversie | Geconverteerde API request voor doelversie | Converteert een API-aanroep tussen verschillende versies van dezelfde API |
| H-41 | `generate-api-gateway-config` | API routes en policies | API Gateway configuratie (AWS/Kong/nginx) | Genereert een API Gateway configuratiebestand op basis van route definities |
| H-42 | `generate-retry-logic` | Max pogingen, backoff strategie, foutcodes | Retry decorator of middleware code | Genereert retry-logica met configureerbare backoff voor foutafhandeling |
| H-43 | `generate-circuit-breaker` | Foutdrempel, timeout, herstelvenster | Circuit breaker implementatie code | Genereert een circuit breaker patroon voor het afschermen van falende services |
| H-44 | `generate-rate-limiter` | Max requests, tijdvenster, strategie | Rate limiter middleware code | Genereert rate limiting logica voor het beperken van API-aanroepen |
| H-45 | `generate-request-queue` | Concurrency limiet, prioriteit strategie | Request queue implementatie code | Genereert een request queue voor gecontroleerde verwerking van API-aanroepen |
| H-46 | `generate-batch-request` | Lijst van requests, batch grootte | Batch request implementatie code | Genereert logica voor het groeperen van API-aanroepen in efficiënte batches |
| H-47 | `generate-polling-config` | Endpoint URL, interval, stopcriterium | Polling implementatie code | Genereert een polling mechanisme voor het periodiek bevragen van een API |
| H-48 | `generate-oauth-flow` | OAuth grant type, client config | OAuth flow implementatie code | Genereert de volledige OAuth 2.0 authenticatieflow voor een opgegeven grant type |
| H-49 | `generate-api-key-manager` | API key opslag strategie, rotatie interval | API key management code | Genereert code voor het veilig opslaan, roteren en valideren van API keys |
| H-50 | `generate-health-check` | Service endpoint, check criteria | Health check endpoint implementatie | Genereert een health check endpoint dat de beschikbaarheid van een service bewaakt |

---

## I. Database & Query

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| I-01 | `generate-select` | Tabel, kolommen, condities (optional) | SQL SELECT statement | Genereert een SQL SELECT statement op basis van opgegeven tabel en filters |
| I-02 | `generate-insert` | Tabel, kolomnamen, waarden | SQL INSERT statement | Genereert een SQL INSERT statement voor het toevoegen van één of meerdere rijen |
| I-03 | `generate-update` | Tabel, te updaten velden, WHERE conditie | SQL UPDATE statement | Genereert een SQL UPDATE statement voor het wijzigen van bestaande rijen |
| I-04 | `generate-delete` | Tabel, WHERE conditie | SQL DELETE statement | Genereert een SQL DELETE statement met de opgegeven filterconditie |
| I-05 | `generate-join` | Tabellen, join type, join conditie | SQL JOIN clausule | Genereert een SQL JOIN clausule voor het combineren van meerdere tabellen |
| I-06 | `generate-subquery` | Outer query context, inner query doel | SQL subquery | Genereert een SQL subquery voor gebruik in een WHERE, FROM of SELECT clausule |
| I-07 | `generate-aggregate` | Tabel, aggregatiefunctie, groepering | SQL aggregatie query | Genereert een SQL query met GROUP BY en aggregatiefuncties (SUM, COUNT, AVG) |
| I-08 | `generate-window-function` | Partitionering, ordening, window functie | SQL window function expressie | Genereert een SQL window function voor berekeningen over gerelateerde rijen |
| I-09 | `generate-cte` | CTE naam, subquery, hoofdquery | SQL WITH (CTE) statement | Genereert een Common Table Expression voor leesbare, herbruikbare subqueries |
| I-10 | `generate-create-table` | Tabelnaam, kolom definities, constraints | SQL CREATE TABLE statement | Genereert een volledig SQL CREATE TABLE statement met kolommen en constraints |
| I-11 | `generate-alter-table` | Tabelnaam, gewenste wijzigingen | SQL ALTER TABLE statement | Genereert een SQL ALTER TABLE statement voor het aanpassen van een tabelstructuur |
| I-12 | `generate-index` | Tabel, kolommen, index type | SQL CREATE INDEX statement | Genereert een SQL CREATE INDEX statement voor het optimaliseren van queries |
| I-13 | `generate-constraint` | Tabel, constraint type, kolommen | SQL constraint definitie | Genereert een SQL constraint definitie (UNIQUE, CHECK, NOT NULL) |
| I-14 | `generate-foreign-key` | Tabel, referentietabel, kolommen, cascade | SQL FOREIGN KEY constraint | Genereert een SQL FOREIGN KEY constraint met cascade-opties |
| I-15 | `generate-view` | View naam, SELECT query definitie | SQL CREATE VIEW statement | Genereert een SQL VIEW voor het opslaan van een herbruikbare query |
| I-16 | `generate-trigger` | Tabel, event (INSERT/UPDATE/DELETE), actie | SQL CREATE TRIGGER statement | Genereert een database trigger die automatisch uitvoert bij een tabelgebeurtenis |
| I-17 | `generate-stored-procedure` | Procedure naam, parameters, logica | SQL stored procedure code | Genereert een stored procedure voor het inkapselen van herbruikbare database logica |
| I-18 | `generate-migration` | Schema wijzigingen beschrijving, database type | Migratiescript (SQL of ORM formaat) | Genereert een database migratiescript voor het doorvoeren van schemawijzigingen |
| I-19 | `generate-rollback` | Bestaand migratiescript | Rollback script dat de migratie ongedaan maakt | Genereert een rollback script op basis van een bestaand migratiescript |
| I-20 | `generate-seed` | Tabel, aantal rijen, data patroon | SQL INSERT seed data script | Genereert een seed script met testdata voor het vullen van een database |
| I-21 | `compare-schemas` | Schema A definitie, Schema B definitie | Lijst van verschillen tussen de schema's | Vergelijkt twee databaseschema's en rapporteert de structurele verschillen |
| I-22 | `generate-diff-migration` | Huidig schema, gewenst schema | Migratiescript voor het verschil | Genereert automatisch een migratiescript op basis van het schemaverschil |
| I-23 | `validate-migration-order` | Lijst van migratiescripts met afhankelijkheden | Gevalideerde uitvoervolgorde of foutmelding | Valideert en bepaalt de correcte uitvoervolgorde van migratiescripts |
| I-24 | `generate-data-migration` | Bronschema, doelschema, transformatieregels | Data migratiescript | Genereert een script voor het migreren en transformeren van data tussen schema's |
| I-25 | `explain-query` | SQL query, database type | Query execution plan analyse | Genereert een uitleg van het query execution plan en identificeert knelpunten |
| I-26 | `suggest-index` | SQL query of tabel statistieken | Index aanbevelingen | Analyseert een query en stelt de meest effectieve indexen voor |
| I-27 | `find-slow-query` | Query log of lijst van queries | Lijst van trage queries gesorteerd op kostprijs | Identificeert de traagste queries op basis van execution statistieken |
| I-28 | `optimize-query` | SQL query (traag) | Geoptimaliseerde SQL query met uitleg | Herschrijft een trage SQL query naar een efficiëntere variant |
| I-29 | `detect-n-plus-one` | ORM code of query log | N+1 probleem locaties en hersteladvies | Detecteert het N+1 query probleem in ORM-code of query logs |
| I-30 | `detect-full-table-scan` | SQL query of execution plan | Waarschuwing en optimalisatieadvies | Detecteert full table scans in queries en stelt indexering voor |
| I-31 | `suggest-denormalization` | Databaseschema, frequent gebruikte queries | Denormalisatie aanbevelingen | Analyseert queriepatronen en stelt schema-denormalisaties voor bij prestatieknelpunten |
| I-32 | `generate-model` | Tabelschema, ORM type, doeltaal | ORM model klasse code | Genereert een ORM model klasse op basis van een tabelschema definitie |
| I-33 | `generate-relation` | Twee modellen, relatietype (1:1, 1:N, N:M) | ORM relatie definitie code | Genereert ORM relatie definities tussen twee model klassen |
| I-34 | `generate-scope` | Model, filterconditie beschrijving | ORM scope definitie | Genereert een herbruikbare query scope voor een ORM model |
| I-35 | `generate-validator` | Model, validatieregels per veld | ORM validator code | Genereert validatieregels voor een ORM model op basis van businessregels |
| I-36 | `sequelize-to-prisma` | Sequelize model definitie | Prisma schema equivalent | Converteert een Sequelize model definitie naar een Prisma schema definitie |
| I-37 | `prisma-to-sequelize` | Prisma schema definitie | Sequelize model equivalent | Converteert een Prisma schema definitie naar een Sequelize model definitie |
| I-38 | `generate-prisma-schema` | Tabelschema of domeinmodel | Prisma schema bestand | Genereert een volledig Prisma schema op basis van een domeinmodel |
| I-39 | `generate-typeorm-entity` | Tabelschema, TypeScript types | TypeORM entity klasse | Genereert een TypeORM entity klasse met decorators op basis van een tabelschema |
| I-40 | `generate-backup-script` | Database type, verbindingsparameters | Backup shell script | Genereert een geautomatiseerd backup script voor een specifieke database |
| I-41 | `generate-restore-script` | Database type, backup bestandsformaat | Restore shell script | Genereert een restore script voor het terugzetten van een database backup |
| I-42 | `generate-dump` | Database type, schema of data selectie | Database dump commando | Genereert het commando voor het maken van een database dump |
| I-43 | `generate-import-script` | Bestandsformaat (CSV/JSON), doeltabel | Import script of SQL COPY commando | Genereert een script voor het importeren van externe data in een database tabel |
| I-44 | `generate-data-sanitizer` | Tabel, gevoelige kolommen | SQL of script dat gevoelige data maskeert | Genereert een script dat productiedata sanitized voor gebruik in testomgevingen |
| I-45 | `generate-anonymizer` | Tabel schema, privacygevoelige velden | Anonimiseringsscript (GDPR-compliant) | Genereert een script dat persoonsgegevens onomkeerbaar anonimiseert |

---

## J. Security & Compliance

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| J-01 | `scan-owasp-top10` | Broncode of API spec | Rapport met OWASP Top 10 bevindingen | Scant code op alle OWASP Top 10 kwetsbaarheden en rapporteert bevindingen |
| J-02 | `check-sql-injection` | Broncode, SQL query patronen | Lijst van SQL injection kwetsbaarheden | Detecteert SQL injection kwetsbaarheden in databasequery's en ORM-aanroepen |
| J-03 | `check-xss-vulnerability` | Broncode, template bestanden | Lijst van XSS kwetsbaarheden | Detecteert Cross-Site Scripting kwetsbaarheden in output rendering code |
| J-04 | `check-csrf-protection` | Broncode, route definities | CSRF beschermingsstatus per formulier/endpoint | Controleert of formulieren en state-wijzigende endpoints CSRF-bescherming hebben |
| J-05 | `check-ssrf` | Broncode, URL-verwerkende functies | Lijst van potentiële SSRF kwetsbaarheden | Detecteert Server-Side Request Forgery kwetsbaarheden in URL-verwerkende code |
| J-06 | `check-path-traversal` | Broncode, bestandstoegang code | Lijst van path traversal kwetsbaarheden | Detecteert directory traversal kwetsbaarheden in bestandssysteemtoegang |
| J-07 | `check-command-injection` | Broncode, shell aanroepen | Lijst van command injection kwetsbaarheden | Detecteert command injection kwetsbaarheden in shell- en subproces-aanroepen |
| J-08 | `check-insecure-deserialization` | Broncode, serialisatie aanroepen | Lijst van onveilige deserialisatie locaties | Detecteert onveilige deserialisatie van niet-vertrouwde data |
| J-09 | `check-broken-auth` | Broncode, authenticatie implementatie | Rapport van gebroken authenticatie patronen | Detecteert gebroken authenticatie en sessiebeheer kwetsbaarheden |
| J-10 | `check-security-misconfiguration` | Configuratiebestanden, environment variabelen | Lijst van beveiligingsmisconfiguraties | Detecteert onveilige standaardinstellingen en beveiligingsmisconfiguraties |
| J-11 | `detect-hardcoded-secrets` | Broncode bestanden | Lijst van hardcoded secrets met locaties | Scant broncode op hardcoded wachtwoorden, API keys en andere geheimen |
| J-12 | `scan-env-files` | .env bestanden of omgevingsconfiguratie | Risicobeoordeling van omgevingsvariabelen | Analyseert .env bestanden op gevoelige data die niet gecommit mag worden |
| J-13 | `generate-secret-rotation` | Secret type, opslagmechanisme | Secret rotatie procedure en code | Genereert een procedure en code voor het automatisch roteren van secrets |
| J-14 | `validate-password-policy` | Wachtwoordbeleid regels, wachtwoord string | Boolean: voldoet/voldoet niet + reden | Valideert een wachtwoord tegen een opgegeven wachtwoordbeleid |
| J-15 | `generate-password-hash` | Plaintext wachtwoord, hashing algoritme | Gehashte wachtwoordstring | Genereert een veilige wachtwoordhash met het opgegeven algoritme (bcrypt/argon2) |
| J-16 | `check-api-key-exposure` | Broncode, configuratiebestanden | Lijst van blootgestelde API keys | Detecteert API keys die onbedoeld zijn opgenomen in broncode of configuratie |
| J-17 | `scan-git-history-secrets` | Git repository pad of commit reeks | Lijst van secrets in git geschiedenis | Scant de volledige git geschiedenis op per ongeluk gecommitte secrets |
| J-18 | `generate-encryption-key` | Algoritme, sleutellengte | Cryptografisch sterke sleutel (hex/base64) | Genereert een cryptografisch sterke encryptiesleutel van de opgegeven lengte |
| J-19 | `suggest-encryption-algorithm` | Data type, use case, compliance vereisten | Aanbevolen encryptie algoritme met motivatie | Adviseert het meest geschikte encryptie algoritme voor een specifieke use case |
| J-20 | `check-tls-config` | TLS configuratie of server adres | TLS configuratie bevindingen en aanbevelingen | Controleert TLS/SSL configuratie op verouderde protocollen en zwakke cipher suites |
| J-21 | `validate-certificate` | SSL/TLS certificaat of domeinnaam | Certificaat geldigheid en details | Valideert een SSL/TLS certificaat op geldigheid, vervaldatum en chain |
| J-22 | `check-cipher-suite` | Lijst van cipher suites | Classificatie per cipher (veilig/verouderd/onveilig) | Beoordeelt cipher suites op veiligheid en adviseert over uitfasering |
| J-23 | `generate-csp-header` | Toegestane bronnen per resource type | Content-Security-Policy header waarde | Genereert een strikte Content Security Policy header op basis van de toegestane bronnen |
| J-24 | `generate-cors-policy` | Toegestane origins, methoden, headers | CORS configuratie object of middleware | Genereert een correcte CORS-policy configuratie voor een API of webserver |
| J-25 | `generate-rbac-config` | Rollen, permissies, resource definities | RBAC configuratie schema | Genereert een Role-Based Access Control configuratie op basis van rollen en permissies |
| J-26 | `validate-jwt-claims` | JWT token, verwachte claims | Boolean: geldig/ongeldig + afwijkende claims | Valideert de inhoud van JWT claims tegen verwachte waarden en tijdslimieten |
| J-27 | `check-permission-matrix` | Huidige permissie matrix, beleidsregels | Afwijkingen van het gewenste beleid | Controleert een permissie matrix op overtredingen van het minste privilege principe |
| J-28 | `generate-auth-middleware` | Auth strategie, doelframework | Authenticatie middleware code | Genereert authenticatie middleware voor een opgegeven framework en auth-strategie |
| J-29 | `check-session-config` | Sessie configuratieparameters | Bevindingen en aanbevelingen voor sessie veiligheid | Controleert sessiebeheer configuratie op onveilige instellingen |
| J-30 | `generate-2fa-setup` | 2FA methode (TOTP/SMS), platform | 2FA implementatie code en setup flow | Genereert de implementatie voor twee-factor authenticatie in een applicatie |
| J-31 | `validate-oauth-config` | OAuth configuratie parameters | Validatierapport met beveiligingsbevindingen | Valideert een OAuth 2.0 configuratie op correctheid en beveiligingsproblemen |
| J-32 | `check-gdpr-compliance` | Applicatiecode of architectuurbeschrijving | GDPR compliance rapport met bevindingen | Controleert een applicatie op naleving van GDPR-vereisten |
| J-33 | `check-pci-compliance` | Betalingsverwerking code en configuratie | PCI-DSS compliance bevindingen | Controleert betaalkaartverwerking op naleving van PCI-DSS vereisten |
| J-34 | `generate-privacy-policy-check` | Privacybeleid tekst, verwerkte data types | Checklist van ontbrekende of onvolledige onderdelen | Controleert een privacybeleid op volledigheid voor de verwerkte gegevenstypen |
| J-35 | `check-data-retention` | Data retentiebeleid, opgeslagen data types | Afwijkingen van het retentiebeleid | Controleert of dataverwerkingspraktijken voldoen aan het retentiebeleid |
| J-36 | `generate-dpia` | Verwerkingsactiviteit beschrijving | Data Protection Impact Assessment concept | Genereert een concept DPIA op basis van de beschrijving van gegevensverwerking |
| J-37 | `check-cookie-compliance` | Cookie implementatie, cookie namen en waarden | Cookie compliance rapport (GDPR/ePrivacy) | Controleert cookiegebruik op compliance met GDPR en de ePrivacy Richtlijn |
| J-38 | `check-accessibility-compliance` | HTML broncode of URL | Accessibility rapport (WCAG 2.1 niveau AA) | Controleert webpagina's op naleving van WCAG 2.1 toegankelijkheidsrichtlijnen |
| J-39 | `generate-input-sanitizer` | Input type, verwachte data formaat | Input sanitisatie functie code | Genereert code voor het sanitiseren van gebruikersinvoer voor een specifiek formaat |
| J-40 | `generate-output-encoder` | Output context (HTML/SQL/shell), data type | Output encoding functie code | Genereert contextspecifieke output encoding om injectie-aanvallen te voorkomen |
| J-41 | `validate-file-upload` | Bestand, toegestane types en limieten | Boolean: toegestaan/geweigerd + reden | Valideert een geüpload bestand op type, grootte en potentiële gevaren |
| J-42 | `check-content-type` | Request headers, verwachte content type | Boolean: correct/incorrect + afwijking | Valideert de Content-Type header van een request tegen het verwachte formaat |
| J-43 | `generate-rate-limit-config` | Endpoint, max requests, tijdvenster | Rate limiting configuratie of middleware | Genereert rate limiting configuratie voor het beschermen van een endpoint |
| J-44 | `generate-ip-whitelist` | Lijst van toegestane IP-adressen of CIDR ranges | IP whitelist configuratie | Genereert een IP whitelist configuratie voor het beperken van toegang |
| J-45 | `check-request-size-limit` | Request configuratie, framework type | Aanbevelingen voor request grootte limieten | Controleert of er effectieve limieten zijn voor request body groottes |
| J-46 | `generate-audit-log` | Te loggen events, data velden, opslagmechanisme | Audit logging implementatie code | Genereert onveranderlijke audit logging voor beveiligingsrelevante applicatiegebeurtenissen |
| J-47 | `generate-security-report` | Scan resultaten van beveiligingstools | Geconsolideerd beveiligingsrapport | Combineert bevindingen van meerdere beveiligingsscans tot één overzichtelijk rapport |
| J-48 | `generate-vulnerability-report` | CVE lijst of scan output | Geprioriteerd kwetsbaarhedenrapport | Genereert een geprioriteerd rapport van kwetsbaarheden met hersteladvies |
| J-49 | `generate-compliance-checklist` | Compliance standaard (ISO27001/SOC2/NEN7510) | Compliance checklist met status per vereiste | Genereert een gedetailleerde compliance checklist voor een specifieke standaard |
| J-50 | `generate-threat-model` | Systeem architectuur beschrijving | STRIDE threat model met mitigaties | Genereert een gestructureerd dreigingsmodel op basis van de systeemarchitectuur |

---

## K. DevOps & Infrastructure

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| K-01 | `generate-dockerfile` | Application type, language, version, dependencies | Dockerfile | Genereert een Dockerfile voor een applicatie op basis van taal en configuratie |
| K-02 | `optimize-dockerfile` | Existing Dockerfile | Optimized Dockerfile with explanations | Optimaliseert een bestaande Dockerfile voor kleinere images en betere build-snelheid |
| K-03 | `generate-docker-compose` | Services list, ports, volumes, environment | docker-compose.yml | Genereert een docker-compose.yml voor een multi-service applicatie |
| K-04 | `validate-docker-compose` | docker-compose.yml content | Validation report, list of errors/warnings | Valideert een docker-compose.yml op syntaxis en best practices |
| K-05 | `generate-dockerignore` | Project structure, language, framework | .dockerignore file | Genereert een .dockerignore bestand passend bij het project |
| K-06 | `analyze-image-layers` | Dockerfile or image name | Layer breakdown, size per layer, optimization hints | Analyseert de lagen van een Docker image en geeft optimalisatieadvies |
| K-07 | `suggest-base-image` | Language, version, use case (prod/dev), size preference | Recommended base image with rationale | Stelt de meest geschikte Docker base image voor op basis van requirements |
| K-08 | `generate-multi-stage-build` | Application type, build steps, runtime requirements | Multi-stage Dockerfile | Genereert een multi-stage Dockerfile voor kleinere productie-images |
| K-09 | `check-docker-security` | Dockerfile content | Security report, list of vulnerabilities and fixes | Controleert een Dockerfile op bekende beveiligingsrisico's en geeft aanbevelingen |
| K-10 | `generate-github-action` | Trigger events, steps, environment, secrets needed | GitHub Actions workflow YAML | Genereert een GitHub Actions workflow voor CI/CD |
| K-11 | `generate-gitlab-ci` | Stages, jobs, environment, runners | .gitlab-ci.yml | Genereert een GitLab CI/CD pipeline configuratie |
| K-12 | `generate-jenkins-pipeline` | Build stages, test commands, deploy targets | Jenkinsfile (declarative pipeline) | Genereert een declaratieve Jenkins pipeline configuratie |
| K-13 | `generate-ci-stage` | Stage name, commands, conditions, artifacts | CI stage definition (YAML/Groovy snippet) | Genereert een enkele CI-stage definitie voor gebruik in een pipeline |
| K-14 | `generate-deploy-step` | Target environment, deployment method, rollback strategy | Deploy step configuration | Genereert een deploy-stap voor een CI/CD pipeline |
| K-15 | `generate-release-workflow` | Versioning strategy, changelog format, release targets | Release workflow YAML | Genereert een volledig release-workflow voor geautomatiseerde versioning en releases |
| K-16 | `validate-ci-config` | CI config file content (any format) | Validation report with errors and warnings | Valideert een CI/CD configuratiebestand op syntaxis en logische fouten |
| K-17 | `generate-matrix-build` | Language versions, OS targets, environment combinations | Matrix build configuration | Genereert een matrix-build configuratie voor meerdere taal- en omgevingscombinaties |
| K-18 | `generate-cache-config` | Package manager, language, CI platform | Cache configuration for CI | Genereert een cache-configuratie voor dependencies in een CI/CD pipeline |
| K-19 | `generate-k8s-manifest` | Application name, image, replicas, resources | Kubernetes manifest YAML | Genereert een Kubernetes manifest voor een applicatie |
| K-20 | `generate-deployment` | App name, image, replicas, env vars, resource limits | Kubernetes Deployment YAML | Genereert een Kubernetes Deployment resource definitie |
| K-21 | `generate-service` | App name, port, service type (ClusterIP/NodePort/LoadBalancer) | Kubernetes Service YAML | Genereert een Kubernetes Service resource definitie |
| K-22 | `generate-ingress` | Host, paths, TLS config, backend services | Kubernetes Ingress YAML | Genereert een Kubernetes Ingress resource voor HTTP routing |
| K-23 | `generate-configmap` | Key-value pairs, namespace, app label | Kubernetes ConfigMap YAML | Genereert een Kubernetes ConfigMap voor applicatieconfiguratie |
| K-24 | `generate-secret` | Secret name, key-value pairs (base64 or plaintext), namespace | Kubernetes Secret YAML | Genereert een Kubernetes Secret definitie met gecodeerde waarden |
| K-25 | `generate-hpa` | Deployment name, min/max replicas, CPU/memory targets | Kubernetes HorizontalPodAutoscaler YAML | Genereert een HPA voor automatisch schalen van pods op basis van load |
| K-26 | `validate-k8s-manifest` | Kubernetes YAML manifest | Validation report with schema and best practice errors | Valideert een Kubernetes manifest op schema-conformiteit en best practices |
| K-27 | `generate-helm-chart` | App name, chart type, values, templates needed | Helm chart directory structure and files | Genereert een Helm chart voor het deployen van een applicatie op Kubernetes |
| K-28 | `generate-kustomize` | Base manifests, overlays (dev/staging/prod), patches | Kustomization.yaml and overlay files | Genereert een Kustomize configuratie voor environment-specifieke Kubernetes deployments |
| K-29 | `generate-terraform` | Cloud provider, resources needed, region, naming conventions | Terraform .tf files | Genereert Terraform configuratiebestanden voor cloud infrastructure |
| K-30 | `generate-ansible-playbook` | Target hosts, tasks, variables, handlers | Ansible playbook YAML | Genereert een Ansible playbook voor server configuratie en deployment |
| K-31 | `generate-cloudformation` | AWS resources, stack name, parameters | CloudFormation template (JSON/YAML) | Genereert een AWS CloudFormation template voor infrastructure provisioning |
| K-32 | `validate-terraform` | Terraform .tf file content | Validation report with errors, warnings, security issues | Valideert Terraform configuraties op syntaxis, best practices en beveiligingsrisico's |
| K-33 | `generate-terraform-module` | Module purpose, input variables, output values, resources | Terraform module directory with main.tf, variables.tf, outputs.tf | Genereert een herbruikbare Terraform module met volledige bestandsstructuur |
| K-34 | `generate-pulumi` | Cloud provider, language (TypeScript/Python), resources | Pulumi program files | Genereert een Pulumi infrastructure-as-code programma in de gewenste taal |
| K-35 | `generate-prometheus-rules` | Service name, metrics, alert thresholds, labels | Prometheus alerting rules YAML | Genereert Prometheus alerting rules voor monitoring van een service |
| K-36 | `generate-grafana-dashboard` | Metrics to visualize, time range, panel types | Grafana dashboard JSON | Genereert een Grafana dashboard JSON voor visualisatie van metrics |
| K-37 | `generate-alert-config` | Alert conditions, severity levels, notification channels | Alert manager configuration | Genereert een alertconfiguratie voor monitoring tools zoals Alertmanager of PagerDuty |
| K-38 | `generate-log-config` | Log format, output targets, log levels, retention | Logging configuration (fluentd/logstash/vector) | Genereert een log-aggregatieconfiguratie voor gecentraliseerde logging |
| K-39 | `generate-healthcheck` | Service type, endpoint, expected response, timeout | Healthcheck configuration or script | Genereert een healthcheck definitie voor containers of load balancers |
| K-40 | `generate-uptime-monitor` | URL, check interval, alert contacts, regions | Uptime monitor configuration (e.g. Uptime Kuma, Checkly) | Genereert een uptime monitor configuratie voor beschikbaarheidsmonitoring |
| K-41 | `check-service-status` | Service name, endpoint URL, expected status code | Status report (up/down, latency, response details) | Controleert de status van een service en rapporteert beschikbaarheid en latentie |
| K-42 | `generate-deploy-script` | Target environment, deployment steps, rollback steps | Shell deployment script | Genereert een shell script voor geautomatiseerde deployment naar een omgeving |
| K-43 | `generate-rollback-script` | Deployment method, previous version, restore steps | Shell rollback script | Genereert een rollback script om terug te keren naar een vorige versie |
| K-44 | `generate-blue-green-config` | Load balancer type, blue/green environments, switch strategy | Blue-green deployment configuration | Genereert een blue-green deployment configuratie voor zero-downtime releases |
| K-45 | `generate-canary-config` | Traffic split percentage, metrics thresholds, rollout steps | Canary deployment configuration | Genereert een canary deployment configuratie voor geleidelijke traffic-verschuiving |
| K-46 | `generate-feature-flag` | Flag name, default value, rollout percentage, targeting rules | Feature flag configuration (LaunchDarkly/Unleash/custom) | Genereert een feature flag definitie voor gecontroleerde feature releases |
| K-47 | `generate-env-config` | Environment name, variables list with types and defaults | .env file or environment configuration | Genereert een omgevingsconfiguratie met alle benodigde variabelen en standaardwaarden |
| K-48 | `validate-env-vars` | .env file or environment variable list, required variables spec | Validation report with missing/invalid variables | Valideert omgevingsvariabelen op volledigheid en correctheid ten opzichte van een spec |
| K-49 | `generate-nginx-config` | Domain names, upstreams, SSL, locations, proxy settings | nginx.conf or site configuration | Genereert een Nginx configuratie voor webserver of reverse proxy gebruik |
| K-50 | `generate-ssl-config` | Domain, certificate paths, TLS version requirements | SSL/TLS configuration block for nginx/apache | Genereert een SSL/TLS configuratieblok met moderne beveiligingsinstellingen |

---

## L. AI & LLM Operations

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| L-01 | `generate-system-prompt` | Role description, task context, constraints, tone | System prompt text | Genereert een systeem-prompt voor een AI-agent op basis van rol en taakomschrijving |
| L-02 | `optimize-prompt` | Existing prompt, target model, desired output quality | Optimized prompt with change explanation | Optimaliseert een bestaande prompt voor betere kwaliteit en consistentie van output |
| L-03 | `convert-prompt-format` | Prompt text, source format, target format (e.g. OpenAI to Anthropic) | Converted prompt in target format | Converteert een prompt van het ene naar het andere model-formaat |
| L-04 | `add-few-shot-examples` | Prompt, task description, example input-output pairs | Prompt extended with few-shot examples | Voegt few-shot voorbeelden toe aan een prompt voor betere modelsturing |
| L-05 | `generate-chain-of-thought` | Task description, reasoning steps needed | Chain-of-thought prompt or reasoning template | Genereert een chain-of-thought prompt die het model aanstuurt tot stapsgewijze redenering |
| L-06 | `generate-prompt-template` | Task type, variable placeholders, format requirements | Prompt template with placeholder syntax | Genereert een herbruikbaar promptsjabloon met variabele placeholders |
| L-07 | `validate-prompt` | Prompt text, intended model, expected behavior | Validation report with improvement suggestions | Valideert een prompt op duidelijkheid, volledigheid en mogelijke problemen |
| L-08 | `test-prompt-variants` | Base prompt, list of variations to test, test inputs | Variant comparison report | Genereert een testrapport voor meerdere promptvarianten op dezelfde invoer |
| L-09 | `generate-prompt-guard` | Topic restrictions, forbidden outputs, safety requirements | Guard prompt or system-level safety instructions | Genereert een beveiligingsprompt die ongewenste modeloutput voorkomt |
| L-10 | `extract-prompt-variables` | Prompt template text | List of variable names and their expected types | Extraheert alle variabele placeholders uit een promptsjabloon met typebeschrijvingen |
| L-11 | `classify-task-complexity` | Task description or user query | Complexity level (simple/medium/complex) with rationale | Classificeert de complexiteit van een taak voor model routing en resource allocatie |
| L-12 | `suggest-model` | Task description, complexity level, cost constraints, latency requirements | Recommended model with rationale | Stelt het meest geschikte LLM voor op basis van taak, kosten en latentie-eisen |
| L-13 | `estimate-token-cost` | Prompt text, model name, expected output length | Estimated cost in USD and token counts | Schat de token-kosten van een promptuitvoering op een specifiek model |
| L-14 | `calculate-tokens` | Text or prompt, model name | Token count per message/role | Berekent het exacte aantal tokens voor een tekst op een specifiek model |
| L-15 | `check-context-limit` | Prompt text, model name, conversation history | Boolean within-limit, tokens used, tokens remaining | Controleert of een prompt en conversatiegeschiedenis binnen de contextlimiet van een model valt |
| L-16 | `optimize-context-window` | Messages list, token budget, importance scores | Pruned messages list within token budget | Optimaliseert de inhoud van een contextvenster binnen een opgegeven tokenbudget |
| L-17 | `generate-model-config` | Model preferences, temperature, top-p, max tokens, stop sequences | Model configuration JSON/YAML | Genereert een modelconfiguratie met alle relevante parameters voor een API-aanroep |
| L-18 | `compare-model-outputs` | Prompt, output from model A, output from model B | Comparison report with quality dimensions | Vergelijkt de output van twee modellen op een set kwaliteitsdimensies |
| L-19 | `generate-fallback-chain` | Primary model, fallback models, error conditions | Fallback chain configuration | Genereert een fallback-keten van modellen voor wanneer een primair model faalt of te traag is |
| L-20 | `assemble-context` | Available snippets, user query, token budget | Assembled context string within budget | Assembleert relevante kennisfragmenten tot een samenhangende context voor een model |
| L-21 | `prioritize-context` | Context items with relevance scores, token budget | Prioritized list of context items to include | Prioriteert contextfragmenten op relevantie binnen een tokenbudget |
| L-22 | `compress-context` | Context text, compression ratio target | Compressed context preserving key information | Comprimeert een contexttekst tot een kortere versie met behoud van essentiële informatie |
| L-23 | `extract-relevant-context` | User query, knowledge base items | List of relevant context items with relevance scores | Extraheert de meest relevante kennisfragmenten voor een gebruikersvraag |
| L-24 | `chunk-for-context` | Long document, max chunk size, overlap size | List of overlapping text chunks | Splitst een lang document in overlappende chunks voor contextvenster gebruik |
| L-25 | `generate-context-summary` | Conversation history or context items | Concise summary of key information | Genereert een beknopte samenvatting van conversatiegeschiedenis of contextfragmenten |
| L-26 | `measure-context-usage` | Current context, model name | Usage report with percentages and breakdown | Meet het huidige contextgebruik en geeft een gedetailleerd overzicht per sectie |
| L-27 | `trim-context-to-limit` | Context text, model name, target token count | Trimmed context within token limit | Knipt een context bij tot het opgegeven tokenlimiet met behoud van de belangrijkste informatie |
| L-28 | `generate-context-window-report` | Context components, model name | Context window utilization report | Genereert een rapport over contextvensterbenutting en inefficiënties |
| L-29 | `generate-embedding-config` | Embedding model, dimensions, batch size, similarity metric | Embedding configuration JSON | Genereert een configuratie voor een embedding-model met alle relevante parameters |
| L-30 | `chunk-for-embedding` | Document text, chunk strategy, chunk size, overlap | List of text chunks ready for embedding | Splitst tekst in chunks die geoptimaliseerd zijn voor embedding-modellen |
| L-31 | `calculate-similarity` | Vector A, vector B, similarity metric | Similarity score (cosine/dot/euclidean) | Berekent de gelijkenis tussen twee embedding-vectoren met de opgegeven metriek |
| L-32 | `find-nearest-neighbors` | Query vector, vector index, k neighbors | Top-k nearest neighbor results with scores | Vindt de k meest gelijkaardige vectoren in een index voor een gegeven queryvector |
| L-33 | `cluster-embeddings` | List of embedding vectors, k clusters or auto | Cluster assignments and centroid vectors | Groepeert embedding-vectoren in clusters op basis van semantische gelijkenis |
| L-34 | `generate-embedding-index` | Document chunks, embedding model, index type | Embedding index configuration and schema | Genereert een configuratie voor een embedding-index (bijv. Pinecone, Weaviate, Qdrant) |
| L-35 | `deduplicate-by-embedding` | List of text chunks with embeddings, similarity threshold | Deduplicated list of chunks | Verwijdert semantische duplicaten uit een lijst van tekstfragmenten op basis van embeddings |
| L-36 | `generate-rag-pipeline` | Data sources, embedding model, vector store, retrieval strategy | RAG pipeline configuration | Genereert een volledige RAG-pipeline configuratie inclusief indexering en retrieval |
| L-37 | `chunk-document` | Document text, document type, chunking strategy | List of document chunks with metadata | Splitst een document in semantisch coherente chunks voor RAG-indexering |
| L-38 | `generate-retrieval-query` | User question, conversation history, query expansion settings | Optimized retrieval query or query list | Genereert een geoptimaliseerde retrievalquery voor een vectordatabase uit een gebruikersvraag |
| L-39 | `rank-retrieved-results` | Query, list of retrieved chunks, reranking model | Reranked list of chunks with scores | Herordent opgehaalde RAG-resultaten op relevantie met een reranking-model |
| L-40 | `generate-rag-prompt` | User question, retrieved context chunks, prompt template | Final RAG prompt for LLM | Genereert een definitieve prompt voor een LLM op basis van de vraag en opgehaalde context |
| L-41 | `validate-retrieval-quality` | Query, retrieved chunks, expected answer | Retrieval quality report with precision/recall estimates | Valideert de kwaliteit van RAG-retrievalresultaten voor een gegeven query |
| L-42 | `generate-knowledge-base-config` | Data sources, update frequency, embedding settings | Knowledge base configuration YAML | Genereert een configuratie voor een kennisbank inclusief bronnen en updatestrategie |
| L-43 | `generate-agent-config` | Agent name, role, tools, model, system prompt | Agent configuration JSON | Genereert een volledige agent-configuratie met rol, tools en modelinstellingen |
| L-44 | `generate-agent-team` | Task description, required capabilities, agent count | Agent team configuration with roles | Genereert een teamconfiguratie van samenwerkende agents voor een complexe taak |
| L-45 | `generate-agent-chain` | Ordered list of agent roles, handoff data format | Agent chain configuration | Genereert een sequentiële keten van agents waarbij de output van de ene de input van de volgende is |
| L-46 | `generate-agent-pool` | Agent type, pool size, task queue settings | Agent pool configuration | Genereert een pool-configuratie van gelijksoortige agents voor parallelle taakverwerking |
| L-47 | `generate-dispatcher-config` | Task types, routing rules, target agents | Dispatcher configuration | Genereert een dispatcher-configuratie die taken naar de juiste agent routeert op basis van regels |
| L-48 | `generate-orchestrator-prompt` | Team members, task description, coordination style | Orchestrator system prompt | Genereert een systeem-prompt voor een orchestrator-agent die een team van agents aanstuurt |
| L-49 | `generate-handoff-logic` | Source agent, target agent, handoff conditions, data schema | Handoff logic definition | Genereert de overdrachtslogica tussen agents inclusief conditie- en dataschema-definities |
| L-50 | `generate-agent-skills-config` | Agent role, available skills, skill parameters | Skills configuration for agent | Genereert een skills-configuratie voor een agent met beschikbare capabilities en parameters |
| L-51 | `generate-tool-definition` | Tool name, description, parameters with types and descriptions | Tool definition JSON (OpenAI/Anthropic format) | Genereert een tool-definitie in het formaat van een LLM provider voor function calling |
| L-52 | `validate-tool-schema` | Tool schema JSON, provider format | Validation report with schema errors | Valideert een tool-schema op conformiteit met de provider-specificatie |
| L-53 | `generate-tool-handler` | Tool definition, implementation language, tool logic description | Tool handler function code | Genereert de implementatiecode voor een tool-handler op basis van de tool-definitie |
| L-54 | `generate-mcp-server-config` | Server name, tools to expose, transport type | MCP server configuration JSON | Genereert een Model Context Protocol server-configuratie voor het blootstellen van tools |
| L-55 | `generate-function-calling-spec` | Function name, parameters, return type, provider | Function calling specification | Genereert een function calling-specificatie voor een specifieke LLM-provider |
| L-56 | `test-tool-invocation` | Tool definition, test inputs, expected outputs | Tool invocation test report | Genereert een testrapport voor een tool-aanroep op basis van testinvoer en verwachte uitvoer |
| L-57 | `generate-tool-permission` | Tool name, allowed callers, rate limits, scope | Tool permission configuration | Genereert een permissieconfiguratie die bepaalt welke agents een tool mogen aanroepen |
| L-58 | `generate-eval-dataset` | Task description, input schema, n examples | Evaluation dataset with input-output pairs | Genereert een evaluatiedataset met invoer-uitvoerparen voor het testen van een LLM-taak |
| L-59 | `generate-eval-rubric` | Task description, quality dimensions, scoring scale | Evaluation rubric document | Genereert een beoordelingsrubric voor het evalueren van modeloutput op meerdere dimensies |
| L-60 | `generate-training-data` | Task description, examples, output format for fine-tuning | Fine-tuning training dataset (JSONL) | Genereert trainingsdata in het fine-tuning formaat van een LLM-provider |

---

## M. Orchestratie & Workflow

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| M-01 | `generate-sequential-flow` | List of steps with agent names and data schema | Sequential flow configuration | Genereert een sequentiële flow waarbij stappen één voor één worden uitgevoerd |
| M-02 | `generate-parallel-flow` | List of parallel branches with agent assignments | Parallel flow configuration | Genereert een parallelle flow waarbij meerdere agent-takken gelijktijdig worden uitgevoerd |
| M-03 | `generate-conditional-flow` | Condition expression, true-branch, false-branch agents | Conditional flow configuration | Genereert een conditionele flow met vertakking op basis van een evaluatie-uitkomst |
| M-04 | `generate-loop-flow` | Loop body agents, exit condition, max iterations | Loop flow configuration | Genereert een lus-flow die een set agents herhaalt totdat een exitconditie bereikt wordt |
| M-05 | `generate-map-reduce-flow` | Map agent, reduce agent, input collection schema | Map-reduce flow configuration | Genereert een map-reduce flow voor parallelle verwerking en aggregatie van resultaten |
| M-06 | `generate-fan-out-fan-in` | Fan-out targets, aggregation strategy, timeout | Fan-out/fan-in flow configuration | Genereert een fan-out/fan-in flow voor het verspreiden en samenvoegen van parallelle taken |
| M-07 | `generate-pipeline-config` | Pipeline name, stages with agents, inter-stage data format | Pipeline configuration | Genereert een volledige pipeline-configuratie met meerdere verwerkingsstages |
| M-08 | `validate-flow-config` | Flow configuration (any format) | Validation report with errors and cycle detection | Valideert een flow-configuratie op syntaxis, ontbrekende agents en circulaire afhankelijkheden |
| M-09 | `generate-dispatcher` | Task queue, routing rules, target agent pool | Dispatcher configuration | Genereert een dispatcher die binnenkomende taken naar de juiste agent of pool routeert |
| M-10 | `generate-router` | Input schema, routing rules, destination agents | Router configuration | Genereert een router die berichten op basis van inhoud naar de juiste agent stuurt |
| M-11 | `generate-load-balancer` | Agent pool, load balancing algorithm, health check config | Load balancer configuration | Genereert een load balancer configuratie voor gelijkmatige verdeling van taken over een agent-pool |
| M-12 | `classify-task-for-routing` | Task description or message, routing taxonomy | Task classification with target agent/queue | Classificeert een binnenkomende taak voor routing naar de juiste agent of wachtrij |
| M-13 | `generate-priority-queue` | Queue name, priority levels, ordering rules | Priority queue configuration | Genereert een prioriteitswachtrij-configuratie voor het verwerken van taken op prioriteit |
| M-14 | `generate-work-stealing` | Worker pool, queue config, steal threshold | Work-stealing scheduler configuration | Genereert een work-stealing scheduler zodat inactieve workers taken overnemen van drukke workers |
| M-15 | `generate-round-robin` | Agent pool, queue settings | Round-robin dispatcher configuration | Genereert een round-robin dispatcher die taken gelijkmatig over agents verdeelt |
| M-16 | `generate-content-based-router` | Message schema, routing rules by content field | Content-based router configuration | Genereert een content-based router die berichten routeert op basis van inhoudsvelden |
| M-17 | `generate-task-definition` | Task name, description, input schema, output schema, agent | Task definition JSON | Genereert een formele taakdefinitie met invoer- en uitvoerschema voor een agent |
| M-18 | `decompose-task` | High-level task description, available agents | List of subtasks with agent assignments | Splitst een complexe taak op in atomaire deeltaken met agent-toewijzingen |
| M-19 | `estimate-task-duration` | Task definition, historical data or complexity estimate | Duration estimate with confidence interval | Schat de verwachte uitvoeringstijd van een taak op basis van complexiteit en historische data |
| M-20 | `prioritize-tasks` | List of tasks with metadata, prioritization criteria | Prioritized task list with scores | Prioriteert een lijst van taken op basis van opgegeven criteria zoals urgentie en impact |
| M-21 | `generate-task-dependency-graph` | List of tasks with dependencies | Dependency graph (DOT/JSON format) | Genereert een afhankelijkheidsgraph van taken voor visualisatie en plannin |
| M-22 | `validate-task-dependencies` | Task list with dependency declarations | Validation report with cycle detection and missing dependencies | Valideert taakafhankelijkheden op circulaire verwijzingen en ontbrekende definities |
| M-23 | `generate-task-queue` | Queue name, tasks, ordering strategy, worker count | Task queue configuration | Genereert een taakwachtrij-configuratie met ordening en concurrency-instellingen |
| M-24 | `assign-task-to-agent` | Task definition, available agents with capabilities | Agent assignment with rationale | Wijst een taak toe aan de meest geschikte agent op basis van capabilities en belasting |
| M-25 | `create-session` | Session ID, initial state, agent config, user context | Session object with state | Maakt een nieuwe agent-sessie aan met initiële staat en contextinformatie |
| M-26 | `resume-session` | Session ID, session snapshot | Restored session object with state | Herneemt een eerder opgeslagen agent-sessie vanuit een snapshot |
| M-27 | `fork-session` | Parent session ID, fork parameters | New child session object | Splitst een agent-sessie in een kindversie voor parallelle verwerking van varianten |
| M-28 | `merge-session-results` | List of session results, merge strategy | Merged result object | Voegt de resultaten van meerdere (geforceerde) agent-sessies samen tot één resultaat |
| M-29 | `generate-session-snapshot` | Session object with current state | Session snapshot JSON | Genereert een snapshot van de huidige sessiestate voor persistentie of herstel |
| M-30 | `restore-from-snapshot` | Session snapshot JSON | Restored session state | Herstelt een agent-sessie uit een eerder opgeslagen snapshot |
| M-31 | `track-session-state` | Session ID, state update event | Updated session state record | Verwerkt een state-update event en houdt de sessiestate actueel |
| M-32 | `generate-session-report` | Session ID, session history | Session summary report | Genereert een overzichtsrapport van een voltooide agent-sessie met acties en resultaten |
| M-33 | `generate-retry-strategy` | Error type, max retries, backoff algorithm, jitter settings | Retry strategy configuration | Genereert een retry-strategie configuratie voor foutafhandeling in agent-flows |
| M-34 | `generate-fallback-agent` | Primary agent, fallback agent, trigger conditions | Fallback agent configuration | Genereert een fallback-agentconfiguratie die activeert wanneer de primaire agent faalt |
| M-35 | `generate-circuit-breaker-flow` | Protected agent, failure threshold, timeout, half-open config | Circuit breaker configuration | Genereert een circuit breaker configuratie die overbelaste agents tijdelijk uitschakelt |
| M-36 | `generate-dead-letter-queue` | Source queue, failure conditions, retention settings | Dead-letter queue configuration | Genereert een dead-letter queue configuratie voor het opvangen van onverwerkte berichten |
| M-37 | `handle-timeout` | Agent name, timeout duration, timeout action | Timeout handler configuration | Genereert een timeout-afhandelaar die acties onderneemt wanneer een agent te lang duurt |
| M-38 | `generate-compensation-flow` | Original flow steps, compensation actions per step | Compensation flow configuration (saga pattern) | Genereert een compensatieflow voor het ongedaan maken van stappen bij een gefaalde transactie |
| M-39 | `generate-error-recovery` | Error types, recovery strategies, escalation path | Error recovery configuration | Genereert een foutherstelconfiguratie met strategieën per fouttype en escalatiepad |
| M-40 | `track-flow-progress` | Flow instance ID, current step, completed steps | Progress tracking record | Registreert en rapporteert de voortgang van een lopende flow-instantie |
| M-41 | `measure-flow-duration` | Flow instance ID, start time, end time | Duration report per step and total | Meet de doorlooptijd van een flow-instantie per stap en als geheel |
| M-42 | `count-flow-steps` | Flow configuration | Step count breakdown by type | Telt het aantal stappen in een flow-configuratie uitgesplitst naar type |
| M-43 | `generate-flow-visualization` | Flow configuration | Flow diagram (Mermaid or DOT format) | Genereert een visuele representatie van een flow als Mermaid- of Graphviz-diagram |
| M-44 | `log-flow-event` | Flow instance ID, event type, event data | Structured log entry | Registreert een flow-event als gestructureerde logentry voor audit en debugging |
| M-45 | `generate-flow-metrics` | Flow instance history | Metrics report (throughput, latency, error rate) | Genereert een metriekenrapport voor een flow op basis van historische uitvoeringsdata |

---

## N. Research & Analyse

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| N-01 | `search-codebase` | Query string + codebase path | List of matching file locations with context | Doorzoekt de codebase op een tekstpatroon of symbool |
| N-02 | `find-usage` | Symbol name + codebase path | List of files and lines where symbol is used | Vindt alle plaatsen waar een symbool wordt gebruikt |
| N-03 | `find-definition` | Symbol name + codebase path | File path + line number of definition | Zoekt de definitie van een functie, klasse of variabele |
| N-04 | `find-references` | Symbol name + codebase path | List of all references across files | Geeft alle verwijzingen naar een specifiek symbool |
| N-05 | `find-implementations` | Interface or abstract type + codebase path | List of concrete implementations | Vindt alle implementaties van een interface of abstracte klasse |
| N-06 | `find-callers` | Function name + codebase path | List of functions that call the target | Geeft alle aanroepers van een specifieke functie |
| N-07 | `trace-call-chain` | Entry function + codebase path | Ordered list of function calls in chain | Traceert de volledige aanroepketen van een functie |
| N-08 | `find-related-files` | File path + codebase path | List of files with direct or indirect relation | Vindt bestanden die gerelateerd zijn aan een opgegeven bestand |
| N-09 | `map-module-dependencies` | Module name + codebase path | Dependency graph (JSON or text) | Brengt alle afhankelijkheden van een module in kaart |
| N-10 | `explain-error` | Error message or stack trace | Plain-language explanation of error | Legt een foutmelding uit in begrijpelijke taal |
| N-11 | `classify-error-type` | Error message or stack trace | Error category (e.g., runtime, syntax, logic) | Classificeert het type fout op basis van de foutmelding |
| N-12 | `find-root-cause` | Error message + relevant code context | Root cause description | Analyseert de onderliggende oorzaak van een fout |
| N-13 | `suggest-error-fix` | Error message + code snippet | Suggested fix with explanation | Stelt een oplossing voor op basis van de foutmelding |
| N-14 | `trace-error-origin` | Error message + codebase path | File and line where error originates | Spoort de herkomst van een fout op in de code |
| N-15 | `find-similar-errors` | Error message + error history | List of similar past errors | Zoekt vergelijkbare fouten in de geschiedenis |
| N-16 | `generate-error-report` | Error details + context | Structured error report (markdown) | Genereert een gestructureerd rapport over een fout |
| N-17 | `correlate-errors` | Multiple error messages | Grouping of related errors with shared cause | Correleert meerdere fouten om gedeelde oorzaken te vinden |
| N-18 | `analyze-architecture` | Codebase path or architecture description | Architecture summary with key components | Analyseert de architectuur van een applicatie |
| N-19 | `detect-layers` | Codebase path | List of detected architectural layers | Detecteert de lagen in een gelaagde applicatiearchitectuur |
| N-20 | `map-dependencies` | Codebase path | Full dependency map (JSON or diagram data) | Brengt alle externe en interne afhankelijkheden in kaart |
| N-21 | `find-circular-dependencies` | Codebase path | List of circular dependency chains | Detecteert circulaire afhankelijkheden in de code |
| N-22 | `measure-coupling` | Module or codebase path | Coupling score per module | Meet de mate van koppeling tussen modules |
| N-23 | `measure-cohesion` | Module or file path | Cohesion score with explanation | Meet de interne samenhang van een module of bestand |
| N-24 | `suggest-refactoring` | Code or module with issues | Prioritized list of refactoring suggestions | Stelt refactoringverbeteringen voor op basis van analyse |
| N-25 | `generate-architecture-diagram` | Codebase path or module list | Mermaid or PlantUML diagram source | Genereert een architectuurdiagram van de codebase |
| N-26 | `compare-approaches` | Two or more approaches (text descriptions) | Comparison table with trade-offs | Vergelijkt meerdere aanpakken op voor- en nadelen |
| N-27 | `compare-libraries` | Library names + use case | Comparison table with criteria scores | Vergelijkt softwarebibliotheken op relevante criteria |
| N-28 | `compare-frameworks` | Framework names + use case | Structured comparison with recommendation | Vergelijkt frameworks op basis van de vereisten |
| N-29 | `compare-algorithms` | Algorithm names + problem description | Performance and trade-off comparison | Vergelijkt algoritmen op complexiteit en toepasbaarheid |
| N-30 | `compare-performance` | Benchmark results or profiling data | Ranked performance comparison | Vergelijkt prestaties van implementaties of systemen |
| N-31 | `compare-api-designs` | Two or more API specifications | Side-by-side design comparison | Vergelijkt API-ontwerpen op consistentie en bruikbaarheid |
| N-32 | `generate-decision-matrix` | Options + criteria with weights | Weighted decision matrix (markdown table) | Genereert een gewogen beslissingsmatrix voor opties |
| N-33 | `estimate-impact` | Proposed change description + codebase path | Impact estimate (scope, risk, effort) | Schat de impact van een voorgestelde wijziging in |
| N-34 | `find-affected-files` | Changed file or symbol + codebase path | List of files affected by the change | Vindt alle bestanden die worden geraakt door een wijziging |
| N-35 | `find-affected-tests` | Changed file or symbol + test suite path | List of test files that cover the changed code | Vindt alle tests die worden geraakt door een wijziging |
| N-36 | `find-downstream-users` | Module or API name + codebase path | List of downstream consumers | Vindt alle downstream gebruikers van een module of API |
| N-37 | `calculate-blast-radius` | Change description + dependency map | Blast radius report (affected components) | Berekent de reikwijdte van de impact van een wijziging |
| N-38 | `generate-impact-report` | Impact analysis data | Structured impact report (markdown) | Genereert een gestructureerd rapport over de wijzigingsimpact |
| N-39 | `suggest-migration-path` | Current state + target state description | Step-by-step migration plan | Stelt een migratiepad voor van de huidige naar de gewenste situatie |
| N-40 | `evaluate-technology` | Technology name + requirements | Evaluation report with score per criterion | Evalueert een technologie op basis van gegeven criteria |
| N-41 | `research-best-practice` | Topic or problem domain | Summary of current best practices | Onderzoekt de actuele best practices voor een onderwerp |
| N-42 | `find-industry-standard` | Domain or problem type | Description of applicable industry standard | Zoekt de toepasselijke industriestandaard voor een domein |
| N-43 | `benchmark-solution` | Solution description + performance criteria | Benchmark results or estimation | Benchmarkt een oplossing op prestatie-indicatoren |
| N-44 | `generate-pros-cons` | Option or technology description | Pros and cons list | Genereert een lijst van voor- en nadelen van een optie |
| N-45 | `find-documentation` | Topic or API name + documentation source | Relevant documentation snippets or links | Zoekt relevante documentatie voor een onderwerp of API |

---

## O. Communicatie & Rapportage

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| O-01 | `format-markdown` | Raw text or structured content | Well-formatted markdown document | Formatteert tekst naar nette markdown opmaak |
| O-02 | `format-html` | Markdown or raw text | HTML document or fragment | Converteert tekst naar correcte HTML opmaak |
| O-03 | `format-pdf-content` | Structured content (text, headers, tables) | PDF-ready formatted content | Bereidt inhoud voor op PDF-export formaat |
| O-04 | `format-table` | Tabular data (JSON, CSV, or list) | Markdown or HTML table | Formatteert tabeldata naar een leesbare tabel |
| O-05 | `format-list` | Unstructured items | Formatted bulleted or numbered list | Formatteert ongestructureerde items naar een lijst |
| O-06 | `format-code-block` | Code snippet + language hint | Fenced code block with syntax hint | Formatteert een codefragment met juiste code-block opmaak |
| O-07 | `add-table-of-contents` | Markdown document | Same document with TOC inserted | Voegt een inhoudsopgave toe aan een markdown document |
| O-08 | `number-headings` | Markdown document | Document with numbered headings | Nummert alle koppen in een markdown document |
| O-09 | `generate-report` | Data and report requirements | Complete structured report (markdown) | Genereert een volledig rapport op basis van invoerdata |
| O-10 | `generate-executive-summary` | Full report or document | Concise executive summary (max 1 page) | Genereert een managementsamenvatting van een document |
| O-11 | `generate-technical-report` | Technical data and findings | Detailed technical report | Genereert een technisch rapport met bevindingen |
| O-12 | `generate-audit-report` | Audit findings and evidence | Structured audit report | Genereert een auditrapport op basis van bevindingen |
| O-13 | `generate-status-report` | Status data (tasks, milestones, blockers) | Status report document | Genereert een statusrapport van een project of taak |
| O-14 | `generate-sprint-report` | Sprint data (stories, velocity, completed) | Sprint summary report | Genereert een sprintrapport met resultaten en voortgang |
| O-15 | `generate-retrospective` | Sprint or period events and team input | Retrospective document (went well, improve, actions) | Genereert een retrospectieve samenvatting van een sprint |
| O-16 | `generate-incident-report` | Incident timeline and impact data | Structured incident report | Genereert een incidentrapport met tijdlijn en impact |
| O-17 | `generate-post-mortem` | Incident report + root cause analysis | Post-mortem document with action items | Genereert een post-mortem document na een incident |
| O-18 | `draft-email` | Topic, recipient context, key points | Draft email (subject + body) | Stelt een e-mail op op basis van onderwerp en kernpunten |
| O-19 | `draft-reply` | Original email + reply intent | Draft reply email | Stelt een antwoord op een e-mail op |
| O-20 | `draft-follow-up` | Original email or meeting notes | Follow-up email draft | Stelt een opvolg-e-mail op na een gesprek of vergadering |
| O-21 | `draft-meeting-invite` | Meeting topic, participants, agenda | Meeting invitation email | Stelt een vergaderuitnodiging op met agenda |
| O-22 | `draft-announcement` | Announcement topic + audience | Announcement email or post draft | Stelt een aankondigingsbericht op voor een doelgroep |
| O-23 | `generate-email-subject` | Email body draft | Concise email subject line | Genereert een passende onderwerpregel voor een e-mail |
| O-24 | `format-email-signature` | Name, role, contact details | Formatted email signature block | Formatteert contactgegevens tot een e-mailhandtekening |
| O-25 | `draft-slack-message` | Topic + tone + audience | Slack message draft | Stelt een Slack-bericht op voor een bepaalde doelgroep |
| O-26 | `draft-teams-message` | Topic + tone + audience | Teams message draft | Stelt een Microsoft Teams-bericht op |
| O-27 | `format-notification` | Event data + recipient context | Formatted notification message | Formatteert een notificatiebericht op basis van een gebeurtenis |
| O-28 | `generate-bot-response` | User message + bot context | Bot reply message | Genereert een geautomatiseerde botreactie op een bericht |
| O-29 | `draft-pr-comment` | PR diff or specific code section | Pull request review comment | Stelt een reviewcommentaar op voor een pull request |
| O-30 | `draft-issue-comment` | Issue context + response intent | GitHub/GitLab issue comment draft | Stelt een reactie op een issue op |
| O-31 | `generate-review-feedback` | Code or document under review | Structured review feedback | Genereert gestructureerde reviewfeedback op code of documenten |
| O-32 | `generate-mermaid-diagram` | Diagram description or structured data | Mermaid diagram source code | Genereert Mermaid-diagramcode op basis van een beschrijving |
| O-33 | `generate-plantuml` | Diagram description or structured data | PlantUML diagram source code | Genereert PlantUML-diagramcode op basis van een beschrijving |
| O-34 | `generate-ascii-chart` | Numeric data series | ASCII bar or line chart | Genereert een ASCII-diagram van numerieke data |
| O-35 | `generate-progress-bar` | Current value + max value + label | ASCII or unicode progress bar string | Genereert een voortgangsbalk op basis van een waarde |
| O-36 | `generate-sparkline-data` | Time series data | Sparkline character sequence | Genereert sparkline-data voor een tijdreeks |
| O-37 | `format-dashboard-widget` | Metric name + value + trend data | Formatted dashboard widget text block | Formatteert een metriek als dashboard-widget |
| O-38 | `create-status-update` | Project status data + audience | Status update message or post | Maakt een statusupdate aan voor een project of team |
| O-39 | `generate-daily-standup` | Completed tasks + planned tasks + blockers | Standup message (yesterday/today/blockers) | Genereert een dagelijkse standup-samenvatting |
| O-40 | `generate-weekly-summary` | Week's events, tasks, and outcomes | Weekly summary report | Genereert een wekelijkse samenvatting van activiteiten |
| O-41 | `generate-monthly-overview` | Monthly data (metrics, milestones, events) | Monthly overview report | Genereert een maandelijkse overzichtsrapportage |
| O-42 | `generate-milestone-report` | Milestone data + completed work | Milestone progress report | Genereert een rapport over de voortgang van een mijlpaal |
| O-43 | `create-checklist` | List of tasks or requirements | Formatted markdown checklist | Maakt een geformateerde afvinklijst van taken |
| O-44 | `generate-slide-outline` | Presentation topic + audience + goal | Structured slide outline | Genereert een presentatiestructuur met dia-indeling |
| O-45 | `generate-speaker-notes` | Slide content or outline | Speaker notes per slide | Genereert sprekernotities bij presentatiedia's |

---

## P. Documentation & Knowledge

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| P-01 | `generate-api-docs` | API code or OpenAPI spec | API reference documentation (markdown) | Genereert API-documentatie op basis van code of spec |
| P-02 | `generate-function-docs` | Function signature + body | Docstring or function documentation | Genereert documentatie voor een specifieke functie |
| P-03 | `generate-class-docs` | Class definition + methods | Class reference documentation | Genereert documentatie voor een klasse en haar methoden |
| P-04 | `generate-module-docs` | Module files or exports | Module overview documentation | Genereert documentatie voor een complete module |
| P-05 | `generate-package-docs` | Package manifest + entry points | Package documentation (README-style) | Genereert documentatie voor een software package |
| P-06 | `generate-type-docs` | Type definitions or schema | Type reference documentation | Genereert documentatie voor typen en datatypes |
| P-07 | `generate-enum-docs` | Enum definition + values | Enum documentation with value descriptions | Genereert documentatie voor een enum met waardebeschrijvingen |
| P-08 | `document-config-options` | Configuration schema or example config | Configuration reference documentation | Documenteert alle configuratieopties met beschrijvingen |
| P-09 | `generate-readme` | Project description + key information | README.md document | Genereert een README-bestand voor een project |
| P-10 | `generate-contributing-guide` | Project conventions + workflow description | CONTRIBUTING.md document | Genereert een bijdragegids voor open-source projecten |
| P-11 | `generate-code-of-conduct` | Community scope and values | CODE_OF_CONDUCT.md document | Genereert een gedragscode voor een project of community |
| P-12 | `generate-license-file` | License type + copyright holder + year | LICENSE file text | Genereert een licentiebestand op basis van het gekozen type |
| P-13 | `generate-getting-started` | Project setup steps + prerequisites | Getting started guide | Genereert een startersgids voor nieuwe gebruikers |
| P-14 | `generate-installation-guide` | Installation steps + platform requirements | Installation guide document | Genereert een installatiegids voor een applicatie |
| P-15 | `generate-quickstart` | Core workflow + minimal setup steps | Quickstart guide (condensed) | Genereert een beknopte quickstart-handleiding |
| P-16 | `generate-faq` | Common questions + answers or source material | FAQ document | Genereert een veelgestelde-vragensectie |
| P-17 | `generate-adr` | Decision context + options + outcome | Architecture Decision Record (ADR) | Genereert een Architecture Decision Record |
| P-18 | `generate-design-doc` | Feature or system description + requirements | Design document | Genereert een ontwerpdocument voor een feature of systeem |
| P-19 | `generate-rfc` | Proposal topic + motivation + design | RFC document | Genereert een Request for Comments document |
| P-20 | `generate-technical-spec` | Requirements + constraints + design decisions | Technical specification document | Genereert een technische specificatie |
| P-21 | `document-api-contract` | API endpoint definitions + examples | API contract document | Documenteert het API-contract met voorbeelden |
| P-22 | `generate-sequence-diagram-doc` | Flow description or code interactions | Sequence diagram with narrative | Genereert een sequentiediagram met bijbehorende documentatie |
| P-23 | `generate-data-flow-doc` | Data sources, transformations, destinations | Data flow documentation | Documenteert de datastroom door een systeem |
| P-24 | `document-infrastructure` | Infrastructure description or IaC code | Infrastructure documentation | Documenteert de infrastructuur van een applicatie |
| P-25 | `generate-user-guide` | Feature list + user personas | User guide document | Genereert een gebruikershandleiding voor eindgebruikers |
| P-26 | `generate-tutorial` | Task goal + step-by-step workflow | Tutorial document | Genereert een stapsgewijze tutorial |
| P-27 | `generate-how-to` | Specific task description + prerequisites | How-to guide | Genereert een praktische handleiding voor een taak |
| P-28 | `generate-reference` | Technical subject + details | Reference documentation page | Genereert referentiedocumentatie voor een technisch onderwerp |
| P-29 | `generate-glossary` | Terms and definitions list | Formatted glossary document | Genereert een begrippenlijst van termen en definities |
| P-30 | `generate-troubleshooting-guide` | Known issues + symptoms + solutions | Troubleshooting guide document | Genereert een probleemoplossingsgids |
| P-31 | `generate-release-notes` | Changelog entries + version number | Release notes document | Genereert release notes op basis van changelog-invoer |
| P-32 | `create-snippet` | Knowledge content + tags + metadata | Snippet file with YAML frontmatter | Maakt een kennissnippet aan met metadata |
| P-33 | `update-snippet` | Existing snippet + new content or corrections | Updated snippet file | Werkt een bestaand kennissnippet bij |
| P-34 | `tag-knowledge` | Knowledge item + taxonomy | Knowledge item with assigned tags | Kent tags toe aan een kennisitem |
| P-35 | `categorize-knowledge` | Knowledge items + category taxonomy | Categorized knowledge list | Categoriseert kennisitems in een taxonomie |
| P-36 | `link-related-knowledge` | Knowledge item + knowledge base | Item with links to related items | Koppelt gerelateerde kennisitems aan elkaar |
| P-37 | `generate-flowchart` | Process or decision flow description | Mermaid flowchart source code | Genereert een stroomdiagram op basis van een procesbeschrijving |
| P-38 | `generate-sequence-diagram` | Interaction description (actors + steps) | Mermaid sequence diagram source | Genereert een sequentiediagram van interacties |
| P-39 | `generate-class-diagram` | Class definitions or code | Mermaid class diagram source | Genereert een klassediagram op basis van code |
| P-40 | `generate-er-diagram` | Database schema or entity descriptions | Mermaid ER diagram source | Genereert een entiteit-relatiediagram van een datamodel |

---

## Q. ERPNext & Frappe

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| Q-01 | `generate-doctype` | DocType name, fields spec, meta config | JSON DocType definition | Genereert een volledig ERPNext DocType op basis van een specificatie |
| Q-02 | `validate-doctype` | DocType JSON definition | Validation report with errors and warnings | Valideert een DocType definitie op ERPNext-conformiteit |
| Q-03 | `explain-doctype` | DocType name or JSON | Human-readable description of purpose and fields | Legt de structuur en het doel van een DocType uit in begrijpelijke taal |
| Q-04 | `extend-doctype` | Base DocType JSON, extension spec | Extended DocType JSON with added fields/properties | Voegt velden of eigenschappen toe aan een bestaand DocType |
| Q-05 | `generate-child-doctype` | Parent DocType name, child table spec | Child DocType JSON definition | Genereert een Child Table DocType gekoppeld aan een parent DocType |
| Q-06 | `generate-virtual-doctype` | Virtual DocType name, datasource spec | Virtual DocType JSON with controller methods | Genereert een virtueel DocType dat data leest uit een externe bron |
| Q-07 | `list-doctype-fields` | DocType name or JSON | Structured field list with types and properties | Geeft een gestructureerd overzicht van alle velden in een DocType |
| Q-08 | `generate-doctype-fixtures` | DocType JSON, sample data count | Fixture JSON file with sample records | Genereert fixture-data voor een DocType ten behoeve van tests of migraties |
| Q-09 | `migrate-doctype` | Old DocType JSON, new schema spec | Migration script (Python) + renamed field map | Genereert een migratiescript bij schemawijzigingen in een DocType |
| Q-10 | `compare-doctype-versions` | DocType JSON v1, DocType JSON v2 | Diff report with added, removed, changed fields | Vergelijkt twee versies van een DocType en toont de verschillen |
| Q-11 | `generate-server-script` | Script name, trigger type, business logic description | Server Script JSON (Frappe format) | Genereert een Frappe Server Script op basis van een logicabeschrijving |
| Q-12 | `generate-whitelisted-api` | API name, parameters, return type, logic description | Python function with @frappe.whitelist decorator | Genereert een Python API-endpoint met whitelist-decorateur voor Frappe |
| Q-13 | `generate-scheduled-job` | Job name, cron schedule, job logic description | Scheduled Job Type JSON + Python handler | Genereert een geplande taak (cron job) voor het Frappe framework |
| Q-14 | `generate-doc-event-handler` | DocType name, event name, handler logic | Python method body for doc event | Genereert een event handler (bijv. before_save) voor een specifiek DocType |
| Q-15 | `generate-permission-query` | DocType name, permission conditions | Python permission_query_conditions function | Genereert een conditiefunctie voor documentniveau-rechtenbeheer in Frappe |
| Q-16 | `generate-auto-name` | DocType name, naming logic description | Python autoname method body | Genereert de autoname-methode voor automatische naamgeving van records |
| Q-17 | `generate-validate-hook` | DocType name, validation rules | Python validate method with field checks | Genereert de validate-hook met veldvalidaties voor een DocType |
| Q-18 | `generate-before-save-hook` | DocType name, pre-save logic description | Python before_save method body | Genereert de before_save-hook voor bewerkingen voorafgaand aan opslaan |
| Q-19 | `generate-after-insert-hook` | DocType name, post-insert logic description | Python after_insert method body | Genereert de after_insert-hook voor acties na aanmaken van een record |
| Q-20 | `generate-client-script` | DocType name, trigger event, UI logic description | Client Script JS (Frappe format) | Genereert een Frappe Client Script op basis van een UI-logicabeschrijving |
| Q-21 | `generate-list-view-script` | DocType name, list view customization spec | Client Script JS for list view | Genereert een scriptuitbreiding voor de lijstweergave van een DocType |
| Q-22 | `generate-form-script` | DocType name, form behavior description | Client Script JS for form view | Genereert een scriptuitbreiding voor de formulierweergave van een DocType |
| Q-23 | `generate-dialog` | Dialog title, fields, action description | frappe.ui.Dialog JS code | Genereert een modaal dialoogvenster voor gebruik in Frappe Client Scripts |
| Q-24 | `generate-custom-button` | DocType name, button label, action description | JS code block for custom button with click handler | Genereert een aangepaste knop met actie in een Frappe-formulier |
| Q-25 | `generate-fetch-from` | Source DocType, target field, fetch field | fetch_from property string + JS trigger | Genereert een fetch_from configuratie om velden automatisch in te vullen |
| Q-26 | `generate-set-query` | Link field name, filter conditions | set_query JS code block | Genereert een set_query filter voor een Link-veld in een Frappe-formulier |
| Q-27 | `generate-hide-show-field` | DocType name, field name, condition expression | JS toggle code with frappe.ui.form | Genereert JavaScript om een veld conditioneel te tonen of te verbergen |
| Q-28 | `generate-print-format` | DocType name, template layout description | Print Format JSON + Jinja HTML template | Genereert een afdrukopmaakmaal voor afdruk- en PDF-export in ERPNext |
| Q-29 | `generate-jinja-template` | DocType name, template purpose, data fields | Jinja2 HTML template string | Genereert een Jinja2-sjabloon voor gebruik in Frappe print formats of e-mails |
| Q-30 | `generate-email-template` | Email name, context variables, body description | Email Template JSON with subject and body | Genereert een e-mailsjabloon voor gebruik in ERPNext notificaties of workflows |
| Q-31 | `generate-notification-template` | Notification name, DocType, trigger event | Notification JSON with subject, message, recipients | Genereert een notificatieconfiguratie die automatisch berichten verstuurt |
| Q-32 | `generate-letter-head` | Company name, logo url, address, contact info | Letter Head JSON with HTML content | Genereert een briefhoofd voor gebruik in ERPNext documenten en afdrukken |
| Q-33 | `generate-pdf-config` | DocType name, PDF layout preferences | PDF Print Settings JSON | Genereert PDF-configuratie-instellingen voor afdrukopmaak in ERPNext |
| Q-34 | `generate-script-report` | Report name, DocType, columns, Python script description | Script Report JSON + Python report file | Genereert een Script Report met aangepaste Python-logica voor ERPNext |
| Q-35 | `generate-query-report` | Report name, SQL query description, columns | Query Report JSON + SQL query string | Genereert een Query Report op basis van een SQL-query voor ERPNext |
| Q-36 | `generate-report-builder` | DocType name, column selection, filter config | Report Builder JSON configuration | Genereert een Report Builder configuratie voor standaardrapportages in ERPNext |
| Q-37 | `generate-chart-config` | Data source description, chart type, axes | Chart.js or Frappe Charts JSON config | Genereert een grafiekconfiguratie voor gebruik in dashboards of rapporten |
| Q-38 | `generate-dashboard-chart` | Chart name, DocType, time range, metric | Dashboard Chart JSON definition | Genereert een dashboardgrafiek voor weergave in het ERPNext dashboard |
| Q-39 | `generate-number-card` | Card name, DocType, aggregate function, filter | Number Card JSON definition | Genereert een nummerkaartelement voor het ERPNext dashboard |
| Q-40 | `generate-workflow` | DocType name, states list, transitions description | Workflow JSON definition | Genereert een Frappe Workflow-definitie voor documentstatussen en overgangen |
| Q-41 | `generate-workflow-state` | State name, style, optional doc status | Workflow State JSON | Genereert een individuele workflowstatus voor een Frappe Workflow |
| Q-42 | `generate-workflow-action` | Action name, next state, allowed roles | Workflow Action JSON | Genereert een workflowactie die een statusovergang triggert |
| Q-43 | `generate-workflow-transition` | From state, to state, action, conditions | Workflow Transition JSON | Genereert een overgangsregel tussen twee workflowstatussen |
| Q-44 | `validate-workflow` | Workflow JSON definition | Validation report with state and transition errors | Valideert een Frappe Workflow-definitie op volledigheid en correctheid |
| Q-45 | `generate-assignment-rule` | DocType name, assignment logic description | Assignment Rule JSON | Genereert een automatische toewijzingsregel voor documenten in ERPNext |
| Q-46 | `check-permissions` | DocType name, role list | Permission matrix per role and action | Controleert welke rollen welke rechten hebben op een specifiek DocType |
| Q-47 | `generate-role` | Role name, desk access, home page | Role JSON definition | Genereert een Frappe Role-definitie met toegangsrechten en startpagina |
| Q-48 | `generate-permission-rule` | DocType name, role, permission flags | DocPerm JSON rule | Genereert een rechtenconfiguratie voor een rol op een specifiek DocType |
| Q-49 | `generate-user-permission` | User email, DocType, value | User Permission JSON | Genereert een gebruikersspecifieke documentbeperking in ERPNext |
| Q-50 | `generate-role-profile` | Profile name, roles list | Role Profile JSON | Genereert een rolprofiel dat meerdere rollen bundelt voor snelle gebruikerstoewijzing |
| Q-51 | `audit-permissions` | List of DocTypes, list of roles | Permissions audit report | Voert een audit uit op rechtenconfiguraties en meldt onjuistheden of hiaten |
| Q-52 | `validate-naming-series` | Naming series string | Validation result with format explanation | Valideert een naming series string op geldigheid in het Frappe-formaat |
| Q-53 | `generate-custom-field` | DocType name, field spec | Custom Field JSON | Genereert een Custom Field-definitie voor uitbreiding van een bestaand DocType |
| Q-54 | `generate-property-setter` | DocType name, field name, property, value | Property Setter JSON | Genereert een Property Setter om veldgedrag programmatisch te overschrijven |
| Q-55 | `generate-system-settings` | Settings key-value pairs | System Settings patch JSON or Python dict | Genereert een configuratieblok voor ERPNext systeeminstellingen |
| Q-56 | `generate-website-settings` | Website configuration description | Website Settings patch JSON | Genereert configuratie-instellingen voor de ERPNext Website-module |
| Q-57 | `generate-hooks-py` | App name, hook type, handler path list | hooks.py Python file content | Genereert een hooks.py-bestand met alle Frappe-hooks voor een applicatie |
| Q-58 | `generate-patches` | App name, patch description, migration actions | Patch Python file content | Genereert een Frappe patch-script voor eenmalige databasemigraties |
| Q-59 | `generate-data-import` | DocType name, CSV/Excel column mapping | Data Import JSON config + mapping template | Genereert een data-importconfiguratie voor bulk-upload in ERPNext |
| Q-60 | `generate-data-export` | DocType name, filters, fields to export | Data Export JSON config | Genereert een data-exportconfiguratie voor gegevenextractie uit ERPNext |
| Q-61 | `generate-bulk-update` | DocType name, filter conditions, field updates | Bulk Update JSON config | Genereert een bulk-updateconfiguratie voor massamutaties in ERPNext |
| Q-62 | `generate-rename-tool` | Old name, new name, DocType | Rename Tool script or API call | Genereert een hernoemingsscript voor het veilig hernoemen van ERPNext-records |
| Q-63 | `generate-delete-tool` | DocType name, filter conditions | Safe delete script with dependency check | Genereert een verwijderscript dat afhankelijkheden controleert voor veilig wissen |
| Q-64 | `generate-data-migration` | Source schema, target schema, transformation rules | Data migration Python script | Genereert een volledig datamigratiesript tussen twee ERPNext-schemas |
| Q-65 | `validate-frappe-app` | App directory structure, manifest | Validation report on app completeness | Valideert de structuur en volledigheid van een Frappe-applicatie |

---

## R. Finance & Accounting

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| R-01 | `generate-invoice` | Customer, line items, tax code, payment terms | Invoice JSON or HTML | Genereert een verkoopfactuur op basis van klant- en regelitemgegevens |
| R-02 | `validate-invoice` | Invoice JSON or document | Validation report with field and tax errors | Valideert een factuur op volledigheid, rekenkundige correctheid en btw-regels |
| R-03 | `calculate-tax` | Line items, tax category, country code | Tax breakdown per line and total | Berekent belastingen per regelitem op basis van categorie en landregels |
| R-04 | `generate-credit-note` | Original invoice reference, reason, items to credit | Credit Note JSON | Genereert een creditnota gebaseerd op een bestaande factuur |
| R-05 | `generate-payment-entry` | Invoice reference, amount, payment method, date | Payment Entry JSON | Genereert een betalingsboekingsdocument gekoppeld aan een factuur |
| R-06 | `match-payment-to-invoice` | Payment details, open invoice list | Matched pairs with confidence score | Koppelt een betaling aan de meest waarschijnlijke openstaande factuur |
| R-07 | `generate-payment-reminder` | Customer name, open invoices list, reminder level | Payment Reminder email or document | Genereert een betalingsherinnering op basis van openstaande facturen |
| R-08 | `generate-dunning` | Customer name, overdue invoices, dunning level | Dunning document with fee calculation | Genereert een aanmaningsdocument inclusief aanmaningskosten |
| R-09 | `calculate-btw` | Line items, btw code (hoog/laag/nul/vrijgesteld) | BTW bedrag per tarief en totaaloverzicht | Berekent de Nederlandse BTW per belastingcode op factuurregels |
| R-10 | `validate-btw-nummer` | BTW-nummer string | Valid/invalid result with format explanation | Valideert een Nederlands of EU BTW-nummer op structuur en controlecijfer |
| R-11 | `generate-btw-aangifte` | Period, transaction list with btw breakdown | BTW-aangifte XML or structured JSON | Genereert een Nederlandse BTW-aangifte op basis van periodieke transacties |
| R-12 | `calculate-inkomstenbelasting` | Fiscal year, income components, aftrekposten | Tax calculation with bracket breakdown | Berekent Nederlandse inkomstenbelasting inclusief aftrekposten en schijven |
| R-13 | `generate-tax-summary` | Period, ledger transactions | Tax summary report per category | Genereert een belastingoverzicht per categorie voor een bepaalde periode |
| R-14 | `classify-tax-category` | Transaction description, amount, counterparty | Tax category suggestion with confidence | Classificeert een transactie in de juiste belastingcategorie |
| R-15 | `validate-tax-id` | Tax ID string, country code | Valid/invalid result with country-specific check | Valideert een belasting-ID op geldigheid per landspecifieke regels |
| R-16 | `generate-journal-entry` | Debit account, credit account, amount, description, date | Journal Entry JSON | Genereert een memoriaalpost met debet- en creditboeking |
| R-17 | `validate-journal-entry` | Journal Entry JSON | Validation report with balance and account errors | Valideert een memoriaalpost op debet-creditbalans en rekeningcodes |
| R-18 | `generate-chart-of-accounts` | Company type, country, industry | Chart of Accounts JSON tree | Genereert een rekeningschema passend bij het bedrijfstype en de sector |
| R-19 | `suggest-account` | Transaction description, amount, existing accounts | Suggested account code with reasoning | Suggereert de meest passende grootboekrekening voor een transactie |
| R-20 | `reconcile-bank` | Bank statement rows, ledger transactions | Reconciliation result with matched and unmatched items | Reconcilieert bankafschriftregels met boekingen in het grootboek |
| R-21 | `generate-bank-reconciliation` | Reconciliation results | Bank Reconciliation Statement document | Genereert een bankafstemmingsoverzicht van gematchte en openstaande posten |
| R-22 | `classify-transaction` | Transaction description, amount, counterparty | Category and subcategory with confidence | Classificeert een banktransactie in een kostensoort of omzetcategorie |
| R-23 | `generate-budget` | Cost center, period, expense categories, amounts | Budget JSON per account and period | Genereert een budgetdocument per kostenplaats en periode |
| R-24 | `check-budget-variance` | Budget JSON, actual spending JSON | Variance report per line with percentage deviation | Vergelijkt werkelijke uitgaven met budget en rapporteert afwijkingen |
| R-25 | `forecast-expense` | Historical expense data, forecast period | Forecasted expense amounts per category | Voorspelt toekomstige uitgaven op basis van historische gegevens |
| R-26 | `calculate-burn-rate` | Start balance, expense history, current date | Daily/monthly burn rate and runway in days | Berekent de maandelijkse uitgavensnelheid en de resterende kasrun |
| R-27 | `generate-budget-report` | Budget JSON, actuals JSON, period | Budget vs Actuals report document | Genereert een budgetrapport met werkelijke versus geplande bedragen |
| R-28 | `compare-budget-to-actual` | Budget line items, actual line items | Side-by-side comparison with traffic-light status | Vergelijkt budget en werkelijk naast elkaar met statuskleurindicatie |
| R-29 | `generate-balance-sheet` | Trial balance data, reporting date | Balance Sheet statement document | Genereert een balans op basis van de proef- en saldibalans |
| R-30 | `generate-profit-loss` | Income and expense ledger, period | Profit & Loss statement document | Genereert een resultatenrekening over een opgegeven periode |
| R-31 | `generate-cash-flow` | Period transactions, opening balance | Cash Flow Statement (direct or indirect) | Genereert een kasstroomoverzicht op basis van periodieke transacties |
| R-32 | `generate-trial-balance` | Ledger account balances, period | Trial Balance report with debit/credit columns | Genereert een proef- en saldibalans per grootboekrekening |
| R-33 | `generate-aged-receivables` | Open sales invoices with due dates | Aged Receivables report bucketed by days overdue | Genereert een debiteurenverouderingsoverzicht per vervaldagemmer |
| R-34 | `generate-aged-payables` | Open purchase invoices with due dates | Aged Payables report bucketed by days overdue | Genereert een crediteurenverouderingsoverzicht per vervaldagemmer |
| R-35 | `calculate-financial-ratio` | Balance sheet data, P&L data | Financial ratios (liquidity, solvency, profitability) | Berekent financiele kengetallen zoals liquiditeit, solvabiliteit en rentabiliteit |

---

## S. Project Management & Design

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| S-01 | `generate-sprint-plan` | Backlog items, team velocity, sprint duration | Sprint plan with selected items and capacity | Genereert een sprintplan op basis van backlog, teamcapaciteit en historische velocity |
| S-02 | `generate-backlog-item` | Feature description, context | User story or task in backlog format | Genereert een backlogitem in user-story- of taakformaat op basis van een beschrijving |
| S-03 | `estimate-story-points` | User story or task description | Story points estimate with reasoning | Schat het aantal storypunten voor een user story op basis van complexiteit |
| S-04 | `generate-acceptance-criteria` | User story or feature description | Acceptance criteria list (Given/When/Then) | Genereert acceptatiecriteria in BDD-formaat voor een user story |
| S-05 | `generate-definition-of-done` | Project type, quality standards | Definition of Done checklist | Genereert een Definition of Done-checklist passend bij het projecttype |
| S-06 | `generate-sprint-review` | Completed items, demo notes, metrics | Sprint Review document | Genereert een sprintreviewer-document met voltooide items en demo-aantekeningen |
| S-07 | `generate-sprint-retrospective` | Team feedback, previous action items | Sprint Retrospective document with action items | Genereert een sprintretrospectiedocument met verbeterpunten en actiepunten |
| S-08 | `generate-velocity-chart` | Historical sprint data with completed points | Velocity chart config or data structure | Genereert een velocitygrafiekconfiguratie op basis van historische sprintdata |
| S-09 | `decompose-feature` | Feature description | List of sub-features or epics | Ontleedt een grote feature in kleinere, beheersbare deelfuncties of epics |
| S-10 | `generate-task-breakdown` | User story or feature | Ordered task list with dependencies | Breekt een user story of feature op in concrete ontwikkeltaken met afhankelijkheden |
| S-11 | `estimate-effort` | Task description, technology stack | Effort estimate in hours or days with reasoning | Schat de benodigde inspanning voor een taak in uren of dagen |
| S-12 | `suggest-priority` | Task list with descriptions and context | Prioritized task list with rationale | Stelt een prioriteitsvolgorde voor een lijst taken voor op basis van waarde en risico |
| S-13 | `generate-dependency-graph` | Task list with dependency descriptions | Dependency graph in DOT or JSON format | Genereert een afhankelijkheidsgraph van taken in een visueel formaat |
| S-14 | `generate-critical-path` | Task list with durations and dependencies | Critical path sequence with total duration | Bepaalt het kritieke pad door een takennetwerk voor projectplanning |
| S-15 | `generate-roadmap-item` | Feature name, quarter, goals description | Roadmap item in structured format | Genereert een roadmapitem met doelen, kwartaalplanning en afhankelijkheden |
| S-16 | `generate-milestone` | Milestone name, deliverables, target date | Milestone document with criteria | Genereert een mijlpaaldocument met deliverables en meetbare voltooiingscriteria |
| S-17 | `generate-wireframe-description` | Screen name, purpose, user actions | Wireframe description in structured text | Genereert een tekstuele wireframe-beschrijving voor een scherm of component |
| S-18 | `generate-user-flow` | Starting point, goal, user type | User flow diagram description or Mermaid code | Genereert een gebruikersflow van startpunt tot doel voor een specifiek gebruikerstype |
| S-19 | `generate-persona` | Target user segment, context | User persona document with goals and pain points | Genereert een gebruikerspersona met demografische kenmerken, doelen en pijnpunten |
| S-20 | `generate-user-story` | Feature description, user role | User story in standard format | Genereert een user story in het Als/Wil/Zodat-formaat voor een feature |
| S-21 | `generate-use-case` | Actor name, goal, system context | Use Case document with main and alternative flows | Genereert een use case-document met hoofd- en alternatieve scenarios |
| S-22 | `generate-interaction-spec` | Component name, user actions, system responses | Interaction specification document | Genereert een interactiespecificatie met gebruikersacties en systeemreacties |
| S-23 | `generate-responsive-breakpoints` | Design context, device targets | Breakpoint config in CSS or design token format | Genereert responsieve breekpuntconfiguraties voor meerdere apparaatformaten |
| S-24 | `generate-color-palette` | Brand colors, usage context | Color palette with semantic tokens and accessibility | Genereert een kleurenpalet met semantische kleurtokens en toegankelijkheidsinformatie |
| S-25 | `generate-component-spec` | Component name, purpose, design description | Component specification document | Genereert een componentspecificatie met doel, gedrag en visuele beschrijving |
| S-26 | `generate-component-api` | Component name, props description | Component API definition with types and defaults | Genereert een component-API-definitie met prop-types, standaardwaarden en events |
| S-27 | `generate-props-interface` | Component name, functionality description | TypeScript props interface definition | Genereert een TypeScript-interface voor de props van een UI-component |
| S-28 | `generate-storybook-story` | Component name, props interface | Storybook story file (CSF format) | Genereert een Storybook-story in Component Story Format voor een component |
| S-29 | `generate-design-token` | Token name, value, usage description | Design token in W3C DTCG format or CSS variable | Genereert een ontwerptokendefinitie voor kleuren, typografie of spacing |
| S-30 | `generate-css-utility` | Utility purpose, property, values | CSS utility class definitions | Genereert CSS-utiliteitsklassen voor een specifieke opmaakeigenschap |
| S-31 | `generate-theme-config` | Theme name, color scheme, typography | Theme configuration object (JSON or CSS) | Genereert een themaconfiguratie met kleuren, typografie en spacing-tokens |
| S-32 | `suggest-component-name` | Component purpose, design pattern, framework | Suggested component name with rationale | Stelt een passende en consistente naam voor een UI-component voor |
| S-33 | `generate-system-design` | System requirements description | System design document with components and interactions | Genereert een systeemontwerp met componenten, interfaces en interactiediagrammen |
| S-34 | `generate-data-model` | Entities description, relationships | Entity-Relationship diagram or JSON schema | Genereert een datamodel met entiteiten, attributen en relaties |
| S-35 | `generate-api-design` | API name, resources, operations | OpenAPI (Swagger) specification YAML | Genereert een OpenAPI-specificatie voor een REST-API |
| S-36 | `generate-microservice-boundary` | Domain description, service responsibilities | Microservice boundary definition document | Definieert de grenzen en verantwoordelijkheden van een microservice |
| S-37 | `generate-event-schema` | Event name, producer, consumer, payload description | Event schema in AsyncAPI or JSON Schema format | Genereert een eventschema voor gebruik in event-driven architectuur |
| S-38 | `generate-state-machine` | Entity name, states, transitions description | State machine in XState or Mermaid format | Genereert een eindige-toestandsmachine voor een entiteit of proces |
| S-39 | `generate-domain-model` | Domain name, ubiquitous language terms | Domain model document with aggregates and entities | Genereert een domeinmodel op basis van Domain-Driven Design-principes |
| S-40 | `generate-epic` | Epic name, business goal, user segments | Epic document with goals, scope and success metrics | Genereert een epic-document met zakelijke doelstelling, scope en succesmaatstaven |
| S-41 | `generate-feature-spec` | Feature name, epic reference, requirements | Feature specification document | Genereert een featurespecificatie met functionele en niet-functionele eisen |
| S-42 | `generate-technical-debt-item` | Debt description, affected area, impact | Technical debt item in backlog format | Genereert een technische schuld-backlogitem met impact en oplossingsrichting |
| S-43 | `generate-bug-report` | Bug description, steps to reproduce, expected behavior | Bug report document in standard format | Genereert een gestructureerd bugreport met reproductiestappen en verwacht gedrag |
| S-44 | `generate-risk-assessment` | Project context, potential risks description | Risk matrix with likelihood and impact scores | Genereert een risicoassessment met kansen, impacts en mitigatiestrategieen |
| S-45 | `generate-stakeholder-update` | Project status, milestones, blockers | Stakeholder update message or document | Genereert een beknopte statusupdate voor stakeholders over projectvoortgang |
| S-46 | `generate-demo-script` | Features to demonstrate, audience type | Demo script with steps and talking points | Genereert een demonstratiescript met stappen en spreekpunten per feature |

---

## T. Search, Context & Multimedia

| # | Agent | Input | Output | Beschrijving |
|---|-------|-------|--------|--------------|
| T-01 | `search-semantic` | Query text, document corpus or index | Ranked list of semantically relevant documents | Zoekt documenten op basis van semantische gelijkenis met een zoekopdracht |
| T-02 | `search-keyword` | Keywords list, document corpus | Documents containing keywords with match count | Zoekt documenten op exacte trefwoordovereenkomst |
| T-03 | `search-fuzzy` | Query string, document corpus, threshold | Documents with fuzzy-matched terms and score | Zoekt documenten waarbij spelfouten en variaties worden getolereerd |
| T-04 | `search-regex` | Regex pattern, file or text corpus | Matches with file paths and line numbers | Zoekt naar tekst in bestanden op basis van een reguliere expressie |
| T-05 | `search-code-symbol` | Symbol name, language, codebase path | Symbol locations with file path and line reference | Zoekt naar een code-symbool (functie, klasse, variabele) in een codebase |
| T-06 | `search-by-tag` | Tag or list of tags, tagged document index | Documents matching all or any of the tags | Zoekt documenten op basis van een of meerdere metadatatags |
| T-07 | `search-by-date-range` | Start date, end date, document index | Documents modified or created within the range | Zoekt documenten die zijn aangemaakt of gewijzigd binnen een datumrange |
| T-08 | `rank-search-results` | Search results list, ranking criteria | Re-ranked results list with score explanation | Herordent zoekresultaten op basis van aangepaste rankingcriteria |
| T-09 | `filter-search-results` | Search results list, filter conditions | Filtered results list | Filtert een lijst zoekresultaten op basis van veld- of metadatawaarden |
| T-10 | `generate-search-index` | Document corpus, index schema | Search index in JSON or inverted index format | Genereert een zoekindex over een documentcorpus voor snelle zoekopdrachten |
| T-11 | `build-context` | Task description, available snippets list | Assembled context document | Assembleert relevante kennissnippets tot een samenhangende contextverzameling |
| T-12 | `select-relevant-files` | Task description, file list with descriptions | Ranked file list relevant to the task | Selecteert de meest relevante bestanden voor een taak uit een grotere verzameling |
| T-13 | `prioritize-snippets` | Snippet list with metadata, task description | Prioritized snippet list with relevance scores | Prioriteert kennissnippets op relevantie voor een specifieke taak |
| T-14 | `assemble-system-prompt` | Agent role, snippets list, instructions | Complete system prompt string | Assembleert een volledig systeemprompt op basis van rol en geselecteerde snippets |
| T-15 | `inject-context` | Base prompt, context document | Prompt with injected context at optimal position | Injecteert aanvullende context op de optimale positie in een bestaand prompt |
| T-16 | `calculate-context-budget` | Model name, reserved tokens count | Available context tokens for snippets | Berekent het beschikbare tokenbudget voor contextvulling gegeven het model |
| T-17 | `trim-context` | Context document, target token count | Trimmed context document within token limit | Verkort een contextdocument naar het maximale tokenbudget met prioritering |
| T-18 | `generate-context-manifest` | Assembled context components list | Context manifest JSON with sources and token counts | Genereert een manifest van alle contextcomponenten met bronvermelding en tokens |
| T-19 | `validate-context-size` | Context document, model name | Validation result with token count and fit status | Valideert of een contextdocument binnen het tokenvenster van het model past |
| T-20 | `store-memory` | Memory key, content, metadata | Confirmation with storage path | Slaat een geheugenitem op met sleutel en metadata voor later ophalen |
| T-21 | `retrieve-memory` | Memory key or query | Memory item content | Haalt een specifiek geheugenitem op aan de hand van een sleutel of query |
| T-22 | `update-memory` | Memory key, updated content | Confirmation with updated storage path | Werkt een bestaand geheugenitem bij met nieuwe inhoud |
| T-23 | `forget-memory` | Memory key or filter conditions | Confirmation with deleted item count | Verwijdert een of meerdere geheugenitems op basis van sleutel of filter |
| T-24 | `search-memory` | Query text, memory store | Ranked list of relevant memory items | Doorzoekt de geheugenopslag op basis van een zoekopdracht |
| T-25 | `summarize-memory` | Memory items list | Summary document of memory contents | Vat een verzameling geheugenitems samen tot een beknopt overzicht |
| T-26 | `consolidate-memories` | Duplicate or overlapping memory items | Deduplicated and merged memory items | Voegt overlappende geheugenitems samen en verwijdert duplicaten |
| T-27 | `generate-memory-index` | Memory store contents | Memory index with keys, tags and summaries | Genereert een index van alle geheugenitems met sleutels en samenvattingen |
| T-28 | `check-memory-relevance` | Memory item, current task context | Relevance score with reasoning | Beoordeelt of een geheugenitem relevant is voor de huidige taakcontext |
| T-29 | `prioritize-memories` | Memory items list, task description | Prioritized memory list for the task | Sorteert geheugenitems op relevantie voor een specifieke taak of context |
| T-30 | `describe-image` | Image file path or URL | Natural language description of image content | Genereert een beschrijving van de inhoud van een afbeelding |
| T-31 | `extract-text-from-image` | Image file path or URL | Extracted text (OCR result) | Extraheert tekst uit een afbeelding via optische tekenherkenning |
| T-32 | `classify-image` | Image file path or URL, label set | Image category with confidence score | Classificeert een afbeelding in een van de opgegeven categorieen |
| T-33 | `resize-image-config` | Image path, target dimensions, format | Image processing config (resize spec) | Genereert een afbeeldingsresizeconfiguratie voor geautomatiseerde beeldverwerking |
| T-34 | `generate-image-prompt` | Subject description, style, mood | Image generation prompt string | Genereert een prompt voor gebruik in AI-beeldgeneratietools op basis van beschrijving |
| T-35 | `compare-images` | Two image file paths or URLs | Similarity score and difference description | Vergelijkt twee afbeeldingen en beschrijft visuele overeenkomsten en verschillen |
| T-36 | `detect-faces-config` | Image path, detection parameters | Face detection config for API call | Genereert een configuratie voor gezichtsdetectie-API-aanroepen |
| T-37 | `generate-alt-text` | Image file path or URL | Alt text string for accessibility | Genereert toegankelijke alt-tekst voor een afbeelding conform WCAG-richtlijnen |
| T-38 | `extract-metadata-from-image` | Image file path | EXIF and other metadata as structured JSON | Extraheert EXIF- en andere metadata uit een afbeeldingsbestand |
| T-39 | `transcribe-audio-config` | Audio file path, language, format | Transcription API config for the audio file | Genereert een configuratie voor audio-transcriptie via een spraakherkennings-API |
| T-40 | `generate-subtitle-config` | Transcription result, video duration | Subtitle file config (SRT or VTT format) | Genereert een ondertitelingsconfiguratie op basis van een transcriptieresultaat |
| T-41 | `extract-audio-metadata` | Audio file path | Audio metadata (duration, codec, bitrate, channels) | Extraheert technische metadata uit een audiobestand |
| T-42 | `classify-audio-type` | Audio file path or description | Audio type classification (speech, music, noise) | Classificeert een audiofragment als spraak, muziek, geluid of ruis |
| T-43 | `extract-text-from-pdf` | PDF file path | Extracted plain text per page | Extraheert tekst uit een PDF-bestand per pagina |
| T-44 | `parse-pdf-table` | PDF file path, page number, table location | Structured table data as JSON or CSV | Parseert een tabel uit een PDF-pagina naar gestructureerde data |
| T-45 | `extract-pdf-metadata` | PDF file path | PDF metadata (author, title, pages, creation date) | Extraheert documentmetadata uit een PDF-bestand |
| T-46 | `split-pdf-config` | PDF file path, split points or page ranges | Split configuration for PDF processing | Genereert een splitsconfiguatie om een PDF op te delen in afzonderlijke bestanden |
| T-47 | `merge-pdf-config` | List of PDF file paths, output order | Merge configuration for PDF processing | Genereert een samenvoegconfiguratie om meerdere PDF-bestanden te combineren |
| T-48 | `convert-pdf-to-text` | PDF file path, output format | Plain text or Markdown document | Converteert een PDF naar platte tekst of Markdown voor verdere verwerking |
| T-49 | `classify-document-type` | Document file path or text sample | Document type classification with confidence | Classificeert een document in een type (factuur, contract, rapport, brief, etc.) |

---

## Voorbeelden: Flows & Pools

Hieronder voorbeelden van hoe atomaire agents combineerbaar zijn tot krachtige workflows.

### Voorbeeld 1: Automated Code Review (Flow)

```
[E-01 read-file]
  → [B-01 detect-code-language]
  → [C-01 check-style]
  → [C-09 find-bugs]
  → [J-01 scan-owasp-top10]
  → [C-42 find-dead-code]
  → [A-01 summarize] → Samenvatting van alle findings
```

**7 agents, elk doet één ding. Samen: volledige code review.**

### Voorbeeld 2: Smart Translator (Flow)

```
[A-10 detect-language]
  → [A-06 translate] (naar EN)
  → [A-17 fix-grammar]
  → [A-11 rewrite-formal]
```

**4 agents. Input in elke taal, output in formeel Engels.**

### Voorbeeld 3: PR Assistant (Flow)

```
[G-11 extract-diff-files]
  → [G-07 summarize-diff]
  → [G-01 generate-commit-msg]
  → [G-20 generate-pr-description]
```

**4 agents. Van branch diff naar complete PR.**

### Voorbeeld 4: Multi-Reviewer (Pool)

```
                    ┌→ [C-01 check-style]
[E-01 read-file] → ├→ [J-01 scan-owasp-top10]
                    ├→ [C-27 check-performance]
                    └→ [C-02 check-naming-conventions]
                         ↓ (alle resultaten)
                    [A-01 summarize]
```

**Dispatcher stuurt bestand naar 4 parallelle reviewers, resultaten samengevoegd.**

### Voorbeeld 5: ERPNext Feature Builder (Flow + Pool)

```
[Q-01 generate-doctype]
  → ┌→ [Q-12 generate-whitelisted-api]
    ├→ [Q-20 generate-client-script]
    └→ [Q-28 generate-print-format]
       ↓ (alle resultaten)
    [Q-02 validate-doctype]
    → [F-01 generate-unit-test]
```

**6 agents. Beschrijf een feature, krijg een compleet ERPNext module.**

### Voorbeeld 6: Intelligent Bug Fixer (Flow)

```
[N-10 explain-error]
  → [N-01 search-codebase] (zoek gerelateerde code)
  → [N-13 suggest-error-fix]
  → [F-01 generate-unit-test]
  → [G-01 generate-commit-msg]
```

**5 agents. Van error naar fix met test en commit message.**

### Voorbeeld 7: RAG Pipeline Builder (Flow)

```
[L-37 chunk-document]
  → [L-30 chunk-for-embedding]
  → [L-34 generate-embedding-index]
  → [L-38 generate-retrieval-query]
  → [L-39 rank-retrieved-results]
  → [L-40 generate-rag-prompt]
```

**6 agents. Van document naar volledige RAG-pipeline.**

### Voorbeeld 8: Security Audit (Pool + Flow)

```
[E-15 find-file] (alle code bestanden)
  → voor elk bestand:
    ┌→ [J-01 scan-owasp-top10]
    ├→ [C-09 find-bugs]
    └→ [A-50 anonymize-pii] (rapport anonimiseren)
       ↓
    [O-09 generate-report]
```

**Pool over alle bestanden, resultaten in één audit rapport.**

### Voorbeeld 9: Full Deploy Pipeline (Flow + Pool)

```
[G-01 generate-commit-msg]
  → [F-02 generate-test-suite]
  → [K-01 generate-dockerfile]
  → [K-10 generate-github-action]
  → ┌→ [K-20 generate-deployment]
    ├→ [K-21 generate-service]
    └→ [K-22 generate-ingress]
       ↓
    [K-39 generate-healthcheck]
```

**8 agents. Van commit naar volledige deployment pipeline.**

### Voorbeeld 10: Financial Report Generator (Flow)

```
[R-20 reconcile-bank]
  → [R-32 generate-trial-balance]
  → ┌→ [R-29 generate-balance-sheet]
    ├→ [R-30 generate-profit-loss]
    └→ [R-31 generate-cash-flow]
       ↓
    [O-10 generate-executive-summary]
```

**6 agents. Van bankdata naar complete financiële rapportage.**

---

## Agent Definitie Structuur

> **Belangrijk**: De 1015 definities in deze library zijn overwegend **prompt templates** — single-turn
> transformaties (tekst in → tekst uit, geen tools). Bij implementatie worden ze **skills** of
> **prompt templates** binnen een agent-workspace. Een echte **agent** (in SDK-zin) ontstaat wanneer
> een prompt template tools krijgt en in een autonome executie-loop draait.
>
> Zie **D-023** (Agent Taxonomie) in DECISIONS.md voor de volledige definitie van wanneer iets
> een agent, subagent, teammate, of skill is.

### Classificatie per SDK Type

| SDK Type | Eigen Context? | Tools? | Autonome Loop? | Voorbeelden in deze library |
|----------|:--------------:|:------:|:--------------:|----------------------------|
| **Skill / Prompt Template** | Nee | Nee | Nee | A-01 t/m A-55 (text), D-01 t/m D-55 (data), meeste entries |
| **Agent** (subagent) | Ja | Ja | Ja | Entries die file I/O, git, of shell nodig hebben (E-*, G-*, K-*) |
| **Teammate** | Ja | Ja | Ja | Agents in team-composities (flow/pool voorbeelden hierboven) |

### Prompt Template Definitie (meeste entries)

```yaml
id: "summarize"
name: "Summarize"
category: "text"
sdk_type: "skill"            # skill | subagent | teammate
description: "Vat tekst samen tot de kern (3-5 zinnen)"
input: "Tekst (any length)"
output: "Samenvatting (3-5 zinnen)"
model_hint: "haiku"          # haiku = snel/goedkoop, sonnet = standaard, opus = complex
max_tokens: 500
system_prompt: |
  Je bent een samenvatter. Je ontvangt tekst en retourneert een samenvatting
  van maximaal 5 zinnen. Behoud de kernboodschap. Geen inleiding, geen afsluiting,
  alleen de samenvatting.
tools: []                    # Geen tools = prompt template / skill
```

### Agent Definitie (met tools + autonome loop)

```yaml
id: "file-organizer"
name: "File Organizer"
category: "file"
sdk_type: "subagent"         # Draait in eigen context window
description: "Organiseert bestanden in mappen op basis van type en inhoud"
input: "Directory path"
output: "Georganiseerde directory + rapport"
model_hint: "sonnet"
max_tokens: 4000
system_prompt: |
  Je bent een bestandsorganisator. Analyseer alle bestanden in de opgegeven
  directory, categoriseer ze op type en inhoud, en verplaats ze naar logische
  submappen. Rapporteer wat je hebt gedaan.
tools:                       # Tools = echte agent (autonome loop)
  - "Read"
  - "Bash"
  - "Glob"
  - "Write"
workspace:                   # 6-layer stack (D-024)
  claude_md: "agent-configs/file-organizer/CLAUDE.md"
  skills: ["file-classification"]
  hooks: ["post-move-verify"]
```

### Model Routing per Agent

| Agent type | Model | Waarom |
|-----------|-------|--------|
| Classificatie (A-31..A-36, B-01, G-03) | Haiku 4.5 | Alleen categoriseren, minimale kosten |
| Transformatie (D-01..D-41, B-24..B-30) | Haiku 4.5 | Deterministische conversie, snel |
| Generatie (B-33..B-42, Q-01..Q-65, F-01..F-16) | Sonnet 4.6 | Creatieve output, goede kwaliteit |
| Analyse (C-01..C-60, N-01..N-45) | Sonnet 4.6 | Redenering nodig, maar niet maximaal |
| Complexe redenering (N-26..N-32, L-43..L-50) | Opus 4.6 | Diepe analyse, meerdere perspectieven |

---

## Groeipad

| Fase | Agents | Bron |
|------|:------:|------|
| MVP (Sprint 2) | 10 | Handmatig gebouwd |
| Beta | 50 | Factory portal |
| v1.0 | 200 | Community + Factory |
| v2.0 | 500+ | Community marketplace |
| v3.0 | 1000+ | Volledige library + auto-generatie |

De library groeit door:
1. **Factory portal** — gebruikers maken agents via wizard of conversatie
2. **Community** — agents delen en importeren
3. **Auto-generatie** — de semantische laag suggereert nieuwe agents op basis van gebruik

---

*1015 agents. Elk doet één ding. Combineer ze tot wat je wilt.*
