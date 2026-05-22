from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.paper import PaperCreate, PaperRead, PaperUpdate
from app.services import paper_service


router = APIRouter(prefix="/papers", tags=["papers"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[PaperRead])
def read_papers(
    session: SessionDep,
    q: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[PaperRead]:
    return paper_service.list_papers(session, q, offset, limit)


@router.post("", response_model=PaperRead, status_code=status.HTTP_201_CREATED)
def create_paper(session: SessionDep, paper_in: PaperCreate) -> PaperRead:
    return paper_service.create_paper(session, paper_in)


@router.get("/{paper_id}", response_model=PaperRead)
def read_paper(session: SessionDep, paper_id: int) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return paper


@router.patch("/{paper_id}", response_model=PaperRead)
def update_paper(session: SessionDep, paper_id: int, paper_in: PaperUpdate) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return paper_service.update_paper(session, paper, paper_in)


@router.post("/upload", response_model=PaperRead, status_code=status.HTTP_201_CREATED)
async def upload_paper(session: SessionDep, file: UploadFile = File(...)) -> PaperRead:
    file_name = file.filename or ""
    if file.content_type not in {"application/pdf", "application/octet-stream"} and not file_name.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")
    return await paper_service.import_uploaded_pdf(session, file)
