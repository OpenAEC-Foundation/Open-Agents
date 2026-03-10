# Privacy Agent Templates - Batch Report

**Generated:** 2026-03-10T02:02:40.855925
**Category:** privacy
**Model Hint:** anthropic/claude-haiku-4-5-20251001
**Tools:** Read, Write
**Maturity:** tool-capable
**Atomic:** true

## Summary
Successfully created 10 privacy-focused agent templates for the Open-Agents library.

## Created Templates

| ID | Name | Tags | Purpose |
|---|---|---|---|
| privacy-data-minimization-advisor | Data Minimization Advisor | data-reduction, privacy-by-design | Analyzes and minimizes data collection |
| privacy-consent-flow-designer | Consent Flow Designer | consent-management, gdpr, ux | Designs GDPR-compliant consent workflows |
| privacy-impact-assessor | Privacy Impact Assessor | dpia, risk-assessment | Conducts DPIAs and risk analysis |
| privacy-anonymization-technique-selector | Anonymization Technique Selector | anonymization, de-identification | Selects optimal anonymization methods |
| privacy-data-subject-request-handler | Data Subject Request Handler | dsar, right-to-erasure | Manages GDPR data subject rights |
| privacy-cookie-consent-configurator | Cookie Consent Configurator | cookie-consent, tracking, ePrivacy | Configures compliant cookie consent |
| privacy-cross-border-transfer-advisor | Cross-Border Transfer Advisor | data-transfer, gdpr, schrems-ii | Evaluates lawful data transfer mechanisms |
| privacy-privacy-by-design-reviewer | Privacy-by-Design Reviewer | privacy-by-design, system-design | Reviews for privacy-by-design compliance |
| privacy-data-breach-response-planner | Data Breach Response Planner | breach-response, incident-management | Develops breach response procedures |
| privacy-vendor-data-processor-auditor | Vendor Data Processor Auditor | vendor-management, processor-audit | Audits third-party processor compliance |

## Technical Details

### JSON Schema Validation
- All files use double quotes (JSON valid)
- All required fields present
- All files follow standard template format

### File Locations
- **Directory:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/privacy/`
- **Files Created:** 10 JSON templates + 1 report markdown

### Field Specifications
```json
{
  "id": "privacy-{name}",
  "category": "privacy",
  "modelHint": "anthropic/claude-haiku-4-5-20251001",
  "tools": ["Read", "Write"],
  "atomic": true,
  "maturity": "tool-capable"
}
```

## Use Cases

1. **Data Minimization Advisor** - Reduce unnecessary data collection
2. **Consent Flow Designer** - Build GDPR Article 7 compliant workflows
3. **Privacy Impact Assessor** - Formal DPIA documentation and risk assessment
4. **Anonymization Technique Selector** - Choose appropriate de-identification
5. **Data Subject Request Handler** - Fulfill SAR, erasure, portability rights
6. **Cookie Consent Configurator** - Implement privacy-compliant tracking
7. **Cross-Border Transfer Advisor** - Navigate Schrems II and SCC guidance
8. **Privacy-by-Design Reviewer** - Embed privacy from inception
9. **Data Breach Response Planner** - Prepare 72-hour notification procedures
10. **Vendor Data Processor Auditor** - Ensure processor compliance

## Integration Notes
- All agents use Haiku model for cost-effective operation
- Atomic design: each solves a single, focused privacy task
- Tool set (Read/Write) sufficient for analysis and document generation
- Suitable for both assessment and implementation support

## Next Steps
- Register templates in agent discovery system
- Create category-level documentation
- Integrate with privacy compliance workflows
