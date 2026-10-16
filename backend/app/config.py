"""Runtime configuration, read from environment variables and ``backend/.env``."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ebay_client_id: str = ""
    ebay_client_secret: str = ""

    # The Chrome extension calls the API from the Copart page's origin, so a shared
    # deployment should restrict this to the Copart domains. "*" suits local development.
    cors_origins: list[str] = ["*"]

    # Fine-tuned YOLO weights that emit ``panel:damage_type`` labels. Automatic damage
    # detection stays disabled until this is set (see ROADMAP, Phase 2).
    damage_model_path: str | None = None

    @property
    def ebay_configured(self) -> bool:
        return bool(self.ebay_client_id and self.ebay_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
