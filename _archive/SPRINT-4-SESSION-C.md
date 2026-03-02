# Sprint 4 — Sessie C: Frontend Integration + Templates

> **Branch**: `feature/sprint-4-pool` (bestaat al, checkout deze branch)
> **Scope**: CanvasPage registratie, Sidebar uitbreiding, SSE handlers, edge styling, pool template
> **Afhankelijkheden**: Sessie A (shared types, store, backend) en Sessie B (DispatcherNode, AggregatorNode) moeten EERST klaar zijn. Wacht op commits van beide sessies.

---

## Context

Sprint 4 (Pool Pattern) is verdeeld over 3 sessies:
- **Sessie A** (ander venster): Backend execution engine + dispatcher classifier — shared types al geüpdated
- **Sessie B** (ander venster): DispatcherNode.tsx + AggregatorNode.tsx componenten
- **Sessie C** (dit): Frontend integratie, SSE, templates, docs

De volgende bestanden zijn al aangepast:
- `packages/shared/src/types.ts` — DispatcherNodeData, AggregatorNodeData, CanvasNodeData union, type guards, pool SSE events
- `packages/frontend/src/stores/types.ts` — CanvasSlice.addNode accepteert type param
- `packages/frontend/src/stores/slices/canvasSlice.ts` — addNode met type prefix (dispatcher-N, aggregator-N)

---

## Taak 1: Registreer Node Types in CanvasPage

**Bestand**: `packages/frontend/src/pages/CanvasPage.tsx`

### 1a. Imports toevoegen
```typescript
import { DispatcherNode } from "../components/DispatcherNode";
import { AggregatorNode } from "../components/AggregatorNode";
import type { AgentNodeData, DispatcherNodeData, AggregatorNodeData, NodeType } from "@open-agents/shared";
```

### 1b. Node types registreren
Verander regel 22:
```typescript
// WAS:
const nodeTypes = { agent: AgentNode };

// WORDT:
const nodeTypes = { agent: AgentNode, dispatcher: DispatcherNode, aggregator: AggregatorNode };
```

### 1c. Drop handler uitbreiden
De huidige `onDrop` handler leest alleen `application/open-agents-preset` (voor agent presets). Voeg een tweede check toe voor `application/open-agents-node` (voor utility nodes):

```typescript
const onDrop = useCallback(
  (e: DragEvent) => {
    e.preventDefault();

    // Check for utility node (dispatcher/aggregator)
    const nodeRaw = e.dataTransfer.getData("application/open-agents-node");
    if (nodeRaw) {
      const { type, data } = JSON.parse(nodeRaw) as { type: NodeType; data: DispatcherNodeData | AggregatorNodeData };
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      addNode(data, { x: e.clientX - bounds.left - 150, y: e.clientY - bounds.top - 40 }, type);
      return;
    }

    // Existing: agent preset
    const raw = e.dataTransfer.getData("application/open-agents-preset");
    if (!raw) return;
    const data = JSON.parse(raw) as AgentNodeData;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    addNode(data, { x: e.clientX - bounds.left - 120, y: e.clientY - bounds.top - 40 });
  },
  [addNode],
);
```

### 1d. Edge styling voor dispatcher edges
In de `displayEdges` useMemo, voeg dashed styling toe voor dispatcher source edges wanneer idle:

Na de bestaande color logic, voor de return, voeg toe:
```typescript
// Check if source is a dispatcher node — show dashed when idle
const sourceNode = nodes.find(n => n.id === edge.source);
const isDashed = sourceNode?.type === "dispatcher" && !animated;

return {
  ...edge,
  animated,
  style: {
    ...edge.style,
    stroke: strokeColor,
    strokeWidth: 2,
    ...(isDashed ? { strokeDasharray: "5 5" } : {}),
  },
};
```

---

## Taak 2: Update Sidebar met Utility Nodes

**Bestand**: `packages/frontend/src/components/Sidebar.tsx`

Voeg een "Utility Nodes" sectie toe ONDER de bestaande agent presets. Gebruik een andere MIME type (`application/open-agents-node`).

### Defaults voor dispatcher en aggregator:
```typescript
const defaultDispatcherData: DispatcherNodeData = {
  name: "Dispatcher",
  routingPrompt: "Classify the task and select which specialist agent(s) should handle it.",
  routingModel: "anthropic/claude-haiku-4-5",
  maxParallel: 5,
  timeoutMs: 300000,
};

const defaultAggregatorData: AggregatorNodeData = {
  name: "Aggregator",
  aggregationStrategy: "concatenate",
};
```

### Drag handler:
```typescript
function onDragStartNode(e: DragEvent, type: NodeType, data: DispatcherNodeData | AggregatorNodeData) {
  e.dataTransfer.setData("application/open-agents-node", JSON.stringify({ type, data }));
  e.dataTransfer.effectAllowed = "move";
}
```

### UI: voeg toe na de bestaande presets `</div>`:
```tsx
{/* Utility Nodes */}
<div className="px-4 py-3 border-b border-border-default">
  <h2 className="text-text-secondary text-sm font-semibold">Utility Nodes</h2>
  <p className="text-text-muted text-xs mt-1">Pool pattern building blocks</p>
</div>
<div className="flex flex-col gap-2 p-3">
  <div
    className="bg-surface-overlay border border-amber-500/30 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-amber-500/60 transition-colors"
    draggable
    onDragStart={(e) => onDragStartNode(e, "dispatcher", defaultDispatcherData)}
  >
    <div className="flex items-center gap-2">
      <span className="text-amber-400 text-sm">⇉</span>
      <span className="text-text-primary text-sm font-medium">Dispatcher</span>
      <span className="ml-auto text-xs px-1.5 py-0.5 rounded text-white bg-amber-600">Router</span>
    </div>
    <p className="text-text-tertiary text-xs mt-1">Routes tasks to specialist agents</p>
  </div>

  <div
    className="bg-surface-overlay border border-purple-500/30 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-purple-500/60 transition-colors"
    draggable
    onDragStart={(e) => onDragStartNode(e, "aggregator", defaultAggregatorData)}
  >
    <div className="flex items-center gap-2">
      <span className="text-purple-400 text-sm">⊕</span>
      <span className="text-text-primary text-sm font-medium">Aggregator</span>
      <span className="ml-auto text-xs px-1.5 py-0.5 rounded text-white bg-purple-600">Merge</span>
    </div>
    <p className="text-text-tertiary text-xs mt-1">Merges outputs from parallel agents</p>
  </div>
</div>
```

Importeer de benodigde types:
```typescript
import type { AgentNodeData, AgentPreset, SkillLevel, DispatcherNodeData, AggregatorNodeData, NodeType } from "@open-agents/shared";
```

---

## Taak 3: Frontend SSE Handler Updates

**Bestand**: `packages/frontend/src/stores/slices/executionSlice.ts`

In de `startExecution` method, in de switch statement (rond regel 59), voeg cases toe voor de nieuwe SSE events:

```typescript
case "step:skipped":
  if (event.nodeId) {
    set((state) => { state.nodeStatuses[event.nodeId!] = "idle"; });
  }
  break;
case "pool:start":
  // Informational — individual step:start events handle node status
  break;
case "pool:complete":
  // Informational — individual step:complete events handle node status
  break;
```

---

## Taak 4: Pool Template

**Bestand**: `agents/templates/pool-code-review.json` (nieuw)

Maak een pool pattern template:

```json
{
  "id": "pool-code-review",
  "name": "Code Review Pool",
  "description": "Dispatcher routes code to security, performance, and style reviewers in parallel, then aggregates findings.",
  "nodes": [
    {
      "id": "dispatcher-1",
      "type": "dispatcher",
      "position": { "x": 100, "y": 200 },
      "data": {
        "name": "Review Router",
        "routingPrompt": "Classify this code review request. Based on the code characteristics, determine which specialist reviewers should analyze it. Available specialists: {connected_agent_names}. Respond with a JSON array of agent IDs.",
        "routingModel": "anthropic/claude-haiku-4-5",
        "maxParallel": 3,
        "timeoutMs": 300000
      }
    },
    {
      "id": "agent-1",
      "type": "agent",
      "position": { "x": 450, "y": 50 },
      "data": {
        "name": "Security Reviewer",
        "description": "Checks for security vulnerabilities",
        "model": "anthropic/claude-sonnet-4-6",
        "systemPrompt": "You are a security expert. Review the code for vulnerabilities: SQL injection, XSS, CSRF, insecure dependencies, hardcoded secrets, privilege escalation. Report each finding with severity (critical/high/medium/low) and recommended fix.",
        "tools": ["Read", "Glob", "Grep"]
      }
    },
    {
      "id": "agent-2",
      "type": "agent",
      "position": { "x": 450, "y": 200 },
      "data": {
        "name": "Performance Reviewer",
        "description": "Checks for performance issues",
        "model": "anthropic/claude-sonnet-4-6",
        "systemPrompt": "You are a performance expert. Review the code for: N+1 queries, unnecessary re-renders, missing memoization, large bundle imports, inefficient algorithms, memory leaks. Suggest specific optimizations.",
        "tools": ["Read", "Glob", "Grep"]
      }
    },
    {
      "id": "agent-3",
      "type": "agent",
      "position": { "x": 450, "y": 350 },
      "data": {
        "name": "Style Reviewer",
        "description": "Checks code style and best practices",
        "model": "anthropic/claude-haiku-4-5",
        "systemPrompt": "You are a code quality expert. Review for: naming conventions, code organization, DRY violations, dead code, missing error handling, accessibility issues. Follow the project's existing patterns.",
        "tools": ["Read", "Glob", "Grep"]
      }
    },
    {
      "id": "aggregator-1",
      "type": "aggregator",
      "position": { "x": 800, "y": 200 },
      "data": {
        "name": "Review Summary",
        "aggregationStrategy": "concatenate"
      }
    }
  ],
  "edges": [
    { "id": "e-d-a1", "source": "dispatcher-1", "target": "agent-1" },
    { "id": "e-d-a2", "source": "dispatcher-1", "target": "agent-2" },
    { "id": "e-d-a3", "source": "dispatcher-1", "target": "agent-3" },
    { "id": "e-a1-agg", "source": "agent-1", "target": "aggregator-1" },
    { "id": "e-a2-agg", "source": "agent-2", "target": "aggregator-1" },
    { "id": "e-a3-agg", "source": "agent-3", "target": "aggregator-1" }
  ]
}
```

---

## Taak 5: Update Docs

### ROADMAP.md
Verander onder "Sprint 4 — Pool Pattern (Pending)":
```
- [x] Pool pattern: dispatcher-based routing
- [x] Parallelle agent execution
- [x] Patronen combineerbaar
```

En update Fase 3 percentage naar 100%.

### MASTERPLAN.md
Verander Sprint 4 taken van `[ ]` naar `[x]` en status naar "Done".

---

## Verificatie

```bash
pnpm --filter @open-agents/frontend typecheck
pnpm --filter @open-agents/shared build
```

## Commit

Commit als: `feat(frontend): pool pattern integration — sidebar, canvas, SSE, template (Sprint 4)`
