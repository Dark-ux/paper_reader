import type { Annotation } from "../../types/annotation";
import { AnnotationItem } from "./AnnotationItem";

type AnnotationSidebarProps = {
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  onSelect: (annotation: Annotation) => void;
  onEdit: (annotation: Annotation) => void;
  onDelete: (annotation: Annotation) => void;
};

export function AnnotationSidebar({
  annotations,
  selectedAnnotationId,
  onSelect,
  onEdit,
  onDelete
}: AnnotationSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h2 className="text-sm font-semibold">笔记</h2>
        <span className="text-xs text-muted-foreground">{annotations.length}</span>
      </div>
      <div className="grid min-h-0 gap-2 overflow-auto p-3">
        {annotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无标注</p>
        ) : (
          annotations.map((annotation) => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              selected={selectedAnnotationId === annotation.id}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </aside>
  );
}
