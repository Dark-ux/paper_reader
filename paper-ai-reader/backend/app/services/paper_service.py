from datetime import UTC, datetime

from fastapi import UploadFile
from sqlalchemy import or_
from sqlmodel import Session, select

from app.models.paper import Paper
from app.schemas.paper import PaperCreate, PaperUpdate
from app.services import pdf_service, storage_service


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
                    Paper.doi.ilike(pattern),
                )
            )
            .offset(offset)
            .limit(limit)
            .order_by(Paper.updated_at.desc())
        )
    return list(session.exec(statement).all())


def get_paper(session: Session, paper_id: int) -> Paper | None:
    return session.get(Paper, paper_id)


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


async def import_uploaded_pdf(session: Session, upload: UploadFile) -> Paper:
    saved = await storage_service.save_uploaded_paper(upload)
    existing = session.exec(select(Paper).where(Paper.file_hash == saved.file_hash)).first()
    if existing:
        return existing

    try:
        page_count = pdf_service.get_page_count(saved.path)
    except Exception:
        page_count = None

    title = saved.file_name.rsplit(".", 1)[0]
    paper = Paper(
        title=title,
        file_name=saved.file_name,
        file_path=str(saved.path),
        file_hash=saved.file_hash,
        page_count=page_count,
        status="imported",
    )
    session.add(paper)
    session.commit()
    session.refresh(paper)
    return paper
