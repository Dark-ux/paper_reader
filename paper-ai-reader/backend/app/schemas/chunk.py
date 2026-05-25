from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class ChunkRead(SQLModel):
    id: int
    paper_id: int
    page_number: int | None = None
    chunk_index: int
    text: str
    token_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParseResult(SQLModel):
    paper_id: int
    chunk_count: int
    page_count: int | None = None
    chunks: list[ChunkRead]
