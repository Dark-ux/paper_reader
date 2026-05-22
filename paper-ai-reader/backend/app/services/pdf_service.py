from pathlib import Path


def _open_document(path: str | Path):
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is not installed. Run `pip install -r requirements.txt`.") from exc

    return fitz.open(Path(path))


def get_page_count(path: str | Path) -> int:
    with _open_document(path) as doc:
        return doc.page_count


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
