from pathlib import Path
import re

from pydantic import BaseModel


class PdfMetadata(BaseModel):
    page_count: int
    title: str | None = None
    authors: str | None = None
    abstract: str | None = None
    keywords: str | None = None
    year: int | None = None


def _open_document(path: str | Path):
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is not installed. Run `pip install -r requirements.txt`.") from exc

    return fitz.open(Path(path))


def get_page_count(path: str | Path) -> int:
    with _open_document(path) as doc:
        return doc.page_count


def _clean_metadata_value(value: str | None) -> str | None:
    if value is None:
        return None
    clean_value = value.strip()
    return clean_value or None


def _extract_year(raw_date: str | None) -> int | None:
    if not raw_date:
        return None
    match = re.search(r"(19|20)\d{2}", raw_date)
    if match is None:
        return None
    return int(match.group(0))


def get_document_metadata(path: str | Path) -> PdfMetadata:
    with _open_document(path) as doc:
        metadata = doc.metadata or {}
        return PdfMetadata(
            page_count=doc.page_count,
            title=_clean_metadata_value(metadata.get("title")),
            authors=_clean_metadata_value(metadata.get("author")),
            abstract=_clean_metadata_value(metadata.get("subject")),
            keywords=_clean_metadata_value(metadata.get("keywords")),
            year=_extract_year(metadata.get("creationDate") or metadata.get("modDate")),
        )


def extract_text(path: str | Path, page_number: int | None = None) -> str:
    with _open_document(path) as doc:
        if page_number is not None:
            index = page_number - 1
            if index < 0 or index >= doc.page_count:
                raise ValueError("page_number is out of range")
            return doc.load_page(index).get_text()

        pages: list[str] = []
        for page in doc:
            pages.append(page.get_text())
        return "\n\n".join(pages)
