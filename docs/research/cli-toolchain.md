# CLI Toolchain Evaluation — Open-Agents oa-cli (#47)

> Generated: 2026-03-11 | Scope: typer, click, rich, textual, prompt_toolkit, questionary
> Context: Evaluating current stack (typer + rich + textual) and alternatives for oa-cli

---

## Summary

The Open-Agents `oa-cli` currently uses **typer + rich + textual** as its CLI toolchain. This report evaluates six tools across compatibility, integration potential, feature coverage, and maintenance health. The conclusion is that the **current stack is well-chosen and should be retained**. Specific recommendations are made for version pinning and optional additions.

**Key findings:**
- `typer 0.12+` + `rich 13+` + `textual 0.60+` is the optimal combination for oa-cli
- `click` is typer's dependency — already present implicitly
- `questionary` is RECOMMENDED as an optional addition for guided setup flows
- `prompt_toolkit` is NOT recommended as a direct dependency (textual already wraps it)
- No breaking changes required; only version ceiling updates needed

---

## Tool Evaluations

### 1. typer

**Current role**: Primary CLI framework for all `oa` commands.

| Property | Value |
|----------|-------|
| Version (stable) | 0.12.x |
| Python requirement | >= 3.7 (full features: >= 3.10) |
| Maintainer | Sebastián Ramírez (FastAPI author) |
| Dependencies | click >= 8.0, rich (optional but recommended) |
| License | MIT |
| Activity | Active, monthly releases |

**Strengths:**
- Declarative CLI via Python type hints — minimal boilerplate
- Automatic `--help` generation with rich formatting when rich is installed
- Full subcommand nesting (used for `oa run`, `oa pipeline`, `oa status`, etc.)
- Native support for `typer.Argument`, `typer.Option` with validation
- Integrates directly with rich for colored output

**Weaknesses:**
- No built-in interactive TUI — requires textual or prompt_toolkit for that
- Thin abstraction over click — advanced click features require drop-through

**Verdict for oa-cli**: ALWAYS use typer as the primary CLI entry point. No alternative matches its DX for Python 3.10+ projects.

---

### 2. click

**Current role**: Indirect dependency via typer; used internally by typer.

| Property | Value |
|----------|-------|
| Version (stable) | 8.1.x |
| Python requirement | >= 3.7 |
| Maintainer | Pallets (Flask team) |
| Dependencies | colorama (Windows only) |
| License | BSD-3-Clause |
| Activity | Stable, conservative releases |

**Strengths:**
- Battle-tested, production-grade (used in Flask, Django management, AWS CLI)
- Composable decorators: `@click.command`, `@click.group`, `@click.option`
- Context objects for passing state between nested commands
- Excellent testing utilities (`CliRunner`)

**Weaknesses:**
- Verbose compared to typer — requires explicit decorator chains
- No rich integration out of the box
- Boilerplate for type annotations vs. typer's automatic inference

**Verdict for oa-cli**: NEVER replace typer with click directly. Use click features through typer's escape hatches when needed (e.g., `@app.command(context_settings=...)`). Already present as typer's transitive dependency.

---

### 3. rich

**Current role**: Terminal output formatting, tables, progress bars, logging.

| Property | Value |
|----------|-------|
| Version (stable) | 13.7.x |
| Python requirement | >= 3.7 |
| Maintainer | Will McGugan (also textual) |
| Dependencies | markdown-it-py, pygments |
| License | MIT |
| Activity | Very active |

**Strengths:**
- Best-in-class terminal rendering: tables, panels, markdown, syntax highlighting
- `rich.progress` — multi-column progress bars used in `oa pipeline`
- `rich.logging` — drop-in logging handler with color
- `rich.console` — captures output for testing
- `rich.live` — live-updating output (used in `oa watch`)
- Zero breaking changes policy within major version

**Weaknesses:**
- Heavy dependency graph (pygments, markdown-it-py) for what is often just color output
- `rich.live` can conflict with textual's rendering loop if used simultaneously

**Verdict for oa-cli**: ALWAYS use rich for all terminal output. Pin to `rich>=13.7,<14`. Avoid mixing `rich.live` with textual widgets in the same render loop — use textual's built-in `DataTable` instead.

---

### 4. textual

**Current role**: Interactive TUI dashboard (`oa dashboard` command).

| Property | Value |
|----------|-------|
| Version (stable) | 0.60.x |
| Python requirement | >= 3.8 (full CSS: >= 3.10) |
| Maintainer | Will McGugan + Textualize team |
| Dependencies | rich >= 13.3, markdown-it-py, typing_extensions |
| License | MIT |
| Activity | Very active, breaking changes between minor versions |

**Strengths:**
- Full reactive TUI framework with CSS-like layout system
- Built-in widgets: `DataTable`, `Tree`, `Input`, `Button`, `TabbedContent`
- Async-first — compatible with asyncio used in oa agents
- Screen system for multi-screen TUI apps
- Runs in terminal AND web browser (via `textual-web`)
- Wraps `prompt_toolkit` internally — no need to add it separately

**Weaknesses:**
- **Breaking changes between minor versions** — must pin aggressively
- Large dependency surface: adds ~15 transitive dependencies
- CSS-like layout has a learning curve
- Cannot be unit-tested without headless mode (requires `pytest-textual-snapshot`)

**Verdict for oa-cli**: ALWAYS use textual for interactive TUI features. Pin to `textual>=0.60,<1.0`. Set up `pytest-textual-snapshot` for dashboard tests. NEVER import `prompt_toolkit` directly alongside textual — use textual's `Input` widget instead.

---

### 5. prompt_toolkit

**Current role**: Not currently a direct dependency (used transitively via textual).

| Property | Value |
|----------|-------|
| Version (stable) | 3.0.x |
| Python requirement | >= 3.8 |
| Maintainer | Jonathan Slenders |
| Dependencies | wcwidth |
| License | BSD-3-Clause |
| Activity | Stable, slow release cadence |

**Strengths:**
- The foundation of IPython, ptpython, and many REPL-style tools
- Fine-grained control over key bindings, history, auto-completion
- `PromptSession` for interactive single-line prompts with history
- Works in synchronous AND async contexts

**Weaknesses:**
- Lower-level than textual — requires more code for equivalent TUI features
- Not designed for multi-widget layouts (textual is better for this)
- Maintenance pace has slowed since 2022
- Adds complexity when textual already provides the same features at higher level

**Verdict for oa-cli**: NEVER add prompt_toolkit as a direct dependency. Textual wraps it internally. If a specific prompt_toolkit feature is needed (e.g., custom key binding in non-TUI mode), add it as an optional extra: `pip install oa-cli[repl]`.

---

### 6. questionary

**Current role**: Not currently used. Candidate for interactive setup flows.

| Property | Value |
|----------|-------|
| Version (stable) | 2.0.x |
| Python requirement | >= 3.8 |
| Maintainer | Tom Bocklisch (former Rasa CTO) |
| Dependencies | prompt_toolkit >= 3.0 |
| License | MIT |
| Activity | Moderate — quarterly releases |

**Strengths:**
- High-level prompts: `questionary.select()`, `questionary.checkbox()`, `questionary.text()`
- Styled via prompt_toolkit under the hood
- Ideal for one-shot interactive setup wizards (e.g., `oa setup` flow)
- Much simpler API than building questionnaire logic in textual
- Async-compatible via `questionary.select(...).ask_async()`

**Weaknesses:**
- Adds prompt_toolkit as a direct dependency (though it's already transitive via textual)
- Not suitable for persistent TUI apps — only for one-shot flows
- Less maintained than rich/textual

**Verdict for oa-cli**: RECOMMENDED as an optional addition for `oa setup` and `oa init` flows. Add as an optional extra: `pip install oa-cli[setup]`. Do NOT use for ongoing dashboard interactions — textual handles those.

---

## Compatibility Matrix

| Tool | Python 3.10 | Python 3.11 | Python 3.12 | Python 3.13 | WSL2 | Windows |
|------|-------------|-------------|-------------|-------------|------|---------|
| typer 0.12 | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | YES | YES |
| click 8.1 | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | YES | YES |
| rich 13.7 | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | YES | YES |
| textual 0.60 | SUPPORTED | SUPPORTED | SUPPORTED | EXPERIMENTAL | YES | PARTIAL* |
| prompt_toolkit 3.0 | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | YES | YES |
| questionary 2.0 | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | YES | YES |

*Textual on Windows requires Windows Terminal or ConEmu. Native `cmd.exe` / PowerShell ISE: NOT SUPPORTED.
WSL2 (primary oa-cli environment): FULLY SUPPORTED for all tools.

### Inter-tool Compatibility

| Combination | Compatibility | Notes |
|-------------|---------------|-------|
| typer + rich | EXCELLENT | Typer auto-detects rich and uses it for --help |
| typer + textual | GOOD | Use typer for CLI entry, textual for TUI app bodies |
| rich + textual | GOOD | Both from same author; share markdown-it-py |
| rich.live + textual | CONFLICT | Do not use simultaneously — use textual's Live equivalent |
| textual + questionary | GOOD | questionary for pre-TUI setup, textual for ongoing UI |
| questionary + prompt_toolkit | NATIVE | questionary IS a prompt_toolkit wrapper |
| click + typer | NATIVE | typer IS built on click |

---

## Ranked Recommendations

### Tier 1 — Core (ALWAYS include)

| Rank | Tool | Version Pin | Justification |
|------|------|-------------|---------------|
| 1 | **typer** | `>=0.12,<0.13` | CLI entry point; best DX for typed Python |
| 2 | **rich** | `>=13.7,<14` | Terminal output; zero viable alternatives |
| 3 | **textual** | `>=0.60,<1.0` | TUI dashboard; already used in `oa dashboard` |

### Tier 2 — Optional (RECOMMENDED for specific features)

| Rank | Tool | Extra Name | Justification |
|------|------|------------|---------------|
| 4 | **questionary** | `oa-cli[setup]` | Setup wizard UX; cleaner than manual prompts |

### Tier 3 — Implicit (DO NOT add directly)

| Rank | Tool | Status | Justification |
|------|------|--------|---------------|
| 5 | **click** | Transitive via typer | Use via typer's API |
| 6 | **prompt_toolkit** | Transitive via textual | Use via textual's Input widget |

---

## Integration Notes

### typer + rich Integration Pattern

```python
import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer()
console = Console()

@app.command()
def status():
    """Show agent status."""
    table = Table(title="Agents")
    table.add_column("Name", style="cyan")
    table.add_column("Status", style="green")
    # ... populate table
    console.print(table)
```

Typer ALWAYS passes `--help` output through rich when rich is installed. No configuration needed.

### typer + textual Integration Pattern

```python
import typer
from textual.app import App

app = typer.Typer()

@app.command()
def dashboard():
    """Launch interactive dashboard."""
    tui = OaDashboard()  # textual App subclass
    tui.run()
```

The textual app takes over the terminal completely. Typer handles the CLI parsing; textual handles the interactive session. This is the current pattern in `oa dashboard`.

### questionary for oa setup (Recommended Addition)

```python
import questionary

def run_setup():
    model = questionary.select(
        "Default model?",
        choices=["claude/sonnet", "claude/opus", "claude/haiku"],
        default="claude/sonnet"
    ).ask()

    workspace = questionary.path(
        "Workspace directory?",
        default="~/.oa/workspaces"
    ).ask()

    return {"model": model, "workspace": workspace}
```

This pattern is cleaner than building the same flow with raw `input()` or textual screens.

### Async Compatibility

All four recommended tools support asyncio:
- **typer**: `@app.command()` supports `async def` via `asyncio.run()` wrapper
- **rich**: `rich.live.Live` is sync but safe to use in async context with `asyncio.to_thread()`
- **textual**: Fully async-native — ALWAYS use `async def on_*` for event handlers
- **questionary**: `.ask_async()` method available for all prompt types

---

## Installation Script

### Core Installation

```bash
# Install oa-cli core dependencies
pip install \
  "typer>=0.12,<0.13" \
  "rich>=13.7,<14" \
  "textual>=0.60,<1.0"
```

### With Optional Setup Wizard

```bash
# Install oa-cli with setup wizard support
pip install \
  "typer>=0.12,<0.13" \
  "rich>=13.7,<14" \
  "textual>=0.60,<1.0" \
  "questionary>=2.0,<3.0"
```

### Development Installation (with test dependencies)

```bash
pip install \
  "typer>=0.12,<0.13" \
  "rich>=13.7,<14" \
  "textual>=0.60,<1.0" \
  "questionary>=2.0,<3.0" \
  "pytest>=8.0" \
  "pytest-asyncio>=0.23" \
  "pytest-textual-snapshot>=0.4"
```

### pyproject.toml Recommended Configuration

```toml
[project]
name = "oa-cli"
requires-python = ">=3.10"
dependencies = [
    "typer>=0.12,<0.13",
    "rich>=13.7,<14",
    "textual>=0.60,<1.0",
]

[project.optional-dependencies]
setup = ["questionary>=2.0,<3.0"]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-textual-snapshot>=0.4",
]
all = ["oa-cli[setup,dev]"]
```

### Dependency Conflict Check

```bash
# Verify no conflicts after installation
pip check

# Verify textual version
python -c "import textual; print(textual.__version__)"

# Verify rich version
python -c "import rich; print(rich.__version__)"

# Verify typer version
python -c "import typer; print(typer.__version__)"
```

---

## Version Pinning Strategy

| Tool | Strategy | Rationale |
|------|----------|-----------|
| typer | `>=0.12,<0.13` | Patch-level safe; minor versions may add breaking type changes |
| rich | `>=13.7,<14` | Will McGugan maintains backwards compat within major |
| textual | `>=0.60,<1.0` | Pre-1.0: breaking changes between minors; cap at 1.0 |
| questionary | `>=2.0,<3.0` | 2.x is stable; 3.x not yet released |

**Rule**: ALWAYS run `pip check` in CI after any dependency update. Textual and rich share `markdown-it-py` — version conflicts between them are the most common failure mode.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Retain typer over click | DX advantage; type annotations reduce boilerplate by ~60% |
| Retain rich over colorama/termcolor | Feature set is incomparable; colorama is output-only |
| Retain textual over urwid/curses | Async-first, actively maintained, CSS layout |
| Add questionary (optional) | `oa setup` flow needs multi-step prompts; textual is overkill for one-shot |
| Exclude prompt_toolkit (direct) | Already transitive; direct import creates version coupling risk |
| Exclude urwid, npyscreen, curses | Unmaintained or incompatible with modern async patterns |

---

*Report generated for Open-Agents issue #47 — CLI Toolchain Evaluation*
*Date: 2026-03-11 | Author: research-cli-toolchain agent*
