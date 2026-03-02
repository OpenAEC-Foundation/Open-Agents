# Sprint Prompts — Open-Agents

> **Doel**: Kopieerbare prompts voor Claude Code sessies om de resterende sprints uit te voeren.
> **Gegenereerd**: 2026-03-02
> **Laatste update**: 2026-03-05
> **Bron**: MASTERPLAN.md

---

## Status Overzicht

| Sessie | Sprint | Status | Branch |
|--------|--------|--------|--------|
| A | 4 Pool Pattern | **COMPLETE** | gemerged naar `main` |
| B | 6b Assembly Engine | **COMPLETE** | gemerged naar `main` |
| C | 8 Frappe App | **COMPLETE** | gemerged naar `main` |
| D | 9 Agent Library (90/1000) | **COMPLETE** (fase 9.1-9.5) | gemerged naar `main` |
| E | 6c AI Assistant | **COMPLETE** | gemerged naar `main` |
| F | 10 Refactor (56%) | **IN PROGRESS** | `main` |

## Huidige Situatie (2026-03-05)

Sprint 10 is 56% af (9/16 taken). De resterende 7 taken zijn opgesplitst in
**4 parallelle sessies** beschreven in [`docs/PARALLEL-SESSIONS.md`](PARALLEL-SESSIONS.md).

```
Sprint 10 remainder — 4 parallelle sessies:

├── Sessie 10A: Backend Engineering    → D-035, D-032, test suite
├── Sessie 10B: Types + VS Code        → D-023, D-031
├── Sessie 10C: Documentatie & Release  → OpenAPI, README, CONTRIBUTING, CHANGELOG
└── Sessie 10D: Agent Library Scale     → 910+ agents (categorieën J-T)

Na alle sessies: v0.1.0 release tag
```

→ Zie [`docs/PARALLEL-SESSIONS.md`](PARALLEL-SESSIONS.md) voor volledige instructies per sessie.

---

## Afgeronde Sessies

### ~~Sessie A: Sprint 4 — Pool Pattern~~ COMPLETE

> Voltooid. Bevat: DispatcherNode, AggregatorNode, parallelle execution
> (Promise.allSettled), pool SSE events, 2 pool templates.

### ~~Sessie B: Sprint 6b — Assembly Engine~~ COMPLETE

> Voltooid. Bevat: classifyIntent(), matchPatterns(), generateGraph(),
> assembly API routes, GenerateBar.tsx, PatternLibrary.tsx,
> CostEstimatePanel.tsx, assemblySlice.

### ~~Sessie C: Sprint 8 — Frappe App~~ COMPLETE

> Voltooid. Bevat: packages/frappe-app/, DocTypes, canvas embedding,
> whitelisted API, 5 ERPNext templates.

### ~~Sessie D: Sprint 9 — Agent Library (90)~~ COMPLETE (fase 9.1-9.5)

> Voltooid (90/1000). Bevat: 10 core + 80 category/specialist agents in
> 10 categorieën, library-loader.ts, 7 flow/pool templates.
> Verdere uitbreiding (910+ agents) loopt in Sessie 10D.

### ~~Sessie E: Sprint 6c — AI Assistant~~ COMPLETE

> Voltooid. Bevat: AssistantSidebar, chat API (SSE), assistant-engine,
> bidirectionele canvas sync, smart suggestions.

---

## Quick Reference

| Sessie | Sprint | Status | Volgende stap |
|--------|--------|--------|---------------|
| 10A | Backend Engineering | Pending | `docs/PARALLEL-SESSIONS.md` Sessie A |
| 10B | Types + VS Code | Pending | `docs/PARALLEL-SESSIONS.md` Sessie B |
| 10C | Docs & Release | Pending | `docs/PARALLEL-SESSIONS.md` Sessie C |
| 10D | Agent Library Scale | Pending | `docs/PARALLEL-SESSIONS.md` Sessie D |

**Merge volgorde**: 10D → 10C → 10B → 10A → v0.1.0 tag

---

*Bijgewerkt door Claude Code — 2026-03-05*
