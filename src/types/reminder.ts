export type ReminderStatus = "pendiente" | "enviado" | "fallido";

export interface Reminder {
  id: string;
  company_id: string;
  appointment_id: string;
  channel: "email";
  send_at: string;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
}

// Forma que devuelve Supabase al pedir la cita (y su cliente/servicio)
// relacionada, en la misma consulta.
export interface ReminderWithDetails extends Reminder {
  appointment: {
    starts_at: string;
    client: { full_name: string } | null;
    service: { name: string } | null;
  } | null;
}

export const REMINDER_STATUS_LABEL: Record<ReminderStatus, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  fallido: "Fallido",
};

export const REMINDER_STATUS_TONE: Record<ReminderStatus, "info" | "success" | "error"> = {
  pendiente: "info",
  enviado: "success",
  fallido: "error",
};
