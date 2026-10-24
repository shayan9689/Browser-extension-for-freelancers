import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ENV", "dev")
os.environ.setdefault("LLM_PROVIDER", "fake")
os.environ.setdefault("RATE_LIMIT_PER_HOUR", "20")
os.environ["ALLOWED_ORIGINS"] = "chrome-extension://test-extension-id"


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("ENV", "dev")
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    monkeypatch.setenv("RATE_LIMIT_PER_HOUR", "20")
    monkeypatch.setenv("ALLOWED_ORIGINS", "chrome-extension://test-extension-id")

    from app.config import get_settings

    get_settings.cache_clear()

    from app.main import app

    with TestClient(app) as c:
        c.app.state.limiter.reset()
        yield c

    get_settings.cache_clear()
