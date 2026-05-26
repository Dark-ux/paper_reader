import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "pdfjs-dist/web/pdf_viewer.css";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createPaperAnnotation,
  deleteAnnotation,
  listPaperAnnotations,
  updateAnnotation
} from "../api/annotations";
import { translateText } from "../api/ai";
import { getPaper, parsePaper } from "../api/papers";
import { getPdfFileUrl } from "../api/pdf";
import { AiReadingPanel } from "../components/ai/AiReadingPanel";
import { AnnotationEditDialog } from "../components/reader/AnnotationEditDialog";
import { AnnotationSidebar } from "../components/reader/AnnotationSidebar";
import {
  PdfScrollViewer,
  type PdfScrollViewerHandle
} from "../components/reader/PdfScrollViewer";
import { ReaderToolbar } from "../components/reader/ReaderToolbar";
import { SelectionTranslatePopover } from "../components/reader/SelectionTranslatePopover";
import { Button } from "../components/ui/button";
import type { TranslateResponse } from "../types/ai";
import type { Annotation, AnnotationPosition, AnnotationRect } from "../types/annotation";
import type { Paper } from "../types/paper";
import { detectSelectionLanguage, getSelectionAnchor } from "../utils/useTextSelection";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type SelectionDraft = {
  pageNumber: number;
  text: string;
  rects: AnnotationRect[];
};

const DEFAULT_SCALE = 1.5;
const HIGHLIGHT_COLOR = "#facc15";
const zoomLevels = [1, 1.25, 1.5, 1.75, 2, 2.25];

function getPageText(textContent: unknown) {
  const items = (textContent as { items?: Array<{ str?: string }> }).items ?? [];
  return items.map((item) => item.str ?? "").join(" ");
}

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 1), pageCount || 1);
}

export function ReaderPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const numericPaperId = Number(paperId);
  const hasPaperId = Number.isFinite(numericPaperId) && numericPaperId > 0;
  const viewerRef = useRef<PdfScrollViewerHandle | null>(null);
  const translationRequestRef = useRef(0);

  const [paper, setPaper] = useState<Paper | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [translationPosition, setTranslationPosition] = useState<{ x: number; y: number } | null>(null);
  const [translationOriginal, setTranslationOriginal] = useState("");
  const [translationResult, setTranslationResult] = useState<TranslateResponse | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAnnotation =
    editingAnnotation && annotations.find((annotation) => annotation.id === editingAnnotation.id)
      ? annotations.find((annotation) => annotation.id === editingAnnotation.id) ?? editingAnnotation
      : editingAnnotation;

  function updateAnnotationInState(nextAnnotation: Annotation) {
    setAnnotations((current) =>
      current.map((annotation) => (annotation.id === nextAnnotation.id ? nextAnnotation : annotation))
    );
    setEditingAnnotation((current) => (current?.id === nextAnnotation.id ? nextAnnotation : current));
  }

  function scrollToPage(nextPage: number, clearSelection = true) {
    const boundedPage = clampPage(nextPage, pageCount);
    setSelectionDraft(null);
    if (clearSelection) {
      setSelectedAnnotationId(null);
    }
    window.getSelection()?.removeAllRanges();
    viewerRef.current?.scrollToPage(boundedPage);
  }

  function changeZoom(direction: -1 | 1) {
    const currentIndex = zoomLevels.findIndex((level) => level >= scale);
    const index = currentIndex === -1 ? zoomLevels.indexOf(DEFAULT_SCALE) : currentIndex;
    const nextIndex = Math.min(Math.max(index + direction, 0), zoomLevels.length - 1);
    setSelectionDraft(null);
    setScale(zoomLevels[nextIndex]);
  }

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (!hasPaperId) {
      return;
    }

    let cancelled = false;
    setLoadingPaper(true);
    setError(null);
    setMessage(null);
    setPageNumber(1);
    setPageCount(0);
    setScale(DEFAULT_SCALE);
    setPdfDocument(null);
    setAnnotations([]);
    setSelectionDraft(null);
    setEditingAnnotation(null);

    async function loadPaperData() {
      try {
        const [nextPaper, nextAnnotations] = await Promise.all([
          getPaper(numericPaperId),
          listPaperAnnotations(numericPaperId)
        ]);
        if (cancelled) {
          return;
        }
        setPaper(nextPaper);
        setAnnotations(nextAnnotations);
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF 加载失败");
      } finally {
        if (!cancelled) {
          setLoadingPaper(false);
        }
      }
    }

    void loadPaperData();
    return () => {
      cancelled = true;
    };
  }, [hasPaperId, numericPaperId]);

  const handleDocumentLoad = useCallback((nextPdfDocument: any, nextPageCount: number) => {
    setPdfDocument(nextPdfDocument);
    setPageCount(nextPageCount);
    setPageNumber(1);
  }, []);

  const handleCurrentPageChange = useCallback((nextPageNumber: number) => {
    setPageNumber(nextPageNumber);
  }, []);

  const handleTextSelection = useCallback((page: number, text: string, rects: AnnotationRect[]) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      return;
    }

    setSelectionDraft({ pageNumber: page, text: trimmed, rects });
    setMessage("已选中文本，可以添加高亮。");
    setTranslationOriginal(trimmed);
    setTranslationPosition(getSelectionAnchor());
    setTranslationResult(null);
    setTranslationError(null);
    setTranslationLoading(true);

    const requestId = translationRequestRef.current + 1;
    translationRequestRef.current = requestId;
    const { sourceLang, targetLang } = detectSelectionLanguage(trimmed);
    translateText({
      text: trimmed,
      source_lang: sourceLang,
      target_lang: targetLang
    })
      .then((response) => {
        if (translationRequestRef.current !== requestId) {
          return;
        }
        setTranslationResult(response);
      })
      .catch(() => {
        if (translationRequestRef.current !== requestId) {
          return;
        }
        setTranslationError("翻译失败，请检查 AI 模型服务是否启动。");
      })
      .finally(() => {
        if (translationRequestRef.current !== requestId) {
          return;
        }
        setTranslationLoading(false);
      });
  }, []);

  function closeTranslationPopover() {
    translationRequestRef.current += 1;
    setTranslationPosition(null);
    setTranslationOriginal("");
    setTranslationResult(null);
    setTranslationError(null);
    setTranslationLoading(false);
  }

  async function handleCreateHighlight() {
    if (!hasPaperId || !selectionDraft) {
      return;
    }

    const note = window.prompt("为这段高亮添加批注，可留空。", "");
    const position: AnnotationPosition = {
      page: selectionDraft.pageNumber,
      rects: selectionDraft.rects,
      scale
    };

    setError(null);
    try {
      const annotation = await createPaperAnnotation(numericPaperId, {
        page_number: selectionDraft.pageNumber,
        selected_text: selectionDraft.text,
        note,
        color: HIGHLIGHT_COLOR,
        position_json: JSON.stringify(position),
        annotation_type: note ? "note" : "highlight"
      });
      setAnnotations((current) => [...current, annotation].sort((a, b) => a.page_number - b.page_number));
      setSelectedAnnotationId(annotation.id);
      setSelectionDraft(null);
      window.getSelection()?.removeAllRanges();
      setMessage("高亮已保存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "高亮保存失败");
    }
  }

  function handleSelectAnnotation(annotation: Annotation) {
    setSelectedAnnotationId(annotation.id);
    scrollToPage(annotation.page_number, false);
  }

  function handleEditAnnotation(annotation: Annotation) {
    setSelectedAnnotationId(annotation.id);
    setEditingAnnotation(annotation);
    scrollToPage(annotation.page_number, false);
  }

  async function handleUpdateAnnotation(
    annotation: Annotation,
    payload: { note: string; color: string }
  ) {
    setError(null);
    try {
      const updated = await updateAnnotation(annotation.id, {
        note: payload.note,
        color: payload.color,
        annotation_type: payload.note.trim() ? "note" : "highlight"
      });
      updateAnnotationInState(updated);
      setMessage("批注已保存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "批注保存失败");
      throw err;
    }
  }

  async function handleDeleteAnnotation(annotation: Annotation) {
    if (!window.confirm("确定删除这条高亮笔记吗？")) {
      return;
    }
    setError(null);
    try {
      await deleteAnnotation(annotation.id);
      setAnnotations((current) => current.filter((item) => item.id !== annotation.id));
      if (selectedAnnotationId === annotation.id) {
        setSelectedAnnotationId(null);
      }
      if (editingAnnotation?.id === annotation.id) {
        setEditingAnnotation(null);
      }
      setMessage("标注已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "标注删除失败");
      throw err;
    }
  }

  async function handleSearch() {
    if (!pdfDocument || !searchQuery.trim()) {
      return;
    }

    const needle = searchQuery.trim().toLowerCase();
    setMessage(null);
    for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex += 1) {
      const page = await pdfDocument.getPage(pageIndex);
      const textContent = await page.getTextContent();
      if (getPageText(textContent).toLowerCase().includes(needle)) {
        scrollToPage(pageIndex);
        setMessage(`已跳转到第 ${pageIndex} 页。`);
        return;
      }
    }
    setMessage("未找到匹配文本。");
  }

  async function handleParsePdf() {
    if (!hasPaperId) {
      return;
    }
    setParsing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await parsePaper(numericPaperId);
      setMessage(`PDF 解析完成，生成 ${result.chunk_count} 个 chunks。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 解析失败");
    } finally {
      setParsing(false);
    }
  }

  async function refreshAnnotations() {
    if (!hasPaperId) {
      return;
    }
    try {
      setAnnotations(await listPaperAnnotations(numericPaperId));
      setMessage("AI 回答已保存为论文笔记。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "笔记刷新失败");
    }
  }

  async function handleCopyTranslation() {
    if (!translationResult) {
      return;
    }
    await navigator.clipboard.writeText(translationResult.translated_text);
    setMessage("译文已复制。");
  }

  async function handleSaveTranslationNote() {
    if (!hasPaperId || !selectionDraft || !translationResult) {
      return;
    }

    const position: AnnotationPosition = {
      page: selectionDraft.pageNumber,
      rects: selectionDraft.rects,
      scale
    };

    try {
      const annotation = await createPaperAnnotation(numericPaperId, {
        page_number: selectionDraft.pageNumber,
        selected_text: selectionDraft.text,
        note: `原文：\n${selectionDraft.text}\n\n译文：\n${translationResult.translated_text}`,
        color: "#93c5fd",
        position_json: JSON.stringify(position),
        annotation_type: "translation_note"
      });
      setAnnotations((current) => [...current, annotation].sort((a, b) => a.page_number - b.page_number));
      setSelectedAnnotationId(annotation.id);
      setMessage("翻译已保存为笔记。");
      closeTranslationPopover();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存翻译笔记失败");
    }
  }

  if (!hasPaperId) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center overflow-hidden rounded-lg border bg-card p-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold">请选择一篇论文</h1>
          <p className="mt-2 text-sm text-muted-foreground">从文献库打开论文后即可进入阅读器。</p>
          <Button asChild className="mt-4">
            <Link to="/">返回文献库</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3 overflow-hidden" onMouseDown={closeTranslationPopover}>
      <ReaderToolbar
        title={paper?.title ?? "PDF 阅读器"}
        pageNumber={pageNumber}
        pageCount={pageCount}
        scale={scale}
        searchQuery={searchQuery}
        parsing={parsing}
        canHighlight={Boolean(selectionDraft)}
        onBack={() => navigate("/")}
        onPreviousPage={() => scrollToPage(pageNumber - 1)}
        onNextPage={() => scrollToPage(pageNumber + 1)}
        onPageChange={scrollToPage}
        onZoomOut={() => changeZoom(-1)}
        onZoomIn={() => changeZoom(1)}
        onSearchQueryChange={setSearchQuery}
        onSearch={() => void handleSearch()}
        onParsePdf={() => void handleParsePdf()}
        onCreateHighlight={() => void handleCreateHighlight()}
      />

      {error ? (
        <div className="shrink-0 rounded-lg border border-destructive/40 bg-card p-3 text-sm">{error}</div>
      ) : null}
      {message ? (
        <div className="shrink-0 rounded-lg border bg-card p-3 text-sm text-accent-foreground">{message}</div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <AnnotationSidebar
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          onSelect={handleSelectAnnotation}
          onEdit={handleEditAnnotation}
          onDelete={(annotation) => void handleDeleteAnnotation(annotation)}
        />

        {loadingPaper ? (
          <main className="flex min-h-0 min-w-0 items-center justify-center rounded-lg border bg-muted/60 p-4 text-sm text-muted-foreground">
            正在加载论文...
          </main>
        ) : (
          <PdfScrollViewer
            ref={viewerRef}
            pdfUrl={getPdfFileUrl(numericPaperId)}
            scale={scale}
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            onDocumentLoad={handleDocumentLoad}
            onCurrentPageChange={handleCurrentPageChange}
            onTextSelection={handleTextSelection}
            onAnnotationClick={handleEditAnnotation}
          />
        )}

        <AiReadingPanel
          paperId={numericPaperId}
          onGoToPage={scrollToPage}
          onNoteSaved={() => void refreshAnnotations()}
        />
      </div>

      <SelectionTranslatePopover
        originalText={translationOriginal}
        result={translationResult}
        loading={translationLoading}
        error={translationError}
        position={translationPosition}
        onCopy={() => void handleCopyTranslation()}
        onSave={() => void handleSaveTranslationNote()}
        onClose={closeTranslationPopover}
      />

      <AnnotationEditDialog
        annotation={selectedAnnotation}
        onClose={() => setEditingAnnotation(null)}
        onSave={handleUpdateAnnotation}
        onDelete={handleDeleteAnnotation}
      />
    </div>
  );
}
