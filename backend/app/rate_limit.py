import time
from collections import defaultdict
from threading import Lock


class InMemoryRateLimiter:
    """Per install_id and per IP sliding window (1 hour)."""

    def __init__(self, limit_per_hour: int) -> None:
        self.limit = limit_per_hour
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> None:
        window_start = now - 3600
        self._hits[key] = [t for t in self._hits[key] if t >= window_start]

    def check(self, install_id: str, ip: str) -> tuple[bool, int]:
        """Returns (allowed, retry_after_seconds)."""
        now = time.time()
        with self._lock:
            for key in (f"id:{install_id}", f"ip:{ip}"):
                self._prune(key, now)
                if len(self._hits[key]) >= self.limit:
                    oldest = min(self._hits[key]) if self._hits[key] else now
                    retry = max(1, int(3600 - (now - oldest)))
                    return False, retry
            self._hits[f"id:{install_id}"].append(now)
            self._hits[f"ip:{ip}"].append(now)
            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
