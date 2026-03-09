# Analyse: META-SYSTEMS-ISSUES.md

**Datum:** 2026-03-09
**Analist:** meta-issues agent

---

## Samenvatting

Dit document bevat een bulk-push script voor 20 GitHub issues die meta-systemen definiëren als globale skills voor Open-Agents. Het vormt de tweede helft van een totale set van 32 issues (12 zelflerende kern + 20 meta-systemen). Alle 20 issues zijn afhankelijk van Issue #1 (Run Telemetry) en #2 (Post-Run Hooks). De issues zijn georganiseerd in 4 fasen: Quick Wins, Observeerbaarheid, Intelligentie en Infrastructuur.

---

## Relevantie voor Open-Agents

**Hoog** — Dit document beschrijft de complete set kwaliteitsborging- en zelfverbetermechanismen voor het platform. De issues adresseren bewezen faalpatronen (sycofantische completie, context-rot, informatieverlies) en bouwen het fundament voor autonome systeemverbetering. Direct inzetbaar zodra #1 en #2 geïmplementeerd zijn.

---

## Lijst van alle voorgestelde GitHub Issues (20 stuks)

| # | Titel | Fase | Label | Aanmaken |
|---|-------|------|-------|----------|
| 13 | Context Gap Detector | pre-execution | meta-system, pre-execution | **Ja** |
| 14 | Honesty Enforcer | post-execution | meta-system, post-execution | **Ja** |
| 15 | Adversarial Reviewer | post-execution | meta-system, post-execution | **Ja** |
| 16 | Invocation Quality Gate | pre-execution | meta-system, pre-execution | **Ja** |
| 17 | Assumption Tracker | during-execution | meta-system, during-execution | **Ja** |
| 18 | Context Decay Monitor | during-execution | meta-system, during-execution | **Ja** |
| 19 | Information Loss Detector | post-execution | meta-system, post-execution | **Ja** |
| 20 | Ecosystem Health Dashboard | periodic-analysis | meta-system, periodic-analysis | **Ja** |
| 21 | Knowledge Boundary Mapper | periodic-analysis | meta-system, periodic-analysis | **Ja** |
| 22 | Blind Spot Scanner | periodic-analysis | meta-system, periodic-analysis | **Ja** |
| 23 | Cross-Agent Pattern Miner | periodic-analysis | meta-system, periodic-analysis | **Ja** |
| 24 | Diminishing Returns Detector | periodic-analysis | meta-system, periodic-analysis | **Ja** |
| 25 | End-to-End Verifier | post-execution | meta-system, post-execution | **Ja** |
| 26 | Instruction Compliance Checker | post-execution | meta-system, post-execution | **Ja** |
| 27 | Session State Preserver | during-execution | meta-system, during-execution | **Ja** |
| 28 | Persistent Backlog | during-execution | meta-system, during-execution | **Ja** |
| 29 | File Conflict Preventer | pre-execution | meta-system, pre-execution | **Ja** |
| 30 | Anti-Regression Guard | periodic-analysis | meta-system, periodic-analysis | **Ja** |
| 31 | Token Budget Allocator | pre-execution | meta-system, pre-execution | **Ja** |
| 32 | Documentation Generator | periodic-analysis | meta-system, periodic-analysis | **Ja** |

**Alle 20 issues aanmaken** — Ze zijn concreet, actionable en vormen een coherente architectuur. Ze adresseren gedocumenteerde faalpatronen. Afhankelijkheden zijn expliciet benoemd.

---

## Labels aanmaken (vereist vóór issues)

```bash
gh label create "meta-system" --color "1d76db" --description "Globale skill die agent-kwaliteit op meta-niveau bewaakt"
gh label create "pre-execution" --color "c2e0c6" --description "Draait vóór agent-taak begint"
gh label create "during-execution" --color "fef2c0" --description "Draait tijdens agent-uitvoering"
gh label create "post-execution" --color "f9d0c4" --description "Draait na agent-output"
gh label create "periodic-analysis" --color "d4c5f9" --description "Draait periodiek voor systeembrede analyse"
```

---

## Issue Bodies (klaar om te kopiëren)

### Issue 13: Context Gap Detector

**Titel:** `feat: Context Gap Detector — agents identificeren wat ze NIET weten vóór ze beginnen`
**Labels:** `enhancement,meta-system,pre-execution`

```
## Probleem
Agents beginnen met onvoldoende informatie en vullen gaten met onzichtbare aannames.

## Oplossing
Globale skill die vóór complexe taken een Context Audit produceert:
- Wat weet ik zeker?
- Wat neem ik aan?
- Wat weet ik niet?
- Wat heb ik nodig?

## OA Integratie
- `oa run --audit` triggert automatisch vóór de eigenlijke taak
- Planner-agents doen dit standaard
- Output: context-audit.md

## Acceptatiecriteria
- [ ] Triggert bij multi-file, multi-step of onbekend-domein taken
- [ ] Produceert gestructureerde context-audit met 4 secties
- [ ] `oa run --audit` flag geïmplementeerd

Depends on: #1, #2
```

### Issue 14: Honesty Enforcer

**Titel:** `feat: Honesty Enforcer — agents moeten bewijzen dat ze echt klaar zijn`
**Labels:** `enhancement,meta-system,post-execution`

```
## Probleem
Sycofantische completie: agents melden 'klaar' terwijl werk onvolledig is.

## Oplossing
Verplichte self-check bij elke 'klaar'-melding:
- Heb ik ALLE gevraagde outputs geproduceerd?
- Heb ik elke output GEVERIFIEERD?
- Ben ik >80% zeker per onderdeel?
- Wat heb ik NIET gedaan dat impliciet verwacht werd?

## OA Integratie
- Combiner-agents krijgen deze skill standaard
- Post-run hook valideert completion-reports

## Acceptatiecriteria
- [ ] Triggert wanneer agent output als 'compleet' markeert
- [ ] Produceert per-deliverable PASS/FAIL met bewijs
- [ ] Post-run hook vergelijkt completion-report met filesystem

Depends on: #1, #2
```

### Issue 15: Adversarial Reviewer

**Titel:** `feat: Adversarial Reviewer — onafhankelijke read-only review agent`
**Labels:** `enhancement,meta-system,post-execution`

```
## Probleem
Self-review werkt niet — een agent kan zijn eigen werk niet objectief beoordelen.

## Oplossing
Aparte review-agent die READ-ONLY is en zoekt naar:
- Niet-gevolgde instructies
- Weggelaten edge cases
- Tests die niet daadwerkelijk passeren
- Output die niet compileert/runt
- Verdict: APPROVED / NEEDS WORK

## Kernmechanisme
Read-only constraint → geen incentive om issues te bagatelliseren.

## OA Integratie
- `oa run --review` spawnt adversarial reviewer na worker
- `oa pipeline` heeft dit als standaard stap
- Maximaal 5 review-ronden

## Acceptatiecriteria
- [ ] Review-agent is read-only (hard constraint)
- [ ] Gestructureerd verdict met specifieke issues
- [ ] `oa run --review` flag geïmplementeerd
- [ ] Maximaal 5 iteraties met convergentie-detectie

Depends on: #1, #2
```

### Issue 16: Invocation Quality Gate

**Titel:** `feat: Invocation Quality Gate — valideer sub-agent instructies vóór verzending`
**Labels:** `enhancement,meta-system,pre-execution`

```
## Probleem
Sub-agent failures zijn meestal invocation failures — slechte instructies, niet slechte uitvoering.

## Oplossing
Valideer elke sub-agent instructie op 5 dimensies:
- Specifieke bestandsreferenties aanwezig?
- Concrete success criteria?
- Scope afgebakend?
- Constraints expliciet?
- Outputformat gespecificeerd?
Score < threshold → herformulering afdwingen.

## OA Integratie
- Ingebouwd in `oa pipeline` en `oa delegate`
- Invocation-scores gelogd in run-telemetrie

## Acceptatiecriteria
- [ ] Validatie op elke sub-agent spawn
- [ ] Scoring op 5 kwaliteitsdimensies
- [ ] Onder threshold: herformulering afgedwongen

Depends on: #1, #2
```

---

## Aanbevolen Actie

- **Stap 1:** Labels aanmaken via bovenstaand script
- **Stap 2:** Alle 20 issues aanmaken via het bulk-push script in het brondocument
- **Stap 3:** Issues koppelen aan milestone "Meta-Systemen v1.0"
- **Archief:** Verplaats `META-SYSTEMS-ISSUES.md` naar `raw/archive/` na aanmaken van issues
