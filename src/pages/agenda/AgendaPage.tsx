import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  deleteAppointment,
  listAppointmentsForRange,
} from "../../services/appointments";
import { listClients } from "../../services/clients";
import { listServices } from "../../services/services";
import { getCompanyMembers, type CompanyMember } from "../../services/companies";
import { logAction } from "../../services/auditLogs";
import type { AppointmentWithDetails } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import { Button } from "../../components/ui/Button";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { AppointmentFormModal } from "./AppointmentFormModal";
import {
  addDays,
  formatDayLabel,
  formatMonthLabel,
  getMonthGrid,
  startOfDay,
  startOfWeek,
} from "../../lib/utils";

type ViewMode = "day" | "week" | "month";

function getRange(view: ViewMode, date: Date): { start: Date; end: Date } {
  if (view === "day") {
    const start = startOfDay(date);
    return { start, end: addDays(start, 1) };
  }
  if (view === "week") {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export function AgendaPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";

  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithDetails | null>(null);

  const range = useMemo(() => getRange(view, selectedDate), [view, selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate), i)),
    [selectedDate],
  );
  const monthWeeks = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

  async function refreshAppointments() {
    if (!company) return;
    setLoading(true);
    const data = await listAppointmentsForRange(
      company.id,
      range.start.toISOString(),
      range.end.toISOString(),
    );
    setAppointments(data);
    setLoading(false);
  }

  useEffect(() => {
    refreshAppointments();
    // "refreshAppointments" se recrea cada render; solo nos interesa
    // reaccionar a cambios reales de empresa o del rango de fechas visible.
  }, [company, range.start.getTime(), range.end.getTime()]);

  // Listas para los selects del formulario — se cargan una vez por empresa.
  useEffect(() => {
    if (!company) return;
    listClients(company.id).then(setClients);
    listServices(company.id, { activeOnly: true }).then(setServices);
    getCompanyMembers(company.id).then(setMembers);
  }, [company]);

  function goToday() {
    setSelectedDate(new Date());
  }

  function goPrev() {
    if (view === "day") setSelectedDate((d) => addDays(d, -1));
    else if (view === "week") setSelectedDate((d) => addDays(d, -7));
    else setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function goNext() {
    if (view === "day") setSelectedDate((d) => addDays(d, 1));
    else if (view === "week") setSelectedDate((d) => addDays(d, 7));
    else setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(appointment: AppointmentWithDetails) {
    setEditing(appointment);
    setModalOpen(true);
  }

  function handleSelectDay(date: Date) {
    setSelectedDate(date);
    setView("day");
  }

  async function handleDelete(appointment: AppointmentWithDetails) {
    if (!company) return;
    if (!confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.")) return;
    const { error } = await deleteAppointment(appointment.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "appointment.delete", {
      appointment_id: appointment.id,
    });
    refreshAppointments();
  }

  const periodLabel =
    view === "day"
      ? formatDayLabel(selectedDate)
      : view === "week"
        ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} de ${formatMonthLabel(selectedDate)}`
        : formatMonthLabel(selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-display-lg text-primary tracking-tight">Agenda</h2>
          <p className="text-body-md text-on-surface-variant mt-2">
            Gestiona tus citas y horarios.
          </p>
        </div>
        <Button fullWidth={false} onClick={openCreate}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva cita
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Anterior"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Siguiente"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            Hoy
          </button>
          <span className="text-headline-sm text-primary capitalize ml-2">{periodLabel}</span>
        </div>

        <div className="flex bg-surface-container-low rounded-lg p-1 w-max">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-label-sm transition-colors ${
                view === v
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant"
              }`}
            >
              {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-body-sm text-on-surface-variant">Cargando...</div>
      ) : view === "day" ? (
        <DayView
          appointments={appointments}
          entityLabel={entityLabel}
          canDelete={role === "ADMIN"}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : view === "week" ? (
        <WeekView
          weekDays={weekDays}
          appointments={appointments}
          onSelectDay={handleSelectDay}
          onEdit={openEdit}
        />
      ) : (
        <MonthView
          weeks={monthWeeks}
          currentMonth={selectedDate}
          appointments={appointments}
          onSelectDay={handleSelectDay}
        />
      )}

      {company ? (
        <AppointmentFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            refreshAppointments();
          }}
          companyId={company.id}
          userId={user?.id ?? null}
          entityLabel={entityLabel}
          clients={clients}
          services={services}
          members={members}
          editing={editing}
          defaultDate={view === "day" ? selectedDate : new Date()}
        />
      ) : null}
    </div>
  );
}
