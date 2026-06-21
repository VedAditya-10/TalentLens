from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openrouter_api_key: str
    openrouter_model: str = "google/gemini-2.5-flash"
    llm_timeout_seconds: int = 60

    database_url: str
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]


settings = Settings()
