from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.paper import utc_now


class Chunk(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    paper_id: int = Field(foreign_key="paper.id", index=True)
    chunk_index: int = Field(index=True)
    page_start: int | None = Field(default=None, index=True)
    page_end: int | None = Field(default=None, index=True)
    text: str
    embedding_id: str | None = Field(default=None, index=True)
    metadata_json: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
