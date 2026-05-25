export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Collection {
  id: number;
  name: string;
  description?: string | null;
  parent_id?: number | null;
}

export interface Paper {
  id: number;
  title: string;
  authors?: string | null;
  year?: number | null;
  journal?: string | null;
  doi?: string | null;
  abstract?: string | null;
  keywords?: string | null;
  file_name: string;
  file_path: string;
  file_hash: string;
  file_size: number;
  page_count?: number | null;
  reading_status: string;
  rating?: number | null;
  custom_fields_json?: string | null;
  tags: Tag[];
  collections: Collection[];
  created_at: string;
  updated_at: string;
}

export interface PaperUpdate {
  title?: string;
  authors?: string | null;
  year?: number | null;
  journal?: string | null;
  doi?: string | null;
  abstract?: string | null;
  keywords?: string | null;
  reading_status?: string;
  rating?: number | null;
  custom_fields_json?: string | null;
}

export interface PaperChunk {
  id: number;
  paper_id: number;
  page_number?: number | null;
  chunk_index: number;
  text: string;
  token_count: number;
  created_at: string;
}

export interface ParseResult {
  paper_id: number;
  chunk_count: number;
  page_count?: number | null;
  chunks: PaperChunk[];
}
