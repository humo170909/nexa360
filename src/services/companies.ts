import { supabase } from "../lib/supabaseClient";
import type { BusinessType, Company, CompanyRole } from "../types/company";

// El trigger "handle_new_company" (database/schema.sql) convierte
// automáticamente a "ownerId" en ADMIN de la empresa recién creada — no
// hay que insertar company_users manualmente aquí.
export async function createCompany(
  name: string,
  businessType: BusinessType,
  ownerId: string,
): Promise<{ data: Company | null; error: string | null }> {
  const { data, error } = await supabase
    .from("companies")
    .insert({ name, business_type: businessType, owner_id: ownerId })
    .select()
    .single();

  if (error) {
    // Log completo (código, mensaje, detalle, pista) para poder depurar
    // sin tener que ir a buscar el cuerpo de la respuesta en Network.
    console.error("[createCompany error]", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  return { data: data as Company | null, error: error?.message ?? null };
}

export interface CompanyMembership {
  company: Company;
  role: CompanyRole;
}

// Empresa(s) a las que pertenece el usuario actual, con su rol en cada
// una (vía company_users). Se usa desde useCompany(); si más adelante se
// soporta pertenecer a varias empresas, esta consulta ya devuelve el
// arreglo completo.
export async function getMyCompanies(): Promise<CompanyMembership[]> {
  const { data, error } = await supabase
    .from("company_users")
    .select("role, companies(*)");

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
