from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlmodel import Session

from app.db.session import get_session
from app.services import paper_service, pdf_service


router = APIRouter(prefix="/pdf", tags=["pdf"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/{paper_id}/file")
def read_pdf_file(session: SessionDep, paper_id: int) -> FileResponse:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")

    path = Path(paper.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF file not found")

    return FileResponse(path, media_type="application/pdf", filename=paper.file_name)


@router.get("/{paper_id}/text")
def read_pdf_text(
    session: SessionDep,
    paper_id: int,
    page_number: int | None = None,
) -> dict[str, str | int | None]:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")

    try:
        text = pdf_service.extract_text(paper.file_path, page_number)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return {"paper_id": paper_id, "page_number": page_number, "text": text}
