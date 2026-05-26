export interface Citation {
  page_number: number;
  chunk_id?: number | null;
  chunk_index: number;
  text: string;
}

export interface AiResponse {
  answer: string;
  citations: Citation[];
}

export interface SummaryResponse {
  id: number;
  paper_id: number;
  summary_type: string;
  content: string;
  model_name?: string | null;
  prompt_version?: string | null;
  created_at: string;
  citations: Citation[];
}

export interface BuildIndexResponse {
  paper_id: number;
  indexed_chunks: number;
  collection_name: string;
}

export interface AiNoteCreate {
  content: string;
  page_number?: number | null;
  citation_pages: number[];
}

export interface TranslateRequest {
  text: string;
  source_lang: "auto" | "zh" | "en";
  target_lang?: "zh" | "en";
}

export interface TranslateResponse {
  source_lang: "zh" | "en";
  target_lang: "zh" | "en";
  translated_text: string;
}
