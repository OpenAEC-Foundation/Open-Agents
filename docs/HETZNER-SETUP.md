# Hetzner Server Setup — Open-Agents

> Handleiding voor het inrichten van de Hetzner GPU server als agent execution node.

---

## Vereisten

| Vereiste | Details |
|----------|---------|
| SSH key | `~/.ssh/config` met `Host hetzner-agent` alias |
| Claude CLI auth | `claude auth login` uitgevoerd op Hetzner (OAuth via browser) |
| oa-cli geïnstalleerd | Op de Hetzner server als niet-root gebruiker (`oa-agent`) |
| GitHub PAT | Fine-grained token met toegang tot OpenAEC-Foundation/Open-Agents |
| Python 3 | Op de Hetzner server (standaard aanwezig) |

### SSH config voorbeeld (`~/.ssh/config`)

```sshconfig
Host hetzner-agent
    HostName <IP_ADRES>
    User oa-agent
    IdentityFile ~/.ssh/id_hetzner
    ServerAliveInterval 60
```

### GitHub PAT instellen

Token bewaren als configuratiewaarde (aanbevolen):

```bash
oa set github_pat github_pat_11BYF5N7A0...
```

Of als tijdelijke omgevingsvariabele:

```bash
export GITHUB_PAT=github_pat_11BYF5N7A0...
```

De token moet **Contents (read)** rechten hebben op `OpenAEC-Foundation/Open-Agents`.

---

## Eerste keer setup

```bash
# 1. Zorg dat GITHUB_PAT beschikbaar is (zie boven)
# 2. Voer het setup script uit vanuit de repo root:
bash scripts/setup-hetzner-repo.sh
```

Het script:
1. Test SSH verbinding naar `hetzner-agent`
2. Bouwt een geauthenticeerde clone URL (`https://TOKEN@github.com/...`)
3. Kloont de repo naar `/home/oa-agent/Open-Agents` als deze nog niet bestaat
4. Doet `git pull --ff-only` als de repo al aanwezig is
5. Schrijft `~/.oa/config.json` op Hetzner met correcte `remote_repo_path`

Het script is **idempotent** — je kunt het meerdere keren uitvoeren zonder schade.

---

## Hoe agents werken op Hetzner

### Path mapping

Prompts en taken bevatten WSL-paden (`/mnt/c/Users/Freek Heijting/...`). Deze worden automatisch vertaald naar Hetzner-paden via `_map_paths_for_remote()` in `spawner.py`:

| WSL pad | Hetzner pad |
|---------|-------------|
| `/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents/` | `/home/oa-agent/Open-Agents/` |

Configuratie in `~/.oa/config.json`:

```json
{
  "remote_wsl_path_prefix": "/mnt/c/Users/Freek Heijting/Documents/GitHub/Open-Agents",
  "remote_repo_path": "/home/oa-agent/Open-Agents"
}
```

### Git sync

Bij elk spawn van een Claude agent via `oa run` (model `claude/*` of `hetzner/claude/*`):

1. `_ensure_remote_repo()` controleert of de repo bestaat
2. Als ja: `git pull --ff-only` (best-effort, blokkeert spawn niet bij fout)
3. Als nee: `git clone https://TOKEN@github.com/OpenAEC-Foundation/Open-Agents.git`

De PAT wordt gelezen uit `GITHUB_PAT` env var of `~/.oa/config.json` key `"github_pat"`.

### Workspace flow

```
[lokaal] oa run → create_workspace() → sync_workspace_to_remote() via SCP
                                              ↓
                                    /tmp/oa-agent-<name>/ op Hetzner
                                              ↓
                               claude --dangerously-skip-permissions -p "Lees CLAUDE.md..."
                                              ↓
                               output/result.md + .done
                                              ↓
[lokaal] oa collect <name> → SCP output terug naar lokale workspace
```

### Ubuntu paden in agent workspace

Agents draaien in `/tmp/oa-agent-<name>/` op Hetzner. Paden in CLAUDE.md zijn al vertaald:

- Input bestanden: `/home/oa-agent/Open-Agents/...`
- Output bestanden: `./output/result.md` (relatief aan workspace)

---

## Troubleshooting

### 401 auth error bij agent spawn

```
Failed to authenticate. API Error: 401 {"type":"error","error":{"type":"authentication_error"...
```

**Oorzaak**: OAuth token van Claude CLI is verlopen op Hetzner.

**Oplossing**:

```bash
# Methode 1: Automatisch (headless via explorer.exe)
python3 scripts/claude-auth-headless.py hetzner-agent

# Methode 2: Handmatig
ssh hetzner-agent 'claude auth login'
# Kopieer de OAuth URL → open in Windows browser → autoriseert automatisch
```

Zie lesson `L-096` in de CLAUDE.md voor de headless OAuth flow.

---

### Git clone mislukt (401 / repository not found)

**Oorzaak**: Geen of onjuist GitHub PAT.

**Controleer**:

```bash
# Is PAT geconfigureerd?
oa get github_pat
# OF
cat ~/.oa/config.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('github_pat','(leeg)'))"
```

**Oplossing**:

```bash
oa set github_pat github_pat_11BYF5N7A0...
# Of tijdelijk:
export GITHUB_PAT=github_pat_11BYF5N7A0...
bash scripts/setup-hetzner-repo.sh
```

---

### Pad niet gevonden in agent (`No such file or directory`)

**Oorzaak**: Path mapping is niet geconfigureerd of WSL prefix klopt niet.

**Controleer**:

```bash
cat ~/.oa/config.json | python3 -c "
import json, sys
c = json.load(sys.stdin)
print('wsl_prefix:', c.get('remote_wsl_path_prefix'))
print('remote_path:', c.get('remote_repo_path'))
"
```

**Oplossing**: Update `~/.oa/config.json` met de correcte paden en voer het setup script opnieuw uit.

---

### Agent meldt "running as root" fout

**Oorzaak**: SSH verbinding maakt verbinding als `root`. Claude Code weigert `--dangerously-skip-permissions` als root.

**Oplossing**:

```bash
# Maak niet-root gebruiker aan op Hetzner
ssh root@<IP> "adduser oa-agent && usermod -aG sudo oa-agent"
# Update ~/.ssh/config: User oa-agent
```

Zie beslissing D-074 voor achtergrond.

---

### Git pull faalt (diverged branches)

**Oorzaak**: Lokale commits op Hetzner conflicteren met upstream.

**Oplossing**:

```bash
ssh hetzner-agent "cd /home/oa-agent/Open-Agents && git fetch origin && git reset --hard origin/main"
```

> Let op: dit gooit lokale wijzigingen weg. Gebruik alleen als de Hetzner repo puur als read-only mirror dient.

---

## Gerelateerde bestanden

| Bestand | Doel |
|---------|------|
| `oa-cli/src/open_agents/spawner.py` | `_ensure_remote_repo()` en `_build_authenticated_git_url()` |
| `oa-cli/src/open_agents/config.py` | `DEFAULT_CONFIG["github_pat"]` en `DEFAULT_CONFIG["remote_repo_git_url"]` |
| `scripts/setup-hetzner-repo.sh` | Eenmalig setup script |
| `scripts/claude-auth-headless.py` | OAuth refresh voor Claude CLI op Hetzner |
| `~/.oa/config.json` | Lokale configuratie (niet in repo) |
| `~/.ssh/config` | SSH alias `hetzner-agent` |

---

*Aangemaakt: 2026-03-12 door hetzner-sync agent*
*Zie ook: DECISIONS.md D-061, D-076, D-079*
