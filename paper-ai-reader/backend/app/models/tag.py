from typing import ClassVar

from sqlmodel import Field, SQLModel


class Tag(SQLModel, table=True):
    __tablename__: ClassVar[str] = "tags"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    color: str = "#2563eb"
