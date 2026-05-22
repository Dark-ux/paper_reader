from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class PaperBase(SQLModel):
    title: str
    authors: str | None = None
    year: int | None = None
    journal: str | None = None
    doi: str | None = None
    abstract: str | None = None
    keywords: str | None = None
    reading_status: str = "unread"
    rating: int | None = None
    custom_fields_json: str | None = "{}"


class PaperCreate(PaperBase):
    file_path: str
    file_hash: str
    file_name: str
    file_size: int = 0
    page_count: int | None = None


class PaperUpdate(SQLModel):
    title: str | None = None
    authors: str | None = None
    year: int | None = None
    journal: str | None = None
    doi: str | None = None
    abstract: str | None = None
    keywords: str | None = None
    reading_status: str | None = None
    rating: int | None = None
    custom_fields_json: str | None = None


class PaperRead(PaperBase):
    id: int
    file_path: str
    file_hash: str
    file_name: str
    file_size: int
    page_count: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
