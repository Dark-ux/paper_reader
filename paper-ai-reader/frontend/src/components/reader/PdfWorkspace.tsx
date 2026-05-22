import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Search } from "lucide-react";

import { Button } from "../ui/button";

export function PdfWorkspace() {
  return (
    <section className="flex min-h-[calc(100vh-2rem)] min-w-0 flex-1 flex-col rounded-lg border bg-card">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="上一页">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex h-8 items-center rounded-md border bg-background px-2 text-sm">
            <span>1</span>
            <span className="px-1 text-muted-foreground">/</span>
            <span className="text-muted-foreground">-</span>
          </div>
          <Button size="icon" variant="ghost" title="下一页">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="缩小">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="icon" variant="ghost" title="放大">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="icon" variant="ghost" title="适合窗口">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="icon" variant="ghost" title="搜索">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-muted/60 p-4">
        <div className="flex aspect-[3/4] w-full max-w-[560px] items-center justify-center rounded-md border bg-white text-sm text-muted-foreground shadow-sm">
          PDF.js
        </div>
      </div>
    </section>
  );
}
