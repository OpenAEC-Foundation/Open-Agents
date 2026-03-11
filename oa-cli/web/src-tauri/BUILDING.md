# Building the Open Agents Desktop App

## Prerequisites

- **Rust** — install via [rustup](https://rustup.rs/): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** — v18 or later
- **pnpm** — `npm install -g pnpm`
- **Tauri CLI** — installed automatically via `pnpm tauri`

### Platform-specific dependencies

**Linux (Ubuntu/Debian):**
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Install [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- WebView2 is bundled with Windows 10/11

## Development

```bash
cd oa-cli/web
pnpm install
pnpm tauri:dev
```

The dev server starts at `http://localhost:5173`. Tauri hot-reloads on Rust changes.

## Production Build

```bash
cd oa-cli/web
pnpm install
pnpm tauri:build
```

Bundles are written to `src-tauri/target/release/bundle/`.

## Platform Notes

| Platform | Output formats | Notes |
|----------|---------------|-------|
| **Linux** | `.appimage`, `.deb` | Requires libwebkit2gtk-4.1 at runtime |
| **macOS** | `.dmg`, `.app` | Notarization required for distribution |
| **Windows** | `.msi`, `.exe` (NSIS) | Installs per-user by default |

## IPC Commands

The desktop app exposes these Tauri commands:

| Command | Description |
|---------|-------------|
| `invoke_oa` | Run any `oa` CLI command and get JSON/string back |
| `get_bridge_status` | Whether the Python bridge process is running |
| `get_bridge_health` | Health + restart count of the Python bridge |
| `restart_bridge` | Manually restart the Python bridge |

### TypeScript usage

```typescript
import { invokeOa, IS_TAURI } from '@/api/tauri-bridge';

// Run: oa status
const status = await invokeOa('status');

// Run: oa run "task" --name agent1 --model claude/sonnet --direct
const result = await invokeOa('run', ['task', '--name', 'agent1', '--model', 'claude/sonnet', '--direct']);
```
