import { Calendar, FileText, Hash } from "lucide-react";

import type { Paper } from "../../types/paper";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

interface PaperListProps {
  papers: Paper[];
  loading?: boolean;
}

export function PaperList({ papers, loading = false }: PaperListProps) {
  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">正在读取文献...</div>;
  }

  if (papers.length === 0) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">暂无文献</div>;
  }

  return (
    <div className="grid gap-3">
      {papers.map((paper) => (
        <Card key={paper.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">{paper.title}</h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {paper.authors || paper.file_name}
                </p>
              </div>
              <Badge className="self-start">{paper.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
