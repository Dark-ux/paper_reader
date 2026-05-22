from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.annotation import AnnotationCreate, AnnotationRead
from app.services import annotation_service


router = APIRouter(prefix="/annotations", tags=["annotations"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[AnnotationRead])
def read_annotations(session: SessionDep, paper_id: int | None = None) -> list[AnnotationRead]:
    return annotation_service.list_annotations(session, paper_id)


@router.post("", response_model=AnnotationRead, status_code=status.HTTP_201_CREATED)
def create_annotation(
    session: SessionDep,
    annotation_in: AnnotationCreate,
) -> AnnotationRead:
    return annotation_service.create_annotation(session, annotation_in)
