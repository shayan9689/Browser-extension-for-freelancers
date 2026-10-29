import json

import httpx
import pytest

from app.providers.http_llm import HttpLLMError, OpenAIProvider
from app.schemas import PROPOSAL_JSON_SCHEMA, ProposalResponse


def test_strict_schema_matches_response_model() -> None:
    assert set(PROPOSAL_JSON_SCHEMA["required"]) == set(ProposalResponse.model_fields)
    assert set(PROPOSAL_JSON_SCHEMA["properties"]) == set(ProposalResponse.model_fields)


def test_single_string_question_is_coerced() -> None:
    data = {
        "proposal": "Hi",
        "suggested_price": {"amount": 500, "currency": "USD", "rationale": "budget"},
        "delivery_days": 14,
        "questions_to_ask": "What is the deadline?",
        "warnings": None,
    }
    parsed = ProposalResponse.model_validate(data)
    assert parsed.questions_to_ask == ["What is the deadline?"]
    assert parsed.warnings == []


def _patch_post(monkeypatch: pytest.MonkeyPatch, response: httpx.Response) -> dict:
    sent: dict = {}

    def fake_post(self: httpx.Client, url: str, **kwargs: object) -> httpx.Response:
        sent["body"] = kwargs["json"]
        return response

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    return sent


def test_openai_uses_strict_json_schema(monkeypatch: pytest.MonkeyPatch) -> None:
    content = json.dumps({"ok": True})
    ok = httpx.Response(200, json={"choices": [{"message": {"content": content}}]})
    sent = _patch_post(monkeypatch, ok)
    provider = OpenAIProvider("sk-test", json_schema=PROPOSAL_JSON_SCHEMA)
    assert provider.generate("p", system="s") == content
    fmt = sent["body"]["response_format"]
    assert fmt["type"] == "json_schema"
    assert fmt["json_schema"]["strict"] is True


def test_openai_error_includes_code(monkeypatch: pytest.MonkeyPatch) -> None:
    quota = httpx.Response(429, json={"error": {"code": "insufficient_quota"}})
    _patch_post(monkeypatch, quota)
    with pytest.raises(HttpLLMError, match="insufficient_quota"):
        OpenAIProvider("sk-test").generate("p", system="s")
