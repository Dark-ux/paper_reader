from datetime import UTC, datetime
from typing import ClassVar

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Paper(SQLModel, table=True):
    __tablename__: ClassVar[str] = "papers"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    authors: str | None = Field(default=None, index=True)
    year: int | None = Field(default=None, index=True)
    journal: str | None = Field(default=None, index=True)
    doi: str | None = Field(default=None, index=True)
    abstract: str | None = None
    keywords: str | None = Field(default=None, index=True)
    file_path: str = Field(index=True, unique=True)
    file_hash: str = Field(index=True, unique=True)
    file_name: str
    file_size: int = 0
    page_count: int | None = None
    reading_status: str = Field(default="unread", index=True)
    rating: int | None = Field(default=None, index=True)
    custom_fields_json: str | None = "{}"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
