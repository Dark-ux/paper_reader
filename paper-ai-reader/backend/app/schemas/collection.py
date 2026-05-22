from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class CollectionCreate(SQLModel):
    name: str
    description: str | None = None
    parent_id: int | None = None


class CollectionRead(CollectionCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
