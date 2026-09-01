import { supabase } from "../lib/supabaseClient";
import type { Service } from "../types/service";

// Lectura mínima para poder elegir un servicio al crear una cita (Agenda,
// Fase 10). El CRUD completo de servicios se construye en la Fase 11.
export async function listServices(companyId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as Service[];
}
