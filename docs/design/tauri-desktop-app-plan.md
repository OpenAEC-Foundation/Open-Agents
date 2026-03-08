# Open-Agents Tauri 2 Desktop App — Implementation Plan

**Date:** 2026-03-08
**Author:** tauri-architect agent
**Status:** Draft
**Reference:** [Open PDF Studio Analysis](../research/open-pdf-studio-analysis.md)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tauri ↔ Python Bridge Strategy](#2-tauri--python-bridge-strategy)
3. [File Structure](#3-file-structure)
4. [Tauri Plugins](#4-tauri-plugins)
5. [Vite Config Changes](#5-vite-config-changes)
6. [Package.json Changes](#6-packagejson-changes)
7. [Tauri Configuration (tauri.conf.json)](#7-tauri-configuration-tauriconfjson)
8. [Sprint 1: MVP](#8-sprint-1-mvp)
9. [Roadmap: MVP → Full Product](#9-roadmap-mvp--full-product)
10. [Risks & Mitigations](#10-risks--mitigations)

---

## 1. Architecture Overview

### Huidige situatie (Current State)

```
┌──────────────────────────────────────────────────────┐
│  Browser (localhost:5174)                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  React 19 + Vite 7 + Zustand + TailwindCSS 4  │  │
│  │  @xyflow/react (visual builder)                │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │ HTTP fetch(/api/*)              │
└─────────────────────┼────────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────────┐
│  Python Flask Bridge (bridge.py, port 5174)          │
│  ┌──────────────────┴─────────────────────────────┐  │
│  │  REST endpoints: /api/agents, /api/messages,   │  │
│  │  /api/teams, /api/tasks, /api/templates, etc.  │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │ Python calls                    │
│  ┌──────────────────┴─────────────────────────────┐  │
│  │  oa-cli modules: spawner, lifecycle, state,    │  │
│  │  messaging, tmux, workspace, guardians, etc.   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Tauri architectuur (Target State)

```
┌────────────────────────────────────────────────────────────┐
│  Tauri 2 Desktop App (native window, system WebView)       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Rust Backend (src-tauri/src/main.rs)                │  │
│  │  ├── Tauri Commands (IPC bridge)                     │  │
│  │  ├── Sidecar: Python bridge process management       │  │
│  │  ├── Plugin: fs, shell, process, updater, dialog     │  │
│  │  └── System tray, auto-update, native menus          │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │ Tauri IPC (invoke) + HTTP proxy          │
│  ┌──────────────┴───────────────────────────────────────┐  │
│  │  WebView (React 19 + Vite 7 + Zustand)               │  │
│  │  Same UI code as current web/ — minimal changes      │  │
│  └──────────────────────────────────────────────────────┘  │
│                 │                                          │
│  ┌──────────────┴───────────────────────────────────────┐  │
│  │  Python Sidecar (Flask bridge, managed by Tauri)     │  │
│  │  Spawned as child process, communicates via HTTP     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Kernprincipe: Wrap, Don't Rewrite

De React+Vite frontend is **al gebouwd en werkend**. Tauri fungeert als native shell:
- WebView rendert dezelfde React app
- Rust backend beheert de Python sidecar (Flask bridge)
- Frontend code verandert minimaal — alleen de API client wordt dual-mode (HTTP of Tauri invoke)
- Geen SolidJS migratie nodig (anders dan Open PDF Studio dat SolidJS gebruikt)

---

## 2. Tauri ↔ Python Bridge Strategy

### Drie opties geanalyseerd

| Aspect | Optie A: Sidecar HTTP | Optie B: Tauri Commands wrap CLI | Optie C: Rust vervangt Python |
|--------|----------------------|----------------------------------|-------------------------------|
| **Effort** | Laag (2-3 dagen) | Medium (1-2 weken) | Zeer hoog (maanden) |
| **Compatibility** | 100% — huidige bridge.py draait ongewijzigd | ~80% — elke CLI call moet gewrapped | 0% — complete rewrite |
| **Performance** | Goed (localhost HTTP) | Iets beter (geen HTTP overhead) | Best (native Rust) |
| **Debugging** | Makkelijk (bridge.py is standalone testbaar) | Lastiger (Tauri commands layer) | Moeilijk |
| **Python dependency** | Ja | Ja | Nee (langetermijn) |
| **Cross-platform** | Goed (Python is cross-platform) | Goed | Best |

### Aanbeveling: Optie A — Sidecar HTTP (MVP)

**Waarom:**
1. De Flask bridge (`bridge.py`) werkt al perfect — alle API endpoints zijn geïmplementeerd
2. De React frontend praat al via `fetch(/api/*)` — zero changes nodig in de UI
3. Tauri's `tauri-plugin-shell` kan Python als sidecar process starten
4. Development velocity: we kunnen binnen een dag een werkende desktop app hebben
5. Open PDF Studio bewijs: zij gebruiken ook een sidecar patroon voor zware operaties

**Hoe het werkt:**
1. Tauri start → Rust `setup()` hook spawnt `python -m open_agents.bridge --port 5174`
2. React app laadt in WebView, praat met `http://127.0.0.1:5174/api/*`
3. Bij afsluiten: Rust `on_close()` stuurt SIGTERM naar Python process
4. Fallback: als Python niet geïnstalleerd is → toon installatie-instructies

**Evolutiepad naar Optie B/C:**
- Sprint 2+: Kritieke endpoints migreren naar Tauri Commands (Rust) voor snelheid
- Langetermijn: Rust implementaties van state management, tmux interface
- Python bridge blijft als fallback voor complexe operaties

### API Client Dual-Mode Pattern

Het huidige `web/src/api/client.ts` maakt `fetch()` calls. Voor Tauri voegen we een abstractielaag toe:

```typescript
// api/client.ts — updated
import { invoke } from '@tauri-apps/api/core';

const IS_TAURI = '__TAURI_INTERNALS__' in window;
const API_BASE = IS_TAURI ? 'http://127.0.0.1:5174' : '';

export async function fetchAgents(): Promise<Agent[]> {
  if (IS_TAURI) {
    // Optie 1: via Tauri invoke (wanneer Rust endpoint beschikbaar is)
    // return invoke<Agent[]>('list_agents');

    // Optie 2: via sidecar HTTP (MVP)
    const res = await fetch(`${API_BASE}/api/agents`);
    return res.json();
  }
  // Web mode: relative URL, proxy handled by Vite
  const res = await fetch('/api/agents');
  return res.json();
}
```

In de MVP-fase is `API_BASE` het enige verschil — de frontend code is verder identiek.

---

## 3. File Structure

### Nieuwe bestanden in de repo

```
Open-Agents/
├── oa-cli/
│   ├── web/                          # Bestaande React frontend (ONGEWIJZIGD)
│   │   ├── src/
│   │   │   ├── api/client.ts         # Minimale wijziging: API_BASE voor Tauri
│   │   │   ├── App.tsx               # Ongewijzigd
│   │   │   ├── components/           # Ongewijzigd
│   │   │   ├── stores/               # Ongewijzigd
│   │   │   └── types/                # Ongewijzigd
│   │   ├── package.json              # + @tauri-apps/* dependencies
│   │   ├── vite.config.ts            # + Tauri dev server config
│   │   └── index.html                # Ongewijzigd
│   │
│   └── src-tauri/                    # NIEUW — Tauri Rust backend
│       ├── Cargo.toml                # Rust dependencies
│       ├── tauri.conf.json           # Tauri configuratie
│       ├── build.rs                  # Tauri build script
│       ├── capabilities/
│       │   └── default.json          # Permission capabilities
│       ├── icons/                    # App icons (auto-generated)
│       │   ├── icon.ico
│       │   ├── icon.png
│       │   ├── 32x32.png
│       │   ├── 128x128.png
│       │   └── 128x128@2x.png
│       └── src/
│           ├── main.rs               # Entry point, sidecar management
│           └── lib.rs                # Tauri commands, plugin registration
```

### Waarom `src-tauri/` naast `web/` (niet erin)?

1. **Tauri conventie**: `src-tauri/` staat naast de frontend directory
2. **Separation of concerns**: Rust backend ≠ frontend code
3. **Build isolation**: Cargo en npm builds interfereren niet
4. **Open PDF Studio patroon**: zij gebruiken exact deze structuur
5. **Tauri CLI verwacht dit**: `npm run tauri dev` zoekt `src-tauri/` relatief aan package.json

---

## 4. Tauri Plugins

### Vereiste plugins voor MVP

| Plugin | Crate | Waarom |
|--------|-------|--------|
| `tauri-plugin-shell` | `tauri-plugin-shell` | Python sidecar process starten/stoppen |
| `tauri-plugin-process` | `tauri-plugin-process` | App lifecycle, graceful shutdown |
| `tauri-plugin-fs` | `tauri-plugin-fs` | Agent workspaces lezen, output files |
| `tauri-plugin-dialog` | `tauri-plugin-dialog` | File open/save dialogs voor workspace selectie |
| `tauri-plugin-os` | `tauri-plugin-os` | Platform detectie (WSL, native, etc.) |

### Plugins voor post-MVP

| Plugin | Crate | Waarom |
|--------|-------|--------|
| `tauri-plugin-updater` | `tauri-plugin-updater` | Auto-update via GitHub Releases |
| `tauri-plugin-log` | `tauri-plugin-log` | Structured logging naar bestand |
| `tauri-plugin-single-instance` | `tauri-plugin-single-instance` | Voorkom dubbele app instances |
| `tauri-plugin-notification` | `tauri-plugin-notification` | Desktop notificaties bij agent completion |
| `tauri-plugin-deep-link` | `tauri-plugin-deep-link` | `oa://` protocol handler |
| `tauri-plugin-opener` | `tauri-plugin-opener` | URLs en bestanden openen in systeem apps |
| `tauri-plugin-global-shortcut` | `tauri-plugin-global-shortcut` | Global hotkeys (b.v. Ctrl+Shift+O opent dashboard) |

### Capability Configuration

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for Open-Agents desktop app",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-spawn",
    "shell:allow-execute",
    "shell:allow-kill",
    "process:allow-exit",
    "process:allow-restart",
    "fs:allow-read",
    "fs:allow-exists",
    "dialog:allow-open",
    "dialog:allow-save",
    "os:default"
  ]
}
```

---

## 5. Vite Config Changes

### Huidige vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:5174",
    },
  },
  build: {
    outDir: "dist",
  },
});
```

### Aangepaste vite.config.ts voor Tauri

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tauri sets TAURI_ENV_* environment variables during development
const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Prevent Vite from obscuring Rust errors in Tauri dev mode
  clearScreen: false,

  server: {
    port: 5173,
    // Tauri expects a fixed port; fail if not available
    strictPort: true,
    proxy: isTauri ? undefined : {
      "/api": "http://127.0.0.1:5174",
    },
  },

  build: {
    outDir: "dist",
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_ENV_PLATFORM === "windows"
      ? "chrome105"
      : "safari14",
    // Debug builds produce source maps for better stack traces
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },

  // Environment variables prefixed with TAURI_ are exposed to the frontend
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
```

### Wat verandert er?

1. **`clearScreen: false`** — Tauri en Vite draaien samen; voorkom dat Vite Tauri's output wist
2. **`strictPort: true`** — Tauri's `devUrl` verwacht poort 5173; fail als bezet
3. **Proxy conditioneel** — In Tauri mode praat de frontend direct met `http://127.0.0.1:5174`
4. **Build target** — Chrome 105+ (Windows) of Safari 14+ (macOS/Linux WebKit)
5. **Source maps in debug** — Alleen in development builds voor debugging
6. **`envPrefix`** — TAURI_ENV_* variabelen beschikbaar in frontend code

---

## 6. Package.json Changes

### Toe te voegen dependencies

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.5.0",
    "@tauri-apps/plugin-shell": "^2.2.0",
    "@tauri-apps/plugin-process": "^2.2.0",
    "@tauri-apps/plugin-fs": "^2.2.0",
    "@tauri-apps/plugin-dialog": "^2.2.0",
    "@tauri-apps/plugin-os": "^2.2.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.5.0"
  }
}
```

### Toe te voegen scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### Volledige package.json na wijzigingen

```json
{
  "name": "@open-agents/web",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.5.0",
    "@tauri-apps/plugin-shell": "^2.2.0",
    "@tauri-apps/plugin-process": "^2.2.0",
    "@tauri-apps/plugin-fs": "^2.2.0",
    "@tauri-apps/plugin-dialog": "^2.2.0",
    "@tauri-apps/plugin-os": "^2.2.0",
    "@xyflow/react": "^12.6.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.5.0",
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.4",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  }
}
```

---

## 7. Tauri Configuration (tauri.conf.json)

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "Open Agents",
  "version": "0.2.0",
  "identifier": "com.open-agents.desktop",
  "build": {
    "frontendDist": "../web/dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "cd ../web && npm run dev",
    "beforeBuildCommand": "cd ../web && npm run build"
  },
  "app": {
    "title": "Open Agents",
    "windows": [
      {
        "label": "main",
        "title": "Open Agents — Command Centre",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://127.0.0.1:5174 ws://127.0.0.1:5174; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
    },
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  },
  "bundle": {
    "active": true,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "targets": ["nsis", "msi", "dmg", "appimage", "deb"],
    "windows": {
      "nsis": {
        "installMode": "currentUser"
      }
    },
    "resources": [],
    "category": "DeveloperTool",
    "shortDescription": "Multi-agent orchestrator for Claude Code",
    "longDescription": "Open Agents — tmux-based multi-agent orchestrator for Claude Code. Spawn, monitor, and manage AI agents from a native desktop application."
  }
}
```

### Belangrijke instellingen uitgelegd

1. **`build.frontendDist`**: Wijst naar de gebouwde React app (`web/dist/`)
2. **`build.devUrl`**: Vite dev server URL — Tauri laadt dit in development mode
3. **`build.beforeDevCommand`**: Start Vite dev server automatisch bij `tauri dev`
4. **`build.beforeBuildCommand`**: Bouwt React app voor productie bij `tauri build`
5. **`app.security.csp`**: Content Security Policy die HTTP calls naar de Python bridge toestaat
6. **`bundle.targets`**: NSIS/MSI voor Windows, DMG voor macOS, AppImage/DEB voor Linux
7. **`bundle.category`**: `DeveloperTool` — past bij de aard van de app

---

## 8. Sprint 1: MVP

### Doel: Werkende desktop app die de bestaande UI toont en met Python bridge communiceert

### Prerequisites

```bash
# 1. Rust toolchain installeren (als nog niet aanwezig)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. Tauri system dependencies (Ubuntu/WSL)
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev \
  librsvg2-dev patchelf libssl-dev libgtk-3-dev libayatana-appindicator3-dev

# 3. Tauri CLI installeren
cargo install tauri-cli --version "^2"
# of via npm (al in package.json):
# npx @tauri-apps/cli
```

### Stap-voor-stap implementatie

#### Stap 1: Tauri project initialiseren (5 minuten)

```bash
cd /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli

# Initialize Tauri in the project
npx @tauri-apps/cli init

# Dit maakt src-tauri/ aan met:
# - Cargo.toml
# - tauri.conf.json
# - src/main.rs
# - src/lib.rs
# - icons/
# - build.rs
# - capabilities/default.json
```

#### Stap 2: tauri.conf.json configureren (10 minuten)

Vervang de gegenereerde `tauri.conf.json` met de configuratie uit [sectie 7](#7-tauri-configuration-tauriconfjson).

Belangrijk: de `frontendDist` en `devUrl` paths moeten kloppen relatief aan `src-tauri/`.

#### Stap 3: Rust sidecar management schrijven (30 minuten)

```rust
// src-tauri/src/lib.rs

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, State};

struct PythonBridge {
    process: Mutex<Option<Child>>,
}

fn start_python_bridge() -> Result<Child, String> {
    // Spawn the Flask bridge as a child process
    let child = Command::new("python3")
        .args(["-m", "open_agents.bridge", "--port", "5174"])
        .spawn()
        .map_err(|e| format!("Failed to start Python bridge: {}", e))?;

    // Give the server a moment to start
    std::thread::sleep(std::time::Duration::from_secs(2));

    Ok(child)
}

#[tauri::command]
fn get_bridge_status(state: State<PythonBridge>) -> bool {
    let guard = state.process.lock().unwrap();
    if let Some(ref child) = *guard {
        // Check if process is still running
        // (Child doesn't have a direct "is alive" check, so we try wait with WNOHANG)
        true
    } else {
        false
    }
}

#[tauri::command]
fn restart_bridge(state: State<PythonBridge>) -> Result<String, String> {
    let mut guard = state.process.lock().unwrap();

    // Kill existing process if running
    if let Some(ref mut child) = *guard {
        let _ = child.kill();
        let _ = child.wait();
    }

    // Start new process
    let child = start_python_bridge()?;
    *guard = Some(child);

    Ok("Bridge restarted".to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // Start Python bridge on app launch
            match start_python_bridge() {
                Ok(child) => {
                    app.manage(PythonBridge {
                        process: Mutex::new(Some(child)),
                    });
                    println!("Python bridge started successfully");
                }
                Err(e) => {
                    eprintln!("Warning: Could not start Python bridge: {}", e);
                    app.manage(PythonBridge {
                        process: Mutex::new(None),
                    });
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill Python bridge when window closes
                let state: State<PythonBridge> = window.state();
                let mut guard = state.process.lock().unwrap();
                if let Some(ref mut child) = *guard {
                    let _ = child.kill();
                    let _ = child.wait();
                    println!("Python bridge stopped");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_bridge_status,
            restart_bridge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    open_agents_desktop_lib::run();
}
```

#### Stap 4: Cargo.toml configureren (5 minuten)

```toml
# src-tauri/Cargo.toml
[package]
name = "open-agents-desktop"
version = "0.2.0"
description = "Open Agents Desktop Application"
edition = "2021"

[lib]
name = "open_agents_desktop_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
tauri-plugin-process = "2"
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-os = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

#### Stap 5: API client aanpassen (10 minuten)

Minimale wijziging in `web/src/api/client.ts`:

```typescript
// Detecteer of we in Tauri draaien
const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// In Tauri mode: direct naar de bridge URL
// In web mode: relatieve URL (Vite proxy handelt het af)
const API = IS_TAURI ? 'http://127.0.0.1:5174/api' : '/api';

// Alle fetch calls gebruiken al `${API}/...` — geen verdere wijzigingen nodig!
```

Dit is letterlijk een **one-line change** in de bestaande code.

#### Stap 6: NPM dependencies installeren (5 minuten)

```bash
cd /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/web

# Tauri frontend packages
npm install @tauri-apps/api @tauri-apps/plugin-shell @tauri-apps/plugin-process \
  @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-os

# Tauri CLI (dev dependency)
npm install -D @tauri-apps/cli
```

#### Stap 7: Vite config aanpassen (5 minuten)

Pas `web/vite.config.ts` aan zoals beschreven in [sectie 5](#5-vite-config-changes).

#### Stap 8: Testen! (10 minuten)

```bash
cd /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/web

# Development mode — opent native window met hot reload
npm run tauri:dev

# Of via cargo:
cd ../src-tauri && cargo tauri dev
```

**Verwacht resultaat:**
1. Vite dev server start op poort 5173
2. Tauri start Python bridge op poort 5174
3. Native window opent met de Open Agents UI
4. Hot reload werkt voor frontend wijzigingen
5. Agent spawning, monitoring, messaging — alles werkt via de sidecar bridge

#### Stap 9: Eerste build (15 minuten)

```bash
cd /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/web

# Production build — maakt installer
npm run tauri:build
```

Output verschijnt in `src-tauri/target/release/bundle/`:
- **Windows**: `.exe` (NSIS installer) en `.msi`
- **macOS**: `.dmg` en `.app`
- **Linux**: `.AppImage`, `.deb`

### MVP Checklist

- [ ] `src-tauri/` directory aangemaakt met Tauri init
- [ ] `tauri.conf.json` geconfigureerd (window size, CSP, bundle targets)
- [ ] `Cargo.toml` met alle plugin dependencies
- [ ] `lib.rs` met Python sidecar management
- [ ] `main.rs` entry point
- [ ] `capabilities/default.json` met permissions
- [ ] `vite.config.ts` aangepast voor Tauri
- [ ] `package.json` dependencies toegevoegd
- [ ] `api/client.ts` API base URL dual-mode
- [ ] `npm run tauri:dev` werkt — app opent met werkende UI
- [ ] Agent spawning werkt via de sidecar bridge
- [ ] Agent monitoring werkt (polling /api/agents)
- [ ] Graceful shutdown: Python bridge wordt gestopt bij app close

---

## 9. Roadmap: MVP → Full Product

### Phase 1: MVP (Week 1)
**Status: Dit document beschrijft deze fase.**

- Tauri shell rond bestaande React app
- Python sidecar management
- Werkende desktop app met alle huidige functionaliteit
- Development workflow: `npm run tauri:dev`
- Eerste builds voor Windows/Linux

### Phase 2: Native Integratie (Week 2-3)

| Feature | Implementatie |
|---------|---------------|
| **System Tray** | Tauri `tray-icon` feature — agent status in tray, snel spawnen |
| **Desktop Notifications** | `tauri-plugin-notification` — bij agent completion/failure |
| **Global Hotkey** | `tauri-plugin-global-shortcut` — Ctrl+Shift+O opent dashboard |
| **Single Instance** | `tauri-plugin-single-instance` — voorkom dubbele apps |
| **Native Menus** | Tauri menu API — File, Edit, View, Agents menu |
| **Window State** | Persist window positie/grootte tussen sessies |

### Phase 3: Auto-Update & Distribution (Week 3-4)

| Feature | Implementatie |
|---------|---------------|
| **Auto-Update** | `tauri-plugin-updater` + GitHub Releases |
| **CI/CD Builds** | GitHub Actions met `tauri-action` voor multi-platform builds |
| **Code Signing** | Windows (Authenticode) + macOS (Apple Developer) |
| **Crash Reporting** | Structured logging + crash dump uploads |
| **Update Channel** | Stable / Beta update channels |

GitHub Actions workflow:

```yaml
# .github/workflows/release.yml
name: Release Desktop App
on:
  push:
    tags: ['v*']

jobs:
  release:
    strategy:
      matrix:
        platform: [ubuntu-22.04, windows-latest, macos-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: dtolnay/rust-toolchain@stable
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__
          releaseName: 'Open Agents v__VERSION__'
          releaseBody: 'See CHANGELOG.md for details.'
          releaseDraft: true
```

### Phase 4: Bundled Python Runtime (Week 4-6)

Het grootste probleem voor eindgebruikers: Python moet geïnstalleerd zijn.

**Oplossing: PyInstaller of PyOxidizer om Python + oa-cli te bundelen als sidecar binary.**

```bash
# PyInstaller: maak een standalone binary van de bridge
cd oa-cli
pyinstaller --onefile --name oa-bridge \
  --hidden-import=open_agents.bridge \
  --hidden-import=flask \
  --hidden-import=flask_cors \
  src/open_agents/bridge.py
```

De resulterende `oa-bridge` binary wordt als Tauri sidecar meegeleverd:

```json
// tauri.conf.json
{
  "bundle": {
    "externalBin": ["binaries/oa-bridge"]
  }
}
```

Tauri's sidecar systeem bundelt platform-specifieke binaries automatisch:
- `binaries/oa-bridge-x86_64-pc-windows-msvc.exe`
- `binaries/oa-bridge-x86_64-unknown-linux-gnu`
- `binaries/oa-bridge-aarch64-apple-darwin`

### Phase 5: Android (Week 6-8)

Tauri 2 ondersteunt Android. Vereist:
- Android SDK + NDK
- `tauri android init`
- UI aanpassingen voor touch/mobile viewport
- Python bridge → moet vervangen worden door Rust of remote server

```bash
# Android project initialiseren
npx tauri android init

# Development APK bouwen
npx tauri android dev

# Release APK
npx tauri android build
```

**Belangrijk:** Android kan geen Python sidecar draaien. Opties:
1. Remote bridge (Python draait op gebruiker's PC, app verbindt via LAN)
2. Rust-native endpoints (Phase 6 — vervangt Python bridge)
3. Chaquopy (Python in Android JVM — experimenteel)

### Phase 6: Rust-Native Backend (Langetermijn)

Geleidelijke migratie van Python naar Rust voor kernfunctionaliteit:

| Python Module | Rust Equivalent | Priority |
|---------------|-----------------|----------|
| `state.py` (agent state) | `src-tauri/src/state.rs` | Hoog |
| `lifecycle.py` (agent lifecycle) | `src-tauri/src/lifecycle.rs` | Hoog |
| `messaging.py` | `src-tauri/src/messaging.rs` | Medium |
| `tmux.py` | `src-tauri/src/tmux.rs` | Medium |
| `workspace.py` | `src-tauri/src/workspace.rs` | Laag |
| `spawner.py` | `src-tauri/src/spawner.rs` | Laag |
| `pipeline.py` | `src-tauri/src/pipeline.rs` | Laag |

Dit is een **geleidelijk proces** — elke module kan onafhankelijk gemigreerd worden terwijl de Python fallback blijft werken.

---

## 10. Risks & Mitigations

### Risk 1: WSL2 Development Flow

**Probleem:** Tauri gebruikt het Windows WebView (Edge/WebView2) maar de code leeft in WSL2. Tauri GUI apps draaien niet natively in WSL2.

**Mitigatie:**
1. **Ontwikkel Tauri op Windows side** — clone repo naar Windows filesystem (`C:\Users\...`) voor Tauri dev
2. **Of gebruik WSLg** — Windows 11 met WSLg kan GUI apps vanuit WSL2 tonen
3. **Python backend blijft in WSL** — sidecar kan WSL's Python aanroepen via `wsl.exe python3 -m ...`
4. **CI/CD doet de builds** — lokale builds zijn niet noodzakelijk als GitHub Actions het afhandelt

**Aanbeveling:** Gebruik de Windows-side path (`/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents`) voor Tauri development. Het project staat daar al.

### Risk 2: Python Dependency voor Eindgebruikers

**Probleem:** Gebruikers moeten Python 3.10+ en alle oa-cli dependencies geïnstalleerd hebben.

**Mitigatie:**
1. **MVP:** Duidelijke error message bij ontbrekende Python + installatie-link
2. **Phase 4:** Bundled Python runtime via PyInstaller sidecar binary
3. **Phase 6:** Rust-native backend verwijdert Python dependency geheel

### Risk 3: Cross-Platform Builds

**Probleem:** macOS builds vereisen macOS, Windows builds vereisen Windows.

**Mitigatie:**
1. **GitHub Actions matrix build** — elke push naar main bouwt voor alle platforms
2. **`tauri-action`** GitHub Action handelt signing + upload af
3. **macOS signing** vereist Apple Developer account ($99/jaar)
4. **Windows signing** vereist code signing certificate

### Risk 4: WebView Inconsistencies

**Probleem:** Windows gebruikt Edge WebView2, macOS/Linux gebruikt WebKit. CSS/JS kan anders renderen.

**Mitigatie:**
1. Huidige stack (React + TailwindCSS) is cross-browser compatible
2. Vite build target is al geconfigureerd per platform
3. Test op zowel Windows als Linux WebView
4. Vermijd bleeding-edge CSS features

### Risk 5: Python Bridge Port Conflicten

**Probleem:** Poort 5174 kan al bezet zijn (door andere Vite instance of service).

**Mitigatie:**
1. Rust code checkt of poort vrij is voor bridge start
2. Fallback: probeer poorten 5175-5180
3. Frontend krijgt actieve poort via Tauri invoke command
4. Config optie voor custom port

### Risk 6: tmux Dependency

**Probleem:** tmux is vereist door oa-cli maar niet standaard beschikbaar op Windows/macOS.

**Mitigatie:**
1. **Windows:** tmux draait in WSL — Tauri sidecar roept `wsl.exe tmux ...` aan
2. **macOS/Linux:** `brew install tmux` / `apt install tmux` in prerequisites
3. **Langetermijn:** Vervang tmux door Tauri-managed subprocessen (Phase 6)
4. **Preflight check:** App toont duidelijke foutmelding als tmux niet gevonden wordt

### Risk 7: App Size

**Probleem:** Electron-achtige apps zijn vaak 100MB+.

**Mitigatie:**
1. Tauri is **veel kleiner** — typisch 5-15 MB voor de app zelf (gebruikt systeem WebView)
2. Python sidecar binary (PyInstaller) is ~30-50 MB
3. Totaal: ~50-70 MB vs. ~200 MB+ voor Electron equivalent
4. Open PDF Studio (Tauri) is ~44 MB — vergelijkbaar referentiepunt

---

## Appendix A: Open PDF Studio Vergelijking

| Aspect | Open PDF Studio | Open Agents (Plan) |
|--------|-----------------|-------------------|
| **Framework** | Tauri 2.10.2 | Tauri 2.x (latest) |
| **Frontend** | SolidJS + Vite 7.3.1 | React 19 + Vite 7.3.1 |
| **Backend** | Pure Rust | Rust + Python sidecar |
| **Plugins** | 10 plugins | 5 plugins (MVP), 11 (full) |
| **Platforms** | Win, Mac, Linux, Android | Win, Linux (MVP), Mac, Android (later) |
| **Bundle size** | ~44 MB | ~50-70 MB (met Python sidecar) |
| **State mgmt** | SolidJS stores | Zustand |
| **Build tool** | Vite 7 | Vite 7 |
| **Auto-update** | tauri-plugin-updater | tauri-plugin-updater (Phase 3) |

**Wat we overnemen van Open PDF Studio:**
1. Plugin selectie (dialog, fs, shell, process, updater, single-instance)
2. Capability-based security model
3. Multi-platform build via GitHub Actions
4. Tray icon pattern
5. Vite + Tauri development workflow

**Waar we afwijken:**
1. React i.p.v. SolidJS (bestaande codebase behouden)
2. Python sidecar i.p.v. pure Rust backend (geleidelijke migratie)
3. tmux integratie (uniek voor Open Agents)

---

## Appendix B: Commando Referentie

```bash
# Development
npm run tauri:dev          # Start dev mode (Vite + Tauri + Python bridge)
npm run dev                # Start alleen de Vite dev server (zonder Tauri)

# Building
npm run tauri:build        # Maak productie-build + installer
npm run build              # Bouw alleen de React frontend

# Tauri CLI
npx tauri info             # Toon systeem info en dependencies
npx tauri icon icon.png    # Genereer alle icon formaten uit één PNG
npx tauri android init     # Initialiseer Android project
npx tauri android dev      # Start Android dev build

# Python bridge standalone (voor debugging)
python -m open_agents.bridge --port 5174
```

---

## Appendix C: Minimal Viable Changes Summary

Voor de MVP zijn er **exact 6 bestanden** die gewijzigd of aangemaakt moeten worden:

| Bestand | Actie | Regels code |
|---------|-------|-------------|
| `web/package.json` | Wijzig | +8 dependencies, +3 scripts |
| `web/vite.config.ts` | Wijzig | +15 regels (Tauri conditionals) |
| `web/src/api/client.ts` | Wijzig | +3 regels (IS_TAURI + API_BASE) |
| `src-tauri/tauri.conf.json` | Nieuw | ~60 regels |
| `src-tauri/Cargo.toml` | Nieuw | ~25 regels |
| `src-tauri/src/lib.rs` | Nieuw | ~80 regels |
| `src-tauri/src/main.rs` | Nieuw | ~5 regels |
| `src-tauri/capabilities/default.json` | Nieuw | ~15 regels |

**Totaal: 3 bestaande bestanden gewijzigd (minimaal), 5 nieuwe bestanden.**

De bestaande React components, stores, types, en Python backend blijven **100% ongewijzigd**.

---

*Plan opgesteld door tauri-architect agent | Open-Agents platform | 2026-03-08*
