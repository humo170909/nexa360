import { supabase } from "../lib/supabaseClient";
import type { Guardian, GuardianWithStudent } from "../types/guardian";

export interface GuardianInput {
  owner_id: string;
  full_name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

// Trae los apoderados con el nombre del estudiante ya resuelto (join
// manual contra clients, mismo enfoque que listPets/listVehicles).
export async function listGuardians(
  companyId: string,
  options?: { search?: string },
): Promise<GuardianWithStudent[]> {
  let query = supabase
    .from("guardians")
    .select("*, student:clients(full_name)")
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (options?.search?.trim()) {
    query = query.ilike("full_name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const { student, ...guardian } = row as Guardian & { student: { full_name: string } | null };
    return { ...guardian, student_name: student?.full_name ?? "—" };
  });
}

export async function createGuardian(companyId: string, input: GuardianInput) {
  const { data, error } = await supabase
    .from("guardians")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Guardian | null, error: error?.message ?? null };
}

export async function updateGuardian(id: string, input: GuardianInput) {
  const { data, error } = await supabase
    .from("guardians")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Guardian | null, error: error?.message ?? null };
}

export async function deleteGuardian(id: string) {
  const { error } = await supabase.from("guardians").delete().eq("id", id);
  return { error: error?.message ?? null };
}
