"""Spawner — agent spawning and model command builders."""

from __future__ import annotations

import re
import shlex
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from .checkpoint import save_checkpoint
from .config import load_config
from . import telemetry
from .state import (
    AgentRecord,
    add_agent,
    get_agent,
    validate_spawn,
)
from .tmux import SESSION_NAME, _tmux, session_exists
from .workspace import create_workspace, sync_workspace_to_remote

CLAUDE_CMD = "claude"

# Load configurable values from ~/.oa/config.json (with fallback defaults)
_config = load_config()
TIMEOUT_MINUTES = _config.get("timeout_minutes", 60)
DEFAULT_MODEL = _config.get("default_model", "claude")
MAX_DEPTH = _config.get("max_depth", 5)

# Absolute harde limiet (nooit overschrijden)
MAX_DEPTH_ABSOLUTE = 10

CLAUDE_MODEL_MAP = {
    "claude": None,           # default (whatever subscription provides)
    "claude/opus": "opus",
    "claude/sonnet": "sonnet",
    "claude/haiku": "haiku",
}

# Default SSH host alias for Hetzner GPU server (configurable via machines.json)
HETZNER_SSH_HOST = "hetzner-agent"


def _map_paths_for_remote(text: str) -> str:
    """Translate Windows/WSL paths in text to remote Ubuntu paths.

    Reads remote_wsl_path_prefix and remote_repo_path from config.
    Replaces occurrences of the WSL prefix with the remote repo path.
    Also handles the generic /mnt/c/ prefix as a fallback.
    """
    cfg = load_config()
    wsl_prefix = cfg.get("remote_wsl_path_prefix", "")
    remote_path = cfg.get("remote_repo_path", "")

    if not wsl_prefix or not remote_path:
        return text

    # Primary mapping: exact WSL project path → remote repo path
    result = text.replace(wsl_prefix, remote_path)

    # Fallback: /mnt/c/Users/Freek Heijting/Documents/GitHub/ → /home/oa-agent/
    # This catches other repos that might be referenced
    remote_home = str(Path(remote_path).parent)
    github_dir = str(Path(wsl_prefix).parent)
    if github_dir != wsl_prefix:
        result = result.replace(github_dir, remote_home)

    return result


def _ensure_remote_repo(host: str) -> None:
    """Ensure the project repo exists and is up-to-date on the remote host.

    Checks if remote_repo_path exists. If not, clones from remote_repo_git_url.
    If it exists, runs git pull to update.
    """
    cfg = load_config()
    remote_path = cfg.get("remote_repo_path", "")
    git_url = cfg.get("remote_repo_git_url", "")

    if not remote_path:
        return

    try:
        # Check if remote repo directory exists
        check = subprocess.run(
            ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5",
             host, f"test -d {shlex.quote(remote_path)} && echo exists"],
            capture_output=True, text=True, timeout=10,
        )
        if "exists" in check.stdout:
            # Repo exists — git pull to update (best-effort, don't fail spawn on pull errors)
            subprocess.run(
                ["ssh", "-o", "BatchMode=yes", host,
                 f"cd {shlex.quote(remote_path)} && git pull --ff-only 2>/dev/null || true"],
                capture_output=True, text=True, timeout=30,
            )
        elif git_url:
            # Repo doesn't exist — clone it
            parent_dir = str(Path(remote_path).parent)
            repo_name = str(Path(remote_path).name)
            subprocess.run(
                ["ssh", "-o", "BatchMode=yes", host,
                 f"mkdir -p {shlex.quote(parent_dir)} && "
                 f"cd {shlex.quote(parent_dir)} && "
                 f"git clone {shlex.quote(git_url)} {shlex.quote(repo_name)}"],
                capture_output=True, text=True, timeout=120,
            )
    except (subprocess.TimeoutExpired, OSError):
        # Don't block spawn on repo sync failures
        pass


def is_oss_model(model: str) -> bool:
    """True for text-only OSS models that need minimal context: ollama/* and hetzner/* (excluding hetzner/claude/*)."""
    if model.startswith("ollama/"):
        return True
    if model.startswith("hetzner/"):
        remainder = model[len("hetzner/"):]
        return not remainder.startswith("claude")
    return False


# VRAM requirements per model (MB) for pre-spawn guard
HETZNER_VRAM_MB = {
    "mistral:7b": 5000,
    "mistral:latest": 5000,
    "mistral-nemo:latest": 8000,
    "mixtral:8x7b": 26000,
    "olmo2:7b": 6000,
}


def route_oss_model(task: str) -> str:
    """Pick the best Hetzner OSS model based on task characteristics.

    Rules (in order):
    1. Long-context tasks  → mistral-nemo (128k context window)
    2. Simple/fast tasks   → mistral:7b
    3. Default             → mixtral:8x7b (strongest)

    Override via config: set "oss_model_default" to pin a specific model.
    """
    from .config import get as _cfg_get
    override = _cfg_get("oss_model_default")
    if override:
        return f"hetzner/{override}" if not override.startswith("hetzner/") else override

    t = task.lower()
    task_len = len(task)

    # 1. Empty task → fast model
    if not task.strip():
        return "hetzner/mistral:7b"

    # 2. Complexity signals → always mixtral (even if short)
    _complex_keywords = (
        "implementatie", "implement", "schrijf", "bouw", "ontwikkel",
        "refactor", "analyseer", "onderzoek", "ontwerp", "design",
        "migreer", "migrate", "integreer", "integrate", "genereer",
        "optimaliseer", "debugge", "fix ", "repareer", "tests voor",
        "unit test", "integratie test",
    )
    if any(kw in t for kw in _complex_keywords):
        # But first check: long context?
        _long_context_keywords = (
            "analyseer alle", "lees alle", "verwerk alle", "alle bestanden",
            "samenvatting van", "summarize", "summarise", "research", "bronnen",
            "documenten", "alle logs", "volledige", "hele codebase",
            "long context", "lange context", "128k",
        )
        if task_len > 3000 or any(kw in t for kw in _long_context_keywords):
            return "hetzner/mistral-nemo"
        return "hetzner/mixtral:8x7b"

    # 3. Long-context signals (no complexity) → mistral-nemo
    _long_context_keywords = (
        "analyseer alle", "lees alle", "verwerk alle", "alle bestanden",
        "samenvatting van", "summarize", "summarise", "research", "bronnen",
        "documenten", "alle logs", "volledige", "hele codebase",
        "long context", "lange context", "128k",
    )
    if task_len > 3000 or any(kw in t for kw in _long_context_keywords):
        return "hetzner/mistral-nemo"

    # 4. Simple/fast operations
    _fast_keywords = (
        "maak een lijst", "lijst van", "hernoem", "format", "rename",
        "tel ", "count ", "converteer", "convert", "verplaats", "move ",
        "controleer of", "is er een", "bestaat er",
    )
    if task_len < 400 and any(kw in t for kw in _fast_keywords):
        return "hetzner/mistral:7b"

    # 5. Very short and no complexity → fast
    if task_len < 60:
        return "hetzner/mistral:7b"

    # 6. Default: strongest model
    return "hetzner/mixtral:8x7b"


def check_hetzner_vram(host: str, model_id: str) -> tuple[bool, str]:
    """Check if Hetzner server has enough free VRAM for model_id.
    Returns (ok, message). ok=True means safe to spawn."""
    import subprocess as _sp
    model_name = model_id.replace("hetzner/", "")
    required = HETZNER_VRAM_MB.get(model_name, 6000)
    try:
        result = _sp.run(
            ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5",
             host, "nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10,
        )
        free_mb = int(result.stdout.strip().splitlines()[0])
        if free_mb < required:
            return False, (
                f"Onvoldoende VRAM op {host}: {free_mb}MB vrij, "
                f"{required}MB nodig voor {model_name}. "
                f"Wacht tot een andere Hetzner agent klaar is."
            )
        return True, f"{free_mb}MB VRAM beschikbaar"
    except Exception:
        return True, "VRAM-check niet beschikbaar, doorgaan"


def _detect_ollama_cmd() -> str:
    """Detect the correct ollama command for the current platform.

    Checks PATH for 'ollama' first (native Linux/macOS), then 'ollama.exe'
    (WSL → Windows interop). Falls back to 'ollama' if neither is found.
    """
    if shutil.which("ollama"):
        return "ollama"
    if shutil.which("ollama.exe"):
        return "ollama.exe"
    return "ollama"


OLLAMA_CMD = _detect_ollama_cmd()


# Known valid model prefixes and patterns
_VALID_CLAUDE_MODELS = {"claude", "claude/opus", "claude/sonnet", "claude/haiku"}
_VALID_OLLAMA_PREFIX = "ollama/"
_VALID_OPENAI_MODELS = {"openai/o3", "openai/gpt-4o", "openai/gpt-4"}
_WARN_UNKNOWN_MODELS = True  # warn but don't block unknown models

# ANSI color codes for terminal output
_YELLOW = "\033[33m"
_DIM = "\033[2m"
_RESET = "\033[0m"


def validate_model(model: str) -> tuple[bool, str]:
    """Validate model string. Returns (is_valid, warning_message).

    Valid patterns:
    - "claude" / "claude/opus" / "claude/sonnet" / "claude/haiku"
    - "claude/<full-model-id>" — direct Claude model IDs
    - "ollama/<any>" — Ollama local models
    - "openai/<any>" — OpenAI models
    - "hetzner/claude/<any>" — Claude on Hetzner remote
    - "hetzner/<ollama-model>" — Ollama on Hetzner GPU

    Invalid patterns (from observed bad data):
    - "hetzner/<any>" used as a bare model (not via routing) — these are SSH hosts
    - Models with spaces or special chars (except / and : and -)
    - Empty string

    Returns (True, "") if valid.
    Returns (False, reason) if clearly invalid (e.g. bare "hetzner/" used as model).
    Returns (True, warning) if unknown but plausible.
    """
    if not model:
        return (True, "")  # empty → use default, no warning needed

    # Check for invalid characters (spaces, etc.)
    if re.search(r'\s', model):
        return (False, f"Model name contains whitespace: {model!r}. Use 'claude/sonnet', 'ollama/<model>', etc.")

    # Known valid prefixes
    if model in _VALID_CLAUDE_MODELS:
        return (True, "")
    if model.startswith("claude/"):
        return (True, "")
    if model.startswith(_VALID_OLLAMA_PREFIX):
        ollama_part = model[len(_VALID_OLLAMA_PREFIX):]
        if not ollama_part:
            return (False, "ollama/ prefix requires a model name, e.g. 'ollama/llama3.1:8b'")
        return (True, "")
    if model.startswith("openai/"):
        return (True, "")
    if model.startswith("hetzner/"):
        # hetzner/* is valid as a routing prefix — routed to spawn_remote_agent
        return (True, "")

    # Unknown prefix — warn but allow (backwards compatible)
    if _WARN_UNKNOWN_MODELS:
        return (True, f"Unknown model prefix in {model!r}. Expected: claude/*, ollama/*, openai/*, hetzner/*. Proceeding anyway.")

    return (True, "")


def _validate_claude_model(claude_model: str | None) -> str | None:
    """Validate and sanitize a Claude model name.

    Returns the validated model name, or raises ValueError if invalid.
    Accepts known short names (opus/sonnet/haiku) and full model IDs
    matching the pattern: alphanumeric with hyphens and dots.
    """
    if claude_model is None:
        return None
    # Allow known short names and full model IDs (e.g. claude-sonnet-4-6)
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}', claude_model):
        raise ValueError(f"Invalid Claude model name: {claude_model!r}")
    return claude_model


def _build_claude_command(workspace: Path, name: str, claude_model: str | None = None) -> str:
    """Build the shell command for a Claude Code agent.

    claude_model: None for default, or 'opus'/'sonnet'/'haiku' for specific model.
    """
    claude_model = _validate_claude_model(claude_model)
    claude_prompt = "Lees CLAUDE.md en voer de taak uit. Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."
    model_flag = f" --model {shlex.quote(claude_model)}" if claude_model else ""
    # Full PATH ensures oa-cli is available for nested agent spawning (Issue #9/#11)
    from .workspace import _AGENT_PATH
    return (
        f"export PATH=\"{_AGENT_PATH}:$PATH\" && "
        f"cd {workspace} && "
        f"echo $$ > .oa-pid && "
        f"unset CLAUDECODE && "
        f"{CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {shlex.quote(claude_prompt)}; "
        f"touch .done; "
        f"echo '--- Agent {shlex.quote(name)} finished ---'"
    )


def _build_ollama_command(workspace: Path, name: str, ollama_model: str) -> str:
    """Build the shell command for an Ollama agent.

    Ollama models are text-in/text-out — no file I/O or tools.
    We pipe CLAUDE.md as prompt and capture output to result.md.
    TERM=dumb prevents ollama from writing spinner/progress ANSI codes.
    """
    # Validate ollama model name: alphanumeric with colons, dots, hyphens, underscores
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}', ollama_model):
        raise ValueError(f"Invalid Ollama model name: {ollama_model!r}")
    from .workspace import _AGENT_PATH
    return (
        f"export PATH=\"{_AGENT_PATH}:$PATH\" && "
        f"cd {workspace} && "
        f"echo $$ > .oa-pid && "
        f"TERM=dumb cat task.txt | {OLLAMA_CMD} run {shlex.quote(ollama_model)} "
        f"2>/dev/null | sed 's/\\x1b\\[[0-9;]*[a-zA-Z]//g' "
        f"> output/result.md; "
        f"touch .done; "
        f"echo '--- Agent {shlex.quote(name)} finished ---'"
    )


# VRAM estimates per model in GB (Q4_K_M quantization) — used by GpuQueue (L-088, issue #79)
_VRAM_ESTIMATES: dict[str, float] = {
    "mistral:7b": 4.5,
    "mistral:latest": 4.5,
    "mistral-nemo:latest": 7.1,
    "codestral:22b": 13.0,
    "olmo2:7b": 4.5,
    "olmo2:latest": 4.5,
    "nomic-embed-text:latest": 0.3,
    "bge-m3:latest": 1.2,
    # Large models (Q4_K_M estimates) — mixtral:8x7b exceeds 20GB GPU capacity
    "mixtral:8x7b": 26.0,
    "qwen2.5:14b": 9.0,
    "qwen2.5:32b": 19.0,
    "gemma3:27b": 17.0,
    "llama3.1:8b": 5.0,
}
_GPU_TOTAL_VRAM = 20.0  # RTX 4000 Ada — update if hardware changes


def _parse_ollama_ps(output: str) -> float:
    """Parse 'ollama ps' stdout and return total VRAM in use (GB).

    ollama ps format:
      NAME              ID    SIZE     PROCESSOR          CONTEXT  UNTIL
      mistral:7b        ...   4.4 GB   100% GPU           ...      ...
    """
    total = 0.0
    for line in output.splitlines()[1:]:  # skip header
        parts = line.split()
        # SIZE is always 'X.X GB' — find the GB token and take the number before it
        for i, part in enumerate(parts):
            if part == "GB" and i > 0:
                try:
                    total += float(parts[i - 1])
                except ValueError:
                    pass
    return total


class GpuQueue:
    """Prevents VRAM contention when spawning multiple Ollama agents on one GPU.

    Before spawning, call wait_for_vram(host, model). It polls 'ollama ps' via
    SSH until enough VRAM is free, then returns. Raises RuntimeError on timeout.
    """

    def wait_for_vram(self, host: str, model: str, timeout: int = 600) -> None:
        """Block until the GPU has enough free VRAM for *model*.

        Models larger than _GPU_TOTAL_VRAM (e.g. mixtral:8x7b at 26 GB on a
        20 GB GPU) are allowed via CPU offloading — Ollama handles this
        automatically. For these oversized models we wait until the GPU is
        mostly idle (< 1 GB used) to avoid VRAM contention with other models.

        Args:
            host:    SSH host alias (e.g. 'hetzner-agent').
            model:   Ollama model name (e.g. 'codestral:22b').
            timeout: Max seconds to wait before raising RuntimeError.
        """
        required = _VRAM_ESTIMATES.get(model, 10.0)  # conservative default
        # Models larger than GPU VRAM use CPU offloading — wait for GPU to be
        # mostly free (<1 GB used) rather than requiring required <= total.
        if required > _GPU_TOTAL_VRAM:
            threshold = 1.0  # GB — wait until GPU is nearly idle
        else:
            threshold = _GPU_TOTAL_VRAM - required
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                result = subprocess.run(
                    ["ssh", "-o", "BatchMode=yes", host, "ollama ps"],
                    capture_output=True, text=True, timeout=10,
                )
                used = _parse_ollama_ps(result.stdout)
                if used <= threshold:
                    return  # GPU free enough — proceed (offloading if needed)
            except Exception:
                return  # SSH failed → assume available, let ollama handle it
            time.sleep(30)
        raise RuntimeError(
            f"GpuQueue timeout after {timeout}s: GPU not free enough for '{model}' on '{host}'. "
            f"Required: {required}GB (GPU total: {_GPU_TOTAL_VRAM}GB"
            + (" — will use CPU offload" if required > _GPU_TOTAL_VRAM else "")
            + f"). Run 'ssh {host} ollama ps' to inspect running models."
        )


_gpu_queue = GpuQueue()


def _build_remote_ollama_command(workspace_path: str, name: str, ollama_model: str, max_iterations: int = 3) -> str:
    """Build shell command for an Ollama text agent running on a remote host.

    Supports multi-turn quality improvement (L-025): after the initial run the
    agent polls its inbox/ directory for feedback messages. Each feedback round
    re-runs the model with the accumulated context (task + previous output +
    feedback). Repeats up to max_iterations feedback rounds.

    Messages are SCP'd into {workspace}/inbox/ by send_message() when it
    detects a remote agent in the state store.

    TERM=dumb prevents ANSI spinner codes from polluting output.
    """
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}', ollama_model):
        raise ValueError(f"Invalid Ollama model name: {ollama_model!r}")
    safe_name = shlex.quote(name)
    safe_model = shlex.quote(ollama_model)
    remote_path = "/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    strip_ansi = "sed 's/\\x1b\\[[0-9;]*[a-zA-Z]//g'"
    return (
        f"export PATH=\"{remote_path}:$PATH\" && "
        f"cd {workspace_path} && "
        f"mkdir -p output inbox && "
        # Initial run
        f"TERM=dumb cat task.txt | ollama run {safe_model} 2>/dev/null | {strip_ansi} > output/result.md && "
        # Multi-turn feedback loop
        f"for _oa_i in $(seq 1 {max_iterations}); do "
        f"  sleep 10; "
        f"  _OA_MSG=$(ls inbox/*.json 2>/dev/null | sort | python3 -c \"import sys; lines=sys.stdin.read().split(); print(lines[0] if lines else '')\" 2>/dev/null); "
        f"  [ -z \"$_OA_MSG\" ] && break; "
        f"  _OA_FEEDBACK=$(python3 -c \"import json,sys; d=json.load(open(sys.argv[1])); print(d.get('content',''))\" \"$_OA_MSG\" 2>/dev/null); "
        f"  rm -f \"$_OA_MSG\"; "
        f"  {{ cat task.txt; "
        f"    echo ''; echo '=== VORIGE OUTPUT ==='; cat output/result.md; "
        f"    echo ''; echo '=== VERBETERFEEDBACK ==='; echo \"$_OA_FEEDBACK\"; "
        f"    echo ''; echo 'Verbeter de output volledig op basis van bovenstaande feedback.'; "
        f"  }} | TERM=dumb ollama run {safe_model} 2>/dev/null | {strip_ansi} > output/result_iter_$_oa_i.md && "
        f"  cp output/result_iter_$_oa_i.md output/result.md; "
        f"done; "
        f"touch .done; "
        f"echo '--- Agent {safe_name} finished ---'"
    )


def spawn_agent(
    name: str,
    task: str,
    model: str = DEFAULT_MODEL,
    workspace: Path | None = None,
    parent: str | None = None,
    max_depth: int = MAX_DEPTH,
    shared_results_dir: str | None = None,
    project_root: str | Path | None = None,
    agent_type: str = "",
    can_spawn: bool = False,
    team: str = "",
    skills: list[str] | None = None,
    profile: str = "",
    max_iterations: int = 3,
    task_type: str = "",
) -> AgentRecord:
    """Spawn an agent in a tmux window.

    Models:
      - "claude"           → Claude Code CLI (full tools, subscription)
      - "ollama/<model>"   → Ollama local model (text only, free)

    Hiërarchie:
      - parent: naam van de parent-agent (None = root)
      - max_depth: maximale diepte van de boom (default MAX_DEPTH=5)
      - shared_results_dir: gedeeld pad voor output-aggregatie

    1. Valideer spawn (diepte, max_children, task-hash)
    2. Create workspace with CLAUDE.md (or use pre-built workspace)
    3. Create tmux window
    4. Launch the right runtime in that window
    5. Register in state
    """
    if not session_exists():
        raise RuntimeError("No oa session. Run 'oa start' first.")

    # Validate agent name: only lowercase alphanumeric and hyphens, max 62 chars
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,61}', name):
        raise RuntimeError(
            f"Invalid agent name '{name}': must match [a-z0-9-], "
            f"start with alphanumeric, max 62 characters."
        )

    existing = get_agent(name)
    if existing and existing.status == "running":
        raise RuntimeError(f"Agent '{name}' is already running.")

    # --- Model validatie ---
    if not model:
        model = DEFAULT_MODEL
    _model_valid, _model_warn = validate_model(model)
    if not _model_valid:
        print(f"{_YELLOW}⚠ Model warning: {_model_warn}{_RESET}")
    elif _model_warn:
        print(f"{_DIM}ℹ {_model_warn}{_RESET}")

    # --- Hiërarchie validatie ---
    child_depth = 0
    child_lineage: list[str] = []

    if parent is not None:
        # Valideer via state
        allowed, reason = validate_spawn(parent, task, max_depth=max_depth)
        if not allowed:
            raise RuntimeError(f"Spawn geweigerd: {reason}")

        parent_rec = get_agent(parent)
        if parent_rec:
            child_depth = parent_rec.depth + 1
            child_lineage = parent_rec.lineage + [parent]
            # Erft shared_results_dir en project_root van parent als niet expliciet opgegeven
            if shared_results_dir is None:
                shared_results_dir = parent_rec.shared_results_dir
            if project_root is None and getattr(parent_rec, "project_root", None):
                project_root = parent_rec.project_root

    # --- Maak shared_results_dir aan als root-agent (depth=0) ---
    if child_depth == 0 and shared_results_dir is None:
        shared_results_dir = str(Path(tempfile.mkdtemp(prefix="oa-results-")) / "results")
        Path(shared_results_dir).mkdir(parents=True, exist_ok=True)

    # Determine parent_name for feedback loop instructions
    parent_name = parent if parent is not None else "meta"

    # Create workspace (or use provided one)
    if workspace is None:
        workspace = create_workspace(name, task, project_root=project_root, agent_type=agent_type, can_spawn=can_spawn, team=team, model=model, parent_name=parent_name, skills=skills, profile=profile, max_iterations=max_iterations, task_type=task_type)
    else:
        workspace = Path(workspace)

    # Create tmux window — use -P to get the new window index, avoiding
    # duplicate-name ambiguity when send-keys targets by name.
    window_name = f"agent-{name}"
    result = _tmux(
        f"new-window -t {SESSION_NAME}: -n {shlex.quote(window_name)} -P -F '#{{window_index}}'"
    )
    window_index = result.stdout.strip()
    send_target = f"{SESSION_NAME}:{window_index}" if window_index else f"{SESSION_NAME}:{shlex.quote(window_name)}"

    # GPU-first routing: when prefer_gpu=True in config, redirect ollama/* to Hetzner
    _cfg = load_config()
    if _cfg.get("prefer_gpu") and model.startswith("ollama/"):
        gpu_map = _cfg.get("gpu_model_map", {})
        model = gpu_map.get(model, f"hetzner/{model.split('/', 1)[1]}")

    # Route hetzner/* models to spawn_remote_agent
    if model.startswith("hetzner/"):
        from .config import get_machine_host
        configured_host = get_machine_host("hetzner")
        host = configured_host or HETZNER_SSH_HOST
        return spawn_remote_agent(name, task, host=host, model=model, direct=True, max_iterations=max_iterations)

    # Build runtime-specific command
    if model.startswith("ollama/"):
        ollama_model = model.split("/", 1)[1]
        agent_command = _build_ollama_command(workspace, name, ollama_model)
    elif model.startswith("claude/"):
        claude_model = CLAUDE_MODEL_MAP.get(model)
        if claude_model is None:
            # Allow direct model names like claude/claude-sonnet-4-6
            claude_model = model.split("/", 1)[1]
        agent_command = _build_claude_command(workspace, name, claude_model)
    else:
        agent_command = _build_claude_command(workspace, name)

    # Write command to a temp script to avoid tmux send-keys quoting issues
    script = workspace / ".oa-run.sh"
    script.write_text(f"#!/bin/bash\n{agent_command}\n")
    script.chmod(0o755)
    _tmux(f"send-keys -t {send_target} {shlex.quote(str(script))} Enter")

    # Read agent PID from .oa-pid written by the shell script
    agent_pid: int | None = None
    pid_file = workspace / ".oa-pid"
    time.sleep(0.5)
    try:
        if pid_file.exists():
            agent_pid = int(pid_file.read_text().strip())
    except (ValueError, OSError):
        agent_pid = None

    # Start telemetry run
    try:
        run_id = telemetry.start_run(
            agent_name=name,
            task=task,
            model=model,
            workspace=str(workspace),
            project_root=str(project_root) if project_root else None,
        )
    except Exception:
        run_id = None

    # Record state
    rec = AgentRecord(
        name=name,
        task=task,
        workspace=str(workspace),
        tmux_window=window_name,
        model=model,
        status="running",
        pid=agent_pid,
        created_at=time.time(),
        parent=parent,
        depth=child_depth,
        lineage=child_lineage,
        shared_results_dir=shared_results_dir,
        project_root=str(project_root) if project_root else None,
        run_id=run_id,
        task_type=task_type,
    )
    add_agent(rec)

    # Create checkpoint for crash-recovery (L-044)
    save_checkpoint(name, {
        "task": task,
        "model": model,
        "status": "running",
    })

    return rec


def spawn_remote_agent(
    name: str,
    task: str,
    host: str,
    model: str = "claude/sonnet",
    direct: bool = True,
    max_iterations: int = 3,
) -> AgentRecord:
    """Spawn an agent on a remote host via SSH.

    The agent runs as a background process on the remote machine.
    Output is retrieved via 'oa collect' once the remote .done file appears.

    Extended model support:
    - "claude/sonnet"            → Claude Code CLI (agentic, full tools)
    - "hetzner/claude/sonnet"    → Claude Code CLI on Hetzner (same as above)
    - "hetzner/qwen2.5:14b"      → Ollama model on GPU server (text only)
    - "hetzner/service/*"        → Not handled here; use invoke_hetzner_service()

    Args:
        name:   Unique agent name.
        task:   Task description for the agent.
        host:   SSH host string (e.g. 'user@host' or alias from ~/.ssh/config).
        model:  Model string (e.g. 'claude/sonnet', 'hetzner/qwen2.5:14b').
        direct: Reserved for future use.
    """
    # Normalize: strip hetzner/ prefix to determine effective model
    effective_model = model
    is_hetzner_ollama = False
    ollama_model_name = None

    if model.startswith("hetzner/"):
        remainder = model[len("hetzner/"):]
        if remainder.startswith("claude"):
            effective_model = remainder if remainder.startswith("claude/") else "claude"
        elif remainder.startswith("service/"):
            raise ValueError(
                f"Service agents ({model}) must use invoke_hetzner_service(), "
                f"not spawn_remote_agent()"
            )
        else:
            # Hetzner Ollama model: hetzner/qwen2.5:14b -> qwen2.5:14b
            is_hetzner_ollama = True
            ollama_model_name = remainder

    # Validate agent name
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,61}', name):
        raise RuntimeError(
            f"Invalid agent name '{name}': must match [a-z0-9-], "
            f"start with alphanumeric, max 62 characters."
        )

    existing = get_agent(name)
    if existing and existing.status == "running":
        raise RuntimeError(f"Agent '{name}' is already running.")

    # 0. Ensure remote repo is available and up-to-date
    if not is_hetzner_ollama:
        _ensure_remote_repo(host)

    # 0b. Map WSL paths in the task to remote paths
    mapped_task = _map_paths_for_remote(task)

    # 1. Create local workspace for state tracking (with mapped paths)
    local_ws = create_workspace(name, mapped_task)
    remote_ws = f"/tmp/oa-agent-{name}"

    # 2. Upload workspace to remote (CLAUDE.md already has mapped paths)
    sync_workspace_to_remote(host, local_ws, remote_ws)

    # 3. Detect whether the remote user is root.
    # Claude Code blocks --dangerously-skip-permissions when running as root (#64).
    # We check upfront so we can raise a clear error instead of spawning a process
    # that fails silently and creates a .done file after ~1 second.
    if not is_hetzner_ollama:
        try:
            uid_result = subprocess.run(
                ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", host, "id -u"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            remote_uid = uid_result.stdout.strip()
        except (subprocess.TimeoutExpired, OSError):
            remote_uid = ""

        if remote_uid == "0":
            raise RuntimeError(
                f"Remote host '{host}' is running as root (UID 0). "
                "Claude Code blocks --dangerously-skip-permissions for root users. "
                "Fix options:\n"
                "  1. Create a non-root user on the remote server and update your SSH config.\n"
                "  2. Run: adduser oa-agent && usermod -aG sudo oa-agent\n"
                "     Then update ~/.ssh/config: User oa-agent\n"
                "See GitHub issue #64 for details."
            )

    # 3b. Pre-flight auth check for Claude agents.
    # claude auth status can report loggedIn: true while the OAuth token is
    # actually expired, causing agents to fail with 401. We do a real API call
    # to verify, and attempt auto-refresh if it fails.
    if not is_hetzner_ollama:
        try:
            auth_test = subprocess.run(
                ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", host,
                 'echo "ping" | claude --print 2>&1 | head -5'],
                capture_output=True, text=True, timeout=45,
            )
            auth_output = auth_test.stdout
            if "401" in auth_output or "authentication_error" in auth_output or "Failed to authenticate" in auth_output:
                print(f"{_YELLOW}⚠ Claude auth expired on {host} — attempting auto-refresh...{_RESET}")
                # Try headless auth refresh script
                script_path = Path(__file__).resolve().parents[3] / "scripts" / "claude-auth-headless.py"
                if script_path.exists():
                    refresh = subprocess.run(
                        ["python3", str(script_path), host],
                        timeout=180,
                    )
                    if refresh.returncode != 0:
                        raise RuntimeError(
                            f"Claude auth expired on '{host}' and auto-refresh failed. "
                            f"Run manually: python3 {script_path} {host}"
                        )
                else:
                    raise RuntimeError(
                        f"Claude auth expired on '{host}'. OAuth token needs refresh. "
                        f"Run: ssh {host} 'claude auth login' and authorize in browser."
                    )
        except subprocess.TimeoutExpired:
            pass  # Don't block spawn on auth check timeout
        except RuntimeError:
            raise
        except OSError:
            pass  # SSH failure — let the spawn attempt handle it

    # 4. Build remote command based on model type
    if is_hetzner_ollama:
        # Wait for VRAM before spawning (L-088, issue #79)
        _gpu_queue.wait_for_vram(host, ollama_model_name)
        # Ollama text-only agent on GPU server
        inner_cmd = _build_remote_ollama_command(remote_ws, name, ollama_model_name, max_iterations=max_iterations)
        # Wrap in subshell to properly background and detach from SSH session
        remote_cmd = f"({inner_cmd}) > /dev/null 2>&1 &"
    else:
        # Claude Code agentic agent on remote host
        claude_model = CLAUDE_MODEL_MAP.get(effective_model)
        if claude_model is None and "/" in effective_model:
            claude_model = effective_model.split("/", 1)[1]
        claude_model = _validate_claude_model(claude_model)
        model_flag = f" --model {shlex.quote(claude_model)}" if claude_model else ""
        claude_prompt = shlex.quote(
            "Lees CLAUDE.md en voer de taak uit. "
            "Schrijf al je output naar ./output/ en maak een .done file als je klaar bent."
        )
        # Use subshell ( ... ) & to properly background and detach from SSH session.
        # Plain 'nohup ... &' doesn't reliably detach the process group when SSH exits.
        # Use $HOME so the PATH works for any remote user (root or oa-agent)
        remote_path = "$HOME/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        remote_cmd = (
            f"export PATH=\"{remote_path}:$PATH\" && "
            f"cd {remote_ws} && "
            f"unset CLAUDECODE CLAUDE_API_KEY && "
            f"mkdir -p output && "
            f"(nohup {CLAUDE_CMD}{model_flag} --dangerously-skip-permissions -p {claude_prompt} "
            f"> output/result.md 2>&1; touch .done) &"
        )

    # 5. Execute on remote host via SSH (BatchMode=yes prevents password prompts)
    subprocess.run(["ssh", "-o", "BatchMode=yes", host, remote_cmd], check=True)

    # 5. Register in local state with remote fields
    rec = AgentRecord(
        name=name,
        task=task,
        workspace=str(local_ws),
        tmux_window=f"remote:{host}",
        model=model,
        status="running",
        created_at=time.time(),
        project_root=None,
        remote_host=host,
        remote_workspace=remote_ws,
    )
    add_agent(rec)
    return rec
