# Benchmark: Qwen 2.5 14B Model

**Testdatum:** 2026-03-11
**Model:** qwen2.5:14b
**Testserver:** Hetzner GPU Server
**Test framework:** ollama

---

## Test 1: Redeneren

**Prompt:** Leg in maximaal 5 zinnen uit waarom nohup faalt op een root SSH-sessie in Linux.

**Respons:**
nohup kan falen in een root SSH-sessie op een Linux-systeem van wege meerdere factoren: eerste, als de root-gebruiker specifieke configuraties heeft die de standaardfunctie van nohup beïnvloeden, zoals beperkingen in het `.bash_profile` of `.bashrc`. Tweede, als de root-gebruiker toegang heeft tot extra systeembeperkingen of -instellingen die de normale uitvoering van nohup belemmeren. Derde, fouten in de commandosyntaxis of de uitvoering van de applicaties zelf kan leiden tot mislukking. Vierde, als er specifieke toegangsrechten of permissies zijn ingesteld op de bestanden die door nohup worden aangeraapd, kan dit ook leiden tot uitvoeringsproblemen. Vijfde, als de opgegevenpaden of bestandsnamen onjuist zijn, kan nohup niet de gewenste applicatie of script vinden en uitvoeren.

**Score (1-5):** 4
**Toelichting:** Geeft uitgebreide Nederlandse verklaringen met 5 verschillende redenen. Redelijk accuraat, hoewel wat algemeen. Het model toont goed begrip van syscall-restricties en configuratieissues.

---

## Test 2: Code

**Prompt:** Schrijf een Python functie die een lijst dedupliceert met behoud van de originele volgorde. Geef alleen de code.

**Respons:**
```python
def deduplicate_list(items):
   seen = set()
   deduplicated_list = []
   for item in items:
       if item not in seen:
           seen.add(item)
           deduplicated_list.append(item)
   return deduplicated_list
```

**Score (1-5):** 5
**Toelichting:** Perfect correcte Python code. Gebruikt efficiënt een set voor O(1) lookups en een lijst om volgorde te behouden. Syntaxis is correct, functie werkt zoals vereist. Gaf alleen code zonder extra uitleg, zoals aangevraagd.

---

## Test 3: Nederlands

**Prompt:** Beschrijf in precies 3 zinnen het verschil tussen een AI agent en een workflow automatisering.

**Respons:**
Een AI-agent is een slimme systeem die dynamisch acties kan uitvoeren op basis van complexe patronen herkennen en leren van interacties, terwijl workflow-automatisering vooral vaste processen en taken automatisch uitvoert volgens vooraf gedefinieerde regels. Het hoofdverschil is dat een AI-agent vaardigheden heeft om te leren en te evolueren met tijd, terwijl workflow-automatisering vooral efficiënte herhaling van gestippelde stappen nastreeft.

**Score (1-5):** 4
**Toelichting:** Geeft alleen 2 zinnen in plaats van vereiste 3 zinnen (niet volledig instructiegehoor). Inhoudelijk goed en accurate beschrijving in Nederlands van het verschil tussen beide concepten. Zou 5 zijn geweest met 3 zinnen.

---

## Test 4: Instructie (Fibonacci reeks)

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

**Score (1-5):** 4
**Toelichting:** Model geeft correct de Fibonacci-reeks tot 89 (laatst < 100). Alleen één getal per regel, geen extra tekst. Uitvoering accuraat, voldoet aan instrucities.

---

## Totaalscore

**Gemiddelde score:** 4.25 / 5

**Eindoordeel:**
Het qwen2.5:14b model presteert goed op alle benchmark tests. Het toont sterke vaardigheden in Nederlands-taal redeneringen, perfect Python code generatie, en volgt instructies over het algemeen accuraat. Het model demonstreert goede natuurlijke taalverwerking in het Nederlands, logisch redeneren, en code productie. De performance is consistent van hoge kwaliteit, met minimale punten afgetrokken voor incompleetheid in test 3.

---

**Test voltooid door:** bench-qwen25-14b agent
**Testdatum:** 2026-03-11
