# Batch 12 — Agent Library Report

**Date:** 2026-03-08
**Total templates created:** 30
**Categories:** hr-people, legal, education

---

## hr-people (10 agents)

| File | ID | Name |
|------|----|------|
| `job-description-writer.json` | `hr-people-job-description-writer` | Job Description Writer |
| `interview-question-generator.json` | `hr-people-interview-question-generator` | Interview Question Generator |
| `onboarding-checklist-builder.json` | `hr-people-onboarding-checklist-builder` | Onboarding Checklist Builder |
| `performance-review-writer.json` | `hr-people-performance-review-writer` | Performance Review Writer |
| `okr-goal-setter.json` | `hr-people-okr-goal-setter` | OKR Goal Setter |
| `team-health-surveyor.json` | `hr-people-team-health-surveyor` | Team Health Surveyor |
| `skills-matrix-builder.json` | `hr-people-skills-matrix-builder` | Skills Matrix Builder |
| `hiring-pipeline-designer.json` | `hr-people-hiring-pipeline-designer` | Hiring Pipeline Designer |
| `offboarding-guide-writer.json` | `hr-people-offboarding-guide-writer` | Offboarding Guide Writer |
| `compensation-benchmark-analyzer.json` | `hr-people-compensation-benchmark-analyzer` | Compensation Benchmark Analyzer |

## legal (10 agents)

| File | ID | Name |
|------|----|------|
| `contract-clause-extractor.json` | `legal-contract-clause-extractor` | Contract Clause Extractor |
| `nda-reviewer.json` | `legal-nda-reviewer` | NDA Reviewer |
| `terms-of-service-writer.json` | `legal-terms-of-service-writer` | Terms of Service Writer |
| `privacy-policy-generator.json` | `legal-privacy-policy-generator` | Privacy Policy Generator |
| `intellectual-property-advisor.json` | `legal-intellectual-property-advisor` | Intellectual Property Advisor |
| `gdpr-dpa-writer.json` | `legal-gdpr-dpa-writer` | GDPR Data Processing Agreement Writer |
| `software-license-advisor.json` | `legal-software-license-advisor` | Software License Advisor |
| `sla-drafter.json` | `legal-sla-drafter` | SLA Drafter |
| `cookie-policy-writer.json` | `legal-cookie-policy-writer` | Cookie Policy Writer |
| `liability-clause-analyzer.json` | `legal-liability-clause-analyzer` | Liability Clause Analyzer |

## education (10 agents)

| File | ID | Name |
|------|----|------|
| `curriculum-designer.json` | `education-curriculum-designer` | Curriculum Designer |
| `quiz-generator.json` | `education-quiz-generator` | Quiz Generator |
| `learning-objective-writer.json` | `education-learning-objective-writer` | Learning Objective Writer |
| `lesson-plan-creator.json` | `education-lesson-plan-creator` | Lesson Plan Creator |
| `rubric-builder.json` | `education-rubric-builder` | Rubric Builder |
| `feedback-comment-writer.json` | `education-feedback-comment-writer` | Feedback Comment Writer |
| `study-guide-generator.json` | `education-study-guide-generator` | Study Guide Generator |
| `assessment-designer.json` | `education-assessment-designer` | Assessment Designer |
| `explainer-video-script-writer.json` | `education-explainer-video-script-writer` | Explainer Video Script Writer |
| `flashcard-generator.json` | `education-flashcard-generator` | Flashcard Generator |

---

## Template Conventions

- **modelHint:** `anthropic/claude-haiku-4-5-20251001` (all 30 — lightweight text generation tasks)
- **maturity:** `tool-capable`
- **tools:** `["Read", "Write"]`
- **atomic:** `true`
- All systemPrompts follow the pattern: Role → Task → Input → Output → Write instruction
