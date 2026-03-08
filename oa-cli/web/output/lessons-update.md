# Lessons Update — L-051

**Datum:** 2026-03-08
**Agent:** lessons-updater

## Taak Voltooid ✓

Niewe les toegevoegd aan `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md`

### L-051: Duplicate tmux window names breken send-keys targeting

**Sectie:** Agent Spawning & tmux Targeting

**Inhoud:**
- **Probleem:** tmux staat duplicate window names toe. Als een agent spawn mislukt na `new-window` maar voordat `send-keys`, blijft een leeg window. Bij hergebruik mislukken volgende `send-keys` calls met "ambiguous target".
- **Oorzaak:** security fix (shell=True → shlex.split) maakte fouten zichtbaar.
- **Fix:** `new-window -P -F "#{window_index}"` → window index gebruiken voor targeting.
- **Workaround:** `oa kill <naam>` + handmatig duplicate windows verwijderen.

## Bestand Referenties

- **Bron:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/LESSONS.md` (aangepast)
- **Output:** Dit bestand
