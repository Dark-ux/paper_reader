from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.paper import utc_now


class AiSummary(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    paper_id: int = Field(foreign_key="paper.id", index=True)
    summary_type: str = Field(default="paper_summary", index=True)
    model: str | None = Field(default=None, index=True)
    content: str
    created_at: datetime = Field(default_factory=utc_now)
