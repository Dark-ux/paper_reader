from __future__ import annotations

from dataclasses import dataclass

import httpx
from sqlmodel import Session, select

from app.core.config import get_settings
from app.models.ai_summary import AiSummary
from app.models.paper import Paper
from app.schemas.ai import AskResponse, Citation, SummaryRead, SummaryRequest


NO_EVIDENCE_MESSAGE = "当前论文文本中未找到明确依据"

SUMMARY_PROMPT = """请基于给定论文片段，用中文总结这篇论文。

必须包含：
1. 研究背景
2. 要解决的问题
3. 核心方法
4. 系统/器件/模型结构
5. 实验流程
6. 关键结果
7. 主要贡献
8. 主要局限性
9. 适合写入综述的英文表述
10. 依据页码

要求：
- 只能基于提供的论文片段回答。
- 不要编造原文没有的信息。
- 关键结论后面标注 page。
- 如果论文片段不足以支撑某一项，写“当前论文文本中未找到明确依据”。

论文片段：
{context}
"""

ASK_PROMPT = """你是一个科研论文精读助手。
请基于下面提供的论文片段回答用户问题。

回答要求：
1. 优先直接回答问题。
2. 给出必要解释。
3. 每个关键结论后面标注依据页码。
4. 如果材料不足，明确说明“当前论文片段中没有找到明确依据”。
5. 不要使用论文片段之外的知识进行推断，除非明确标注为“可能推测”。

用户问题：
{question}

论文片段：
{context}
"""

EXTRACT_PROMPTS = {
    "method": "请只基于论文片段提取这篇论文的核心方法、模型/系统结构和实验流程。每个关键结论标注 page。",
    "results": "请只基于论文片段提取这篇论文的关键实验结果、量化指标和主要发现。每个关键结论标注 page。",
    "limitations": "请只基于论文片段提取这篇论文明确提到的局限性、失败案例、适用边界或未来工作。每个关键结论标注 page。",
}


@dataclass
class ChatResult:
    content: str
    model_name: str


def chat_completion(prompt: str) -> ChatResult:
    settings = get_settings()
    provider = settings.llm_provider.lower()
    if provider == "ollama":
        return _ollama_chat(prompt)
    if provider == "openai_compatible":
        return _openai_compatible_chat(prompt)
    raise RuntimeError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")


def create_embedding(text: str) -> list[float]:
    settings = get_settings()
    provider = settings.embedding_provider.lower()
    if provider in {"local", "ollama"}:
        return _ollama_embedding(text)
    if provider == "openai_compatible":
        return _openai_compatible_embedding(text)
    raise RuntimeError(f"Unsupported EMBEDDING_PROVIDER: {settings.embedding_provider}")


def generate_summary(session: Session, paper: Paper, request: SummaryRequest) -> SummaryRead:
    from app.services import rag_service

    if not request.force_refresh:
        existing = session.exec(
            select(AiSummary).where(
                AiSummary.paper_id == paper.id,
                AiSummary.summary_type == request.summary_type,
            )
        ).first()
        if existing:
            citations = rag_service.retrieve_relevant_chunks(
                session,
                paper.id or 0,
                _summary_query(request.summary_type),
                request.max_chunks,
            )
            return _summary_to_read(existing, citations)

    citations = rag_service.retrieve_relevant_chunks(
        session,
        paper.id or 0,
        _summary_query(request.summary_type),
        request.max_chunks,
    )
    if not citations:
        content = NO_EVIDENCE_MESSAGE
        model_name = "none"
    else:
        context = rag_service.format_context(citations)
        result = chat_completion(SUMMARY_PROMPT.format(context=context))
        content = result.content
        model_name = result.model_name

    summary = AiSummary(
        paper_id=paper.id or 0,
        summary_type=request.summary_type,
        content=content,
        model_name=model_name,
        prompt_version="summary-v2",
    )
    session.add(summary)
    session.commit()
    session.refresh(summary)
    return _summary_to_read(summary, citations)


def list_summaries(session: Session, paper_id: int) -> list[SummaryRead]:
    statement = (
        select(AiSummary)
        .where(AiSummary.paper_id == paper_id)
        .order_by(AiSummary.created_at.desc())
    )
    return [_summary_to_read(summary, []) for summary in session.exec(statement).all()]


def answer_question(session: Session, paper: Paper, question: str, max_chunks: int) -> AskResponse:
    from app.services import rag_service

    citations = rag_service.retrieve_relevant_chunks(session, paper.id or 0, question, max_chunks)
    if not citations:
        return AskResponse(answer=NO_EVIDENCE_MESSAGE, citations=[])

    context = rag_service.format_context(citations)
    result = chat_completion(ASK_PROMPT.format(question=question, context=context))
    return AskResponse(answer=result.content, citations=citations)


def extract_aspect(session: Session, paper: Paper, aspect: str, max_chunks: int = 8) -> AskResponse:
    question = EXTRACT_PROMPTS[aspect]
    return answer_question(session, paper, question, max_chunks)


def _ollama_chat(prompt: str) -> ChatResult:
    settings = get_settings()
    model = settings.ollama_model or settings.ai_chat_model
    try:
        with httpx.Client(timeout=120) as client:
            response = client.post(
                f"{settings.ollama_base_url.rstrip('/')}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                },
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Ollama chat request failed: {exc}") from exc
    data = response.json()
    return ChatResult(content=data.get("message", {}).get("content", "").strip(), model_name=model)


def _openai_compatible_chat(prompt: str) -> ChatResult:
    settings = get_settings()
    if not settings.openai_compatible_base_url:
        raise RuntimeError("OPENAI_COMPATIBLE_BASE_URL is not configured")
    model = settings.openai_compatible_model or settings.ai_chat_model
    headers = {}
    api_key = settings.openai_compatible_api_key or settings.openai_api_key
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    try:
        with httpx.Client(timeout=120) as client:
            response = client.post(
                f"{settings.openai_compatible_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(f"OpenAI-compatible chat request failed: {exc}") from exc
    data = response.json()
    return ChatResult(content=data["choices"][0]["message"]["content"].strip(), model_name=model)


def _ollama_embedding(text: str) -> list[float]:
    settings = get_settings()
    model = settings.embedding_model or settings.ai_embedding_model
    try:
        with httpx.Client(timeout=120) as client:
            response = client.post(
                f"{settings.ollama_base_url.rstrip('/')}/api/embeddings",
                json={"model": model, "prompt": text},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Ollama embedding request failed: {exc}") from exc
    embedding = response.json().get("embedding")
    if not isinstance(embedding, list):
        raise RuntimeError("Ollama embedding response did not include an embedding")
    return [float(value) for value in embedding]


def _openai_compatible_embedding(text: str) -> list[float]:
    settings = get_settings()
    if not settings.openai_compatible_base_url:
        raise RuntimeError("OPENAI_COMPATIBLE_BASE_URL is not configured")
    model = settings.embedding_model or settings.ai_embedding_model
    headers = {}
    api_key = settings.openai_compatible_api_key or settings.openai_api_key
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    try:
        with httpx.Client(timeout=120) as client:
            response = client.post(
                f"{settings.openai_compatible_base_url.rstrip('/')}/embeddings",
                headers=headers,
                json={"model": model, "input": text},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(f"OpenAI-compatible embedding request failed: {exc}") from exc
    data = response.json()
    return [float(value) for value in data["data"][0]["embedding"]]


def _summary_query(summary_type: str) -> str:
    if summary_type == "method":
        return EXTRACT_PROMPTS["method"]
    if summary_type == "results":
        return EXTRACT_PROMPTS["results"]
    if summary_type == "limitations":
        return EXTRACT_PROMPTS["limitations"]
    return "研究背景 问题 核心方法 模型结构 实验流程 关键结果 贡献 局限性 conclusion method results limitations"


def _summary_to_read(summary: AiSummary, citations: list[Citation]) -> SummaryRead:
    data = SummaryRead.model_validate(summary).model_dump()
    data["citations"] = citations
    return SummaryRead.model_validate(data)
