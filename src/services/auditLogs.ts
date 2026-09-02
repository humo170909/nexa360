import { supabase } from "../lib/supabaseClient";
import type { AuditLog } from "../types/auditLog";

export async function getRecentActivity(companyId: string, limit = 6): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AuditLog[];
}

export interface AuditLogWithUser extends AuditLog {
  user: { full_name: string | null } | null;
}

// Para Configuración → Auditoría (solo ADMIN, por RLS). Incluye el nombre
// de quién hizo la acción — getRecentActivity (Dashboard) no lo necesita,
// por eso es una consulta aparte en vez de agregarle el join a esa.
export async function listAuditLogDetailed(
  companyId: string,
  limit = 50,
): Promise<AuditLogWithUser[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, user:profiles(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as AuditLogWithUser[];
}

// Se usa desde cualquier parte de la app para registrar una acción.
// No lanza si falla (la auditoría nunca debe romper la funcionalidad
// principal) — solo lo reporta en consola.
export async function logAction(
  companyId: string | null,
  userId: string | null,
  action: string,
  metadata?: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("audit_logs")
    .insert({ company_id: companyId, user_id: userId, action, metadata });
  if (error) console.error("No se pudo registrar la auditoría:", error.message);
}
