import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  type TeacherInput,
} from "../../services/teachers";
import { logAction } from "../../services/auditLogs";
import type { Teacher } from "../../types/teacher";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const emptyForm: TeacherInput = {
  full_name: "",
  specialty: "",
  phone: "",
  email: "",
  notes: "",
};

// Compartida por Colegio ("Docentes") y Academia ("Profesores") — el
// título viene del business_type, no hay dos componentes separados
// para el mismo dato.
export function TeachersPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const title = businessType?.extraModules.find((m) => m.key === "teachers")?.label ?? "Docentes";

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listTeachers(company.id, { search: currentSearch });
    setTeachers(data);
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

  function openEdit(teacher: Teacher) {
    setEditing(teacher);
    setForm({
      full_name: teacher.full_name,
      specialty: teacher.specialty ?? "",
      phone: teacher.phone ?? "",
      email: teacher.email ?? "",
      notes: teacher.notes ?? "",
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
      const { error } = await updateTeacher(editing.id, form);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "teacher.update", { teacher_id: editing.id });
    } else {
      const { data, error } = await createTeacher(company.id, form);
      if (error) {
        setError("No se pudo registrar.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "teacher.create", { teacher_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(teacher: Teacher) {
    if (!company) return;
    if (!confirm(`¿Eliminar a "${teacher.full_name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteTeacher(teacher.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "teacher.delete", { teacher_id: teacher.id });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Personal docente registrado en tu empresa."
        action={{ label: "Nuevo", icon: "add", onClick: openCreate }}
      />

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
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
              { header: "Nombre", render: (t: Teacher) => t.full_name },
              { header: "Especialidad", render: (t: Teacher) => t.specialty || "—" },
              { header: "Teléfono", render: (t: Teacher) => t.phone || "—" },
              { header: "Email", render: (t: Teacher) => t.email || "—" },
              {
                header: "",
                align: "right",
                render: (t: Teacher) => (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        onClick={() => handleDelete(t)}
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
            rows={teachers}
            getRowKey={(t) => t.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay nadie registrado."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar" : "Nuevo"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <Input
            label="Especialidad"
            value={form.specialty ?? ""}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          />
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
