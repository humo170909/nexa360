export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
