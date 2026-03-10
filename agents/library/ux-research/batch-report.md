# UX Research Agent Library - Batch Report

## Summary
Generated 10 atomic agent templates for UX research activities, created on 2026-03-10.

## Templates Created

### 1. User Interview Guide Writer
- **ID**: ux-research-user-interview-guide-writer
- **File**: user-interview-guide-writer.json
- **Purpose**: Creates structured interview guides with research objectives, screener questions, and topic guides
- **Output**: interview-guide.md

### 2. Usability Test Planner
- **ID**: ux-research-usability-test-planner
- **File**: usability-test-planner.json
- **Purpose**: Designs comprehensive usability testing plans with test scenarios and success metrics
- **Output**: usability-test-plan.md

### 3. Affinity Diagram Builder
- **ID**: ux-research-affinity-diagram-builder
- **File**: affinity-diagram-builder.json
- **Purpose**: Constructs affinity diagrams by clustering research insights into themes and patterns
- **Output**: affinity-diagram.md

### 4. Persona Creator
- **ID**: ux-research-persona-creator
- **File**: persona-creator.json
- **Purpose**: Develops realistic user personas with demographics, behaviors, goals, and pain points
- **Output**: personas.md

### 5. Journey Map Writer
- **ID**: ux-research-journey-map-writer
- **File**: journey-map-writer.json
- **Purpose**: Produces detailed customer journey maps showing touchpoints, emotions, and opportunities
- **Output**: journey-map.md

### 6. Heuristic Evaluation Checker
- **ID**: ux-research-heuristic-evaluation-checker
- **File**: heuristic-evaluation-checker.json
- **Purpose**: Evaluates interfaces against established UX heuristics and usability principles
- **Output**: heuristic-evaluation.md

### 7. Card Sorting Designer
- **ID**: ux-research-card-sorting-designer
- **File**: card-sorting-designer.json
- **Purpose**: Designs card sorting studies and analyzes results for information architecture decisions
- **Output**: card-sorting-analysis.md

### 8. Survey Question Writer
- **ID**: ux-research-survey-question-writer
- **File**: survey-question-writer.json
- **Purpose**: Crafts well-designed survey questions using validated techniques for quantitative research
- **Output**: survey.md

### 9. Jobs to Be Done Analyzer
- **ID**: ux-research-jobs-to-be-done-analyzer
- **File**: jobs-to-be-done-analyzer.json
- **Purpose**: Analyzes research data through JTBD framework to uncover customer motivations
- **Output**: jobs-analysis.md

### 10. UX Research Report Writer
- **ID**: ux-research-ux-research-report-writer
- **File**: ux-research-report-writer.json
- **Purpose**: Synthesizes research findings into comprehensive professional reports with recommendations
- **Output**: research-report.md

## Template Specifications

**Common Properties:**
- **Category**: ux-research
- **Atomic**: true
- **Maturity**: tool-capable
- **Model Hint**: anthropic/claude-haiku-4-5-20251001
- **Tools**: Read, Write

**Directory**: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/ux-research/`

## Quality Assurance
- ✅ All 10 JSON files created with valid schema
- ✅ Consistent ID naming convention: ux-research-{agent-name}
- ✅ All templates use proper double-quote JSON format
- ✅ SystemPrompt fields contain clear task descriptions and output specifications
- ✅ Tags align with research domains
- ✅ Model hints set to Haiku for efficiency (atomic, focused tasks)

## Integration with oa System
These templates are now discoverable via:
```bash
oa run "<research-task>" --name <agent-name> --model claude/haiku --agent-template ux-research/user-interview-guide-writer
```

Each agent can be spawned as a parallel worker for research workflows, enabling efficient batch UX research operations.
