# Accessibility Agent Library — Batch Report

**Date:** 2026-03-10
**Category:** accessibility
**Total templates created:** 10
**Status:** Complete

## Templates

| File | ID | Model | Tools |
|------|----|-------|-------|
| wcag-compliance-checker.json | accessibility-wcag-compliance-checker | claude-haiku-4-5 | Read, Write |
| aria-label-writer.json | accessibility-aria-label-writer | claude-haiku-4-5 | Read, Write |
| color-contrast-analyzer.json | accessibility-color-contrast-analyzer | claude-haiku-4-5 | Read, Write |
| screen-reader-script-writer.json | accessibility-screen-reader-script-writer | claude-haiku-4-5 | Read, Write |
| alt-text-generator.json | accessibility-alt-text-generator | claude-haiku-4-5 | Read, Write |
| keyboard-navigation-auditor.json | accessibility-keyboard-navigation-auditor | claude-haiku-4-5 | Read, Write |
| focus-order-reviewer.json | accessibility-focus-order-reviewer | claude-haiku-4-5 | Read, Write |
| accessibility-test-plan-writer.json | accessibility-test-plan-writer | claude-haiku-4-5 | Read, Write |
| cognitive-load-assessor.json | accessibility-cognitive-load-assessor | claude-haiku-4-5 | Read, Write |
| pdf-accessibility-checker.json | accessibility-pdf-accessibility-checker | claude-haiku-4-5 | Read, Write, Bash |

## Template Descriptions

1. **WCAG Compliance Checker** — Audits HTML/JSX against WCAG 2.1 AA, outputs violations with criterion IDs and line numbers.
2. **ARIA Label Writer** — Adds missing aria-label/labelledby/describedby to interactive elements in-place.
3. **Color Contrast Analyzer** — Extracts color pairs from CSS/Tailwind and calculates WCAG contrast ratios.
4. **Screen Reader Script Writer** — Produces a sequential narration script of what NVDA/JAWS/VoiceOver would announce.
5. **Alt Text Generator** — Fills missing alt attributes with context-aware descriptions; marks decorative images as alt="".
6. **Keyboard Navigation Auditor** — Flags missing tabindex, click-only handlers, and missing keyboard event support.
7. **Focus Order Reviewer** — Simulates tab order traversal and compares against logical reading order per WCAG 2.4.3.
8. **Accessibility Test Plan Writer** — Generates structured manual + automated test plans mapped to WCAG 2.1 AA.
9. **Cognitive Load Assessor** — Evaluates copy and layout for cognitive accessibility per WCAG 3.1 and COGA guidelines.
10. **PDF Accessibility Checker** — Audits PDFs for tags, reading order, alt text, and metadata using CLI tools.

## Design Decisions

- All templates use  as  (structured audit output, deterministic tasks).
- PDF checker adds  tool to enable pdfinfo/pdftotext CLI access.
- All outputs are file-based (written to disk next to input files) for agent composability.
- SystemPrompts are in English, deterministic, and follow Input/Output/Task structure.
