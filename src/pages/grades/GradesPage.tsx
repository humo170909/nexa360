import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompany } from "../../hooks/useCompany";
import { useBusinessType } from "../../hooks/useBusinessType";
import { listGrades, createGrade, updateGrade, deleteGrade, type GradeInput } from "../../services/grades";
import { listTeachers } from "../../services/teachers";
import { logAction } from "../../services/auditLogs";
import type { GradeWithTeacher } from "../../types/grade";
import type { Teacher } from "../../types/teacher";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";

const emptyForm: GradeInput = {
  name: "",
  teacher_id: "",
  notes: "",
};

export function GradesPage() {
  const { user } = useAuth();
  const { company, role } = useCompany();
  const businessType = useBusinessType();
  const title = businessType?.extraModules.find((m) => m.key === "grades")?.label ?? "Grados";

  const [grades, setGrades] = useState<GradeWithTeacher[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GradeWithTeacher | null>(null);
  const [form, setForm] = useState<GradeInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(currentSearch: string) {
    if (!company) return;
    setLoading(true);
    const data = await listGrades(company.id, { search: currentSearch });
    setGrades(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!company) return;
    refresh("");
    listTeachers(company.id).then(setTeachers);
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

  function openEdit(grade: GradeWithTeacher) {
    setEditing(grade);
    setForm({
      name: grade.name,
      teacher_id: grade.teacher_id ?? "",
      notes: grade.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    const payload = { ...form, teacher_id: form.teacher_id || null };

    if (editing) {
      const { error } = await updateGrade(editing.id, payload);
      if (error) {
        setError("No se pudo guardar los cambios.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "grade.update", { grade_id: editing.id });
    } else {
      const { data, error } = await createGrade(company.id, payload);
      if (error) {
        setError("No se pudo crear el grado.");
        setSaving(false);
        return;
      }
      await logAction(company.id, user?.id ?? null, "grade.create", { grade_id: data?.id });
    }

    setSaving(false);
    setModalOpen(false);
    refresh(search);
  }

  async function handleDelete(grade: GradeWithTeacher) {
    if (!company) return;
    if (!confirm(`¿Eliminar "${grade.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deleteGrade(grade.id);
    if (error) {
      alert("No se pudo eliminar (revisa tus permisos).");
      return;
    }
    await logAction(company.id, user?.id ?? null, "grade.delete", { grade_id: grade.id });
    refresh(search);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Grados y secciones de tu institución."
        action={{ label: "Nuevo", icon: "add", onClick: openCreate }}
      />

      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar grados..."
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
              { header: "Grado", render: (g: GradeWithTeacher) => g.name },
              { header: "Docente a cargo", render: (g: GradeWithTeacher) => g.teacher_name },
              {
                header: "",
                align: "right",
                render: (g: GradeWithTeacher) => (
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
            rows={grades}
            getRowKey={(g) => g.id}
            emptyMessage={
              search ? "No se encontraron resultados." : "Aún no hay grados registrados."
            }
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar grado" : "Nuevo grado"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            required
            placeholder='Ej: "1ro A"'
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            label="Docente a cargo"
            value={form.teacher_id ?? ""}
            onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
          >
            <option value="">Sin asignar</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>
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
