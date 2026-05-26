from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class Citation(SQLModel):
    page_number: int
    chunk_id: int | None = None
    chunk_index: int
    text: str


class SummaryRequest(SQLModel):
    summary_type: str = "paper_summary"
    force_refresh: bool = False
    max_chunks: int = 12


class SummaryRead(SQLModel):
    id: int
    paper_id: int
    summary_type: str
    content: str
    model_name: str | None = None
    prompt_version: str | None = None
    created_at: datetime
    citations: list[Citation] = []

    model_config = ConfigDict(from_attributes=True)


class AskRequest(SQLModel):
    question: str
    max_chunks: int = 6


class AskResponse(SQLModel):
    answer: str
    citations: list[Citation] = []


class BuildIndexResponse(SQLModel):
    paper_id: int
    indexed_chunks: int
    collection_name: str


class AiNoteCreate(SQLModel):
    content: str
    page_number: int | None = None
    citation_pages: list[int] = []


class TranslateRequest(SQLModel):
    text: str
    source_lang: str = "auto"
    target_lang: str | None = None


class TranslateResponse(SQLModel):
    source_lang: str
    target_lang: str
    translated_text: str
