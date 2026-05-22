from typing import ClassVar

from sqlmodel import Field, SQLModel


class PaperTag(SQLModel, table=True):
    __tablename__: ClassVar[str] = "paper_tags"

    paper_id: int = Field(foreign_key="papers.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)
