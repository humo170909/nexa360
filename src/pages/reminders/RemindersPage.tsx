import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listReminders,
  getReminderStats,
  deleteReminder,
  type ReminderStats,
} from "../../services/reminders";
import { listAppointmentsForRange } from "../../services/appointments";
import { logAction } from "../../services/auditLogs";
import {
  REMINDER_STATUS_LABEL,
  REMINDER_STATUS_TONE,
  type ReminderStatus,
  type ReminderWithDetails,
} from "../../types/reminder";
import type { AppointmentWithDetails } from "../../types/appointment";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { CreateReminderModal } from "./CreateReminderModal";
import { formatDateLong, formatTime } from "../../lib/utils";

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

export function RemindersPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";

  const [reminders, setReminders] = useState<ReminderWithDetails[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<ReminderStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function refresh() {
    if (!company) return;
    setLoading(true);
    const [remindersData, statsData] = await Promise.all([
      listReminders(company.id, {
        status: statusFilter || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      }),
      getReminderStats(company.id),
    ]);
    setReminders(remindersData);
    setStats(statsData);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint no configurado en este proyecto; ver nota en AgendaPage sobre
    // por qué "refresh" no va en las dependencias.
  }, [company, statusFilter, dateFrom, dateTo]);

  // Citas futuras, para poder elegirlas al crear un recordatorio nuevo.
  useEffect(() => {
    if (!company) return;
    const now = new Date();
    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);
    listAppointmentsForRange(company.id, now.toISOString(), in90Days.toISOString()).then(
      setUpcomingAppointments,
    );
  }, [company, modalOpen]);

  async function handleCancel(reminder: ReminderWithDetails) {
    if (!company) return;
    if (!confirm("¿Cancelar este recordatorio programado?")) return;
    const { error } = await deleteReminder(reminder.id);
    if (error) {
      alert("No se pudo cancelar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "reminder.cancel", { reminder_id: reminder.id });
    refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordatorios"
        subtitle={`Gestiona los recordatorios programados a tus ${entityLabel.toLowerCase()}.`}
        action={{ label: "Crear recordatorio", icon: "add", onClick: () => setModalOpen(true) }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Programados"
          value={loading ? "…" : stats?.scheduled ?? 0}
          icon="schedule"
        />
        <StatCard
          label="Vencidos"
          value={loading ? "…" : stats?.overdue ?? 0}
          icon="notification_important"
        />
        <StatCard label="Enviados" value={loading ? "…" : stats?.sent ?? 0} icon="mark_email_read" />
        <StatCard label="Fallidos" value={loading ? "…" : stats?.failed ?? 0} icon="error" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        <Select
          label="Estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReminderStatus | "")}
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="enviado">Enviado</option>
          <option value="fallido">Fallido</option>
        </Select>
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-label-md text-on-surface">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-body-sm text-on-surface-variant">
            Cargando...
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: entityLabel,
                render: (r: ReminderWithDetails) => r.appointment?.client?.full_name ?? "—",
              },
              {
                header: "Cita / Servicio",
                render: (r: ReminderWithDetails) =>
                  r.appointment
                    ? `${formatDateLong(new Date(r.appointment.starts_at))} · ${
                        r.appointment.service?.name ?? "Sin servicio"
                      }`
                    : "—",
              },
              {
                header: "Fecha programada",
                render: (r: ReminderWithDetails) =>
                  `${formatDateLong(new Date(r.send_at))}, ${formatTime(r.send_at)}`,
              },
              { header: "Canal", render: (r: ReminderWithDetails) => CHANNEL_LABEL[r.channel] },
              {
                header: "Estado",
                render: (r: ReminderWithDetails) => (
                  <Badge tone={REMINDER_STATUS_TONE[r.status]}>
                    {REMINDER_STATUS_LABEL[r.status]}
                  </Badge>
                ),
              },
              {
                header: "Último intento",
                render: (r: ReminderWithDetails) =>
                  r.sent_at ? `${formatDateLong(new Date(r.sent_at))}, ${formatTime(r.sent_at)}` : "—",
              },
              {
                header: "",
                align: "right",
                render: (r: ReminderWithDetails) =>
                  r.status === "pendiente" && role === "ADMIN" ? (
                    <button
                      onClick={() => handleCancel(r)}
                      className="text-on-surface-variant hover:text-error"
                      aria-label="Cancelar"
                      title="Cancelar recordatorio"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </button>
                  ) : null,
              },
            ]}
            rows={reminders}
            getRowKey={(r) => r.id}
            emptyMessage="No hay recordatorios que coincidan con estos filtros."
          />
        )}
      </div>

      {company ? (
        <CreateReminderModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            refresh();
          }}
          companyId={company.id}
          userId={user?.id ?? null}
          upcomingAppointments={upcomingAppointments}
        />
      ) : null}
    </div>
  );
}
