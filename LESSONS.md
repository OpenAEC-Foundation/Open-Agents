# Lessons Learned — Open-Agents

> Dit bestand groeit mee met het project. Elke sessie voegt nieuwe lessen toe.
> Claude Code leest dit bestand bij sessiestart en past de lessen toe.

---

## Sessie 2026-03-02 — Eerste oa-cli Orchestratie Run

### Orchestratie

| # | Les | Context |
|---|-----|---------|
| L-001 | **Orchestrator moet PERSISTENT draaien** — niet one-shot spawnen. De orchestrator delegeert en reviewt, doet ZELF geen werk. | Orchestrator-agent stopte na het spawnen van 4 sub-agents. `check_agent()` aangepast om parent alive te houden zolang children actief zijn. |
| L-002 | **ALLE agents onder een orchestrator** — gebruik `--parent orchestrator` bij elke sub-agent. Agents zonder parent hangen los en zijn niet te monitoren als groep. | 6 van 13 agents hadden geen parent → hiërarchie brak. |
| L-003 | **Twee agents mogen NOOIT naar hetzelfde bestand schrijven** — dit veroorzaakt onvoorspelbare conflicts. Plan taken zo dat bestanden niet overlappen. | Meerdere agents wilden ROADMAP.md aanpassen → last-write-wins probleem. |
| L-004 | **Orchestrator doet QA na elke batch** — review proposals voordat je de volgende batch start. Niet alles tegelijk spawnen en hopen dat het goed gaat. | 13 agents tegelijk → moeilijk te reviewen, sommige output was suboptimaal. |

### Proposal Mode

| # | Les | Context |
|---|-----|---------|
| L-005 | **Proposal mode als DEFAULT** — agents wijzigen nooit direct externe bestanden. Ze schrijven proposals naar `output/proposals/`. | User wil controle houden over wat er in de repo terechtkomt. |
| L-006 | **Proposals moeten strict format volgen** — `Bestand: /absoluut/pad` header + code block met volledige inhoud. Anders kan `oa apply` het target niet vinden. | Regex in `oa apply` zoekt naar specifieke headers. Sommige agents gebruikten andere formats. |
| L-007 | **Batch-apply is krachtig maar gevaarlijk** — altijd eerst `--dry-run` gebruiken. | 10 proposals in één keer applied → lastig te tracen als er iets mis gaat. |

### Shell & tmux

| # | Les | Context |
|---|-----|---------|
| L-008 | **Shell quoting via script file** — schrijf commands naar `.oa-run.sh` i.p.v. via tmux `send-keys` met shlex.quote nesting. tmux quoting is een nachtmerrie. | Nested single quotes in tmux send-keys werden niet correct geëscaped. |
| L-009 | **State file format: dict, niet list** — `~/.oa/agents.json` moet `{name: AgentRecord}` zijn, niet `[AgentRecord]`. | `load_agents()` verwacht `.items()` op een dict. |

### Context & Sessie Management

| # | Les | Context |
|---|-----|---------|
| L-010 | **Claude Code = doorgeefluik** — delegeer ALLES via `oa run`. Lees geen documenten zelf, doe geen werk zelf. Houd je context schoon voor orchestratie. | User moest meerdere keren zeggen: "je moet delegeren, niet zelf doen." |
| L-011 | **Handoff document schrijven aan einde sessie** — `docs/HANDOFF-<datum>.md` met alles wat de volgende instance moet weten. | Context gaat verloren tussen sessies. Handoff document = continuïteit. |
| L-012 | **Web UI moet gebuild worden na wijzigingen** — `cd oa-cli/web && npm run build`. De bridge serveert `dist/`, niet de source. | UI veranderde niet na agent output → bleek dat dist/ stale was. |
| L-013 | **Commit in logische batches** — niet alles in één commit. Feature-per-feature, met duidelijke conventional commit messages. | 248 files in working directory → moeilijk te reviewen als één commit. |

### WSL-specifiek

| # | Les | Context |
|---|-----|---------|
| L-014 | **`head`, `tail`, `grep` soms niet op PATH** — gebruik `python3 -c "..."` als workaround voor text processing in WSL. | Bash commands faalden met "command not found" in WSL omgeving. |

---

### Proposal Mode (vervolg)

| # | Les | Context |
|---|-----|---------|
| L-015 | **Proposals ALTIJD syntax-valideren voor apply** — code proposals kunnen truncated zijn (incompleet code block), syntax errors bevatten, of ontbrekende imports hebben. Voer altijd `python3 -c "import ..."` of vergelijkbare check uit na apply. | Twee proposals (cli.py en orchestrator.py) hadden truncated triple-quoted strings → hele CLI kapot. |

### Orchestratie (vervolg)

| # | Les | Context |
|---|-----|---------|
| L-016 | **`oa delegate` als default, `oa run` als uitzondering** — gebruik `oa delegate` voor taken die meer dan 1 agent nodig hebben. `oa run` alleen voor simple one-shot tasks. | Orchestrator-first architectuur (D-051). |

### Context & Sessie Management (vervolg)

| # | Les | Context |
|---|-----|---------|
| L-017 | **Doe GEEN handmatige code-fixes in de Claude Code sessie** — als een proposal kapot is, spawn een fix-agent. De Claude Code sessie moet doorgeefluik blijven. | Claude Code sessie raakte vervuild door handmatige fixes aan cli.py en orchestrator.py. |

### Direct Mode (afschaffing proposal mode)

| # | Les | Context |
|---|-----|---------|
| L-018 | **Proposal mode afgeschaft — agents schrijven direct** — Proposal mode veroorzaakt te veel overhead: review fatigue, truncatie-bugs in code blocks, en vertraging. Agents schrijven nu direct naar `./output/result.md`. Alleen voor code-wijzigingen aan de repo zelf nog een menselijke review-stap. | User feedback: "Ik wil niet meer met proposals werken, ik word er gek van." |
| L-019 | **Process-already-in-use bij port binding** — Bridge server (port 5174) crasht als een eerdere instance nog draait. Altijd eerst `lsof -ti:<port>` checken en killen voor je opnieuw start. | Web UI onbereikbaar door zombie bridge process. |

### Hiërarchie & Recursie

| # | Les | Context |
|---|-----|---------|
| L-020 | **Python versie-eis niet te strikt** — `requires-python = ">=3.11"` faalt op WSL Ubuntu 22.04 (Python 3.10). Gebruik `>=3.10` voor brede compatibiliteit. | pip install faalde met "requires a different Python: 3.10.12 not in '>=3.11'". |
| L-021 | **Syntax-validate VOOR apply, niet erna** — `compile(code, filename, 'exec')` op elk Python proposal VOORDAT het naar een bestand geschreven wordt. Voorkomt dat de CLI kapot gaat. | Drie proposals (cli.py, orchestrator.py x2) hadden truncated f-strings door backtick-conflict in markdown code fences. |

---

## Sessie 2026-03-02 — Lessen uit Claude Code Agent Teams

> Bron: https://code.claude.com/docs/en/agent-teams
> Agent Teams is een experimentele feature in Claude Code die multi-agent orchestratie biedt.
> Veel patronen zijn direct toepasbaar op oa-cli.

### Coördinatie & Communicatie

| # | Les | Context |
|---|-----|---------|
| L-022 | **Shared task list met file locking > impliciete coördinatie** — agents moeten een gedeelde takenlijst kunnen lezen, claimen (met locking tegen race conditions), en als voltooid markeren. Task dependencies (`blockedBy`) zorgen voor automatisch unblocking. | Agent Teams gebruikt file-based task list. Onze pipeline heeft impliciete coördinatie (planner output → workers). Shared task list maakt status zichtbaar en maakt self-claiming mogelijk. |
| L-023 | **Inter-agent messaging is essentieel voor complexe taken** — agents die alleen naar een lead rapporteren missen kansen. Direct messaging (DM + broadcast) tussen agents leidt tot betere uitkomsten bij research, debugging, en review. | Agent Teams: "Use subagents when only the result matters. Use agent teams when teammates need to share findings and challenge each other." Onze agents zijn nu volledig geïsoleerd. |
| L-024 | **Graceful shutdown protocol voorkomt orphaned processes** — agents moeten een shutdown request kunnen ontvangen en approve/rejecten. Niet alleen hard killen (`oa kill`). | Agent Teams: lead stuurt shutdown request, teammate kan rejecten met reden ("still working on task #3"). Voorkomt werk-verlies bij voortijdig killen. |

### Team Sizing & Taak Planning

| # | Les | Context |
|---|-----|---------|
| L-025 | **3-5 agents optimaal, 5-6 taken per agent** — meer agents = meer coördinatie overhead, diminishing returns. "Three focused teammates often outperform five scattered ones." | Bevestigt L-004 (13 agents was te veel). Agent Teams docs: "Start with 3-5 teammates. Scale up only when the work genuinely benefits." |
| L-026 | **Taken moeten de juiste maat hebben** — te klein = overhead > benefit, te groot = te lang zonder check-in. Ideaal: "self-contained units that produce a clear deliverable." | Agent Teams: "A function, a test file, or a review." Onze pipeline subtasks moeten dit formaat volgen. |

### Architectuur Inzichten

| # | Les | Context |
|---|-----|---------|
| L-027 | **Subagents vs Teams = twee patronen, niet één** — subagents voor focused taken waar alleen het resultaat telt. Teams voor werk dat discussie en samenwerking vereist. Beide patronen naast elkaar aanbieden. | Agent Teams vs subagents tabel. Mapt op onze `oa run` (subagent) vs `oa delegate` (team). Bewuste keuze per taak. |
| L-028 | **Quality hooks op idle en task-complete** — automatische checks wanneer een agent idle gaat of een taak afrondt. Hook kan agent terugsturen ("exit code 2 = keep working"). | Agent Teams: `TeammateIdle` en `TaskCompleted` hooks. Voorkomt dat agents stoppen met half werk. Toepasbaar in oa-cli via tmux monitoring. |
| L-029 | **Team discovery via config file** — agents moeten andere agents kunnen ontdekken via een gedeeld config bestand met namen en rollen. Niet alleen via parent/child hiërarchie. | Agent Teams: `~/.claude/teams/{name}/config.json` met members array. Onze `~/.oa/agents.json` kan dit patroon overnemen. |

---

## Sessie 2026-03-03 — Multi-Agent Refactoring & Research

### Orchestratie

| # | Les | Context |
|---|-----|---------|
| L-030 | **Parallel agents op dezelfde bestanden kan werken** — mits de scopes voldoende gescheiden zijn (proposals verwijderen ≠ utils extraheren ≠ modules splitsen). Maar het is risicovol. Beter: sequentieel of git worktrees. | 3 agents bewerkten dezelfde Python modules tegelijk. CLI bleef werkend doordat elke agent een ander aspect wijzigde. |
| L-031 | **`oa run --direct` is de standaard** — proposal mode volledig afgeschaft. Agents schrijven direct. `oa review` / `oa apply` commands verwijderd uit CLI. | User: "proposals is achterhaald, gewoon rammen." Geïnspireerd door Mario Zegner's aanpak. |
| L-032 | **9 agents is beheersbaar** — 3 audit (read-only) + 3 fix (code-wijzigend) + 3 research (read-only). Mix van read-only en write agents reduceert conflicten. | Totale sessie: 9 agents, allemaal succesvol afgerond, 4 commits gepusht. |
| L-033 | **Web UI dependencies niet vergeten** — `npm install` nodig na package.json wijzigingen door agents. `npm run build` na elke UI wijziging. | Web build faalde door ontbrekende @tailwindcss/vite dependency. `npm install` loste het op. |

---

## Sessie 2026-03-07 — Skill-Backed Agent Architecture & Showcase

### Skill-Backed Agents

| # | Les | Context |
|---|-----|---------|
| L-034 | **Skill-backed agents = 1:1 SKILL.md → JSON template mapping** — Elke skill uit een skill package mappt exact naar één atomaire agent JSON. De systemPrompt bevat de gecomprimeerde kern van de SKILL.md. Schaalbaar naar elk domein. | 73 AEC agents gegenereerd uit 73 skills. 4 generator-agents parallel, elk een technologie. |
| L-035 | **Meta-orchestrator = mens + Claude Code sessie** — Het strategisch brein is de mens + Claude Code sessie samen. Agents zijn de handen. Denken en beslissen hier, uitvoeren via oa run. | Evolutie van L-010 "doorgeefluik" naar bewust strategisch partnerschap. |
| L-036 | **Model tiering via modelHint** — syntax/errors→haiku (snel, goedkoop), impl/core→sonnet (gebalanceerd), agents/orchestrators→opus (diep). Default sonnet. | 73 templates kregen modelHint veld. Bespaart tokens zonder kwaliteitsverlies. |
| L-037 | **Batch template generation: 4 agents parallel werkt uitstekend** — Elk 1 technologie, geen file overlap, 73 templates in ~10 minuten. | Bevestigt L-025 (3-5 agents optimaal) en L-003 (geen gedeelde bestanden). |
| L-038 | **Art direction als context is essentieel voor visuele kwaliteit** — AI produceert technisch correcte maar lelijke output zonder expliciete esthetische richtlijnen. Kleurpaletten met hex codes, material recipes met exacte waarden, lighting setups, camera rules. | Showcase workspace kreeg ART_DIRECTION.md met Scandinavisch modernisme stijl. |
| L-039 | **Workspace = geassembleerd product, skill package = bron** — De skill package repo is voor ontwikkeling. Een workspace is een kant-en-klaar product dat skills, CLAUDE.md, MCP config, en demo prompts combineert. Twee verschillende dingen. | Showcase workspace op apart pad, niet in skill package repo. |

---

## Sessie 2026-03-08 — Iterative Planning & Orchestration Patterns

### Planning

| # | Les | Context |
|---|-----|---------|
| L-040 | **Iteratieve planning via agents > statische plan mode** — In plaats van Claude Code's ingebouwde plan mode (die één shot maakt), spawn een planner-agent (opus) + reviewer-agent (sonnet) in een feedback loop. Sneller, parallelliseerbaar, en het plan wordt een versioneerbaar artefact. | Ontwikkeld tijdens kinetic facade showcase. Plan mode was te rigide voor complexe multi-agent workflows. |
| L-041 | **Vier orchestratie patronen, elk voor een ander doel** — `oa run` = one-shot, `oa pipeline` = lineaire decompose+execute, `oa delegate` = autonome orchestrator+workers, iterative-planner = planning fase met feedback loop. De planning fase KAN voorafgaan aan pipeline of delegate. Ze zijn lagen, niet alternatieven. | Template: `agents/library/core/iterative-planner.json`. |
| L-042 | **Templates zijn metadata, niet executable** — `oa run` heeft geen `--template` flag. Templates in de library zijn patronen die de meta-orchestrator leest en handmatig omzet naar `oa run` commands. Feature gap: `oa run --template core/iterative-planner` zou templates direct executable moeten maken. | Alle 90+ templates in de library zijn documentatie, niet integrated in de CLI. |

---

## Sessie 2026-03-08 — open-pdf-studio Research & Workspace Config

### Overdraagbare Patronen van open-pdf-studio

| # | Les | Context |
|---|-----|---------|
| L-043 | **Async task queue pattern voorkomt race conditions** — Serialiseer gerelateerde async operaties via een promise-chain (last = previous.then(next)). UI update synchroon, I/O geserialiseerd. Toepasbaar op agent spawns die dezelfde resource raken. | open-pdf-studio `openFiles()`: UI tabs instant, file loads geserialiseerd via `fileOpenQueue = fileOpenQueue.then(...)`. |
| L-044 | **Session checkpoint pattern voor agent crash-recovery** — Sla intermediate agent state op als JSON blob na elke significante stap. Bij crash: resume vanuit checkpoint in plaats van herstart. De orchestrator beheert checkpoints. | open-pdf-studio slaat volledige sessie op (tabs, pagina, scroll, annotaties) bij elke state-wijziging. Vertaalt naar: `~/.oa/checkpoints/<agent-id>.json`. |
| L-045 | **Release pipeline als oa pipeline bewijs** — Een standaard CI/CD release workflow (create release → N× parallel builders → combine & publish) is exact het oa pipeline patroon. Dit valideert dat oa pipeline het juiste abstractieniveau heeft voor multi-step, multi-platform builds. | open-pdf-studio release.yml: planner (draft release) → 4× workers (macos-intel, macos-arm, win-sys, win-user) → combiner (upload artifacts). |
| L-046 | **`permissions.defaultMode: "bypassPermissions"` = correct veld voor skip-all** — `dangerouslySkipPermissions` bestaat niet als settings veld. De juiste manier om alle permissievragen te skippen in workspace settings is `permissions.defaultMode: "bypassPermissions"`. | Schema-validatie fout bij poging om `dangerouslySkipPermissions` toe te voegen aan `.claude/settings.json`. |

---

## Sessie 2026-03-08 — Skill Package Fase 0: Skills, Protocol & Research

### WSL & Bestandssysteem

| # | Les | Context |
|---|-----|---------|
| L-047 | **WSL/NTFS corrupt bestand fix — gebruik python3 -c met open(path,"w",newline="\n")** — De Write tool van Claude Code schrijft op Windows filesystem soms met \r\n line endings of BOM-tekens, wat YAML frontmatter en markdown parsers breekt. Gebruik altijd `python3 -c "open(path,'w',newline='\\n').write(content)"` voor skills op het Windows filesystem. | Skill bestanden op /mnt/c/ hadden corrupt frontmatter na Write tool. python3 workaround loste het volledig op. |

### Claude 4.x Skill Schrijven

| # | Les | Context |
|---|-----|---------|
| L-048 | **Claude 4.x overtriggering — bare ALWAYS/NEVER vervangen door reason-bearing imperatives** — Claude 4.x modellen volgen bare ALWAYS/NEVER instructies te letterlijk en triggeren bij elke vage overeenkomst. Gebruik reason-bearing imperatives: "ALWAYS use X because Y" of "NEVER do X when Z" zodat het model context mee kan wegen. | Skills met bare ALWAYS/NEVER triggerde op niet-bedoelde user prompts. Na omschrijven naar reason-bearing formaat nam false positive rate sterk af. |
| L-049 | **Skill description budget — max 50 woorden, alleen trigger-condities, geen capability claims** — Claude Code's skill selection gebruikt de description veld voor matching. Te lange descriptions bevatten ruis (capability claims, uitleg) die matching verslechtert. Hou descriptions onder 50 woorden en schrijf alleen TRIGGER WHEN / DO NOT TRIGGER WHEN condities. | SKILL-PROTOCOL.md sectie 2.3: description is trigger-selector, niet marketingtekst. Beschrijvingen boven 50 woorden leidden tot slechte skill selectie. |
| L-050 | **Skills zijn directories, niet losse .md bestanden — gebruik officiële SKILL.md structuur** — Losse `.claude/skills/foo.md` bestanden zijn de oude aanpak. De officiële structuur is een directory per skill: `.claude/skills/foo/SKILL.md` (+ optioneel examples/, tests/). Dit maakt skills versie-controleerbaar en uitbreidbaar met bijlagen. | 14 skills gemigreerd van losse .md naar directory-structuur. SKILL-PROTOCOL.md documenteert het volledige formaat. |

### Agent Spawning & tmux Targeting

| # | Les | Context |
|---|-----|---------|
| L-051 | **Duplicate tmux window names breken send-keys targeting** — tmux staat duplicate window names toe. Als een agent spawn mislukt na `new-window` maar voordat `send-keys` commands uitvoerd worden, blijft een leeg window bestaan. Bij hergebruik van dezelfde agent naam mislukken alle volgende `send-keys` calls met "ambiguous target" error. | Oorzaak: security fix (shell=True → shlex.split) maakte fouten zichtbaar die eerder stil faalden. Fix: gebruik `new-window -P -F "#{window_index}"` om het window index terug te krijgen, en target `send-keys` op index i.p.v. naam. Workaround: `oa kill <naam>` + handmatig duplicate tmux windows verwijderen. |

---

## Sessie 2026-03-08 — Nested Spawning, Product Assessment & Parallel Fixes

### Orchestratie & Architectuur

| # | Les | Context |
|---|-----|---------|
| L-052 | **Nested spawning fix = twee bestanden, <40 regels totaal** — Agents kunnen sub-agents spawnen via `oa run` als (1) PATH `/home/freek/.local/bin` aanwezig is in de shell omgeving en (2) de CLAUDE.md instructie expliciet zegt "gebruik Bash tool met oa run, nooit de ingebouwde Agent tool". Minimale ingreep, maximaal effect. | Eerder mislukte nested spawning omdat agents de ingebouwde Agent tool gebruikten (invisible voor oa status). PATH + CLAUDE.md instructie lost dit volledig op. |
| L-053 | **Product assessment via opus agent geeft eerlijker beeld dan zelf scannen** — Een dedicated product-assessor agent (opus) die de volledige codebase doorloopt rapporteert eerlijker over wat werkt, gedeeltelijk werkt, en kapot is dan de meta-orchestrator die neigt naar optimisme. Aparte assessment-stap vóór fix-planning is essentieel. | product-assessor agent ontdekte: template_loader.py ontbrak, 2 template-systemen die niet communiceren, Onboarding niet geïntegreerd, guardian trigger niet beschikbaar via UI. |
| L-054 | **Parallel agents voor top-N fixes is efficiënter dan sequentieel** — Na een product assessment: spawn N fix-agents parallel (één per fix), niet sequentieel. Voorwaarde: fixes mogen geen gedeelde bestanden bewerken. Bij de top-5 fixes waren alle targets gescheiden (template_loader.py, templateStore.ts, App.tsx, bridge.py, GuardianPanel.tsx). | 5 fix-agents parallel afgerond in de tijd van 1-2 sequentiële agents. Bevestigt L-037 (batch template generation) en L-003 (geen gedeelde bestanden). |
---

## Sessie 2026-03-08 — Skill Package Fase 1: Volledige Skill→Agent Koppeling

### WSL & Bestandssysteem (bevestigd op schaal)

| # | Les | Context |
|---|-----|---------|
| L-055 | **Python schrijfmethode bewezen op schaal — 22 skills zonder corruptie** — WSL/NTFS corruptie-risico volledig vermeden door consistent `python3 -c "open(path,'w',newline='\n',encoding='utf-8').write(content)"` te gebruiken voor alle skill bestanden. Write tool is verboden voor NTFS paths. | 22 skills geschreven in Fase 1 zonder één geval van BOM of 
 corruptie. Bevestigt L-047 op productieschaal. |

### Claude 4.x Skill Schrijven (bevestigd op schaal)

| # | Les | Context |
|---|-----|---------|
| L-056 | **Reason-bearing imperatives zijn de standaard voor alle nieuwe skills** — Bare ALWAYS/NEVER veroorzaken aantoonbaar overtriggering in Claude 4.x. SKILL-PROTOCOL.md schrijft nu reason-bearing imperatives voor als enige toegestane vorm. | Alle 22 skills in Fase 1 geschreven met reason-bearing format. Nul gemelde false positives. Bevestigt en formaliseert L-048. |
| L-057 | **50-woorden description budget is bewezen effectief** — Skills met <50 woorden in description triggeren betrouwbaarder dan langere descriptions. SKILL-PROTOCOL.md sectie 2.3 is de definitieve norm. | 22 skill descriptions gemiddeld 32 woorden. Selectienauwkeurigheid hoog in tests. Bevestigt L-049. |

### Skill Package Architectuur

| # | Les | Context |
|---|-----|---------|
| L-058 | **1:1 skill→agent koppeling schaalt naar 22+ skills** — Elk SKILL.md mappt exact naar één JSON agent template. 14 skill-gekoppelde templates + 19 algemene templates = 33 totaal in agents/library/core/. Geen N:1 of 1:N relaties nodig gebleken. | Fase 1 voltooid: 22 skills + 33 templates. Bevestigt L-034 (skill-backed agents patroon) op grotere schaal. |
| L-059 | **Directory structuur is productieklaar — nooit losse .md bestanden** — De `.claude/skills/naam/SKILL.md` directory structuur is de enige correcte aanpak. Maakt skills uitbreidbaar met examples/ en tests/ subdirectories. Gemigreerd en bewezen in Fase 0+1. | 22 skills in directory structuur zonder problemen. Verheft L-050 tot harde eis: losse bestanden zijn niet toegestaan. |

---

## Sessie 2026-03-10 — Dashboard Refactor & Agent Library Wave 1

### Parallel Agent Delegation at Scale

| # | Les | Context |
|---|-----|---------|
| L-060 | **Parallel agent delegatie werkt optimaal in waves van 4-6 agents.** Wave 1 (commits + implementatie tegelijk) + Wave 2 (integratie) geeft maximale voortgang per sessie. | 5 parallel component-builders (ErrorBoundary, ToastProvider, PipelinePanel, TaskBoard, CSS tokens) + 4 parallel agent template builders (batches 13-16). Wave 1: 9 agents non-overlapping targets. Wave 2: integratietesten, API wiring. Bevestigt en schaalt L-037 (batch template generation) op grotere gemengde workloads. |

| L-061 | **5 haiku-agents tegelijk is te veel — max 4 parallel voor haiku.** Bij batch-29 (5 categorieën tegelijk) faalden 3 van 5 haiku-agents zonder output te schrijven. Oorzaak: te hoge concurrency voor haiku model. Fix: max 4 agents tegelijk voor haiku, 3 voor complexe taken. | Batch-29 (2026-03-10): autonomous-vehicles, logistics, ar-vr faalden. quantum-computing en smart-city (partial) slaagden. Bevestigt dat 4 het optimum is (L-037). |
| L-062 | **Agent library templates worden NIET getest — dit is een risico.** 1177 templates aangemaakt, maar er is geen validator, geen CI pipeline, geen test runner. Problemen gevonden: 14 templates gebruiken `prompt` ipv `systemPrompt`, 156 missen `tags` veld. Template_loader.py laadt alles zonder validatie. | Review sessie 2026-03-10. Zie OPEN-QUESTIONS.md voor actiepunten. |
| L-063 | **Schema inconsistentie tussen batches door verschillende agent-instructies.** Sommige batch-agents schreven `prompt` ipv `systemPrompt`, sommige misten `tags`. Fix: altijd een referentie-template meegeven in de prompt + expliciete veldnamen in de taakbeschrijving. | Gevonden bij review 2026-03-10. Nieuwere batches (14+) correct na aanpassing instructie. |

---

## Sessie 2026-03-11 — Sprint 17/18/21 Batch Afronding

### Reviewer-before-commit Patroon

| # | Les | Context |
|---|-----|---------|
| L-064 | **Reviewer-before-commit patroon werkt — PARTIAL verdict + fixer-agent = 12/12 in één extra ronde** — Een reviewer-agent die PASS/PARTIAL/FAIL geeft per deliverable, gecombineerd met een targeted fixer-agent voor PARTIAL items, levert in één extra iteratieronde volledige conformiteit. Efficiënter dan N ronden zonder reviewer. | Sprint 17/18 batch: reviewer gaf PARTIAL voor 3 van 12 items → fixer-agent gecorrigeerd → eindresultaat 12/12. Bevestigt L-004 (QA na batch) en formaliseert het patroon. |

### Agent Autonomie & Scope

| # | Les | Context |
|---|-----|---------|
| L-065 | **Agents bouwen meer dan gevraagd (Sprint 22-24 modules aangemaakt) — dit is gewenst gedrag, geen scope creep** — Wanneer een agent pre-implementation modules aanmaakt voor toekomstige sprints terwijl hij zijn primaire taak uitvoert, is dit waardevol. Het toont architectuurinzicht en reduceert opstartkosten voor volgende sprints. Niet afremmen tenzij het de primaire taak schaadt. | Sprint 21 agent maakte blind_spot_scanner, compliance_checker, context_decay_monitor, graveyard, knowledge_boundary, meta_agent, pattern_miner aan naast de gevraagde Sprint 21 deliverables. |

### FastMCP Integratie

| # | Les | Context |
|---|-----|---------|
| L-066 | **FastMCP @mcp.tool() decorators werken als drop-in voor oa-cli tools** — FastMCP tools zijn Python functies met @mcp.tool() decorator. Ze werken goed als wrapper rond bestaande oa-cli subprocess calls en messaging.py functies. Geen adapter-laag nodig — directe import van oa-cli modules werkt. | mcp_server.py implementatie: 7 tools gebouwd in één agent-run. FastMCP abstractie elimineert boilerplate. Tool-for-tool pariteit met CLI commando's bevestigd. |

## Sessie 2026-03-11 — Hook False Positive bij Agent Delegatie

### check-delegation.sh Scope Probleem

| # | Les | Context |
|---|-----|---------|
| L-067 | **check-delegation.sh telt && in agent-prompt inhoud als bash-stappen — false positive** — De hook telt alle && in het volledige bash-commando, inclusief de inhoud van string-argumenten. Hierdoor wordt `oa run "...prompt met && erin..."` geblokkeerd terwijl dit JA al delegatie is. Fix: als het commando begint met `oa run`, direct exit 0 (want oa run IS de delegatie). | Gevonden 2026-03-11: gpu-master agent prompt bevatte && in stap-beschrijvingen → hook blokkeerde het spawnen van de orchestrator zelf. Workaround: `touch /tmp/claude-delegation-override` voor elke oa run aanroep. |
| L-068 | **Agent-prompts met meerdere stappen bewust && gebruiken — hook moet prompt-inhoud uitsluiten van analyse** — Elke goede orchestrator-prompt bevat instructies met && voor de sub-agents die hij zal spawnen. Deze && horen niet in de hook-analyse. Scoperegel: analyseer alleen het "outer" bash-commando (alles voor het eerste aanhalingsteken), niet string-argumenten. | Zelfde context als L-067. Patroon: `oa run '...10x && ...' --name x --model y --direct` triggert false positive bij 3+ && in de prompt. |

## Sessie 2026-03-11 — LiteLLM als oa-cli Model Gateway

| # | Les | Context |
|---|-----|---------|
| L-069 | **LiteLLM is de unified model gateway voor gemengde agent-bomen — niet alleen een provider-mixer** — Initiële inschatting was dat LiteLLM weinig waarde toevoegt in een 100% lokale setup. Correctie: LiteLLM is essentieel zodra oa-cli agents draaien op lokale modellen naast Claude-agents. Het normaliseert Ollama, Groq, OpenAI en lokale backends naar één OpenAI-compatibel endpoint op :4000. Agents hoeven geen provider-specifiek formaat te kennen. | 2026-03-11: gebruiker wees op oa-cli tmux-architectuur — agents kunnen op elk model draaien. LiteLLM maakt mixed-provider agent-bomen mogelijk: claude/opus voor redenering, local/qwen14b voor batch, groq/mixtral voor snelheid — allemaal via dezelfde orchestratielaag. |

*Nieuwe lessen worden per sessie toegevoegd. Nummer door: L-070, L-071, etc.*
