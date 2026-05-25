from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlmodel import Session

from app.db.session import get_session
from app.models.collection import Collection
from app.models.tag import Tag
from app.schemas.ai import AiNoteCreate, AskRequest, AskResponse, BuildIndexResponse, SummaryRead, SummaryRequest
from app.schemas.annotation import AnnotationCreate, AnnotationRead, PaperAnnotationCreate
from app.schemas.chunk import ChunkRead, ParseResult
from app.schemas.paper import PaperCreate, PaperRead, PaperUpdate
from app.services import ai_service, annotation_service, chunk_service, paper_service, rag_service


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


@router.get("/{paper_id}/annotations", response_model=list[AnnotationRead])
def read_paper_annotations(session: SessionDep, paper_id: int) -> list[AnnotationRead]:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return annotation_service.list_annotations(session, paper_id)


@router.post("/{paper_id}/parse", response_model=ParseResult)
def parse_paper(session: SessionDep, paper_id: int) -> ParseResult:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    try:
        chunks = chunk_service.parse_paper(session, paper)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    return ParseResult(
        paper_id=paper_id,
        chunk_count=len(chunks),
        page_count=paper.page_count,
        chunks=[ChunkRead.model_validate(chunk) for chunk in chunks],
    )


@router.get("/{paper_id}/chunks", response_model=list[ChunkRead])
def read_paper_chunks(session: SessionDep, paper_id: int) -> list[ChunkRead]:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return [ChunkRead.model_validate(chunk) for chunk in chunk_service.list_chunks(session, paper_id)]


@router.post("/{paper_id}/ai/build-index", response_model=BuildIndexResponse)
def build_paper_ai_index(session: SessionDep, paper_id: int) -> BuildIndexResponse:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    try:
        return rag_service.build_index(session, paper_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/{paper_id}/ai/summarize", response_model=SummaryRead)
def summarize_paper(
    session: SessionDep,
    paper_id: int,
    request: SummaryRequest = SummaryRequest(),
) -> SummaryRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    try:
        return ai_service.generate_summary(session, paper, request)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/{paper_id}/ai/ask", response_model=AskResponse)
def ask_paper_ai(session: SessionDep, paper_id: int, request: AskRequest) -> AskResponse:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    try:
        return ai_service.answer_question(session, paper, request.question, request.max_chunks)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/{paper_id}/ai/extract-method", response_model=AskResponse)
def extract_paper_method(session: SessionDep, paper_id: int) -> AskResponse:
    return _extract_paper_aspect(session, paper_id, "method")


@router.post("/{paper_id}/ai/extract-results", response_model=AskResponse)
def extract_paper_results(session: SessionDep, paper_id: int) -> AskResponse:
    return _extract_paper_aspect(session, paper_id, "results")


@router.post("/{paper_id}/ai/extract-limitations", response_model=AskResponse)
def extract_paper_limitations(session: SessionDep, paper_id: int) -> AskResponse:
    return _extract_paper_aspect(session, paper_id, "limitations")


@router.get("/{paper_id}/ai/summaries", response_model=list[SummaryRead])
def read_paper_ai_summaries(session: SessionDep, paper_id: int) -> list[SummaryRead]:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return ai_service.list_summaries(session, paper_id)


@router.post("/{paper_id}/ai/notes", response_model=AnnotationRead, status_code=status.HTTP_201_CREATED)
def save_ai_answer_as_note(
    session: SessionDep,
    paper_id: int,
    note_in: AiNoteCreate,
) -> AnnotationRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    page_number = note_in.page_number or (note_in.citation_pages[0] if note_in.citation_pages else 1)
    return annotation_service.create_annotation(
        session,
        AnnotationCreate(
            paper_id=paper_id,
            page_number=page_number,
            selected_text="AI 精读回答",
            note=note_in.content,
            color="#93c5fd",
            annotation_type="ai_note",
        ),
    )


def _extract_paper_aspect(session: Session, paper_id: int, aspect: str) -> AskResponse:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    try:
        return ai_service.extract_aspect(session, paper, aspect)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post(
    "/{paper_id}/annotations",
    response_model=AnnotationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_paper_annotation(
    session: SessionDep,
    paper_id: int,
    annotation_in: PaperAnnotationCreate,
) -> AnnotationRead:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return annotation_service.create_annotation(
        session,
        AnnotationCreate(**annotation_in.model_dump(), paper_id=paper_id),
    )


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
