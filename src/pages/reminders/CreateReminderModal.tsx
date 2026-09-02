import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { createReminder } from "../../services/reminders";
import { logAction } from "../../services/auditLogs";
import type { AppointmentWithDetails } from "../../types/appointment";
import { formatDateLong, formatTime } from "../../lib/utils";

interface CreateReminderModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  userId: string | null;
  upcomingAppointments: AppointmentWithDetails[];
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

export function CreateReminderModal({
  open,
  onClose,
  onSaved,
  companyId,
  userId,
  upcomingAppointments,
}: CreateReminderModalProps) {
  const [appointmentId, setAppointmentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al elegir una cita, sugiere enviar el recordatorio 24 horas antes —
  // el usuario puede cambiar la fecha/hora después si quiere.
  function handleSelectAppointment(id: string) {
    setAppointmentId(id);
    const appointment = upcomingAppointments.find((a) => a.id === id);
    if (appointment) {
      const suggested = new Date(appointment.starts_at);
      suggested.setDate(suggested.getDate() - 1);
      setDate(toDateInput(suggested));
      setTime(toTimeInput(suggested));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!appointmentId || !date || !time) return;
    setSaving(true);
    setError(null);

    const sendAt = new Date(`${date}T${time}:00`);
    const { data, error } = await createReminder(companyId, {
      appointment_id: appointmentId,
      channel: "email",
      send_at: sendAt.toISOString(),
    });

    if (error) {
      setError("No se pudo crear el recordatorio.");
      setSaving(false);
      return;
    }

    await logAction(companyId, userId, "reminder.create", { reminder_id: data?.id });
    setSaving(false);
    setAppointmentId("");
    setDate("");
    setTime("09:00");
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear recordatorio">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Cita"
          required
          value={appointmentId}
          onChange={(e) => handleSelectAppointment(e.target.value)}
        >
          <option value="" disabled>
            Selecciona una cita próxima...
          </option>
          {upcomingAppointments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.client?.full_name ?? "—"} · {formatDateLong(new Date(a.starts_at))}{" "}
              {formatTime(a.starts_at)}
            </option>
          ))}
        </Select>

        <Select label="Canal" defaultValue="email">
          <option value="email">Email</option>
          <option value="whatsapp" disabled>
            WhatsApp (Próximamente)
          </option>
          <option value="sms" disabled>
            SMS (Próximamente)
          </option>
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de envío"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Hora de envío"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {upcomingAppointments.length === 0 ? (
          <p className="text-label-sm text-on-surface-variant">
            No tienes citas próximas — crea una cita en Agenda primero para poder
            programarle un recordatorio.
          </p>
        ) : null}

        {error ? <p className="text-label-sm text-error">{error}</p> : null}

        <Button type="submit" loading={saving} disabled={upcomingAppointments.length === 0}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
