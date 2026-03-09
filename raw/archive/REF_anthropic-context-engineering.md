# Bron: Effective Context Engineering for AI Agents — Anthropic

**URL:** https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents  
**Auteur:** Anthropic Engineering  
**Publicatiedatum:** 29 september 2025  
**Type:** Primaire bron (officieel)  
**Status:** Kernreferentie voor dit project

---

## Samenvatting

Anthropic's officiële positie op context engineering: de discipline die prompt engineering opvolgt als de centrale uitdaging bij het bouwen van AI-agents. Context = alle tokens die beschikbaar zijn tijdens LLM-inferentie. Het engineering-probleem is het optimaliseren van de waarde van die tokens tegen de inherente beperkingen van LLMs.

## Kernconcepten

### Context Engineering vs. Prompt Engineering

- **Prompt engineering:** methoden voor het schrijven en organiseren van LLM-instructies
- **Context engineering:** strategieën voor het cureren en onderhouden van de optimale set tokens tijdens inferentie, inclusief alles buiten de prompts
- De verschuiving komt doordat agents over meerdere turns en langere tijdshorizonten opereren — je moet de hele contextstate beheren (systeem-instructies, tools, MCP, externe data, berichtgeschiedenis)

### Context Rot

- Naarmate het contextvenster groeit, degradeert het vermogen van het model om informatie nauwkeurig terug te halen — dit geldt voor alle modellen
- Context moet behandeld worden als een eindige bron met afnemende meeropbrengsten
- LLMs hebben een "aandachtsbudget" — elk nieuw token consumeert een deel daarvan
- Architecturele oorzaak: transformer-architectuur creëert n² paarsgewijze relaties voor n tokens

### Anatomie van Effectieve Context

**System prompts — "Right Altitude":**
- Te specifiek = broze, hardcoded if/else logica
- Te vaag = geen concrete signalen
- Optimaal = specifiek genoeg om gedrag te sturen, flexibel genoeg voor sterke heuristieken
- Organiseer in secties met XML tags of Markdown headers
- Begin minimaal, voeg toe op basis van geobserveerde faalpatronen

**Tools:**
- Moeten self-contained, robuust tegen fouten, en extreem duidelijk zijn
- Veelvoorkomende fout: opgeblazen tool-sets met te veel functionaliteit of ambigue beslispunten
- Als een menselijke engineer niet definitief kan zeggen welke tool in een situatie gebruikt moet worden, kan een AI-agent dat ook niet

**Examples (few-shot):**
- Cureer een set diverse, canonieke voorbeelden — geen waslijst van edge cases
- Voorbeelden zijn de "plaatjes die meer zeggen dan duizend woorden" voor een LLM

### Context Retrieval & Agentic Search

**Just-in-time benadering:**
- Bewaar lichtgewicht identifiers (bestandspaden, queries, links)
- Laad data dynamisch in context via tools
- Claude Code doet dit: schrijft gerichte queries, slaat resultaten op, gebruikt bash-commando's om grote datasets te analyseren zonder alles in context te laden
- Spiegelt menselijke cognitie: we onthouden niet alles maar gebruiken indexeringssystemen

**Progressive disclosure:**
- Agents ontdekken context incrementeel door exploratie
- Elke interactie levert context op die de volgende beslissing informeert
- Bestandsgroottes suggereren complexiteit, naamgevingsconventies hinten naar doel, timestamps zijn proxy voor relevantie

**Hybride strategie:**
- Sommige data up-front retrieven voor snelheid
- Verdere autonome exploratie naar discretie
- Claude Code gebruikt dit: CLAUDE.md bestanden worden naïef in context geladen, terwijl glob en grep just-in-time retrieval mogelijk maken

### Long-Horizon Tasks

**Compaction:**
- Gesprek nabij contextlimiet → samenvatten → nieuw contextvenster initiëren met samenvatting
- Bewaar architectuurbeslissingen, onopgeloste bugs, implementatiedetails
- Gooi redundante tool-outputs en berichten weg
- Kunst: selectie van wat te bewaren vs. weggooien — te agressief = verlies van subtiele maar kritieke context
- Begin met maximale recall, itereer naar betere precision

**Gestructureerd noteren:**
- Agents die hun eigen notities bijhouden als externe geheugenuitbreiding
- Functioneert als "just-in-time" context die het model zelf beheert

**Multi-agent architecturen:**
- Verdeel taken over gespecialiseerde agents met eigen contextvensters
- Elke agent handhaaft een gefocust, domein-specifiek contextvenster
- Orchestrator-agent coördineert en synthetiseert resultaten
- Essentieel: ontwerp duidelijke protocollen voor informatieoverdracht tussen agents

## Kernquotes (geparafraseerd)

1. "Goede context engineering = de kleinst mogelijke set high-signal tokens vinden die de kans op het gewenste resultaat maximaliseren"
2. "Context moet behandeld worden als een eindige bron met afnemende meeropbrengsten"
3. "Doe het eenvoudigste dat werkt" — naarmate modellen beter worden, zal agentic design meer autonomie toelaten

## Onderzoeksvragen voor ons project

- [ ] Hoe meten we context rot in onze eigen agent-runs?
- [ ] Wat is de optimale compaction-strategie voor onze workflows?
- [ ] Hoe ontwerpen we de agent-agent boundary protocollen voor Open Agents?
- [ ] Waar ligt het omslagpunt tussen up-front retrieval en just-in-time voor onze use cases?
