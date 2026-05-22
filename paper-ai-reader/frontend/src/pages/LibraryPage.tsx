import { Search, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { listPapers, uploadPaper } from "../api/papers";
import { PaperList } from "../components/paper/PaperList";
import { Button, buttonVariants } from "../components/ui/button";
import type { Paper } from "../types/paper";
import { cn } from "../utils/cn";

export function LibraryPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visiblePapers = useMemo(() => papers, [papers]);

  async function refresh(nextQuery = query) {
    setLoading(true);
    setError(null);
    try {
      setPapers(await listPapers(nextQuery.trim() || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const paper = await uploadPaper(file);
      setPapers((current) => [paper, ...current.filter((item) => item.id !== paper.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    void refresh("");
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">文献管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">{papers.length} 篇文献</p>
        </div>
        <label className={cn(buttonVariants(), "cursor-pointer", uploading && "pointer-events-none opacity-50")}>
          <input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={handleUpload} />
          <Upload className="h-4 w-4" aria-hidden="true" />
          {uploading ? "导入中" : "导入 PDF"}
        </label>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="标题、作者、DOI"
          />
        </div>
        <Button variant="outline" onClick={() => void refresh(query)}>
          搜索
        </Button>
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-card p-3 text-sm">{error}</div> : null}
      <PaperList papers={visiblePapers} loading={loading} />
    </div>
  );
}
