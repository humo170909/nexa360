export function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Justo ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

// --- Navegación de fechas para la Agenda (Fase 10) ---

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Lunes de la semana que contiene `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=domingo..6=sábado
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(d, diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}

export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString("es", { weekday: "short" });
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString("es", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Semanas completas (lunes a domingo) que cubren el mes de `date`. */
export function getMonthGrid(date: Date): Date[][] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const month = firstOfMonth.getMonth();
  const weeks: Date[][] = [];
  let cursor = startOfWeek(firstOfMonth);

  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && cursor > firstOfMonth) break;
  }
  return weeks;
}
