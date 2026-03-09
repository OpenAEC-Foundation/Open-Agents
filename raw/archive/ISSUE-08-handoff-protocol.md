# feat: Structured Handoff Protocol — formele agent-agent communicatie

**Labels:** `self-improvement` `priority-medium` `agent-lifecycle`  
**Depends on:** #1 (Run Telemetry)

## Probleem

Agents communiceren via het filesystem zonder formeel contract. De planner schrijft een plan.md, workers lezen het — maar er is geen schema, geen validatie, geen traceerbaarheid. Als een worker het plan verkeerd interpreteert, is de oorzaak onvindbaar.

## Oplossing

Een handoff.yaml protocol dat elke agent-agent overdracht formaliseert.

### Handoff Schema

```yaml
# Elke overdracht produceert een handoff.yaml
handoff:
  id: "hoff-20260308-143025"
  from_agent: "planner"
  to_agent: "worker-1"
  pipeline_id: "pipe-20260308-143020"
  timestamp: "2026-03-08T14:30:25Z"
  
  type: "task_assignment"        # of: result_delivery, context_share, escalation
  
  task:
    description: "Implementeer email validatie module"
    context_files:
      - path: "src/validators.py"
        relevance: "Bestaande validatie-patronen volgen"
      - path: "tests/test_validators.py"
        relevance: "Test-stijl als voorbeeld"
    constraints:
      - "Geen externe packages"
      - "Type hints verplicht"
      - "Minimaal 90% test coverage"
    success_criteria:
      - "Alle bestaande tests blijven slagen"
      - "Nieuwe tests voor edge cases (null, unicode, max-length)"
      - "Module is importeerbaar zonder side-effects"
    
  deliverables:
    expected_files:
      - "src/email_validator.py"
      - "tests/test_email_validator.py"
    expected_format: "Python module + pytest tests"
    
  priority: "normal"             # low, normal, high, critical
  deadline_hint: null            # Optioneel: geschatte maximale duur
```

### Handoff Validatie

Bij ontvangst valideert de worker:
1. Zijn alle `context_files` aanwezig en leesbaar?
2. Zijn `success_criteria` concreet genoeg om te verifiëren?
3. Is het `expected_format` duidelijk?

Bij problemen: automatische escalatie terug naar afzender.

### Result Delivery (terug-handoff)

```yaml
handoff:
  id: "hoff-20260308-144500"
  from_agent: "worker-1"
  to_agent: "combiner"
  type: "result_delivery"
  
  result:
    status: "complete"
    files_produced:
      - "src/email_validator.py"
      - "tests/test_email_validator.py"
    success_criteria_met:
      - criteria: "Alle bestaande tests blijven slagen"
        met: true
      - criteria: "Nieuwe tests voor edge cases"
        met: true
        details: "12 test cases inclusief unicode en max-length"
    notes: "Regex-based approach gekozen boven DNS lookup vanwege constraint 'geen externe packages'"
```

### Waarom dit de zelflerende cyclus versterkt

Elke handoff is nu data. Je kunt analyseren:
- Welke type taak-beschrijvingen leiden tot hogere success-rates?
- Welke constraints worden het vaakst geschonden?
- Welke success_criteria formuleringen zijn het meest effectief?
- Waar gaat de communicatie structureel mis?

## Acceptatiecriteria

- [ ] Pipeline-agents communiceren via handoff.yaml bestanden
- [ ] Schema-validatie bij ontvangst
- [ ] Handoffs worden gelogd en zijn traceerbaar per pipeline
- [ ] `oa handoffs <pipeline-id>` toont alle overdrachten in een pipeline
- [ ] Result deliveries bevatten success_criteria verificatie
