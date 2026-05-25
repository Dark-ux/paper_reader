import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";

import type { Annotation } from "../../types/annotation";
import { Button } from "../ui/button";

type AnnotationEditDialogProps = {
  annotation: Annotation | null;
  onClose: () => void;
  onSave: (annotation: Annotation, payload: { note: string; color: string }) => Promise<void>;
  onDelete: (annotation: Annotation) => Promise<void>;
};

const colorOptions = [
  { label: "黄色", value: "#facc15" },
  { label: "绿色", value: "#86efac" },
  { label: "蓝色", value: "#93c5fd" },
  { label: "粉色", value: "#f9a8d4" },
  { label: "紫色", value: "#c4b5fd" }
];

export function AnnotationEditDialog({
  annotation,
  onClose,
  onSave,
  onDelete
}: AnnotationEditDialogProps) {
  const [note, setNote] = useState("");
  const [color, setColor] = useState(colorOptions[0].value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote(annotation?.note ?? "");
    setColor(annotation?.color ?? colorOptions[0].value);
  }, [annotation]);

  if (!annotation) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!annotation) {
      return;
    }
    setSaving(true);
    try {
      await onSave(annotation, { note, color });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!annotation) {
      return;
    }
    setSaving(true);
    try {
      await onDelete(annotation);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form className="w-full max-w-lg rounded-lg border bg-card shadow-lg" onSubmit={handleSubmit}>
        <div className="flex h-12 items-center justify-between border-b px-4">
          <div className="text-sm font-semibold">编辑高亮笔记</div>
          <Button type="button" size="icon" variant="ghost" title="关闭" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid gap-4 p-4 text-sm">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">原文片段（只读）</div>
            <div className="max-h-32 overflow-auto rounded-md border bg-background p-3 text-muted-foreground">
              {annotation.selected_text || "区域标注"}
            </div>
          </div>

          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">笔记</span>
            <textarea
              className="min-h-32 resize-y rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="写下你的笔记"
            />
          </label>

          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">高亮颜色</span>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  className="h-8 w-8 rounded-md border outline-none ring-offset-2 focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: option.value,
                    borderColor: color === option.value ? "hsl(var(--foreground))" : "hsl(var(--border))"
                  }}
                  type="button"
                  title={option.label}
                  onClick={() => setColor(option.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 border-t p-4">
          <Button type="button" variant="outline" disabled={saving} onClick={() => void handleDelete()}>
            删除
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              保存
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
