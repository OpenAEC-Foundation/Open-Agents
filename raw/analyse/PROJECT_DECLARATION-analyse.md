# Analyse: PROJECT_DECLARATION.md

**Datum analyse:** 9 maart 2026
**Analist:** Document Analist Agent (design-declaration)

---

## Samenvatting (max 5 regels)

Het PROJECT_DECLARATION.md beschrijft de missie, onderzoeksdomeinen en aanpak van het Open-Agents / OpenAEC Foundation project rondom **context engineering** — de discipline van het architectureel inrichten van informatie in het contextvenster van LLMs. Het document omvat 7 onderzoeksdomeinen (context window, workspace architectuur, skills, agentic architectuur, scope-vraagstuk, workspace vervuiling, zelflerende systemen) en hanteert een iteratieve evidence-based aanpak. Het dient als fundament voor praktische toepassing in eigen workspaces, agent-architecturen en BIM/AEC-productieomgevingen.

---

## Kernboodschap / Missie

De kern: **de volgende fase van AI-productiviteit wordt bepaald door architectuur rondom modellen, niet door betere modellen alleen.** Context is een schaarse resource met afnemende meeropbrengsten. De vier strategieën — Write, Select, Compress, Isolate — vormen het operationeel kader. Het project wil dit zowel theoretisch begrijpen als direct toepassen, én mechanismen bouwen waarmee het systeem zichzelf verbetert.

---

## Alignment met CLAUDE.md (Open-Agents project)

| Aspect | PROJECT_DECLARATION | CLAUDE.md | Oordeel |
|--------|--------------------|-----------|---------:|
| **Agentic architectuur** | Write/Select/Compress/Isolate als kernstrategieën | Flat spawning, --direct, 5-element prompts | ✅ Sterk aligned |
| **Zelflerende systemen** | ACE-framework, self-documenting workflows | LESSONS.md, Guardian agents, Document Update Protocol | ✅ Sterk aligned |
| **Skill architectuur** | Progressive disclosure, 3-laags laden | Skill-backed agents, `agents/library/` | ✅ Sterk aligned |
| **Context isolatie** | Sub-agents, sandboxing, state-objecten | Geïsoleerde workspaces per agent (`/tmp/oa-agent-*/`) | ✅ Sterk aligned |
| **Scope-bewustzijn** | Globaal vs. lokaal configuratieniveaus | Settings Discipline (CC_007): workspace-local, nooit global | ✅ Sterk aligned |
| **Concreet projectdoel** | Onderzoeksframework (theorie + praktijk) | Hyper session workspace builder, oa-cli als primair product | ⚠️ Lichte spanning: Declaration is onderzoeksgeoriënteerd, CLAUDE.md is productgeoriënteerd |

**Conclusie alignment**: Het document beschrijft de *theoretische en conceptuele basis* waarop de praktische keuzes in CLAUDE.md zijn gebouwd. Er is geen inhoudelijke tegenstrijdigheid — de Declaration geeft het "waarom" achter de architectuurkeuzes in CLAUDE.md. De lichte spanning zit in focus: Declaration = kennisproject, CLAUDE.md = productproject.

---

## Aanbevolen actie

**→ Opnemen in `docs/` als conceptueel fundament**

Concreet:
1. **Verplaats naar `docs/PRINCIPLES-FOUNDATION.md`** — het document geeft de theoretische basis voor design principes die al in `docs/PRINCIPLES.md` staan. Samenvoegen of expliciet koppelen.
2. **Voeg referentie toe aan README.md** — één zin + link: "De theoretische onderbouwing van onze aanpak staat in docs/PRINCIPLES-FOUNDATION.md."
3. **Koppel aan DECISIONS.md** — relevante beslissingen (D-003, D-025, D-051) kunnen backreferencen naar dit document als rationale.
4. **Archiveer het raw origineel** — verplaats `raw/PROJECT_DECLARATION.md` naar `raw/archive/` na verwerking.

**Niet archiveren zonder verwerking** — het document bevat te veel actionable kennis (bronnenregister, scope-vraagstuk, zelfreferentie-mechanismen) om te laten liggen.
