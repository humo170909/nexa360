import { supabase } from "../lib/supabaseClient";
import type { Pet, PetWithOwner } from "../types/pet";

export interface PetInput {
  owner_id: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  birth_date?: string | null;
  notes?: string | null;
}

// Trae las mascotas con el nombre del dueño ya resuelto (join manual
// contra clients, mismo enfoque que listClientsWithLastVisit).
export async function listPets(
  companyId: string,
  options?: { search?: string },
): Promise<PetWithOwner[]> {
  let query = supabase
    .from("pets")
    .select("*, owner:clients(full_name)")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (options?.search?.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const { owner, ...pet } = row as Pet & { owner: { full_name: string } | null };
    return { ...pet, owner_name: owner?.full_name ?? "—" };
  });
}

export async function listPetsForOwner(ownerId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as Pet[];
}

export async function createPet(companyId: string, input: PetInput) {
  const { data, error } = await supabase
    .from("pets")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Pet | null, error: error?.message ?? null };
}

export async function updatePet(id: string, input: PetInput) {
  const { data, error } = await supabase
    .from("pets")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Pet | null, error: error?.message ?? null };
}

export async function deletePet(id: string) {
  const { error } = await supabase.from("pets").delete().eq("id", id);
  return { error: error?.message ?? null };
}
