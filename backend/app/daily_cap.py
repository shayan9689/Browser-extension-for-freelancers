import time
from threading import Lock


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
