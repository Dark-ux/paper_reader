from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.paper import utc_now


class Annotation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    paper_id: int = Field(foreign_key="paper.id", index=True)
    page_number: int = Field(index=True)
    kind: str = Field(default="highlight", index=True)
    quote: str | None = None
    note: str | None = None
    color: str = "#facc15"
    rects_json: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
