# Canvas Interactie Patronen — open-2d-studio

> **Bron**: [OpenAEC-Foundation/open-2d-studio](https://github.com/OpenAEC-Foundation/open-2d-studio) (TypeScript, React, Zustand, Canvas2D)
> **Doel**: Lesmateriaal en inspiratie voor het Open-Agents canvas (React Flow gebaseerd)
> **Datum**: 2026-03-08

---

## 1. Architectuur Overzicht

### 1.1 Technologie Stack

| Laag | Technologie | Rol |
|------|-------------|-----|
| UI Framework | React + TypeScript | Componenten, overlays, panels |
| State Management | Zustand | Gecentraliseerde state met per-document stores |
| Rendering | Canvas 2D API | Alle shapes, grid, selectie, snapping |
| Desktop | Tauri | Native file I/O, window management |
| Command System | Custom Command Bus | Alle operaties via commands |

### 1.2 Architectuur Lagen

```
┌─────────────────────────────────────────┐
│  React Components (Canvas.tsx, Panels)  │  ← UI & event handling
├─────────────────────────────────────────┤
│  CadApi (Facade)                        │  ← Publieke API (window.cad)
├─────────────────────────────────────────┤
│  Command Registry + Handlers            │  ← Alle operaties als commands
├─────────────────────────────────────────┤
│  Zustand Store (appStore)               │  ← State + history
├─────────────────────────────────────────┤
│  CADRenderer → DrawingRenderer          │  ← Canvas 2D rendering
│              → SheetRenderer            │
│              → HandleRenderer           │
├─────────────────────────────────────────┤
│  Engine (Geometry, Snap, Tracking)      │  ← Wiskundige kern
└─────────────────────────────────────────┘
```

### 1.3 Facade Pattern — CadApi

De hele applicatie wordt ontsloten via één `CadApi` klasse die beschikbaar is als `window.cad`:

```typescript
// src/api/index.ts
class CadApi {
  events: CadEventBus;
  transactions: TransactionManager;

  // Interne API modules (elk een eigen klasse)
  _entities: EntitiesApi;
  _layers: LayersApi;
  _selection: SelectionApi;
  _viewport: ViewportApi;
  _document: DocumentApi;
  _snap: SnapApi;
  _grid: GridApi;
  _tools: ToolsApi;
  _styles: StylesApi;
  _annotations: AnnotationsApi;

  // Command execution
  async run(cmd: Command): Promise<CommandResponse>;

  // Convenience methods
  draw(type, params);
  undo();
  redo();

  // Macro systeem
  startRecording();
  stopRecording();
  runMacro(commands);
}
```

**Toepasbaar patroon**: Een facade die alle subsystemen bundelt maakt het makkelijk om een scripting API, macro-systeem, én MCP tools bloot te stellen via één interface.

---

## 2. Element Beweging & Drag

### 2.1 Shape Translatie

Alle shape-beweging gaat via het `modify/move` command. De `translateShape()` functie past positie aan per shape-type:

```typescript
// src/api/commands/handlers/modify.ts
function translateShape(shape: Shape, dx: number, dy: number): Shape {
  const moved = { ...shape };
  switch (shape.type) {
    case 'line':
      moved.start = { x: shape.start.x + dx, y: shape.start.y + dy };
      moved.end = { x: shape.end.x + dx, y: shape.end.y + dy };
      break;
    case 'rectangle':
      moved.topLeft = { x: shape.topLeft.x + dx, y: shape.topLeft.y + dy };
      break;
    case 'circle':
    case 'arc':
    case 'ellipse':
      moved.center = { x: shape.center.x + dx, y: shape.center.y + dy };
      break;
    case 'polyline':
    case 'spline':
      moved.points = shape.points.map(p => ({
        x: p.x + dx, y: p.y + dy
      }));
      break;
    case 'text':
      moved.position = { x: shape.position.x + dx, y: shape.position.y + dy };
      break;
  }
  return moved;
}
```

**Key insight**: Elke shape-type heeft zijn eigen positie-eigenschap(pen). Er is geen generieke `x, y` — lijnen hebben `start/end`, rechthoeken `topLeft`, cirkels `center`, polylines een `points[]` array.

### 2.2 Move Command

```typescript
// Move handler
{
  command: 'modify',
  action: 'move',
  handler: (context, params) => {
    const { dx, dy, ids } = params;
    const state = context.getState();
    const targetIds = ids || state.selectedShapeIds;

    targetIds.forEach(id => {
      const shape = state.shapes.find(s => s.id === id);
      if (shape) {
        const moved = translateShape(shape, dx, dy);
        state.updateShape(id, moved);
      }
    });

    return { success: true, data: { count: targetIds.length, ids: targetIds } };
  }
}
```

### 2.3 Copy met Offset

```typescript
// Copy handler — kloon shapes met 20px offset
{
  command: 'modify',
  action: 'copy',
  handler: (context, params) => {
    const { dx = 20, dy = 20, ids } = params;
    const state = context.getState();
    const targetIds = ids || state.selectedShapeIds;
    const newIds = [];

    targetIds.forEach(id => {
      const shape = state.shapes.find(s => s.id === id);
      if (shape) {
        const cloned = cloneShape(shape, dx, dy); // Deep copy + new ID
        state.addShape(cloned);
        newIds.push(cloned.id);
      }
    });

    return { success: true, data: { newIds } };
  }
}
```

### 2.4 Deep Clone Strategie

```typescript
function cloneShape(shape: Shape, offsetX = 0, offsetY = 0): Shape {
  // Deep copy via JSON serialization
  const clone = JSON.parse(JSON.stringify(shape));

  // Nieuwe unieke ID
  clone.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Offset toepassen
  return translateShape(clone, offsetX, offsetY);
}
```

**Let op**: `JSON.parse(JSON.stringify())` is simpel maar verliest functies en Date objecten. Voor een React Flow canvas met complexere node data kan `structuredClone()` beter zijn.

---

## 3. Selectie Systeem

### 3.1 SelectionApi

De selectie wordt beheerd via een dedicated API klasse die werkt met shape ID arrays:

```typescript
// src/api/selection.ts
class SelectionApi {
  constructor(private getState: () => AppState) {}

  get(): string[] {
    return [...this.getState().selectedShapeIds]; // Kopie, geen referentie
  }

  getEntities(): Shape[] {
    const state = this.getState();
    return state.selectedShapeIds
      .map(id => state.shapes.find(s => s.id === id))
      .filter(Boolean);
  }

  set(ids: string[]): void {
    this.getState().setSelectedShapeIds(ids);
  }

  add(ids: string[]): void {
    const current = new Set(this.getState().selectedShapeIds);
    ids.forEach(id => current.add(id));
    this.getState().setSelectedShapeIds([...current]);
  }

  remove(ids: string[]): void {
    const toRemove = new Set(ids);
    const remaining = this.getState().selectedShapeIds
      .filter(id => !toRemove.has(id));
    this.getState().setSelectedShapeIds(remaining);
  }

  clear(): void {
    this.getState().deselectAll();
  }

  all(): void {
    this.getState().selectAll();
  }

  filter(predicate: (shape: Shape) => boolean): Shape[] {
    return this.getEntities().filter(predicate);
  }

  count(): number {
    return this.getState().selectedShapeIds.length;
  }
}
```

**Toepasbaar patroon**: Set-gebaseerde selectie met `add`/`remove`/`set`/`clear`. Dit is direct toepasbaar op React Flow nodes.

### 3.2 Selectie Box (Rubber Band)

De selectie-box ondersteunt twee modes, net als AutoCAD:

```typescript
// src/engine/renderer/layers/SelectionLayer.ts
class SelectionLayer extends BaseRenderer {
  drawSelectionBox(box: SelectionBox): void {
    const ctx = this.ctx;
    ctx.resetTransform();

    // Normaliseer box dimensies
    const x = Math.min(box.start.x, box.end.x);
    const y = Math.min(box.start.y, box.end.y);
    const w = Math.abs(box.end.x - box.start.x);
    const h = Math.abs(box.end.y - box.start.y);

    if (box.mode === 'window') {
      // Window selectie: blauw, solid — alleen volledig omsloten shapes
      ctx.fillStyle = 'rgba(0, 120, 215, 0.1)';
      ctx.strokeStyle = 'rgba(0, 120, 215, 0.8)';
      ctx.setLineDash([]);
    } else {
      // Crossing selectie: groen, dashed — ook deels overlapte shapes
      ctx.fillStyle = 'rgba(0, 200, 0, 0.1)';
      ctx.strokeStyle = 'rgba(0, 200, 0, 0.8)';
      ctx.setLineDash([6, 3]);
    }

    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }
}
```

**Window vs Crossing**: Als je van links naar rechts sleept → window mode (blauw, solid). Van rechts naar links → crossing mode (groen, dashed). Dit is een standaard CAD-patroon.

### 3.3 Select All met Filters

```typescript
// selection/all command
handler: (context, params) => {
  const state = context.getState();
  const activeDrawing = state.activeDrawingId;

  const selectable = state.shapes.filter(shape => {
    // Moet in actieve drawing zijn
    if (shape.drawingId !== activeDrawing) return false;
    // Verborgen shapes uitsluiten
    if (shape.hidden) return false;
    // Gelocked shapes uitsluiten
    if (shape.locked) return false;
    // Optioneel filter op type
    if (params.type && shape.type !== params.type) return false;
    // Optioneel filter op layer
    if (params.layer && shape.layerId !== params.layer) return false;
    return true;
  });

  state.setSelectedShapeIds(selectable.map(s => s.id));
}
```

---

## 4. State Management

### 4.1 Zustand Store Architectuur

De app gebruikt een **gecombineerde Zustand store** met document-niveau state delegatie:

```typescript
// src/state/appStore.ts — Conceptueel model
interface AppState {
  // === Model State ===
  drawings: Drawing[];
  shapes: Shape[];
  layers: Layer[];

  // === View State ===
  viewport: { offsetX: number; offsetY: number; zoom: number };
  canvasWidth: number;
  canvasHeight: number;

  // === Tool State ===
  activeTool: ToolType;
  drawingPreview: Shape | null;
  currentStyle: ShapeStyle;

  // === Selection State ===
  selectedShapeIds: string[];
  selectionBox: SelectionBox | null;
  hoveredShapeId: string | null;

  // === History State ===
  historyStack: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // === Document Management ===
  activeDocumentId: string;
  projectName: string;
  isModified: boolean;
}
```

### 4.2 Per-Document State Isolatie

```typescript
// State bewaren bij document switch
function saveDocState(): void {
  const docStore = getActiveDocumentStore();
  const state = extractPerDocState(appStore.getState());
  docStore.setState(state);
}

// State herstellen bij terugswitch
function restoreDocState(): void {
  const docStore = getActiveDocumentStore();
  const savedState = docStore.getState();
  appStore.setState(savedState);
}

// Automatisch bij tab switch
function switchDocument(docId: string): void {
  saveDocState();             // Bewaar huidige document
  setActiveDocument(docId);   // Switch actief document
  restoreDocState();          // Herstel opgeslagen state
}
```

**Toepasbaar patroon**: Als Open-Agents meerdere canvas-tabs ondersteunt, is dit patroon waardevol: bewaar viewport, selectie en tool-state per canvas, herstel bij tab-switch.

### 4.3 Optimized Selectors (Hooks)

```typescript
// Voorkom onnodige re-renders door specifieke slices te subscriben
const useActiveDrawing = () => useAppStore(state => state.activeDrawing);
const useSelectedShapes = () => useAppStore(state => state.selectedShapeIds);
const useActiveTool = () => useAppStore(state => state.activeTool);
const useEditorMode = () => useAppStore(state => state.editorMode);
```

### 4.4 Command Bus Pattern

Alle state-mutaties gaan via een centraal command systeem:

```typescript
// src/api/commands/registry.ts
class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();

  register(def: CommandDefinition): void {
    const key = `${def.command}:${def.action}:${def.entity || ''}`;
    this.commands.set(key, def);
  }

  async execute(cmd: Command): Promise<CommandResponse> {
    const def = this.lookup(cmd);
    if (!def) throw new Error(`Unknown command: ${cmd.command}`);

    // Parameter validatie
    this.validateParams(def, cmd.params);

    // Optionele transaction wrapper
    const context = this.createContext();
    if (def.modifiesState) {
      context.transactions.begin();
    }

    try {
      const result = await def.handler(context, cmd.params);
      if (def.modifiesState) {
        context.transactions.commit();
      }
      return result;
    } catch (err) {
      if (def.modifiesState) {
        context.transactions.rollback();
      }
      throw err;
    }
  }
}

// Singleton
export const commandRegistry = new CommandRegistry();
```

**Voordelen van command bus**:
- Elke operatie is serialiseerbaar → undo/redo, macro's, network sync
- Commands kunnen via MCP tools worden blootgesteld
- Parameter validatie op één plek
- Transaction support (batch meerdere operaties)

---

## 5. Keyboard & Shortcuts

### 5.1 Twee-Toets Commando Systeem

Open-2d-studio gebruikt een CAD-achtig twee-toets systeem (vergelijkbaar met AutoCAD aliassen):

```typescript
// src/components/canvas/ShortcutHUD.tsx
const TWO_KEY_LABELS: Record<string, string> = {
  // Selectie & Modificatie
  'md': 'Select',
  'mv': 'Move',
  'co': 'Copy',
  'cc': 'Copy 2',
  'ro': 'Rotate',
  'mm': 'Mirror',
  're': 'Scale',
  'tr': 'Trim',
  'ex': 'Extend',
  'of': 'Offset',
  'fl': 'Fillet',
  'al': 'Align',
  'ay': 'Array',
  'cs': 'Create Similar',

  // Tekenen
  'li': 'Line',
  'rc': 'Rectangle',
  'ci': 'Circle',
  'ar': 'Arc',
  'pl': 'Polyline',
  'el': 'Ellipse',
  'sp': 'Spline',
  'tx': 'Text',

  // Annotaties
  'le': 'Leader',
  'di': 'Dimension',
  'dl': 'Dim Linear',
  'da': 'Dim Angular',
  'dr': 'Dim Radius',
  'dd': 'Dim Diameter',

  // Constructie
  'be': 'Beam',
  'wa': 'Wall',
  'sl': 'Slab',
  'gl': 'Gridline',
  'pi': 'Pile',
  'lv': 'Level',

  // View
  'za': 'Zoom All',
  'tl': 'Thin Lines',
};
```

### 5.2 Shortcut HUD Configuratie

```typescript
// Shortcut timing configuratie
const SHORTCUT_CONFIG = {
  fadeDuration: 2000,       // 2s fade na inactiviteit
  maxVisible: 6,            // Max 6 items tegelijk tonen
  comboWindow: 750,         // 750ms window voor twee-toets combo
  showOnlyInDrawingMode: true
};
```

### 5.3 Speciale Toetsen

```typescript
const SPECIAL_KEYS = {
  'Space':     '␣',    // Bevestig / volgende stap
  'Escape':    'Esc',  // Cancel huidige operatie
  'Enter':     '↵',    // Bevestig invoer
  'Backspace': '⌫',    // Verwijder laatste punt
  'Delete':    'Del',  // Verwijder selectie
  'Tab':       '⇥',    // Cycle opties
  'ArrowUp':   '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight':'→',
};
```

**Toepasbaar patroon**: Een twee-toets systeem is krachtiger dan single-key shortcuts voor applicaties met veel commando's. De 750ms combo window geeft gebruikers tijd om de tweede toets te drukken.

---

## 6. Undo/Redo

### 6.1 History Stack

De undo/redo werkt via een history stack in de Zustand store:

```typescript
// Conceptueel model uit appStore
interface HistoryState {
  historyStack: HistoryEntry[];  // Alle states
  historyIndex: number;          // Huidige positie
  maxHistorySize: number;        // Limiet (voorkomt memory issues)

  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

### 6.2 History Command Handlers

```typescript
// src/api/commands/handlers/history.ts
const historyCommands = [
  {
    command: 'history',
    action: 'undo',
    handler: (context) => {
      context.getState().undo();
      context.events.emit('undo');
      return { success: true };
    }
  },
  {
    command: 'history',
    action: 'redo',
    handler: (context) => {
      context.getState().redo();
      context.events.emit('redo');
      return { success: true };
    }
  },
  {
    command: 'history',
    action: 'getState',
    handler: (context) => {
      const state = context.getState();
      return {
        success: true,
        data: {
          canUndo: state.canUndo(),
          canRedo: state.canRedo(),
          stackSize: state.historyStack.length,
          currentIndex: state.historyIndex,
        }
      };
    }
  }
];
```

### 6.3 Transaction Manager

Transacties groeperen meerdere state-wijzigingen tot één undo-stap:

```typescript
// src/api/transactions.ts
class TransactionManager {
  private active = false;
  private startIndex = 0;

  begin(): void {
    this.active = true;
    this.startIndex = this.getState().historyIndex;
    this.getState().renderSuppressed = true; // Geen renders tijdens batch
  }

  commit(): void {
    // Collapse alle entries sinds begin tot één entry
    this.getState().collapseEntries(this.startIndex);
    this.getState().renderSuppressed = false;
    this.active = false;
  }

  rollback(): void {
    // Undo alles terug naar startIndex
    while (this.getState().historyIndex > this.startIndex) {
      this.getState().undo();
    }
    this.getState().renderSuppressed = false;
    this.active = false;
  }

  // Convenience: wrap een functie in een transaction
  run<T>(fn: () => T): T {
    this.begin();
    try {
      const result = fn();
      this.commit();
      return result;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }
}
```

**Toepasbaar patroon**: `collapseEntries()` is slim — bij een "move 10 elementen" operatie worden 10 individuele state changes samengevoegd tot 1 undo-stap. Essentieel voor goede UX.

---

## 7. Coördinaten & Transforms

### 7.1 Viewport (Screen ↔ World)

```typescript
// src/api/viewport.ts
class ViewportApi {
  // Screen → World: aftrekken offset, delen door zoom
  screenToWorld(screenX: number, screenY: number): IPoint {
    const { offsetX, offsetY, zoom } = this.getState().viewport;
    return {
      x: (screenX - offsetX) / zoom,
      y: (screenY - offsetY) / zoom,
    };
  }

  // World → Screen: vermenigvuldigen met zoom, optellen offset
  worldToScreen(worldX: number, worldY: number): IPoint {
    const { offsetX, offsetY, zoom } = this.getState().viewport;
    return {
      x: worldX * zoom + offsetX,
      y: worldY * zoom + offsetY,
    };
  }

  // Pan: verschuif viewport
  pan(dx: number, dy: number): void {
    const state = this.getState();
    state.setViewport({
      offsetX: state.viewport.offsetX + dx,
      offsetY: state.viewport.offsetY + dy,
    });
  }

  // Zoom met factor
  zoomIn(): void { this.setZoom(this.getState().viewport.zoom * 1.2); }
  zoomOut(): void { this.setZoom(this.getState().viewport.zoom / 1.2); }

  // Zoom to fit: bereken optimale zoom om alle content te tonen
  zoomToFit(): void {
    const bounds = this.calculateContentBounds();
    const { canvasWidth, canvasHeight } = this.getState();
    const padding = 50;

    const scaleX = (canvasWidth - 2 * padding) / bounds.width;
    const scaleY = (canvasHeight - 2 * padding) / bounds.height;
    const zoom = Math.min(scaleX, scaleY);

    this.setZoom(zoom);
    // Center content
    this.pan(
      canvasWidth / 2 - bounds.centerX * zoom,
      canvasHeight / 2 - bounds.centerY * zoom
    );
  }

  // Zoom to specifieke entities
  zoomToEntities(ids: string[]): void {
    const shapes = ids.map(id => this.findShape(id)).filter(Boolean);
    const bounds = getShapesBounds(shapes);
    // ... zoom en pan naar bounds met padding
  }
}
```

### 7.2 Shape Bounds Berekening

```typescript
// Bounds per shape type (uit viewport.ts handlers)
function getShapeBounds(shape: Shape): BoundingBox {
  switch (shape.type) {
    case 'line':
      return {
        minX: Math.min(shape.start.x, shape.end.x),
        minY: Math.min(shape.start.y, shape.end.y),
        maxX: Math.max(shape.start.x, shape.end.x),
        maxY: Math.max(shape.start.y, shape.end.y),
      };
    case 'rectangle':
      return {
        minX: shape.topLeft.x,
        minY: shape.topLeft.y,
        maxX: shape.topLeft.x + shape.width,
        maxY: shape.topLeft.y + shape.height,
      };
    case 'circle':
      return {
        minX: shape.center.x - shape.radius,
        minY: shape.center.y - shape.radius,
        maxX: shape.center.x + shape.radius,
        maxY: shape.center.y + shape.radius,
      };
    case 'polyline':
    case 'spline':
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
      return {
        minX: Math.min(...xs), minY: Math.min(...ys),
        maxX: Math.max(...xs), maxY: Math.max(...ys),
      };
    // ... arc, ellipse, text, dimension, block-instance
  }
}

function getShapesBounds(shapes: Shape[]): BoundingBox {
  const allBounds = shapes.map(getShapeBounds);
  return {
    minX: Math.min(...allBounds.map(b => b.minX)),
    minY: Math.min(...allBounds.map(b => b.minY)),
    maxX: Math.max(...allBounds.map(b => b.maxX)),
    maxY: Math.max(...allBounds.map(b => b.maxY)),
  };
}
```

### 7.3 Rotatie & Scaling

```typescript
// 2D rotatie matrix
function rotatePoint(point: IPoint, center: IPoint, angle: number): IPoint {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

// Scaling vanuit een center punt
function scaleShape(shape: Shape, center: IPoint, factor: number): Shape {
  // Minimum factor validatie
  factor = Math.max(factor, 0.01);

  const scaled = { ...shape };
  // Schaal positie relatief aan center
  // Schaal dimensies (width, height, radius)
  // Conditioneel: schaal font size alleen voor model text
  return scaled;
}

// Mirror over een lijn
function mirrorShape(shape: Shape, lineStart: IPoint, lineEnd: IPoint): Shape {
  // Bereken projectie op spiegel-lijn
  // Spiegel punt: x: 2 * projX - point.x, y: 2 * projY - point.y
  // Speciale handling voor arc angles (omkeren)
}
```

### 7.4 Point Utilities

```typescript
// src/engine/geometry/Point.ts
class Point implements IPoint {
  constructor(public x: number, public y: number) {}

  distanceTo(other: IPoint): number {
    return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2);
  }

  angleTo(other: IPoint): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  rotate(center: IPoint, angle: number): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = this.x - center.x;
    const dy = this.y - center.y;
    return new Point(
      center.x + dx * cos - dy * sin,
      center.y + dx * sin + dy * cos
    );
  }

  lerp(other: IPoint, t: number): Point {
    return new Point(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  normalize(): Point {
    const len = this.length();
    if (len === 0) return new Point(0, 0);
    return new Point(this.x / len, this.y / len);
  }

  dot(other: IPoint): number { return this.x * other.x + this.y * other.y; }
  cross(other: IPoint): number { return this.x * other.y - this.y * other.x; }
  length(): number { return Math.sqrt(this.x ** 2 + this.y ** 2); }
}

// Static utility versie voor plain objects
const PointUtils = {
  distance: (a: IPoint, b: IPoint) => Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2),
  angle: (a: IPoint, b: IPoint) => Math.atan2(b.y-a.y, b.x-a.x),
  add: (a: IPoint, b: IPoint) => ({ x: a.x+b.x, y: a.y+b.y }),
  subtract: (a: IPoint, b: IPoint) => ({ x: a.x-b.x, y: a.y-b.y }),
  lerp: (a: IPoint, b: IPoint, t: number) => ({
    x: a.x + (b.x-a.x) * t,
    y: a.y + (b.y-a.y) * t,
  }),
  fromPolar: (angle: number, distance: number) => ({
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  }),
};
```

### 7.5 Snap Systeem

Het snap systeem is een van de meest uitgebreide onderdelen:

```typescript
// src/engine/geometry/SnapUtils.ts

// Snap types
type SnapType =
  | 'endpoint'       // Hoekpunten van shapes
  | 'midpoint'       // Midden van edges
  | 'center'         // Centrum (cirkels, rechthoeken)
  | 'nearest'        // Dichtstbijzijnde punt op geometrie
  | 'perpendicular'  // Loodrecht op lijn
  | 'tangent'        // Raakpunt aan cirkel
  | 'intersection'   // Kruispunt van shapes
  | 'origin'         // Oorsprong (0,0)
  | 'grid';          // Grid snap

// Hoofdfunctie: vind dichtstbijzijnde snap punt
function findNearestSnapPoint(
  cursor: IPoint,
  shapes: Shape[],
  tolerance: number,
  enabledTypes: SnapType[],
  gridSize: number
): SnapResult | null {
  const candidates: SnapCandidate[] = [];

  // 1. Grid & origin snaps
  if (enabledTypes.includes('grid')) {
    candidates.push({
      point: {
        x: Math.round(cursor.x / gridSize) * gridSize,
        y: Math.round(cursor.y / gridSize) * gridSize,
      },
      type: 'grid',
      distance: 0, // berekend later
    });
  }

  // 2. Shape snap points
  for (const shape of shapes) {
    candidates.push(...getShapeSnapPoints(shape, cursor, enabledTypes));
  }

  // 3. Intersecties tussen shapes
  if (enabledTypes.includes('intersection')) {
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const inter = findShapeIntersections(shapes[i], shapes[j]);
        candidates.push(...inter.map(p => ({ point: p, type: 'intersection' })));
      }
    }
  }

  // Filter op tolerance afstand
  const withinTolerance = candidates
    .map(c => ({ ...c, distance: PointUtils.distance(cursor, c.point) }))
    .filter(c => c.distance <= tolerance)
    .sort((a, b) => {
      // Prioriteit: endpoint > midpoint > center > grid
      if (a.type !== b.type) return snapPriority(a.type) - snapPriority(b.type);
      return a.distance - b.distance;
    });

  return withinTolerance[0] || null;
}

// Visuele snap indicatoren
function getSnapSymbol(type: SnapType): string {
  const symbols = {
    endpoint: '□',
    midpoint: '△',
    center: '○',
    intersection: '×',
    perpendicular: '⊥',
    tangent: '◎',
    nearest: '◇',
    grid: '·',
    origin: '⊕',
  };
  return symbols[type];
}
```

### 7.6 Tracking Systeem (Polar, Ortho, Object)

```typescript
// src/engine/geometry/Tracking.ts

// Polar tracking: lijnen op vaste hoeken vanaf basispunt
function findPolarTrackingLines(
  basePoint: IPoint,
  angleIncrement: number  // 15°, 30°, 45°, of 90°
): TrackingLine[] {
  const lines = [];
  for (let angle = 0; angle < 360; angle += angleIncrement) {
    const rad = angle * Math.PI / 180;
    lines.push({
      origin: basePoint,
      direction: { x: Math.cos(rad), y: Math.sin(rad) },
      angle,
      type: 'polar',
    });
  }
  return lines;
}

// Ortho mode: beperkt tot 0°, 90°, 180°, 270°
function applyOrthoConstraint(basePoint: IPoint, cursor: IPoint): IPoint {
  const dx = Math.abs(cursor.x - basePoint.x);
  const dy = Math.abs(cursor.y - basePoint.y);
  if (dx > dy) {
    return { x: cursor.x, y: basePoint.y }; // Horizontaal
  } else {
    return { x: basePoint.x, y: cursor.y }; // Verticaal
  }
}

// Object tracking: lijn uitbreidingen van bestaande shapes
function findObjectTrackingLines(
  shapes: Shape[],
  cursor: IPoint
): TrackingLine[] {
  // Vindt parallel, loodrecht, en verlengingslijnen
  // van bestaande lijnen en balken
}
```

### 7.7 Adaptieve Grid Rendering

```typescript
// src/engine/renderer/layers/GridLayer.ts
class GridLayer extends BaseRenderer {
  drawGrid(viewport: Viewport, gridSize: number): void {
    // Adaptieve schaling: pas grid spacing aan op zoom
    let adjustedGridSize = gridSize;
    const pixelSpacing = adjustedGridSize * viewport.zoom;

    // Houd spacing tussen 10-100 pixels
    while (pixelSpacing < 10) adjustedGridSize *= 5;
    while (pixelSpacing > 100) adjustedGridSize /= 5;

    // Minor grid
    this.drawGridLines(adjustedGridSize, 'rgba(50,50,50,0.3)');

    // Major grid (5× minor)
    this.drawGridLines(adjustedGridSize * 5, 'rgba(50,50,50,0.6)');

    // Assen
    this.drawAxis('x', COLORS.axisX); // Rood
    this.drawAxis('y', COLORS.axisY); // Groen
  }

  drawOriginMarker(): void {
    // Altijd zichtbaar kruisje op (0,0)
    // Zoom-compensatie: maat = pixels / zoom
    const size = 10 / viewport.zoom;
    // Horizontale + verticale tick + cirkel
  }
}
```

**Key insight**: Lijndikte schaalt mee als `1 / viewport.zoom` zodat grid lines altijd even dik lijken ongeacht zoom niveau.

---

## 8. Toepasbare Patronen voor Open-Agents Canvas

### 8.1 Command Bus → React Flow Actions

**Patroon**: Wrap alle canvas-mutaties in serialiseerbare commands.

```typescript
// Toepassing in React Flow context
interface CanvasCommand {
  type: 'node/move' | 'node/add' | 'node/delete' | 'edge/add' | 'edge/delete';
  params: Record<string, unknown>;
  timestamp: number;
}

class CanvasCommandBus {
  private history: CanvasCommand[] = [];
  private index = -1;

  execute(cmd: CanvasCommand): void {
    // Verwijder toekomstige entries (na undo)
    this.history = this.history.slice(0, this.index + 1);
    this.history.push(cmd);
    this.index++;
    this.apply(cmd);
  }

  undo(): void {
    if (this.index >= 0) {
      this.reverseApply(this.history[this.index]);
      this.index--;
    }
  }

  redo(): void {
    if (this.index < this.history.length - 1) {
      this.index++;
      this.apply(this.history[this.index]);
    }
  }
}
```

### 8.2 Transaction Pattern → Batch Node Updates

```typescript
// Groepeer meerdere node updates tot 1 undo stap
function moveSelectedNodes(nodeIds: string[], dx: number, dy: number) {
  const transaction = commandBus.beginTransaction();
  try {
    nodeIds.forEach(id => {
      commandBus.execute({
        type: 'node/move',
        params: { id, dx, dy },
      });
    });
    transaction.commit(); // 1 undo stap voor hele batch
  } catch {
    transaction.rollback();
  }
}
```

### 8.3 Selection API Pattern → React Flow Multi-Select

```typescript
// Direct toepasbaar met React Flow's useReactFlow
import { useReactFlow } from '@xyflow/react';

class CanvasSelectionApi {
  constructor(private reactFlow: ReturnType<typeof useReactFlow>) {}

  get(): string[] {
    return this.reactFlow.getNodes()
      .filter(n => n.selected)
      .map(n => n.id);
  }

  set(ids: string[]): void {
    const idSet = new Set(ids);
    this.reactFlow.setNodes(nodes =>
      nodes.map(n => ({ ...n, selected: idSet.has(n.id) }))
    );
  }

  add(ids: string[]): void {
    const idSet = new Set(ids);
    this.reactFlow.setNodes(nodes =>
      nodes.map(n => ({ ...n, selected: n.selected || idSet.has(n.id) }))
    );
  }

  clear(): void {
    this.reactFlow.setNodes(nodes =>
      nodes.map(n => ({ ...n, selected: false }))
    );
  }
}
```

### 8.4 Snap-to-Grid → React Flow Snapping

```typescript
// React Flow heeft ingebouwde snap, maar we kunnen het uitbreiden
import { ReactFlow } from '@xyflow/react';

// Basis snap
<ReactFlow snapToGrid snapGrid={[20, 20]} />

// Geavanceerde snap (à la open-2d-studio)
function smartSnap(position: XYPosition, nodes: Node[]): XYPosition {
  const gridSnap = {
    x: Math.round(position.x / 20) * 20,
    y: Math.round(position.y / 20) * 20,
  };

  // Check alignment met andere nodes
  const THRESHOLD = 10;
  for (const node of nodes) {
    // Horizontale uitlijning
    if (Math.abs(position.y - node.position.y) < THRESHOLD) {
      gridSnap.y = node.position.y;
    }
    // Verticale uitlijning
    if (Math.abs(position.x - node.position.x) < THRESHOLD) {
      gridSnap.x = node.position.x;
    }
  }

  return gridSnap;
}
```

### 8.5 Zoom-to-Fit → React Flow fitView

```typescript
// React Flow heeft fitView, maar zoom-to-selection is handmatig
import { useReactFlow } from '@xyflow/react';

function useZoomToSelection() {
  const { fitView, getNodes } = useReactFlow();

  return () => {
    const selected = getNodes().filter(n => n.selected);
    if (selected.length === 0) {
      fitView({ padding: 0.2 }); // Zoom naar alles
    } else {
      fitView({
        nodes: selected,
        padding: 0.5,
        duration: 300, // Smooth animatie
      });
    }
  };
}
```

### 8.6 Keyboard Shortcuts Pattern

```typescript
// Twee-toets systeem vertaald naar React
function useCanvasShortcuts(commands: Record<string, () => void>) {
  const bufferRef = useRef('');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      bufferRef.current += e.key.toLowerCase();
      clearTimeout(timerRef.current);

      // Check of buffer een command matcht
      const cmd = commands[bufferRef.current];
      if (cmd) {
        cmd();
        bufferRef.current = '';
        return;
      }

      // Reset na 750ms inactiviteit
      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, 750);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commands]);
}

// Gebruik
useCanvasShortcuts({
  'za': () => fitView(),
  'mv': () => setTool('move'),
  'co': () => copySelection(),
  'dd': () => deleteSelection(),
});
```

### 8.7 Per-Document State Pattern

```typescript
// Multi-tab canvas state in Zustand
interface CanvasTabStore {
  tabs: Record<string, TabState>;
  activeTabId: string;

  switchTab(tabId: string): void;
  getActiveState(): TabState;
}

interface TabState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedIds: string[];
  history: HistoryEntry[];
}

const useCanvasTabStore = create<CanvasTabStore>((set, get) => ({
  tabs: {},
  activeTabId: '',

  switchTab(tabId) {
    const current = get().activeTabId;
    // Bewaar huidige viewport & selectie
    set(state => ({
      tabs: {
        ...state.tabs,
        [current]: {
          ...state.tabs[current],
          viewport: getCurrentViewport(),
          selectedIds: getSelectedIds(),
        },
      },
      activeTabId: tabId,
    }));
    // Herstel opgeslagen state
    restoreTabState(get().tabs[tabId]);
  },
}));
```

---

## 9. Concrete Code Snippets om Over te Nemen

### 9.1 Canvas Resize Observer

```typescript
// Uit Canvas.tsx — responsive canvas sizing
function useCanvasResize(canvasRef: RefObject<HTMLCanvasElement>) {
  const setCanvasSize = useAppStore(s => s.setCanvasSize);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize(width, height);
      // Trigger re-render
      requestAnimationFrame(() => renderer.resize(width, height));
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
}
```

### 9.2 RAF Render Loop met Dirty Flag

```typescript
// Efficiënte render loop — alleen renderen als er iets veranderd is
function useRenderLoop(renderer: CADRenderer, getState: () => AppState) {
  const dirtyRef = useRef(true);

  useEffect(() => {
    let rafId: number;

    const loop = () => {
      if (dirtyRef.current) {
        const state = getState();
        renderer.render({
          shapes: state.shapes,
          viewport: state.viewport,
          selectedIds: state.selectedShapeIds,
          selectionBox: state.selectionBox,
          grid: state.gridVisible,
          // ...
        });
        dirtyRef.current = false;
      }
      rafId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Mark dirty bij state changes
  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);
  return markDirty;
}
```

### 9.3 Screen-to-World Coordinate Helper

```typescript
// Herbruikbare coordinate conversie hook
function useCoordinateTransform() {
  const viewport = useAppStore(s => s.viewport);

  return useMemo(() => ({
    screenToWorld: (screenX: number, screenY: number) => ({
      x: (screenX - viewport.offsetX) / viewport.zoom,
      y: (screenY - viewport.offsetY) / viewport.zoom,
    }),
    worldToScreen: (worldX: number, worldY: number) => ({
      x: worldX * viewport.zoom + viewport.offsetX,
      y: worldY * viewport.zoom + viewport.offsetY,
    }),
  }), [viewport]);
}
```

### 9.4 DPR-Aware Canvas Setup

```typescript
// High-DPI canvas rendering
function setupHiDPICanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}
```

### 9.5 ID Generator

```typescript
// Simpele maar effectieve unieke ID generatie
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
// Output: "1709913600000-k3x7m2p4q"
```

### 9.6 Bounds Utility voor React Flow Nodes

```typescript
// Vertaald van getShapesBounds naar React Flow nodes
function getNodesBounds(nodes: Node[]): { x: number; y: number; width: number; height: number } {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + (node.width || 150));
    maxY = Math.max(maxY, node.position.y + (node.height || 50));
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
```

---

## Samenvatting Key Takeaways

| Aspect | open-2d-studio Aanpak | Toepassing Open-Agents |
|--------|----------------------|----------------------|
| **State** | Zustand + per-document stores | Zustand + per-canvas-tab stores |
| **Commands** | Command bus + registry | Serialiseerbare actions voor undo/redo |
| **Selectie** | Set-gebaseerde ID selectie | React Flow `selected` property |
| **Viewport** | `screenToWorld` / `worldToScreen` | React Flow `screenToFlowPosition` |
| **Snap** | Multi-type met prioriteit | React Flow `snapToGrid` + custom alignment |
| **Undo/Redo** | History stack + transactions | Command history met collapse |
| **Shortcuts** | Twee-toets combo systeem | Adapteerbaar als keyboard hook |
| **Rendering** | RAF + dirty flag | React Flow handles dit automatisch |
| **Multi-doc** | Save/restore per document | Per-tab state isolatie |
