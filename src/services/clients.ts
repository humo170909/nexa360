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

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as Client;
}

export interface ClientWithLastVisit extends Client {
  last_visit: string | null;
}

// Para "Historia": la lista de clientes ordenada por su cita más reciente
// (los que no tienen ninguna cita todavía quedan al final). Se calcula acá
// mismo porque el volumen de una empresa chica lo permite sin problema —
// una vista de Postgres sería la mejora natural si esto creciera mucho.
export async function listClientsWithLastVisit(companyId: string): Promise<ClientWithLastVisit[]> {
  const [clientsRes, appointmentsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("company_id", companyId),
    supabase
      .from("appointments")
      .select("client_id, starts_at")
      .eq("company_id", companyId)
      .order("starts_at", { ascending: false }),
  ]);

  const lastVisitByClient = new Map<string, string>();
  for (const row of appointmentsRes.data ?? []) {
    if (!lastVisitByClient.has(row.client_id)) {
      lastVisitByClient.set(row.client_id, row.starts_at);
    }
  }

  const clients = (clientsRes.data ?? []) as Client[];
  return clients
    .map((c) => ({ ...c, last_visit: lastVisitByClient.get(c.id) ?? null }))
    .sort((a, b) => {
      if (!a.last_visit && !b.last_visit) return a.full_name.localeCompare(b.full_name);
      if (!a.last_visit) return 1;
      if (!b.last_visit) return -1;
      return b.last_visit.localeCompare(a.last_visit);
    });
}
