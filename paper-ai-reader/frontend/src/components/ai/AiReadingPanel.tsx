import {
  Brain,
  Database,
  FileText,
  FlaskConical,
  Loader2,
  Save,
  Search,
  Send,
  TriangleAlert
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import {
  askPaper,
  buildPaperAiIndex,
  extractPaperLimitations,
  extractPaperMethod,
  extractPaperResults,
  saveAiNote,
  summarizePaper
} from "../../api/ai";
import type { Citation } from "../../types/ai";
import { useElapsedTimer } from "../../utils/useElapsedTimer";
import { Button } from "../ui/button";

type AITaskType =
  | "build_index"
  | "summarize"
  | "ask"
  | "extract_method"
  | "extract_results"
  | "extract_limitations"
  | "translate"
  | "save_note"
  | null;

type AiResult = {
  title: string;
  content: string;
  citations: Citation[];
};

type AiReadingPanelProps = {
  paperId: number;
  onGoToPage: (pageNumber: number) => void;
  onNoteSaved?: () => void;
};

const taskLoadingText: Record<Exclude<AITaskType, null>, string> = {
  build_index: "AI 正在建立向量索引...",
  summarize: "AI 正在总结论文...",
  ask: "AI 正在阅读相关片段并生成回答...",
  extract_method: "AI 正在分析核心方法...",
  extract_results: "AI 正在提取关键结果...",
  extract_limitations: "AI 正在分析主要局限性...",
  translate: "AI 正在翻译内容...",
  save_note: "正在保存论文笔记..."
};

const taskDoneText: Record<Exclude<AITaskType, null>, string> = {
  build_index: "索引完成",
  summarize: "生成完成",
  ask: "生成完成",
  extract_method: "生成完成",
  extract_results: "生成完成",
  extract_limitations: "生成完成",
  translate: "生成完成",
  save_note: "保存完成"
};

function getFriendlyAiError(err: unknown) {
  if (err instanceof Error && err.message.trim()) {
    return `AI 生成失败：${err.message}`;
  }
  return "AI 生成失败，请检查模型服务是否启动。";
}

export function AiReadingPanel({ paperId, onGoToPage, onNoteSaved }: AiReadingPanelProps) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [activeTask, setActiveTask] = useState<AITaskType>(null);
  const [lastTaskStatus, setLastTaskStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsedSeconds = useElapsedTimer(Boolean(activeTask));

  const citationPages = useMemo(() => {
    return Array.from(new Set((result?.citations ?? []).map((item) => item.page_number))).filter(Boolean);
  }, [result]);

  async function runAction(
    task: Exclude<AITaskType, null>,
    title: string,
    action: () => Promise<{ answer: string; citations: Citation[] }>
  ) {
    if (activeTask) {
      return;
    }
    setActiveTask(task);
    setLastTaskStatus(null);
    setError(null);
    const startedAt = Date.now();
    try {
      const response = await action();
      setResult({ title, content: response.answer, citations: response.citations });
      setLastTaskStatus(`${taskDoneText[task]}，用时 ${Math.max(1, Math.round((Date.now() - startedAt) / 1000))} 秒`);
    } catch (err) {
      setError(getFriendlyAiError(err));
    } finally {
      setActiveTask(null);
    }
  }

  async function handleBuildIndex() {
    if (activeTask) {
      return;
    }
    setActiveTask("build_index");
    setLastTaskStatus(null);
    setError(null);
    const startedAt = Date.now();
    try {
      const response = await buildPaperAiIndex(paperId);
      setResult({
        title: "向量索引",
        content: `已为当前论文建立向量索引，共 ${response.indexed_chunks} 个文本块。`,
        citations: []
      });
      setLastTaskStatus(`索引完成，用时 ${Math.max(1, Math.round((Date.now() - startedAt) / 1000))} 秒`);
    } catch (err) {
      setError(getFriendlyAiError(err));
    } finally {
      setActiveTask(null);
    }
  }

  async function handleSummarize() {
    if (activeTask) {
      return;
    }
    setActiveTask("summarize");
    setLastTaskStatus(null);
    setError(null);
    const startedAt = Date.now();
    try {
      const response = await summarizePaper(paperId, true);
      setResult({ title: "一键总结", content: response.content, citations: response.citations });
      setLastTaskStatus(`生成完成，用时 ${Math.max(1, Math.round((Date.now() - startedAt) / 1000))} 秒`);
    } catch (err) {
      setError(getFriendlyAiError(err));
    } finally {
      setActiveTask(null);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    await runAction("ask", "论文问答", () => askPaper(paperId, trimmed));
  }

  async function handleSaveNote() {
    if (!result || activeTask) {
      return;
    }
    setActiveTask("save_note");
    setLastTaskStatus(null);
    setError(null);
    const startedAt = Date.now();
    try {
      await saveAiNote(paperId, {
        content: `${result.title}\n\n${result.content}`,
        page_number: citationPages[0] ?? null,
        citation_pages: citationPages
      });
      onNoteSaved?.();
      setLastTaskStatus(`保存完成，用时 ${Math.max(1, Math.round((Date.now() - startedAt) / 1000))} 秒`);
    } catch (err) {
      setError(err instanceof Error ? `保存笔记失败：${err.message}` : "保存笔记失败。");
    } finally {
      setActiveTask(null);
    }
  }

  const isBusy = Boolean(activeTask);

  return (
    <aside className="flex min-h-0 w-full flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold">AI 精读</h2>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 border-b p-3">
        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void handleBuildIndex()}>
          <Database className="h-4 w-4" aria-hidden="true" />
          建索引
        </Button>
        <Button size="sm" disabled={isBusy} onClick={() => void handleSummarize()}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          一键总结
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => void runAction("extract_method", "方法提取", () => extractPaperMethod(paperId))}
        >
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          方法
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => void runAction("extract_results", "结果提取", () => extractPaperResults(paperId))}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          结果
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() =>
            void runAction("extract_limitations", "局限性提取", () => extractPaperLimitations(paperId))
          }
        >
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          局限
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        {error ? <div className="rounded-md border border-destructive/40 p-3 text-sm">{error}</div> : null}
        {activeTask ? (
          <div className="flex items-center gap-3 rounded-md border p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <div>
              <div className="font-medium text-foreground">{taskLoadingText[activeTask]}</div>
              <div className="mt-1 text-xs">已思考 {elapsedSeconds} 秒</div>
            </div>
          </div>
        ) : null}
        {lastTaskStatus ? (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">{lastTaskStatus}</div>
        ) : null}
        {result ? (
          <div className="grid gap-3 text-sm">
            <div>
              <div className="font-medium">{result.title}</div>
              <div className="mt-2 whitespace-pre-wrap leading-6 text-muted-foreground">{result.content}</div>
            </div>

            {citationPages.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {citationPages.map((page) => (
                  <Button key={page} type="button" size="sm" variant="outline" onClick={() => onGoToPage(page)}>
                    第 {page} 页
                  </Button>
                ))}
              </div>
            ) : null}

            {result.citations.length > 0 ? (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">查看引用片段</summary>
                <div className="mt-3 grid gap-3">
                  {result.citations.map((citation) => (
                    <button
                      key={`${citation.page_number}-${citation.chunk_index}`}
                      className="rounded-md bg-background p-2 text-left text-xs text-muted-foreground hover:bg-muted"
                      type="button"
                      onClick={() => onGoToPage(citation.page_number)}
                    >
                      <div className="mb-1 font-medium text-foreground">第 {citation.page_number} 页</div>
                      <div className="line-clamp-4">{citation.text}</div>
                    </button>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            先解析 PDF 并建立索引，然后进行总结、问答或提取。
          </div>
        )}
      </div>

      <div className="shrink-0 border-t p-3">
        <form className="flex gap-2" onSubmit={(event) => void handleAsk(event)}>
          <input
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="向当前论文提问"
          />
          <Button size="icon" title="发送" disabled={isBusy || !question.trim()}>
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="保存为论文笔记"
            disabled={!result || isBusy}
            onClick={() => void handleSaveNote()}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
