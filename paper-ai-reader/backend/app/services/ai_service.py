from sqlmodel import Session, select

from app.core.config import get_settings
from app.models.ai_summary import AiSummary
from app.models.paper import Paper
from app.schemas.ai import AskResponse, SummaryRequest
from app.services import rag_service


def generate_summary(session: Session, paper: Paper, request: SummaryRequest) -> AiSummary:
    settings = get_settings()
    if not request.force_refresh:
        existing = session.exec(
            select(AiSummary).where(
                AiSummary.paper_id == paper.id,
                AiSummary.summary_type == request.summary_type,
            )
        ).first()
        if existing:
            return existing

    prompt_version = "summary-v1"
    content = (
        f"AI summary placeholder for `{paper.title}`.\n\n"
        "Next step: extract PDF text with PyMuPDF, split it into chunks, "
        "then call Ollama or an OpenAI-compatible chat endpoint."
    )
    summary = AiSummary(
        paper_id=paper.id or 0,
        summary_type=request.summary_type,
        content=content,
        model_name=settings.ai_chat_model,
        prompt_version=prompt_version,
    )
    session.add(summary)
    session.commit()
    session.refresh(summary)
    return summary


def answer_question(session: Session, paper: Paper, question: str, max_chunks: int) -> AskResponse:
    chunks = rag_service.retrieve_relevant_chunks(session, paper.id or 0, question, max_chunks)
    return AskResponse(
        answer=(
            "AI question answering is wired as an API placeholder. "
            "After embeddings are added, this endpoint can use retrieved chunks as context."
        ),
        citations=[f"paper:{paper.id}:chunk:{chunk['rank']}" for chunk in chunks],
    )
