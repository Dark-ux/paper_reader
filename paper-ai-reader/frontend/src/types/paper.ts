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
  created_at: string;
  updated_at: string;
}
