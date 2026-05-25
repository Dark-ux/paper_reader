import { request } from "./client";
import type { Annotation, AnnotationCreate, AnnotationUpdate } from "../types/annotation";

export function listPaperAnnotations(paperId: number) {
  return request<Annotation[]>(`/papers/${paperId}/annotations`);
}

export function createPaperAnnotation(paperId: number, payload: AnnotationCreate) {
  return request<Annotation>(`/papers/${paperId}/annotations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateAnnotation(annotationId: number, payload: AnnotationUpdate) {
  return request<Annotation>(`/annotations/${annotationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteAnnotation(annotationId: number) {
  return request<{ success: boolean }>(`/annotations/${annotationId}`, {
    method: "DELETE"
  });
}
