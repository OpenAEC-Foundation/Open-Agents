"""Docker runtime — run agents in isolated Docker containers (D-040)."""

from __future__ import annotations

import shlex
import shutil
import subprocess
from pathlib import Path

from .config import load_config

# Load docker config defaults from config
_config = load_config()
_DOCKER_IMAGE = _config.get("docker_image", "oa-agent:latest")
_DOCKER_MEMORY_DEFAULT = _config.get("docker_memory_default", "2g")
_DOCKER_CPU_DEFAULT = _config.get("docker_cpu_default", 1.0)
_DOCKER_TIMEOUT_DEFAULT = _config.get("docker_timeout_default", 300)


class DockerAgentRuntime:
    """Run agents in Docker containers with filesystem isolation and resource limits."""

    def __init__(self, image: str = _DOCKER_IMAGE):
        self.image = image

    def is_available(self) -> bool:
        """Check if docker is installed and the daemon is running."""
        if not shutil.which("docker"):
            return False
        try:
            result = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                timeout=10,
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, OSError):
            return False

    def image_exists(self) -> bool:
        """Check if the agent Docker image has been built."""
        try:
            result = subprocess.run(
                ["docker", "image", "inspect", self.image],
                capture_output=True,
                timeout=10,
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, OSError):
            return False

    def spawn_agent(
        self,
        workspace: Path,
        project_root: Path | None,
        command: str,
        name: str,
        memory_limit: str = _DOCKER_MEMORY_DEFAULT,
        cpu_limit: float = _DOCKER_CPU_DEFAULT,
        timeout: int = _DOCKER_TIMEOUT_DEFAULT,
        network: str = "none",
    ) -> str:
        """Start an agent in a Docker container.

        Args:
            workspace:    Agent workspace directory (mounted rw at /workspace).
            project_root: Project directory (mounted ro at /project). None to skip.
            command:      Shell command to run inside the container.
            name:         Agent name (used for container naming).
            memory_limit: Docker memory limit (e.g. '2g', '512m').
            cpu_limit:    CPU limit (e.g. 1.0 = 1 core).
            timeout:      Timeout in seconds (passed to --stop-timeout).
            network:      Docker network mode ('none', 'bridge', 'host').

        Returns:
            Container ID string.
        """
        container_name = f"oa-agent-{name}"

        cmd = [
            "docker", "run",
            "--rm", "-d",
            f"--memory={memory_limit}",
            f"--cpus={cpu_limit}",
            f"--network={network}",
            f"--stop-timeout={timeout}",
            f"--name={container_name}",
            "-v", f"{workspace.resolve()}:/workspace",
        ]

        if project_root:
            cmd.extend(["-v", f"{project_root.resolve()}:/project:ro"])

        cmd.extend([self.image, "bash", "-c", command])

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise RuntimeError(
                f"Docker spawn failed for '{name}': {result.stderr.strip()}"
            )
        return result.stdout.strip()  # container ID

    def get_logs(self, container_id: str) -> str:
        """Get stdout/stderr logs from a running or stopped container."""
        result = subprocess.run(
            ["docker", "logs", container_id],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.stdout + result.stderr

    def stop_agent(self, container_id: str, timeout: int = 10) -> None:
        """Stop a running container gracefully."""
        subprocess.run(
            ["docker", "stop", "-t", str(timeout), container_id],
            capture_output=True,
            timeout=timeout + 15,
        )

    def cleanup(self, container_id: str) -> None:
        """Force-remove a container (if it still exists)."""
        subprocess.run(
            ["docker", "rm", "-f", container_id],
            capture_output=True,
            timeout=10,
        )

    def is_running(self, container_name: str) -> bool:
        """Check if a container with the given name is still running."""
        result = subprocess.run(
            ["docker", "ps", "-q", "-f", f"name={container_name}"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return bool(result.stdout.strip())
