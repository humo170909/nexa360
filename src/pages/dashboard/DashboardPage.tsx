import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { getDashboardStats, type DashboardStats } from "../../services/dashboard";
import { getTodayAppointments } from "../../services/appointments";
import { getRecentActivity } from "../../services/auditLogs";
import { DEFAULT_DASHBOARD_KPIS } from "../../config/businessTypes";
import type { DashboardKpiSlot, DashboardMetric } from "../../types/businessType";
import {
  STATUS_LABEL,
  STATUS_TONE,
  type AppointmentWithDetails,
} from "../../types/appointment";
import type { AuditLog } from "../../types/auditLog";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { ActivityFeed, type ActivityItem } from "../../components/ActivityFeed";
import { Badge } from "../../components/ui/Badge";
import {
  formatRelativeTime,
  greetingForNow,
  formatTime,
  formatDateLong,
} from "../../lib/utils";

function metricValue(metric: DashboardMetric, stats: DashboardStats | null): number | null {
  if (!stats) return null;
  switch (metric) {
    case "appointmentsToday":
      return stats.todayAppointments;
    case "completedToday":
      return stats.completedToday;
    case "entityTotal":
      return stats.totalClients;
    case "remindersPending":
      return stats.pendingReminders;
    case "servicesActive":
      return stats.activeServices;
  }
}

export function DashboardPage() {
  const { user } = useAuth();
  const { company } = useCompany();
  const businessType = useBusinessType();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    Promise.all([
      getDashboardStats(company.id),
      getTodayAppointments(company.id),
      getRecentActivity(company.id),
    ]).then(([s, a, act]) => {
      setStats(s);
      setAppointments(a);
      setActivity(act);
      setLoading(false);
    });
  }, [company]);

  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const kpiSlots: DashboardKpiSlot[] = businessType?.dashboardKpis ?? DEFAULT_DASHBOARD_KPIS;

  const activityItems: ActivityItem[] = activity.map((log) => ({
    id: log.id,
    title: log.action,
    timestamp: formatRelativeTime(log.created_at),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1 text-on-surface-variant mb-2">
            <span className="material-symbols-outlined text-[16px]">domain</span>
            <span className="text-label-md tracking-wider uppercase text-[11px]">
              {company?.name}
            </span>
          </div>
          <h2 className="text-display-lg text-primary tracking-tight">
            {greetingForNow()}
            {firstName ? `, ${firstName}` : ""}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant text-label-sm bg-surface-container-lowest px-3 py-1.5 rounded-full border border-outline-variant shadow-sm">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          <span>{formatDateLong(new Date())}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiSlots.map((slot) => (
          <StatCard
            key={slot.metric}
            label={slot.metric === "entityTotal" ? `${entityLabel} totales` : slot.label}
            value={loading ? "…" : metricValue(slot.metric, stats) ?? 0}
            icon={slot.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
            <h3 className="text-headline-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">view_agenda</span>
              Agenda de hoy
            </h3>
          </div>
          <DataTable
            columns={[
              {
                header: entityLabel,
                render: (a: AppointmentWithDetails) => a.client?.full_name ?? "—",
              },
              {
                header: "Servicio",
                render: (a: AppointmentWithDetails) => a.service?.name ?? "—",
              },
              {
                header: "Hora",
                render: (a: AppointmentWithDetails) => formatTime(a.starts_at),
              },
              {
                header: "Estado",
                align: "right",
                render: (a: AppointmentWithDetails) => (
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                ),
              },
            ]}
            rows={appointments}
            getRowKey={(a) => a.id}
            emptyMessage="No tienes citas programadas para hoy."
          />
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright">
            <h3 className="text-headline-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">history</span>
              Actividad reciente
            </h3>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <ActivityFeed
              items={activityItems}
              emptyMessage="Aún no hay actividad registrada."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
