import { supabase } from "../lib/supabaseClient";
import type { Service } from "../types/service";

export interface ServiceInput {
  name: string;
  description?: string | null;
  duration_minutes?: number | null;
  price?: number | null;
  is_active?: boolean;
}

// listActiveOnly=true es lo que usa Agenda para el selector de citas.
// La página de Servicios pide listActiveOnly=false para poder ver y
// reactivar los que están desactivados.
export async function listServices(
  companyId: string,
  options?: { search?: string; activeOnly?: boolean },
): Promise<Service[]> {
  let query = supabase
    .from("services")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }
  if (options?.search?.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Service[];
}

export async function createService(companyId: string, input: ServiceInput) {
  const { data, error } = await supabase
    .from("services")
    .insert({ company_id: companyId, is_active: true, ...input })
    .select()
    .single();
  return { data: data as Service | null, error: error?.message ?? null };
}

export async function updateService(id: string, input: ServiceInput) {
  const { data, error } = await supabase
    .from("services")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Service | null, error: error?.message ?? null };
}

export async function toggleServiceActive(id: string, isActive: boolean) {
  const { error } = await supabase.from("services").update({ is_active: isActive }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  return { error: error?.message ?? null };
}
