export interface BusinessHour {
  id: string;
  company_id: string;
  day_of_week: number; // 0 = domingo ... 6 = sábado (igual que Date.getDay())
  opens_at: string | null; // "HH:MM:SS"
  closes_at: string | null;
  is_closed: boolean;
  created_at: string;
}

export const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
