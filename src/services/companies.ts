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
