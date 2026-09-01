import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import {
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "../../services/appointments";
import { logAction } from "../../services/auditLogs";
import {
  STATUS_LABEL,
  STATUS_OPTIONS,
  type AppointmentInput,
  type AppointmentStatus,
  type AppointmentWithDetails,
} from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { CompanyMember } from "../../services/companies";

interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  userId: string | null;
  entityLabel: string;
  clients: Client[];
  services: Service[];
  members: CompanyMember[];
  editing: AppointmentWithDetails | null;
  /** Fecha por defecto para una cita nueva (ej. el día que se está viendo). */
  defaultDate: Date;
}

function toDateInput(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function toTimeInput(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(11, 16);
}

export function AppointmentFormModal({
  open,
  onClose,
  onSaved,
  companyId,
  userId,
  entityLabel,
  clients,
  services,
  members,
  editing,
  defaultDate,
}: AppointmentFormModalProps) {
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("pendiente");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const start = new Date(editing.starts_at);
      setClientId(editing.client_id);
      setServiceId(editing.service_id ?? "");
      setAssignedTo(editing.assigned_to ?? "");
      setDate(toDateInput(start));
      setTime(toTimeInput(start));
      setNotes(editing.notes ?? "");
      setStatus(editing.status);
    } else {
      setClientId("");
      setServiceId("");
      setAssignedTo("");
      setDate(toDateInput(defaultDate));
      setTime("09:00");
      setNotes("");
      setStatus("pendiente");
    }
    setError(null);
  }, [open, editing, defaultDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clientId || !date || !time) return;
    setSaving(true);
    setError(null);

    const startsAt = new Date(`${date}T${time}:00`);
    const service = services.find((s) => s.id === serviceId);
    const endsAt = service?.duration_minutes
      ? new Date(startsAt.getTime() + service.duration_minutes * 60000)
      : null;

    const input: AppointmentInput = {
      client_id: clientId,
      service_id: serviceId || null,
      assigned_to: assignedTo || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
      notes: notes || null,
    };

    if (editing) {
      const { error } = await updateAppointment(editing.id, input);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      if (status !== editing.status) {
        await updateAppointmentStatus(editing.id, status);
      }
      await logAction(companyId, userId, "appointment.update", { appointment_id: editing.id });
    } else {
      const { data, error } = await createAppointment(companyId, input);
      if (error) {
        setError("No se pudo crear la cita.");
        setSaving(false);
        return;
      }
      await logAction(companyId, userId, "appointment.create", { appointment_id: data?.id });
    }

    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar cita" : "Nueva cita"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={entityLabel.endsWith("s") ? entityLabel.slice(0, -1) : entityLabel}
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="" disabled>
            Selecciona...
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </Select>

        <Select label="Servicio" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Sin servicio</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Select
          label="Profesional"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          <option value="">Sin asignar</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name ?? "Sin nombre"}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Hora"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {editing ? (
          <Select
            label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        ) : null}

        <Input
          label="Observaciones"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error ? <p className="text-label-sm text-error">{error}</p> : null}

        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
