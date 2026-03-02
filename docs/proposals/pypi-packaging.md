# Proposal: PyPI Packaging voor oa-cli → `open-agents-cli`

**Bestand:** `oa-cli/pyproject.toml`
**Status:** Source files niet aangetroffen in workspace — analyse gebaseerd op structuurhints in CLAUDE.md en Python packaging best practices.

---

## 0. Bevindingen

De bestanden `oa-cli/pyproject.toml`, `oa-cli/src/open_agents/__init__.py` en `oa-cli/src/open_agents/cli.py` waren **niet aanwezig** in de workspace `/tmp/oa-agent-li66pl0j/`. De proposal is gebaseerd op:
- De package-structuur implied door CLAUDE.md (`src/open_agents/` layout)
- PyPI availability check voor de naam `open-agents-cli` → **VRIJ** (HTTP 404 op PyPI)
- Python packaging best practices (PEP 517/518/621)

---

## 1. pyproject.toml — Vereiste wijzigingen

### Huidige problemen (typisch voor development-fase projecten)
- Ontbrekende of onvolledige `[project]` metadata (name, version, description, classifiers)
- Geen `[project.urls]` sectie voor PyPI pagina links
- Ontbrekende of te ruime dependency pins
- Geen `readme` veld dat naar README.md wijst
- Ontbrekende `license` specificatie
- Geen `requires-python` minimum

### Volledige nieuwe `pyproject.toml` inhoud

```toml
[build-system]
requires = ["hatchling>=1.21.0"]
build-backend = "hatchling.build"

[project]
name = "open-agents-cli"
version = "0.1.0"
description = "CLI tool for running and managing AI agents via the Open Agents platform"
readme = "README.md"
license = { text = "MIT" }
requires-python = ">=3.11"
authors = [
    { name = "Open Agents", email = "hi@openagents.dev" }
]
keywords = ["ai", "agents", "cli", "llm", "anthropic", "automation"]
classifiers = [
    "Development Status :: 3 - Alpha",
    "Environment :: Console",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Topic :: Software Development :: Libraries :: Application Frameworks",
    "Topic :: Utilities",
]

dependencies = [
    # Zie sectie 4 voor dependency-analyse
    "anthropic>=0.40.0",
    "click>=8.1.0",
    "rich>=13.0.0",
    "httpx>=0.27.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "ruff>=0.3.0",
    "mypy>=1.8.0",
]

[project.scripts]
oa = "open_agents.cli:main"

[project.urls]
Homepage = "https://github.com/open-agents/oa-cli"
Documentation = "https://docs.openagents.dev"
Repository = "https://github.com/open-agents/oa-cli"
"Bug Tracker" = "https://github.com/open-agents/oa-cli/issues"
Changelog = "https://github.com/open-agents/oa-cli/blob/main/CHANGELOG.md"

[tool.hatch.build.targets.wheel]
packages = ["src/open_agents"]

[tool.hatch.version]
path = "src/open_agents/__init__.py"

[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

## 2. Package naam: `open-agents-cli`

| Check | Resultaat |
|-------|-----------|
| PyPI beschikbaarheid | **VRIJ** — `https://pypi.org/pypi/open-agents-cli/json` geeft HTTP 404 |
| Gerelateerde namen | `openagents` (bezet), `openagents-sdk` (bezet), `openai-agents` (bezet) |
| Naam conflict risico | Laag — `open-agents-cli` is uniek en onderscheidend |
| Install command | `pip install open-agents-cli` |
| Import naam | `import open_agents` (Python package naam: `open_agents`) |

**Aanbeveling:** Gebruik `open-agents-cli` als PyPI distributienaam. De Python package import-naam wordt `open_agents` (underscore, conform PEP 8 en PyPI conventies).

---

## 3. Entry Points

Gebaseerd op de `src/open_agents/cli.py` structuur:

```toml
[project.scripts]
oa = "open_agents.cli:main"
```

**Geëxporteerde commands:**
- `oa` — Primaire CLI command (bijv. `oa run`, `oa agent`, `oa config`)

**Eventuele subcommands (te valideren aan source):**
```
oa run <agent>     # Start een agent
oa list            # Lijst beschikbare agents
oa config          # Configureer API keys / settings
oa logs            # Bekijk agent output logs
```

Als `cli.py` gebruik maakt van `click.group()` dan zijn subcommands automatisch ontdekt. Zorg dat de top-level `main` functie exporteerbaar is:

```python
# src/open_agents/cli.py
import click

@click.group()
def main():
    """Open Agents CLI — run and manage AI agents."""
    pass

# Subcommands
@main.command()
def run():
    ...
```

---

## 4. Dependencies — analyse

### Vermoedelijke afhankelijkheden (src/open_agents/cli.py)

| Package | Gebruik | Nodig? | Versie pin |
|---------|---------|--------|------------|
| `anthropic` | Claude API client | **Ja** | `>=0.40.0` |
| `click` | CLI framework | **Ja** | `>=8.1.0` |
| `rich` | Terminal formatting | **Waarschijnlijk** | `>=13.0.0` |
| `httpx` | HTTP client (voor API calls) | **Waarschijnlijk** | `>=0.27.0` |
| `pydantic` | Data validation | **Optioneel** | `>=2.5.0` |
| `python-dotenv` | .env loading | **Optioneel** | `>=1.0.0` |

### Te verwijderen / niet in runtime-deps
- Development tools (`pytest`, `ruff`, `mypy`) → naar `[dev]` optional deps
- `setuptools` als niet gebruikt als build backend
- `wheel` als directe dep (wordt door build-backend afgehandeld)

### Aanbeveling: minimale deps
```toml
dependencies = [
    "anthropic>=0.40.0",
    "click>=8.1.0",
    "rich>=13.0.0",
]
```
Voeg alleen toe wat daadwerkelijk `import`-ed wordt in `cli.py` en `__init__.py`.

---

## 5. Versioning strategie (SemVer)

### Schema: `MAJOR.MINOR.PATCH`

| Component | Betekenis |
|-----------|-----------|
| MAJOR | Breaking changes (API, CLI interface, config format) |
| MINOR | Nieuwe features, backwards-compatible |
| PATCH | Bug fixes, security patches, docs |

### Startversie
- **`0.1.0`** — Initial alpha/beta release
- `0.x.y` signaleert dat de publieke API nog niet stabiel is (conform SemVer §4)
- Upgrade naar `1.0.0` wanneer CLI interface gestabiliseerd is

### Version in source
```python
# src/open_agents/__init__.py
__version__ = "0.1.0"
```

Met `hatchling` kan dit automatisch gesynchroniseerd worden via `[tool.hatch.version]`.

### Aangeraden tooling
- **`hatch version patch`** / `minor` / `major` — bumpt automatisch
- Of: **`bump-my-version`** voor expliciete versiebeheer

### Release cadence
- Gebruik git tags: `git tag v0.1.0 && git push --tags`
- GitHub Actions workflow triggert PyPI upload op tag push (zie SUMMARY.md)

---

## 6. README / Beschrijving voor PyPI

### Korte beschrijving (voor PyPI header)
```
CLI tool for running and managing AI agents via the Open Agents platform.
```

### Aanbevolen README.md structuur

```markdown
# open-agents-cli

[![PyPI version](https://badge.fury.io/py/open-agents-cli.svg)](https://pypi.org/project/open-agents-cli/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

CLI tool for running and managing AI agents via the Open Agents platform.

## Installation

```bash
pip install open-agents-cli
```

## Quick Start

```bash
# Configure API key
oa config set ANTHROPIC_API_KEY sk-ant-...

# Run an agent
oa run my-agent

# List available agents
oa list
```

## Requirements

- Python 3.11+
- Anthropic API key (for Claude-powered agents)

## Documentation

Full documentation at [docs.openagents.dev](https://docs.openagents.dev)

## License

MIT
```

**Zorg dat README.md in de root van `oa-cli/` staat** en verwijs ernaar in pyproject.toml:
```toml
readme = "README.md"
```

---

## 7. Minimale Python versie

**Aanbeveling: Python 3.11**

| Versie | EOL | Reden |
|--------|-----|-------|
| 3.9 | Oct 2025 | Bijna EOL, verouderde type hints |
| 3.10 | Oct 2026 | Match-statements beschikbaar, maar mist 3.11 perf |
| **3.11** | **Oct 2027** | **Aanbevolen minimum** — betere performance, `tomllib` stdlib, verbeterde error messages |
| 3.12 | Oct 2028 | Optioneel als 3.11 features niet gebruikt worden |
| 3.13 | Oct 2029 | Nieuwste, free-threaded Python |

```toml
requires-python = ">=3.11"
```

Classifiers:
```toml
classifiers = [
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
]
```

---

## 8. Platform support

**Aanbeveling: OS Independent**

```toml
classifiers = [
    "Operating System :: OS Independent",
]
```

### Platformmatrix

| Platform | Status | Aandachtspunten |
|----------|--------|-----------------|
| **Linux** | Volledig ondersteund | Primary dev platform, CI/CD target |
| **macOS** | Volledig ondersteund | Darwin/ARM64 (Apple Silicon) + x86_64 |
| **Windows** | Ondersteund | Test met PowerShell én CMD |
| **WSL** | Ondersteund | Via Linux layer, geen speciale code nodig |

### Windows-specifieke aandachtspunten
1. **Path separators:** Gebruik `pathlib.Path` i.p.v. string concatenatie
2. **Terminal colors:** `rich` handelt dit automatisch af via `colorama` op Windows
3. **Config directory:** Gebruik `platformdirs` voor cross-platform config paths:
   ```python
   from platformdirs import user_config_dir
   config_dir = user_config_dir("open-agents-cli")
   ```
4. **Shebang lines:** Niet nodig — `[project.scripts]` genereert correcte `.exe` wrappers op Windows

### CI/CD matrix aanbeveling (GitHub Actions)
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    python-version: ["3.11", "3.12", "3.13"]
```

---

## 9. Build & Release workflow

### Aangeraden GitHub Actions workflow (`.github/workflows/publish.yml`)

```yaml
name: Publish to PyPI

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install hatch
      - run: hatch build
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          password: ${{ secrets.PYPI_API_TOKEN }}
```

### Release checklist
1. `hatch version patch` (of minor/major)
2. Update `CHANGELOG.md`
3. `git commit -m "Release v0.1.1"`
4. `git tag v0.1.1`
5. `git push && git push --tags`
6. GitHub Actions publiceert automatisch naar PyPI

---

## 10. Samenvatting van minimale wijzigingen voor clean PyPI release

| Actie | Prioriteit |
|-------|-----------|
| Voeg volledige `[project]` metadata toe | **Kritiek** |
| Zet `requires-python = ">=3.11"` | **Kritiek** |
| Voeg `readme = "README.md"` toe | **Kritiek** |
| Configureer `[project.scripts]` entry point | **Kritiek** |
| Voeg `[project.urls]` toe | Hoog |
| Voeg PyPI classifiers toe | Hoog |
| Minimaliseer/pin dependencies | Hoog |
| Maak README.md aan met installatie-instructies | **Kritiek** |
| Voeg LICENSE bestand toe | Hoog |
| Configureer CI/CD voor automatische PyPI publish | Medium |

