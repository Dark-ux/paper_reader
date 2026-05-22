from datetime import UTC, datetime

from sqlmodel import Session, select

from app.models.annotation import Annotation
from app.schemas.annotation import AnnotationCreate


def list_annotations(session: Session, paper_id: int | None = None) -> list[Annotation]:
    statement = select(Annotation)
    if paper_id is not None:
        statement = statement.where(Annotation.paper_id == paper_id)
    return list(session.exec(statement.order_by(Annotation.created_at.desc())).all())


def create_annotation(session: Session, annotation_in: AnnotationCreate) -> Annotation:
    annotation = Annotation.model_validate(annotation_in)
    now = datetime.now(UTC)
    annotation.created_at = now
    annotation.updated_at = now
    session.add(annotation)
    session.commit()
    session.refresh(annotation)
    return annotation
