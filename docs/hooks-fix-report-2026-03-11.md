# Hooks Fix Report — 2026-03-11

**Issue:** GitHub #65 — check-delegation.sh false positives blocking `oa run` commands

---

## Probleem analyse

### False positives in check-delegation.sh

De hook telde `&&` in de ruwe command string zonder rekening te houden met:
1. `&&` **binnen geciteerde agent prompts** — bv. `oa run "stap1 && stap2 && stap3" --name agent`
2. `export PATH=... && oa run ...` patronen — de PATH setup voegt een extra `&&` toe waardoor de drempel van 3 sneller bereikt wordt

De oude oa-run skip check (was op regel 57-60) stond na de SSH/package/lang-lopende checks, maar voor de `&&` teller. Dit hielp niet voor het PATH+oa-run patroon omdat de command niet met `^oa run` begon.

### apply_hooks_config() niet aangeroepen bij startup

De functie `apply_hooks_config()` in `hooks.py` was gedefinieerd maar werd nergens aangeroepen. De hooks-config.yaml callables werden dus nooit geladen bij `oa start`.

---

## Fixes

### Fix 1: check-delegation.sh — early exit voor oa-commando's

**Bestand:** `/home/freek/.claude/hooks/check-delegation.sh`

**Wijziging:** De oa-run skip check is verplaatst naar vóór ALLE delegatie checks (vóór SSH, package install, lange operaties, en `&&` teller). De regex is verbreed van `^...oa run...` (alleen begin van command) naar `oa (run|delegate|pipeline|send|broadcast)` (overal in de command string).

Dit lost op:
- `export PATH="..." && oa run "..." --name agent --direct` → exit 0 ✓
- `oa run "stap1 && stap2 && stap3 && stap4" --name agent` → exit 0 ✓
- `touch /tmp/... && oa pipeline "..."` → exit 0 ✓

De oude redundante check op de voormalige positie is verwijderd.

### Fix 2: cli.py — apply_hooks_config() aanroepen bij oa start

**Bestand:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py`

**Wijzigingen:**
1. `apply_hooks_config` toegevoegd aan de import van `.hooks` (regel 29)
2. `apply_hooks_config()` aanroep toegevoegd in de `start()` command, direct na `start_session()`, vóór de auto-compaction daemon (met try/except zodat het non-critical is)

---

## Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `/home/freek/.claude/hooks/check-delegation.sh` | Early exit verplaatst, regex verbreed, redundante check verwijderd |
| `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/oa-cli/src/open_agents/cli.py` | `apply_hooks_config` geïmporteerd + aangeroepen in `start()` |

---

## Test instructie

### Test 1: False positive fix

```bash
# Simuleer een oa run command met && in de prompt
echo '{"tool_name":"Bash","tool_input":{"command":"export PATH=\"$HOME/.local/bin:$PATH\" && oa run \"stap1 && stap2 && stap3 && stap4\" --name test --model claude/sonnet --direct"}}' \
  | bash /home/freek/.claude/hooks/check-delegation.sh
# Verwacht: exit code 0 (geen blokkering)
echo "Exit code: $?"
```

### Test 2: Legitieme blokkering nog steeds actief

```bash
# Multi-step zonder oa run — moet nog steeds geblokkeerd worden
echo '{"tool_name":"Bash","tool_input":{"command":"cd /tmp && mkdir test && ls && rm -rf test"}}' \
  | bash /home/freek/.claude/hooks/check-delegation.sh
# Verwacht: exit code 2 (geblokkeerd, 4 stappen)
echo "Exit code: $?"
```

### Test 3: apply_hooks_config bij startup

```bash
# Start een nieuwe oa sessie en controleer of hooks-config.yaml wordt geladen
oa start --no-chat
# Controleer logs voor "hooks-config" berichten (als yaml aanwezig is)
```

---

*Gegenereerd door hooks-fix agent — 2026-03-11*
