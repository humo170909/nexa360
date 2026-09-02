import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import {
  listServices,
  createService,
  updateService,
  toggleServiceActive,
  deleteService,
  type ServiceInput,
} from "../../services/services";
import { logAction } from "../../services/auditLogs";
import type { Service } from "../../types/service";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

const emptyForm: ServiceInput = {
  name: "",
  description: "",
  duration_minutes: null,
  price: null,
};

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return new Intl.NumberFormat("es", { style: "currency", currency: "USD" }).format(price);
}

export function ServicesPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listServices(company.id, { search: currentSearch });
    setServices(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh("");
  }, [company]);

  useEffect(() => {
    const timer = setTimeout(() => refresh(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: service.duration_minutes,
      price: service.price,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.name.trim()) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updateService(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "service.update", { service_id: editing.id });
    } else {
      const { data, error } = await createService(company.id, form);
      if (error) {
        setError("No se pudo crear el servicio.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "service.create", { service_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleToggleActive(service: Service) {
    if (!company) return;
    const { error } = await toggleServiceActive(service.id, !service.is_active);
    if (error) {
      alert("No se pudo actualizar el estado.");
      return;
    }
    await logAction(
      company.id,
      user?.id ?? null,
      service.is_active ? "service.deactivate" : "service.activate",
      { service_id: service.id },
    );
    refresh(search);
  }

  async function handleDelete(service: Service) {
    if (!company) return;
    if (!confirm(`¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteService(service.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "service.delete", { service_id: service.id });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios"
        subtitle="Administra el catálogo de servicios que ofreces."
        action={{ label: "Nuevo", icon: "add", onClick: openCreate }}
      />

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar servicios..."
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
              { header: "Nombre", render: (s: Service) => s.name },
              {
                header: "Duración",
                render: (s: Service) => (s.duration_minutes ? `${s.duration_minutes} min` : "—"),
              },
              { header: "Precio", render: (s: Service) => formatPrice(s.price) },
              {
                header: "Estado",
                render: (s: Service) => (
                  <Badge tone={s.is_active ? "success" : "neutral"}>
                    {s.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                ),
              },
              {
                header: "",
                align: "right",
                render: (s: Service) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label={s.is_active ? "Desactivar" : "Activar"}
                      title={s.is_active ? "Desactivar" : "Activar"}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {s.is_active ? "toggle_on" : "toggle_off"}
                      </span>
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(s)}
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
            rows={services}
            getRowKey={(s) => s.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no tienes servicios registrados."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar servicio" : "Nuevo servicio"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Descripción"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duración (minutos)"
              type="number"
              min={0}
              value={form.duration_minutes ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  duration_minutes: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <Input
              label="Precio"
              type="number"
              min={0}
              step="0.01"
              value={form.price ?? ""}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          {error ? <p className="text-label-sm text-error">{error}</p> : null}
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
