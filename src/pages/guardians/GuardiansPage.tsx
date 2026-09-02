import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listGuardians,
  createGuardian,
  updateGuardian,
  deleteGuardian,
  type GuardianInput,
} from "../../services/guardians";
import { listClients } from "../../services/clients";
import { logAction } from "../../services/auditLogs";
import { RELATIONSHIP_LABEL, type GuardianWithStudent } from "../../types/guardian";
import type { Client } from "../../types/client";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";

const emptyForm: GuardianInput = {
  owner_id: "",
  full_name: "",
  relationship: "",
  phone: "",
  email: "",
  notes: "",
};

export function GuardiansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Estudiantes";
  const title =
    businessType?.extraModules.find((m) => m.key === "guardians")?.label ?? "Padres/Apoderados";

  const [guardians, setGuardians] = useState<GuardianWithStudent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GuardianWithStudent | null>(null);
  const [form, setForm] = useState<GuardianInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listGuardians(company.id, { search: currentSearch });
    setGuardians(data);
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

  function openEdit(guardian: GuardianWithStudent) {
    setEditing(guardian);
    setForm({
      owner_id: guardian.owner_id,
      full_name: guardian.full_name,
      relationship: guardian.relationship ?? "",
      phone: guardian.phone ?? "",
      email: guardian.email ?? "",
      notes: guardian.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.full_name.trim() || !form.owner_id) return;
    setSaving(true);
    setError(null);
    const payload = { ...form, relationship: form.relationship || null };

    if (editing) {
      const { error } = await updateGuardian(editing.id, payload);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "guardian.update", { guardian_id: editing.id });
    } else {
      const { data, error } = await createGuardian(company.id, payload);
      if (error) {
        setError("No se pudo registrar el apoderado.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "guardian.create", { guardian_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(guardian: GuardianWithStudent) {
    if (!company) return;
    if (!confirm(`¿Eliminar a "${guardian.full_name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteGuardian(guardian.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "guardian.delete", { guardian_id: guardian.id });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Padres y apoderados ligados a cada estudiante."
        action={
          clients.length > 0
            ? { label: "Nuevo", icon: "add", onClick: openCreate }
            : undefined
        }
      />

      {clients.length === 0 && !loading ? (
        <p className="text-body-sm text-on-surface-variant">
          Registra al menos un {entityLabel.toLowerCase().replace(/s$/, "")} antes de poder
          agregar un apoderado.
        </p>
      ) : null}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar apoderados..."
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
              { header: "Nombre", render: (g: GuardianWithStudent) => g.full_name },
              {
                header: "Parentesco",
                render: (g: GuardianWithStudent) =>
                  g.relationship ? RELATIONSHIP_LABEL[g.relationship] : "—",
              },
              {
                header: entityLabel.replace(/s$/, ""),
                render: (g: GuardianWithStudent) => (
                  <button
                    onClick={() => navigate(`/clients/${g.owner_id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {g.student_name}
                  </button>
                ),
              },
              { header: "Teléfono", render: (g: GuardianWithStudent) => g.phone || "—" },
              {
                header: "",
                align: "right",
                render: (g: GuardianWithStudent) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(g)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(g)}
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
            rows={guardians}
            getRowKey={(g) => g.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay apoderados registrados."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar apoderado" : "Nuevo apoderado"}
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
            label="Nombre completo"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <Select
            label="Parentesco"
            value={form.relationship ?? ""}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          >
            <option value="">Sin especificar</option>
            <option value="madre">Madre</option>
            <option value="padre">Padre</option>
            <option value="tutor">Tutor</option>
            <option value="otro">Otro</option>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
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
