from app.config import Settings
from app.providers.fake import FakeProvider
from app.providers.http_llm import AnthropicProvider, OpenAIProvider


def get_provider(settings: Settings) -> FakeProvider | AnthropicProvider | OpenAIProvider:
    name = settings.llm_provider.lower().strip()
    if name == "anthropic" and settings.anthropic_api_key:
        return AnthropicProvider(settings.anthropic_api_key, settings.llm_model)
    if name == "openai" and settings.openai_api_key:
        return OpenAIProvider(settings.openai_api_key, settings.llm_model)
    return FakeProvider()
