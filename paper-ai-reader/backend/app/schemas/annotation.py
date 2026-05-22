from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class AnnotationBase(SQLModel):
    page_number: int
    selected_text: str | None = None
    note: str | None = None
    color: str = "#facc15"
    position_json: str | None = None
    annotation_type: str = "highlight"


class AnnotationCreate(AnnotationBase):
    paper_id: int


class PaperAnnotationCreate(AnnotationBase):
    pass


class AnnotationUpdate(SQLModel):
    page_number: int | None = None
    selected_text: str | None = None
    note: str | None = None
    color: str | None = None
    position_json: str | None = None
    annotation_type: str | None = None


class AnnotationRead(AnnotationBase):
    id: int
    paper_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
