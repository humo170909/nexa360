import { supabase } from "../lib/supabaseClient";
import type { Reminder, ReminderStatus, ReminderWithDetails } from "../types/reminder";

export interface ReminderFilters {
  status?: ReminderStatus;
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
}

export async function listReminders(
  companyId: string,
  filters?: ReminderFilters,
): Promise<ReminderWithDetails[]> {
  let query = supabase
    .from("reminders")
    .select("*, appointment:appointments(starts_at, client:clients(full_name), service:services(name))")
    .eq("company_id", companyId)
    .order("send_at", { ascending: true });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.dateFrom) query = query.gte("send_at", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("send_at", filters.dateTo);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as ReminderWithDetails[];
}

export interface ReminderStats {
  scheduled: number; // pendiente, todavía no vence
  overdue: number; // pendiente, ya venció (debería haberse enviado)
  sent: number;
  failed: number;
}

// 4 conteos en paralelo — mismo patrón que getDashboardStats.
export async function getReminderStats(companyId: string): Promise<ReminderStats> {
  const nowISO = new Date().toISOString();
  const [scheduled, overdue, sent, failed] = await Promise.all([
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pendiente")
      .gt("send_at", nowISO),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pendiente")
      .lte("send_at", nowISO),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "enviado"),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "fallido"),
  ]);

  return {
    scheduled: scheduled.count ?? 0,
    overdue: overdue.count ?? 0,
    sent: sent.count ?? 0,
    failed: failed.count ?? 0,
  };
}

export interface ReminderInput {
  appointment_id: string;
  channel: "email";
  send_at: string; // ISO
}

export async function createReminder(companyId: string, input: ReminderInput) {
  const { data, error } = await supabase
    .from("reminders")
    .insert({ company_id: companyId, status: "pendiente", ...input })
    .select()
    .single();
  return { data: data as Reminder | null, error: error?.message ?? null };
}

// Solo tiene sentido "cancelar" un recordatorio que todavía no se envió —
// la UI únicamente ofrece esta acción para los que están en "pendiente".
export async function deleteReminder(id: string) {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  return { error: error?.message ?? null };
}
