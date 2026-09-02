import { supabase } from "../lib/supabaseClient";
import type { Vehicle, VehicleWithOwner } from "../types/vehicle";

export interface VehicleInput {
  owner_id: string;
  plate: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  notes?: string | null;
}

// Trae los vehículos con el nombre del dueño ya resuelto (join manual
// contra clients, mismo enfoque que listPets).
export async function listVehicles(
  companyId: string,
  options?: { search?: string },
): Promise<VehicleWithOwner[]> {
  let query = supabase
    .from("vehicles")
    .select("*, owner:clients(full_name)")
    .eq("company_id", companyId)
    .order("plate", { ascending: true });

  if (options?.search?.trim()) {
    query = query.ilike("plate", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const { owner, ...vehicle } = row as Vehicle & { owner: { full_name: string } | null };
    return { ...vehicle, owner_name: owner?.full_name ?? "—" };
  });
}

export async function listVehiclesForOwner(ownerId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("owner_id", ownerId)
    .order("plate", { ascending: true });
  if (error || !data) return [];
  return data as Vehicle[];
}

export async function createVehicle(companyId: string, input: VehicleInput) {
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Vehicle | null, error: error?.message ?? null };
}

export async function updateVehicle(id: string, input: VehicleInput) {
  const { data, error } = await supabase
    .from("vehicles")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Vehicle | null, error: error?.message ?? null };
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  return { error: error?.message ?? null };
}
