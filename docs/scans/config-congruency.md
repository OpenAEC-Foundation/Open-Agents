# Config Congruency Report

**Generated:** 2026-03-08
**Checker:** check-config-congruency agent

## Files Checked

| File | Role |
|------|------|
| `oa-cli/web/package.json` | Frontend package manifest |
| `oa-cli/web/vite.config.ts` | Vite dev server config |
| `oa-cli/web/src-tauri/tauri.conf.json` | Tauri app config |
| `oa-cli/web/src-tauri/Cargo.toml` | Rust crate manifest |
| `oa-cli/src/open_agents/config.py` | Python CLI config defaults |
| `.github/workflows/tauri-release.yml` | CI/CD release pipeline |

---

## 🔴 Critical Issues (Break the Build)

### 1. Sidecar Binary Downloaded to Wrong Path

**Files:** `tauri-release.yml`
**Problem:** The workflow downloads the Python sidecar binary to `oa-cli/src-tauri/binaries/`, but the Tauri project root is `oa-cli/web/`, so `src-tauri/` is actually at `oa-cli/web/src-tauri/`. Tauri looks for external binaries relative to `src-tauri/binaries/` inside the project, meaning the expected path is `oa-cli/web/src-tauri/binaries/`.

```yaml
# tauri-release.yml (current — WRONG)
- name: Download Python sidecar binary
  uses: actions/download-artifact@v4
  with:
    name: ${{ matrix.artifact-name }}
    path: oa-cli/src-tauri/binaries/   # ← WRONG: missing /web/
```

**Fix:**
```yaml
    path: oa-cli/web/src-tauri/binaries/
```

---

## 🟡 Potential Issues (May Cause Failures)

### 2. Rust Build Cache Uses Wrong Workspace Path

**Files:** `tauri-release.yml`
**Problem:** The `swatinem/rust-cache` step points to `oa-cli/src-tauri -> target`, but the actual Cargo workspace is at `oa-cli/web/src-tauri`. This means the cache will never hit, causing a full Rust rebuild on every CI run (slower CI, not a broken build).

```yaml
# tauri-release.yml (current — WRONG path)
- name: Cache Rust build artifacts
  uses: swatinem/rust-cache@v2
  with:
    workspaces: oa-cli/src-tauri -> target   # ← should be oa-cli/web/src-tauri
```

**Fix:**
```yaml
    workspaces: oa-cli/web/src-tauri -> target
```

### 3. Package Manager Mismatch: CI uses pnpm, tauri.conf.json uses npm

**Files:** `tauri.conf.json`, `tauri-release.yml`
**Problem:** The CI installs frontend dependencies with `pnpm install --frozen-lockfile`, but `tauri.conf.json` defines `beforeDevCommand` and `beforeBuildCommand` using `npm run ...`. When `tauri-action` runs the build, it invokes `npm run build` — not `pnpm run build`. This works only if `npm` is on the PATH (it is, via the Node.js setup action) and `node_modules` are already installed by pnpm. Fragile in edge cases (e.g. clean environments, local dev with only pnpm).

```json
// tauri.conf.json (current — inconsistent)
"beforeDevCommand": "npm run dev",
"beforeBuildCommand": "npm run build"
```

**Fix:** Change to use pnpm consistently:
```json
"beforeDevCommand": "pnpm dev",
"beforeBuildCommand": "pnpm build"
```

### 4. `devUrl` Uses `localhost` but CSP Uses `127.0.0.1`

**Files:** `tauri.conf.json`
**Problem:** The `devUrl` and CSP `connect-src` use different hostname aliases for the bridge:

```json
// tauri.conf.json
"devUrl": "http://localhost:5173"         // frontend: localhost
"connect-src": "http://127.0.0.1:5174"   // bridge: 127.0.0.1
```

On most systems `localhost` resolves to `127.0.0.1`, but in some environments (IPv6-first systems, custom `/etc/hosts`) this can differ. Not a common breakage but worth making consistent.

**Fix:** Pick one and use it everywhere. Prefer `127.0.0.1` for explicitness:
```json
"devUrl": "http://127.0.0.1:5173"
```

---

## 🟢 OK — Consistent

### Versions
All four files agree on version `0.2.0`:

| File | Version |
|------|---------|
| `package.json` | `0.2.0` |
| `tauri.conf.json` | `0.2.0` |
| `Cargo.toml` | `0.2.0` |
| `config.py` DEFAULT_CONFIG | `0.2.0` |

### Port Numbers
| Port | Role | Configured In |
|------|------|--------------|
| `5173` | Vite frontend dev server | `vite.config.ts` (server.port), `tauri.conf.json` (devUrl) |
| `5174` | Python bridge API | `vite.config.ts` (proxy target), `tauri.conf.json` (CSP connect-src) |

Both ports are consistent across all files that reference them.

### Frontend Build Scripts
`tauri.conf.json` calls `npm run dev` / `npm run build`, which map to `vite` / `vite build` in `package.json`. These scripts exist and are correct (issue is the `npm` vs `pnpm` mismatch, logged separately above).

### Tauri Plugin Versions
JS packages (`@tauri-apps/plugin-*: ^2.2.0`) match Rust crates (`tauri-plugin-* = "2"`). Both target Tauri v2 and are compatible.

| Plugin | JS version | Rust version |
|--------|-----------|--------------|
| shell | ^2.2.0 | "2" |
| process | ^2.2.0 | "2" |
| fs | ^2.2.0 | "2" |
| dialog | ^2.2.0 | "2" |
| os | ^2.2.0 | "2" |

### App Name
- `tauri.conf.json productName`: `"Open Agents"` — used for release artifact names
- `Cargo.toml name`: `"open-agents-desktop"` — Rust crate identifier (intentionally different, expected)
- GitHub Release filenames (`Open-Agents_x64-setup.exe`) correctly reflect the productName with hyphen substitution.

### CI `projectPath`
`tauri-action` receives `projectPath: oa-cli/web` which correctly points to the Tauri project root (where `src-tauri/` lives).

---

## Summary

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | 🔴 | Sidecar downloaded to `oa-cli/src-tauri/binaries/` — wrong path | Change to `oa-cli/web/src-tauri/binaries/` |
| 2 | 🟡 | Rust cache workspace path wrong (`oa-cli/src-tauri`) | Change to `oa-cli/web/src-tauri` |
| 3 | 🟡 | `tauri.conf.json` uses `npm`, CI uses `pnpm` | Use `pnpm dev` / `pnpm build` in tauri.conf.json |
| 4 | 🟡 | `devUrl` uses `localhost`, CSP uses `127.0.0.1` | Align to `127.0.0.1` everywhere |
