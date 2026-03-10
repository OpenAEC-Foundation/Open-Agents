# Quality Review: SESSION-PERSISTENCE-MASTERPLAN-RAW

> **Reviewer**: quality-reviewer (Claude Opus)
> **Date**: 2026-03-11
> **Documents reviewed**: MASTERPLAN-RAW.md + AGENT-ORCHESTRATION.md
> **Codebase cross-referenced**: state.py, checkpoint.py, lifecycle.py, hooks.py, tmux.py

---

## Scores

| Category | Score (1-5) | Summary |
|----------|:-----------:|---------|
| Completeness | 4 | Thorough coverage; some edge cases missing |
| Feasibility | 4 | Realistic; builds on existing code; some complexity underestimated |
| Prioritization | 3 | P1/P2 mostly correct; some P2 items should be P1 |
| Risk identification | 3 | Key risks covered; concurrent-write and guardian-crash gaps |
| Scope creep | 3 | Wave 3-4 bloat; AI summary/auto-docs are distractions |
| Existing code fit | 4 | Good mapping to existing modules; hooks.py gap underestimated |

**Overall: 3.5/5**

---

## Must-Fix Items (Blockers)

### MF-1: hooks.py is NOT event-driven — it's in-memory only
The masterplan assumes hooks.py can handle `on_session_end`, `on_detach`, `on_resume`. But the current hooks.py uses **in-memory registration** (`HOOKS` dict with callables). There is no persistence, no external trigger mechanism. A tmux `client-detached` hook runs a **shell command**, not a Python callable. The entire bridge between tmux hooks → Python event system is missing and non-trivial.

**Fix**: Add a new section explicitly designing the tmux-hook → Python bridge. Options: (a) tmux hook calls `oa cleanup` CLI command, (b) tmux hook writes to a named pipe that a guardian reads. This is a P1 architectural decision, not a P2 implementation detail.

### MF-2: Guardian crash resilience is hand-waved
Section 3.3 proposes a "periodieke checkpoint daemon" running inside tmux. But: what if the guardian itself crashes? There's no watchdog. A crashed guardian means no periodic checkpoints AND no detach handling.

**Fix**: Either (a) use tmux's built-in `set-hook` for detach (doesn't require a running guardian), or (b) add a guardian self-monitoring heartbeat file that `oa start` checks. The masterplan should explicitly address guardian failure modes.

### MF-3: Concurrent write scenario is acknowledged but not solved
Q8 correctly identifies the risk of cleanup + running agent both writing state. The masterplan says "see research" but this is a **design-time decision**, not a research question. state.py already uses atomic write (tempfile + rename), but session records and agent records sharing state could still conflict.

**Fix**: Decide NOW: session records MUST be in separate files (`~/.oa/sessions/<ts>.json`), not in agents.json. This eliminates the concurrent-write problem entirely. Make this a P1 architectural decision in the masterplan.

### MF-4: `oa stop` Phase 2 timeout has no default behavior specified
"Wachten op actieve agents OF timeout" — but what happens AFTER timeout? Are agents killed? Left running? The masterplan should specify the default behavior and make it configurable.

**Fix**: Add explicit default: after timeout, agents are left running (not killed), state snapshot is saved, and `oa start` will detect them on next launch. Killing should require `oa stop --force`.

---

## Should-Fix Items (Important but not blocking)

### SF-1: Prioritization adjustment needed
- **B1 (Graceful shutdown signal)** is marked P2 but depends on MF-1 (hooks bridge). Either elevate to P1 or defer to Wave 2 explicitly.
- **F2 (Periodic checkpoints)** is P1 but relies on a guardian that doesn't exist yet. Sequence dependency isn't captured.
- **E1/E2 (Desktop notifications)** are P2 but are pure UX polish. Should be P3.

### SF-2: Session record schema needs versioning
The proposed JSON schema has no `version` field. When the schema inevitably evolves, old session records will break deserialization. Add `"schema_version": 1` to the SessionRecord from day one.

### SF-3: Missing edge case — multiple tmux clients
tmux supports multiple clients attached to the same session. If client A detaches but client B is still attached, `client-detached` fires but the session is still actively used. The masterplan doesn't handle this.

### SF-4: Missing edge case — `oa stop` while no agents are running
The 5-phase shutdown is over-engineered for the common case of "I'm done, just close it." Phase 2/3/4 should be no-ops when no agents exist.

### SF-5: Disk space estimation missing
Q5 asks about disk space but offers no estimate. A session record is ~1KB. 100 sessions = 100KB. Periodic checkpoints with `tmux capture-pane` output could be 50KB per checkpoint × 12/hour × 8 hours = ~5MB/day. This should be calculated and documented.

### SF-6: Agent Orchestration plan has too many phases
7 phases, 15-17 agents is likely overengineered for this feature. Research (Phase 1) is good. But Phase 4 (Engineering) is redundant with Phase 3 (Masterplan). The refined masterplan should BE the engineering spec. Suggest merging Phases 3+4.

---

## Nice-to-Have Observations

### NH-1: Wave 3 (AI summary, mini-handoff) is scope creep
These are entire features in themselves. AI-generated summaries require prompt engineering, token costs, and quality control. They don't belong in a session persistence feature. Move to a separate "Session Intelligence" sprint.

### NH-2: Wave 4 items (auto doc-update, email/webhook) should be removed entirely
D1/D2/D3 (auto-update ROADMAP/LESSONS/CHANGELOG) are marked "Hoog" complexity and P4. They are not session persistence — they're autonomous documentation features. Remove from this masterplan.

### NH-3: Config schema is reasonable
The 7 proposed config options are well-scoped. Defaults are sensible (`git_stash: false`, `session_summary: false`). Good restraint here.

### NH-4: "60% existing code reuse" claim is optimistic
checkpoint.py covers per-agent checkpoints but has no session-level concept. hooks.py needs a complete bridge layer. lifecycle.py's cleanup functions are reusable but need wrapping. Realistic reuse is closer to 40%.

---

## Strengths

1. **Three shutdown modes** — clean conceptual model, well-differentiated
2. **tmux-first architecture** — correctly leverages existing infrastructure
3. **Explicit out-of-scope section** — prevents creep on cloud sync, multi-user
4. **Wave-based implementation** — good incremental delivery strategy
5. **Open questions section** — honest about unknowns, research-first approach
6. **Security section** — proactively addresses secret scrubbing and permissions

---

## Final Verdict

### NEEDS WORK

The masterplan is a strong brainstorm document with solid conceptual foundations. The three shutdown modes, tmux-first approach, and wave-based delivery are all sound. However, four must-fix items need resolution before this can become an engineering spec:

1. The hooks.py bridge architecture is a missing P1 design piece
2. Guardian failure modes need explicit handling
3. Session records must be separate from agents.json (decide now, not during research)
4. Timeout behavior needs explicit defaults

After addressing MF-1 through MF-4, this is ready for the research phase. The Agent Orchestration plan is well-structured but should merge Phases 3+4 and reduce total agent count from 15-17 to ~12.
