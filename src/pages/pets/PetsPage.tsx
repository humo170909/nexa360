import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { listPets, createPet, updatePet, deletePet, type PetInput } from "../../services/pets";
import { listClients } from "../../services/clients";
import { logAction } from "../../services/auditLogs";
import type { PetWithOwner } from "../../types/pet";
import type { Client } from "../../types/client";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { formatDateLong } from "../../lib/utils";

const emptyForm: PetInput = {
  owner_id: "",
  name: "",
  species: "",
  breed: "",
  birth_date: "",
  notes: "",
};

export function PetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const entityLabel = businessType?.entityLabel ?? "Propietarios";
  const title = businessType?.extraModules.find((m) => m.key === "pets")?.label ?? "Mascotas";

  const [pets, setPets] = useState<PetWithOwner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PetWithOwner | null>(null);
  const [form, setForm] = useState<PetInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listPets(company.id, { search: currentSearch });
    setPets(data);
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

  function openEdit(pet: PetWithOwner) {
    setEditing(pet);
    setForm({
      owner_id: pet.owner_id,
      name: pet.name,
      species: pet.species ?? "",
      breed: pet.breed ?? "",
      birth_date: pet.birth_date ?? "",
      notes: pet.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.name.trim() || !form.owner_id) return;
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await updatePet(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "pet.update", { pet_id: editing.id });
    } else {
      const { data, error } = await createPet(company.id, form);
      if (error) {
        setError("No se pudo registrar la mascota.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "pet.create", { pet_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(pet: PetWithOwner) {
    if (!company) return;
    if (!confirm(`¿Eliminar "${pet.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deletePet(pet.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "pet.delete", { pet_id: pet.id });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Registro de mascotas atendidas y sus propietarios."
        action={
          clients.length > 0
            ? { label: "Nueva", icon: "add", onClick: openCreate }
            : undefined
        }
      />

      {clients.length === 0 && !loading ? (
        <p className="text-body-sm text-on-surface-variant">
          Registra al menos un {entityLabel.toLowerCase().replace(/s$/, "")} antes de poder
          agregar una mascota.
        </p>
      ) : null}

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar mascotas..."
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
              { header: "Nombre", render: (p: PetWithOwner) => p.name },
              { header: "Especie", render: (p: PetWithOwner) => p.species || "—" },
              { header: "Raza", render: (p: PetWithOwner) => p.breed || "—" },
              {
                header: entityLabel,
                render: (p: PetWithOwner) => (
                  <button
                    onClick={() => navigate(`/clients/${p.owner_id}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    {p.owner_name}
                  </button>
                ),
              },
              {
                header: "Nacimiento",
                render: (p: PetWithOwner) =>
                  p.birth_date ? formatDateLong(new Date(p.birth_date)) : "—",
              },
              {
                header: "",
                align: "right",
                render: (p: PetWithOwner) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(p)}
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
            rows={pets}
            getRowKey={(p) => p.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay mascotas registradas."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar mascota" : "Nueva mascota"}
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
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Especie"
              value={form.species ?? ""}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
            />
            <Input
              label="Raza"
              value={form.breed ?? ""}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
          </div>
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={form.birth_date ?? ""}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
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
