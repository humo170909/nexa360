import { supabase } from "../lib/supabaseClient";
import type { Company, CompanyRole } from "../types/company";

// Fase 22: ya no existe un "createCompany" de autoservicio — una empresa
// solo puede nacer dentro de redeem_invitation_code() (database/policies.sql),
// que exige un código de invitación válido. Ver src/services/invitations.ts.

export interface CompanyMembership {
  company: Company;
  role: CompanyRole;
}

// Empresa(s) a las que pertenece el usuario actual, con su rol en cada
// una (vía company_users). Se usa desde useCompany(); si más adelante se
// soporta pertenecer a varias empresas, esta consulta ya devuelve el
// arreglo completo.
export async function getMyCompanies(): Promise<CompanyMembership[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Filtro explícito por user_id, no confiar solo en RLS: la política de
  // "company_users" deja ver TODAS las filas a un SUPERADMIN
  // (is_superadmin() no depende de la fila), a propósito para pantallas
  // como el panel de Empresas. Pero esta función responde "¿a qué
  // empresa pertenezco YO?" — sin este filtro, un SUPERADMIN recibiría
  // las membresías de TODAS las empresas y el código tomaría la primera
  // al azar como si fuera la suya.
  const { data, error } = await supabase
    .from("company_users")
    .select("role, companies(*)")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data
    .filter((row) => row.companies)
    .map((row) => ({
      company: row.companies as unknown as Company,
      role: row.role as CompanyRole,
    }));
}

export interface CompanyMember {
  id: string;
  full_name: string | null;
}

// Usuarios de la empresa activa, para elegir "Profesional" al crear una
// cita (Agenda, Fase 10).
export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from("company_users")
    .select("profiles(id, full_name)")
    .eq("company_id", companyId);

  if (error || !data) return [];
  return data
    .map((row) => row.profiles as unknown as CompanyMember)
    .filter(Boolean);
}

export async function updateCompanyName(companyId: string, name: string) {
  const { data, error } = await supabase
    .from("companies")
    .update({ name })
    .eq("id", companyId)
    .select()
    .single();
  return { data: data as Company | null, error: error?.message ?? null };
}

export interface CompanyMemberDetailed extends CompanyMember {
  role: CompanyRole;
  // id de la fila en company_users (distinto del id del usuario) — hace
  // falta para poder editar/eliminar ese vínculo puntual con updateMemberRole.
  companyUserId: string;
}

// Igual que getCompanyMembers, pero con el rol incluido — para la
// pestaña "Usuarios" de Configuración.
export async function listCompanyUsersDetailed(
  companyId: string,
): Promise<CompanyMemberDetailed[]> {
  const { data, error } = await supabase
    .from("company_users")
    .select("id, role, profiles(id, full_name)")
    .eq("company_id", companyId);

  if (error || !data) return [];
  return data
    .map((row) => {
      const profile = row.profiles as unknown as CompanyMember | null;
      if (!profile) return null;
      return { ...profile, role: row.role as CompanyRole, companyUserId: row.id as string };
    })
    .filter((m): m is CompanyMemberDetailed => m !== null);
}

// Cambia el rol de un miembro ya existente. Protegido por RLS
// ("company_users_update_admin_or_superadmin" en database/policies.sql):
// solo un ADMIN de la empresa (o SUPERADMIN) puede ejecutar esto con éxito,
// aunque alguien manipule la petición desde el navegador.
export async function updateMemberRole(companyUserId: string, role: CompanyRole) {
  const { error } = await supabase.from("company_users").update({ role }).eq("id", companyUserId);
  return { error: error?.message ?? null };
}

// Quita a alguien de la empresa (borra su fila en company_users, no su
// cuenta de Supabase Auth — sigue pudiendo entrar a NEXA360, solo que
// sin ninguna empresa hasta que lo inviten de nuevo). Protegido por RLS
// ("company_users_delete_admin_or_superadmin", ya existía desde la
// Fase 5) — solo un ADMIN de la empresa o un SUPERADMIN pueden hacerlo.
export async function removeMember(companyUserId: string) {
  const { error } = await supabase.from("company_users").delete().eq("id", companyUserId);
  return { error: error?.message ?? null };
}
