import { supabase } from "../lib/supabaseClient";
import type { BusinessHour } from "../types/businessHours";

// Lunes a viernes abiertos 09:00-18:00, fin de semana cerrado — solo se usa
// como valor inicial en pantalla mientras la empresa no ha guardado nada
// todavía. No se inserta en la base de datos hasta que el usuario da "Guardar".
function defaultHours(companyId: string): BusinessHour[] {
  return Array.from({ length: 7 }, (_, day) => ({
    id: "",
    company_id: companyId,
    day_of_week: day,
    opens_at: day >= 1 && day <= 5 ? "09:00" : null,
    closes_at: day >= 1 && day <= 5 ? "18:00" : null,
    is_closed: day === 0 || day === 6,
    created_at: "",
  }));
}

export async function listBusinessHours(companyId: string): Promise<BusinessHour[]> {
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("company_id", companyId)
    .order("day_of_week", { ascending: true });

  if (error || !data || data.length === 0) return defaultHours(companyId);

  const byDay = new Map((data as BusinessHour[]).map((h) => [h.day_of_week, h]));
  return defaultHours(companyId).map((fallback) => byDay.get(fallback.day_of_week) ?? fallback);
}

export interface BusinessHourInput {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

// Guarda las 7 filas de una sola vez. "upsert" con onConflict actualiza la
// fila si ya existe para ese día (gracias al unique(company_id, day_of_week)
// de la tabla) o la crea si es la primera vez que se guardan horarios.
export async function saveBusinessHours(companyId: string, hours: BusinessHourInput[]) {
  const { error } = await supabase
    .from("business_hours")
    .upsert(
      hours.map((h) => ({ company_id: companyId, ...h })),
      { onConflict: "company_id,day_of_week" },
    );
  return { error: error?.message ?? null };
}
