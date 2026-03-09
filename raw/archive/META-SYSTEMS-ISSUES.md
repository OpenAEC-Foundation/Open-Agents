# Open-Agents Issues — 20 Meta-Systemen (Globale Skills)

**Push na de eerste 12 issues uit de vorige set**  
**Alle 20 hangen af van Issue #1 (Run Telemetry) en #2 (Post-Run Hooks)**

## Labels om toe te voegen

```bash
gh label create "meta-system" --color "1d76db" --description "Globale skill die agent-kwaliteit op meta-niveau bewaakt"
gh label create "pre-execution" --color "c2e0c6" --description "Draait vóór agent-taak begint"
gh label create "during-execution" --color "fef2c0" --description "Draait tijdens agent-uitvoering"
gh label create "post-execution" --color "f9d0c4" --description "Draait na agent-output"
gh label create "periodic-analysis" --color "d4c5f9" --description "Draait periodiek voor systeembrede analyse"
```

## Bulk Push Script

```bash
cd ~/path/to/Open-Agents

# Fase 2: Quick wins (push deze eerst)
gh issue create \
  --title "feat: Context Gap Detector — agents identificeren wat ze NIET weten vóór ze beginnen" \
  --body "## Probleem
Agents beginnen met onvoldoende informatie en vullen gaten met onzichtbare aannames.

## Oplossing
Globale skill die vóór complexe taken een Context Audit produceert:
- Wat weet ik zeker? (feiten uit context)
- Wat neem ik aan? (niet-geverifieerde aannames)  
- Wat weet ik niet? (expliciete gaten)
- Wat heb ik nodig? (concrete informatieverzoeken)

## OA Integratie
- \`oa run --audit\` triggert automatisch vóór de eigenlijke taak
- Planner-agent in pipelines doet dit standaard
- Output: context-audit.md — mens beslist of gaten acceptabel zijn

## Acceptatiecriteria
- [ ] Skill triggert bij multi-file, multi-step of onbekend-domein taken
- [ ] Produceert gestructureerde context-audit met 4 secties
- [ ] \`oa run --audit\` flag geïmplementeerd
- [ ] Planner-agents integreren dit standaard

Depends on: #1, #2
Labels: meta-system, pre-execution, priority-high" \
  --label "enhancement,meta-system,pre-execution"

gh issue create \
  --title "feat: Honesty Enforcer — agents moeten bewijzen dat ze echt klaar zijn" \
  --body "## Probleem
Sycofantische completie: agents melden 'klaar' terwijl werk onvolledig is. Gedocumenteerd als #1 faalpatroon in 11+ sessies (GitHub claude-code #19739). Anthropic's eigen onderzoek bevestigt: 'Claude's tendency to mark a feature as complete without proper testing.'

## Oplossing
Globale skill die bij elke 'klaar'-melding een verplichte self-check afdwingt:
- Heb ik ALLE gevraagde outputs geproduceerd?
- Heb ik elke output GEVERIFIEERD (niet alleen gegenereerd)?
- Zijn er onderdelen waar ik <80% zeker over ben?
- Wat heb ik NIET gedaan dat impliciet verwacht werd?

## OA Integratie
- Combiner-agents krijgen deze skill standaard
- Post-run hook valideert completion-reports tegen daadwerkelijke output
- Output: completion-report.md met eerlijke status per deliverable

## Acceptatiecriteria
- [ ] Skill triggert wanneer agent output als 'compleet' markeert
- [ ] Produceert per-deliverable PASS/FAIL met bewijs
- [ ] Post-run hook vergelijkt completion-report met filesystem
- [ ] Oneerlijke completions worden gedetecteerd en gelogd

Depends on: #1, #2
Bron: https://github.com/anthropics/claude-code/issues/19739" \
  --label "enhancement,meta-system,post-execution"

gh issue create \
  --title "feat: Adversarial Reviewer — onafhankelijke read-only review agent" \
  --body "## Probleem
Self-review werkt niet. Architectureel bewezen: een agent kan zijn eigen werk niet objectief beoordelen. Productie-systemen implementeren een hard invariant: 'Self-review is impossible by construction.'

## Oplossing
Spawn een aparte review-agent die READ-ONLY is en specifiek zoekt naar:
- Niet-gevolgde instructies (diff tegen originele taak)
- Weggelaten edge cases
- Tests die niet daadwerkelijk passeren
- Output die niet compileert/runt
- Verdict: APPROVED / NEEDS WORK + specifieke issues

## Kernmechanisme
De reviewer is READ-ONLY — kan geen bestanden wijzigen. Heeft dus geen incentive om issues te bagatelliseren. Dit is cruciaal.

## OA Integratie
- \`oa run --review\` spawnt automatisch adversarial reviewer na worker
- \`oa pipeline\` heeft dit als standaard stap vóór combiner
- Maximaal 5 review-ronden (voorkomen van oneindige loop)

## Acceptatiecriteria
- [ ] Review-agent is read-only (hard constraint, niet alleen instructie)
- [ ] Produceert gestructureerd verdict met specifieke issues
- [ ] \`oa run --review\` flag geïmplementeerd
- [ ] Pipeline-integratie als standaard stap
- [ ] Maximaal 5 iteraties met convergentie-detectie

Depends on: #1, #2
Bron: https://gist.github.com/sigalovskinick/6cc1cef061f76b7edd198e0ebc863397" \
  --label "enhancement,meta-system,post-execution"

gh issue create \
  --title "feat: Invocation Quality Gate — valideer sub-agent instructies vóór verzending" \
  --body "## Probleem
'Most sub-agent failures aren't execution failures — they're invocation failures.' De orchestrator stuurt vage instructies, de sub-agent doet zijn best met slechte input.

## Oplossing
Valideer elke sub-agent instructie op:
- Bevat specifieke bestandsreferenties?
- Concrete success criteria?
- Scope afgebakend?
- Constraints expliciet?
- Outputformat gespecificeerd?
Score < threshold → dwing herformulering af.

## OA Integratie
- Ingebouwd in \`oa pipeline\` en \`oa delegate\`
- Planner-output wordt gevalideerd voordat workers worden gespawned
- Invocation-scores worden gelogd voor analyse

## Acceptatiecriteria
- [ ] Validatie draait op elke sub-agent spawn
- [ ] Scoring op 5 kwaliteitsdimensies
- [ ] Onder threshold: herformulering afgedwongen
- [ ] Invocation-scores in run-telemetrie
- [ ] Historische analyse: welke formuleringen werken het best

Depends on: #1, #2
Bron: https://claudefa.st/blog/guide/agents/sub-agent-best-practices" \
  --label "enhancement,meta-system,pre-execution"

# Fase 3: Observeerbaarheid
gh issue create \
  --title "feat: Assumption Tracker — registreer elke onuitgesproken aanname" \
  --body "Agents maken keuzes zonder expliciete instructie. Deze aannames zijn onzichtbaar tot het resultaat verkeerd is. Log elke aanname als: 'AANNAME: [wat] — REDEN: [waarom]'. Post-run hook analyseert welke aannames fout bleken. Patronen van verkeerde aannames → template-verbetering.

Depends on: #1, #2" \
  --label "enhancement,meta-system,during-execution"

gh issue create \
  --title "feat: Context Decay Monitor — meet kwaliteitsdaling in real-time" \
  --body "Context rot is gradueel, niet binair. Monitor: repetitie-detectie, instructie-drift, opvulling-detectie, tool-misuse. Produceer context-health-score per interval. Trigger compaction bij daling.

Depends on: #1, #2, #3 (Context Tracking)" \
  --label "enhancement,meta-system,during-execution,context-engineering"

gh issue create \
  --title "feat: Information Loss Detector — trace informatieverlies door pipelines" \
  --body "Elke handoff is een potentieel informatielek. Planner specificeert 5 vereisten, worker ontvangt 4, combiner ziet 3. Trace de volledige informatieflow: originele taak → per handoff → per output → eindresultaat. Rapporteer verlies-percentages per stap.

Depends on: #1, #2, #8 (Handoff Protocol)" \
  --label "enhancement,meta-system,post-execution"

gh issue create \
  --title "feat: Ecosystem Health Dashboard — centraal overzicht van OA-gezondheid" \
  --body "Met 20+ skills, 160+ templates, configuratie op meerdere niveaus en continue agent-runs is een centraal overzicht nodig. \`oa health\` scant: skills (triggeren ze? conflicten?), templates (success-rates? verouderd?), config (inconsistenties?), kennisbasis (deduplicatie nodig?), hooks (fouten?), benchmarks (trend?).

Depends on: #1, #6 (Self-Benchmark)" \
  --label "enhancement,meta-system,periodic-analysis"

# Fase 4: Intelligentie
gh issue create \
  --title "feat: Knowledge Boundary Mapper — waar zijn onze agents goed en slecht?" \
  --body "Analyseer run-telemetrie per taakcategorie: success-rate, correctie-rondes, token-efficiency per domein. Produceer knowledge-boundary-map.yaml. Input voor \`oa improve\` — focus verbeteringen op de zwakste domeinen.

Depends on: #1, #5 (Lessons Extraction)" \
  --label "enhancement,meta-system,periodic-analysis"

gh issue create \
  --title "feat: Blind Spot Scanner — ontdek systematische blinde vlekken" \
  --body "Cluster gefaalde runs op gemeenschappelijke oorzaak, agent-type, taakcategorie, fase. Als 40% van testing-taken faalt omdat agents tests schrijven maar niet uitvoeren → dat is één template-wijziging. Produceer blind-spots-report.md met gerankte blinde vlekken + fix-suggesties.

Depends on: #1, #5 (Lessons Extraction)" \
  --label "enhancement,meta-system,periodic-analysis"

gh issue create \
  --title "feat: Cross-Agent Pattern Miner — ontdek systeem-brede patronen" \
  --body "Analyseer runs OVER agent-types heen. Correlaties tussen planner-kwaliteit en worker-succes. Gemeenschappelijke faalpatronen ongeacht agent-type. Welke taakformuleringen leiden universeel tot betere resultaten. Globale patronen → globale CLAUDE.md updates of shared-skills.

Depends on: #1, #5 (Lessons Extraction)" \
  --label "enhancement,meta-system,periodic-analysis"

gh issue create \
  --title "feat: Diminishing Returns Detector — weet wanneer je moet stoppen met optimaliseren" \
  --body "Analyseer verbetering-over-tijd per component. Template X: 3 verbeteringen, 67%→82%→84%→85% = diminishing returns. Skill Y: 1 verbetering, 45%→68% = hoge marge. Produceer optimization-priority-map.md. Stuurt \`oa improve\` naar de echte bottlenecks.

Depends on: #1, #6 (Self-Benchmark)" \
  --label "enhancement,meta-system,periodic-analysis"

# Fase 5: Infrastructuur
gh issue create \
  --title "feat: End-to-End Verifier — bewijs dat output daadwerkelijk werkt" \
  --body "Compileer/run het resultaat. Voer tests uit (niet alleen schrijven). Simuleer gebruikersscenario. Vergelijk output met verwachting. Verplichte stap in elke pipeline vóór completion.

Bron: Anthropic engineering blog — 'absent explicit prompting, Claude tended to make code changes but would fail to recognize that the feature didn't work end-to-end.'

Depends on: #1, #2" \
  --label "enhancement,meta-system,post-execution"

gh issue create \
  --title "feat: Instruction Compliance Checker — diff instructie vs. resultaat" \
  --body "Vergelijk de originele instructie LETTERLIJK met het daadwerkelijke resultaat. Check elk specifiek vereiste tegen output. Markeer ELKE afwijking. Adresseert het 'does the opposite while claiming compliance' patroon.

Depends on: #1, #2, #8 (Handoff Protocol)" \
  --label "enhancement,meta-system,post-execution"

gh issue create \
  --title "feat: Session State Preserver — hervat agent-sessies exact waar ze stopten" \
  --body "Schrijf periodiek + bij sessie-einde: wat is voltooid (met bewijs), actieve taak, openstaande beslissingen, relevante bestanden, wat de volgende sessie moet doen. Voorkomt het 'agent ziet bestaand werk en meldt klaar'-faalpatroon.

Bron: Anthropic initializer-agent patroon
Depends on: #1" \
  --label "enhancement,meta-system,during-execution"

gh issue create \
  --title "feat: Persistent Backlog — taken overleven sessies" \
  --body "~/.oa/backlog.yaml die niet verdwijnt bij sessie-einde. Agents voegen TODO's toe wanneer ontdekt. \`oa backlog\` toont lijst. \`oa backlog next\` pakt hoogste prioriteit. \`oa improve\` kan items automatisch oppakken.

Depends on: #1" \
  --label "enhancement,meta-system,during-execution"

gh issue create \
  --title "feat: File Conflict Preventer — voorkom dat parallelle agents elkaars werk overschrijven" \
  --body "Analyseer taak per agent, wijs file-boundaries toe. Agent A owns src/auth/*, Agent B owns src/api/*. Gedeelde bestanden → sequential lock. \`oa pipeline\` genereert ownership-map automatisch.

Depends on: planner decomposition" \
  --label "enhancement,meta-system,pre-execution"

gh issue create \
  --title "feat: Anti-Regression Guard — voorkom dat verbeteringen andere dingen breken" \
  --body "Bij elke template/skill-wijziging: draai relevante benchmarks VOOR en NA. Vergelijk success-rates, token-efficiency, doorlooptijden. FAIL als enige metric significant verslechtert. Gate in \`oa improve apply\`.

Depends on: #6 (Self-Benchmark)" \
  --label "enhancement,meta-system,periodic-analysis"

gh issue create \
  --title "feat: Token Budget Allocator — verdeel context-budget intelligent over agents" \
  --body "Planner schat token-behoefte per subtaak op basis van complexiteit en historisch verbruik. Alloceer proportioneel. Workers weten hun budget + compaction-trigger.

Depends on: #1, #3 (Context Tracking)" \
  --label "enhancement,meta-system,pre-execution,context-engineering"

gh issue create \
  --title "feat: Documentation Generator — het systeem documenteert zichzelf" \
  --body "Post-improve hook. Na elke significante wijziging: update README, ARCHITECTURE.md, CHANGELOG, agent-catalogus, skill-catalogus. Documentatie drift van werkelijkheid voorkomen.

Depends on: #12 (Meta-Agent OA Improver)" \
  --label "enhancement,meta-system,periodic-analysis"

echo "✅ Alle 20 meta-systeem issues aangemaakt"
```

## Totaaloverzicht: 32 Issues (12 + 20)

### Originele 12 (Zelflerende Kern)
1. Run Telemetry ← **FUNDAMENT**
2. Post-Run Hooks ← **ZENUWSTELSEL**
3. Context Tracking
4. Auto Template Generation
5. Lessons Extraction
6. Self-Benchmark
7. Auto-Compaction
8. Handoff Protocol
9. Skill per Agent
10. Settings Auto-Tuning
11. Agent Graveyard
12. Meta-Agent OA Improver

### 20 Meta-Systemen (Globale Skills)
13. Context Gap Detector (pre)
14. Assumption Tracker (during)
15. Honesty Enforcer (post)
16. Knowledge Boundary Mapper (periodic)
17. Blind Spot Scanner (periodic)
18. Adversarial Reviewer (post)
19. End-to-End Verifier (post)
20. Instruction Compliance Checker (post)
21. Context Decay Monitor (during)
22. Session State Preserver (during)
23. Persistent Backlog (during)
24. Invocation Quality Gate (pre)
25. File Conflict Preventer (pre)
26. Information Loss Detector (post)
27. Anti-Regression Guard (periodic)
28. Cross-Agent Pattern Miner (periodic)
29. Diminishing Returns Detector (periodic)
30. Token Budget Allocator (pre)
31. Ecosystem Health Dashboard (periodic)
32. Documentation Generator (periodic)
