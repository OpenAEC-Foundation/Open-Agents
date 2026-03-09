# Bron: Claude Code Memory & CLAUDE.md Systeem — Officiële Documentatie

**URLs:**
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
**Type:** Primaire bron (officieel Anthropic)  
**Status:** Kernreferentie — definieert de mechanismen die wij optimaliseren

---

## Samenvatting

Claude Code heeft twee complementaire geheugensystemen die kennis overdragen tussen sessies. Beide worden geladen aan het begin van elk gesprek. Claude behandelt ze als context, niet als afgedwongen configuratie.

## Twee Geheugensystemen

### 1. CLAUDE.md Bestanden (door jou geschreven)

Persistente instructies die je zelf schrijft om Claude's gedrag te sturen.

**Drie-lagen hiërarchie:**
```
~/.claude/CLAUDE.md                    → Globaal (alle projecten)
/project/CLAUDE.md                     → Project (gedeeld via git)
/project/CLAUDE.local.md               → Lokaal persoonlijk (gitignored)
```

**Prioriteitsregel:** Lokaal > Project > Globaal. Bij conflict wint de meest specifieke laag.

**Laden:** Alle drie worden automatisch in de system prompt geladen bij sessiestart:
1. Globaal eerst → basisinstructies
2. Project tweede → voegt toe / overschrijft
3. Lokaal derde → persoonlijke overrides

**Limieten:** ~10-15K tokens per CLAUDE.md voordat system prompt limieten worden bereikt. Voor grotere content: gebruik @references.

### 2. Auto Memory (door Claude geschreven)

Claude slaat zelf notities op terwijl het werkt: build-commando's, debugging-inzichten, architectuurnotities, code-stijlvoorkeuren, workflow-gewoonten.

**Locatie per project:**
```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Index, eerste 200 regels bij startup geladen
├── debugging.md       # Topic-bestanden, on-demand geladen
├── api-conventions.md
└── ...
```

**Belangrijk:**
- `<project>` pad is afgeleid van het git-repository — alle worktrees en subdirectories delen één memory-directory
- MEMORY.md fungeert als index van de memory-directory
- Claude besluit zelf wat het waard is om te onthouden
- Auto memory is machine-lokaal
- Standaard ingeschakeld, toggle via `/memory` of `autoMemoryEnabled` in settings

## Settings Hiërarchie (Volledige Precedentie)

Van hoog naar laag:
```
1. Managed (hoogste prioriteit)
   ├── Server-managed (via Claude.ai admin console)
   ├── MDM/OS-level policies
   ├── managed-settings.json
   └── HKCU registry (Windows)
2. Command line arguments (sessie-tijdelijk)
3. Local project (.claude/settings.local.json)
4. Shared project (.claude/settings.json)
5. User settings (~/.claude/settings.json) (laagste)
```

**Array-settings mergen:** Wanneer dezelfde array-setting op meerdere niveaus voorkomt, worden de arrays geconcateneerd en gededupliceerd, niet vervangen.

## Modulaire Rules (.claude/rules/)

Voor content die te diep, te specifiek, of niet altijd relevant is voor CLAUDE.md.

**Path-scoped rules:**
```yaml
---
paths:
  - "src/api/**/*.ts"
---
# API Development Rules
- Alle API endpoints moeten input validatie bevatten
- Gebruik standaard error response format
```

- Rules zonder `paths` frontmatter laden onvoorwaardelijk (zelfde prioriteit als .claude/CLAUDE.md)
- Path-scoped rules triggeren wanneer Claude bestanden leest die matchen
- Ondersteunt symlinks → deel rules over meerdere projecten

## Memory Tool (API-niveau)

Voor agents gebouwd via de API — client-side geheugen:
- Claude kan bestanden creëren, lezen, updaten en verwijderen in een /memories directory
- Fungeert als just-in-time context retrieval
- Patroon: opslaan wat je leert → later on-demand ophalen
- Houdt actieve context gefocust op wat momenteel relevant is

**Gestructureerd recovery-patroon:**
1. Initializer-sessie: memory-artifacts opzetten (voortgangslog, feature-checklist, startup-scripts)
2. Volgende sessies: memory-artifacts lezen → volledig projectstate herstellen
3. Einde-sessie: voortgangslog updaten met wat voltooid is en wat overblijft

## Best Practices (Synthese uit bronnen)

### Globale CLAUDE.md
- Definieer stabiele verwachtingen die niet veranderen per project
- Moet aanvoelen als werkcontract, niet als documentatie of persoonlijkheidsontwerp
- Voorbeelden: communicatiestijl, primair objectief, immutabele regels

### Project CLAUDE.md
- AI-onboarding + operationeel handboek — geen stortplaats
- 20-80 regels voor kleine repos, tot ~200 regels maximum
- Voorbij 200 regels → gebruik modulaire rules
- Bevat: projectbeschrijving, architectuur-overzicht, build-commando's, testinstructies
- Niet: uitvoeringsplannen, running checklists (die veranderen te vaak)

### Structuurprincipe
- Root CLAUDE.md klein en stabiel houden
- Alles wat diep, topic-specifiek, of path-specifiek is → .claude/rules/
- CLAUDE.md wordt de index

## Onderzoeksvragen voor ons project

- [ ] Hoe ontwerpen we onze globale CLAUDE.md als "werkcontract" voor alle workspaces?
- [ ] Welke rules zijn globaal vs. project-specifiek voor onze AEC-workflows?
- [ ] Hoe integreren we auto-memory met onze lessons-extractor skill?
- [ ] Wat is de optimale grootte/structuur voor onze memory-index?
- [ ] Hoe voorkomen we "memory fossils" — verouderde notities die context vervuilen?
