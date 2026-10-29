import logging
from typing import Literal

import httpx

logger = logging.getLogger("proposalpilot")


class HttpLLMError(Exception):
    def __init__(
        self, message: str, *, retryable: bool = False, status: int | None = None
    ) -> None:
        super().__init__(message)
        self.retryable = retryable
        self.status = status


def _error_code(res: httpx.Response) -> str:
    """Provider error type/code for logs (never includes prompt content)."""
    try:
        err = res.json().get("error") or {}
        return str(err.get("code") or err.get("type") or "-")
    except Exception:
        return "-"


class AnthropicProvider:
    def __init__(self, api_key: str, model: str = "claude-opus-5-5") -> None:
        self.api_key = api_key
        self.model = model or "claude-opus-5-5"

    def generate(self, prompt: str, *, system: str = "") -> str:
        return self._call(prompt, system=system, attempt=1)

    def _call(self, prompt: str, *, system: str, attempt: int) -> str:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self.model,
            # Current models always think; thinking tokens count toward max_tokens.
            "max_tokens": 4096,
            "output_config": {"effort": "low"},
            "system": system,
            "messages": [{"role": "user", "content": prompt}],
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=body,
                )
        except httpx.TimeoutException as exc:
            if attempt == 1:
                return self._call(prompt, system=system, attempt=2)
            raise HttpLLMError("LLM timeout", retryable=True) from exc

        if res.status_code >= 500 and attempt == 1:
            return self._call(prompt, system=system, attempt=2)
        if 400 <= res.status_code < 500:
            raise HttpLLMError(
                f"LLM client error {res.status_code} ({_error_code(res)})",
                status=res.status_code,
            )
        if res.status_code >= 500:
            raise HttpLLMError(
                f"LLM server error {res.status_code} ({_error_code(res)})",
                retryable=True,
                status=res.status_code,
            )

        data = res.json()
        if data.get("stop_reason") == "refusal":
            raise HttpLLMError("LLM refused the request", retryable=False)
        parts = data.get("content") or []
        texts = [
            p.get("text", "")
            for p in parts
            if isinstance(p, dict) and p.get("type") == "text"
        ]
        return "\n".join(texts).strip()


class OpenAIProvider:
    def __init__(
        self, api_key: str, model: str = "gpt-4o-mini", json_schema: dict | None = None
    ) -> None:
        self.api_key = api_key
        self.model = model or "gpt-4o-mini"
        self.json_schema = json_schema

    def generate(self, prompt: str, *, system: str = "") -> str:
        return self._call(prompt, system=system, attempt=1)

    def _call(self, prompt: str, *, system: str, attempt: int) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "content-type": "application/json",
        }
        body = {
            "model": self.model,
            "temperature": 0.4,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "response_format": (
                {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "proposal",
                        "strict": True,
                        "schema": self.json_schema,
                    },
                }
                if self.json_schema
                else {"type": "json_object"}
            ),
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=body,
                )
        except httpx.TimeoutException as exc:
            if attempt == 1:
                return self._call(prompt, system=system, attempt=2)
            raise HttpLLMError("LLM timeout", retryable=True) from exc

        if res.status_code >= 500 and attempt == 1:
            return self._call(prompt, system=system, attempt=2)
        if 400 <= res.status_code < 500:
            raise HttpLLMError(
                f"LLM client error {res.status_code} ({_error_code(res)})",
                status=res.status_code,
            )
        if res.status_code >= 500:
            raise HttpLLMError(
                f"LLM server error {res.status_code} ({_error_code(res)})",
                retryable=True,
                status=res.status_code,
            )

        data = res.json()
        return data["choices"][0]["message"]["content"].strip()


ProviderName = Literal["fake", "anthropic", "openai"]
