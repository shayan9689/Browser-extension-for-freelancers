from app.config import Settings
from app.providers.fake import FakeProvider


def get_provider(settings: Settings) -> FakeProvider:
    # Real Anthropic/OpenAI providers land in Phase 4.
    if settings.llm_provider in ("fake", "anthropic", "openai"):
        if settings.llm_provider == "fake" or not (
            settings.anthropic_api_key or settings.openai_api_key
        ):
            return FakeProvider()
    return FakeProvider()
