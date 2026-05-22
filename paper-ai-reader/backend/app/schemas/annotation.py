from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class AnnotationCreate(SQLModel):
    paper_id: int
    page_number: int
    kind: str = "highlight"
    quote: str | None = None
    note: str | None = None
    color: str = "#facc15"
    rects_json: str | None = None


class AnnotationRead(AnnotationCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
