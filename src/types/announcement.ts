export interface Announcement {
  id: string;
  company_id: string;
  title: string;
  body: string | null;
  published_at: string;
  created_at: string;
}
