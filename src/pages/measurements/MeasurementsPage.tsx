import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listEyeMeasurements,
  createEyeMeasurement,
  updateEyeMeasurement,
  deleteEyeMeasurement,
  type EyeMeasurementInput,
} from "../../services/eyeMeasurements";
import { listClients } from "../../services/clients";
import { logAction } from "../../services/auditLogs";
import type { EyeMeasurementWithOwner } from "../../types/eyeMeasurement";
import type { Client } from "../../types/client";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { formatDateLong } from "../../lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: EyeMeasurementInput = {
  owner_id: "",
  measured_at: todayIso(),
  od_sphere: null,
  od_cylinder: null,
  od_axis: null,
  os_sphere: null,
  os_cylinder: null,
  os_axis: null,
  pupillary_distance: null,
  notes: "",
};

function num(value: string): number | null {
  return value === "" ? null : Number(value);
}

// Formatea una medida de esfera/cilindro con el signo explícito, como
// se anota en cualquier receta óptica real (+1.25, -0.50).
function formatDiopter(value: number | null): string {
  if (value === null) return "—";
  return value > 0 ? `+${value}` : `${value}`;
}

export function MeasurementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const title =
    businessType?.extraModules.find((m) => m.key === "measurements")?.label ?? "Medidas visuales";

  const [rows, setRows] = useState<EyeMeasurementWithOwner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EyeMeasurementWithOwner | null>(null);
  const [form, setForm] = useState<EyeMeasurementInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listEyeMeasurements(company.id, { search: currentSearch });
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!company) return;
    refresh("");
    listClients(company.id).then(setClients);
  }, [company]);

  useEffect(() => {
    const timer = setTimeout(() => refresh(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, owner_id: clients[0]?.id ?? "" });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: EyeMeasurementWithOwner) {
    setEditing(row);
    setForm({
      owner_id: row.owner_id,
      measured_at: row.measured_at,
      od_sphere: row.od_sphere,
      od_cylinder: row.od_cylinder,
      od_axis: row.od_axis,
      os_sphere: row.os_sphere,
      os_cylinder: row.os_cylinder,
      os_axis: row.os_axis,
      pupillary_distance: row.pupillary_distance,
      notes: row.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.owner_id) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updateEyeMeasurement(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "eye_measurement.update", {
        measurement_id: editing.id,
      });
    } else {
      const { data, error } = await createEyeMeasurement(company.id, form);
      if (error) {
        setError("No se pudo registrar la medida.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "eye_measurement.create", {
        measurement_id: data?.id,
      });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(row: EyeMeasurementWithOwner) {
    if (!company) return;
    if (!confirm(`¿Eliminar esta medida de "${row.owner_name}"? Esta acción no se puede deshacer.`))
      return;
    const { error } = await deleteEyeMeasurement(row.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "eye_measurement.delete", {
      measurement_id: row.id,
    });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Historial de medidas visuales (OD = ojo derecho, OS = ojo izquierdo)."
        action={
          clients.length > 0
            ? { label: "Nueva", icon: "add", onClick: openCreate }
            : undefined
        }
      />

      {clients.length === 0 && !loading ? (
        <p className="text-body-sm text-on-surface-variant">
          Registra al menos un {entityLabel.toLowerCase().replace(/s$/, "")} antes de poder
          agregar una medida.
        </p>
      ) : null}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Buscar por ${entityLabel.toLowerCase()}...`}
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
        />
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
                render: (r: EyeMeasurementWithOwner) => (
                  <button
                    onClick={() => navigate(`/clients/${r.owner_id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {r.owner_name}
                  </button>
                ),
              },
              {
                header: "Fecha",
                render: (r: EyeMeasurementWithOwner) => formatDateLong(new Date(r.measured_at)),
              },
              {
                header: "OD (esf/cil/eje)",
                render: (r: EyeMeasurementWithOwner) =>
                  `${formatDiopter(r.od_sphere)} / ${formatDiopter(r.od_cylinder)} / ${
                    r.od_axis ?? "—"
                  }°`,
              },
              {
                header: "OS (esf/cil/eje)",
                render: (r: EyeMeasurementWithOwner) =>
                  `${formatDiopter(r.os_sphere)} / ${formatDiopter(r.os_cylinder)} / ${
                    r.os_axis ?? "—"
                  }°`,
              },
              {
                header: "DP",
                render: (r: EyeMeasurementWithOwner) =>
                  r.pupillary_distance !== null ? `${r.pupillary_distance} mm` : "—",
              },
              {
                header: "",
                align: "right",
                render: (r: EyeMeasurementWithOwner) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(r)}
                        className="text-on-surface-variant hover:text-error"
                        aria-label="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={rows}
            getRowKey={(r) => r.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay medidas registradas."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar medida" : "Nueva medida"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={entityLabel.replace(/s$/, "")}
            required
            value={form.owner_id}
            onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha"
            type="date"
            required
            value={form.measured_at}
            onChange={(e) => setForm({ ...form, measured_at: e.target.value })}
          />

          <div>
            <p className="text-label-md text-on-surface mb-2">Ojo derecho (OD)</p>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Esfera"
                type="number"
                step="0.25"
                value={form.od_sphere ?? ""}
                onChange={(e) => setForm({ ...form, od_sphere: num(e.target.value) })}
              />
              <Input
                label="Cilindro"
                type="number"
                step="0.25"
                value={form.od_cylinder ?? ""}
                onChange={(e) => setForm({ ...form, od_cylinder: num(e.target.value) })}
              />
              <Input
                label="Eje"
                type="number"
                min={0}
                max={180}
                value={form.od_axis ?? ""}
                onChange={(e) => setForm({ ...form, od_axis: num(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <p className="text-label-md text-on-surface mb-2">Ojo izquierdo (OS)</p>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Esfera"
                type="number"
                step="0.25"
                value={form.os_sphere ?? ""}
                onChange={(e) => setForm({ ...form, os_sphere: num(e.target.value) })}
              />
              <Input
                label="Cilindro"
                type="number"
                step="0.25"
                value={form.os_cylinder ?? ""}
                onChange={(e) => setForm({ ...form, os_cylinder: num(e.target.value) })}
              />
              <Input
                label="Eje"
                type="number"
                min={0}
                max={180}
                value={form.os_axis ?? ""}
                onChange={(e) => setForm({ ...form, os_axis: num(e.target.value) })}
              />
            </div>
          </div>

          <Input
            label="Distancia pupilar (mm)"
            type="number"
            step="0.5"
            value={form.pupillary_distance ?? ""}
            onChange={(e) => setForm({ ...form, pupillary_distance: num(e.target.value) })}
          />
          <Input
            label="Notas"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
