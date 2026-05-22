from typing import ClassVar

from sqlmodel import Field, SQLModel


class PaperCollection(SQLModel, table=True):
    __tablename__: ClassVar[str] = "paper_collections"

    paper_id: int = Field(foreign_key="papers.id", primary_key=True)
    collection_id: int = Field(foreign_key="collections.id", primary_key=True)
