# Bron: Context Engineering for Agents — LangChain

**URL:** https://blog.langchain.com/context-engineering-for-agents/  
**Publicatiedatum:** 2 juli 2025  
**Type:** Industrie-referentie (framework-maker)  
**Status:** Kernreferentie — definieert het Write/Select/Compress/Isolate framework

---

## Samenvatting

LangChain's analyse van context engineering strategieën, gegroepeerd in vier categorieën: Write, Select, Compress, Isolate. Gebaseerd op review van populaire agents en papers.

## Kernanaalogie (Karpathy)

LLMs als operating system:
- **LLM = CPU** — de verwerkingseenheid
- **Context window = RAM** — het werkgeheugen
- **Context engineering = OS** — het systeem dat bepaalt wat in RAM past

## Vier Strategieën

### 1. WRITE — Naar context schrijven

Het vastleggen van informatie zodat het model er later over kan beschikken:
- Scratchpads / notitieblokken
- Geheugenbestanden die de agent zelf bijhoudt
- Tussenresultaten opslaan in state
- "Working memory" patronen

### 2. SELECT — De juiste informatie kiezen

Bepalen welke informatie in het contextvenster moet landen:
- RAG (Retrieval Augmented Generation)
- Tool-beschrijvingen en selectie
- Dynamisch laden van referenties
- Just-in-time data retrieval

### 3. COMPRESS — Context comprimeren

Informatie indikken om meer waarde per token te krijgen:
- Samenvatting van gesprekgeschiedenis
- Context trimming via heuristieken
- Cognition AI: fine-tuned modellen voor samenvatting bij agent-agent boundaries
- Geleerde pruners (bv. Provence voor QA-taken)
- **Kerninsight:** Wat je verwijdert kan net zo belangrijk zijn als wat je behoudt

### 4. ISOLATE — Context isoleren

Verschillende taken krijgen verschillende informatie:
- Sub-agents met eigen contextvensters
- Sandboxed uitvoeromgevingen
- State-objecten met schema's die context isoleren
- Eén veld (bv. `messages`) blootgesteld aan LLM, andere velden voor selectief gebruik

## Problemen bij Groeiende Context

Drew Breunig's taxonomy van contextproblemen:
- **Context Poisoning:** Hallucinatie raakt in context → vergiftigt volgende stappen
- **Context Distraction:** Context overweldigt de training
- **Context Confusion:** Overbodige context beïnvloedt het antwoord

## State Object als Isolatie-Mechanisme

Een agent's runtime state-object kan dienen als isolatie:
- Schema met meerdere velden
- Eén veld blootgesteld aan LLM per turn
- Andere velden isoleren informatie voor selectief gebruik
- Functioneel equivalent aan sandboxing

## Aanbevelingen

1. **Observeerbaarheid eerst:** Kijk naar je data, track token-gebruik over je agent
2. **Test impact:** Zorg dat je een simpele manier hebt om te testen of context engineering de performance verbetert of verslechtert
3. LangSmith voor agent tracing / observability

## Relevantie voor ons project

- Het Write/Select/Compress/Isolate framework is direct toepasbaar op onze workspace-architectuur
- Open Agents agent-spawning = Isolate strategie in de praktijk
- Auto-memory = Write strategie
- Skills progressive disclosure = Select strategie
- Compaction = Compress strategie
- We moeten context poisoning monitoren in lange agent-runs
