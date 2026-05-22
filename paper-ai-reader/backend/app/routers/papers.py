from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlmodel import Session

from app.db.session import get_session
from app.models.collection import Collection
from app.models.tag import Tag
from app.schemas.paper import PaperCreate, PaperRead, PaperUpdate
from app.services import paper_service


router = APIRouter(prefix="/papers", tags=["papers"])
SessionDep = Annotated[Session, Depends(get_session)]


def _to_paper_read(session: Session, paper) -> PaperRead:
    data = PaperRead.model_validate(paper).model_dump()
    data["tags"] = paper_service.get_paper_tags(session, paper.id or 0)
    data["collections"] = paper_service.get_paper_collections(session, paper.id or 0)
    return PaperRead.model_validate(data)


@router.get("", response_model=list[PaperRead])
def read_papers(
    session: SessionDep,
    q: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[PaperRead]:
    papers = paper_service.list_papers(session, q, offset, limit)
    return [_to_paper_read(session, paper) for paper in papers]


@router.post("", response_model=PaperRead, status_code=status.HTTP_201_CREATED)
def create_paper(session: SessionDep, paper_in: PaperCreate) -> PaperRead:
    paper = paper_service.create_paper(session, paper_in)
    return _to_paper_read(session, paper)


@router.get("/{paper_id}", response_model=PaperRead)
def read_paper(session: SessionDep, paper_id: int) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return _to_paper_read(session, paper)


@router.patch("/{paper_id}", response_model=PaperRead)
def update_paper(session: SessionDep, paper_id: int, paper_in: PaperUpdate) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    updated_paper = paper_service.update_paper(session, paper, paper_in)
    return _to_paper_read(session, updated_paper)


@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paper(session: SessionDep, paper_id: int) -> Response:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    paper_service.delete_paper(session, paper)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/upload", response_model=PaperRead, status_code=status.HTTP_201_CREATED)
async def upload_paper(session: SessionDep, file: UploadFile = File(...)) -> PaperRead:
    file_name = file.filename or ""
    if file.content_type not in {"application/pdf", "application/octet-stream"} and not file_name.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")
    try:
        paper = await paper_service.import_uploaded_pdf(session, file)
    except paper_service.DuplicatePaperError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Paper already exists",
                "paper_id": exc.paper.id,
                "title": exc.paper.title,
            },
        ) from exc
    return _to_paper_read(session, paper)


@router.post("/{paper_id}/tags/{tag_id}", response_model=PaperRead)
def add_paper_tag(session: SessionDep, paper_id: int, tag_id: int) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    tag = session.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    updated_paper = paper_service.add_tag_to_paper(session, paper, tag)
    return _to_paper_read(session, updated_paper)


@router.delete("/{paper_id}/tags/{tag_id}", response_model=PaperRead)
def remove_paper_tag(session: SessionDep, paper_id: int, tag_id: int) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    updated_paper = paper_service.remove_tag_from_paper(session, paper, tag_id)
    return _to_paper_read(session, updated_paper)


@router.post("/{paper_id}/collections/{collection_id}", response_model=PaperRead)
def add_paper_collection(session: SessionDep, paper_id: int, collection_id: int) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    collection = session.get(Collection, collection_id)
    if collection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    updated_paper = paper_service.add_collection_to_paper(session, paper, collection)
    return _to_paper_read(session, updated_paper)


@router.delete("/{paper_id}/collections/{collection_id}", response_model=PaperRead)
def remove_paper_collection(session: SessionDep, paper_id: int, collection_id: int) -> PaperRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    updated_paper = paper_service.remove_collection_from_paper(session, paper, collection_id)
    return _to_paper_read(session, updated_paper)
