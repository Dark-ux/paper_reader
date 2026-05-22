from datetime import UTC, datetime

from sqlmodel import Session, select

from app.models.annotation import Annotation
from app.schemas.annotation import AnnotationCreate, AnnotationUpdate


def list_annotations(session: Session, paper_id: int | None = None) -> list[Annotation]:
    statement = select(Annotation)
    if paper_id is not None:
        statement = statement.where(Annotation.paper_id == paper_id)
    return list(session.exec(statement.order_by(Annotation.page_number, Annotation.created_at)).all())


def get_annotation(session: Session, annotation_id: int) -> Annotation | None:
    return session.get(Annotation, annotation_id)


def create_annotation(session: Session, annotation_in: AnnotationCreate) -> Annotation:
    annotation = Annotation.model_validate(annotation_in)
    now = datetime.now(UTC)
    annotation.created_at = now
    annotation.updated_at = now
    session.add(annotation)
    session.commit()
    session.refresh(annotation)
    return annotation


def update_annotation(
    session: Session,
    annotation: Annotation,
    annotation_in: AnnotationUpdate,
) -> Annotation:
    data = annotation_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(annotation, field, value)
    annotation.updated_at = datetime.now(UTC)
    session.add(annotation)
    session.commit()
    session.refresh(annotation)
    return annotation


def delete_annotation(session: Session, annotation: Annotation) -> None:
    session.delete(annotation)
    session.commit()
