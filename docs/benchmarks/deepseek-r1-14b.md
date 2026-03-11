# Benchmark deepseek-r1:14b

**Model:** deepseek-r1:14b
**Server:** Hetzner GPU
**Test datum:** 2026-03-11
**Tester:** bench-deepseek-14b

---

## Test 1: Redeneren

**Prompt:** Leg in maximaal 5 zinnen uit waarom nohup faalt op een root SSH-sessie in Linux.

**Respons:**
Nohup kan falen in een root SSH-sessie van wege verschillende redenen:

1. **Incorrect command syntax**: Als het commando niet correct is ingetype of niet bestaat, zal nohup niet kunnen uitvoeren.

2. **Problemen met de shell profiel**: Environment variabelen of aliassen kunnen invloed hebben op de werking van nohup.

3. **Job control**: Als de shell geen job control ondersteunt, werkt nohup mogelijk niet.

4. **File permissions**: Misliggende permies op bestanden of directories kunnen leiden tot een mislukte uitvoering.

5. **SSH session limieten**: SSH-konfiguratie opties zoals ClientAliveInterval kunnen leiden tot een automatisch afgesloten sessie.

**Score (1-5):** 4
**Toelichting:** Het antwoord geeft een duidelijke opsomming van mogelijke redenen waarom nohup kan falen. De eerste reden (syntax) is vrij basaal, maar de punten over job control en SSH configuratie zijn relevant. Het antwoord blijft echter algemeen en gaat niet diep in op de werkelijke root-oorzaken (bijv. parent process termination).

---

## Test 2: Code

**Prompt:** Schrijf een Python functie die een lijst dedupliceert met behoud van de originele volgorde. Geef alleen de code.

**Respons:**
```python
def deduplicate(lst):
    seen = set()
    unique = []
    for item in lst:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique
```

**Score (1-5):** 5
**Toelichting:** Perfecte implementatie. De functie gebruikt een set voor O(1) lookups en behoudt de oorspronkelijke volgorde via een list. Alle edge cases (empty list, duplicates, single element) worden correct afgehandeld. Code is schoon en efficiënt.

---

## Test 3: Nederlands

**Prompt:** Beschrijf in precies 3 zinnen het verschil tussen een AI agent en een workflow automatisering.

**Respons:**
Een AI agent is een intelligent systeem dat autonoom acteert op basis van leren en analyse van gegevens, terwijl een workflow automatisering een stel van vaste, herhalbare stappen automatiseert zonder zelfstandige besluitvorming. AI agents kunnen zich aanpassen aan nieuwe situaties en gegevens, terwijl workflow automatisering strikt volgt aan een gedefinieerde reeks stappen. De AI agent draagt verantwoordelijkheid voor complexe besluiten, terwijl workflow automatisering voornamelijk op efficiëntie en consistentie gericht is.

**Score (1-5):** 5
**Toelichting:** Uitstekend antwoord. Alle drie zinnen zijn aanwezig, elke zin voegt duidelijk onderscheidende kenmerken toe (leren vs stappen, adaptatie vs vast, complexiteit vs efficiëntie). Het Nederlands is correct en het antwoord voldoet aan de instructie.

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

**Score (1-5):** 5
**Toelichting:** Perfect resultaat. Alle Fibonacci-getallen tot 100 zijn opgenoemd (0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89). De volgende waarde (144) overschrijdt 100 dus deze wordt correct buiten gelaten. Geen extra tekst of uitleg, precies volgens instructie.

---

## Totaalscore

| Test | Score |
|------|-------|
| 1. Redeneren | 4 |
| 2. Code | 5 |
| 3. Nederlands | 5 |
| 4. Instructie | 5 |
| **Gemiddelde** | **4.75** |

### Oordeel

Deepseek-r1:14b presteert uitstekend op alle vier tests met een gemiddelde score van 4.75/5. Het model is sterk in code generatie, precieze instructie-opvolging en taalkundig correcte Nederlandse tekst. Het enige zwakpunt is de "Redeneren" test, waar het antwoord wat generalistisch blijft en geen diep inzicht in root causes toont. Over het geheel geeft dit model een solide, productie-gereed resultaat voor diverse taken.
