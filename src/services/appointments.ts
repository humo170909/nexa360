import { supabase } from "../lib/supabaseClient";
import type { AppointmentWithDetails } from "../types/appointment";

export async function getTodayAppointments(
  companyId: string,
): Promise<AppointmentWithDetails[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(24, 0, 0, 0);

  const { data, error } = await supabase
    .from("appointments")
    .select("*, client:clients(full_name), service:services(name)")
    .eq("company_id", companyId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as AppointmentWithDetails[];
}
