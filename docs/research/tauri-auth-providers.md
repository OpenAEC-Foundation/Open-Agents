# Tauri 2 — Multi-Provider LLM Authentication

**Datum:** 2026-03-08
**Auteur:** auth-researcher (oa-agent)
**Doel:** Onderzoek hoe je in een Tauri 2 app detecteert welke CLI-tools (claude, codex, ollama) beschikbaar zijn en hoe je een browser-gebaseerde login-flow start.

---

## Inhoudsopgave

1. [Benodigde Tauri Plugins](#1-benodigde-tauri-plugins)
2. [CLI-tool detectie via Shell Plugin](#2-cli-tool-detectie-via-shell-plugin)
3. [Login-flow starten vanuit Tauri](#3-login-flow-starten-vanuit-tauri)
4. [Auth state opslaan](#4-auth-state-opslaan)
5. [Provider-selectie UI (first-run wizard)](#5-provider-selectie-ui-first-run-wizard)
6. [Volledige voorbeeldcode](#6-volledige-voorbeeldcode)
7. [Samenvatting architectuurbeslissingen](#7-samenvatting-architectuurbeslissingen)

---

## 1. Benodigde Tauri Plugins

Voor een multi-provider LLM auth-systeem heb je de volgende Tauri 2 plugins nodig:

| Plugin | Functie | Cargo crate |
|--------|---------|-------------|
| `tauri-plugin-shell` | CLI-tool detectie, login-commando's spawnen | `tauri-plugin-shell` |
| `tauri-plugin-stronghold` | Encrypted opslag van auth-tokens | `tauri-plugin-stronghold` |
| `tauri-plugin-opener` | Browser openen voor OAuth flows | `tauri-plugin-opener` |
| `tauri-plugin-store` | Lichtgewicht JSON config (niet-encrypted) | `tauri-plugin-store` |

### Cargo.toml

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-stronghold = "2"
tauri-plugin-opener = "2"
tauri-plugin-store = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

### package.json (frontend dependencies)

```bash
npm install @tauri-apps/plugin-shell
npm install @tauri-apps/plugin-stronghold
npm install @tauri-apps/plugin-opener
npm install @tauri-apps/plugin-store
npm install @tauri-apps/api
```

### Initialisatie in lib.rs

```rust
use tauri::Manager;

pub fn run() {
    let salt_path = /* zie sectie 4 */;

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let salt_path = app
                .path()
                .app_local_data_dir()?
                .join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            detect_providers,
            start_provider_login,
            get_provider_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 2. CLI-tool detectie via Shell Plugin

### Aanpak

Gebruik `which` (Linux/macOS) of `where` (Windows) om te detecteren of een CLI-tool beschikbaar is in het PATH. Dit is de meest betrouwbare methode — het hoeft niet eens uitvoerbaar te zijn; als het commando bestaat en een pad teruggeeft, is de tool geïnstalleerd.

### Rust backend: detect_providers command

```rust
use tauri::command;
use tauri_plugin_shell::ShellExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderStatus {
    pub name: String,
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub authenticated: bool,
}

/// Detecteer welke LLM CLI-tools geïnstalleerd zijn
#[command]
pub async fn detect_providers(
    app: tauri::AppHandle,
) -> Result<Vec<ProviderStatus>, String> {
    let shell = app.shell();
    let providers = vec!["claude", "codex", "ollama"];
    let mut results = Vec::new();

    for provider in providers {
        let status = check_provider(&shell, provider).await;
        results.push(status);
    }

    Ok(results)
}

async fn check_provider(
    shell: &tauri_plugin_shell::Shell<tauri::Wry>,
    name: &str,
) -> ProviderStatus {
    // Detecteer pad via `which` (Linux/macOS) of `where` (Windows)
    let which_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };

    let path_result = shell
        .command(which_cmd)
        .args([name])
        .output()
        .await;

    let (installed, path) = match path_result {
        Ok(output) if output.status.success() => {
            let p = String::from_utf8_lossy(&output.stdout)
                .trim()
                .to_string();
            (true, Some(p))
        }
        _ => (false, None),
    };

    // Haal versie op als de tool beschikbaar is
    let version = if installed {
        get_version(shell, name).await
    } else {
        None
    };

    ProviderStatus {
        name: name.to_string(),
        installed,
        path,
        version,
        authenticated: false, // wordt later ingevuld via auth-check
    }
}

async fn get_version(
    shell: &tauri_plugin_shell::Shell<tauri::Wry>,
    name: &str,
) -> Option<String> {
    let output = shell
        .command(name)
        .args(["--version"])
        .output()
        .await
        .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}
```

### Capabilities configuratie

Sla op als `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "LLM provider detection capabilities",
  "windows": ["main"],
  "permissions": [
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "which",
          "cmd": "which",
          "args": [{ "validator": "^(claude|codex|ollama)$" }],
          "sidecar": false
        },
        {
          "name": "where",
          "cmd": "where",
          "args": [{ "validator": "^(claude|codex|ollama)$" }],
          "sidecar": false
        },
        {
          "name": "claude",
          "cmd": "claude",
          "args": [{ "validator": ".*" }],
          "sidecar": false
        },
        {
          "name": "codex",
          "cmd": "codex",
          "args": [{ "validator": ".*" }],
          "sidecar": false
        },
        {
          "name": "ollama",
          "cmd": "ollama",
          "args": [{ "validator": ".*" }],
          "sidecar": false
        }
      ]
    },
    "shell:allow-spawn",
    "shell:allow-kill",
    "stronghold:default",
    "opener:default",
    "store:default"
  ]
}
```

### TypeScript frontend: provider detectie

```typescript
import { invoke } from '@tauri-apps/api/core';

interface ProviderStatus {
  name: string;
  installed: boolean;
  path: string | null;
  version: string | null;
  authenticated: boolean;
}

export async function detectProviders(): Promise<ProviderStatus[]> {
  return await invoke<ProviderStatus[]>('detect_providers');
}

// Gebruik in een React/Svelte component
async function loadProviders() {
  const providers = await detectProviders();

  for (const p of providers) {
    if (p.installed) {
      console.log(`✅ ${p.name} gevonden op ${p.path} (${p.version})`);
    } else {
      console.log(`❌ ${p.name} niet geïnstalleerd`);
    }
  }

  return providers;
}
```

---

## 3. Login-flow starten vanuit Tauri

### Strategie per provider

| Provider | Login-methode | Aanpak |
|----------|--------------|--------|
| **Claude** | `claude` CLI → opent browser | Shell spawn + stdout monitoren |
| **Codex** | `codex` CLI → opent browser | Shell spawn + stdout monitoren |
| **Ollama** | Geen auth nodig | Controleer `ollama list` voor lokale modellen |

### Rust backend: start_provider_login

```rust
use tauri_plugin_shell::process::CommandEvent;

#[command]
pub async fn start_provider_login(
    app: tauri::AppHandle,
    provider: String,
) -> Result<String, String> {
    match provider.as_str() {
        "claude" => start_claude_login(&app).await,
        "codex" => start_codex_login(&app).await,
        "ollama" => check_ollama_status(&app).await,
        _ => Err(format!("Onbekende provider: {}", provider)),
    }
}

async fn start_claude_login(app: &tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();

    // `claude` opent automatisch een browser voor OAuth
    // We spawnen het proces en luisteren naar de output
    let (mut rx, child) = shell
        .command("claude")
        .args(["auth", "login"])
        .spawn()
        .map_err(|e| format!("Kon claude niet starten: {}", e))?;

    // Verwerk output events asynchroon
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line);
                    println!("[claude login] {}", text);
                    // Stuur progress naar frontend via app events
                }
                CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    eprintln!("[claude login err] {}", text);
                }
                CommandEvent::Terminated(status) => {
                    println!("[claude login] Afgesloten met status: {:?}", status);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok("Login gestart — volg de instructies in de browser".to_string())
}

async fn start_codex_login(app: &tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();

    // codex login werkt vergelijkbaar — opent een browser
    let (mut rx, _child) = shell
        .command("codex")
        .args(["login"])
        .spawn()
        .map_err(|e| format!("Kon codex niet starten: {}", e))?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Terminated(_) = event {
                break;
            }
        }
    });

    Ok("Codex login gestart".to_string())
}

async fn check_ollama_status(app: &tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();

    // Ollama heeft geen login nodig — controleer of de server draait
    let output = shell
        .command("ollama")
        .args(["list"])
        .output()
        .await
        .map_err(|e| format!("Kon ollama niet bereiken: {}", e))?;

    if output.status.success() {
        let models = String::from_utf8_lossy(&output.stdout);
        Ok(format!("Ollama actief. Beschikbare modellen:\n{}", models))
    } else {
        Err("Ollama server niet bereikbaar. Start met `ollama serve`.".to_string())
    }
}
```

### TypeScript frontend: login initiëren

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export async function startProviderLogin(provider: string): Promise<string> {
  return await invoke<string>('start_provider_login', { provider });
}

// Luister naar login-voortgang events
export async function listenToLoginProgress(
  callback: (message: string) => void
) {
  return await listen<string>('login-progress', (event) => {
    callback(event.payload);
  });
}
```

---

## 4. Auth State Opslaan

### Aanpak: twee lagen

1. **Stronghold** — voor gevoelige tokens (API-keys, OAuth tokens)
2. **Store (JSON)** — voor niet-gevoelige config (welke provider actief is, display name)

### Auth state opslaan in Stronghold

```typescript
import { Client, Stronghold } from '@tauri-apps/plugin-stronghold';
import { appDataDir } from '@tauri-apps/api/path';

const VAULT_PASSWORD = 'user-derived-or-fixed-key'; // Ideaal: van user PIN

async function initStronghold(): Promise<{ stronghold: Stronghold; client: Client }> {
  const vaultPath = `${await appDataDir()}/llm-auth.hold`;
  const stronghold = await Stronghold.load(vaultPath, VAULT_PASSWORD);

  let client: Client;
  try {
    client = await stronghold.loadClient('llm-providers');
  } catch {
    client = await stronghold.createClient('llm-providers');
  }

  return { stronghold, client };
}

export async function saveProviderToken(
  provider: string,
  token: string
): Promise<void> {
  const { stronghold, client } = await initStronghold();
  const store = client.getStore();

  const encoded = Array.from(new TextEncoder().encode(token));
  await store.insert(`token:${provider}`, encoded);
  await stronghold.save();
}

export async function getProviderToken(
  provider: string
): Promise<string | null> {
  const { client } = await initStronghold();
  const store = client.getStore();

  try {
    const data = await store.get(`token:${provider}`);
    return new TextDecoder().decode(new Uint8Array(data));
  } catch {
    return null;
  }
}

export async function removeProviderToken(provider: string): Promise<void> {
  const { stronghold, client } = await initStronghold();
  const store = client.getStore();
  await store.remove(`token:${provider}`);
  await stronghold.save();
}
```

### Provider config opslaan in Store (JSON)

```typescript
import { load } from '@tauri-apps/plugin-store';

interface ProviderConfig {
  activeProvider: string | null;
  providers: Record<string, {
    enabled: boolean;
    lastLoginAt: string | null;
  }>;
}

async function getStore() {
  return await load('llm-config.json', { autoSave: true });
}

export async function setActiveProvider(provider: string): Promise<void> {
  const store = await getStore();
  await store.set('activeProvider', provider);
}

export async function getActiveProvider(): Promise<string | null> {
  const store = await getStore();
  return await store.get<string>('activeProvider') ?? null;
}

export async function markProviderAuthenticated(
  provider: string,
  authenticated: boolean
): Promise<void> {
  const store = await getStore();
  const config = await store.get<ProviderConfig['providers']>('providers') ?? {};
  config[provider] = {
    enabled: authenticated,
    lastLoginAt: authenticated ? new Date().toISOString() : null,
  };
  await store.set('providers', config);
}
```

---

## 5. Provider-selectie UI (First-run Wizard)

### Patroon

Een first-run wizard detecteert automatisch beschikbare providers en laat de gebruiker de gewenste provider kiezen en inloggen. Het bestaat uit drie stappen:

1. **Detectie** — welke CLI-tools zijn geïnstalleerd?
2. **Selectie** — kies een primaire provider
3. **Authenticatie** — start de login-flow voor de gekozen provider

### Svelte component voorbeeld

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { detectProviders, startProviderLogin } from '$lib/providers';
  import { setActiveProvider, markProviderAuthenticated } from '$lib/store';

  type Step = 'detecting' | 'select' | 'login' | 'done' | 'error';

  let step: Step = 'detecting';
  let providers: ProviderStatus[] = [];
  let selectedProvider = '';
  let loginMessage = '';
  let errorMessage = '';

  onMount(async () => {
    try {
      providers = await detectProviders();
      const installed = providers.filter(p => p.installed);

      if (installed.length === 0) {
        step = 'error';
        errorMessage = 'Geen LLM CLI-tools gevonden. Installeer claude, codex of ollama.';
      } else if (installed.length === 1) {
        // Automatisch selecteren als er maar één optie is
        selectedProvider = installed[0].name;
        step = 'login';
        await handleLogin();
      } else {
        step = 'select';
      }
    } catch (e) {
      step = 'error';
      errorMessage = String(e);
    }
  });

  async function selectProvider(name: string) {
    selectedProvider = name;
    step = 'login';
    await handleLogin();
  }

  async function handleLogin() {
    try {
      loginMessage = await startProviderLogin(selectedProvider);

      // Voor claude/codex: wacht tot de gebruiker de browser-flow afrondt
      // Dan check je de auth-status
      await setActiveProvider(selectedProvider);
      await markProviderAuthenticated(selectedProvider, true);
      step = 'done';
    } catch (e) {
      step = 'error';
      errorMessage = String(e);
    }
  }
</script>

{#if step === 'detecting'}
  <div class="wizard-step">
    <h2>Beschikbare providers detecteren...</h2>
    <p>Even geduld.</p>
  </div>

{:else if step === 'select'}
  <div class="wizard-step">
    <h2>Kies je LLM Provider</h2>
    <p>De volgende tools zijn gevonden op je systeem:</p>
    <div class="provider-grid">
      {#each providers.filter(p => p.installed) as provider}
        <button
          class="provider-card"
          on:click={() => selectProvider(provider.name)}
        >
          <span class="provider-icon">{providerIcon(provider.name)}</span>
          <span class="provider-name">{provider.name}</span>
          <span class="provider-version">{provider.version ?? ''}</span>
        </button>
      {/each}
    </div>
  </div>

{:else if step === 'login'}
  <div class="wizard-step">
    <h2>Inloggen bij {selectedProvider}</h2>
    <p>{loginMessage}</p>
    <p class="hint">De browser is geopend. Volg de instructies en kom dan terug.</p>
  </div>

{:else if step === 'done'}
  <div class="wizard-step success">
    <h2>Klaar!</h2>
    <p>Je bent ingelogd bij <strong>{selectedProvider}</strong>.</p>
    <button on:click={() => dispatch('complete', selectedProvider)}>
      Verder →
    </button>
  </div>

{:else if step === 'error'}
  <div class="wizard-step error">
    <h2>Er ging iets mis</h2>
    <p>{errorMessage}</p>
  </div>
{/if}

<style>
  .provider-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .provider-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .provider-card:hover {
    border-color: #6366f1;
    background: #f0f0ff;
  }
</style>
```

---

## 6. Volledige Voorbeeldcode

### Bestandsstructuur

```
src-tauri/src/
├── lib.rs              # Plugin initialisatie + invoke handler registratie
├── providers.rs        # detect_providers, start_provider_login commands
└── auth.rs             # Auth state management (Rust-zijde)

src/lib/
├── providers.ts        # TypeScript wrappers voor Tauri commands
├── store.ts            # Config/auth state management
└── stronghold.ts       # Encrypted token opslag

src/components/
└── ProviderWizard.svelte   # First-run wizard component
```

### Volledige providers.rs

```rust
use tauri::command;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderStatus {
    pub name: String,
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub authenticated: bool,
}

#[command]
pub async fn detect_providers(app: tauri::AppHandle) -> Result<Vec<ProviderStatus>, String> {
    let shell = app.shell();
    let mut results = Vec::new();

    for name in &["claude", "codex", "ollama"] {
        let which_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };

        let path_out = shell
            .command(which_cmd)
            .args([name])
            .output()
            .await;

        let (installed, path) = match path_out {
            Ok(o) if o.status.success() => {
                let p = String::from_utf8_lossy(&o.stdout).trim().to_string();
                (true, Some(p))
            }
            _ => (false, None),
        };

        let version = if installed {
            shell.command(name).args(["--version"]).output().await.ok()
                .filter(|o| o.status.success())
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        } else {
            None
        };

        results.push(ProviderStatus {
            name: name.to_string(),
            installed,
            path,
            version,
            authenticated: false,
        });
    }

    Ok(results)
}

#[command]
pub async fn start_provider_login(
    app: tauri::AppHandle,
    provider: String,
) -> Result<String, String> {
    let shell = app.shell();

    let (cmd, args): (&str, Vec<&str>) = match provider.as_str() {
        "claude" => ("claude", vec!["auth", "login"]),
        "codex"  => ("codex",  vec!["login"]),
        "ollama" => {
            // Ollama heeft geen login — controleer server
            let out = shell.command("ollama").args(["list"]).output().await
                .map_err(|e| e.to_string())?;
            return if out.status.success() {
                Ok(format!("Ollama actief:\n{}", String::from_utf8_lossy(&out.stdout)))
            } else {
                Err("Start ollama eerst met `ollama serve`".to_string())
            };
        }
        _ => return Err(format!("Onbekende provider: {}", provider)),
    };

    let (mut rx, _child) = shell
        .command(cmd)
        .args(args)
        .spawn()
        .map_err(|e| format!("Kon {} niet starten: {}", cmd, e))?;

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let msg = String::from_utf8_lossy(&line).to_string();
                    let _ = app_handle.emit("login-progress", &msg);
                }
                CommandEvent::Terminated(_) => break,
                _ => {}
            }
        }
    });

    Ok(format!("{} login gestart — volg de browser-instructies", provider))
}

#[command]
pub async fn get_provider_status(
    app: tauri::AppHandle,
    provider: String,
) -> Result<bool, String> {
    let shell = app.shell();

    // Simpele check: kan het commando uitvoeren?
    let test_args: Vec<&str> = match provider.as_str() {
        "claude" => vec!["--version"],
        "codex"  => vec!["--version"],
        "ollama" => vec!["list"],
        _ => return Err("Onbekende provider".to_string()),
    };

    let output = shell
        .command(&provider)
        .args(test_args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    Ok(output.status.success())
}
```

---

## 7. Samenvatting Architectuurbeslissingen

### CLI Detectie
- **`which`/`where`** is de juiste aanpak voor PATH-detectie. Geen eigen file-scanning.
- Valideer de args in capabilities met een stricte regex om command-injection te voorkomen.

### Login Flow
- **Claude**: `claude auth login` — opent de browser automatisch via het CLI.
- **Codex**: `codex login` — vergelijkbaar patroon.
- **Ollama**: geen auth — controleer alleen of de server draait via `ollama list`.
- Spawn het proces asynchroon en luister naar stdout voor voortgang via Tauri events.

### Auth State Opslag
- **Gevoelige data** (tokens, keys) → `tauri-plugin-stronghold` (AES-256 encrypted, IOTA engine).
- **Config** (actieve provider, instellingen) → `tauri-plugin-store` (JSON, niet encrypted).
- Combineer beide voor een pragmatische oplossing.

### UI Patroon
- First-run wizard met drie stappen: detectie → selectie → authenticatie.
- Auto-selecteer als slechts één provider aanwezig is.
- Gebruik Tauri events (`app.emit`) om login-voortgang real-time naar de UI te sturen.

### Security
- Beperk shell permissions via capabilities met stricte `validator` regex.
- Sla nooit tokens op in plaintext; gebruik altijd Stronghold.
- Laat de CLI-tool de browser openen — nooit zelf een OAuth flow implementeren.

---

*Gegenereerd door auth-researcher agent op 2026-03-08*
