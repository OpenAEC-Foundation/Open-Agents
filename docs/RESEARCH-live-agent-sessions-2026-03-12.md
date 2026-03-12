# Onderzoeksrapport: Live Agent Sessies & Node Systeem
**Datum**: 2026-03-12
**Auteur**: research-documentalist (oa-agent)
**Status**: Volledig

---

## Samenvatting

Op 2026-03-12 zijn meerdere experimenten uitgevoerd rondom het uitvoeren van "live" Claude-sessies op de Hetzner GPU-server en het bouwen van een persistent node-communicatiesysteem. Het doel was een architectuur te vinden waarmee Claude-instanties op een remote server kunnen worden aangestuurd, met elkaar kunnen communiceren, en via een browser bereikbaar zijn.

Kernbevinding: **Claude TUI vereist een OAuth browser-login en is niet headless te starten op een remote server.** De oplossing is `claude -p` (print/non-interactive mode) met gesynchroniseerde credentials — dit werkt volledig headless en is de enige betrouwbare basis voor remote agent nodes.

---

## Experiment 1 — Live Claude Sessies op Hetzner

### Probleemstelling

De wens was om een "live" Claude-sessie op de Hetzner server te draaien die via de browser bereikbaar is — vergelijkbaar met een persistente agent die je kunt aanspreken.

### Wat geprobeerd werd

1. **Claude TUI direct starten**: `claude` (zonder flags) start een interactieve TUI die OAuth-authenticatie via een browser vereist. Op een headless remote server is dit onbruikbaar — er is geen browser beschikbaar om de OAuth-flow te voltooien.

2. **ttyd installeren** (port 7125): ttyd biedt een browsergebaseerde terminal die een PTY-sessie streamt. Dit maakt het technisch mogelijk om via de browser een terminal op Hetzner te bedienen. De Claude TUI is zo zichtbaar, maar OAuth-authenticatie bleef een blocker bij verlopen tokens.

3. **`claude --dangerously-skip-permissions -p`**: Dit is de doorbraak. De `-p` flag (print mode) maakt Claude volledig non-interactief — het leest stdin of een CLI-argument als prompt, schrijft de response naar stdout, en stopt. Met gesynchroniseerde `~/.claude/.credentials.json` (via `scp`, zie D-082) werkt dit volledig headless.

### Conclusie

| Aanpak | Werkt headless? | Persistent? | Aanbevolen |
|--------|----------------|-------------|------------|
| `claude` (TUI) | Nee — OAuth vereist | Ja | Nee |
| `ttyd` + TUI | Beperkt | Ja | Alleen noodgeval |
| `claude -p` + credentials sync | **Ja** | Nee (stateloos) | **Ja** |

**Oplossing voor persistentie**: Sla conversation history op als JSON en geef dit bij elke `claude -p` aanroep opnieuw mee als context. Dit simuleert een persistente sessie zonder echt een langlopend process te zijn.

---

## Experiment 2 — Node Systeem (`oa node`)

### Architectuur

Het node systeem bestaat uit twee bestanden:

- **`oa-cli/src/open_agents/node_daemon.py`** — een persistent Python-process dat:
  - Een inbox polt (`~/.oa/nodes/<name>/inbox/`) elke 2 seconden
  - Per inkomend `.msg` bestand: history laadt → prompt bouwt → `claude -p` aanroept → response opslaat
  - Response doorstuurt naar geconnecte nodes en/of terugstuurt naar de afzender
  - Registratie op een "board" (gedeelde vragenmarkt per categorie)

- **`oa-cli/src/open_agents/node_cli.py`** — Click-based CLI commands:
  - `oa node start <name>` — start node in tmux window
  - `oa node stop <name>` — kill tmux window
  - `oa node send <name> <message>` — inject bericht in inbox
  - `oa node connect <A> <B>` — bidirectionele verbinding
  - `oa node board post <category> <question>` — post vraag op gedeeld board
  - `oa node status` — overzichtstabel van alle nodes

### Communicatieprotocol

Berichten zijn JSON-bestanden in de inbox-directory:

```json
{
  "from": "node-alpha",
  "content": "Wat vind jij van dit probleem?",
  "type": "message",
  "timestamp": 1741780000000,
  "hops": 1,
  "discuss": 3
}
```

Sleutelvelden:
- `from` — afzender (node-naam of gebruikersnaam)
- `hops` — aantal keren doorgestuurd
- `discuss` — maximaal toegestane hops (0 = direct terug naar afzender)

### Hop-limiet Probleem & Oplossing

**Probleem**: Nodes die aan elkaar geconnect zijn gingen in een oneindige loop. Node A stuurt bericht naar B, B stuurt response terug naar A, A stuurt terug naar B, enz.

**Eerste poging**: Een hardcoded `MAX_HOPS = 3` limiet. Dit werkte gedeeltelijk maar kapte gesprekken soms te vroeg af.

**Definitieve oplossing**: Het `discuss=N` veld per bericht. Nodes forwarden een response naar geconnecte nodes **alleen als `discuss > 0`**. Als `discuss == 0` (de default), gaan responses altijd terug naar de originele afzender. Hierdoor controleert de initiator van een gesprek expliciet hoe ver een discussie mag gaan.

```python
# node_daemon.py:418
if connections and discuss > 0 and current_hops < discuss:
    forward_to_connections(name, connections, response, hops=current_hops, discuss=discuss)
else:
    # Reply directly back to sender
    ...
```

### History Management

Elke node houdt een `history.json` bij (max 50 entries, FIFO). Bij elke aanroep:
1. Laad history van disk
2. Bouw prompt: `System: ... \n\nHuman: [prev1] ...\n\nAssistant: ...\n\nHuman: [new]\n\nAssistant:`
3. Roep `claude -p <prompt>` aan
4. Voeg response toe aan history
5. Sla history atomisch op (via tempfile + `os.replace`)

Dit simuleert een persistent multi-turn gesprek zonder dat een Claude-process continu hoeft te draaien.

---

## Experiment 3 — Gedeelde Chat Server (Port 7123)

### Concept

Een server-side conversation state die door meerdere clients tegelijk gedeeld wordt. Dit maakt drie-weg gesprekken mogelijk:

- **Freek** (browser) — typt berichten in een browser-chat UI
- **Hetzner Claude** (`claude -p`) — reageert via de server
- **Claude Code** (lokaal) — injecteert berichten via een `/inject` REST endpoint

### Implementatie

- Server beheert een gedeelde berichten-lijst in-memory
- **SSE / polling**: de browser polt elke 1,5 seconde het `/messages` endpoint voor nieuwe berichten
- **`/inject` endpoint**: lokale tooling (Claude Code of `curl`) kan berichten posten zonder browser-sessie
- Hetzner-kant: een daemon polt de server, roept `claude -p` aan met de volledige history, en post de response terug

### Resultaat

Drie-weg gesprek functioneerde. De `/inject` brug bleek bijzonder waardevol: Claude Code kon vanuit de lokale machine berichten sturen naar de Hetzner Claude via de server.

---

## Experiment 4 — Node Pool Web App (Port 7124)

### Architectuur

FastAPI backend (`scripts/node-app/server.py`) met:

| Endpoint | Functie |
|----------|---------|
| `GET /` | Serveert `index.html` |
| `GET /api/nodes` | Lijst alle nodes + status |
| `POST /api/nodes` | Start een nieuwe node |
| `DELETE /api/nodes/{name}` | Stop een node |
| `POST /api/nodes/{name}/send` | Stuur bericht naar node inbox |
| `POST /api/nodes/{name}/connect` | Verbind twee nodes |
| `GET /api/nodes/{name}/stream` | SSE live log stream |

De SSE log stream (`/api/nodes/{name}/stream`) tail het `~/.oa/nodes/<name>/log.txt` bestand en streamt nieuwe regels in real-time naar de browser. Dit geeft zichtbaarheid in wat een node doet zonder tmux te hoeven openen.

### Status verificatie

Nodes worden als "running" beschouwd als er een actief tmux window `oa:node-<name>` bestaat. De status-file (`status.txt`) dient als cache maar wordt altijd geverifieerd via `tmux has-session`.

---

## Wat Werkte

| Component | Status |
|-----------|--------|
| `claude -p` headless op Hetzner | ✅ Werkend (met credentials sync) |
| Node daemon + inbox polling | ✅ Werkend |
| `discuss=N` hop-limiet oplossing | ✅ Probleem opgelost |
| History-based persistente sessie simulatie | ✅ Werkend |
| Node Pool Web App (port 7124) | ✅ Werkend |
| SSE log streaming | ✅ Werkend |
| Drie-weg gesprek via chat server | ✅ Werkend als concept |
| ttyd voor browser terminal toegang | ✅ Geïnstalleerd |

## Wat Niet Werkte

| Component | Probleem |
|-----------|---------|
| Claude TUI headless | OAuth vereist browser — niet oplosbaar zonder ttyd |
| Echte persistente Claude sessie remote | Fundamenteel: `claude -p` is stateloos per aanroep |
| OAuth token auto-refresh | Token verlopen vereist handmatige browser-login (L-100) |

---

## Geleerde Lessen

### L-101 — `claude -p` is de enige betrouwbare headless modus
`claude` (TUI) vereist OAuth via browser bij elk verlopen token. `claude -p` werkt met een gesynchroniseerd `~/.claude/.credentials.json` bestand volledig headless. Dit is de enige schaalbare aanpak voor remote agent execution.

### L-102 — Persistentie simuleren via history-als-JSON
Een "persistente" Claude sessie is niet nodig — het volstaat om de conversation history als JSON bij te houden en bij elke `claude -p` aanroep als context mee te geven. Dit is efficiënter dan een langlopend process en herstelt automatisch na crashes.

### L-103 — `discuss=N` patroon voorkomt oneindige inter-node loops
Wanneer nodes berichten doorsturen, moeten initiators expliciet aangeven hoeveel hops een discussie mag reizen (`discuss=N`). De default (`discuss=0`) moet altijd "reply naar afzender" zijn, nooit "broadcast naar alle connecties".

---

## Aanbevelingen voor Vervolg

1. **Productie-waardige node daemon**: De huidige `node_daemon.py` is proof-of-concept. Voor productie: graceful shutdown signaling, health checks, en automatisch herstart bij crash.

2. **Chat server persistentie**: De gedeelde chat server houdt state in-memory — een herstart verwijdert alle conversaties. Persisteer berichten naar disk (JSON of SQLite).

3. **OAuth token monitoring**: Implementeer een daemon die de token-expiry controleert en een melding stuurt (Slack/email/oa broadcast) vóór het token verloopt, zodat handmatig vernieuwen op tijd kan gebeuren.

4. **Node discovery**: Momenteel worden nodes handmatig geconnect. Een auto-discovery mechanisme (bijv. op basis van `--category` board-registraties) zou netwerken van nodes eenvoudiger maken.

5. **`/inject` endpoint standaardiseren**: De chat server `/inject` patroon is generiek bruikbaar — overweeg dit als standaard interface voor "Claude Code → remote agent" communicatie in de oa-cli.

---

## Gerelateerde Bestanden

| Bestand | Beschrijving |
|---------|-------------|
| `oa-cli/src/open_agents/node_daemon.py` | Node daemon core (516 regels) |
| `oa-cli/src/open_agents/node_cli.py` | CLI commands voor nodes (344 regels) |
| `scripts/node-app/server.py` | Node Pool Web App FastAPI backend (273 regels) |
| `scripts/node-app/index.html` | Browser UI voor node management |
| `scripts/sync-claude-credentials.sh` | Credentials sync naar Hetzner (D-082) |
| `docs/HETZNER-SETUP.md` | Setup handleiding Hetzner server |

## Gerelateerde Beslissingen

- **D-079** — Orchestrators = Claude, Workers = Hetzner Ollama, geen API
- **D-082** — Claude auth via credentials.json sync (scp), geen OAuth dance
- **D-076** — Hetzner GPU Server full AI stack integratie (in progress)

---

*Gegenereerd door research-documentalist agent, 2026-03-12*
