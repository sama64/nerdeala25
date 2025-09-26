from functools import lru_cache
from typing import List, Tuple

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings.sources import (
    DotEnvSettingsSource,
    EnvSettingsSource,
    PydanticBaseSettingsSource,
)


class LenientEnvSettingsSource(EnvSettingsSource):
    def decode_complex_value(self, field_name, field, value):
        try:
            return super().decode_complex_value(field_name, field, value)
        except ValueError:
            return value


class LenientDotEnvSettingsSource(DotEnvSettingsSource):
    def decode_complex_value(self, field_name, field, value):
        try:
            return super().decode_complex_value(field_name, field, value)
        except ValueError:
            return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: EnvSettingsSource,
        dotenv_settings: DotEnvSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        lenient_env = LenientEnvSettingsSource(
            settings_cls,
            case_sensitive=env_settings.case_sensitive,
            env_prefix=env_settings.env_prefix,
            env_nested_delimiter=getattr(env_settings, "env_nested_delimiter", None),
        )
        lenient_dotenv = LenientDotEnvSettingsSource(
            settings_cls,
            env_file=dotenv_settings.env_file,
            env_file_encoding=dotenv_settings.env_file_encoding,
            case_sensitive=dotenv_settings.case_sensitive,
            env_prefix=dotenv_settings.env_prefix,
            env_nested_delimiter=getattr(dotenv_settings, "env_nested_delimiter", None),
        )
        return (
            init_settings,
            lenient_env,
            lenient_dotenv,
            file_secret_settings,
        )

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

    cors_origins: List[str] = ["http://localhost:5001", "http://127.0.0.1:5001"]

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_oauth_redirect_uri: str = "http://localhost:5001/oauth/callback"

    classroom_scheduler_user_id: str | None = None

    wa_http_base_url: str | None = None
    wa_http_api_key: str | None = None
    wa_http_timeout: float = 20.0

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: List[str] | str | None) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith("[") and raw.endswith("]"):
            raw = raw[1:-1]
        return [item.strip().strip('"').strip("'") for item in raw.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
