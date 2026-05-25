from __future__ import annotations

import math
import re
from collections import Counter
from datetime import UTC, datetime

from sqlmodel import Session, select

from app.models.chunk import Chunk
from app.models.paper import Paper
from app.services import pdf_service
from app.services.pdf_service import PdfPageText


MIN_CHINESE_CHARS = 80
TARGET_CHINESE_CHARS = 900
OVERLAP_CHINESE_CHARS = 120

MIN_ENGLISH_WORDS = 35
TARGET_ENGLISH_WORDS = 650
OVERLAP_ENGLISH_WORDS = 90

_CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
_EN_WORD_RE = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)?")
_PAGE_NUMBER_RE = re.compile(r"^(?:[-–—]?\s*)?(?:\d{1,4}|[ivxlcdmIVXLCDM]{1,8})(?:\s*[-–—]?)?$")
_SPACE_RE = re.compile(r"[ \t\f\v\u00a0]+")
_BLANK_LINE_RE = re.compile(r"\n{3,}")


def estimate_token_count(text: str) -> int:
    cjk_count = len(_CJK_RE.findall(text))
    english_words = len(_EN_WORD_RE.findall(text))
    other_chars = max(0, len(text) - cjk_count)
    return max(1, cjk_count + english_words + math.ceil(other_chars / 6)) if text.strip() else 0


def list_chunks(session: Session, paper_id: int) -> list[Chunk]:
    statement = (
        select(Chunk)
        .where(Chunk.paper_id == paper_id)
        .order_by(Chunk.chunk_index, Chunk.page_number)
    )
    return list(session.exec(statement).all())


def parse_paper(session: Session, paper: Paper) -> list[Chunk]:
    pages = pdf_service.extract_pages(paper.file_path)
    chunks = build_chunks(paper.id or 0, pages)
    return replace_paper_chunks(session, paper, chunks)


def build_chunks(paper_id: int, pages: list[PdfPageText]) -> list[Chunk]:
    repeated_lines = _find_repeated_margin_lines(pages)
    chunks: list[Chunk] = []

    for page in pages:
        page_text = clean_page_text(page.text, repeated_lines)
        for text in split_page_text(page_text):
            chunks.append(
                Chunk(
                    paper_id=paper_id,
                    page_number=page.page_number,
                    chunk_index=len(chunks),
                    text=text,
                    token_count=estimate_token_count(text),
                )
            )
    return chunks


def replace_paper_chunks(session: Session, paper: Paper, chunks: list[Chunk]) -> list[Chunk]:
    existing_chunks = session.exec(select(Chunk).where(Chunk.paper_id == paper.id)).all()
    for chunk in existing_chunks:
        session.delete(chunk)
    session.flush()

    for index, chunk in enumerate(chunks):
        chunk.paper_id = paper.id or 0
        chunk.chunk_index = index
        session.add(chunk)

    paper.page_count = paper.page_count or _max_page_number(chunks)
    paper.updated_at = datetime.now(UTC)
    session.add(paper)
    session.commit()

    for chunk in chunks:
        session.refresh(chunk)
    session.refresh(paper)
    return chunks


def clean_page_text(text: str, repeated_lines: set[str] | None = None) -> str:
    repeated_lines = repeated_lines or set()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00ad\n", "").replace("-\n", "")
    text = _SPACE_RE.sub(" ", text)

    lines: list[str] = []
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        normalized = _normalize_margin_line(line)
        if not line or _PAGE_NUMBER_RE.fullmatch(line):
            continue
        if normalized in repeated_lines and len(normalized) <= 160:
            continue
        if _looks_like_noise(line):
            continue
        lines.append(line)

    cleaned = "\n".join(lines)
    cleaned = re.sub(r"(?<=[A-Za-z])\n(?=[a-z])", " ", cleaned)
    cleaned = _BLANK_LINE_RE.sub("\n\n", cleaned)
    return cleaned.strip()


def split_page_text(text: str) -> list[str]:
    paragraphs = _split_paragraphs(text)
    if not paragraphs:
        return []

    chunks: list[str] = []
    current: list[str] = []
    english_mode = _is_english_dominant(text)
    target_size = TARGET_ENGLISH_WORDS if english_mode else TARGET_CHINESE_CHARS
    overlap_size = OVERLAP_ENGLISH_WORDS if english_mode else OVERLAP_CHINESE_CHARS

    for paragraph in paragraphs:
        parts = _split_oversized_paragraph(paragraph, target_size, english_mode)
        for part in parts:
            candidate = [*current, part]
            if current and _measure("\n\n".join(candidate), english_mode) > target_size:
                chunk_text = "\n\n".join(current).strip()
                if _is_meaningful_chunk(chunk_text, english_mode):
                    chunks.append(chunk_text)
                current = _overlap_tail(current, overlap_size, english_mode)
            current.append(part)

    if current:
        chunk_text = "\n\n".join(current).strip()
        if _is_meaningful_chunk(chunk_text, english_mode):
            chunks.append(chunk_text)

    return chunks


def _find_repeated_margin_lines(pages: list[PdfPageText]) -> set[str]:
    counter: Counter[str] = Counter()
    for page in pages:
        lines = [_normalize_margin_line(line) for line in page.text.splitlines() if line.strip()]
        candidates = [line for line in [*lines[:2], *lines[-2:]] if 4 <= len(line) <= 160]
        counter.update(candidates)

    threshold = max(2, math.ceil(len(pages) * 0.3))
    return {line for line, count in counter.items() if count >= threshold and not _PAGE_NUMBER_RE.fullmatch(line)}


def _split_paragraphs(text: str) -> list[str]:
    raw_blocks = re.split(r"\n\s*\n", text)
    paragraphs: list[str] = []
    for block in raw_blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue
        paragraph = " ".join(lines) if _lines_look_wrapped(lines) else "\n".join(lines)
        paragraph = _SPACE_RE.sub(" ", paragraph).strip()
        if paragraph:
            paragraphs.append(paragraph)
    return paragraphs


def _split_oversized_paragraph(paragraph: str, target_size: int, english_mode: bool) -> list[str]:
    if _measure(paragraph, english_mode) <= target_size:
        return [paragraph]

    sentences = re.split(r"(?<=[。！？.!?;；])\s+", paragraph)
    if len(sentences) <= 1:
        return _hard_split(paragraph, target_size, english_mode)

    parts: list[str] = []
    current: list[str] = []
    for sentence in sentences:
        candidate = " ".join([*current, sentence]).strip()
        if current and _measure(candidate, english_mode) > target_size:
            parts.append(" ".join(current).strip())
            current = [sentence]
        else:
            current.append(sentence)
    if current:
        parts.append(" ".join(current).strip())
    return [part for part in parts if part]


def _hard_split(text: str, target_size: int, english_mode: bool) -> list[str]:
    if english_mode:
        words = text.split()
        return [" ".join(words[index : index + target_size]) for index in range(0, len(words), target_size)]
    return [text[index : index + target_size].strip() for index in range(0, len(text), target_size)]


def _overlap_tail(paragraphs: list[str], overlap_size: int, english_mode: bool) -> list[str]:
    tail: list[str] = []
    total = 0
    for paragraph in reversed(paragraphs):
        size = _measure(paragraph, english_mode)
        if tail and total + size > overlap_size:
            break
        tail.insert(0, paragraph)
        total += size
    return tail


def _is_meaningful_chunk(text: str, english_mode: bool) -> bool:
    if not text.strip():
        return False
    minimum = MIN_ENGLISH_WORDS if english_mode else MIN_CHINESE_CHARS
    if _measure(text, english_mode) < minimum:
        return False
    return not _looks_like_noise(text)


def _measure(text: str, english_mode: bool) -> int:
    if english_mode:
        return len(_EN_WORD_RE.findall(text))
    return len(_CJK_RE.findall(text)) or len(text)


def _is_english_dominant(text: str) -> bool:
    cjk_count = len(_CJK_RE.findall(text))
    english_words = len(_EN_WORD_RE.findall(text))
    return english_words > cjk_count


def _lines_look_wrapped(lines: list[str]) -> bool:
    if len(lines) <= 1:
        return False
    short_lines = sum(1 for line in lines if len(line) < 35)
    return short_lines / len(lines) < 0.45


def _normalize_margin_line(line: str) -> str:
    return _SPACE_RE.sub(" ", line.strip()).lower()


def _looks_like_noise(text: str) -> bool:
    compact = re.sub(r"\s+", "", text)
    if len(compact) < 4:
        return True
    readable = re.findall(r"[\w\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff.,;:!?，。；：！？()\[\]{}+\-*/=<>%]", compact)
    return len(readable) / len(compact) < 0.55


def _max_page_number(chunks: list[Chunk]) -> int | None:
    page_numbers = [chunk.page_number for chunk in chunks if chunk.page_number is not None]
    return max(page_numbers) if page_numbers else None
