import { CSSProperties, MouseEvent, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import type { Annotation, AnnotationPosition, AnnotationRect } from "../../types/annotation";

type PdfPageViewProps = {
  pdfDocument: any;
  pageNumber: number;
  scale: number;
  annotations: Annotation[];
  selectedAnnotationId?: number | null;
  onPageRef: (pageNumber: number, element: HTMLDivElement | null) => void;
  onTextSelection: (pageNumber: number, text: string, rects: AnnotationRect[]) => void;
  onAnnotationClick: (annotation: Annotation) => void;
};

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

export function PdfPageView({
  pdfDocument,
  pageNumber,
  scale,
  annotations,
  selectedAnnotationId,
  onPageRef,
  onTextSelection,
  onAnnotationClick
}: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageLayerRef = useRef<HTMLDivElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState({ width: 1, height: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onPageRef(pageNumber, pageLayerRef.current);
    return () => onPageRef(pageNumber, null);
  }, [onPageRef, pageNumber]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current) {
      return;
    }

    let cancelled = false;

    async function renderPage() {
      setLoading(true);
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

      if (!cancelled) {
        setLoading(false);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [pageNumber, pdfDocument, scale]);

  function handleMouseUp(event: MouseEvent<HTMLDivElement>) {
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

    if (rects.length > 0) {
      onTextSelection(pageNumber, text, rects);
      event.stopPropagation();
    }
  }

  return (
    <div
      ref={pageLayerRef}
      className="relative bg-white shadow-sm"
      data-page-number={pageNumber}
      style={{ width: pageSize.width, height: pageSize.height }}
      onMouseUp={handleMouseUp}
    >
      {loading ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white text-sm text-muted-foreground">
          Loading page {pageNumber}...
        </div>
      ) : null}
      <canvas ref={canvasRef} className="absolute left-0 top-0 z-0" />
      <div className="absolute left-0 top-0 z-30">
        {annotations.map((annotation) => {
          const position = parsePosition(annotation.position_json);
          if (!position) {
            return null;
          }
          return position.rects.map((rect, index) => (
            <button
              key={`${annotation.id}-${index}`}
              className="absolute rounded-[2px] mix-blend-multiply outline-none ring-offset-2 focus:ring-2 focus:ring-ring"
              style={{
                left: rect.x * scale,
                top: rect.y * scale,
                width: rect.width * scale,
                height: rect.height * scale,
                backgroundColor: annotation.color,
                opacity: selectedAnnotationId === annotation.id ? 0.68 : 0.52
              }}
              type="button"
              title={annotation.note || annotation.selected_text || "Annotation"}
              onClick={(event) => {
                event.stopPropagation();
                onAnnotationClick(annotation);
              }}
            />
          ));
        })}
      </div>
      <div
        ref={textLayerRef}
        className="textLayer absolute left-0 top-0 z-20"
        style={
          {
            width: pageSize.width,
            height: pageSize.height,
            zIndex: 20,
            "--scale-factor": scale
          } as CSSProperties
        }
      />
    </div>
  );
}
