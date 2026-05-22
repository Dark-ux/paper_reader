from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class PaperBase(SQLModel):
    title: str
    authors: str | None = None
    abstract: str | None = None
    year: int | None = None
    doi: str | None = None


class PaperCreate(PaperBase):
    file_name: str
    file_path: str
    file_hash: str
    page_count: int | None = None
    status: str = "imported"


class PaperUpdate(SQLModel):
    title: str | None = None
    authors: str | None = None
    abstract: str | None = None
    year: int | None = None
    doi: str | None = None
    status: str | None = None


class PaperRead(PaperBase):
    id: int
    file_name: str
    file_path: str
    file_hash: str
    page_count: int | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
