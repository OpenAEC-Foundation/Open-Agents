# Tauri 2 MVP — Build Summary

**Sprint 18 | Date: 2026-03-08 | Agent: tauri-builder**

## Nieuwe bestanden aangemaakt

| Bestand | Beschrijving |
|---------|--------------|
| `src-tauri/tauri.conf.json` | Tauri configuratie: window (1280×800), CSP, bundle targets (NSIS/MSI/DMG/AppImage/DEB) |
| `src-tauri/Cargo.toml` | Rust dependencies: tauri 2, alle MVP plugins (shell, process, fs, dialog, os) |
| `src-tauri/build.rs` | Standaard Tauri build script |
| `src-tauri/src/main.rs` | Entry point — roept `open_agents_desktop_lib::run()` aan |
| `src-tauri/src/lib.rs` | Rust backend: Python bridge sidecar management, Tauri commands (get_bridge_status, restart_bridge), graceful shutdown |
| `src-tauri/capabilities/default.json` | Permission capabilities: shell spawn/kill, process exit, fs read, dialog open/save, os |
| `src-tauri/icons/` | Directory aangemaakt (icons te genereren via `npx tauri icon icon.png`) |

## Bestaande bestanden gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `web/package.json` | + Tauri scripts (tauri, tauri:dev, tauri:build) + 6 @tauri-apps/* dependencies + @tauri-apps/cli dev dep |
| `web/vite.config.ts` | + clearScreen:false, strictPort:true, conditionele proxy, platform-specifieke build targets, TAURI_ENV_ prefix |
| `web/src/api/client.ts` | + IS_TAURI detectie, API_BASE dual-mode (Tauri: http://127.0.0.1:5174, Web: relative), alle /api calls via API_BASE |

## Architectuur

```
Tauri Desktop App
├── Rust Backend (src-tauri/src/lib.rs)
│   ├── Spawnt Python bridge (python3 -m open_agents.bridge --port 5174)
│   ├── Tauri IPC commands: get_bridge_status, restart_bridge
│   └── Graceful shutdown: kill bridge bij WindowEvent::Destroyed
│
└── WebView (web/ React app — vrijwel ongewijzigd)
    ├── IS_TAURI detectie in client.ts
    └── API calls via API_BASE (http://127.0.0.1:5174 in Tauri, relatief in browser)
```

## Volgende stappen

```bash
# 1. Rust toolchain installeren (als nog niet aanwezig)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. NPM dependencies installeren
cd oa-cli/web && npm install

# 3. App starten in development mode
npm run tauri:dev

# 4. Icons genereren
npx tauri icon path/to/icon.png
```

## Referentie
Plan: `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/docs/design/tauri-desktop-app-plan.md`
