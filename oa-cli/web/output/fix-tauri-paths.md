# Fix Tauri Paths — Result

## Gewijzigde bestanden

### 1. `.github/workflows/tauri-release.yml`

**Fix 1: Rust cache workspace**
```diff
- workspaces: oa-cli/src-tauri -> target
+ workspaces: oa-cli/web/src-tauri -> target
```

**Fix 2: Sidecar download path**
```diff
- path: oa-cli/src-tauri/binaries/
+ path: oa-cli/web/src-tauri/binaries/
```

**Fix 3: Sidecar chmod path**
```diff
- run: chmod +x oa-cli/src-tauri/binaries/${{ matrix.binary-name }}
+ run: chmod +x oa-cli/web/src-tauri/binaries/${{ matrix.binary-name }}
```

### 2. `oa-cli/web/src-tauri/tauri.conf.json`

**Fix 4: beforeDevCommand**
```diff
- "beforeDevCommand": "npm run dev",
+ "beforeDevCommand": "pnpm dev",
```

**Fix 5: beforeBuildCommand**
```diff
- "beforeBuildCommand": "npm run build"
+ "beforeBuildCommand": "pnpm build"
```

## Samenvatting

Alle 3 scope-items zijn direct aangepast:
1. Sidecar download path gecorrigeerd naar `oa-cli/web/src-tauri/binaries/`
2. Rust cache workspace gecorrigeerd naar `oa-cli/web/src-tauri -> target`
3. tauri.conf.json commands gewijzigd van `npm run dev/build` naar `pnpm dev/build`
