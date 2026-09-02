import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { getClient, updateClient, type ClientInput } from "../../services/clients";
import { listAppointmentsForClient } from "../../services/appointments";
import { logAction } from "../../services/auditLogs";
import type { Client } from "../../types/client";
import { STATUS_LABEL, STATUS_TONE, type AppointmentWithDetails } from "../../types/appointment";
import { DataTable } from "../../components/DataTable";
import { ActivityFeed, type ActivityItem } from "../../components/ActivityFeed";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { formatDateLong, formatTime, formatRelativeTime } from "../../lib/utils";

type Tab = "info" | "history" | "appointments";

export function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const entitySingular = entityLabel.endsWith("s") ? entityLabel.slice(0, -1) : entityLabel;

  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("info");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getClient(id), listAppointmentsForClient(id)]).then(([c, a]) => {
      setClient(c);
      setAppointments(a);
      setLoading(false);
    });
  }, [id]);

  function startEdit() {
    if (!client) return;
    setForm({
      full_name: client.full_name,
      document_id: client.document_id ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      birth_date: client.birth_date ?? "",
      notes: client.notes ?? "",
    });
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!client || !form || !form.full_name.trim()) return;
    setSaving(true);
    setError(null);
    const { data, error } = await updateClient(client.id, form);
    if (error) {
      setError("No se pudo guardar los cambios.");
      setSaving(false);
      return;
    }
    await logAction(company?.id ?? null, user?.id ?? null, `${entitySingular.toLowerCase()}.update`, {
      client_id: client.id,
    });
    setClient(data);
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return <div className="py-16 text-center text-body-sm text-on-surface-variant">Cargando...</div>;
  }

  if (!client) {
    return (
      <div className="py-16 text-center text-body-sm text-on-surface-variant">
        No se encontró este registro.
      </div>
    );
  }

  const timelineItems: ActivityItem[] = appointments.map((a) => ({
    id: a.id,
    title: `${a.service?.name ?? "Cita"} — ${STATUS_LABEL[a.status]}`,
    timestamp: `${formatDateLong(new Date(a.starts_at))}, ${formatTime(a.starts_at)} · ${formatRelativeTime(a.starts_at)}`,
    tone: a.status === "atendida" ? "success" : a.status === "cancelada" || a.status === "no_asistio" ? "error" : "neutral",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
        <button onClick={() => navigate("/clients")} className="hover:text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {entityLabel}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center text-headline-md font-bold">
            {client.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-headline-lg text-primary">{client.full_name}</h2>
            <p className="text-body-sm text-on-surface-variant">
              {client.phone || client.email || "Sin datos de contacto"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-outline-variant">
        {(
          [
            ["info", "Información"],
            ["history", "Historial"],
            ["appointments", "Citas"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-3 text-label-md border-b-2 transition-colors ${
              tab === value
                ? "border-primary text-primary font-bold"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "info" ? (
        editing && form ? (
          <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
            <Input
              label="Nombre completo"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <Input
              label="Documento"
              value={form.document_id ?? ""}
              onChange={(e) => setForm({ ...form, document_id: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Correo"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={form.birth_date ?? ""}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
            <Input
              label="Observaciones"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            {error ? <p className="text-label-sm text-error">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" fullWidth={false} loading={saving}>
                Guardar
              </Button>
              <Button type="button" variant="outline" fullWidth={false} onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="max-w-lg bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
            <InfoRow label="Documento" value={client.document_id} />
            <InfoRow label="Teléfono" value={client.phone} />
            <InfoRow label="Correo" value={client.email} />
            <InfoRow
              label="Fecha de nacimiento"
              value={client.birth_date ? formatDateLong(new Date(client.birth_date)) : null}
            />
            <InfoRow label="Observaciones" value={client.notes} />
            <Button fullWidth={false} variant="outline" onClick={startEdit}>
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Editar
            </Button>
          </div>
        )
      ) : null}

      {tab === "history" ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm max-w-2xl">
          <ActivityFeed
            items={timelineItems}
            emptyMessage={`${entitySingular} sin citas registradas todavía.`}
          />
        </div>
      ) : null}

      {tab === "appointments" ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <DataTable
            columns={[
              {
                header: "Fecha",
                render: (a: AppointmentWithDetails) =>
                  `${formatDateLong(new Date(a.starts_at))}, ${formatTime(a.starts_at)}`,
              },
              { header: "Servicio", render: (a: AppointmentWithDetails) => a.service?.name ?? "—" },
              {
                header: "Estado",
                render: (a: AppointmentWithDetails) => (
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                ),
              },
            ]}
            rows={appointments}
            getRowKey={(a) => a.id}
            emptyMessage="No tiene citas registradas."
          />
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</p>
      <p className="text-body-md text-on-surface mt-1">{value || "—"}</p>
    </div>
  );
}
