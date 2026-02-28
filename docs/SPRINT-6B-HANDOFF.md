# Sprint 6b Handoff — Assembly Engine

> **Status**: ~70% compleet
> **Branch**: `feature/sprint-6b-assembly` (gebaseerd op sprint-7, NIET op main)
> **Sessie**: Overdracht vanuit context-limited sessie

---

## Wat is AF

### Backend (100% af)

| Bestand | Beschrijving |
|---------|-------------|
| `packages/backend/src/assembly/classify-intent.ts` | Stap 1: Haiku classificeert NL → TaskIntent |
| `packages/backend/src/assembly/match-patterns.ts` | Stap 2: TypeScript scoring (geen LLM) |
| `packages/backend/src/assembly/generate-graph.ts` | Stap 3: Sonnet genereert CanvasConfig |
| `packages/backend/src/assembly/auto-layout.ts` | Stap 4: dagre positioneert nodes |
| `packages/backend/src/assembly/index.ts` | Barrel export |
| `packages/backend/src/routes/assembly.ts` | POST /api/assembly/generate + /classify |
| `packages/backend/src/server.ts` | assemblyRoutes geregistreerd |

### Shared Types (100% af)

| Bestand | Beschrijving |
|---------|-------------|
| `packages/shared/src/assembly-types.ts` | TaskIntent, PatternMatch, AssemblyResult, AssemblyRequest |
| `packages/shared/src/index.ts` | Exports assembly types |

### Frontend (deels af)

| Bestand | Status | Beschrijving |
|---------|--------|-------------|
| `packages/frontend/src/stores/slices/assemblySlice.ts` | ✅ | Zustand slice met generateFromDescription, applyAssemblyResult, fetchPatterns |
| `packages/frontend/src/stores/appStore.ts` | ✅ | Import + compose assemblySlice |
| `packages/frontend/src/components/GenerateBar.tsx` | ✅ | NL input bar met result preview |

### Dependencies

- `@dagrejs/dagre` + `@types/dagre` geïnstalleerd in frontend package.json

---

## Wat moet NOG GEDAAN worden

### 1. ❌ VERWIJDER `packages/backend/src/assembly-engine.ts`

Dit bestand is een redundante "all-in-one" versie. De modulaire bestanden in `assembly/` zijn de juiste implementatie. Verwijder dit bestand.

### 2. ❌ Types fixen in `packages/frontend/src/stores/types.ts`

**Probleem**: `AssemblySlice` interface ontbreekt in types.ts, en `AppState` union mist meerdere slices.

**Oplossing**: Voeg toe aan `types.ts`:

```typescript
// Na de bestaande imports, voeg toe:
import type { AssemblyResult, RoutingPattern } from "@open-agents/shared";

// Voeg deze interface toe (na WorkspaceSlice):
export interface AssemblySlice {
  assemblyLoading: boolean;
  assemblyError: string | null;
  assemblyResult: AssemblyResult | null;
  patternLibraryOpen: boolean;
  allPatterns: RoutingPattern[];
  patternsLoading: boolean;

  generateFromDescription: (description: string, patternId?: string, budgetSensitive?: boolean) => Promise<void>;
  clearAssembly: () => void;
  applyAssemblyResult: () => void;
  setPatternLibraryOpen: (open: boolean) => void;
  fetchPatterns: () => Promise<void>;
}

// Update AppState (ook FactorySlice, SafetySlice, AuditSlice toevoegen als die er nog niet instaan):
export type AppState = CanvasSlice &
  SelectionSlice &
  HistorySlice &
  UISlice &
  SettingsSlice &
  ExecutionSlice &
  WorkspaceSlice &
  FactorySlice &
  SafetySlice &
  AuditSlice &
  AssemblySlice;
```

**Check**: FactorySlice, SafetySlice en AuditSlice interfaces moeten ook in types.ts staan als dat nog niet het geval is. Kijk naar de bestaande slice bestanden (`factorySlice.ts`, `safetySlice.ts`, `auditSlice.ts`) voor de interfaces.

### 3. ❌ `PatternLibrary.tsx` bouwen

**Locatie**: `packages/frontend/src/components/PatternLibrary.tsx`

**Specificatie**:
- Modal/sidebar die alle routing patterns toont (35 patterns, 7 categorieën)
- Haalt patterns op via `GET /api/knowledge/patterns` (al werkend endpoint)
- Groepeer per categorie: linear, pyramid, parallel, iterative, validation, efficiency, specialist
- Per pattern toon: naam, categorie, tags, diagram (ASCII), minNodes-maxNodes
- Klik op pattern → selecteer als forced pattern voor generateFromDescription()
- Gebruik `assemblySlice.allPatterns` state en `fetchPatterns()` action
- `patternLibraryOpen` state bepaalt of het zichtbaar is
- Styling: consistent met bestaande modal/panel componenten

**Voorbeeld structuur**:
```tsx
export function PatternLibrary() {
  const patterns = useAppStore(s => s.allPatterns);
  const loading = useAppStore(s => s.patternsLoading);
  const isOpen = useAppStore(s => s.patternLibraryOpen);
  const setOpen = useAppStore(s => s.setPatternLibraryOpen);
  const fetchPatterns = useAppStore(s => s.fetchPatterns);
  const generate = useAppStore(s => s.generateFromDescription);

  useEffect(() => { if (isOpen && patterns.length === 0) fetchPatterns(); }, [isOpen]);

  if (!isOpen) return null;

  // Group by category, render cards with diagram preview
  // Click card → generate("", pattern.id) or set as preferred pattern
}
```

### 4. ❌ `CostEstimatePanel.tsx` bouwen

**Locatie**: `packages/frontend/src/components/CostEstimatePanel.tsx`

**Specificatie**:
- Klein panel dat cost estimate toont bij assembly results
- Per-node breakdown: node naam, model, geschatte tokens, kosten
- Totaal: input tokens, output tokens, totale USD kosten
- Data komt uit `assemblyResult.costEstimate`
- Ook bruikbaar los: kan canvas config naar `POST /api/knowledge/estimate-cost` sturen
- Styling: compact, past in de GenerateBar result preview of als apart panel

### 5. ❌ Wiring in CanvasPage.tsx

**Bestand**: `packages/frontend/src/pages/CanvasPage.tsx`

**Wijzigingen**:
1. Import `GenerateBar` en `PatternLibrary`
2. Voeg `<GenerateBar />` toe BOVEN het canvas (in het `<Panel position="top-left">` of als apart element)
3. Voeg `<PatternLibrary />` toe als overlay/modal
4. Eventueel `<CostEstimatePanel />` in de result preview

**Huidige structuur** (relevante delen):
```tsx
<div className="flex-1 relative">
  {/* VOEG HIER GENERATEBAR TOE */}
  <GenerateBar />

  <ReactFlow ...>
    <Background />
    <Controls />
    <MiniMap />
    <Panel position="top-right">
      <ExecutionToolbar />
      ...
    </Panel>
  </ReactFlow>

  <OutputPanel />
  <ErrorDecisionDialog />

  {/* VOEG HIER PATTERN LIBRARY TOE */}
  <PatternLibrary />
</div>
```

### 6. ❌ ROADMAP.md + MASTERPLAN.md checkboxes updaten

**ROADMAP.md** (rond regel 127-133): Zet alle Sprint 6b items op `[x]`:
```
- [x] Intent classificatie (Haiku) — NL → TaskIntent
- [x] Pattern matching (TypeScript) — intent → top 3 patterns
- [x] Graph generatie (Sonnet) — pattern → CanvasConfig met nodes, edges, prompts
- [x] Cost estimatie + graph validatie
- [x] GenerateBar, PatternLibrary, CostEstimatePanel componenten
- [x] Auto-layout met dagre
```

Update ook de percentage: `Fase 4b (Assembly): ████████████████████ **100%**`

**MASTERPLAN.md** (rond regel 806-846): Zet alle Sprint 6b taken op `[x]`.

### 7. ❌ Commit

```bash
git add -A
# Maar exclude eventuele ongewenste bestanden
git commit -m "feat: assembly engine — NL to agent graph pipeline (Sprint 6b)

- classifyIntent() with Haiku for NL → TaskIntent classification
- matchPatterns() deterministic scoring (TypeScript, no LLM)
- generateGraph() with Sonnet for concrete CanvasConfig generation
- Auto-layout with @dagrejs/dagre (D-019)
- Cost estimation + graph validation in pipeline
- POST /api/assembly/generate + /classify endpoints
- GenerateBar component with result preview
- PatternLibrary browseable pattern viewer
- CostEstimatePanel per-node cost breakdown
- assemblySlice in Zustand appStore

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Architectuur Overzicht

```
POST /api/assembly/generate
  ├── Step 1: classifyIntent(description)  → Haiku → TaskIntent
  ├── Step 2: matchPatterns(intent)        → TypeScript → PatternMatch[3]
  ├── Step 3: generateGraph(desc, intent, pattern) → Sonnet → CanvasConfig
  ├── Step 4: applyAutoLayout(config)      → dagre → positioned nodes
  ├── Step 5a: estimateCost(config)        → knowledge engine → CostEstimate
  └── Step 5b: validateGraph(config)       → knowledge engine → ValidationResult

Frontend:
  GenerateBar → POST /assembly/generate → assemblyResult
    → "Apply to Canvas" → setCanvas(nodes, edges)
  PatternLibrary → GET /knowledge/patterns → browse + select pattern
```

---

## Bestanden om te lezen bij start nieuwe sessie

1. `ROADMAP.md` — waar staan we?
2. `DECISIONS.md` — D-017, D-019, D-022 relevant
3. `packages/backend/src/assembly/` — alle 5 backend bestanden
4. `packages/frontend/src/stores/slices/assemblySlice.ts` — state management
5. `packages/frontend/src/components/GenerateBar.tsx` — bestaande UI
6. `packages/frontend/src/stores/types.ts` — types die gefixt moeten worden
7. `packages/frontend/src/pages/CanvasPage.tsx` — waar GenerateBar in moet

---

*Overdracht door Claude Opus 4.6 — 2026-03-03*
