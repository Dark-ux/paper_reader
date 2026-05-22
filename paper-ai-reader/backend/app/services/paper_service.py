from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import or_
from sqlmodel import Session, select

from app.models.ai_summary import AiSummary
from app.models.annotation import Annotation
from app.models.chunk import Chunk
from app.models.collection import Collection
from app.models.paper import Paper
from app.models.paper_collection import PaperCollection
from app.models.paper_tag import PaperTag
from app.models.tag import Tag
from app.schemas.paper import PaperCreate, PaperUpdate
from app.services import pdf_service, storage_service


class DuplicatePaperError(Exception):
    def __init__(self, paper: Paper):
        self.paper = paper
        super().__init__(f"Paper already exists: {paper.id}")


def list_papers(
    session: Session,
    query: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[Paper]:
    statement = select(Paper).offset(offset).limit(limit).order_by(Paper.updated_at.desc())
    if query:
        pattern = f"%{query}%"
        statement = (
            select(Paper)
            .where(
                or_(
                    Paper.title.ilike(pattern),
                    Paper.authors.ilike(pattern),
                    Paper.journal.ilike(pattern),
                    Paper.doi.ilike(pattern),
                    Paper.abstract.ilike(pattern),
                    Paper.keywords.ilike(pattern),
                )
            )
            .offset(offset)
            .limit(limit)
            .order_by(Paper.updated_at.desc())
        )
    return list(session.exec(statement).all())


def get_paper(session: Session, paper_id: int) -> Paper | None:
    return session.get(Paper, paper_id)


def get_paper_tags(session: Session, paper_id: int) -> list[Tag]:
    statement = (
        select(Tag)
        .join(PaperTag, PaperTag.tag_id == Tag.id)
        .where(PaperTag.paper_id == paper_id)
        .order_by(Tag.name)
    )
    return list(session.exec(statement).all())


def get_paper_collections(session: Session, paper_id: int) -> list[Collection]:
    statement = (
        select(Collection)
        .join(PaperCollection, PaperCollection.collection_id == Collection.id)
        .where(PaperCollection.paper_id == paper_id)
        .order_by(Collection.name)
    )
    return list(session.exec(statement).all())


def create_paper(session: Session, paper_in: PaperCreate) -> Paper:
    paper = Paper.model_validate(paper_in)
    session.add(paper)
    session.commit()
    session.refresh(paper)
    return paper


def update_paper(session: Session, paper: Paper, paper_in: PaperUpdate) -> Paper:
    data = paper_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(paper, field, value)
    paper.updated_at = datetime.now(UTC)
    session.add(paper)
    session.commit()
    session.refresh(paper)
    return paper


def delete_paper(session: Session, paper: Paper) -> None:
    related_models = (
        (PaperTag, PaperTag.paper_id),
        (PaperCollection, PaperCollection.paper_id),
        (Annotation, Annotation.paper_id),
        (Chunk, Chunk.paper_id),
        (AiSummary, AiSummary.paper_id),
    )
    for model, paper_id_column in related_models:
        records = session.exec(select(model).where(paper_id_column == paper.id)).all()
        for record in records:
            session.delete(record)

    file_path = paper.file_path
    session.delete(paper)
    session.commit()
    storage_service.delete_managed_paper_file(file_path)


def add_tag_to_paper(session: Session, paper: Paper, tag: Tag) -> Paper:
    existing = session.exec(
        select(PaperTag).where(PaperTag.paper_id == paper.id, PaperTag.tag_id == tag.id)
    ).first()
    if existing is None:
        session.add(PaperTag(paper_id=paper.id or 0, tag_id=tag.id or 0))
        paper.updated_at = datetime.now(UTC)
        session.add(paper)
        session.commit()
        session.refresh(paper)
    return paper


def remove_tag_from_paper(session: Session, paper: Paper, tag_id: int) -> Paper:
    existing = session.exec(
        select(PaperTag).where(PaperTag.paper_id == paper.id, PaperTag.tag_id == tag_id)
    ).first()
    if existing is not None:
        session.delete(existing)
        paper.updated_at = datetime.now(UTC)
        session.add(paper)
        session.commit()
        session.refresh(paper)
    return paper


def add_collection_to_paper(session: Session, paper: Paper, collection: Collection) -> Paper:
    existing = session.exec(
        select(PaperCollection).where(
            PaperCollection.paper_id == paper.id,
            PaperCollection.collection_id == collection.id,
        )
    ).first()
    if existing is None:
        session.add(PaperCollection(paper_id=paper.id or 0, collection_id=collection.id or 0))
        paper.updated_at = datetime.now(UTC)
        session.add(paper)
        session.commit()
        session.refresh(paper)
    return paper


def remove_collection_from_paper(session: Session, paper: Paper, collection_id: int) -> Paper:
    existing = session.exec(
        select(PaperCollection).where(
            PaperCollection.paper_id == paper.id,
            PaperCollection.collection_id == collection_id,
        )
    ).first()
    if existing is not None:
        session.delete(existing)
        paper.updated_at = datetime.now(UTC)
        session.add(paper)
        session.commit()
        session.refresh(paper)
    return paper


async def import_uploaded_pdf(session: Session, upload: UploadFile) -> Paper:
    saved = await storage_service.save_uploaded_paper(upload)
    existing = session.exec(select(Paper).where(Paper.file_hash == saved.file_hash)).first()
    if existing:
        if Path(existing.file_path).resolve() != saved.path.resolve():
            storage_service.delete_managed_paper_file(saved.path)
        raise DuplicatePaperError(existing)

    try:
        metadata = pdf_service.get_document_metadata(saved.path)
    except Exception:
        metadata = None

    title = metadata.title if metadata and metadata.title else saved.file_name.rsplit(".", 1)[0]
    paper = Paper(
        title=title,
        authors=metadata.authors if metadata else None,
        year=metadata.year if metadata else None,
        abstract=metadata.abstract if metadata else None,
        keywords=metadata.keywords if metadata else None,
        file_name=saved.file_name,
        file_path=str(saved.path),
        file_hash=saved.file_hash,
        file_size=saved.size,
        page_count=metadata.page_count if metadata else None,
        reading_status="unread",
    )
    session.add(paper)
    session.commit()
    session.refresh(paper)
    return paper
