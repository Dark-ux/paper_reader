from pathlib import Path

from app.core.config import get_settings


def ensure_data_dirs() -> None:
    settings = get_settings()
    for path in (
        settings.data_dir,
        settings.paper_dir,
        settings.thumbnail_dir,
        settings.cache_dir,
        settings.vector_index_dir,
    ):
        Path(path).mkdir(parents=True, exist_ok=True)
