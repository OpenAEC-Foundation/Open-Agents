# Bron: Skill Architectuur — Anthropic Skill Creator & Best Practices

**Interne bron:** `/mnt/skills/examples/skill-creator/SKILL.md`  
**Community:** https://freek.dev/3026-my-claude-code-setup  
**Type:** Primaire bron (intern) + community praktijkervaring  
**Status:** Kernreferentie voor skill-engineering

---

## Samenvatting

Skills zijn het mechanisme waarmee Claude modulaire expertise laadt, alleen wanneer relevant. Ze werken via progressive disclosure: metadata altijd in context, body bij trigger, resources on-demand.

## Anatomie van een Skill

```
skill-name/
├── SKILL.md (verplicht)
│   ├── YAML frontmatter
│   │   ├── name         (identifier)
│   │   └── description  (triggering-mechanisme)
│   └── Markdown body    (instructies)
└── Bundled Resources (optioneel)
    ├── scripts/         (uitvoerbare code, deterministische taken)
    ├── references/      (documentatie, on-demand geladen)
    └── assets/          (templates, fonts, iconen)
```

## Progressive Disclosure — Drie Lagen

| Laag | Wanneer geladen | Omvang | Rol |
|---|---|---|---|
| **Metadata** | Altijd in context | ~100 woorden | Naam + beschrijving → triggering |
| **SKILL.md body** | Bij trigger | <500 regels ideaal | Volledige instructies |
| **Bundled resources** | On-demand | Onbeperkt | Scripts, referenties, assets |

**Cruciale implicatie:** Een ontwikkelaar met 40+ skills heeft geen context-overhead zolang progressive disclosure correct werkt. Alleen de ~100 woorden metadata van elke skill zijn permanent in context.

## Triggering Mechanisme

**Hoe het werkt:**
- Skills verschijnen in Claude's `available_skills` lijst met naam + beschrijving
- Claude besluit of het een skill raadpleegt op basis van die beschrijving
- Claude raadpleegt skills alleen voor taken die het niet makkelijk zelf kan afhandelen
- Eenvoudige, eenstaps-queries triggeren mogelijk geen skill, zelfs als de beschrijving matcht

**Best practice voor beschrijvingen:**
- Claude heeft neiging tot "undertriggering" — skills niet gebruiken wanneer ze nuttig zouden zijn
- Beschrijvingen moeten "pushy" zijn — actief aangeven wanneer de skill relevant is
- Voorbeeld: niet "How to build a dashboard" maar "Use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of data"

## Skill Creatie Proces

1. **Intent vastleggen:** Wat moet de skill doen? Wanneer triggeren? Verwacht outputformaat?
2. **Interview & Research:** Edge cases, I/O formaten, voorbeeldbestanden, succescriteria
3. **SKILL.md schrijven:** Frontmatter + instructies
4. **Testen:** Test-prompts uitvoeren met de skill actief
5. **Evalueren:** Kwalitatief (menselijke review) + kwantitatief (benchmarks)
6. **Itereren:** Herschrijf op basis van feedback
7. **Beschrijving optimaliseren:** Triggering-nauwkeurigheid verbeteren

## Belangrijke Ontwerpprincipes

### Principle of Lack of Surprise
De skill moet resultaten produceren die een ervaren gebruiker zou verwachten — geen verrassende interpretaties of onverwachte bijeffecten.

### Domein-organisatie
Voor skills die meerdere domeinen/frameworks ondersteunen:
```
cloud-deploy/
├── SKILL.md (workflow + selectie)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```
Claude leest alleen het relevante referentiebestand.

### Limieten
- SKILL.md onder 500 regels houden
- Bij nadering limiet: voeg extra hiërarchielaag toe met duidelijke verwijzingen
- Grote referentiebestanden (>300 regels): inhoudsopgave toevoegen

## Beschrijving Optimalisatie (Claude Code specifiek)

**Automatisch proces via `run_loop.py`:**
1. Eval-set maken met trigger-queries
2. 60% train / 40% test split
3. Elke query 3x uitvoeren voor betrouwbare trigger rate
4. Claude voorstelt verbeteringen op basis van wat faalde
5. Maximaal 5 iteraties
6. Best description geselecteerd op test-score (niet train) om overfitting te voorkomen

## Praktijkervaring: Freek Van der Herten (Spatie)

- 40+ skills geconfigureerd (PHP, marketing, SEO, etc.)
- Skills houden contextvenster schoon door alleen te laden wanneer nodig
- Globale CLAUDE.md kort gehouden: kritisch denken, Spatie PHP-richtlijnen, gh voor GitHub
- settings.json met brede permissies (constante goedkeuring breekt flow)
- Thinking mode altijd aan → merkbaar betere resultaten op complexe taken
- Context window usage zichtbaar in statusbalk → visuele indicator wanneer nieuw gesprek starten

## Onderzoeksvragen voor ons project

- [ ] Welke skills hebben wij nodig op globaal niveau?
- [ ] Hoe ontwerpen we een zelflerende skill-evaluatie cyclus?
- [ ] Wat is de optimale beschrijving-strategie voor onze domein-specifieke skills?
- [ ] Hoe voorkomen we skill-overlap en ambigue triggering?
- [ ] Kunnen we een meta-skill bouwen die andere skills evalueert en verbetert?
