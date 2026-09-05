export interface Invitation {
  id: string;
  created_by: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string;
  is_active: boolean;
  company_id: string | null;
  notes: string | null;
  created_at: string;
}

// Con el nombre de la empresa y de quién lo creó ya resueltos (joins
// contra companies/profiles), para la tabla de Invitaciones.
export interface InvitationWithCompany extends Invitation {
  company_name: string | null;
  creator_name: string | null;
}

export type InvitationStatus = "active" | "used" | "expired" | "disabled";

// Estado derivado en el frontend — no es una columna de la tabla, se
// calcula a partir de is_active/expires_at/used_count/max_uses.
export function invitationStatus(inv: Invitation): InvitationStatus {
  if (!inv.is_active) return "disabled";
  if (new Date(inv.expires_at) < new Date()) return "expired";
  if (inv.used_count >= inv.max_uses) return "used";
  return "active";
}

export const INVITATION_STATUS_LABEL: Record<InvitationStatus, string> = {
  active: "Activo",
  used: "Usado",
  expired: "Expirado",
  disabled: "Desactivado",
};

// Motivos que devuelve validate_invitation_code/redeem_invitation_code
// (database/policies.sql) — deben coincidir exactamente con los strings
// que retornan esas funciones de Postgres.
export type InvalidCodeReason =
  | "invalid"
  | "expired"
  | "used"
  | "disabled"
  | "rate_limited"
  | "not_authenticated";

export const INVALID_CODE_MESSAGE: Record<InvalidCodeReason, string> = {
  invalid: "El código de invitación no es válido.",
  expired: "El código de invitación ha expirado.",
  used: "Este código ya fue utilizado.",
  disabled: "Este código ha sido desactivado.",
  rate_limited: "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
  not_authenticated: "Tu sesión expiró. Inicia el registro de nuevo.",
};
