export type AppointmentStatus =
  | "pendiente"
  | "confirmada"
  | "atendida"
  | "cancelada"
  | "no_asistio";

export interface Appointment {
  id: string;
  company_id: string;
  client_id: string;
  service_id: string | null;
  assigned_to: string | null;
  starts_at: string;
  ends_at: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

// Forma que devuelve Supabase al pedir el cliente/servicio relacionados
// en la misma consulta (usado en Dashboard y Agenda).
export interface AppointmentWithDetails extends Appointment {
  client: { full_name: string } | null;
  service: { name: string } | null;
}
