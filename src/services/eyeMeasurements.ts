import { supabase } from "../lib/supabaseClient";
import type { EyeMeasurement, EyeMeasurementWithOwner } from "../types/eyeMeasurement";

export interface EyeMeasurementInput {
  owner_id: string;
  measured_at: string;
  od_sphere?: number | null;
  od_cylinder?: number | null;
  od_axis?: number | null;
  os_sphere?: number | null;
  os_cylinder?: number | null;
  os_axis?: number | null;
  pupillary_distance?: number | null;
  notes?: string | null;
}

// Trae las medidas con el nombre del cliente ya resuelto (join manual
// contra clients, mismo enfoque que listPets/listVehicles).
export async function listEyeMeasurements(
  companyId: string,
  options?: { search?: string },
): Promise<EyeMeasurementWithOwner[]> {
  let query = supabase
    .from("eye_measurements")
    .select("*, owner:clients(full_name)")
    .eq("company_id", companyId)
    .order("measured_at", { ascending: false });

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data.map((row) => {
    const { owner, ...measurement } = row as EyeMeasurement & {
      owner: { full_name: string } | null;
    };
    return { ...measurement, owner_name: owner?.full_name ?? "—" };
  });

  if (options?.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    return rows.filter((r) => r.owner_name.toLowerCase().includes(term));
  }
  return rows;
}

export async function listEyeMeasurementsForOwner(ownerId: string): Promise<EyeMeasurement[]> {
  const { data, error } = await supabase
    .from("eye_measurements")
    .select("*")
    .eq("owner_id", ownerId)
    .order("measured_at", { ascending: false });
  if (error || !data) return [];
  return data as EyeMeasurement[];
}

export async function createEyeMeasurement(companyId: string, input: EyeMeasurementInput) {
  const { data, error } = await supabase
    .from("eye_measurements")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as EyeMeasurement | null, error: error?.message ?? null };
}

export async function updateEyeMeasurement(id: string, input: EyeMeasurementInput) {
  const { data, error } = await supabase
    .from("eye_measurements")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as EyeMeasurement | null, error: error?.message ?? null };
}

export async function deleteEyeMeasurement(id: string) {
  const { error } = await supabase.from("eye_measurements").delete().eq("id", id);
  return { error: error?.message ?? null };
}
