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

*Nieuwe lessen worden per sessie toegevoegd. Nummer door: L-015, L-016, etc.*
