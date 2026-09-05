import { supabase } from "../lib/supabaseClient";
import type { Company } from "../types/company";

export interface CompanyWithMemberCount extends Company {
  member_count: number;
}

// Solo un SUPERADMIN puede ver TODAS las empresas (RLS:
// "companies_select_members_or_superadmin" en database/policies.sql).
// Para cualquier otro rol, esto simplemente devuelve un arreglo vacío —
// no hace falta chequear el rol acá, Postgres ya lo hace.
export async function listAllCompanies(): Promise<CompanyWithMemberCount[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*, company_users(count)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => {
    const { company_users, ...company } = row as unknown as Company & {
      company_users: { count: number }[];
    };
    return { ...company, member_count: company_users?.[0]?.count ?? 0 };
  });
}

export interface PlatformUser {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_superadmin: boolean;
  created_at: string;
}

// No incluye email a propósito: vive en auth.users, no en profiles, y
// auth.users no es accesible desde el cliente (ni siquiera para un
// SUPERADMIN) sin la SERVICE_ROLE_KEY — que nunca debe usarse en el
// frontend. Verla requeriría una Edge Function propia, igual que
// send-reminders; queda fuera de esta fase.
export async function listAllProfiles(): Promise<PlatformUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, is_superadmin, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PlatformUser[];
}
