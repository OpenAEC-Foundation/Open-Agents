# Core Docs Update Report — 2026-03-12

## Uitgevoerde wijzigingen

### 1. LESSONS.md — Sessie 2026-03-12 Remote-First Execution toegevoegd

**Bestand**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md`

Nieuwe sectie "Sessie 2026-03-12 — Remote-First Execution" toegevoegd met 3 lessen:

- **L-093**: Claude CLI al geauthenticeerd op Hetzner — check auth status vóór je aanneemt dat het ontbreekt
- **L-094**: Remote-first = betere performance lokaal — zet machines.json default naar Hetzner bij parallelle agents
- **L-095**: spawn_remote_agent() is 70-80% klaar — enkelvoudige agents zijn remote-first klaar

**Noot**: L-045, L-046, L-047 waren al in gebruik (release pipeline, permissions defaultMode, WSL/NTFS fix). Nieuwe lessen zijn L-093, L-094, L-095.

Footer bijgewerkt: "Nummer door: L-096, L-097, etc."

---

### 2. DECISIONS.md — D-076 status bijgewerkt

**Bestand**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/DECISIONS.md`

D-076 (Hetzner GPU Server: Full AI Stack Integration) status gewijzigd:
- **Van**: `PROPOSED — proposal klaar, implementatie nog niet gestart`
- **Naar**: `IN PROGRESS — Fase 1 actief: Claude CLI geauthenticeerd, remote-first default geïmplementeerd (D-061)`

---

### 3. ROADMAP.md — Sprint 22b Remote-First Execution toegevoegd

**Bestand**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/ROADMAP.md`

Nieuwe sprint sectie "Sprint 22b: Remote-First Execution — IN PROGRESS" ingevoegd na Sprint 22, vóór Sprint 23.

Bevat:
- Status: IN PROGRESS
- Verwijzingen: D-061, D-076
- Voltooide items: Claude CLI auth, machines.json default, --local flag
- Openstaande items: Remote tmux sessions, oa status split, nested sub-agent spawning

---

## Status

✅ Alle 3 bestanden succesvol bijgewerkt
✅ Append-only voor LESSONS.md (niets verwijderd)
✅ Geschreven in het Nederlands
✅ Absolute paden gebruikt
