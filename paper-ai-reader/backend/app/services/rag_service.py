from sqlmodel import Session


def retrieve_relevant_chunks(
    _: Session,
    paper_id: int,
    question: str,
    max_chunks: int = 6,
) -> list[dict[str, str | int]]:
    return [
        {
            "paper_id": paper_id,
            "rank": 1,
            "text": "RAG retrieval is not implemented yet.",
            "question": question,
            "max_chunks": max_chunks,
        }
    ]
