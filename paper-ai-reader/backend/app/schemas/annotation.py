from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class AnnotationCreate(SQLModel):
    paper_id: int
    page_number: int
    selected_text: str | None = None
    note: str | None = None
    color: str = "#facc15"
    position_json: str | None = None
    annotation_type: str = "highlight"


class AnnotationRead(AnnotationCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
