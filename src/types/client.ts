export interface Client {
  id: string;
  company_id: string;
  full_name: string;
  document_id: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
