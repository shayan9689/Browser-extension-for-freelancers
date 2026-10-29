from __future__ import annotations

import time
import uuid
from collections import defaultdict
from threading import Lock
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import redis


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


class RedisRateLimiter:
    """Same contract as InMemoryRateLimiter, shared across workers/instances."""

    def __init__(self, client: redis.Redis, limit_per_hour: int) -> None:
        self.client = client
        self.limit = limit_per_hour

    def check(self, install_id: str, ip: str) -> tuple[bool, int]:
        now = time.time()
        keys = [f"pp:rl:id:{install_id}", f"pp:rl:ip:{ip}"]
        pipe = self.client.pipeline()
        for key in keys:
            pipe.zremrangebyscore(key, 0, now - 3600)
            pipe.zcard(key)
            pipe.zrange(key, 0, 0, withscores=True)
        results = pipe.execute()
        for i in range(len(keys)):
            count, oldest = results[i * 3 + 1], results[i * 3 + 2]
            if count >= self.limit:
                oldest_ts = oldest[0][1] if oldest else now
                return False, max(1, int(3600 - (now - oldest_ts)))
        member = f"{now}:{uuid.uuid4().hex}"
        pipe = self.client.pipeline()
        for key in keys:
            pipe.zadd(key, {member: now})
            pipe.expire(key, 3600)
        pipe.execute()
        return True, 0

    def reset(self) -> None:
        for key in self.client.scan_iter("pp:rl:*"):
            self.client.delete(key)
