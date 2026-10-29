import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.daily_cap import RedisDailyCap
from app.rate_limit import RedisRateLimiter


def test_redis_rate_limiter_blocks_after_limit() -> None:
    limiter = RedisRateLimiter(fakeredis.FakeRedis(), limit_per_hour=2)
    assert limiter.check("a", "1.1.1.1") == (True, 0)
    assert limiter.check("a", "1.1.1.1") == (True, 0)
    allowed, retry = limiter.check("a", "1.1.1.1")
    assert not allowed and 1 <= retry <= 3600
    # Same IP, different install: still blocked by the IP bucket.
    assert not limiter.check("b", "1.1.1.1")[0]
    # Different IP and install: allowed.
    assert limiter.check("c", "2.2.2.2")[0]


def test_redis_limits_shared_between_instances() -> None:
    server = fakeredis.FakeServer()
    one = RedisRateLimiter(fakeredis.FakeRedis(server=server), limit_per_hour=1)
    two = RedisRateLimiter(fakeredis.FakeRedis(server=server), limit_per_hour=1)
    assert one.check("a", "ip")[0]
    assert not two.check("a", "ip")[0]


def test_redis_daily_cap() -> None:
    cap = RedisDailyCap(fakeredis.FakeRedis(), limit=2)
    assert cap.allow() and cap.allow()
    assert not cap.allow()
    cap.reset()
    assert cap.allow()


def test_production_refuses_fake_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    from app.config import get_settings

    get_settings.cache_clear()
    from app.main import app

    with pytest.raises(RuntimeError, match="LLM_PROVIDER"):
        with TestClient(app):
            pass
    get_settings.cache_clear()
