from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.collection import Collection
from app.schemas.collection import CollectionCreate, CollectionRead


router = APIRouter(prefix="/collections", tags=["collections"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[CollectionRead])
def read_collections(session: SessionDep) -> list[CollectionRead]:
    statement = select(Collection).order_by(Collection.name)
    return list(session.exec(statement).all())


@router.post("", response_model=CollectionRead, status_code=status.HTTP_201_CREATED)
def create_collection(session: SessionDep, collection_in: CollectionCreate) -> CollectionRead:
    collection = Collection.model_validate(collection_in)
    now = datetime.now(UTC)
    collection.created_at = now
    collection.updated_at = now
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection
