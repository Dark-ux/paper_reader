import { BookOpen, Check, FileUp, Search, Trash2, Upload, X } from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { listCollections } from "../api/collections";
import { ApiError } from "../api/client";
import {
  addPaperTag,
  deletePaper,
  listPapers,
  removePaperTag,
  updatePaper,
  uploadPaper
} from "../api/papers";
import { createTag, listTags } from "../api/tags";
import { PaperList } from "../components/paper/PaperList";
import { Button, buttonVariants } from "../components/ui/button";
import type { Collection, Paper, Tag } from "../types/paper";
import { cn } from "../utils/cn";

type PaperDraft = {
  title: string;
  authors: string;
  year: string;
  journal: string;
  doi: string;
  abstract: string;
  reading_status: string;
};

const emptyDraft: PaperDraft = {
  title: "",
  authors: "",
  year: "",
  journal: "",
  doi: "",
  abstract: "",
  reading_status: "unread"
};

const readingStatuses = [
  { value: "all", label: "全部" },
  { value: "unread", label: "未读" },
  { value: "reading", label: "阅读中" },
  { value: "finished", label: "已读" }
];

const tagColors = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function toDraft(paper: Paper | null): PaperDraft {
  if (!paper) {
    return emptyDraft;
  }
  return {
    title: paper.title,
    authors: paper.authors ?? "",
    year: paper.year ? String(paper.year) : "",
    journal: paper.journal ?? "",
    doi: paper.doi ?? "",
    abstract: paper.abstract ?? "",
    reading_status: paper.reading_status
  };
}

function formatError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "该 PDF 已存在，未重复导入。";
  }
  return error instanceof Error ? error.message : "操作失败";
}

export function LibraryPage() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<number | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<number | null>(null);
  const [draft, setDraft] = useState<PaperDraft>(emptyDraft);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPaper = useMemo(
    () => papers.find((paper) => paper.id === selectedPaperId) ?? null,
    [papers, selectedPaperId]
  );

  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      const statusMatches = statusFilter === "all" || paper.reading_status === statusFilter;
      const tagMatches = tagFilter === null || paper.tags.some((tag) => tag.id === tagFilter);
      const collectionMatches =
        collectionFilter === null ||
        paper.collections.some((collection) => collection.id === collectionFilter);
      return statusMatches && tagMatches && collectionMatches;
    });
  }, [collectionFilter, papers, statusFilter, tagFilter]);

  const tagCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const paper of papers) {
      for (const tag of paper.tags) {
        counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [papers]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const paper of papers) {
      counts.set(paper.reading_status, (counts.get(paper.reading_status) ?? 0) + 1);
    }
    return counts;
  }, [papers]);

  function upsertPaper(nextPaper: Paper) {
    setPapers((current) => {
      const exists = current.some((paper) => paper.id === nextPaper.id);
      if (!exists) {
        return [nextPaper, ...current];
      }
      return current.map((paper) => (paper.id === nextPaper.id ? nextPaper : paper));
    });
  }

  async function refresh(nextQuery = query) {
    setLoading(true);
    setError(null);
    try {
      const [nextPapers, nextTags, nextCollections] = await Promise.all([
        listPapers(nextQuery.trim() || undefined),
        listTags(),
        listCollections()
      ]);
      setPapers(nextPapers);
      setTags(nextTags);
      setCollections(nextCollections);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const file = Array.from(files).find((item) => item.type === "application/pdf" || item.name.endsWith(".pdf"));
    if (!file) {
      setError("请选择 PDF 文件。");
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const paper = await uploadPaper(file);
      upsertPaper(paper);
      setSelectedPaperId(paper.id);
      setMessage("PDF 已导入。");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;
    event.currentTarget.value = "";
    if (files) {
      await uploadFiles(files);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await refresh(query);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPaper) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updatedPaper = await updatePaper(selectedPaper.id, {
        title: draft.title.trim() || selectedPaper.title,
        authors: draft.authors.trim() || null,
        year: draft.year.trim() ? Number(draft.year) : null,
        journal: draft.journal.trim() || null,
        doi: draft.doi.trim() || null,
        abstract: draft.abstract.trim() || null,
        reading_status: draft.reading_status
      });
      upsertPaper(updatedPaper);
      setSelectedPaperId(updatedPaper.id);
      setMessage("论文信息已保存。");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedPaper) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await deletePaper(selectedPaper.id);
      setPapers((current) => current.filter((paper) => paper.id !== selectedPaper.id));
      setSelectedPaperId(null);
      setMessage("论文已删除。");
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleAddTag() {
    if (!selectedPaper || !tagInput.trim()) {
      return;
    }

    const normalizedName = tagInput.trim();
    setError(null);
    setMessage(null);
    try {
      const existingTag = tags.find((tag) => tag.name.toLowerCase() === normalizedName.toLowerCase());
      const tag =
        existingTag ??
        (await createTag({
          name: normalizedName,
          color: tagColors[tags.length % tagColors.length]
        }));
      const updatedPaper = await addPaperTag(selectedPaper.id, tag.id);
      setTags((current) => (current.some((item) => item.id === tag.id) ? current : [...current, tag]));
      upsertPaper(updatedPaper);
      setSelectedPaperId(updatedPaper.id);
      setTagInput("");
      setMessage("标签已添加。");
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function handleRemoveTag(tagId: number) {
    if (!selectedPaper) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const updatedPaper = await removePaperTag(selectedPaper.id, tagId);
      upsertPaper(updatedPaper);
      setSelectedPaperId(updatedPaper.id);
      setMessage("标签已移除。");
    } catch (err) {
      setError(formatError(err));
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget === event.target) {
      setDragActive(false);
    }
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    await uploadFiles(event.dataTransfer.files);
  }

  useEffect(() => {
    void refresh("");
  }, []);

  useEffect(() => {
    if (selectedPaper) {
      setDraft(toDraft(selectedPaper));
      return;
    }
    setDraft(emptyDraft);
  }, [selectedPaper]);

  useEffect(() => {
    if (selectedPaperId && papers.some((paper) => paper.id === selectedPaperId)) {
      return;
    }
    setSelectedPaperId(papers[0]?.id ?? null);
  }, [papers, selectedPaperId]);

  return (
    <div
      className={cn("flex min-h-[calc(100vh-2rem)] flex-col gap-4", dragActive && "rounded-lg ring-2 ring-primary")}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">文献库</h1>
          <p className="mt-1 text-sm text-muted-foreground">{papers.length} 篇论文</p>
        </div>
        <form className="flex min-w-0 flex-col gap-2 sm:flex-row xl:w-[620px]" onSubmit={handleSearch}>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="标题、作者、期刊、DOI、摘要"
            />
          </div>
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" aria-hidden="true" />
            搜索
          </Button>
          <label className={cn(buttonVariants(), "cursor-pointer", uploading && "pointer-events-none opacity-50")}>
            <input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={handleUpload} />
            <Upload className="h-4 w-4" aria-hidden="true" />
            {uploading ? "导入中" : "导入 PDF"}
          </label>
        </form>
      </header>

      {dragActive ? (
        <div className="rounded-lg border border-primary bg-accent p-3 text-sm text-accent-foreground">
          <FileUp className="mr-2 inline h-4 w-4" aria-hidden="true" />
          松开以上传 PDF
        </div>
      ) : null}
      {error ? <div className="rounded-lg border border-destructive/40 bg-card p-3 text-sm">{error}</div> : null}
      {message ? <div className="rounded-lg border bg-card p-3 text-sm text-accent-foreground">{message}</div> : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)_360px]">
        <aside className="rounded-lg border bg-card p-3">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">项目</div>
            <div className="grid gap-1">
              <button
                className={cn(
                  "flex h-8 items-center justify-between rounded-md px-2 text-sm hover:bg-muted",
                  collectionFilter === null && "bg-muted"
                )}
                type="button"
                onClick={() => setCollectionFilter(null)}
              >
                <span>全部项目</span>
                <span className="text-xs text-muted-foreground">{papers.length}</span>
              </button>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  className={cn(
                    "flex h-8 items-center justify-between rounded-md px-2 text-sm hover:bg-muted",
                    collectionFilter === collection.id && "bg-muted"
                  )}
                  type="button"
                  onClick={() => setCollectionFilter(collection.id)}
                >
                  <span className="truncate">{collection.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">标签</div>
            <div className="grid gap-1">
              <button
                className={cn(
                  "flex h-8 items-center justify-between rounded-md px-2 text-sm hover:bg-muted",
                  tagFilter === null && "bg-muted"
                )}
                type="button"
                onClick={() => setTagFilter(null)}
              >
                <span>全部标签</span>
                <span className="text-xs text-muted-foreground">{papers.length}</span>
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={cn(
                    "flex h-8 items-center justify-between rounded-md px-2 text-sm hover:bg-muted",
                    tagFilter === tag.id && "bg-muted"
                  )}
                  type="button"
                  onClick={() => setTagFilter(tag.id)}
                >
                  <span className="truncate">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">{tagCounts.get(tag.id) ?? 0}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">阅读状态</div>
            <div className="grid gap-1">
              {readingStatuses.map((item) => (
                <button
                  key={item.value}
                  className={cn(
                    "flex h-8 items-center justify-between rounded-md px-2 text-sm hover:bg-muted",
                    statusFilter === item.value && "bg-muted"
                  )}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.value === "all" ? papers.length : statusCounts.get(item.value) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0">
          <PaperList
            loading={loading}
            papers={filteredPapers}
            selectedPaperId={selectedPaperId}
            onOpenPaper={(paper) => navigate(`/reader/${paper.id}`)}
            onSelectPaper={(paper) => setSelectedPaperId(paper.id)}
          />
        </main>

        <aside className="rounded-lg border bg-card">
          {selectedPaper ? (
            <form className="flex h-full flex-col" onSubmit={handleSave}>
              <div className="flex h-12 items-center justify-between border-b px-4">
                <h2 className="truncate text-sm font-semibold">论文详情</h2>
                <div className="flex items-center gap-1">
                  <Button asChild size="icon" variant="ghost" title="打开阅读器">
                    <Link to={`/reader/${selectedPaper.id}`}>
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button type="button" size="icon" variant="ghost" title="删除论文" onClick={handleDeleteSelected}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="grid flex-1 gap-3 overflow-auto p-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">标题</span>
                  <input
                    className="h-9 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">作者</span>
                  <input
                    className="h-9 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    value={draft.authors}
                    onChange={(event) => setDraft((current) => ({ ...current, authors: event.target.value }))}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">年份</span>
                    <input
                      className="h-9 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                      inputMode="numeric"
                      value={draft.year}
                      onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">阅读状态</span>
                    <select
                      className="h-9 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                      value={draft.reading_status}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, reading_status: event.target.value }))
                      }
                    >
                      {readingStatuses
                        .filter((item) => item.value !== "all")
                        .map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">期刊</span>
                  <input
                    className="h-9 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    value={draft.journal}
                    onChange={(event) => setDraft((current) => ({ ...current, journal: event.target.value }))}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">DOI</span>
                  <input
                    className="h-9 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    value={draft.doi}
                    onChange={(event) => setDraft((current) => ({ ...current, doi: event.target.value }))}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">摘要</span>
                  <textarea
                    className="min-h-28 resize-y rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                    value={draft.abstract}
                    onChange={(event) => setDraft((current) => ({ ...current, abstract: event.target.value }))}
                  />
                </label>

                <div className="grid gap-2 text-sm">
                  <span className="font-medium">标签</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPaper.tags.length > 0 ? (
                      selectedPaper.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-xs"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                          <button type="button" title="移除标签" onClick={() => void handleRemoveTag(tag.id)}>
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">暂无标签</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleAddTag();
                        }
                      }}
                      placeholder="标签名"
                    />
                    <Button type="button" size="icon" title="添加标签" onClick={handleAddTag}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <dl className="grid gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <dt>文件名</dt>
                    <dd className="truncate text-right">{selectedPaper.file_name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>页数</dt>
                    <dd>{selectedPaper.page_count ?? "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>大小</dt>
                    <dd>{Math.max(1, Math.round(selectedPaper.file_size / 1024))} KB</dd>
                  </div>
                </dl>
              </div>
              <div className="flex items-center justify-between border-t p-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft(toDraft(selectedPaper));
                    setTagInput("");
                  }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  还原
                </Button>
                <Button type="submit" disabled={saving}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {saving ? "保存中" : "保存"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">暂无选中论文</div>
          )}
        </aside>
      </div>
    </div>
  );
}
