from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "dev"
    llm_provider: str = "fake"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    allowed_origins: str = ""
    rate_limit_per_hour: int = 20
    daily_request_cap: int = 500
    redis_url: str = ""
    admin_ping_secret: str = ""
    app_version: str = "0.1.0"

    def origins_list(self) -> list[str]:
        if not self.allowed_origins.strip():
            if self.env == "dev":
                return ["*"]
            return []
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
