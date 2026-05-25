from __future__ import annotations

from collections import Counter
import re

from sqlmodel import Session, select

from app.core.config import get_settings
from app.models.chunk import Chunk
from app.schemas.ai import BuildIndexResponse, Citation


_WORD_RE = re.compile(r"[\w\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+")


def build_index(session: Session, paper_id: int) -> BuildIndexResponse:
    chunks = _list_db_chunks(session, paper_id)
    if not chunks:
        raise ValueError("No chunks found. Parse the PDF before building an AI index.")

    collection_name = _collection_name(paper_id)
    collection = _get_collection(collection_name)
    existing = collection.get(where={"paper_id": paper_id}, include=[])
    existing_ids = existing.get("ids", [])
    if existing_ids:
        collection.delete(ids=existing_ids)

    from app.services import ai_service

    ids: list[str] = []
    embeddings: list[list[float]] = []
    documents: list[str] = []
    metadatas: list[dict[str, int]] = []
    for chunk in chunks:
        ids.append(_embedding_id(chunk))
        embeddings.append(ai_service.create_embedding(chunk.text))
        documents.append(chunk.text)
        metadatas.append(
            {
                "paper_id": paper_id,
                "chunk_id": chunk.id or 0,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number or 0,
            }
        )

    collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    for chunk, embedding_id in zip(chunks, ids, strict=True):
        chunk.embedding_id = embedding_id
        session.add(chunk)
    session.commit()
    return BuildIndexResponse(
        paper_id=paper_id,
        indexed_chunks=len(chunks),
        collection_name=collection_name,
    )


def retrieve_relevant_chunks(
    session: Session,
    paper_id: int,
    question: str,
    max_chunks: int = 6,
) -> list[Citation]:
    chunks = _list_db_chunks(session, paper_id)
    if not chunks:
        return []

    try:
        citations = _retrieve_from_chroma(session, paper_id, question, max_chunks)
    except Exception:
        citations = []

    if citations:
        return citations
    return _keyword_fallback(chunks, question, max_chunks)


def format_context(citations: list[Citation]) -> str:
    blocks = []
    for citation in citations:
        blocks.append(
            f"[chunk {citation.chunk_index}, page {citation.page_number}]\n{citation.text}"
        )
    return "\n\n".join(blocks)


def _retrieve_from_chroma(
    session: Session,
    paper_id: int,
    question: str,
    max_chunks: int,
) -> list[Citation]:
    from app.services import ai_service

    collection = _get_collection(_collection_name(paper_id))
    if collection.count() == 0:
        build_index(session, paper_id)

    query_embedding = ai_service.create_embedding(question)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=max_chunks,
        where={"paper_id": paper_id},
        include=["documents", "metadatas", "distances"],
    )
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    citations: list[Citation] = []
    for document, metadata, distance in zip(documents, metadatas, distances, strict=False):
        if distance is not None and float(distance) > 1.8:
            continue
        citation = _citation_from_metadata(str(document), metadata or {})
        if citation is not None:
            citations.append(citation)
    return citations


def _keyword_fallback(chunks: list[Chunk], question: str, max_chunks: int) -> list[Citation]:
    terms = Counter(_tokenize(question))
    if not terms:
        return []

    scored: list[tuple[int, Chunk]] = []
    for chunk in chunks:
        chunk_terms = Counter(_tokenize(chunk.text))
        score = sum(chunk_terms[term] for term in terms)
        if score:
            scored.append((score, chunk))

    scored.sort(key=lambda item: (-item[0], item[1].chunk_index))
    return [_citation_from_chunk(chunk) for _, chunk in scored[:max_chunks]]


def _get_collection(name: str):
    import chromadb

    settings = get_settings()
    settings.vector_index_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(settings.vector_index_dir))
    return client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})


def _list_db_chunks(session: Session, paper_id: int) -> list[Chunk]:
    statement = (
        select(Chunk)
        .where(Chunk.paper_id == paper_id)
        .order_by(Chunk.chunk_index, Chunk.page_number)
    )
    return list(session.exec(statement).all())


def _collection_name(paper_id: int) -> str:
    return f"paper_{paper_id}_chunks"


def _embedding_id(chunk: Chunk) -> str:
    return f"paper:{chunk.paper_id}:chunk:{chunk.id or chunk.chunk_index}"


def _citation_from_metadata(document: str, metadata: dict) -> Citation | None:
    page_number = int(metadata.get("page_number") or 0)
    chunk_index = int(metadata.get("chunk_index") or 0)
    if page_number <= 0:
        return None
    return Citation(
        page_number=page_number,
        chunk_id=int(metadata.get("chunk_id") or 0) or None,
        chunk_index=chunk_index,
        text=document,
    )


def _citation_from_chunk(chunk: Chunk) -> Citation:
    return Citation(
        page_number=chunk.page_number or 0,
        chunk_id=chunk.id,
        chunk_index=chunk.chunk_index,
        text=chunk.text,
    )


def _tokenize(text: str) -> list[str]:
    return [token.lower() for token in _WORD_RE.findall(text) if len(token.strip()) > 1]
