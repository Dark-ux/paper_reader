from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.annotation import AnnotationCreate, AnnotationRead, AnnotationUpdate
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


@router.patch("/{annotation_id}", response_model=AnnotationRead)
def update_annotation(
    session: SessionDep,
    annotation_id: int,
    annotation_in: AnnotationUpdate,
) -> AnnotationRead:
    annotation = annotation_service.get_annotation(session, annotation_id)
    if annotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotation not found")
    return annotation_service.update_annotation(session, annotation, annotation_in)


@router.delete("/{annotation_id}")
def delete_annotation(session: SessionDep, annotation_id: int) -> dict[str, bool]:
    annotation = annotation_service.get_annotation(session, annotation_id)
    if annotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotation not found")
    annotation_service.delete_annotation(session, annotation)
    return {"success": True}
