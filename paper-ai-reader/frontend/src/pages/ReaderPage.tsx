import {
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Minus,
  Plus,
  Save,
  Search,
  Trash2
} from "lucide-react";
import { CSSProperties, MouseEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { getPaper } from "../api/papers";
import { getPdfFileUrl } from "../api/pdf";
import { Button } from "../components/ui/button";
import type { Annotation, AnnotationPosition, AnnotationRect } from "../types/annotation";
import type { Paper } from "../types/paper";
import { cn } from "../utils/cn";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type SelectionDraft = {
  text: string;
  rects: AnnotationRect[];
};

type ScrollTarget = "top" | "bottom";

const DEFAULT_SCALE = 1.5;
const HIGHLIGHT_COLOR = "#facc15";
const zoomLevels = [1, 1.25, 1.5, 1.75, 2, 2.25];

function parsePosition(positionJson?: string | null): AnnotationPosition | null {
  if (!positionJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(positionJson) as AnnotationPosition;
    if (!Array.isArray(parsed.rects)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageLayerRef = useRef<HTMLDivElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const pdfScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTargetRef = useRef<ScrollTarget>("top");
  const wheelLockedRef = useRef(false);

  const [paper, setPaper] = useState<Paper | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageAnnotations = useMemo(() => {
    return annotations.filter((annotation) => annotation.page_number === pageNumber);
  }, [annotations, pageNumber]);

  function updateAnnotationInState(nextAnnotation: Annotation) {
    setAnnotations((current) =>
      current.map((annotation) => (annotation.id === nextAnnotation.id ? nextAnnotation : annotation))
    );
  }

  function goToPage(nextPage: number, scrollTarget: ScrollTarget = "top") {
    const boundedPage = clampPage(nextPage, pageCount);
    pendingScrollTargetRef.current = scrollTarget;
    setSelectionDraft(null);
    setSelectedAnnotationId(null);
    window.getSelection()?.removeAllRanges();

    if (boundedPage === pageNumber) {
      const scroller = pdfScrollRef.current;
      if (scroller) {
        scroller.scrollTop = scrollTarget === "bottom" ? scroller.scrollHeight : 0;
      }
      return;
    }
    setPageNumber(boundedPage);
  }

  function changeZoom(direction: -1 | 1) {
    const currentIndex = zoomLevels.findIndex((level) => level >= scale);
    const index = currentIndex === -1 ? zoomLevels.indexOf(DEFAULT_SCALE) : currentIndex;
    const nextIndex = Math.min(Math.max(index + direction, 0), zoomLevels.length - 1);
    pendingScrollTargetRef.current = "top";
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
    setLoading(true);
    setError(null);
    setMessage(null);
    setPageNumber(1);
    setScale(DEFAULT_SCALE);
    setPdfDocument(null);
    setAnnotations([]);
    setSelectionDraft(null);
    pendingScrollTargetRef.current = "top";

    async function loadPdf() {
      try {
        const [nextPaper, nextAnnotations] = await Promise.all([
          getPaper(numericPaperId),
          listPaperAnnotations(numericPaperId)
        ]);
        if (cancelled) {
          return;
        }

        const loadingTask = pdfjsLib.getDocument(getPdfFileUrl(numericPaperId));
        const nextPdfDocument = await loadingTask.promise;
        if (cancelled) {
          return;
        }

        setPaper(nextPaper);
        setAnnotations(nextAnnotations);
        setPdfDocument(nextPdfDocument);
        setPageCount(nextPdfDocument.numPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF 加载失败");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPdf();
    return () => {
      cancelled = true;
    };
  }, [hasPaperId, numericPaperId]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current) {
      return;
    }

    let cancelled = false;

    async function renderPage() {
      const page = await pdfDocument.getPage(pageNumber);
      if (cancelled) {
        return;
      }

      const viewport = page.getViewport({ scale });
      const outputScale = Math.max(window.devicePixelRatio || 1, 1);
      const canvas = canvasRef.current;
      const textLayerContainer = textLayerRef.current;
      if (!canvas || !textLayerContainer) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setPageSize({ width: viewport.width, height: viewport.height });

      const transform: [number, number, number, number, number, number] | undefined =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      await page.render({ canvasContext: context, viewport, transform }).promise;
      if (cancelled) {
        return;
      }

      const textContent = await page.getTextContent();
      if (cancelled) {
        return;
      }

      textLayerContainer.innerHTML = "";
      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayerContainer,
        viewport
      });
      await textLayer.render();
    }

    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [pageNumber, pdfDocument, scale]);

  useEffect(() => {
    const scroller = pdfScrollRef.current;
    if (!scroller) {
      return;
    }
    requestAnimationFrame(() => {
      scroller.scrollTop =
        pendingScrollTargetRef.current === "bottom" ? scroller.scrollHeight : 0;
    });
  }, [pageNumber, pageSize.height, pageSize.width, scale]);

  function handleViewerWheel(event: WheelEvent<HTMLDivElement>) {
    const scroller = event.currentTarget;
    const atTop = scroller.scrollTop <= 2;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;

    if (event.deltaY > 0 && !atBottom) {
      return;
    }
    if (event.deltaY < 0 && !atTop) {
      return;
    }
    if (event.deltaY > 0 && pageNumber >= pageCount) {
      return;
    }
    if (event.deltaY < 0 && pageNumber <= 1) {
      return;
    }

    event.preventDefault();
    if (wheelLockedRef.current) {
      return;
    }

    wheelLockedRef.current = true;
    window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, 260);

    if (event.deltaY > 0) {
      goToPage(pageNumber + 1, "top");
    } else {
      goToPage(pageNumber - 1, "bottom");
    }
  }

  function handlePageMouseUp(event: MouseEvent<HTMLDivElement>) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !pageLayerRef.current) {
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      return;
    }

    const range = selection.getRangeAt(0);
    const pageRect = pageLayerRef.current.getBoundingClientRect();
    const rects = Array.from(range.getClientRects())
      .map((rect) => {
        const left = Math.max(rect.left, pageRect.left);
        const top = Math.max(rect.top, pageRect.top);
        const right = Math.min(rect.right, pageRect.right);
        const bottom = Math.min(rect.bottom, pageRect.bottom);
        return {
          x: (left - pageRect.left) / scale,
          y: (top - pageRect.top) / scale,
          width: Math.max(0, right - left) / scale,
          height: Math.max(0, bottom - top) / scale
        };
      })
      .filter((rect) => rect.width > 0 && rect.height > 0);

    if (rects.length === 0) {
      return;
    }

    setSelectionDraft({ text, rects });
    setMessage("已选中文本，可以添加高亮。");
    event.stopPropagation();
  }

  async function handleCreateHighlight() {
    if (!hasPaperId || !selectionDraft) {
      return;
    }

    const note = window.prompt("为这段高亮添加批注，可留空。", "");
    const position: AnnotationPosition = {
      page: pageNumber,
      rects: selectionDraft.rects,
      scale
    };

    setError(null);
    try {
      const annotation = await createPaperAnnotation(numericPaperId, {
        page_number: pageNumber,
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

  async function handleSaveNote(annotation: Annotation, note: string) {
    setError(null);
    try {
      const updated = await updateAnnotation(annotation.id, {
        note,
        annotation_type: note.trim() ? "note" : "highlight"
      });
      updateAnnotationInState(updated);
      setMessage("批注已保存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "批注保存失败");
    }
  }

  async function handleDeleteAnnotation(annotation: Annotation) {
    setError(null);
    try {
      await deleteAnnotation(annotation.id);
      setAnnotations((current) => current.filter((item) => item.id !== annotation.id));
      if (selectedAnnotationId === annotation.id) {
        setSelectedAnnotationId(null);
      }
      setMessage("标注已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "标注删除失败");
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
        goToPage(pageIndex, "top");
        setMessage(`已跳转到第 ${pageIndex} 页。`);
        return;
      }
    }
    setMessage("未找到匹配文本。");
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
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 flex-col gap-3 rounded-lg border bg-card p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <button
            className="mb-1 text-xs text-muted-foreground hover:text-foreground"
            type="button"
            onClick={() => navigate("/")}
          >
            返回文献库
          </button>
          <h1 className="truncate text-lg font-semibold">{paper?.title ?? "PDF 阅读器"}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="icon" variant="outline" title="上一页" onClick={() => goToPage(pageNumber - 1, "top")}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex h-9 items-center rounded-md border bg-background px-2 text-sm">
            <input
              className="w-12 bg-transparent text-center outline-none"
              value={pageNumber}
              onChange={(event) => goToPage(Number(event.target.value) || 1, "top")}
            />
            <span className="text-muted-foreground">/ {pageCount || "-"}</span>
          </div>
          <Button type="button" size="icon" variant="outline" title="下一页" onClick={() => goToPage(pageNumber + 1, "top")}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" size="icon" variant="outline" title="缩小" onClick={() => changeZoom(-1)}>
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="h-9 rounded-md border bg-background px-2 py-2 text-sm">{Math.round(scale * 100)}%</div>
          <Button type="button" size="icon" variant="outline" title="放大" onClick={() => changeZoom(1)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="relative min-w-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSearch();
                }
              }}
              placeholder="搜索 PDF"
            />
          </div>
          <Button type="button" variant="outline" onClick={() => void handleSearch()}>
            搜索
          </Button>
          <Button type="button" disabled={!selectionDraft} onClick={() => void handleCreateHighlight()}>
            <Highlighter className="h-4 w-4" aria-hidden="true" />
            高亮所选
          </Button>
        </div>
      </header>

      {error ? (
        <div className="shrink-0 rounded-lg border border-destructive/40 bg-card p-3 text-sm">{error}</div>
      ) : null}
      {message ? (
        <div className="shrink-0 rounded-lg border bg-card p-3 text-sm text-accent-foreground">{message}</div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <h2 className="text-sm font-semibold">笔记</h2>
            <span className="text-xs text-muted-foreground">{annotations.length}</span>
          </div>
          <div className="grid min-h-0 gap-2 overflow-auto p-3">
            {annotations.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无标注</p>
            ) : (
              annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={cn(
                    "rounded-md border bg-background p-3 text-left text-sm hover:bg-muted",
                    selectedAnnotationId === annotation.id && "border-primary"
                  )}
                >
                  <button
                    className="w-full text-left"
                    type="button"
                    onClick={() => {
                      setSelectedAnnotationId(annotation.id);
                      goToPage(annotation.page_number, "top");
                    }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">第 {annotation.page_number} 页</span>
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: annotation.color }}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {annotation.selected_text || "区域标注"}
                    </p>
                    {annotation.note ? <p className="mt-2 text-sm">{annotation.note}</p> : null}
                  </button>

                  {selectedAnnotationId === annotation.id ? (
                    <div className="mt-3 grid gap-2 border-t pt-3">
                      <textarea
                        className="min-h-24 resize-y rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        value={annotation.note ?? ""}
                        onChange={(event) =>
                          updateAnnotationInState({ ...annotation, note: event.target.value })
                        }
                        placeholder="写批注"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          title="删除标注"
                          onClick={() => void handleDeleteAnnotation(annotation)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleSaveNote(annotation, annotation.note ?? "")}
                        >
                          <Save className="h-4 w-4" aria-hidden="true" />
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </aside>

        <main
          ref={pdfScrollRef}
          className="min-h-0 min-w-0 overflow-auto rounded-lg border bg-muted/60 p-4"
          onWheel={handleViewerWheel}
        >
          <div className="mx-auto flex min-h-full w-max min-w-full items-start justify-center">
            <div
              ref={pageLayerRef}
              className="relative bg-white shadow-sm"
              style={{ width: pageSize.width || 1, height: pageSize.height || 1 }}
              onMouseUp={handlePageMouseUp}
            >
              {loading ? (
                <div className="flex h-96 w-72 items-center justify-center text-sm text-muted-foreground">
                  正在加载 PDF...
                </div>
              ) : null}
              <canvas ref={canvasRef} className="absolute left-0 top-0 z-0" />
              <div className="pointer-events-none absolute left-0 top-0 z-10">
                {pageAnnotations.map((annotation) => {
                  const position = parsePosition(annotation.position_json);
                  if (!position) {
                    return null;
                  }
                  return position.rects.map((rect, index) => (
                    <div
                      key={`${annotation.id}-${index}`}
                      className="absolute rounded-[2px] mix-blend-multiply"
                      style={{
                        left: rect.x * scale,
                        top: rect.y * scale,
                        width: rect.width * scale,
                        height: rect.height * scale,
                        backgroundColor: annotation.color || HIGHLIGHT_COLOR,
                        opacity: 0.52
                      }}
                      title={annotation.note || annotation.selected_text || "标注"}
                    />
                  ));
                })}
              </div>
              <div
                ref={textLayerRef}
                className="textLayer absolute left-0 top-0 z-20"
                style={
                  {
                    width: pageSize.width || 1,
                    height: pageSize.height || 1,
                    zIndex: 20,
                    "--scale-factor": scale
                  } as CSSProperties
                }
              />
            </div>
          </div>
        </main>

        <aside className="min-h-0 overflow-hidden rounded-lg border bg-card">
          <div className="flex h-12 items-center border-b px-4">
            <h2 className="text-sm font-semibold">AI 精读</h2>
          </div>
          <div className="min-h-48" />
        </aside>
      </div>
    </div>
  );
}
