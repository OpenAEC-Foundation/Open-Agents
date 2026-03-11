# CONSTRAINTS — Open-Agents

> **Doel:** Platform-vereisten, technische begrenzingen en operationele kaders waaraan het Open-Agents project zich moet houden. Dit zijn geen keuzes — dit zijn feiten en harde grenzen.
> **Levenscyclus:** APPEND-ONLY — entries worden NOOIT verwijderd. Vervallen entries worden gemarkeerd met `[VERVALLEN: datum — reden]` maar blijven in het bestand staan.
> **Gebruik (mens):** Raadplegen voor je een beslissing neemt die raakt aan platformvereisten, agent spawning, bestandssysteem of model-configuratie.
> **Gebruik (AI):** Raadplegen bij twijfel over wat toegestaan is. Heeft voorrang op alles behalve expliciete gebruikersinstructies.
> **Automaties:** Geen — dit bestand wordt niet automatisch bijgewerkt.
> **Zelfreferentie:** Dit bestand begrenst ook zichzelf — het mag niet worden aangepast om begrenzingen weg te schrijven.
> **Tags:** #meta #platform #agent-spawning #bestandssysteem #model #oa-cli #wsl2

---

## Hoe dit bestand gebruiken

### Toevoegen
Nieuwe beperking ontdekt (via LESSONS.md, Issues, of externe bron)? Voeg toe in de juiste categorie met bronvermelding. Gebruik het formaat: **Beperking | Detail/waarde | Bron | Gevolg/workaround**.

### Aanpassen
Alleen als de externe werkelijkheid daadwerkelijk veranderd is. Noteer de datum en reden van wijziging als commentaar achter de gewijzigde entry.

### Verwijderen
**NOOIT verwijderen.** Markeer als `[VERVALLEN: YYYY-MM-DD — reden]` en laat de entry staan. Het APPEND-ONLY principe is absoluut.

---

## Platform-vereisten

**Bron:** D-045 (oa-cli architectuur), D-048 (UI strategie), L-020 (Python versie-eis)

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **Besturingssysteem** | WSL2 Ubuntu — oa-cli werkt NIET op native Windows | D-045 | Gebruik ALTIJD WSL2-sessie voor alle oa commando's |
| **tmux vereist** | oa-cli gebruikt tmux voor agent process management | D-045, D-046 | Zonder tmux werken `oa start`, `oa run`, `oa dashboard` NIET |
| **Python versie** | Python ≥ 3.10 (NIET ≥ 3.11) — Ubuntu 22.04 heeft Python 3.10.12 | L-020 | `requires-python = ">=3.10"` in pyproject.toml — nooit aanscherpen naar 3.11+ |
| **fcntl / filelock** | Linux-only syscall voor file locking — bestaat NIET op Windows | D-045, L-022 | Alle file locking code ALLEEN uitvoeren in WSL2-context |
| **PATH expliciet zetten** | `/home/freek/.local/bin` is niet altijd op PATH in WSL | L-014, L-052 | ALTIJD `export PATH="$HOME/.local/bin:$PATH"` uitvoeren voor oa commando's |
| **head/tail/grep soms afwezig** | Bash utils soms niet op PATH in WSL-omgeving | L-014 | Gebruik `python3 -c "..."` als workaround voor tekst-processing |

---

## Technische begrenzingen — Claude Code Subscription

**Bron:** D-045, D-048, D-050 (subscription-gebaseerde architectuur)

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **Geen API-kosten** | oa-cli gebruikt Claude Code subscription via tmux — GEEN Anthropic API | D-045, D-048 | Model keuze heeft geen directe kostenimpact maar wél rate limits |
| **Rate limits bestaan** | Claude Code subscription heeft rate limits per sessie/tijdvenster | Anthropic ToS | Bij rate limit: wacht of verlaag parallelisatie; NOOIT API-sleutel bypassen |
| **tmux sessie-limiet** | Één oa-sessie per tmux server — meerdere tmux servers zijn mogelijk maar verwarrend | D-045 | Gebruik `oa start` / `oa stop` per project; mix NOOIT sessies |
| **Agent workspace is volatiel** | Agent workspaces in `/tmp/oa-agent-*/` verdwijnen bij reboot | Issue #10 | ALTIJD `--direct` gebruiken zodat output naar project directory gaat |
| **Port 5174 in gebruik** | Bridge server (oa web) crasht als eerdere instance nog draait | L-019 | ALTIJD `lsof -ti:5174 | xargs kill -9` uitvoeren voor `oa web` |

---

## Agent Spawning Begrenzingen

**Bron:** Issue #9, #10, #11, L-004, L-025, L-037, L-061, CLAUDE.md kerngedrag

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **FLAT SPAWNING verplicht** | Agents spawnen NOOIT sub-agents via `oa run`. Alle agents worden DIRECT vanuit de top-level Claude Code sessie gespawnd. | Issue #9, #11, L-004 | Meta-orchestrator = enige spawner. NOOIT orchestrator-agent die workers spawnt. |
| **MAX_DEPTH = 1** | Slechts één niveau diepte: meta-orchestrator → workers. Geen nesting. | Issue #9, L-004 | Als een agent sub-taken heeft: splits op in aparte top-level workers |
| **Max 4-6 agents parallel** | Optimale batch-grootte is 3-5 agents; max 6 bij niet-overlappende targets | L-025, L-037, L-060 | Meer dan 6 tegelijk geeft QA-overload en verhoogt kans op conflicts |
| **Max 4 haiku-agents parallel** | Bij 5+ parallelle haiku-agents falen er 3 van 5 zonder output | L-061 | NOOIT meer dan 4 haiku-agents tegelijk spawnen; gebruik max 3 bij complexe taken |
| **Geen gedeelde bestanden** | Twee agents mogen NOOIT naar hetzelfde bestand schrijven | L-003 | Plan taken zo dat output-paden uniek zijn per agent |
| **--direct verplicht** | Elke `oa run` MOET `--direct` bevatten — zonder dit verdwijnt output in `/tmp` | Issue #10, L-010, L-031 | Gebruik `oa run "taak" --direct` — ALTIJD |
| **--model verplicht** | Elke `oa run` MOET `--model` specificeren — NOOIT de default gebruiken | CLAUDE.md model tiering | Gebruik `--model claude/sonnet`, `--model claude/haiku`, of `--model claude/opus` |
| **Claude Agent tool verboden voor sub-taken** | Agents die de ingebouwde Agent tool gebruiken spawnen onzichtbare sub-agents die niet via `oa status` te monitoren zijn | Issue #9, L-052 | CLAUDE.md van elke agent MOET expliciet vermelden: "gebruik Bash tool met oa run, nooit de ingebouwde Agent tool" |

---

## Bestandssysteem Begrenzingen

**Bron:** L-047, L-055, L-059

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **NOOIT Write tool op NTFS-paden** | Claude Code's Write tool schrijft op `/mnt/c/` soms met `\r\n` line endings of BOM-tekens — breekt YAML frontmatter en markdown parsers | L-047 | Gebruik ALTIJD `python3 -c "open(path,'w',newline='\n',encoding='utf-8').write(content)"` voor bestanden op `/mnt/c/` |
| **python3 open() met newline="\\n"** | Enige veilige schrijfmethode voor skills en configs op Windows filesystem | L-047, L-055 | Bewezen op productieschaal (22 skills zonder corruptie) |
| **Skills ALTIJD als directory** | `.claude/skills/naam/SKILL.md` — NOOIT losse `.md` bestanden | L-050, L-059 | Losse bestanden zijn niet uitbreidbaar en niet de officiële structuur |
| **State in ~/.oa/agents.json als dict** | `agents.json` MOET een dict `{name: AgentRecord}` zijn — NOOIT een list | L-009 | `load_agents()` verwacht `.items()` — list formaat breekt de CLI |
| **Proposals directory verboden** | Agents schrijven GEEN proposals naar `output/proposals/` — directe output naar `./output/result.md` | L-018, L-031 | Proposal mode is afgeschaft. NOOIT opnieuw invoeren zonder expliciete beslissing. |

---

## Model ID Conventies

**Bron:** D-011, CLAUDE.md conventies

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **Provider/model format verplicht** | ALTIJD `provider/model` format gebruiken: `anthropic/claude-sonnet-4-6`, `openai/o3`, `mistral/mistral-large`, `ollama/<model>` | D-011 | Bare model IDs (`claude-sonnet-4-6`) zijn NIET geldig in agent JSON templates |
| **oa-cli model shorthand** | In `oa run` gebruik je `claude/sonnet`, `claude/haiku`, `claude/opus` als shorthand | CLAUDE.md | Nooit bare `claude` zonder model-variant specificeren |
| **modelHint in agent templates** | Elk agent JSON template MOET een `modelHint` veld hebben | L-036, L-063 | Zonder modelHint wordt de default (sonnet) gebruikt — dit is toegestaan maar ondocumenteerd |
| **Huidige modellen** | Sonnet: `claude-sonnet-4-6`, Opus: `claude-opus-4-6`, Haiku: `claude-haiku-4-5-20251001` | CLAUDE.md omgeving | Verifieer bij nieuwe sessie of model IDs nog actueel zijn |

---

## oa-cli Vereisten

**Bron:** Issue #10, L-008, L-010, L-052, CLAUDE.md kerngedrag

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **--direct bij elke oa run** | Zonder `--direct` flag gaat agent output naar `/tmp/oa-agent-*/` en verdwijnt bij reboot | Issue #10 | `oa run "taak" --direct` — geen uitzonderingen |
| **Duplicate tmux window names** | tmux staat duplicaat window names toe — breekt `send-keys` targeting met "ambiguous target" error | L-051 | Target `send-keys` ALTIJD op window index, nooit op naam. Bij conflict: `oa kill <naam>` + handmatig opruimen |
| **Shell quoting via script file** | Shell commands via tmux `send-keys` met nested quotes mislukken — schrijf commands naar een `.oa-run.sh` script | L-008 | NOOIT commands met nested quotes direct via tmux send-keys sturen |
| **5-element prompt template verplicht** | Elke `oa run` prompt MOET bevatten: (1) absolute paden, (2) explicit scope, (3) reference files, (4) quality rules, (5) source URLs | L-010, Issue #12 | Ongestructureerde prompts → inconsistente output |
| **Agents erven GEEN project CLAUDE.md** | Elke agent draait in geïsoleerde workspace — project-specifieke regels MOETEN inline in de prompt | L-010 | Voeg quality rules, taalvoorkeur, en constraints ALTIJD toe aan de agent prompt zelf |

---

## GitHub PAT Scope Begrenzingen

**Bron:** CLAUDE.local.md (credentials), CLAUDE.md omgeving

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **Token 3 — Workflows scope** | GitHub PAT Token 3 heeft de `workflows` scope — vereist voor GitHub Actions wijzigingen | CLAUDE.local.md | Gebruik Token 3 voor CI/CD operaties, NIET Token 1 |
| **Token 1 — Geen Workflows scope** | Token 1 heeft GEEN workflows scope — schrijft niet naar `.github/workflows/` | CLAUDE.local.md | Gebruik Token 1 voor reguliere repo operaties (code, docs, PRs) |
| **Credentials NOOIT committen** | `CLAUDE.local.md` (tokens + API keys) ALTIJD in `.gitignore` | D-103 | Verifieer `.gitignore` voor elke commit die credentials-bestanden raakt |
| **Source credentials file** | `source "/mnt/c/Users/Freek Heijting/Documents/GitHub/Github Organisations/.env"` voor PAT toegang | CLAUDE.md omgeving | Uitvoeren voor elke GitHub operatie in WSL sessie |

---

## WSL2 — Bekende Begrenzingen

**Bron:** L-014, L-019, L-047, L-052

| Beperking | Detail/waarde | Bron | Gevolg/workaround |
|-----------|--------------|------|-------------------|
| **PATH is niet volledig** | `/home/freek/.local/bin` (oa-cli), `/usr/local/sbin`, `/usr/lib/wsl/lib` ontbreken soms | L-014, L-052 | ALTIJD expliciet PATH instellen: `export PATH="$HOME/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/lib/wsl/lib:$PATH"` |
| **head/tail/grep soms afwezig** | Standaard bash utilities zijn niet altijd beschikbaar op PATH | L-014 | Vervang door `python3 -c "import sys; ..."` equivalenten |
| **NTFS write corruptie** | Bestanden geschreven via Claude Code Write tool op `/mnt/c/` kunnen `\r\n` of BOM bevatten | L-047, L-055 | Zie sectie Bestandssysteem Begrenzingen — gebruik python3 open() |
| **Port-in-use risico** | Zombie processes kunnen ports (5174, 3001, 5173) bezethouden na crash | L-019 | Controleer met `lsof -ti:<port>` voor starten van services |

---

## Settings Discipline

**Bron:** CLAUDE.md CC_007

| Beperking | Correct locatie | NOOIT in | Bron |
|-----------|----------------|----------|------|
| **MCP servers** | `<workspace>/.mcp.json` | `~/.claude/settings.local.json` | CC_007 |
| **Skills** | `<workspace>/.claude/skills/` | `~/.claude/skills/` | CC_007 |
| **Hooks** | `<workspace>/.claude/settings.json` | `~/.claude/settings.json` (globaal) | CC_007 |
| **Secrets / tokens** | `<workspace>/CLAUDE.local.md` | Gecommitte bestanden | CC_007, D-103 |
| **Bypass permissions** | `permissions.defaultMode: "bypassPermissions"` in `.claude/settings.json` | `dangerouslySkipPermissions` (bestaat niet als veld) | L-046 |

---

*Impertio Studio B.V. — AI ecosystems, deployed right.*
*Eerste versie aangemaakt: 2026-03-11 door constraints-writer agent.*
