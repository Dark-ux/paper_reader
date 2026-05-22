from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.paper import utc_now


class Collection(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: str | None = None
    parent_id: int | None = Field(default=None, foreign_key="collection.id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
