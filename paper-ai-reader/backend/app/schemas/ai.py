from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class SummaryRequest(SQLModel):
    summary_type: str = "paper_summary"
    force_refresh: bool = False


class SummaryRead(SQLModel):
    id: int
    paper_id: int
    summary_type: str
    model: str | None = None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AskRequest(SQLModel):
    question: str
    max_chunks: int = 6


class AskResponse(SQLModel):
    answer: str
    citations: list[str] = []
