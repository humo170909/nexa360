import { supabase } from "../lib/supabaseClient";
import type { CompanyRole } from "../types/company";
import type { UserInvitation } from "../types/userInvitation";

// Token más largo que el código de empresa (Fase 22): este va dentro de
// un link (nadie lo escribe a mano), así que no hace falta un charset
// "legible" — más entropía, sin ninguna otra consideración de formato.
function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CreateUserInvitationInput {
  email: string;
  name?: string;
  role: CompanyRole;
}

// El token se genera y se hashea en el navegador del ADMIN — igual que
// los códigos de empresa, solo el hash llega a Supabase. Se devuelve el
// link completo UNA sola vez; después no se puede volver a ver.
export async function createUserInvitation(
  companyId: string,
  input: CreateUserInvitationInput,
): Promise<{ link: string | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const token = generateToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase.from("user_invitations").insert({
    company_id: companyId,
    token_hash: tokenHash,
    invited_email: input.email.trim().toLowerCase(),
    invited_name: input.name || null,
    role: input.role,
    invited_by: user?.id ?? null,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return { link: null, error: error.message };
  return { link: `${window.location.origin}/accept-invite?token=${token}`, error: null };
}

export async function listUserInvitations(companyId: string): Promise<UserInvitation[]> {
  const { data, error } = await supabase
    .from("user_invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as UserInvitation[];
}

export async function cancelUserInvitation(id: string) {
  const { error } = await supabase
    .from("user_invitations")
    .update({ status: "cancelada" })
    .eq("id", id);
  return { error: error?.message ?? null };
}

// "Reenviar" no puede mostrar el mismo link de nuevo — el token en texto
// plano ya se perdió apenas se generó (a propósito, mismo criterio que
// los códigos de empresa). En su lugar, cancela la invitación vieja y
// crea una nueva para el mismo correo/rol, con un link distinto.
export async function resendUserInvitation(
  companyId: string,
  invitation: UserInvitation,
): Promise<{ link: string | null; error: string | null }> {
  await cancelUserInvitation(invitation.id);
  return createUserInvitation(companyId, {
    email: invitation.invited_email,
    name: invitation.invited_name ?? undefined,
    role: invitation.role,
  });
}

interface ValidateResult {
  valid: boolean;
  reason?: string;
  company_name?: string;
  invited_email?: string;
  invited_name?: string | null;
  role?: CompanyRole;
}

export async function validateUserInvitation(token: string): Promise<ValidateResult> {
  const { data, error } = await supabase.rpc("validate_user_invitation", { p_token: token });
  if (error || !data) return { valid: false, reason: "invalid" };
  return data as ValidateResult;
}

interface AcceptResult {
  success: boolean;
  reason?: string;
  company_id?: string;
}

export async function acceptUserInvitation(token: string): Promise<AcceptResult> {
  const { data, error } = await supabase.rpc("accept_user_invitation", { p_token: token });
  if (error || !data) return { success: false, reason: "invalid" };
  return data as AcceptResult;
}

const PENDING_USER_INVITE_KEY = "nexa360_pending_user_invite";

// Mismo caso que "nexa360_pending_invitation" (invitations.ts, Fase 22):
// si el proyecto exige confirmar el correo, signUp() no deja sesión
// todavía, así que accept_user_invitation no puede correr en el momento.
// El token (no sensible, no es una contraseña) se guarda para
// completarlo solo en el primer login — ver hooks/useCompany.tsx.
export function savePendingUserInvite(token: string) {
  localStorage.setItem(PENDING_USER_INVITE_KEY, token);
}

export function getPendingUserInvite(): string | null {
  return localStorage.getItem(PENDING_USER_INVITE_KEY);
}

export function clearPendingUserInvite() {
  localStorage.removeItem(PENDING_USER_INVITE_KEY);
}
