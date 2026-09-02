import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  type VehicleInput,
} from "../../services/vehicles";
import { listClients } from "../../services/clients";
import { logAction } from "../../services/auditLogs";
import type { VehicleWithOwner } from "../../types/vehicle";
import type { Client } from "../../types/client";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";

const emptyForm: VehicleInput = {
  owner_id: "",
  plate: "",
  brand: "",
  model: "",
  year: null,
  notes: "",
};

export function VehiclesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";
  const title = businessType?.extraModules.find((m) => m.key === "vehicles")?.label ?? "Vehículos";

  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleWithOwner | null>(null);
  const [form, setForm] = useState<VehicleInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listVehicles(company.id, { search: currentSearch });
    setVehicles(data);
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

  function openEdit(vehicle: VehicleWithOwner) {
    setEditing(vehicle);
    setForm({
      owner_id: vehicle.owner_id,
      plate: vehicle.plate,
      brand: vehicle.brand ?? "",
      model: vehicle.model ?? "",
      year: vehicle.year,
      notes: vehicle.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.plate.trim() || !form.owner_id) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updateVehicle(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "vehicle.update", { vehicle_id: editing.id });
    } else {
      const { data, error } = await createVehicle(company.id, form);
      if (error) {
        setError("No se pudo registrar el vehículo.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "vehicle.create", { vehicle_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(vehicle: VehicleWithOwner) {
    if (!company) return;
    if (!confirm(`¿Eliminar "${vehicle.plate}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteVehicle(vehicle.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "vehicle.delete", { vehicle_id: vehicle.id });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Registro de vehículos atendidos y sus propietarios."
        action={
          clients.length > 0
            ? { label: "Nuevo", icon: "add", onClick: openCreate }
            : undefined
        }
      />

      {clients.length === 0 && !loading ? (
        <p className="text-body-sm text-on-surface-variant">
          Registra al menos un {entityLabel.toLowerCase().replace(/s$/, "")} antes de poder
          agregar un vehículo.
        </p>
      ) : null}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por placa..."
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
              { header: "Placa", render: (v: VehicleWithOwner) => v.plate },
              { header: "Marca", render: (v: VehicleWithOwner) => v.brand || "—" },
              { header: "Modelo", render: (v: VehicleWithOwner) => v.model || "—" },
              { header: "Año", render: (v: VehicleWithOwner) => v.year ?? "—" },
              {
                header: entityLabel,
                render: (v: VehicleWithOwner) => (
                  <button
                    onClick={() => navigate(`/clients/${v.owner_id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {v.owner_name}
                  </button>
                ),
              },
              {
                header: "",
                align: "right",
                render: (v: VehicleWithOwner) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(v)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(v)}
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
            rows={vehicles}
            getRowKey={(v) => v.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay vehículos registrados."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar vehículo" : "Nuevo vehículo"}
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
            label="Placa"
            required
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Marca"
              value={form.brand ?? ""}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
            <Input
              label="Modelo"
              value={form.model ?? ""}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
          <Input
            label="Año"
            type="number"
            min={1900}
            value={form.year ?? ""}
            onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })}
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
