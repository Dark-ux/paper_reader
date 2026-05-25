from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.ai import AskRequest, AskResponse, SummaryRead, SummaryRequest
from app.services import ai_service, paper_service


router = APIRouter(prefix="/ai", tags=["ai"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.post("/papers/{paper_id}/summary", response_model=SummaryRead)
def create_summary(
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


@router.post("/papers/{paper_id}/ask", response_model=AskResponse)
def ask_paper(session: SessionDep, paper_id: int, request: AskRequest) -> AskResponse:
    paper = paper_service.get_paper(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    try:
        return ai_service.answer_question(session, paper, request.question, request.max_chunks)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
