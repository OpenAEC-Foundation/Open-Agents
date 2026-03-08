# Performance Fixes Applied
**Date:** 2026-03-08
**Agent:** fix-performance

---

## Fix 1: bridge.py — N+1 file reads (HIGH)

**File:** `oa-cli/src/open_agents/bridge.py`

**Problem:** `api_list_agents()` called `list_agents()` twice per request plus
`check_agent()` for each running agent (each doing its own `get_agent()` +
`update_agent()` internally), resulting in 2N+2 file reads per poll cycle.
`api_get_agent()` called `get_agent()` twice (before and after `check_agent()`).

**Changes:**
- Added module-level `_agents_result_cache` with 1 s TTL (`_AGENTS_CACHE_TTL = 1.0`).
  Rapid burst requests within the TTL window return the cached JSON list without
  any disk I/O or status re-checking.
- In `api_get_agent`: replaced unconditional second `get_agent()` call with a
  conditional re-read only when the agent was `running` (i.e. `check_agent`
  might have mutated state). Combined with the state.py write-through cache,
  this is a cheap in-memory lookup in most cases.

---

## Fix 2: state.py — duplicate JSON loads (HIGH)

**File:** `oa-cli/src/open_agents/state.py`

**Problem:** Every call to `load_agents()` unconditionally read and parsed
`~/.oa/agents.json` from disk. Within a single `check_agent()` call, this
function is invoked up to 3 times (get_agent → list_agents → update_agent).

**Changes:**
- Added module-level `_cache: dict | None` and `_cache_mtime: float` globals.
- `load_agents()` now checks `STATE_FILE.stat().st_mtime`; if the file hasn't
  changed since the last read, returns a `dict` copy of the cached data without
  any disk I/O or JSON parsing.
- `save_agents()` performs a write-through cache update after the atomic file
  write (temp file + rename), so subsequent `load_agents()` calls in the same
  process hit the cache rather than re-reading from disk.
- Net effect: within a request cycle that calls `load_agents()` N times without
  an intervening write, only 1 disk read occurs.

---

## Fix 3: LiveCanvas.tsx — unbounded messageCache memory leak (MED)

**File:** `oa-cli/web/src/components/dashboard/LiveCanvas.tsx`

**Problem:** `messageCache.current` (a `Map<string, Message[]>`) grew
indefinitely for the entire session lifetime — entries for cleaned-up agents
were never evicted.

**Changes:**
- Added `const MAX_CACHE_SIZE = 500` constant next to the ref declaration.
- Before each `messageCache.current.set(agent.name, messages)`, checks if the
  cache already exceeds `MAX_CACHE_SIZE` and the key is not already present.
  If so, evicts the oldest entry (`Map` insertion-order iteration) before
  inserting the new one, keeping the cache bounded at ≤ 500 entries.

---

## Summary

| Fix | File | Pattern | Expected Impact |
|-----|------|---------|-----------------|
| N+1 reads cache | bridge.py | 1 s TTL on /api/agents | Reduces file I/O by ~(2N+2)× per polling cycle |
| mtime state cache | state.py | Write-through in-memory cache | Eliminates redundant JSON parses within same process |
| Bounded messageCache | LiveCanvas.tsx | LRU eviction at 500 entries | Prevents session-long memory leak in frontend |
