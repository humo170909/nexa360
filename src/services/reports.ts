import { supabase } from "../lib/supabaseClient";

export interface ReportStats {
  appointmentsTotal: number;
  newClients: number;
  recurringClients: number;
  completedServices: number;
  cancellations: number;
  noShows: number;
  remindersSent: number;
}

// 6 conteos en paralelo + 1 consulta extra para "clientes recurrentes"
// (no es un simple count: hay que agrupar por cliente y ver quién tiene
// 2 o más citas en el rango). Con volúmenes pequeños esto es sencillo y
// rápido; si la empresa crece mucho, esto se movería a una vista/función
// de Postgres — no hace falta esa complejidad todavía.
export async function getReportStats(
  companyId: string,
  startISO: string,
  endISO: string,
): Promise<ReportStats> {
  const [appointments, newClients, completed, cancelled, noShow, remindersSent, appointmentRows] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("starts_at", startISO)
        .lt("starts_at", endISO),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", startISO)
        .lt("created_at", endISO),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "atendida")
        .gte("starts_at", startISO)
        .lt("starts_at", endISO),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "cancelada")
        .gte("starts_at", startISO)
        .lt("starts_at", endISO),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "no_asistio")
        .gte("starts_at", startISO)
        .lt("starts_at", endISO),
      supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "enviado")
        .gte("sent_at", startISO)
        .lt("sent_at", endISO),
      supabase
        .from("appointments")
        .select("client_id")
        .eq("company_id", companyId)
        .gte("starts_at", startISO)
        .lt("starts_at", endISO),
    ]);

  const visitsPerClient = new Map<string, number>();
  for (const row of appointmentRows.data ?? []) {
    visitsPerClient.set(row.client_id, (visitsPerClient.get(row.client_id) ?? 0) + 1);
  }
  const recurringClients = [...visitsPerClient.values()].filter((count) => count >= 2).length;

  return {
    appointmentsTotal: appointments.count ?? 0,
    newClients: newClients.count ?? 0,
    recurringClients,
    completedServices: completed.count ?? 0,
    cancellations: cancelled.count ?? 0,
    noShows: noShow.count ?? 0,
    remindersSent: remindersSent.count ?? 0,
  };
}

export interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
}

// Para el gráfico de barras "Citas por día" — agrupa en el cliente porque
// el volumen esperado (citas de un rango de días/semanas) es chico.
export async function getAppointmentsByDay(
  companyId: string,
  startISO: string,
  endISO: string,
): Promise<DailyCount[]> {
  const { data } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("company_id", companyId)
    .gte("starts_at", startISO)
    .lt("starts_at", endISO);

  const byDay = new Map<string, number>();
  for (const row of data ?? []) {
    const day = row.starts_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
