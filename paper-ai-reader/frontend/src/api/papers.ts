import { request } from "./client";
import type { Paper, PaperUpdate } from "../types/paper";

export function listPapers(query?: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  return request<Paper[]>(`/papers${params}`);
}

export function uploadPaper(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<Paper>("/papers/upload", {
    method: "POST",
    body: form
  });
}

export function getPaper(paperId: number) {
  return request<Paper>(`/papers/${paperId}`);
}

export function updatePaper(paperId: number, payload: PaperUpdate) {
  return request<Paper>(`/papers/${paperId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deletePaper(paperId: number) {
  return request<void>(`/papers/${paperId}`, {
    method: "DELETE"
  });
}

export function addPaperTag(paperId: number, tagId: number) {
  return request<Paper>(`/papers/${paperId}/tags/${tagId}`, {
    method: "POST"
  });
}

export function removePaperTag(paperId: number, tagId: number) {
  return request<Paper>(`/papers/${paperId}/tags/${tagId}`, {
    method: "DELETE"
  });
}

export function addPaperCollection(paperId: number, collectionId: number) {
  return request<Paper>(`/papers/${paperId}/collections/${collectionId}`, {
    method: "POST"
  });
}

export function removePaperCollection(paperId: number, collectionId: number) {
  return request<Paper>(`/papers/${paperId}/collections/${collectionId}`, {
    method: "DELETE"
  });
}
