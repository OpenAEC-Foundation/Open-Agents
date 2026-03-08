# Builder Rebuild Summary

## Redesigned Files (7)

### Node Components
1. **nodes/AgentNode.tsx** — Orange `#ff6b00` border, displays label/task/model badge, orange handles
2. **nodes/TriggerNode.tsx** — Green `#10b981` border, shows trigger type, exports `TRIGGER_TYPES`
3. **nodes/ConditionNode.tsx** — Amber `#f59e0b` border, shows expression, dual source handles (yes/no)
4. **nodes/OutputNode.tsx** — Violet `#8b5cf6` border, shows output type, exports `OUTPUT_TYPES`

### Layout Components
5. **NodePalette.tsx** — 200px wide, large blocks with emoji + name + description, 4 node types
6. **FlowCanvas.tsx** — Orange edges (`#ff6b00`), Delete/Backspace key handler, no minimap, node update callbacks
7. **BuilderTab.tsx** — 3-column layout: [NodePalette 200px | Canvas flex-1 | PropertiesPanel 280px]

## Design System
- Font: Montserrat
- Background: `#0a0a0a`
- Surface: `#111111`
- Border: `#222222`
- Accent: `#ff6b00`

## Key Features
- **Properties Panel** (280px): Editable fields per node type, live two-way data binding
- **Run Pipeline**: Generates `oa run` commands from agent nodes sorted by x-position
- **Delete**: Delete key removes selected nodes/edges
- **No new dependencies**: Uses existing @xyflow/react, React, zustand
- **TypeScript strict**: All data interfaces typed, no `any`
- **Max 150 lines**: All files within limit
