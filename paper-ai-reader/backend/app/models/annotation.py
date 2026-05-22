from datetime import datetime
from typing import ClassVar

from sqlmodel import Field, SQLModel

from app.models.paper import utc_now


class Annotation(SQLModel, table=True):
    __tablename__: ClassVar[str] = "annotations"

    id: int | None = Field(default=None, primary_key=True)
    paper_id: int = Field(foreign_key="papers.id", index=True)
    page_number: int = Field(index=True)
    selected_text: str | None = None
    note: str | None = None
    color: str = "#facc15"
    position_json: str | None = None
    annotation_type: str = Field(default="highlight", index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
