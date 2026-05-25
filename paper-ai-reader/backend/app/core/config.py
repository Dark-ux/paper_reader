from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "Paper AI Reader"
    api_v1_prefix: str = "/api"
    data_dir: Path = PROJECT_ROOT / "data"
    database_url: str | None = None
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"
    llm_provider: str = "ollama"
    embedding_provider: str = "local"
    embedding_model: str = "bge-m3"
    openai_compatible_base_url: str = ""
    openai_compatible_api_key: str = ""
    openai_compatible_model: str = ""
    openai_api_key: str = ""
    ai_chat_model: str = "qwen2.5:7b"
    ai_embedding_model: str = "nomic-embed-text"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def sqlite_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{self.data_dir / 'app.db'}"

    @property
    def paper_dir(self) -> Path:
        return self.data_dir / "papers"

    @property
    def thumbnail_dir(self) -> Path:
        return self.data_dir / "thumbnails"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / "cache"

    @property
    def vector_index_dir(self) -> Path:
        return self.data_dir / "vector_index"


@lru_cache
def get_settings() -> Settings:
    return Settings()
