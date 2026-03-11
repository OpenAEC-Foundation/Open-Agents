"""Diagnostics — optional psutil-based resource usage for agents."""

from __future__ import annotations

try:
    import psutil
    _PSUTIL_AVAILABLE = True
except ImportError:
    psutil = None  # type: ignore[assignment]
    _PSUTIL_AVAILABLE = False


def get_agent_resource_usage(pid: int) -> dict:
    """Return CPU and memory usage for the given process PID.

    Args:
        pid: Process ID to inspect.

    Returns:
        dict with keys cpu_percent, memory_mb, num_threads.
        Returns empty dict if psutil is unavailable or the process is gone.
    """
    if not _PSUTIL_AVAILABLE or pid is None:
        return {}
    try:
        proc = psutil.Process(pid)
        cpu = proc.cpu_percent(interval=0.1)
        mem = proc.memory_info().rss / (1024 * 1024)
        threads = proc.num_threads()
        return {
            "cpu_percent": round(cpu, 1),
            "memory_mb": round(mem, 1),
            "num_threads": threads,
        }
    except (psutil.NoSuchProcess, psutil.AccessDenied, ProcessLookupError):
        return {}


def get_system_load() -> dict:
    """Return current system-wide CPU, memory, and disk usage.

    Returns:
        dict with keys cpu_percent, memory_percent, disk_usage_percent.
        Returns empty dict if psutil is unavailable.
    """
    if not _PSUTIL_AVAILABLE:
        return {}
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory().percent
        disk = psutil.disk_usage("/").percent
        return {
            "cpu_percent": round(cpu, 1),
            "memory_percent": round(mem, 1),
            "disk_usage_percent": round(disk, 1),
        }
    except Exception:
        return {}
