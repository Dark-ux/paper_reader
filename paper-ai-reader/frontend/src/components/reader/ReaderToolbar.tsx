import { ChevronLeft, ChevronRight, FileText, Highlighter, Minus, Plus, Search } from "lucide-react";

import { Button } from "../ui/button";

type ReaderToolbarProps = {
  title: string;
  pageNumber: number;
  pageCount: number;
  scale: number;
  searchQuery: string;
  parsing: boolean;
  canHighlight: boolean;
  onBack: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageChange: (pageNumber: number) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onParsePdf: () => void;
  onCreateHighlight: () => void;
};

export function ReaderToolbar({
  title,
  pageNumber,
  pageCount,
  scale,
  searchQuery,
  parsing,
  canHighlight,
  onBack,
  onPreviousPage,
  onNextPage,
  onPageChange,
  onZoomOut,
  onZoomIn,
  onSearchQueryChange,
  onSearch,
  onParsePdf,
  onCreateHighlight
}: ReaderToolbarProps) {
  return (
    <header className="flex shrink-0 flex-col gap-3 rounded-lg border bg-card p-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <button
          className="mb-1 text-xs text-muted-foreground hover:text-foreground"
          type="button"
          onClick={onBack}
        >
          返回文献库
        </button>
        <h1 className="truncate text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="icon" variant="outline" title="上一页" onClick={onPreviousPage}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex h-9 items-center rounded-md border bg-background px-2 text-sm">
          <input
            className="w-12 bg-transparent text-center outline-none"
            value={pageNumber}
            onChange={(event) => onPageChange(Number(event.target.value) || 1)}
          />
          <span className="text-muted-foreground">/ {pageCount || "-"}</span>
        </div>
        <Button type="button" size="icon" variant="outline" title="下一页" onClick={onNextPage}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" size="icon" variant="outline" title="缩小" onClick={onZoomOut}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="h-9 rounded-md border bg-background px-2 py-2 text-sm">{Math.round(scale * 100)}%</div>
        <Button type="button" size="icon" variant="outline" title="放大" onClick={onZoomIn}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="relative min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            placeholder="搜索 PDF"
          />
        </div>
        <Button type="button" variant="outline" onClick={onSearch}>
          搜索
        </Button>
        <Button type="button" variant="outline" disabled={parsing} onClick={onParsePdf}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          {parsing ? "解析中" : "解析 PDF"}
        </Button>
        <Button type="button" disabled={!canHighlight} onClick={onCreateHighlight}>
          <Highlighter className="h-4 w-4" aria-hidden="true" />
          高亮所选
        </Button>
      </div>
    </header>
  );
}
