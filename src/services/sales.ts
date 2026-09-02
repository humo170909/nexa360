import { supabase } from "../lib/supabaseClient";
import type { Sale, SaleWithOwner } from "../types/sale";

export interface SaleInput {
  owner_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  sold_at: string;
  notes?: string | null;
}

// Trae las ventas con el nombre del cliente ya resuelto (join manual
// contra clients, mismo enfoque que listPets/listVehicles).
export async function listSales(
  companyId: string,
  options?: { search?: string },
): Promise<SaleWithOwner[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, owner:clients(full_name)")
    .eq("company_id", companyId)
    .order("sold_at", { ascending: false });

  if (error || !data) return [];

  let rows = data.map((row) => {
    const { owner, ...sale } = row as Sale & { owner: { full_name: string } | null };
    return { ...sale, owner_name: owner?.full_name ?? "—" };
  });

  if (options?.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    rows = rows.filter(
      (r) => r.item_name.toLowerCase().includes(term) || r.owner_name.toLowerCase().includes(term),
    );
  }
  return rows;
}

export async function createSale(companyId: string, input: SaleInput) {
  const { data, error } = await supabase
    .from("sales")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Sale | null, error: error?.message ?? null };
}

export async function updateSale(id: string, input: SaleInput) {
  const { data, error } = await supabase
    .from("sales")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Sale | null, error: error?.message ?? null };
}

export async function deleteSale(id: string) {
  const { error } = await supabase.from("sales").delete().eq("id", id);
  return { error: error?.message ?? null };
}
