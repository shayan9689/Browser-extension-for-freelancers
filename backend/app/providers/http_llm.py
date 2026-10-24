import logging
from typing import Literal

import httpx

logger = logging.getLogger("proposalpilot")


class HttpLLMError(Exception):
    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable


class AnthropicProvider:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514") -> None:
        self.api_key = api_key
        self.model = model

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
            "max_tokens": 1024,
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
            raise HttpLLMError(f"LLM client error {res.status_code}", retryable=False)
        if res.status_code >= 500:
            raise HttpLLMError(f"LLM server error {res.status_code}", retryable=True)

        data = res.json()
        parts = data.get("content") or []
        texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
        return "\n".join(texts).strip()


class OpenAIProvider:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        self.api_key = api_key
        self.model = model

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
            "response_format": {"type": "json_object"},
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
            raise HttpLLMError(f"LLM client error {res.status_code}", retryable=False)
        if res.status_code >= 500:
            raise HttpLLMError(f"LLM server error {res.status_code}", retryable=True)

        data = res.json()
        return data["choices"][0]["message"]["content"].strip()


ProviderName = Literal["fake", "anthropic", "openai"]
