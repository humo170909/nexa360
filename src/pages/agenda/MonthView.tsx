import { isSameDay } from "../../lib/utils";
import type { AppointmentWithDetails } from "../../types/appointment";

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface MonthViewProps {
  weeks: Date[][];
  currentMonth: Date;
  appointments: AppointmentWithDetails[];
  onSelectDay: (date: Date) => void;
}

export function MonthView({ weeks, currentMonth, appointments, onSelectDay }: MonthViewProps) {
  const today = new Date();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 bg-surface-bright border-b border-outline-variant">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-label-sm text-on-surface-variant uppercase text-center"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === currentMonth.getMonth();
          const isToday = isSameDay(day, today);
          const count = appointments.filter((a) => isSameDay(new Date(a.starts_at), day)).length;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`aspect-square sm:aspect-auto sm:h-24 p-2 border-b border-r border-outline-variant last:border-r-0 flex flex-col items-start hover:bg-surface-container-low transition-colors ${
                inMonth ? "" : "opacity-40"
              }`}
            >
              <span
                className={`text-label-md w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-primary text-on-primary" : "text-on-surface"
                }`}
              >
                {day.getDate()}
              </span>
              {count > 0 ? (
                <span className="mt-auto text-label-sm text-secondary bg-secondary-fixed px-2 py-0.5 rounded-full">
                  {count} {count === 1 ? "cita" : "citas"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
