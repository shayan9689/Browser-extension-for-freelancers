import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.providers import get_provider
from app.providers.fake import FakeProvider
from app.providers.http_llm import OpenAIProvider


def _patch_post(monkeypatch: pytest.MonkeyPatch, response: httpx.Response) -> dict:
    sent: dict = {}

    def fake_post(self: httpx.Client, url: str, **kwargs: object) -> httpx.Response:
        sent["url"] = url
        sent["body"] = kwargs["json"]
        sent["headers"] = kwargs["headers"]
        return response

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    return sent


@pytest.mark.parametrize(
    ("name", "url_prefix", "model"),
    [
        ("groq", "https://api.groq.com/openai/v1", "openai/gpt-oss-120b"),
        (
            "gemini",
            "https://generativelanguage.googleapis.com/v1beta/openai",
            "gemini-2.5-flash",
        ),
    ],
)
def test_free_provider_request_shape(
    monkeypatch: pytest.MonkeyPatch, name: str, url_prefix: str, model: str
) -> None:
    settings = Settings(_env_file=None, llm_provider=name, **{f"{name}_api_key": "free-key"})
    provider = get_provider(settings)
    assert isinstance(provider, OpenAIProvider)

    content = json.dumps({"ok": True})
    ok = httpx.Response(200, json={"choices": [{"message": {"content": content}}]})
    sent = _patch_post(monkeypatch, ok)

    assert provider.generate("p", system="s") == content
    assert sent["url"] == f"{url_prefix}/chat/completions"
    assert sent["headers"]["Authorization"] == "Bearer free-key"
    assert sent["body"]["model"] == model
    # Strict json_schema is OpenAI-only; free providers use plain JSON mode.
    assert sent["body"]["response_format"] == {"type": "json_object"}


def test_llm_model_overrides_free_default() -> None:
    settings = Settings(
        _env_file=None, llm_provider="groq", groq_api_key="k", llm_model="other-model"
    )
    provider = get_provider(settings)
    assert isinstance(provider, OpenAIProvider)
    assert provider.model == "other-model"


def test_free_provider_without_key_falls_back_to_fake() -> None:
    assert isinstance(get_provider(Settings(_env_file=None, llm_provider="groq")), FakeProvider)
    assert isinstance(get_provider(Settings(_env_file=None, llm_provider="gemini")), FakeProvider)


def test_production_refuses_groq_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "")
    from app.config import get_settings

    get_settings.cache_clear()
    from app.main import app

    with pytest.raises(RuntimeError, match="LLM_PROVIDER"):
        with TestClient(app):
            pass
    get_settings.cache_clear()
