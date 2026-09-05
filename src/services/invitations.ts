import { supabase } from "../lib/supabaseClient";
import type { Invitation, InvitationWithCompany, InvalidCodeReason } from "../types/invitation";
import type { BusinessType } from "../types/company";

// Caracteres sin ambigüedad visual (sin 0/O, 1/I/L) — para que un código
// leído en voz alta o copiado a mano no se preste a confusión.
const CODE_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Math.random() NO es criptográficamente segura (es predecible) — para
// un código que funciona como credencial de un solo uso hace falta
// crypto.getRandomValues(), la misma API que usan los generadores de
// contraseñas de los navegadores.
function randomCodeGroup(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARSET[b % CODE_CHARSET.length]).join("");
}

// Formato "NX-7K4P-92LM". Se genera en el navegador del SUPERADMIN — el
// texto plano nunca viaja a Supabase, solo su hash (ver sha256Hex).
export function generateInvitationCode(): string {
  return `NX-${randomCodeGroup(4)}-${randomCodeGroup(4)}`;
}

// Misma normalización que las funciones de Postgres (upper + trim) antes
// de hashear — si esto no coincide exactamente, la validación en el
// servidor nunca va a encontrar el código.
async function sha256Hex(text: string): Promise<string> {
  const normalized = text.trim().toUpperCase();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CreateInvitationInput {
  expiresAt: string; // ISO
  maxUses: number;
  notes?: string | null;
}

// Genera el código, lo hashea en el navegador y guarda solo el hash.
// Devuelve el código en texto plano UNA sola vez — después de esto, ni
// siquiera el SUPERADMIN puede volver a verlo (ver docs/notificaciones.md
// no aplica; la nota real está en MANUAL-DESARROLLADOR.md, Fase 22).
export async function createInvitation(
  input: CreateInvitationInput,
): Promise<{ code: string | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const code = generateInvitationCode();
  const codeHash = await sha256Hex(code);

  const { error } = await supabase.from("invitations").insert({
    code_hash: codeHash,
    created_by: user?.id ?? null,
    max_uses: input.maxUses,
    expires_at: input.expiresAt,
    notes: input.notes || null,
  });

  if (error) return { code: null, error: error.message };
  return { code, error: null };
}

export async function listInvitations(): Promise<InvitationWithCompany[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*, company:companies(name), creator:profiles!created_by(full_name)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => {
    const { company, creator, ...invitation } = row as Invitation & {
      company: { name: string } | null;
      creator: { full_name: string } | null;
    };
    return {
      ...invitation,
      company_name: company?.name ?? null,
      creator_name: creator?.full_name ?? null,
    };
  });
}

export async function disableInvitation(id: string) {
  const { error } = await supabase.from("invitations").update({ is_active: false }).eq("id", id);
  return { error: error?.message ?? null };
}

interface ValidateResult {
  valid: boolean;
  reason: "ok" | InvalidCodeReason;
}

// Paso 1 del registro — se llama SIN sesión (rol "anon"). La validación
// real ocurre dentro de la función de Postgres, nunca en este archivo:
// el frontend solo manda el código y muestra la respuesta.
export async function validateInvitationCode(code: string): Promise<ValidateResult> {
  const { data, error } = await supabase.rpc("validate_invitation_code", { p_code: code });
  if (error || !data) return { valid: false, reason: "invalid" };
  return data as ValidateResult;
}

interface RedeemResult {
  success: boolean;
  reason?: InvalidCodeReason;
  company_id?: string;
}

// Paso final del registro — se llama DESPUÉS de que supabase.auth.signUp()
// ya creó la cuenta y hay una sesión activa (auth.uid() la usa la función
// de Postgres para saber quién está canjeando el código).
export async function redeemInvitationCode(
  code: string,
  companyName: string,
  businessType: BusinessType,
): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("redeem_invitation_code", {
    p_code: code,
    p_company_name: companyName,
    p_business_type: businessType,
  });
  if (error || !data) return { success: false, reason: "invalid" };
  return data as RedeemResult;
}

const PENDING_REDEMPTION_KEY = "nexa360_pending_invitation";

interface PendingRedemption {
  code: string;
  companyName: string;
  businessType: BusinessType;
}

// Si tu proyecto de Supabase tiene activado "Confirmar email" en Auth,
// signUp() no entrega una sesión hasta que el usuario confirma su
// correo — y sin sesión, redeem_invitation_code no puede ejecutarse
// (auth.uid() sería null). Este dato NO es sensible (no es una
// contraseña ni un secreto) — solo evita que el usuario tenga que volver
// a escribir el código/nombre de empresa después de confirmar su correo.
// useCompany.tsx lo consume automáticamente en el primer login.
export function savePendingRedemption(data: PendingRedemption) {
  localStorage.setItem(PENDING_REDEMPTION_KEY, JSON.stringify(data));
}

export function getPendingRedemption(): PendingRedemption | null {
  const raw = localStorage.getItem(PENDING_REDEMPTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingRedemption;
  } catch {
    return null;
  }
}

export function clearPendingRedemption() {
  localStorage.removeItem(PENDING_REDEMPTION_KEY);
}
