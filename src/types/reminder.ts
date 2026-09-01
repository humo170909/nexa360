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
