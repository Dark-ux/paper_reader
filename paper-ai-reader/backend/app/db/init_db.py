from sqlmodel import SQLModel

from app.db.session import engine

# Import table models so SQLModel metadata is populated before create_all.
from app.models.ai_summary import AiSummary  # noqa: F401
from app.models.annotation import Annotation  # noqa: F401
from app.models.chunk import Chunk  # noqa: F401
from app.models.collection import Collection  # noqa: F401
from app.models.paper import Paper  # noqa: F401
from app.models.tag import Tag  # noqa: F401


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


if __name__ == "__main__":
    init_db()
