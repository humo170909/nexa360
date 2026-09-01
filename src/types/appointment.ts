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

export interface AppointmentInput {
  client_id: string;
  service_id: string | null;
  assigned_to: string | null;
  starts_at: string; // ISO
  ends_at: string | null;
  notes: string | null;
}

// Compartido entre Dashboard y Agenda para no repetir la misma tabla dos veces.
export const STATUS_TONE: Record<AppointmentStatus, "neutral" | "success" | "error" | "info"> = {
  pendiente: "info",
  confirmada: "success",
  atendida: "neutral",
  cancelada: "error",
  no_asistio: "error",
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

export const STATUS_OPTIONS: AppointmentStatus[] = [
  "pendiente",
  "confirmada",
  "atendida",
  "cancelada",
  "no_asistio",
];
