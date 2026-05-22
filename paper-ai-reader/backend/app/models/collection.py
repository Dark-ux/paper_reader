from typing import ClassVar

from sqlmodel import Field, SQLModel


class Collection(SQLModel, table=True):
    __tablename__: ClassVar[str] = "collections"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: str | None = None
    parent_id: int | None = Field(default=None, foreign_key="collections.id")
