import { Copy, Loader2, Save, X } from "lucide-react";

import type { TranslateResponse } from "../../types/ai";
import { Button } from "../ui/button";

type SelectionTranslatePopoverProps = {
  originalText: string;
  result: TranslateResponse | null;
  loading: boolean;
  error: string | null;
  position: { x: number; y: number } | null;
  onCopy: () => void;
  onSave: () => void;
  onClose: () => void;
};

function langLabel(lang: string) {
  return lang === "zh" ? "中文" : "英文";
}

export function SelectionTranslatePopover({
  originalText,
  result,
  loading,
  error,
  position,
  onCopy,
  onSave,
  onClose
}: SelectionTranslatePopoverProps) {
  if (!position) {
    return null;
  }

  return (
    <div
      className="fixed z-50 w-80 rounded-lg border bg-card shadow-lg"
      style={{ left: position.x, top: position.y, transform: "translateX(-50%)" }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex h-10 items-center justify-between border-b px-3">
        <div className="text-sm font-semibold">选中文本翻译</div>
        <Button type="button" size="icon" variant="ghost" title="关闭" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid max-h-96 gap-3 overflow-auto p-3 text-sm">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">原文</div>
          <div className="max-h-28 overflow-auto rounded-md border bg-background p-2 text-muted-foreground">
            {originalText}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            {result ? `${langLabel(result.source_lang)} -> ${langLabel(result.target_lang)}` : "自动识别语言"}
          </div>
          <div className="min-h-20 rounded-md border bg-background p-2">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                正在翻译...
              </div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : (
              <div className="whitespace-pre-wrap text-muted-foreground">{result?.translated_text}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t p-3">
        <Button type="button" size="sm" variant="outline" disabled={!result} onClick={onCopy}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          复制译文
        </Button>
        <Button type="button" size="sm" disabled={!result} onClick={onSave}>
          <Save className="h-4 w-4" aria-hidden="true" />
          保存为笔记
        </Button>
      </div>
    </div>
  );
}
