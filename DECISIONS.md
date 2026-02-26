# Decisions - Open-Agents

> Alle open en genomen beslissingen voor dit project.
> GitHub = Single Source of Truth voor tracking (M1).

---

## Open Beslissingen

| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-001 | Visibility: public of private repo? | Project is nu private, plan is open-source bij stabiel MVP | A) Nu public B) Private tot MVP | Open |
| D-002 | Pi.dev vs Claude Code als agent framework | Pi.dev biedt meer controle, Claude Code meer out-of-box | A) Pi.dev B) Claude Code C) Eigen framework | Open |
| D-003 | Eerste pilot agent kiezen | Boekhouding, Inkoop, of Admin als eerste agent | A) Boekhouding B) Admin C) Inkoop | Open |
| D-004 | Lokaal model voor classificatie | Ollama op Hetzner vs alleen cloud API | A) Ollama B) Haiku C) Hybrid | Open |

---

## Genomen Beslissingen

| # | Beslissing | Gekozen | Rationale | Datum |
|---|-----------|---------|-----------|-------|
| D-100 | Repository locatie | OpenAEC-Foundation/Open-Agents | Past in ecosysteem: Impertio = intern, OpenAEC = open-source later | 2026-02-26 |
| D-101 | Docker per agent | Ja, elke agent als container | Isolatie, schaalbaarheid, security, bestaande Hetzner workflow | 2026-02-26 |
| D-102 | Snippet-based context | Markdown snippets met YAML frontmatter | Lichtgewicht, versionable, leesbaar voor mens en AI | 2026-02-26 |
| D-103 | Credential management pattern | CLAUDE.local.md + defense-in-depth .gitignore | Conform Impertio SEC_002, workspace-local principle | 2026-02-26 |
| D-104 | Workspace tooling | Claude Code als primaire AI-assistent | Bestaande expertise, workspace discipline via AI Ecosystem Deployment | 2026-02-26 |

---

## Decision Template

```markdown
| # | Beslissing | Context | Opties | Status |
|---|-----------|---------|--------|--------|
| D-XXX | [Wat moet besloten worden?] | [Waarom is dit relevant?] | A) ... B) ... | Open |
```

Bij het nemen van een beslissing, verplaats naar "Genomen" met rationale en datum.

---

*Laatste update: 2026-02-26*
