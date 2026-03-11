# AUTOMATIONS — Open-Agents

> **Doel:** Register van alle geautomatiseerde gedragingen in het Open-Agents project.
> **Levenscyclus:** Evoluerende toestand — automaties worden toegevoegd, gewijzigd of uitgeschakeld. NOOIT verwijderd.
> **Gebruik (mens):** Lezen om te begrijpen wat Claude automatisch doet. Vergelijken met werkelijk gedrag om drift te detecteren.
> **Gebruik (AI):** Raadplegen voor eigen gedrag. Bijwerken als automatie wordt toegevoegd of gewijzigd.
> **Automaties:** A-000 t/m A-014 actief.
> **Zelfreferentie:** Dit bestand is zowel de beschrijving van het systeem als onderdeel ervan.

---

## Hoe dit bestand gebruiken

### Toevoegen
Nieuwe automatie? Voeg entry toe met het format hieronder en geef het het volgende nummer (A-XXX).

### Aanpassen
Als een automatie verandert: update de entry én `Laatst gevalideerd`.

### Verwijderen
**NOOIT verwijderen — APPEND-ONLY register.** Markeer als `Status: Uitgeschakeld` met reden en datum. Uitgeschakelde entries blijven als historisch bewijs zichtbaar.

### Valideren
Na elke modelwisseling of grote configuratiewijziging: loop actieve automaties door en vergelijk met werkelijk gedrag. Noteer afwijkingen in LESSONS.md.

---

## Automaties

### A-000 — Zelfbeheer van AUTOMATIONS.md

**Trigger:** Nieuwe automatie ingericht, of bestaande gewijzigd of uitgeschakeld.
**Actie:** Voeg entry toe of update bestaande entry. Bij uitschakeling: markeer status met reden.
**Leest:** Dit bestand zelf (voor volgend nummer en bestaande entries).
**Schrijft naar:** Dit bestand zelf.
**Model:** claude-sonnet-4-6

**Doel:** Het register is altijd actueel en beschrijft werkelijk gedrag — niet wat ooit bedoeld was.

**Verwacht gedrag:**
- Elke actieve automatie heeft een volledig ingevulde entry
- Nieuw nummer is altijd hoger dan het hoogste bestaande nummer

**Validatie:** Tel actieve entries. Klopt dat met werkelijk geïmplementeerde automaties in CLAUDE.md?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-001 — Session bootstrap

**Trigger:** Start van elke Claude Code sessie in de Open-Agents workspace.
**Actie:** Lees LESSONS.md, meest recente HANDOFF-*.md en ROADMAP.md stil. Check `oa status`. Rapporteer beknopt.
**Leest:** LESSONS.md, docs/HANDOFF-*.md (meest recente), ROADMAP.md
**Schrijft naar:** Niets (alleen lezen en rapporteren).
**Model:** claude-sonnet-4-6

**Doel:** Claude heeft direct volledige projectcontext zonder dat de gebruiker iets hoeft uit te leggen.

**Verwacht gedrag:**
- Eerste response bevat statusrapport: Workspace / MCP / Skills / Lopende agents
- Bekende lessen worden direct toegepast, niet herhaald als fout

**Validatie:** Start een nieuwe sessie. Rapporteert Claude de juiste fase en openstaande issues uit ROADMAP.md?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-002 — Taak afgerond

**Trigger:** Een taak, sprint of fase in ROADMAP.md is voltooid.
**Actie:** Vink af in ROADMAP.md (checkbox [x], percentage bijwerken), append entry aan CHANGELOG.md.
**Leest:** ROADMAP.md, CHANGELOG.md
**Schrijft naar:** ROADMAP.md, CHANGELOG.md
**Model:** claude-sonnet-4-6

**Doel:** Projectvoortgang wordt direct vastgelegd. ROADMAP.md is altijd de actuele single source of truth.

**Verwacht gedrag:**
- ROADMAP.md toont `[x]` bij voltooide taak binnen dezelfde sessie
- CHANGELOG.md bevat een entry met datum en beschrijving

**Validatie:** Zijn er mondeling als klaar gemelde taken die nog `[ ]` hebben in ROADMAP.md?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-003 — Les geleerd

**Trigger:** Er is iets misgegaan en opgelost, of een inzicht opgedaan dat herhaling voorkomt.
**Actie:** Append genummerde entry aan LESSONS.md direct na het oplossen.
**Leest:** LESSONS.md (voor volgend nummer L-xxx)
**Schrijft naar:** LESSONS.md
**Model:** claude-sonnet-4-6

**Doel:** Fouten worden nooit twee keer gemaakt. Het systeem leert van zichzelf.

**Verwacht gedrag:**
- Entry bevat: nummer (L-xxx), probleem, oplossing, en les als één concrete zin
- Schrijft direct na oplossen — niet gebatcht aan sessie-einde

**Validatie:** Zijn er mondeling genoemde problemen die niet in LESSONS.md staan?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-004 — Architectuurkeuze gemaakt

**Trigger:** Een significante technische of architecturale beslissing is genomen.
**Actie:** Append entry aan DECISIONS.md met context, beslissing, motivatie en consequenties.
**Leest:** DECISIONS.md (voor context en volgend nummer D-xxx)
**Schrijft naar:** DECISIONS.md
**Model:** claude-sonnet-4-6

**Doel:** Beslissingen zijn traceerbaar. Toekomstige sessies begrijpen waarom iets zo is ingericht.

**Verwacht gedrag:**
- Entry bevat: nummer (D-xxx), datum, context, beslissing, motivatie, consequenties
- Wordt geschreven op het moment van beslissen — niet achteraf gereconstrueerd

**Validatie:** Zijn er impliciete keuzes gemaakt in de architectuur die niet in DECISIONS.md staan?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-005 — Open vraag

**Trigger:** Een open vraag of risico ontstaat, of een bestaande vraag wordt beantwoord.
**Actie:** Append aan OPEN-QUESTIONS.md (nieuw) of markeer bestaande vraag als beantwoord.
**Leest:** OPEN-QUESTIONS.md
**Schrijft naar:** OPEN-QUESTIONS.md
**Model:** claude-sonnet-4-6

**Doel:** Open vragen verdwijnen niet in de chat. Ze worden bijgehouden totdat ze beantwoord zijn.

**Verwacht gedrag:**
- Nieuwe vraag krijgt status `open`, nummer, en datum van ontstaan
- Beantwoorde vraag krijgt status `beantwoord` met antwoord en datum

**Validatie:** Zijn er vragen gesteld in de sessiechat die niet in OPEN-QUESTIONS.md staan?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-006 — Sessie afsluiten

**Trigger:** Sessie wordt afgesloten — expliciet door de gebruiker of na voltooiing van de hoofdtaak.
**Actie:** Schrijf docs/HANDOFF-<datum>.md. Commit alle gewijzigde bestanden. Push via token URL.
**Leest:** ROADMAP.md, LESSONS.md, OPEN-QUESTIONS.md, CHANGELOG.md
**Schrijft naar:** docs/HANDOFF-<datum>.md (nieuw bestand per sessie)
**Model:** claude-sonnet-4-6

**Doel:** De volgende sessie heeft direct bruikbare context — geen reconstructie nodig.

**Verwacht gedrag:**
- HANDOFF bevat: wat gedaan, huidige status, urgent voor volgende sessie, lopende agents
- Bestand is compact: maximaal 60 regels

**Validatie:** Kan een nieuwe sessie uitsluitend op HANDOFF verder zonder vragen te stellen?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-007 — Nieuw agent gedefinieerd

**Trigger:** Een nieuw agent template wordt aangemaakt in agents/library/ of agents/presets/.
**Actie:** Voeg agent toe aan AGENTS.md in de juiste categorie met id, naam, beschrijving, tools en modelHint.
**Leest:** AGENTS.md (voor context en positie in categorie)
**Schrijft naar:** AGENTS.md
**Model:** claude-sonnet-4-6

**Doel:** AGENTS.md is altijd een volledige catalogus van beschikbare agents.

**Verwacht gedrag:**
- Agent verschijnt in AGENTS.md binnen dezelfde sessie dat het template aangemaakt wordt
- Entry bevat minimaal: id, naam, beschrijving (< 50 woorden), tools, modelHint

**Validatie:** Vergelijk agent JSON bestanden in agents/library/ met entries in AGENTS.md. Zijn er templates zonder entry?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-008 — Auto-delegatie trigger

**Trigger:** Taak voldoet aan een delegatiepatroon: meer dan 3 bestanden, meerdere bronnen, batch-operaties, of 3+ stappen.
**Actie:** Stel een delegatieplan voor met agents, rollen en `oa run` commands. Voer uit na bevestiging.
**Leest:** Taakomschrijving, agents/library/ (voor beschikbare templates)
**Schrijft naar:** Geen — voorstel in de chat.
**Model:** claude-sonnet-4-6 (plan), claude/opus (bij architectuurvragen)

**Doel:** Complexe taken worden herkend en gedelegeerd. De meta-orchestrator denkt, agents voeren uit.

**Verwacht gedrag:**
- Multi-file taak: flat-spawning plan met niet-overlappende file scopes
- Voorstel bevat concrete `oa run` commands met --direct, --model en --name flags

**Validatie:** Geef een taak die 5 bestanden raakt. Stelt Claude een delegatieplan voor in plaats van direct te beginnen?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-009 — Quality gate na batch

**Trigger:** Een batch agents heeft status `done` in `oa status`.
**Actie:** Controleer output op Count, Content, Format, Cross-reference en Size. Spawn fix-agent bij falen.
**Leest:** Output bestanden van agents, referentie-format bestanden
**Schrijft naar:** Geen — rapporteer in chat, spawn fix-agent bij falen.
**Model:** claude-sonnet-4-6

**Doel:** Geen batch-output gaat door zonder validatie. Fouten worden gecorrigeerd via fix-agents.

**Verwacht gedrag:**
- Count: verwacht N outputs aanwezig
- Content: compleet, juiste taal, niet afgekapt
- Format: matcht referentie-structuur; Size: binnen lijnlimiet

**Validatie:** Laat een batch met bewust foute output draaien. Detecteert de gate de fouten?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-010 — Guardian agents na batch

**Trigger:** Quality gate (A-009) is geslaagd na een agent batch.
**Actie:** Spawn guardian agents die LESSONS.md, ROADMAP.md en DECISIONS.md updaten op basis van batchresultaten.
**Leest:** Agent output, LESSONS.md, ROADMAP.md, DECISIONS.md
**Schrijft naar:** LESSONS.md, ROADMAP.md, DECISIONS.md (via guardian agents)
**Model:** claude-sonnet-4-6 (guardians)

**Doel:** Core docs worden automatisch bijgehouden na elke batch — kennisaccumulatie is geautomatiseerd.

**Verwacht gedrag:**
- Guardian-lessons schrijft nieuwe L-xxx entries bij fouten of inzichten
- Guardian-roadmap vinkt voltooide taken af en past percentages aan

**Validatie:** Controleer na een batch of core docs binnen dezelfde sessie bijgewerkt zijn zonder handmatige actie.
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-011 — Auto-poller na oa run batch

**Trigger:** Meerdere `oa run` agents gestart; volgende stap wacht op allen.
**Actie:** Start background polling: check `oa status` elke 30 seconden totdat alle agents status `done` hebben.
**Leest:** ~/.oa/agents.json (via `oa status`)
**Schrijft naar:** Geen — rapporteer in chat bij voltooiing.
**Model:** Geen — pure shell operatie

**Doel:** De orchestrator wacht gestructureerd op agents zonder manueel te pollen.

**Verwacht gedrag:**
- Poller rapporteert voortgang: "X/N agents klaar"
- Bij timeout (> 10 min per agent): waarschuwing met lijst van niet-voltooide agents

**Validatie:** Start 3 agents. Rapporteert poller voortgang en meldt voltooiing automatisch?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-012 — Commit & push na wijziging

**Trigger:** Een substantiële wijziging is aangebracht in de Open-Agents repository.
**Actie:** Commit gewijzigde bestanden in logische batch met conventional commit message. Push via token URL.
**Leest:** git status, git diff, CLAUDE.local.md (voor token)
**Schrijft naar:** Git history (commit + push naar remote)
**Model:** claude-sonnet-4-6

**Doel:** GitHub is de single source of truth. Lokale wijzigingen worden direct gepersisteerd.

**Verwacht gedrag:**
- Commit message volgt Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
- Bestanden worden per logische eenheid gecommit — geen grote mixed commits

**Validatie:** Controleer `git log --oneline -5`. Zijn commits in conventional commit format?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-013 — Model tiering

**Trigger:** Bij elke `oa run` aanroep.
**Actie:** Selecteer model conform tiering-tabel en geef mee via `--model claude/<model>`.
**Leest:** Taakomschrijving (intern — geen bestand)
**Schrijft naar:** Geen — flag meegegeven aan `oa run`.
**Model:** Afhankelijk van taak (zie tabel hieronder)

**Doel:** Elke agent krijgt het model dat past bij zijn taak — juiste prijs/kwaliteitsverhouding.

**Verwacht gedrag:**
- Scanning/listing/formatting → `claude/haiku` | Schrijven/coderen → `claude/sonnet` (DEFAULT) | Architectuur/diep redeneren → `claude/opus`
- Elke `oa run` bevat altijd `--model` flag — nooit weglaten

**Validatie:** Check `oa status` na batch. Hebben alle agents het verwachte model gekregen?
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

### A-014 — NTFS-schrijfbeveiliging

**Trigger:** Schrijven naar een bestand op een `/mnt/c/` pad (Windows NTFS via WSL).
**Actie:** Gebruik `python3 -c "open(path,'w',newline='\n',encoding='utf-8').write(content)"` — nooit Write tool direct op NTFS paden.
**Leest:** Het doelbestand (ter verificatie na schrijven)
**Schrijft naar:** Het doelbestand op /mnt/c/ pad
**Model:** Geen — pure Python operatie

**Doel:** NTFS-bestanden via WSL kunnen corrupte line endings of BOM-tekens krijgen bij Write tool. Python3 schrijft altijd correcte Unix line endings.

**Verwacht gedrag:**
- Geen `\r\n` line endings in bestanden op /mnt/c/ paden
- Geen BOM-tekens aan het begin van bestanden

**Validatie:** Schrijf testbestand naar /mnt/c/ via python3. Controleer met `hexdump -C <pad> | head` op afwezigheid van `\r\n` en BOM.
**Status:** Actief
**Laatst gevalideerd:** 2026-03-11

---

*Nieuwe automaties: A-015, A-016, etc. Nummers worden nooit hergebruikt.*
*Uitgeschakelde automaties blijven zichtbaar — APPEND-ONLY register.*
