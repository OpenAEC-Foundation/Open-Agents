# Bron: Agentic Context Engineering (ACE) — Evolving Contexts for Self-Improving LLMs

**URL:** https://arxiv.org/abs/2510.04618  
**Auteurs:** Qizheng Zhang et al.  
**Versies:** v1 (6 okt 2025), v2 (29 jan 2026)  
**Type:** Academisch paper  
**Status:** Kernreferentie — direct relevant voor zelflerende systemen

---

## Samenvatting

ACE behandelt contexten als **evoluerende playbooks** die strategieën accumuleren, verfijnen en organiseren via een modulair proces van generatie, reflectie en curatie. Adresseert twee fundamentele problemen van eerdere benaderingen.

## Twee Kernproblemen

### 1. Brevity Bias
Eerdere methoden droppen domein-inzichten ten gunste van beknopte samenvattingen. Cruciale details gaan verloren omdat het systeem "kort" verwart met "goed".

### 2. Context Collapse
Iteratieve herschrijving erodeert details over tijd. Elke herschrijf-iteratie verliest subtiele maar waardevolle informatie. Na meerdere cycli is de context verschraald tot algemeenheden.

## ACE Framework

**Kernidee:** Gestructureerde, incrementele updates die gedetailleerde kennis behouden en schalen met long-context modellen.

**Drie fasen:**
1. **Generation** — Nieuwe strategieën en inzichten genereren op basis van uitvoerings-feedback
2. **Reflection** — Kritisch evalueren welke strategieën effectief waren
3. **Curation** — Organiseren, dedupliceren en structureren van het kennisbestand

**Twee optimalisatie-modi:**
- **Offline:** System prompts optimaliseren (buiten runtime)
- **Online:** Agent memory optimaliseren (tijdens runtime)

## Resultaten

- +10.6% verbetering op agent-benchmarks
- +8.6% verbetering op finance-benchmarks
- Significant lagere adaptatie-latentie en rollout-kosten
- Effectief zonder gelabelde supervisie — gebruikt natuurlijke executie-feedback
- Op AppWorld leaderboard: evenaart top-productie-agent op gemiddelde, overtreft op moeilijkere test-challenge split, ondanks kleiner open-source model

## Kernprincipes

1. **Accumulatie boven vervanging** — Voeg toe aan bestaande kennis, vervang niet
2. **Gestructureerde updates** — Incrementeel, niet monolithisch herschrijven
3. **Executie-feedback** — Leer van wat het systeem daadwerkelijk doet, niet van labels
4. **Schaling met context** — Profiteer van grotere contextvensters in plaats van te comprimeren

## Relatie met Dynamic Cheatsheet

ACE bouwt voort op het "Dynamic Cheatsheet" concept — adaptief geheugen dat zich aanpast op basis van prestaties. ACE breidt dit uit met:
- Modulaire architectuur (generatie/reflectie/curatie los van elkaar)
- Bescherming tegen context collapse
- Schaling naar grotere contexten

## Directe Relevantie voor ons project

Dit paper is het meest directe antwoord op onze vraag over zelflerende systemen:

1. **Lessons Extractor → ACE patroon:** Onze bestaande `project-lessons-extractor` skill volgt impliciet het ACE-patroon — maar we kunnen het formaliseren
2. **Skills als playbooks:** Elke skill kan behandeld worden als een evoluerende playbook die verbetert op basis van gebruik
3. **Benchmarking cyclus:** OA agents kunnen de reflectie-fase uitvoeren door skills te testen en feedback te genereren
4. **Anti-collapse mechanismen:** We moeten gestructureerde updates implementeren, niet volledige herschrijvingen
5. **Executie-feedback:** Agent-runs loggen en analyseren als feedbackbron voor skill-verbetering
