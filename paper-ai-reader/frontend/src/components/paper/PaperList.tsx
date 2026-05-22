import { Calendar, FileText, Hash } from "lucide-react";

import type { Paper } from "../../types/paper";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/badge";

interface PaperListProps {
  papers: Paper[];
  selectedPaperId?: number | null;
  loading?: boolean;
  onOpenPaper?: (paper: Paper) => void;
  onSelectPaper?: (paper: Paper) => void;
}

const readingStatusLabel: Record<string, string> = {
  unread: "未读",
  reading: "阅读中",
  finished: "已读"
};

export function PaperList({
  papers,
  selectedPaperId,
  loading = false,
  onOpenPaper,
  onSelectPaper
}: PaperListProps) {
  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">正在读取文献...</div>;
  }

  if (papers.length === 0) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">暂无文献</div>;
  }

  return (
    <div className="grid gap-2">
      {papers.map((paper) => (
        <button
          key={paper.id}
          className={cn(
            "w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selectedPaperId === paper.id && "border-primary bg-accent/60"
          )}
          type="button"
          onClick={() => onSelectPaper?.(paper)}
          onDoubleClick={() => onOpenPaper?.(paper)}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{paper.title}</h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{paper.authors || paper.file_name}</p>
            </div>
            <Badge className="self-start">{readingStatusLabel[paper.reading_status] ?? paper.reading_status}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {paper.page_count ?? "-"} 页
            </span>
            {paper.year ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {paper.year}
              </span>
            ) : null}
            {paper.doi ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{paper.doi}</span>
              </span>
            ) : null}
          </div>
          {paper.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {paper.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex h-6 items-center rounded-sm border px-2 text-xs"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
