import { request } from "./client";
import type { AiNoteCreate, AiResponse, BuildIndexResponse, SummaryResponse } from "../types/ai";

export function buildPaperAiIndex(paperId: number) {
  return request<BuildIndexResponse>(`/papers/${paperId}/ai/build-index`, {
    method: "POST"
  });
}

export function summarizePaper(paperId: number, forceRefresh = false) {
  return request<SummaryResponse>(`/papers/${paperId}/ai/summarize`, {
    method: "POST",
    body: JSON.stringify({ force_refresh: forceRefresh })
  });
}

export function askPaper(paperId: number, question: string) {
  return request<AiResponse>(`/papers/${paperId}/ai/ask`, {
    method: "POST",
    body: JSON.stringify({ question })
  });
}

export function extractPaperMethod(paperId: number) {
  return request<AiResponse>(`/papers/${paperId}/ai/extract-method`, {
    method: "POST"
  });
}

export function extractPaperResults(paperId: number) {
  return request<AiResponse>(`/papers/${paperId}/ai/extract-results`, {
    method: "POST"
  });
}

export function extractPaperLimitations(paperId: number) {
  return request<AiResponse>(`/papers/${paperId}/ai/extract-limitations`, {
    method: "POST"
  });
}

export function saveAiNote(paperId: number, payload: AiNoteCreate) {
  return request(`/papers/${paperId}/ai/notes`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
