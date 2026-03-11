"""Cross-platform file locking — replaces direct fcntl usage.

Unix: uses fcntl.flock()
Windows: uses msvcrt.locking()
"""

from __future__ import annotations

import sys

if sys.platform == "win32":
    import msvcrt
    import os

    def lock_sh(f) -> None:
        """Acquire shared (read) lock."""
        msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, max(os.fstat(f.fileno()).st_size, 1))

    def lock_ex(f) -> None:
        """Acquire exclusive (write) lock."""
        msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, max(os.fstat(f.fileno()).st_size, 1))

    def lock_un(f) -> None:
        """Release lock."""
        try:
            msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, max(os.fstat(f.fileno()).st_size, 1))
        except OSError:
            pass

else:
    import fcntl

    def lock_sh(f) -> None:
        """Acquire shared (read) lock."""
        fcntl.flock(f, fcntl.LOCK_SH)

    def lock_ex(f) -> None:
        """Acquire exclusive (write) lock."""
        fcntl.flock(f, fcntl.LOCK_EX)

    def lock_un(f) -> None:
        """Release lock."""
        fcntl.flock(f, fcntl.LOCK_UN)
