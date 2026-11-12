from app.config import Settings
from app.providers.fake import FakeProvider
from app.providers.http_llm import OPENAI_COMPATIBLE, AnthropicProvider, OpenAIProvider
from app.schemas import PROPOSAL_JSON_SCHEMA


def get_provider(settings: Settings) -> FakeProvider | AnthropicProvider | OpenAIProvider:
    name = settings.llm_provider.lower().strip()
    if name == "anthropic" and settings.anthropic_api_key:
        return AnthropicProvider(settings.anthropic_api_key, settings.llm_model)
    if name == "openai" and settings.openai_api_key:
        return OpenAIProvider(
            settings.openai_api_key, settings.llm_model, json_schema=PROPOSAL_JSON_SCHEMA
        )
    free_keys = {"groq": settings.groq_api_key, "gemini": settings.gemini_api_key}
    if name in OPENAI_COMPATIBLE and free_keys[name]:
        base_url, default_model = OPENAI_COMPATIBLE[name]
        return OpenAIProvider(
            free_keys[name], settings.llm_model or default_model, base_url=base_url
        )
    return FakeProvider()
