import { useEffect, useMemo, useState } from "react";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  getReportStats,
  getAppointmentsByDay,
  type ReportStats,
  type DailyCount,
} from "../../services/reports";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { addDays, startOfDay, startOfWeek } from "../../lib/utils";

type Period = "today" | "week" | "month" | "custom";

function rangeForPeriod(
  period: Period,
  customFrom: string,
  customTo: string,
): { start: Date; end: Date } {
  const now = new Date();
  if (period === "today") {
    const start = startOfDay(now);
    return { start, end: addDays(start, 1) };
  }
  if (period === "week") {
    const start = startOfWeek(now);
    return { start, end: addDays(start, 7) };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }
  // custom
  const start = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now);
  const end = customTo ? addDays(startOfDay(new Date(customTo)), 1) : addDays(start, 1);
  return { start, end };
}

function formatShortDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function ReportsPage() {
  const { company } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";

  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [stats, setStats] = useState<ReportStats | null>(null);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    Promise.all([
      getReportStats(company.id, range.start.toISOString(), range.end.toISOString()),
      getAppointmentsByDay(company.id, range.start.toISOString(), range.end.toISOString()),
    ]).then(([s, d]) => {
      setStats(s);
      setDailyCounts(d);
      setLoading(false);
    });
  }, [company, range.start.getTime(), range.end.getTime()]);

  const maxCount = Math.max(1, ...dailyCounts.map((d) => d.count));

  const statusRows = stats
    ? [
        { label: "Servicios realizados", value: stats.completedServices, tone: "bg-secondary" },
        { label: "Cancelaciones", value: stats.cancellations, tone: "bg-error" },
        { label: "No asistencias", value: stats.noShows, tone: "bg-tertiary-fixed-dim" },
      ]
    : [];
  const statusTotal = statusRows.reduce((sum, r) => sum + r.value, 0) || 1;

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" subtitle="Análisis de tu operación, no un resumen del día a día." />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex bg-surface-container-low rounded-lg p-1 w-max">
          {(
            [
              ["today", "Hoy"],
              ["week", "Esta semana"],
              ["month", "Este mes"],
              ["custom", "Personalizado"],
            ] as [Period, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-3 py-1.5 rounded-md text-label-sm transition-colors ${
                period === value
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {period === "custom" ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
            <span className="text-on-surface-variant">–</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Citas totales" value={loading ? "…" : stats?.appointmentsTotal ?? 0} icon="event" />
        <StatCard
          label={`${entityLabel} nuevos`}
          value={loading ? "…" : stats?.newClients ?? 0}
          icon="person_add"
        />
        <StatCard
          label={`${entityLabel} recurrentes`}
          value={loading ? "…" : stats?.recurringClients ?? 0}
          icon="repeat"
        />
        <StatCard
          label="Servicios realizados"
          value={loading ? "…" : stats?.completedServices ?? 0}
          icon="task_alt"
        />
        <StatCard label="Cancelaciones" value={loading ? "…" : stats?.cancellations ?? 0} icon="event_busy" />
        <StatCard label="No asistencias" value={loading ? "…" : stats?.noShows ?? 0} icon="person_off" />
        <StatCard
          label="Recordatorios enviados"
          value={loading ? "…" : stats?.remindersSent ?? 0}
          icon="mark_email_read"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="text-headline-sm text-primary mb-6">Citas por día</h3>
          {loading ? (
            <p className="text-body-sm text-on-surface-variant">Cargando...</p>
          ) : dailyCounts.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant py-12 text-center">
              No hay citas registradas en este período.
            </p>
          ) : (
            <div className="flex items-end gap-2 h-48 border-b border-l border-outline-variant pl-2 pb-2">
              {dailyCounts.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-label-sm text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div
                    className="w-full bg-secondary rounded-t-sm transition-all"
                    style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: "4px" }}
                  />
                  <span className="text-label-sm text-on-surface-variant text-[10px]">
                    {formatShortDay(d.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="text-headline-sm text-primary mb-6">Estado de las citas</h3>
          {loading ? (
            <p className="text-body-sm text-on-surface-variant">Cargando...</p>
          ) : (
            <div className="space-y-4">
              {statusRows.map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-label-sm text-on-surface-variant mb-1">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.tone}`}
                      style={{ width: `${(row.value / statusTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
