# Data Visualization Agent Library - Batch Report

**Generated**: 2026-03-10 | **Agent**: batch-dataviz | **Category**: data-visualization

---

## Batch Summary

Successfully created **10 atomic agent templates** in the `data-visualization` category for the Open-Agents library.

| Metric | Value |
|--------|-------|
| **Templates Created** | 10 |
| **Category** | data-visualization |
| **Model Hint** | anthropic/claude-haiku-4-5-20251001 |
| **Maturity Level** | tool-capable |
| **Atomic** | true |
| **Tools** | Read, Write |

---

## Agents Created

### 1. **Chart Type Selector**
- **ID**: data-visualization-chart-type-selector
- **Purpose**: Analyzes data characteristics and recommends optimal chart types
- **Key Input**: Data dimensions, volume, analytical goals, time-series/categorical flags
- **Key Output**: Top 3 recommendations with pros/cons and usage guidance

### 2. **Color Palette Advisor**
- **ID**: data-visualization-color-palette-advisor
- **Purpose**: Generates accessible and aesthetically pleasing color palettes
- **Key Input**: Chart type, data categories, brand colors, accessibility level
- **Key Output**: Hex codes, WCAG contrast ratios, colorblind-friendly guidance

### 3. **Dashboard Layout Optimizer**
- **ID**: data-visualization-dashboard-layout-optimizer
- **Purpose**: Designs optimal dashboard layouts with visual hierarchy
- **Key Input**: User goals, KPI count, screen size, update frequency
- **Key Output**: ASCII grid layout, sizing ratios, spacing guidelines, responsiveness strategy

### 4. **Data Story Planner**
- **ID**: data-visualization-data-story-planner
- **Purpose**: Develops compelling narrative structures for data insights
- **Key Input**: Key findings, target audience, business context, desired action
- **Key Output**: Story arc outline, scene breakdown, transition narrative, CTA guidance

### 5. **Axis Label Formatter**
- **ID**: data-visualization-axis-label-formatter
- **Purpose**: Generates clear, contextually appropriate axis labels
- **Key Input**: Chart type, data type, value range, unit of measurement
- **Key Output**: Label formats, tick intervals, unit abbreviations, accessibility tips

### 6. **Tooltip Content Designer**
- **ID**: data-visualization-tooltip-content-designer
- **Purpose**: Crafts informative tooltip content for interactive visualizations
- **Key Input**: Data attributes, interaction context, screen space, user sophistication
- **Key Output**: Information hierarchy, field formatting, character limits, mobile patterns

### 7. **Drill-Down Hierarchy Builder**
- **ID**: data-visualization-drill-down-hierarchy-builder
- **Purpose**: Structures hierarchical data for intuitive multi-level exploration
- **Key Input**: Hierarchy levels, data points, exploration patterns, aggregation rules
- **Key Output**: Hierarchy flow diagram, breadcrumb patterns, back-navigation strategies

### 8. **Annotation Writer**
- **ID**: data-visualization-annotation-writer
- **Purpose**: Creates targeted annotations highlighting key insights
- **Key Input**: Key data points, annotation style, target audience, available space
- **Key Output**: Placement strategies, text formulation guidelines, annotation types

### 9. **Chart Accessibility Checker**
- **ID**: data-visualization-chart-accessibility-checker
- **Purpose**: Audits visualizations for WCAG compliance and inclusive design
- **Key Input**: Chart description, color palette, font sizes, contrast ratios, WCAG level
- **Key Output**: Accessibility checklist, issues with severity, remediation recommendations

### 10. **Visualization Critique Writer**
- **ID**: data-visualization-visualization-critique-writer
- **Purpose**: Provides comprehensive design critique and improvement recommendations
- **Key Input**: Visualization description, chart type, data context, design goals
- **Key Output**: Structured critique across effectiveness, clarity, aesthetics, accessibility

---

## Batch Validation

✅ **All 10 JSON files created successfully**
✅ **Valid JSON structure with double quotes**
✅ **Consistent ID format**: `data-visualization-{name}`
✅ **Category**: All set to `data-visualization`
✅ **Model Hint**: All set to `anthropic/claude-haiku-4-5-20251001`
✅ **Tools**: All include Read and Write tools
✅ **Atomic Flag**: All set to `true`
✅ **Maturity**: All set to `tool-capable`
✅ **System Prompts**: All include detailed, specific instructions
✅ **File Naming**: Kebab-case with .json extension

---

## Directory Structure

```
/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/agents/library/data-visualization/
├── chart-type-selector.json
├── color-palette-advisor.json
├── dashboard-layout-optimizer.json
├── data-story-planner.json
├── axis-label-formatter.json
├── tooltip-content-designer.json
├── drill-down-hierarchy-builder.json
├── annotation-writer.json
├── chart-accessibility-checker.json
├── visualization-critique-writer.json
└── batch-report.md
```

---

## Coverage and Domain Alignment

The 10 agents collectively cover:

- **Chart Selection & Strategy** (chart-type-selector, data-story-planner)
- **Visual Design** (color-palette-advisor, dashboard-layout-optimizer, annotation-writer)
- **Interaction & Navigation** (tooltip-content-designer, drill-down-hierarchy-builder)
- **Content & Labeling** (axis-label-formatter, annotation-writer)
- **Quality & Accessibility** (chart-accessibility-checker, visualization-critique-writer)

---

## Atomic Agent Properties

Each agent:
- ✅ Solves a single, well-defined design problem
- ✅ Takes clear, structured JSON input
- ✅ Produces markdown documentation output
- ✅ Can be invoked independently
- ✅ Uses only Read and Write tools (no external APIs)
- ✅ Follows data-visualization domain conventions

---

## Recommended Use Patterns

### Visualization Design Pipeline
1. **chart-type-selector** → Determine chart type
2. **data-story-planner** → Plan narrative
3. **dashboard-layout-optimizer** → Design layout (if multi-chart)
4. **color-palette-advisor** → Select colors
5. **axis-label-formatter** → Format labels
6. **tooltip-content-designer** → Design interactions
7. **annotation-writer** → Add callouts
8. **chart-accessibility-checker** → Audit compliance
9. **visualization-critique-writer** → Final review

### Quick Review Mode
- **chart-accessibility-checker** → Fast accessibility audit
- **visualization-critique-writer** → Design quality assessment

---

## Notes

- All templates use Haiku model for speed and cost-efficiency
- Atomic design allows flexible composition into larger workflows
- Emphasis on accessibility and inclusive design across all templates
- Prompts are deterministic and specific for reliable output
- Dashboard and multi-level visualization support included

---

*Report generated by batch-dataviz agent on 2026-03-10*
