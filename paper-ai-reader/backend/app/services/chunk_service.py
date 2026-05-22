from sqlmodel import Session, select

from app.models.chunk import Chunk


def estimate_token_count(text: str) -> int:
    return max(1, len(text) // 4) if text.strip() else 0


def split_text(text: str, max_chars: int = 2400, overlap: int = 240) -> list[str]:
    if not text.strip():
        return []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end].strip())
        if end == len(text):
            break
        start = max(0, end - overlap)
    return [chunk for chunk in chunks if chunk]


def replace_paper_chunks(session: Session, paper_id: int, text: str) -> list[Chunk]:
    existing_chunks = session.exec(select(Chunk).where(Chunk.paper_id == paper_id)).all()
    for chunk in existing_chunks:
        session.delete(chunk)
    session.flush()

    chunks = [
        Chunk(
            paper_id=paper_id,
            chunk_index=index,
            text=chunk,
            token_count=estimate_token_count(chunk),
        )
        for index, chunk in enumerate(split_text(text))
    ]
    for chunk in chunks:
        session.add(chunk)
    session.commit()
    for chunk in chunks:
        session.refresh(chunk)
    return chunks
