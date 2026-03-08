# Open PDF Studio — Diepte Analyse voor Open-Agents

> **Repository:** https://github.com/OpenAEC-Foundation/open-pdf-studio
> **Datum analyse:** 2026-03-08
> **Doel:** Herbruikbare patronen en inzichten voor Open-Agents (Tauri desktop app)

---

## Inhoudsopgave

1. [Project Overzicht](#1-project-overzicht)
2. [Repository Structuur](#2-repository-structuur)
3. [Tauri Configuratie (tauri.conf.json)](#3-tauri-configuratie)
4. [Rust Backend — Commands & Architectuur](#4-rust-backend)
5. [Frontend Architectuur — SolidJS + Vite](#5-frontend-architectuur)
6. [State Management Patroon](#6-state-management)
7. [Preferences Systeem — Dual Storage](#7-preferences-systeem)
8. [Undo/Redo Manager](#8-undoredo-manager)
9. [Platform Abstractie Layer](#9-platform-abstractie-layer)
10. [Session Management](#10-session-management)
11. [CI/CD Pipeline — Multi-Platform Builds](#11-cicd-pipeline)
12. [NSIS Windows Installer — Custom Hooks](#12-nsis-windows-installer)
13. [Android Build](#13-android-build)
14. [Linux Snap Distributie](#14-linux-snap-distributie)
15. [Auto-Updater](#15-auto-updater)
16. [Security & CSP](#16-security--csp)
17. [Initialisatie Sequentie — main.js](#17-initialisatie-sequentie)
18. [Open Issues — Wat werkt nog niet](#18-open-issues)
19. [Samenvatting: Top 10 Patronen voor Open-Agents](#19-samenvatting-top-10)

---

## 1. Project Overzicht

Open PDF Studio is een **gratis, open-source PDF-editor** voor Windows, macOS, Linux en Android. Het gebruikt:

- **Tauri 2** als desktop framework (Rust backend)
- **SolidJS** voor UI (geen React, geen Vue)
- **Vite** als build tool
- **PDF.js** voor rendering
- **pdf-lib** voor PDF-manipulatie
- **i18next** voor 39 talen inclusief RTL (Arabisch, Hebreeuws, Farsi, Urdu)

**Versie:** 1.23.0
**Licentie:** LGPL-3.0
**Identifier:** `org.openaec.openpdfstudio`

**Opvallend:** Professionele tools (metingen, stempels, watermerken, redactie) die concurrenten apart verkopen, hier gratis inbegrepen.

→ **Wij kunnen dit gebruiken door:** Open-Agents te positioneren als de "pro tools gratis" van agent orchestration — alle features die andere platforms achter betaalmuren stoppen, standaard beschikbaar.

---

## 2. Repository Structuur

```
open-pdf-studio/                    ← root repo
├── .github/
│   └── workflows/
│       ├── ci.yml                  ← multi-platform CI
│       ├── release.yml             ← release + signing
│       └── snap.yml                ← Linux Snap Store
├── android-apk/                    ← compiled APK output
├── docs/                           ← screenshots
├── open-pdf-studio/                ← ECHTE app code (subdirectory!)
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs             ← 177 bytes, delegeert naar lib.rs
│   │   │   └── lib.rs              ← 21KB, alle Rust commands
│   │   ├── nsis/
│   │   │   ├── installer.nsi       ← 31KB custom NSIS installer
│   │   │   ├── hooks.nsh           ← 6KB installer hooks
│   │   │   ├── install-printer.ps1
│   │   │   └── uninstall-printer.ps1
│   │   ├── icons/
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── js/
│   │   ├── core/
│   │   │   ├── constants.js        ← handle types + default preferences
│   │   │   ├── platform.js         ← Tauri API wrapper (8KB)
│   │   │   ├── preferences.js      ← dual-storage preferences (11KB)
│   │   │   ├── state.js            ← global mutable state (13KB)
│   │   │   └── undo-manager.js     ← command pattern undo (19KB)
│   │   ├── stores/
│   │   │   ├── places.js           ← recent files/places
│   │   │   └── sessions.js         ← opgeslagen sessies
│   │   ├── annotations/
│   │   ├── pdf/
│   │   ├── solid/                  ← SolidJS components
│   │   ├── ui/
│   │   ├── utils/
│   │   │   ├── colors.js
│   │   │   ├── fonts.js
│   │   │   ├── helpers.js
│   │   │   └── math.js
│   │   ├── search/
│   │   ├── text/
│   │   ├── tools/
│   │   ├── watermark/
│   │   ├── mobile/
│   │   ├── i18n/
│   │   └── main.js                 ← app entry point (11KB)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── snap/
└── README.md
```

**Slimme keuze:** De app code zit in een subdirectory `open-pdf-studio/` binnen de repo. Dit maakt het mogelijk om meerdere packages of platforms naast elkaar te hebben (bijv. `android-apk/`, `snap/`).

→ **Wij kunnen dit gebruiken door:** Open-Agents ook te structureren met de Tauri app in een subdirectory, zodat tooling scripts en platform-specifieke builds in de root leven.

---

## 3. Tauri Configuratie

**Bestand:** `open-pdf-studio/src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Open PDF Studio",
  "version": "1.23.0",
  "identifier": "org.openaec.openpdfstudio",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3041",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Open PDF Studio",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": false,
        "transparent": false,
        "visible": false,
        "backgroundColor": "#f5f5f5",
        "devtools": true
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

### Kritische instellingen uitgelegd:

**`withGlobalTauri: true`**
Maakt `window.__TAURI__` globaal beschikbaar zonder ES module imports. Dit is de Tauri 2 aanpak voor apps die geen bundler-integratie willen — je krijgt alle Tauri APIs als globaal object. Handig voor legacy-achtige JS zonder import statements.

**`visible: false`**
Het venster start onzichtbaar. In `main.js` wordt het pas zichtbaar gemaakt nà de eerste render. Dit elimineert de "flash of blank window" die je anders ziet bij Tauri apps.

**`decorations: false`**
Geen native titelbalk — de app tekent zijn eigen. Geeft maximale controle over het uiterlijk.

**`devtools: true`**
DevTools altijd ingeschakeld, ook in production builds. Niet ideaal voor security maar handig voor support.

**`backgroundColor: "#f5f5f5"`**
Achtergrondkleur matcht de CSS, voorkomt witte flits bij laden.

### Bundle configuratie:

```json
"bundle": {
  "active": true,
  "targets": ["nsis", "dmg", "deb", "appimage"],
  "createUpdaterArtifacts": "v1Compatible",
  "fileAssociations": [
    {
      "ext": ["pdf"],
      "name": "PDF Document",
      "role": "Editor"
    }
  ],
  "windows": {
    "nsis": {
      "template": "./nsis/installer.nsi",
      "installerHooks": "./nsis/hooks.nsh",
      "installMode": "perMachine"
    }
  }
}
```

**`createUpdaterArtifacts: "v1Compatible"`** — genereert update-artefacten in het oude Tauri v1 formaat voor backwards compatibility met bestaande update-endpoints.

**`fileAssociations`** — registreert `.pdf` files bij het OS, zodat dubbelklikken de app opent.

**Custom NSIS template** — vervangt Tauri's standaard NSIS installer volledig met een custom 31KB script dat extra features toevoegt (printer, file associations, desktop shortcut).

### Plugins configuratie:

```json
"plugins": {
  "fs": { "requireLiteralLeadingDot": false },
  "shell": { "open": true },
  "updater": {
    "endpoints": ["https://github.com/.../releases/latest/download/latest.json"],
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6..."
  },
  "deep-link": {
    "mobile": [{ "host": "open", "pathPrefix": ["/"] }],
    "desktop": { "schemes": ["openpdfstudio"] }
  }
}
```

→ **Wij kunnen dit gebruiken door:** Open-Agents dezelfde pattern te geven: `visible: false` + show-after-paint, `decorations: false` voor custom titlebar, en `withGlobalTauri: true` voor eenvoudige API toegang. File associations voor `.agent` of `.oa` files. Deep-link schema `openagents://` voor externe integraties.

---

## 4. Rust Backend

**Bestand:** `open-pdf-studio/src-tauri/src/lib.rs` (21KB)
**Architectuur:** Monolithisch lib.rs (geen commands/ subdirectory)

### State structs:

```rust
// Beheer bestanden geopend via command-line argumenten
struct OpenedFiles(Mutex<Vec<String>>);

// File locks om concurrent writes te voorkomen
struct LockedFiles(Mutex<HashMap<String, File>>);
```

### ~25 geregistreerde Tauri commands (categorieën):

**Bestanden:**
- `read_file`, `write_file`, `delete_file`
- `file_exists`, `read_binary_file`, `write_binary_file`
- `list_pdfs_in_directory`
- `download_pdf_from_url`

**Sessie & Voorkeuren:**
- `save_session`, `load_session`
- `save_preferences_file`, `load_preferences_file`

**Systeeminfo:**
- `get_username` (via `whoami` crate)
- `get_temp_dir`
- `is_dev_mode`
- `get_app_version`

**Platform integratie:**
- `open_url`
- `is_default_pdf_handler`
- `open_default_apps_settings`

**Printer management (Windows-specifiek):**
- `get_printers` (via PowerShell)
- `print_pdf`
- `install_virtual_printer` (UAC elevation)
- `show_printer_properties`

**File locking:**
- Platform-specifieke implementaties:
  - Windows: `FILE_SHARE_READ` flag
  - Unix: `flock()` advisory locking

### Slimme patterns:

**UAC-elevatie via PowerShell:**
```rust
// Tijdelijk script schrijven + uitvoeren met elevated privileges
// Error output naar log file voor debugging
fn run_powershell_elevated(script: &str) -> Result<(), String> {
    let temp_script = write_temp_script(script)?;
    Command::new("powershell")
        .args(["-ExecutionPolicy", "Bypass", "-File", &temp_script])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

**Dual data persistence:**
Preferences en sessions worden opgeslagen in het Tauri `appLocalDataDir` — dit overleeft WebView2 cache clears (wat localStorage niet doet op Windows).

→ **Wij kunnen dit gebruiken door:** Open-Agents' agent workspaces en configuratie ook in `appLocalDataDir` op te slaan (niet in localStorage). File locking patroon overnemen voor agent output files die gelijktijdig gelezen/geschreven worden. De UAC-elevatie pattern voor eventuele Windows service installatie.

---

## 5. Frontend Architectuur

### Tech Stack:
- **SolidJS** — reactief framework (geen React, geen Virtual DOM)
- **Vite** — build tool
- **Geen TypeScript** — puur JavaScript
- **Geen CSS framework** — custom CSS

### Vite configuratie:

```javascript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [solidPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)  // versie beschikbaar als globale const
  },
  server: {
    port: 3041,
    strictPort: true,          // faal als port bezet is
    host: '0.0.0.0',           // alle interfaces (nodig voor Tauri dev)
    watch: {
      ignored: ['**/src-tauri/**']  // Rust files niet watchen
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost'         // expliciete WebSocket config voor HMR
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 6000  // 6MB limit (groot vanwege PDF.js)
  }
});
```

**Slimme patterns:**
- `strictPort: true` — duidelijke fout als port al in gebruik
- Tauri source files expliciet uitgesloten van file watcher
- `__APP_VERSION__` globale const voorkomt aparte version-fetch
- Hoge chunk size limit voor grote bibliotheken

### index.html — Theme flash preventie:

```html
<script>
  // Sync theme laden VOOR render om flash te voorkomen
  try {
    const prefs = JSON.parse(localStorage.getItem('pdfEditorPreferences') || '{}');
    let theme = prefs.theme || 'system';
    if (theme === 'system') {
      if (window.__TAURI__?.window) {
        theme = await window.__TAURI__.window.getCurrentWindow().theme();
      } else {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
</script>
<div id="app-root"></div>
<script type="module" src="js/main.js"></script>
```

→ **Wij kunnen dit gebruiken door:** Open-Agents dezelfde Vite config te geven. Hetzelfde theme-flash-preventie patroon in index.html toe te passen. `__APP_VERSION__` definitie overnemen voor versie weergave.

---

## 6. State Management

**Bestand:** `js/core/state.js` (13KB)
**Library:** SolidJS `createMutable`

### Architectuur:

```javascript
import { createMutable } from 'solid-js/store';

// Per-document state factory
function createDocument(filePath) {
  return {
    filePath,
    fileName: basename(filePath),
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    rotation: 0,
    annotations: [],
    undoStack: [],
    redoStack: [],
    modified: false,
    pdfDoc: null,           // pdf-lib PDFDocument
    pdfJsDoc: null,         // PDF.js document
    // ... meer velden
  };
}

// Globale mutable state
export const state = createMutable({
  // Multi-document
  documents: [],
  activeDocumentIndex: 0,

  // Globale tool
  currentTool: 'hand',

  // Interactie state
  isDrawing: false,
  isDragging: false,
  isResizing: false,
  isPanning: false,

  // Selectie
  selectedAnnotation: null,
  selectedAnnotations: [],    // multi-select

  // UI state
  openModal: null,
  openMenu: null,
  isTextEditing: false,

  // Zoeken
  searchQuery: '',
  searchResults: [],
  currentSearchMatch: 0,

  // Preferences
  preferences: {},
  authorName: '',

  // Backwards compatibility getters/setters
  get pdfDoc() { return this.getActiveDocument()?.pdfDoc; },
  set pdfDoc(v) { if (this.getActiveDocument()) this.getActiveDocument().pdfDoc = v; },
  get currentPage() { return this.getActiveDocument()?.currentPage ?? 1; },
  set currentPage(v) { if (this.getActiveDocument()) this.getActiveDocument().currentPage = v; },
  // ... meer compat-getters
});
```

**Slimme patterns:**

1. **Per-document state** — elk open document heeft zijn eigen state object (annotations, undo stack, etc.)
2. **Backwards compatibility layer** — getters/setters proxyen naar het actieve document, zodat bestaande code zonder refactoring blijft werken
3. **`createMutable`** — Solid's mutable store, lijkt op Vuex/Zustand maar reactief zonder boilerplate

**Utility functies:**
```javascript
export function getActiveDocument() {
  return state.documents[state.activeDocumentIndex] ?? null;
}

export function findDocumentByPath(filePath) {
  return state.documents.find(d => d.filePath === filePath) ?? null;
}

export function clearSelection() {
  state.selectedAnnotation = null;
  state.selectedAnnotations = [];
}

export function addToSelection(annotation) {
  if (!state.selectedAnnotations.includes(annotation)) {
    state.selectedAnnotations.push(annotation);
  }
  state.selectedAnnotation = annotation;
}
```

→ **Wij kunnen dit gebruiken door:** Open-Agents' state dezelfde structuur te geven: globale `createMutable` state met per-agent sub-objects (agent id → agent state). Backwards compat layer voor migraties. `findAgentById()`, `getActiveAgent()` utility functies als patroon.

---

## 7. Preferences Systeem — Dual Storage

**Bestand:** `js/core/preferences.js` (11KB)

### Dual-storage architectuur:

```javascript
const STORAGE_KEY = 'pdfEditorPreferences';

export async function savePreferences(prefs) {
  // 1. Sla op in localStorage (snel, synchroon)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

  // 2. Sla ook op via Rust (overleeft WebView2 cache clears)
  if (isTauri()) {
    savePreferencesFile(prefs).catch(e =>
      console.error('Failed to save preferences file:', e)
    );
  }
}

export async function loadPreferences() {
  let prefs = null;

  // 1. Probeer eerst Rust-backed storage
  if (isTauri()) {
    try {
      prefs = await loadPreferencesFile();
    } catch(e) { /* fallback */ }
  }

  // 2. Fallback naar localStorage (ook voor migratie)
  if (!prefs) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      prefs = JSON.parse(stored);
    }
  }

  // 3. Merge met defaults zodat alle keys bestaan
  return { ...DEFAULT_PREFERENCES, ...prefs };
}
```

### Default preferences structuur (90+ properties):

```javascript
const DEFAULT_PREFERENCES = {
  // Core
  theme: 'system',
  authorName: '',
  language: 'en',

  // Annotatie defaults
  defaultAnnotationColor: '#FF0000',
  defaultFillColor: '#FFFBEB',
  defaultHighlightColor: '#FFFF00',
  defaultLineWidth: 1,
  defaultFontSize: 16,

  // Per annotatie-type instellingen
  drawTool: {
    strokeColor: '#FF0000',
    opacity: 100,
    lineWidth: 2
  },
  textboxTool: {
    fillColor: '#FFFBEB',
    strokeColor: '#000000',
    fontSize: 14,
    opacity: 100
  },
  // ... meer tool-specifieke defaults

  // Snapping
  angleSnap: true,
  angleSnapDegrees: 30,
  gridSnap: false,
  gridSnapSize: 10,
  objectSnap: true,

  // Gedrag
  autoSelectAfterCreate: true,
  confirmOnDelete: true,
  restoreLastSession: true
};
```

**Theme resolution:**
```javascript
export async function resolveEffectiveTheme(theme) {
  if (theme !== 'system') return theme;
  // Tauri heeft native OS theme detectie
  if (isTauri()) {
    try {
      const window = await getCurrentWindow();
      return await window.theme();  // 'light' | 'dark'
    } catch(e) {}
  }
  // Browser fallback
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

→ **Wij kunnen dit gebruiken door:** Open-Agents user preferences (model keuze, theme, agent defaults) ook dual-storage te geven: localStorage voor snelheid + Rust file voor persistentie. Merge-met-defaults patroon overnemen zodat nieuwe preferences-velden automatisch beschikbaar zijn voor bestaande gebruikers.

---

## 8. Undo/Redo Manager

**Bestand:** `js/core/undo-manager.js` (19KB)
**Patroon:** Command Pattern met per-document stacks

### Architectuur:

```javascript
const MAX_UNDO_DEPTH = 100;

// Command types
const CMD = {
  ADD_ANNOTATION: 'add',
  DELETE_ANNOTATION: 'delete',
  MODIFY_ANNOTATION: 'modify',
  BULK_ADD: 'bulkAdd',
  BULK_DELETE: 'bulkDelete',
  BULK_MODIFY: 'bulkModify',
  PAGE_ROTATION: 'pageRotation',
  PAGE_STRUCTURE: 'pageStructure',
  CLEAR_PAGE: 'clearPage',
  TEXT_EDIT: 'textEdit',
  ADD_WATERMARK: 'addWatermark',
  REMOVE_WATERMARK: 'removeWatermark',
  MODIFY_WATERMARK: 'modifyWatermark',
  ADD_BOOKMARK: 'addBookmark',
  REMOVE_BOOKMARK: 'removeBookmark',
  // ... 18+ types
};
```

### Command uitvoering:

```javascript
export function execute(cmd) {
  const doc = getActiveDocument();
  if (!doc) return;

  // Voer de command uit
  applyRedo(cmd);

  // Push naar undo stack
  doc.undoStack.push(cmd);
  if (doc.undoStack.length > MAX_UNDO_DEPTH) {
    doc.undoStack.shift();  // oudste verwijderen
  }

  // Redo stack leegmaken (nieuwe actie = geen redo meer)
  doc.redoStack = [];

  // Markeer document als gewijzigd
  doc.modified = true;
}

export async function undo() {
  const doc = getActiveDocument();
  if (!doc || !doc.undoStack.length) return;

  const cmd = doc.undoStack.pop();
  await applyUndo(cmd);
  doc.redoStack.push(cmd);

  // UI bijwerken
  updatePropertiesPanel();
  clearSelection();
}
```

### Debounced recording voor sliders:

```javascript
const DEBOUNCE_MS = 400;
let pendingModify = null;
let debounceTimer = null;

export function recordModifyDebounced(annotation, oldState, newState) {
  // Cancel vorige debounce
  if (debounceTimer) clearTimeout(debounceTimer);

  // Als zelfde annotatie: update newState van bestaande pending command
  if (pendingModify && pendingModify.annotation === annotation) {
    pendingModify.newState = newState;
  } else {
    pendingModify = { type: CMD.MODIFY_ANNOTATION, annotation, oldState, newState };
  }

  debounceTimer = setTimeout(() => {
    execute(pendingModify);
    pendingModify = null;
    debounceTimer = null;
  }, DEBOUNCE_MS);
}
```

**Waarom dit slim is:** Slider-bewegingen genereren tientallen events per seconde. Zonder debouncing zou de undo stack vol raken met micro-wijzigingen. Met 400ms debouncing wordt alleen de eindwaarde opgeslagen.

→ **Wij kunnen dit gebruiken door:** Open-Agents' "agent run history" dezelfde command pattern te geven — elke agent actie is een command met undo-mogelijkheid. Debouncing voor live settings updates. Per-workspace undo stacks.

---

## 9. Platform Abstractie Layer

**Bestand:** `js/core/platform.js` (8KB)

```javascript
// Detectie
export const isTauri = () => typeof window !== 'undefined' && window.__TAURI__ !== undefined;

export function isMobile() {
  if (_isMobile !== null) return _isMobile;

  // Dev override: ?mobile URL parameter
  if (new URLSearchParams(window.location.search).has('mobile')) {
    return (_isMobile = true);
  }

  try {
    if (isTauri() && window.__TAURI__.os) {
      const osType = window.__TAURI__.os.type();
      _isMobile = (osType === 'android' || osType === 'ios');
    } else {
      _isMobile = false;
    }
  } catch {
    _isMobile = false;
  }
  return _isMobile;
}
```

### Tauri namespace helpers:

```javascript
// Consistente toegang tot Tauri namespaces
function getTauriWindow() {
  if (!isTauri()) return null;
  return window.__TAURI__.window;
}

function getTauriCore() {
  if (!isTauri()) return null;
  return window.__TAURI__.core;
}

// Custom Rust commands via invoke
async function invokeCommand(cmd, args = {}) {
  if (!isTauri()) return null;
  return window.__TAURI__.core.invoke(cmd, args);
}
```

### File operations wrapper:

```javascript
export async function readBinaryFile(path) {
  if (!isTauri()) return null;
  if (window.__TAURI__.fs) {
    return await window.__TAURI__.fs.readFile(path);
  }
  throw new Error('FS plugin not available');
}

export async function writeBinaryFile(path, data) {
  if (!isTauri()) return;
  if (window.__TAURI__.fs) {
    await window.__TAURI__.fs.writeFile(path, data);
    return;
  }
  // Fallback naar custom Rust command
  await invokeCommand('write_binary_file', { path, data: Array.from(data) });
}

// Window management
export async function minimizeWindow() {
  const win = getTauriWindow();
  if (win) await win.getCurrentWindow().minimize();
}

export async function maximizeWindow() {
  const win = getTauriWindow();
  if (win) {
    const isMaximized = await win.getCurrentWindow().isMaximized();
    if (isMaximized) {
      await win.getCurrentWindow().unmaximize();
    } else {
      await win.getCurrentWindow().maximize();
    }
  }
}
```

**Waarom `withGlobalTauri: true` slim is:**
Zonder `withGlobalTauri`, moet je Tauri APIs importeren als ES modules:
```javascript
import { readFile } from '@tauri-apps/plugin-fs';  // bundler vereist
```
Met `withGlobalTauri` kun je gewoon:
```javascript
window.__TAURI__.fs.readFile(path)  // geen bundler nodig
```
Dit werkt ook in dynamisch geladen scripts en vanilla JS zonder build stap.

→ **Wij kunnen dit gebruiken door:** Open-Agents een identieke `platform.js` te geven die Tauri APIs achter een abstractielaag plaatst. `isTauri()` check voor graceful degradation in browser-only mode. `?mobile` dev override voor UI testen. `invokeCommand()` wrapper als uniforme interface naar alle Rust commands.

---

## 10. Session Management

**Bestand:** `js/stores/sessions.js`

```javascript
const STORAGE_KEY = 'savedSessions';
const MAX_SESSIONS = 20;

export function getSavedSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCurrentSession(name) {
  const sessions = getSavedSessions();
  const currentFiles = state.documents.map(d => d.filePath).filter(Boolean);

  // Deduplicatie op naam
  const filtered = sessions.filter(s => s.name !== name);

  // Prepend nieuwe sessie (nieuwste eerst)
  filtered.unshift({
    name,
    timestamp: Date.now(),
    files: currentFiles
  });

  // Trim op MAX_SESSIONS
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_SESSIONS)));
}

export async function restoreSession(session) {
  // Sequentieel bestanden openen
  for (const filePath of session.files) {
    const tab = createTab(filePath);
    await loadPDF(tab, filePath);
  }
}
```

### Recent Places store (`js/stores/places.js`):

Vergelijkbaar patroon maar voor recent opened files/directories — de "recent files" lijst in het menu.

→ **Wij kunnen dit gebruiken door:** Open-Agents "workspace sessions" dezelfde structuur te geven: sla de huidige open agents + hun configuraties op als sessie die hersteld kan worden. MAX_SESSIONS = 20 limiet als patroon voor alle bounded history lists.

---

## 11. CI/CD Pipeline

### ci.yml — Continuous Integration

**Trigger:** Push naar `main` (excl. version tags) + pull requests naar `main`

```yaml
strategy:
  matrix:
    include:
      - platform: 'ubuntu-22.04'
      - platform: 'windows-latest'
      - platform: 'macos-latest'

defaults:
  run:
    working-directory: open-pdf-studio  # werkt in subdirectory

steps:
  - uses: actions/checkout@v4

  - name: Install Rust
    uses: dtolnay/rust-toolchain@stable

  - name: Add macOS targets
    if: matrix.platform == 'macos-latest'
    run: rustup target add aarch64-apple-darwin x86_64-apple-darwin

  - name: Install Ubuntu dependencies
    if: matrix.platform == 'ubuntu-22.04'
    run: |
      sudo apt-get update
      sudo apt-get install -y \
        libwebkit2gtk-4.1-dev \
        libappindicator3-dev \
        librsvg2-dev \
        patchelf

  - uses: actions/setup-node@v4
    with:
      node-version: '20'

  - run: npm install
  - run: npm run tauri build -- --no-bundle  # bouw zonder installer (sneller voor CI)
```

**`--no-bundle` flag** — bouwt alleen het binaire, geen installer. Aanzienlijk sneller voor CI checks.

### release.yml — Multi-Platform Release

**Build matrix:**

```yaml
matrix:
  include:
    - platform: 'ubuntu-22.04'
      args: ''
      target: 'linux'
    - platform: 'macos-latest'
      args: '--target universal-apple-darwin'  # Fat binary: Intel + Apple Silicon
      target: 'macos'
    - platform: 'windows-latest'
      args: ''
      target: 'windows-system'   # Per-machine installer
    - platform: 'windows-latest'
      args: ''
      target: 'windows-user'     # Per-user installer (geen admin vereist)
```

**macOS Universal Binary:** `--target universal-apple-darwin` compileert voor beide architecturen en bundelt ze in één .dmg. Gebruikers hoeven geen platform te kiezen.

**Twee Windows installers:** Zowel `perMachine` (vereist admin) als `perUser` (geen admin). Grotere adoptie want bedrijfscomputers laten vaak geen machine-wide installaties toe.

### Windows Authenticode Signing:

```yaml
- name: Sign Windows executables
  uses: azure/trusted-signing-action@v0.5.0
  with:
    endpoint: https://eus.codesigning.azure.net/
    trusted-signing-account-name: ${{ secrets.AZURE_SIGNING_ACCOUNT }}
    certificate-profile-name: ${{ secrets.AZURE_CERT_PROFILE }}
    files-folder: ${{ github.workspace }}/open-pdf-studio/src-tauri/target/release/bundle/nsis
    files-folder-filter: exe
    file-digest: SHA256
    timestamp-rfc3161: http://timestamp.acs.microsoft.com
```

Azure Trusted Signing (voorheen Code Signing) — betaalbare Authenticode signing voor open-source projecten.

### Tauri Update Signing:

```yaml
env:
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'tauri2026'  # Let op: hardcoded!
```

**Let op:** Het wachtwoord staat hardcoded in de workflow. Dit is een security issue — beter als secret.

### Job Dependencies:

```
create-release ──→ build (Linux/macOS/Windows)
              ──→ build-android
                              ↓
                    publish-release (maakt draft publiek)
```

→ **Wij kunnen dit gebruiken door:** Open-Agents dezelfde 4-platform matrix te gebruiken (Linux + macOS universal + Windows system + Windows user). `--no-bundle` in CI voor snelheid. Azure Trusted Signing integreren. Draft release patroon: maak eerst draft aan, build alle platforms, publish daarna atomisch.

---

## 12. NSIS Windows Installer — Custom Hooks

**Bestanden:** `src-tauri/nsis/installer.nsi` (31KB), `hooks.nsh` (6KB)

De standaard Tauri NSIS installer is vervangen door een volledig custom script. De hooks.nsh voegt 3 extra wizard-pagina's toe:

### 1. File Association Pagina
```nsh
!macro NSIS_HOOK_POSTINSTALL
  ; Registreer .pdf associatie als gebruiker dit koos
  ${If} $AssociatePDF == 1
    WriteRegStr HKLM "SOFTWARE\Classes\.pdf" "" "OpenPDFStudio.Document"
    WriteRegStr HKLM "SOFTWARE\Classes\OpenPDFStudio.Document\shell\open\command" \
      "" '"$INSTDIR\Open PDF Studio.exe" "%1"'
  ${EndIf}

  ; Installeer virtuele printer als admin en gebruiker koos
  ${If} $InstallPrinter == 1
    ExecWait 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\install-printer.ps1"'
  ${EndIf}

  ; Maak desktop shortcut
  ${If} $CreateDesktopShortcut == 1
    CreateShortCut "$DESKTOP\Open PDF Studio.lnk" "$INSTDIR\Open PDF Studio.exe"
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Verwijder file associatie
  DeleteRegKey HKLM "SOFTWARE\Classes\OpenPDFStudio.Document"

  ; Verwijder virtuele printer
  ExecWait 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\uninstall-printer.ps1"'

  ; Verwijder desktop shortcut
  Delete "$DESKTOP\Open PDF Studio.lnk"
!macroend
```

### Virtuele Printer (`install-printer.ps1`):
```powershell
# Gebruik Microsoft's ingebouwde PDF driver
Add-PrinterDriver -Name "Microsoft Print To PDF"
Add-Printer -Name "Open PDF Studio" -DriverName "Microsoft Print To PDF" -PortName "FILE:"
```

**Slim:** Geen externe afhankelijkheden — de PDF printer driver zit al in Windows 10+.

### `installMode: "perMachine"` + tweede installer met `perUser`:

Dit is waarom er twee Windows builds zijn in de release matrix. De NSIS installer heeft installMode als instelling. Door twee matrix entries toe te voegen met verschillende configuraties bouw je één keer de codebase maar twee verschillende installers.

→ **Wij kunnen dit gebruiken door:** Als Open-Agents een native Windows ervaring wil, dezelfde custom NSIS hooks toe te passen. File association voor `.agent` files. Optionele systeem-service installatie via PowerShell hooks. Dual installer strategie (per-machine voor IT, per-user voor individuals).

---

## 13. Android Build

**In `release.yml`:**

```yaml
build-android:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'

    - name: Setup Android SDK
      uses: android-actions/setup-android@v3

    - name: Install Android NDK
      run: sdkmanager "ndk;27.0.12077973"

    - name: Build Android APK
      run: npm run tauri android build -- --apk

    - name: Zipalign APK
      run: |
        $ANDROID_SDK_ROOT/build-tools/*/zipalign -v 4 \
          unsigned.apk \
          aligned.apk

    - name: Sign APK
      run: |
        # Genereer keystore on-the-fly
        keytool -genkey -v -keystore release.jks \
          -alias openpdfstudio \
          -keyalg RSA -keysize 2048 \
          -validity 10000 \
          -storepass openpdfstudio \
          -keypass openpdfstudio \
          -dname "CN=OpenPDFStudio"

        # Onderteken met apksigner
        $ANDROID_SDK_ROOT/build-tools/*/apksigner sign \
          --ks release.jks \
          --ks-pass pass:openpdfstudio \
          aligned.apk
```

**Let op:** De keystore wordt elke keer opnieuw gegenereerd met een hardcoded wachtwoord. Dit betekent dat elke release een andere signing key heeft — geen echte continuïteit voor Play Store updates. Voor sideloading is dit acceptabel.

→ **Wij kunnen dit gebruiken door:** Als Open-Agents een mobiele companion app wil, dezelfde Android build setup te gebruiken. NDK 27 is de huidige stabiele versie voor Tauri Android builds.

---

## 14. Linux Snap Distributie

**Bestand:** `.github/workflows/snap.yml`

```yaml
steps:
  - name: Build Tauri app
    run: npm run tauri build

  - name: Extract DEB
    run: |
      dpkg-deb -x dist/*.deb extracted/

  - name: Update snapcraft.yaml version
    run: |
      sed -i "s/^version:.*/version: '$VERSION'/" snap/snapcraft.yaml

  - name: Build snap
    run: snapcraft --use-lxd

  - name: Wait for GitHub release (polling)
    run: |
      for i in {1..30}; do
        if gh release view "$TAG" > /dev/null 2>&1; then
          echo "Release found"
          break
        fi
        sleep 30
      done

  - name: Upload to GitHub release
    run: gh release upload "$TAG" *.snap --clobber

  - name: Publish to Snap Store
    if: env.SNAPCRAFT_STORE_CREDENTIALS != ''
    run: snapcraft upload --release=stable *.snap
```

**Polling patroon:** De snap workflow wacht op de GitHub release (gemaakt door `release.yml`) met polling. Niet ideaal — beter zou zijn om `needs: [create-release]` te gebruiken.

→ **Wij kunnen dit gebruiken door:** Als Open-Agents Linux gebruikers wil bedienen via Snap Store, dit workflow template over te nemen. `--clobber` flag bij release upload voorkomt fouten bij retries.

---

## 15. Auto-Updater

**Configuratie in `tauri.conf.json`:**

```json
"updater": {
  "endpoints": [
    "https://github.com/OpenAEC-Foundation/OpenPDFStudio/releases/latest/download/latest.json"
  ],
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6..."
}
```

**`createUpdaterArtifacts: "v1Compatible"`** in bundle config genereert een `latest.json` update manifest file die geüpload wordt bij elke release.

**Update flow:**
1. App check bij startup de endpoint URL
2. Vergelijkt versie in `latest.json` met huidige versie
3. Als nieuwer: toont update dialog
4. Download + verificeer signatuur met pubkey
5. Installeer via platform-specifiek mechanisme (NSIS silent install op Windows)

**Signing:** Private key staat in GitHub Secrets (`TAURI_SIGNING_PRIVATE_KEY`). Public key staat hardcoded in `tauri.conf.json`. Zo kan niemand een nep-update pushen.

→ **Wij kunnen dit gebruiken door:** Open-Agents exact dezelfde auto-updater setup te geven. Het `latest.json` bestand is het enige dat nodig is — geen aparte update server. Public key in config, private key als GitHub Secret.

---

## 16. Security & CSP

```json
"security": {
  "csp": null
}
```

**CSP is uitgeschakeld.** Dit is de minst veilige optie maar ook de meest compatibele. Veel PDF-gerelateerde operaties (blob URLs, data URLs, inline scripts) werken niet met een strikte CSP.

**Alternatief voor productie:**
```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; connect-src ipc: http://ipc.localhost"
}
```

**`withGlobalTauri: true` security implicaties:**
Wanneer `withGlobalTauri` aan staat, is `window.__TAURI__` beschikbaar voor elke JavaScript code die in de WebView draait. Als er XSS is, heeft aanvaller directe toegang tot file system, shell, etc.

**Tauri Capabilities (niet in dit project):**
Tauri 2 heeft een capability systeem voor fine-grained permissions. Dit project lijkt het niet te gebruiken — alle fs/shell/dialog permissions zijn breed open. Voor een PDF editor is dit acceptabel; voor een app die credentials beheert (zoals Open-Agents) verdient dit meer aandacht.

→ **Wij kunnen dit gebruiken door:** Open-Agents een strictere security baseline te geven. Capability files aanmaken voor elk plugin (`fs`, `shell`, `dialog`) met minimale permissions. CSP instellen die `ipc:` en `http://ipc.localhost` toelaat (Tauri IPC) maar externe scripts blokkeert.

---

## 17. Initialisatie Sequentie

**Bestand:** `js/main.js` (11KB)

```javascript
// 1. Laad preferences VOOR render (theme etc. beschikbaar)
await loadPreferences();

// 2. Detecteer platform
const mobile = isMobile();

// 3. Render SolidJS app (eenmalige render)
render(() => <App />, document.getElementById('app-root'));

// 4. Registreer voor file-open events VOOR venster zichtbaar
// (single-instance plugin stuurt files via events)
if (isTauri()) {
  listen('open-files', (event) => {
    // Queue files totdat app klaar is
    fileQueue = fileQueue.then(() => openFiles(event.payload));
  });
}

// 5. Maak venster zichtbaar NA eerste paint
await nextTick();
await getCurrentWindow().show();

// 6. Initialiseer UI componenten
if (!mobile) {
  initMenus();
  initContextMenus();
  initAnnotationsPanel();
  // ...
}
initTextSelection();
initTabs();

// 7. Herstel sessie of open command-line bestanden
const args = await getCLIArgs();
if (args.length > 0) {
  await openFiles(args);
} else if (preferences.restoreLastSession) {
  await restoreLastSession();
}
```

### File queue patroon:

```javascript
// Geserialiseerd file-open queue via promise chaining
let fileQueue = Promise.resolve();

function queueFileOpen(files) {
  fileQueue = fileQueue.then(() => openFiles(files));
}
```

**Waarom dit slim is:** Single-instance plugin kan meerdere "open-files" events snel achter elkaar sturen (bijv. gebruiker opent 3 bestanden tegelijk vanuit Explorer). Door te chainen op een promise worden ze sequentieel verwerkt — geen race conditions.

### Dev security:

```javascript
// Blokkeer browser shortcuts in production
if (!isDevMode()) {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'i') e.preventDefault();  // DevTools
    if (e.key === 'F5') e.preventDefault();               // Refresh (breekt state)
    if (e.ctrlKey && e.key === 'r') e.preventDefault();   // Hard refresh
  });
}
```

→ **Wij kunnen dit gebruiken door:** Open-Agents exact dezelfde initialisatie volgorde te geven: preferences laden → render → events registreren → venster tonen → UI initialiseren → sessie herstel. De geserialiseerde file queue is een must voor elke app die bestanden ontvangt via single-instance events.

---

## 18. Open Issues — Wat werkt nog niet

Actieve bugs en feature requests (per 2026-03-08):

| Issue | Type | Details |
|-------|------|---------|
| #174 | Bug | Ubuntu 24.04 Wayland: `libEGL` fout, app start niet |
| #173 | Bug | Zoom glitch / visuele artefacten |
| #80, #79, #156 | Bug | Flickering bij zoom (meerdere issues) |
| #78 | Bug | "Clear Page" werkt alleen in preview |
| #77 | Bug | Tekst zoeken werkt niet correct |
| #71 | Bug | Tekst highlight tool defect |
| #158 | Bug | Incorrecte regelafbrekingen in tekst rendering |
| #172 | UI | Verouderd logo |
| #53 | UI | Verouderd icon-stijl |
| #160 | UI | Tab spacing inconsistentie |
| #147 | Feature | Uitgebreide dimension tools |
| #84 | Feature | 2D component library integratie |
| #56 | Feature | PDF comparison tool |
| #57 | Feature | BCF format import/export |
| #61 | Bug | Hebreeuws RTL cursor positioning |

**Patroon:** Veel zoom/render gerelateerde bugs — PDF.js rendering is complex en performance-gevoelig. Ubuntu 24.04 + Wayland support is een actief probleem in de Tauri community (libEGL issue).

→ **Wij kunnen dit gebruiken door:** Open-Agents te testen op Ubuntu 22.04 (niet 24.04) voor nu. Zoom/render bugs vermijden door WebView2/WebKit niet te gebruiken voor complexe canvas operaties.

---

## 19. Samenvatting: Top 10 Patronen voor Open-Agents

### 1. Venster initialisatie — No Flash Pattern
```json
// tauri.conf.json
"windows": [{ "visible": false }]
```
```javascript
// main.js — na eerste render
await getCurrentWindow().show();
```
**Adoptie:** Direct overnemen in Open-Agents.

### 2. Platform Abstractie — `platform.js`
Één file die `isTauri()`, `isMobile()`, alle file/window/dialog operaties wrappert. Graceful degradation in browser mode.
**Adoptie:** Maak `src/platform.ts` als identieke abstractielaag.

### 3. Dual Storage Preferences
localStorage (snel) + Rust `appLocalDataDir` (persistent). Merge met defaults bij laden.
**Adoptie:** Agent settings, model preferences, workspace config.

### 4. Per-Document/Per-Agent State
Elke entiteit heeft zijn eigen state object. Globale state heeft backwards compat layer.
**Adoptie:** Elke running agent heeft zijn eigen state object in `state.agents[agentId]`.

### 5. Geserialiseerd File Queue
```javascript
let queue = Promise.resolve();
function enqueue(fn) { queue = queue.then(fn); }
```
**Adoptie:** Elke situatie met concurrente events die sequentieel verwerkt moeten worden.

### 6. `withGlobalTauri: true` voor Eenvoud
Geen bundler-integratie nodig voor Tauri APIs. Direct `window.__TAURI__` gebruiken.
**Adoptie:** Open-Agents gebruikt al Vite, maar dit pattern maakt runtime-loaded scripts ook mogelijk.

### 7. Multi-Platform Release Matrix
4 targets: Linux + macOS universal + Windows system + Windows user.
Twee Windows installers: admin en non-admin.
**Adoptie:** Exact dit matrix overnemen in Open-Agents release.yml.

### 8. Custom NSIS Installer
Extra wizard-pagina's voor optionele features (file association, shortcuts).
**Adoptie:** `openagents://` deep-link registratie, optionele autostart, desktop shortcut.

### 9. Command Pattern Undo met Debouncing
18+ command types, per-document stacks, 400ms debounce voor sliders.
**Adoptie:** Agent action history met undo voor configuratiewijzigingen.

### 10. Draft Release Patroon
```
create-release (draft) → build alle platforms → publish-release
```
Release wordt pas publiek als alle platforms succesvol gebouwd zijn.
**Adoptie:** Open-Agents releases nooit met slechts één platform — wacht op alle.

---

*Analyse uitgevoerd door pdf-deep-diver agent | Open-Agents Research Library*
