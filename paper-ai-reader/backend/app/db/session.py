from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import get_settings
from app.core.paths import ensure_data_dirs


settings = get_settings()
ensure_data_dirs()

connect_args = {"check_same_thread": False} if settings.sqlite_url.startswith("sqlite") else {}
engine = create_engine(settings.sqlite_url, echo=False, connect_args=connect_args)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
