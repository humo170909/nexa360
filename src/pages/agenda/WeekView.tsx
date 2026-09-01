import { formatTime, formatWeekdayShort, isSameDay } from "../../lib/utils";
import type { AppointmentWithDetails } from "../../types/appointment";

interface WeekViewProps {
  weekDays: Date[];
  appointments: AppointmentWithDetails[];
  onSelectDay: (date: Date) => void;
  onEdit: (appointment: AppointmentWithDetails) => void;
}

export function WeekView({ weekDays, appointments, onSelectDay, onEdit }: WeekViewProps) {
  const today = new Date();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
      {weekDays.map((day) => {
        const dayAppointments = appointments
          .filter((a) => isSameDay(new Date(a.starts_at), day))
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        const isToday = isSameDay(day, today);

        return (
          <div
            key={day.toISOString()}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[160px]"
          >
            <button
              onClick={() => onSelectDay(day)}
              className={`px-3 py-2 border-b border-outline-variant text-left hover:bg-surface-container-low transition-colors ${
                isToday ? "bg-secondary-fixed" : "bg-surface-bright"
              }`}
            >
              <div className="text-label-sm uppercase text-on-surface-variant">
                {formatWeekdayShort(day)}
              </div>
              <div className={`text-headline-sm ${isToday ? "text-secondary" : "text-primary"}`}>
                {day.getDate()}
              </div>
            </button>
            <div className="p-2 flex-1 space-y-1 overflow-y-auto">
              {dayAppointments.length === 0 ? (
                <p className="text-label-sm text-on-surface-variant px-1 py-2">Sin citas</p>
              ) : (
                dayAppointments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onEdit(a)}
                    className="w-full text-left px-2 py-1.5 rounded-lg bg-surface-bright hover:bg-surface-container-low transition-colors"
                  >
                    <div className="text-label-sm text-primary truncate">
                      {formatTime(a.starts_at)} · {a.client?.full_name ?? "—"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
