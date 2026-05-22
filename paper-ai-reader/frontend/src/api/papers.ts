import { request } from "./client";
import type { Paper } from "../types/paper";

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
