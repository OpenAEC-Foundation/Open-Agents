# Bronnenindex — Context Engineering Research

Dit bestand is de navigatiekaart voor alle opgeslagen referentiebronnen.  
Elke bron heeft een eigen .md bestand met samenvatting, kernconcepten en onderzoeksvragen.

---

## Opgeslagen Bronnen

| ID | Bestand | Bron | Kernonderwerp |
|---|---|---|---|
| REF-01 | `REF_anthropic-context-engineering.md` | Anthropic Engineering Blog | Context engineering fundamenten, context rot, compaction, multi-agent |
| REF-02 | `REF_claude-code-memory-system.md` | Claude Code Docs (officieel) | CLAUDE.md hiërarchie, auto-memory, settings precedentie, modulaire rules |
| REF-03 | `REF_skill-architecture.md` | Skill Creator + Freek Van der Herten | Skill anatomie, progressive disclosure, triggering, beschrijving-optimalisatie |
| REF-04 | `REF_langchain-context-strategies.md` | LangChain Blog | Write/Select/Compress/Isolate framework, context problemen taxonomy |
| REF-05 | `REF_ace-self-learning-contexts.md` | Academisch (arXiv:2510.04618) | ACE framework, zelflerende contexten, anti-collapse mechanismen |

## Nog Niet Opgeslagen (voor toekomstige sessies)

| Bron | URL | Prioriteit |
|---|---|---|
| Survey of Context Engineering (1400+ papers) | https://arxiv.org/abs/2507.13334 | Hoog — taxonomie |
| FlowHunt Definitive Guide | https://www.flowhunt.io/blog/context-engineering/ | Medium — historische context |
| Weaviate Memory & Retrieval | https://weaviate.io/blog/context-engineering | Medium — memory patterns |
| Prompting Guide practical example | https://www.promptingguide.ai/guides/context-engineering-guide | Medium — n8n voorbeeld |
| Claude Code Memory Explained (José Parreo) | https://joseparreogarcia.substack.com/p/claude-code-memory-explained | Hoog — praktijk global CLAUDE.md |
| Claude-Mem plugin | https://github.com/thedotmack/claude-mem | Laag — tool-optie |
| MCP officiële documentatie | https://modelcontextprotocol.io/docs/getting-started/intro | Hoog — protocol |

## Hoe bronnen toe te voegen

1. Fetch de bron via web_fetch
2. Maak een `REF_[beschrijvende-naam].md` aan in deze directory
3. Volg de template: URL, auteur, datum, type, samenvatting, kernconcepten, onderzoeksvragen
4. Update deze index
