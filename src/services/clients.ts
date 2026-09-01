import { supabase } from "../lib/supabaseClient";
import type { Client } from "../types/client";

export interface ClientInput {
  full_name: string;
  document_id?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  notes?: string | null;
}

export async function listClients(companyId: string, search?: string): Promise<Client[]> {
  let query = supabase
    .from("clients")
    .select("*")
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("full_name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Client[];
}

export async function createClient(companyId: string, input: ClientInput) {
  const { data, error } = await supabase
    .from("clients")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Client | null, error: error?.message ?? null };
}

export async function updateClient(id: string, input: ClientInput) {
  const { data, error } = await supabase
    .from("clients")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Client | null, error: error?.message ?? null };
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  return { error: error?.message ?? null };
}
