# Proposal: Oneindige Hiërarchie — Recursief Agent Spawning

**Datum:** 2026-03-02
**Status:** Ontwerp / Review vereist
**Auteur:** Analyse-agent (claude-sonnet-4-6)

---

## 1. Probleemstelling

De huidige implementatie ondersteunt **twee niveaus**: een orchestrator + workers. Maar wat als een worker op zijn beurt een open vraag tegenkomt die hij niet zelf kan beantwoorden? Hij zou dan een sub-worker moeten kunnen spawnen, die zelf ook weer sub-workers kan spawnen — een organisch groeiende boom.

Huidige beperkingen:
- `check_agent()` kijkt alleen 1 niveau diep naar kinderen
- `_create_orchestrator_workspace()` genereert CLAUDE.md zonder info over diepte of afstamming
- `AgentRecord` bevat geen diepte of lineage
- Geen bescherming tegen oneindige recursie of lussen

---

## 2. Ontwerpvragen en Antwoorden

### 2.1 Hoe diep mag de boom?

**Antwoord:** Configureerbaar, met een hard maximum.

- **Soft limit (default):** `MAX_DEPTH = 5` — genoeg voor de meeste taken zonder runaway-kosten
- **Hard limit:** `MAX_DEPTH_ABSOLUTE = 10` — bescherming tegen misconfiguratie
- **Depth 0** = root-agent (spawned door gebruiker)
- **Depth N** = een agent gespawnd door een depth-(N-1) agent

**Rationale:** Dieper dan 5 levert zelden waarde. Elke laag voegt latentie en API-kosten toe. Als een taak dieper moet, is dat een teken van slechte taakdecompositie.

**Implementatie:** Voeg `depth: int = 0` toe aan `AgentRecord`. Bij elke `spawn_agent()` call: `child_depth = parent_depth + 1`. Als `child_depth > MAX_DEPTH`: gooi een foutmelding.

---

### 2.2 Hoe voorkom je infinite loops?

Drie complementaire mechanismen:

#### A. Dieptelimiet (zie 2.1)
De simpelste rem. Een agent op depth 10 kan geen kinderen meer spawnen.

#### B. Lineage-tracking (ancestor chain)
Elk `AgentRecord` slaat zijn volledige voorouderketen op: `lineage: list[str]`.

Voorbeeld:
```
root (lineage=[])
└── orch-analyse (lineage=["root"])
    └── sub-orch-detail (lineage=["root", "orch-analyse"])
        └── worker-xyz (lineage=["root", "orch-analyse", "sub-orch-detail"])
```

Bij spawn van een nieuw kind: controleer of `parent_name` al in `lineage` zit. Zo ja: circulaire afhankelijkheid → weiger.

#### C. Task-hash deduplicatie
Bereken een hash van de taakomschrijving (genormaliseerd: lowercase + stripped). Sla op in `AgentRecord` als `task_hash: str`.

Bij spawn van een kind: vergelijk `task_hash` van het kind met alle `task_hash` waarden in de lineage. Als er een match is (dezelfde taak als een voorouder): waarschuw en weiger.

**Implementatie:**
```python
import hashlib

def _task_hash(task: str) -> str:
    normalized = task.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]
```

#### D. Max kinderen per agent
Voeg `max_children: int = 10` toe. Een agent mag nooit meer dan 10 directe kinderen spawnen. Dit voorkomt een explosie op één niveau.

---

### 2.3 Hoe rapporteren sub-sub-agents terug?

#### Mechanisme: Gelaagde result.md aggregatie

Elke agent schrijft zijn resultaat naar `./output/result.md` in zijn eigen workspace. De parent leest dit bestand na voltooiing van het kind.

**Rapportagestroom (bottom-up):**

```
worker-xyz schrijft:
  workspace-xyz/output/result.md

sub-orch-detail leest worker-xyz/output/result.md,
aggregeert het in zijn eigen:
  workspace-sub-orch-detail/output/result.md

orch-analyse leest sub-orch-detail/output/result.md,
aggregeert in:
  workspace-orch-analyse/output/result.md

root leest alles en schrijft:
  workspace-root/output/result.md
```

#### Implementatie: child_results_dir in CLAUDE.md

De `_create_orchestrator_workspace()` functie moet in de CLAUDE.md van elke orchestrator/agent bijvoegen:
- De werkmap-paden van alle **directe** kinderen (worden runtime gevuld)
- Instructies om `<child_workspace>/output/result.md` te lezen na voltooiing

**Alternatief: Gedeelde results directory**

Een eleganter alternatief is een gedeeld outputpad dat root aanmaakt en doorstuurt:
```
/tmp/oa-tree-<session-id>/
  results/
    root.md
    orch-analyse.md
    sub-orch-detail.md
    worker-xyz.md
```

Elke agent schrijft naar `{shared_results_dir}/{own_name}.md`. De parent leest alle bestanden in die directory die bij zijn kinderen horen.

**Voorkeur:** De gedeelde directory aanpak is robuuster omdat:
1. Bestanden niet verloren gaan als workspaces worden opgeschoond
2. De gebruiker makkelijker de volledige boom kan inspecteren
3. Agents geen kennis hoeven hebben van elkaars workspace-pad

**Implementatie in `AgentRecord`:**
Voeg `shared_results_dir: Optional[str] = None` toe. De root-agent maakt deze directory aan en geeft hem door via `spawn_agent()`. Alle nakomelingen erven dit pad.

---

### 2.4 Welke code wijzigingen zijn nodig?

#### state.py wijzigingen

| Wijziging | Rationale |
|-----------|-----------|
| `depth: int = 0` toevoegen aan `AgentRecord` | Diepte tracken |
| `lineage: list[str] = field(default_factory=list)` toevoegen | Loop detectie |
| `task_hash: str = ""` toevoegen | Taak-deduplicatie |
| `max_children: int = 10` toevoegen | Explosie preventie |
| `shared_results_dir: Optional[str] = None` toevoegen | Gedeelde rapportage |
| `get_children(parent_name)` helper toevoegen | Kinderen opvragen |
| `get_lineage(name)` helper toevoegen | Voorouderketen opvragen |
| `count_children(parent_name)` helper toevoegen | Kinderaantal controleren |

#### orchestrator.py wijzigingen

| Wijziging | Rationale |
|-----------|-----------|
| `MAX_DEPTH = 5` constante toevoegen | Soft limit |
| `MAX_DEPTH_ABSOLUTE = 10` constante toevoegen | Hard limit |
| `spawn_agent()`: depth + lineage meegeven aan kind | Hierarchie opbouwen |
| `spawn_agent()`: dieptecheck voor spawn | Loop preventie |
| `spawn_agent()`: task_hash check vs. ancestors | Taak-deduplicatie |
| `spawn_agent()`: max_children check | Explosie preventie |
| `spawn_agent()`: shared_results_dir doorgeven | Rapportage |
| `check_agent()`: recursieve done-check | Diepe bomen correct afhandelen |
| `_create_orchestrator_workspace()`: depth-aware CLAUDE.md | Agents kennen hun diepte |
| `_create_orchestrator_workspace()`: shared_results_dir in CLAUDE.md | Rapportage-instructies |
| Nieuwe `spawn_sub_agent()` helper | Handiger API voor recursief spawnen |

---

## 3. Gedetailleerd Architectuurdiagram

```
Boom-structuur:
                    [ROOT: depth=0]
                   /               \
        [ORCH-A: depth=1]     [ORCH-B: depth=1]
        /          \
[WORKER-1: d=2]  [SUB-ORCH-C: d=2]
                  /         \
          [W-3: d=3]      [W-4: d=3]
                           /
                    [W-5: d=4]  ← diepste allowed bij MAX_DEPTH=5
                    |
                    X  ← spawn geblokkeerd (depth=5 = MAX_DEPTH)

State voor W-4:
  name: "worker-4"
  depth: 3
  lineage: ["root", "orch-a", "sub-orch-c"]
  task_hash: "a3f7c2d1..."
  parent: "sub-orch-c"
  shared_results_dir: "/tmp/oa-tree-abc123/results/"

Rapportage bottom-up:
  W-5 → schrijft /results/worker-5.md
  W-4 leest /results/worker-5.md → schrijft /results/worker-4.md
  SUB-ORCH-C leest /results/worker-3.md + /results/worker-4.md → schrijft /results/sub-orch-c.md
  ORCH-A leest /results/worker-1.md + /results/sub-orch-c.md → schrijft /results/orch-a.md
  ROOT leest /results/orch-a.md + /results/orch-b.md → schrijft /results/root.md
```

---

## 4. Risico's en Mitigaties

| Risico | Kans | Impact | Mitigatie |
|--------|------|--------|-----------|
| Exponentiële API-kosten | Middel | Hoog | MAX_DEPTH + max_children limieten |
| Infinite loop via circulaire taken | Laag | Hoog | Lineage + task_hash check |
| tmux window-namen conflict | Middel | Middel | Naam uniek maken met depth prefix |
| Gedeelde results dir vult schijf | Laag | Middel | Cleanup bij `oa clean` |
| Race condition in state.json | Middel | Middel | File locking toevoegen aan state.py |
| Agent spawnt te snel kinderen | Middel | Middel | max_children per agent |

---

## 5. Fasering

**Fase 1 (Minimaal Werkend):**
- `depth` + `lineage` in `AgentRecord`
- Dieptecheck in `spawn_agent()`
- Depth-aware CLAUDE.md in orchestrators

**Fase 2 (Veiligheid):**
- `task_hash` deduplicatie
- `max_children` limiet
- Circulaire lineage check

**Fase 3 (Rapportage):**
- `shared_results_dir` mechanisme
- Aggregatie-instructies in CLAUDE.md
- `oa tree` CLI commando om boom te visualiseren

---

## 6. Conclusie

De oneindige hiërarchie is technisch haalbaar met relatief kleine wijzigingen. De sleutel is:
1. **Depth tracking** in elke `AgentRecord`
2. **Lineage chain** voor loop-detectie
3. **Shared results directory** voor bottom-up rapportage
4. **Conservative defaults** (MAX_DEPTH=5, max_children=10)

De bestaande `parent` veld in `AgentRecord` is een goede basis — we breiden dit uit met depth en lineage zonder de bestaande API te breken.
