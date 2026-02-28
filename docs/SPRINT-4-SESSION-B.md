# Sprint 4 — Sessie B: Frontend Components (DispatcherNode + AggregatorNode)

> **Branch**: `feature/sprint-4-pool` (bestaat al, checkout deze branch)
> **Scope**: 2 nieuwe React Flow node componenten
> **Afhankelijkheden**: Shared types zijn al geüpdated (DispatcherNodeData, AggregatorNodeData in @open-agents/shared)

---

## Context

We bouwen Sprint 4 (Pool Pattern) voor Open-Agents. De shared types en store zijn al aangepast:
- `DispatcherNodeData` en `AggregatorNodeData` bestaan in `packages/shared/src/types.ts`
- `canvasSlice.addNode()` accepteert nu een `type` parameter (default: "agent")
- `NodeType = "agent" | "dispatcher" | "aggregator"`

Jouw taak: **2 nieuwe React Flow node componenten** bouwen die het bestaande `AgentNode.tsx` patroon volgen.

---

## Taak 1: DispatcherNode.tsx

**Bestand**: `packages/frontend/src/components/DispatcherNode.tsx` (nieuw)

Volg het patroon van `packages/frontend/src/components/AgentNode.tsx` exact. Belangrijke verschillen:

### Visueel
- **Groter**: `min-w-[300px] max-w-[360px]` (agent is 240-300)
- **Kleur accent**: amber/orange (`border-amber-500/30`) in plaats van default border
- **Header icon**: Router/split icon (gebruik SVG inline, bv een "⇉" karakter of simpele SVG)
- Zelfde status dot patroon als AgentNode (`statusColors` object)

### Data
De node data is `DispatcherNodeData`:
```typescript
interface DispatcherNodeData {
  name: string;
  description?: string;
  routingPrompt: string;
  routingModel: ModelId;   // default: "anthropic/claude-haiku-4-5"
  maxParallel: number;     // default: 5
  timeoutMs: number;       // default: 300000
}
```

### Bewerkbare velden
1. **Name input** — zelfde patroon als AgentNode header
2. **Model selector** — alleen voor classificatie, zelfde `models` array als AgentNode
3. **Routing prompt textarea** — groot (rows={4}), placeholder: "Describe how to route tasks to connected agents..."
4. **Max parallel** — `<input type="number" min={1} max={10}>` met label
5. **Timeout** — `<input type="number">` in seconden (converteer naar ms bij opslag), label "Timeout (sec)"

### React Flow Handles
- `Handle type="target" position={Position.Left}` — input
- `Handle type="source" position={Position.Right}` — output naar pool agents

### Store integratie
- `useAppStore(s => s.updateNodeData)` voor edits
- `useAppStore(s => s.nodeStatuses[id] ?? "idle")` voor status
- Cast data: `const dispatcherData = data as unknown as DispatcherNodeData;`

---

## Taak 2: AggregatorNode.tsx

**Bestand**: `packages/frontend/src/components/AggregatorNode.tsx` (nieuw)

### Visueel
- **Breedte**: `min-w-[260px] max-w-[320px]`
- **Kleur accent**: purple/violet (`border-purple-500/30`)
- **Header icon**: Merge/funnel icon (bv "⊕" of simpele SVG)
- Zelfde status dot patroon

### Data
```typescript
interface AggregatorNodeData {
  name: string;
  description?: string;
  aggregationStrategy: "concatenate" | "synthesize";
  aggregationModel?: ModelId;
  aggregationPrompt?: string;
}
```

### Bewerkbare velden
1. **Name input** — header
2. **Strategy dropdown** — `<select>` met "Concatenate" en "Synthesize" opties
3. **Model selector** — alleen tonen als strategy === "synthesize"
4. **Synthesis prompt textarea** — alleen tonen als strategy === "synthesize", rows={3}

### React Flow Handles
- `Handle type="target" position={Position.Left}` — ontvangt parallel outputs
- `Handle type="source" position={Position.Right}` — gecombineerde output

---

## Stijl referentie

Alle classes gebruiken het bestaande theme systeem (`bg-surface-raised`, `text-text-primary`, `border-border-default`, etc.). Kijk in `AgentNode.tsx` voor de exacte patronen.

De `nopan nodrag` classes op interactieve elementen (inputs, textareas, selects, buttons) zijn **essentieel** — zonder deze klassen worden ze meegesleept met de node.

---

## Verificatie

Na het bouwen:
1. Check of de componenten zonder TypeScript fouten compileren:
   ```bash
   pnpm --filter @open-agents/frontend typecheck
   ```
2. De componenten hoeven nog NIET geregistreerd te worden in CanvasPage — dat doet Sessie C.

---

## Commit

Commit als: `feat(frontend): DispatcherNode + AggregatorNode components (Sprint 4)`
