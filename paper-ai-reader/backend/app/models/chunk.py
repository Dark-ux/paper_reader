from datetime import datetime
from typing import ClassVar

from sqlmodel import Field, SQLModel

from app.models.paper import utc_now


class Chunk(SQLModel, table=True):
    __tablename__: ClassVar[str] = "chunks"

    id: int | None = Field(default=None, primary_key=True)
    paper_id: int = Field(foreign_key="papers.id", index=True)
    page_number: int | None = Field(default=None, index=True)
    section_title: str | None = Field(default=None, index=True)
    chunk_index: int = Field(index=True)
    text: str
    token_count: int = 0
    embedding_id: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utc_now)
