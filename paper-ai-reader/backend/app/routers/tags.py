from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagRead


router = APIRouter(prefix="/tags", tags=["tags"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[TagRead])
def read_tags(session: SessionDep) -> list[TagRead]:
    statement = select(Tag).order_by(Tag.name)
    return list(session.exec(statement).all())


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def create_tag(session: SessionDep, tag_in: TagCreate) -> TagRead:
    tag = Tag.model_validate(tag_in)
    now = datetime.now(UTC)
    tag.created_at = now
    tag.updated_at = now
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag
