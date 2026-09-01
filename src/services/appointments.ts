import { supabase } from "../lib/supabaseClient";
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  AppointmentWithDetails,
} from "../types/appointment";

export async function listAppointmentsForRange(
  companyId: string,
  startISO: string,
  endISO: string,
): Promise<AppointmentWithDetails[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, client:clients(full_name), service:services(name)")
    .eq("company_id", companyId)
    .gte("starts_at", startISO)
    .lt("starts_at", endISO)
    .order("starts_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as AppointmentWithDetails[];
}

export async function getTodayAppointments(
  companyId: string,
): Promise<AppointmentWithDetails[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  return listAppointmentsForRange(companyId, start.toISOString(), end.toISOString());
}

export async function createAppointment(companyId: string, input: AppointmentInput) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Appointment | null, error: error?.message ?? null };
}

export async function updateAppointment(id: string, input: AppointmentInput) {
  const { data, error } = await supabase
    .from("appointments")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Appointment | null, error: error?.message ?? null };
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  return { error: error?.message ?? null };
}
