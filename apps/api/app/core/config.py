from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Nerdeala Vibeathon API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./nerdeala.db"
    sync_database_url: str = "sqlite:///./nerdeala.db"

    jwt_secret_key: str = "super-secret-key-change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_minutes: int = 60 * 24
    jwt_refresh_token_expires_minutes: int = 60 * 24 * 7

    classroom_api_base_url: str = "https://classroom.googleapis.com/v1"
    classroom_service_account_file: str | None = None

    redis_url: str | None = None
    rate_limit_login_per_minute: int = 5

    cors_origins: List[str] = ["http://localhost:3000"]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
