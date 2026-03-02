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

*Nieuwe lessen worden per sessie toegevoegd. Nummer door: L-030, L-031, etc.*
