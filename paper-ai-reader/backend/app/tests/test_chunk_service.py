from app.services.chunk_service import build_chunks
from app.services.pdf_service import PdfPageText


def test_build_chunks_preserves_page_numbers_and_removes_repeated_margins():
    repeated_header = "Journal of Local AI Reading"
    page_one = "\n".join(
        [
            repeated_header,
            "1",
            "Introduction",
            "This paper studies local PDF reading systems and chunk generation. " * 18,
            "The method keeps page numbers so answers can cite original pages. " * 8,
        ]
    )
    page_two = "\n".join(
        [
            repeated_header,
            "2",
            "Experiments",
            "The parser extracts text page by page before cleaning and splitting. " * 18,
            "Short page numbers and repeated headers should not become chunks. " * 8,
        ]
    )

    chunks = build_chunks(
        7,
        [
            PdfPageText(page_number=1, text=page_one),
            PdfPageText(page_number=2, text=page_two),
        ],
    )

    assert {chunk.page_number for chunk in chunks} == {1, 2}
    assert [chunk.chunk_index for chunk in chunks] == list(range(len(chunks)))
    assert all(chunk.paper_id == 7 for chunk in chunks)
    assert all(chunk.token_count > 0 for chunk in chunks)
    assert all(repeated_header not in chunk.text for chunk in chunks)
    assert all("\n1\n" not in chunk.text and "\n2\n" not in chunk.text for chunk in chunks)
