from pydantic import ConfigDict
from sqlmodel import SQLModel


class TagCreate(SQLModel):
    name: str
    color: str = "#2563eb"


class TagRead(TagCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)
