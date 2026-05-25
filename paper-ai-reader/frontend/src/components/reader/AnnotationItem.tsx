import { Edit3, Trash2 } from "lucide-react";

import type { Annotation } from "../../types/annotation";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";

type AnnotationItemProps = {
  annotation: Annotation;
  selected: boolean;
  onSelect: (annotation: Annotation) => void;
  onEdit: (annotation: Annotation) => void;
  onDelete: (annotation: Annotation) => void;
};

export function AnnotationItem({
  annotation,
  selected,
  onSelect,
  onEdit,
  onDelete
}: AnnotationItemProps) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background p-3 text-left text-sm hover:bg-muted",
        selected && "border-primary"
      )}
    >
      <button className="w-full text-left" type="button" onClick={() => onSelect(annotation)}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">第 {annotation.page_number} 页</span>
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: annotation.color }}
            aria-hidden="true"
          />
        </div>
        <p className="line-clamp-3 text-xs text-muted-foreground">
          {annotation.selected_text || "区域标注"}
        </p>
        {annotation.note ? <p className="mt-2 text-sm">{annotation.note}</p> : null}
      </button>

      <div className="mt-3 flex justify-end gap-2 border-t pt-3">
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(annotation)}>
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          编辑
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDelete(annotation)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          删除
        </Button>
      </div>
    </div>
  );
}
