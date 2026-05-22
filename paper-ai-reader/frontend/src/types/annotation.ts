export interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationPosition {
  page: number;
  rects: AnnotationRect[];
  scale: number;
}

export interface Annotation {
  id: number;
  paper_id: number;
  page_number: number;
  selected_text?: string | null;
  note?: string | null;
  color: string;
  position_json?: string | null;
  annotation_type: string;
  created_at: string;
  updated_at: string;
}

export interface AnnotationCreate {
  page_number: number;
  selected_text?: string | null;
  note?: string | null;
  color?: string;
  position_json?: string | null;
  annotation_type?: string;
}

export interface AnnotationUpdate {
  page_number?: number;
  selected_text?: string | null;
  note?: string | null;
  color?: string;
  position_json?: string | null;
  annotation_type?: string;
}
