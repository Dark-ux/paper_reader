import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import * as pdfjsLib from "pdfjs-dist";

import type { Annotation, AnnotationRect } from "../../types/annotation";
import { PdfPageView } from "./PdfPageView";

export type PdfScrollViewerHandle = {
  scrollToPage: (pageNumber: number) => void;
  getDocument: () => any | null;
};

type PdfScrollViewerProps = {
  pdfUrl: string;
  scale: number;
  annotations: Annotation[];
  selectedAnnotationId?: number | null;
  onDocumentLoad: (pdfDocument: any, pageCount: number) => void;
  onCurrentPageChange: (pageNumber: number) => void;
  onTextSelection: (pageNumber: number, text: string, rects: AnnotationRect[]) => void;
  onAnnotationClick: (annotation: Annotation) => void;
};

function clampPage(pageNumber: number, pageCount: number) {
  return Math.min(Math.max(pageNumber, 1), pageCount || 1);
}

export const PdfScrollViewer = forwardRef<PdfScrollViewerHandle, PdfScrollViewerProps>(
  (
    {
      pdfUrl,
      scale,
      annotations,
      selectedAnnotationId,
      onDocumentLoad,
      onCurrentPageChange,
      onTextSelection,
      onAnnotationClick
    },
    ref
  ) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const pdfDocumentRef = useRef<any | null>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const scrollRafRef = useRef<number | null>(null);
    const [pdfDocument, setPdfDocument] = useState<any | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pages = useMemo(() => {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }, [pageCount]);

    const setPageRef = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
      if (element) {
        pageRefs.current.set(pageNumber, element);
      } else {
        pageRefs.current.delete(pageNumber);
      }
    }, []);

    const updateCurrentPageFromScroll = useCallback(() => {
      const scroller = scrollerRef.current;
      if (!scroller || pageRefs.current.size === 0) {
        return;
      }

      const scrollerRect = scroller.getBoundingClientRect();
      const anchor = scrollerRect.top + Math.min(scrollerRect.height * 0.35, 240);
      let nearestPage = 1;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const [pageNumber, element] of pageRefs.current.entries()) {
        const rect = element.getBoundingClientRect();
        const distance =
          rect.top <= anchor && rect.bottom >= anchor
            ? 0
            : Math.min(Math.abs(rect.top - anchor), Math.abs(rect.bottom - anchor));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPage = pageNumber;
        }
      }

      onCurrentPageChange(nearestPage);
    }, [onCurrentPageChange]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToPage(pageNumber: number) {
          const targetPage = clampPage(pageNumber, pageCount);
          const element = pageRefs.current.get(targetPage);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            onCurrentPageChange(targetPage);
          }
        },
        getDocument() {
          return pdfDocumentRef.current;
        }
      }),
      [onCurrentPageChange, pageCount]
    );

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      setPdfDocument(null);
      setPageCount(0);
      pageRefs.current.clear();

      async function loadPdf() {
        try {
          const loadingTask = pdfjsLib.getDocument(pdfUrl);
          const nextPdfDocument = await loadingTask.promise;
          if (cancelled) {
            return;
          }
          pdfDocumentRef.current = nextPdfDocument;
          setPdfDocument(nextPdfDocument);
          setPageCount(nextPdfDocument.numPages);
          onDocumentLoad(nextPdfDocument, nextPdfDocument.numPages);
          onCurrentPageChange(1);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "PDF load failed");
          }
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
    }, [pdfUrl, onCurrentPageChange, onDocumentLoad]);

    useEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller || pageRefs.current.size === 0) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const pageNumber = Number(visible[0]?.target.getAttribute("data-page-number"));
          if (Number.isFinite(pageNumber) && pageNumber > 0) {
            onCurrentPageChange(pageNumber);
          }
        },
        {
          root: scroller,
          threshold: [0.25, 0.5, 0.75]
        }
      );

      for (const element of pageRefs.current.values()) {
        observer.observe(element);
      }

      updateCurrentPageFromScroll();
      return () => observer.disconnect();
    }, [pageCount, scale, onCurrentPageChange, updateCurrentPageFromScroll]);

    function handleScroll() {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      scrollRafRef.current = window.requestAnimationFrame(updateCurrentPageFromScroll);
    }

    return (
      <main
        ref={scrollerRef}
        className="min-h-0 min-w-0 overflow-auto rounded-lg border bg-muted/60 p-4"
        onScroll={handleScroll}
      >
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-card p-3 text-sm">{error}</div>
        ) : null}
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading PDF...
          </div>
        ) : null}
        {pdfDocument ? (
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6 pb-6">
            {pages.map((pageNumber) => (
              <PdfPageView
                key={pageNumber}
                pdfDocument={pdfDocument}
                pageNumber={pageNumber}
                scale={scale}
                annotations={annotations.filter((annotation) => annotation.page_number === pageNumber)}
                selectedAnnotationId={selectedAnnotationId}
                onPageRef={setPageRef}
                onTextSelection={onTextSelection}
                onAnnotationClick={onAnnotationClick}
              />
            ))}
          </div>
        ) : null}
      </main>
    );
  }
);

PdfScrollViewer.displayName = "PdfScrollViewer";
