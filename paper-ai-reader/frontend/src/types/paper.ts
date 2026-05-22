export interface Paper {
  id: number;
  title: string;
  authors?: string | null;
  abstract?: string | null;
  year?: number | null;
  doi?: string | null;
  file_name: string;
  file_path: string;
  file_hash: string;
  page_count?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}
