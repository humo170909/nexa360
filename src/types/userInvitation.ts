import type { CompanyRole } from "./company";

export type UserInvitationStatus = "pendiente" | "aceptada" | "expirada" | "cancelada";

export interface UserInvitation {
  id: string;
  company_id: string;
  invited_email: string;
  invited_name: string | null;
  role: CompanyRole;
  status: UserInvitationStatus;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Estado real (considera expiración por fecha, no solo la columna
// "status" — una invitación puede llevar días vencida sin que nadie
// haya vuelto a tocar esa fila).
export function userInvitationStatus(inv: UserInvitation): UserInvitationStatus {
  if (inv.status === "pendiente" && new Date(inv.expires_at) < new Date()) return "expirada";
  return inv.status;
}

export const USER_INVITATION_STATUS_LABEL: Record<UserInvitationStatus, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export type ValidateUserInvitationReason =
  | "invalid"
  | "expired"
  | "used"
  | "cancelled"
  | "email_mismatch"
  | "not_authenticated";

export const INVALID_USER_INVITATION_MESSAGE: Record<ValidateUserInvitationReason, string> = {
  invalid: "Esta invitación no es válida.",
  expired: "Esta invitación ha expirado.",
  used: "Esta invitación ya fue utilizada.",
  cancelled: "Esta invitación fue cancelada.",
  email_mismatch: "Esta invitación es para otro correo electrónico. Cierra sesión e intenta de nuevo.",
  not_authenticated: "Tu sesión expiró. Intenta de nuevo.",
};
