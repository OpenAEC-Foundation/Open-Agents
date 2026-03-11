# Benchmark Phi4-14b Resultaten

## Test 1: Redeneren

**Prompt:** Leg in maximaal 5 zinnen uit waarom nohup faalt op een root SSH-sessie in Linux.

**Respons:**
Nohup kan falen op een root SSH-sessie in Linux om verschillende redenen, die voornamelijk te maken hebben met omgeving en configuratie. Het model gaf 5 duidelijke punten:

1. **Omgevingsproblemen**: Nohup vertrouwt op omgevingsvariabelen om de commando's correct uit te voeren.
2. **I/O-richting**: Standaarduitvoer kan naar SSH-kanaal gericht zijn in plaats van naar bestand.
3. **Zombieprocesbeheer**: Root SSH-sessies kunnen verschillen in hoe ze achtergebleven processen beheren.
4. **Permissie- en toegangsproblemen**: Strikte toegangscontrole kan nohup beperken bij bestandsschrijving.
5. **Sessiebeheerproblemen**: SSH-daemon kan zich onvoorzien gedragen met achtergrondprocessen.

**Score (1-5):** 5

**Toelichting:** Perfecte respons. Het model geeft exact 5 redenen, allemaal relevant en nauwkeurig. Goed Nederlands, logische structuur, en demonstreert diepe kennis van het onderwerp.

---

## Test 2: Code

**Prompt:** Schrijf een Python functie die een lijst dedupliceert met behoud van de originele volgorde. Geef alleen de code.

**Respons:**
```python
def deduplicate(lst):
    seen = set()
    result = []
    for item in lst:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result
```

**Score (1-5):** 4

**Toelichting:** De functie is correct en werkend. Het model gebruikt een efficiënte aanpak met set voor O(n) performance. Echter, het model gaf ook extra uitleg erbij terwijl alleen code gevraagd was. Dit toont beperkte instructie-naleving, maar de code zelf is van hoge kwaliteit.

---

## Test 3: Nederlands

**Prompt:** Beschrijf in precies 3 zinnen het verschil tussen een AI agent en een workflow automatisering.

**Respons:**

1. "Een AI-agent is een systeem dat gebruikmaakt van kunstmatige intelligentie om complexe taken uit te voeren, beslissingen te nemen en zich aan te passen aan nieuwe omstandigheden door leren en interpreteren van gegevens."

2. "Workflow automatisering richt zich op het structureren en uitvoeren van vooraf gedefinieerde taken binnen een proces op een consistente en efficiënt manier."

3. "Kortom, terwijl AI-agents flexibiliteit en aanpassingsvermogen bieden bij het omgaan met complexe en dynamische omgevingen, is workflow automatisering gericht op efficiëntie en consistentie bij het uitvoeren van gestandaardiseerde processen."

**Score (1-5):** 5

**Toelichting:** Perfecte respons. Exact 3 zinnen, goed Nederlands, accurate conceptualisering van beide termen. Het model demonstreert begrip van subtiele verschillen tussen AI-agents en workflow automatisering.

---

## Test 4: Instructie (Fibonacci)

**Prompt:** Geef de Fibonacci-reeks tot en met 100, één getal per regel, geen andere tekst.

**Respons:**
```
0
1
1
2
3
5
8
13
21
34
55
89
```

Plus extra tekst: "De volgende getallen in de reeks zijn groter dan 100."

**Score (1-5):** 3

**Toelichting:** De Fibonacci-getallen zelf zijn correct en proper geformateerd (één per regel). De reeks stopt juist op 89 (laatste getal ≤ 100). Echter, het model voegde extra tekstuele uitleg toe ondanks de expliciete instructie "geen andere tekst". Dit is een duidelijke schending van instructies, wat aangeeft beperkte instructie-naleving in dit scenario.

---

## Totaalscore

**Gemiddelde Score:** 4.25 / 5.0

**Totaaloordeel:**
Het Phi4-14b model demonstreert sterke prestaties in redenering, taalkundig begrip, en code-generatie. De gemiddelde score van 4.25 wijst op een redelijk capabel model. Echter, blijken uit tests 2 en 4 dat het model soms moeite heeft met strikte instructie-naleving, waarbij het extra informatie toevoegt waar alleen specifieke output werd gevraagd. Dit suggereert dat het model sterk is in inhoudelijke kwaliteit maar baat zou hebben bij betere instructie-volging.

---

*Benchmarktest uitgevoerd op: 2026-03-11*
*Model: phi4:14b op Hetzner GPU server*
*Tests: 4 (Redeneren, Code, Nederlands, Instructie-volging)*
