from __future__ import annotations

import time
from threading import Lock
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import redis


class DailyRequestCap:
    def __init__(self, limit: int) -> None:
        self.limit = limit
        self._count = 0
        self._day = self._today()
        self._lock = Lock()

    def _today(self) -> str:
        return time.strftime("%Y-%m-%d", time.gmtime())

    def allow(self) -> bool:
        with self._lock:
            today = self._today()
            if today != self._day:
                self._day = today
                self._count = 0
            if self._count >= self.limit:
                return False
            self._count += 1
            return True

    def reset(self) -> None:
        with self._lock:
            self._count = 0


class RedisDailyCap:
    """Global daily cap shared across workers/instances (UTC day)."""

    def __init__(self, client: redis.Redis, limit: int) -> None:
        self.client = client
        self.limit = limit

    def allow(self) -> bool:
        key = f"pp:daily:{time.strftime('%Y-%m-%d', time.gmtime())}"
        pipe = self.client.pipeline()
        pipe.incr(key)
        pipe.expire(key, 2 * 86400)
        count, _ = pipe.execute()
        return count <= self.limit

    def reset(self) -> None:
        for key in self.client.scan_iter("pp:daily:*"):
            self.client.delete(key)
