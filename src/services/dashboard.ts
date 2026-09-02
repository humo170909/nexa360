import { supabase } from "../lib/supabaseClient";

export interface DashboardStats {
  todayAppointments: number;
  completedToday: number;
  totalClients: number;
  pendingReminders: number;
  activeServices: number;
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfTomorrowISO() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

// 5 conteos en paralelo — todos usan RLS (is_company_member), así que
// automáticamente están limitados a la empresa activa sin filtrar "a mano".
export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const [appointments, completed, clients, reminders, services] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("starts_at", startOfTodayISO())
      .lt("starts_at", startOfTomorrowISO()),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "atendida")
      .gte("starts_at", startOfTodayISO())
      .lt("starts_at", startOfTomorrowISO()),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pendiente"),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
  ]);

  return {
    todayAppointments: appointments.count ?? 0,
    completedToday: completed.count ?? 0,
    totalClients: clients.count ?? 0,
    pendingReminders: reminders.count ?? 0,
    activeServices: services.count ?? 0,
  };
}
