# Education-Tech Agent Library Batch Report

**Generated:** 2026-03-10 01:54:34

## Summary
Successfully created 10 atomic agent templates for the education-tech category.

**Directory:** `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/education-tech/`

**Model Hint:** `anthropic/claude-haiku-4-5-20251001`
**Tools:** Read, Write
**Maturity:** tool-capable
**Atomic:** Yes

## Agents Created

### 1. Curriculum Planner
- **File:** `curriculum-planner.json`
- **ID:** `education-tech-curriculum-planner`

### 2. Learning Objective Writer
- **File:** `learning-objective-writer.json`
- **ID:** `education-tech-learning-objective-writer`

### 3. Quiz Generator
- **File:** `quiz-generator.json`
- **ID:** `education-tech-quiz-generator`

### 4. Rubric Builder
- **File:** `rubric-builder.json`
- **ID:** `education-tech-rubric-builder`

### 5. Study Guide Creator
- **File:** `study-guide-creator.json`
- **ID:** `education-tech-study-guide-creator`

### 6. Lesson Plan Writer
- **File:** `lesson-plan-writer.json`
- **ID:** `education-tech-lesson-plan-writer`

### 7. Competency Mapper
- **File:** `competency-mapper.json`
- **ID:** `education-tech-competency-mapper`

### 8. Learning Path Designer
- **File:** `learning-path-designer.json`
- **ID:** `education-tech-learning-path-designer`

### 9. Assessment Grader
- **File:** `assessment-grader.json`
- **ID:** `education-tech-assessment-grader`

### 10. Instructional Design Advisor
- **File:** `instructional-design-advisor.json`
- **ID:** `education-tech-instructional-design-advisor`

## Template Structure

All agents use the following JSON schema:
```json
{
  "id": "education-tech-{name}",
  "name": "{Display Name}",
  "description": "{Description}",
  "atomic": true,
  "category": "education-tech",
  "tags": ["education", "learning", "instructional-design", "pedagogy"],
  "maturity": "tool-capable",
  "modelHint": "anthropic/claude-haiku-4-5-20251001",
  "tools": ["Read", "Write"],
  "systemPrompt": "{Detailed system prompt with ROLE, TASK, INPUT, OUTPUT structure}"
}
```

## Files Generated
- 10 agent JSON templates
- batch-report.md (this file)

## Quality Assurance
✓ All files have valid JSON syntax
✓ All agents have education-tech ID prefix
✓ All agents use haiku-4-5 model hint
✓ All agents include Read and Write tools
✓ All agents are marked as atomic
✓ All agents have maturity: tool-capable
✓ All system prompts follow ROLE/TASK/INPUT/OUTPUT structure
✓ All agents tagged with relevant keywords

## Integration
These agents are ready for use in the Open-Agents ecosystem.
They can be discovered via:
```bash
ls /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/agents/library/education-tech/
```

## Categories Covered
- Curriculum Planning
- Learning Objectives & Goals
- Assessment & Testing
- Rubrics & Grading
- Study Materials
- Lesson Planning
- Competency Tracking
- Personalized Learning
- Feedback & Evaluation
- Instructional Design

---
*Batch created by: batch-edu-tech | Category: education-tech*
