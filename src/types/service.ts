export interface Service {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price: number | null;
  is_active: boolean;
  created_at: string;
}
