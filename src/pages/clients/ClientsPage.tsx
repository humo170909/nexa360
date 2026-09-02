import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  type ClientInput,
} from "../../services/clients";
import { logAction } from "../../services/auditLogs";
import type { Client } from "../../types/client";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const emptyForm: ClientInput = {
  full_name: "",
  document_id: "",
  phone: "",
  email: "",
  birth_date: "",
  notes: "",
};

export function ClientsPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Clientes";

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listClients(company.id, currentSearch);
    setClients(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh("");
    // "refresh" se recrea cada render pero solo nos interesa reaccionar
    // a cambios de "company" — no lo agregamos como dependencia.
  }, [company]);

  // Debounce simple: espera 300ms de silencio antes de volver a buscar.
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

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      full_name: client.full_name,
      document_id: client.document_id ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      birth_date: client.birth_date ?? "",
      notes: client.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.full_name.trim()) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updateClient(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, `${entityLabel.toLowerCase()}.update`, {
        client_id: editing.id,
      });
    } else {
      const { data, error } = await createClient(company.id, form);
      if (error) {
        setError("No se pudo crear el registro.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, `${entityLabel.toLowerCase()}.create`, {
        client_id: data?.id,
      });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(client: Client) {
    if (!company) return;
    if (!confirm(`¿Eliminar a ${client.full_name}? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteClient(client.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, `${entityLabel.toLowerCase()}.delete`, {
      client_id: client.id,
    });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={entityLabel}
        subtitle={`Administra tus ${entityLabel.toLowerCase()}.`}
        action={{ label: "Nuevo", icon: "add", onClick: openCreate }}
      />

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Buscar ${entityLabel.toLowerCase()}...`}
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
              { header: "Nombre", render: (c: Client) => c.full_name },
              { header: "Teléfono", render: (c: Client) => c.phone || "—" },
              { header: "Correo", render: (c: Client) => c.email || "—" },
              {
                header: "",
                align: "right",
                render: (c: Client) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(c)}
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
            rows={clients}
            getRowKey={(c) => c.id}
            emptyMessage={
              search
                ? "No se encontraron resultados."
                : `Aún no tienes ${entityLabel.toLowerCase()} registrados.`
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${entityLabel.toLowerCase().slice(0, -1)}` : `Nuevo registro`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
