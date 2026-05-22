from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Paper(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    authors: str | None = Field(default=None, index=True)
    abstract: str | None = None
    year: int | None = Field(default=None, index=True)
    doi: str | None = Field(default=None, index=True)
    file_name: str
    file_path: str = Field(index=True, unique=True)
    file_hash: str = Field(index=True, unique=True)
    page_count: int | None = None
    status: str = Field(default="imported", index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
